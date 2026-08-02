/**
 * Quick Add — bulk rows from CSV / Excel (first sheet).
 * Expected header row: Type, Amount, Narration [, Currency]
 * Type: income | expense (or credit | debit)
 */

import { parseCSVFile } from '@/lib/importUtils';

export type QuickAddBulkRow = {
  type: 'income' | 'expense';
  amount: number;
  narration: string;
  currency?: string;
};

function normCell(v: unknown): string {
  return String(v ?? '').trim();
}

export async function parseSpreadsheetToMatrix(file: File): Promise<string[][]> {
  const lower = file.name.toLowerCase();
  if (lower.endsWith('.csv')) {
    return parseCSVFile(file);
  }
  if (lower.endsWith('.xlsx') || lower.endsWith('.xls')) {
    const XLSX = await import('xlsx');
    const buf = await file.arrayBuffer();
    const wb = XLSX.read(buf, { type: 'array' });
    const name = wb.SheetNames[0];
    if (!name) return [];
    const ws = wb.Sheets[name];
    return XLSX.utils.sheet_to_json<string[]>(ws, { header: 1, defval: '' }) as string[][];
  }
  throw new Error('Use a CSV or Excel file (.csv, .xlsx, .xls).');
}

function parseType(cell: string): 'income' | 'expense' {
  const s = cell.toLowerCase();
  if (s.includes('income') || s.includes('credit')) return 'income';
  if (s.includes('expense') || s.includes('debit')) return 'expense';
  return 'expense';
}

/** Map spreadsheet matrix to bulk rows; skips invalid lines. */
export function matrixToQuickAddRows(matrix: string[][]): QuickAddBulkRow[] {
  if (!matrix.length) return [];
  const header = matrix[0].map((c) => normCell(c).toLowerCase());
  const typeIdx = header.findIndex((h) => h === 'type' || h === 'kind');
  const amtIdx = header.findIndex((h) => h.includes('amount') || h === 'value');
  const narrIdx = header.findIndex(
    (h) =>
      h.includes('narration') ||
      h.includes('description') ||
      h === 'memo' ||
      h === 'details' ||
      h === 'note',
  );
  const curIdx = header.findIndex((h) => h.includes('currency') || h === 'ccy');

  const hasHeader = typeIdx >= 0 && amtIdx >= 0 && narrIdx >= 0;
  const dataRows = hasHeader ? matrix.slice(1) : matrix;

  const out: QuickAddBulkRow[] = [];
  for (const row of dataRows) {
    const get = (i: number) => (i >= 0 && i < row.length ? normCell(row[i]) : '');
    let t: 'income' | 'expense';
    let amtStr: string;
    let narr: string;
    let cur: string | undefined;

    if (hasHeader) {
      t = parseType(get(typeIdx));
      amtStr = get(amtIdx).replace(/,/g, '');
      narr = get(narrIdx);
      cur = get(curIdx) || undefined;
    } else {
      if (row.length < 3) continue;
      t = parseType(get(0));
      amtStr = get(1).replace(/,/g, '');
      narr = get(2);
      cur = get(3) || undefined;
    }

    const amount = Number.parseFloat(amtStr);
    if (!Number.isFinite(amount) || amount <= 0 || !narr) continue;
    out.push({
      type: t,
      amount,
      narration: narr.slice(0, 500),
      ...(cur ? { currency: cur.slice(0, 8) } : {}),
    });
  }
  return out;
}
