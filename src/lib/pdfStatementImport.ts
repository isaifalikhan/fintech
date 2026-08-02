/**
 * PDF bank statements: pdf.js + several extraction strategies + tolerant parsing.
 */

import * as pdfjsLib from 'pdfjs-dist';
import workerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
import { parseDate, parseAmount, parseStatementDate } from '@/lib/importUtils';

pdfjsLib.GlobalWorkerOptions.workerSrc = workerUrl;

const MONTHS = '(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*';

/** Extra date patterns beyond importUtils.parseDate (common on bank PDFs). */
export function parseDateLoose(raw: string): string | null {
  const t = raw.trim();
  const fromCore = parseDate(t);
  if (fromCore) return fromCore;

  let m = t.match(
    new RegExp(`^(\\d{1,2})[-\\s/](${MONTHS})[-\\s/](\\d{4})$`, 'i')
  );
  if (m) {
    const mon = monthToNum(m[2]!);
    if (!mon) return null;
    const d = m[1]!.padStart(2, '0');
    return `${m[3]}-${mon}-${d}`;
  }

  m = t.match(new RegExp(`^(${MONTHS})\\s+(\\d{1,2}),?\\s+(\\d{4})$`, 'i'));
  if (m) {
    const mon = monthToNum(m[1]!);
    if (!mon) return null;
    const d = m[2]!.padStart(2, '0');
    return `${m[3]}-${mon}-${d}`;
  }

  return null;
}

function monthToNum(m: string): string | null {
  const map: Record<string, string> = {
    jan: '01',
    feb: '02',
    mar: '03',
    apr: '04',
    may: '05',
    jun: '06',
    jul: '07',
    aug: '08',
    sep: '09',
    oct: '10',
    nov: '11',
    dec: '12',
  };
  const k = m.slice(0, 3).toLowerCase();
  return map[k] ?? null;
}

/** US + EU + plain money tokens (bank PDFs vary). */
export function parseAmountLoose(amountStr: string): number | null {
  if (!amountStr) return null;
  let t = amountStr
    .replace(/[$€£¥₹]/g, '')
    .replace(/\s/g, '')
    .trim();

  if (t.startsWith('(') && t.endsWith(')')) {
    t = '-' + t.slice(1, -1);
  }

  // EU style: 1.234,56 or 12,34 (decimal comma)
  if (/^\d{1,3}(\.\d{3})*,\d{2}$/.test(t) || /^\d+,\d{2}$/.test(t)) {
    t = t.replace(/\./g, '').replace(',', '.');
  } else {
    t = t.replace(/,/g, '');
  }

  const n = parseFloat(t);
  return Number.isFinite(n) ? n : null;
}

type Positioned = { str: string; x: number; y: number };

/**
 * Reconstruct visual lines from PDF text positions (primary strategy).
 */
export async function extractLinesFromPdf(file: File, eps = 12): Promise<string[]> {
  const data = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data }).promise;
  const out: string[] = [];

  for (let p = 1; p <= pdf.numPages; p++) {
    const page = await pdf.getPage(p);
    const textContent = await page.getTextContent();
    const items = textContent.items as Array<{ str?: string; transform?: number[] }>;

    const positioned: Positioned[] = [];
    for (const item of items) {
      const s = item.str;
      if (!s || !String(s).trim()) continue;
      const tr = item.transform;
      if (!tr || tr.length < 6) continue;
      positioned.push({ str: String(s), x: tr[4]!, y: tr[5]! });
    }

    if (!positioned.length) continue;

    positioned.sort((a, b) => b.y - a.y || a.x - b.x);

    let bucket: Positioned[] = [];
    let yRef: number | null = null;

    const flush = () => {
      if (!bucket.length) return;
      bucket.sort((a, b) => a.x - b.x);
      const line = bucket
        .map(b => b.str)
        .join(' ')
        .replace(/\s+/g, ' ')
        .trim();
      if (line.length > 2) out.push(line);
      bucket = [];
    };

    for (const it of positioned) {
      if (yRef === null) {
        yRef = it.y;
        bucket = [it];
      } else if (Math.abs(it.y - yRef) <= eps) {
        bucket.push(it);
      } else {
        flush();
        yRef = it.y;
        bucket = [it];
      }
    }
    flush();
  }

  return out;
}

/**
 * Fallback: use pdf.js hasEOL flags (works when position bucketing fails).
 */
export async function extractLinesFromPdfHasEOL(file: File): Promise<string[]> {
  const data = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data }).promise;
  const lines: string[] = [];
  let buf = '';

  for (let p = 1; p <= pdf.numPages; p++) {
    const page = await pdf.getPage(p);
    const tc = await page.getTextContent();
    for (const item of tc.items) {
      const any = item as { str?: string; hasEOL?: boolean };
      if (!any.str) continue;
      buf += any.str;
      if (any.hasEOL) {
        const line = buf.replace(/\s+/g, ' ').trim();
        if (line.length > 2) lines.push(line);
        buf = '';
      } else {
        buf += ' ';
      }
    }
    const tail = buf.replace(/\s+/g, ' ').trim();
    if (tail.length > 2) lines.push(tail);
    buf = '';
  }

  return lines;
}

/** Glue all text with spaces, then split on likely row boundaries (weak fallback). */
export async function extractLinesFromPdfBlobSplit(file: File): Promise<string[]> {
  const data = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data }).promise;
  let blob = '';

  for (let p = 1; p <= pdf.numPages; p++) {
    const page = await pdf.getPage(p);
    const tc = await page.getTextContent();
    for (const item of tc.items) {
      const any = item as { str?: string };
      if (any.str) blob += any.str + ' ';
    }
    blob += '\n';
  }

  const normalized = blob.replace(/\s+/g, ' ').trim();
  // Split before each date-like token to form pseudo-lines
  const pieces = normalized.split(
    /(?=\d{4}[\/\-\.]\d{1,2}[\/\-\.]\d{1,2}|\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4})/g
  );
  return pieces.map(s => s.trim()).filter(s => s.length > 6);
}

function dedupeLines(lines: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const l of lines) {
    const k = l.replace(/\s+/g, ' ').trim();
    if (k.length < 4 || seen.has(k)) continue;
    seen.add(k);
    out.push(k);
  }
  return out;
}

const SKIP_LINE =
  /^(opening|closing|balance|page|statement|account|summary|total\s|continued|amount\s*\(|date\s*\(|transaction\s*date)/i;

function findDateInLine(line: string): { raw: string; norm: string; index: number } | null {
  const patterns: RegExp[] = [
    /\d{4}[\/\-\.]\d{1,2}[\/\-\.]\d{1,2}/,
    /\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4}/,
    new RegExp(`\\d{1,2}[-\\s/](${MONTHS})[-\\s/]\\d{4}`, 'i'),
    new RegExp(`(${MONTHS})\\s+\\d{1,2},?\\s+\\d{4}`, 'i'),
    /(?:Mon|Tue|Wed|Thu|Fri|Sat|Sun)\s+[A-Za-z]{3}\s+\d{1,2}/i,
  ];

  for (const re of patterns) {
    const m = line.match(re);
    if (!m || m.index === undefined) continue;
    const raw = m[0];
    const norm =
      parseStatementDate(raw) ?? parseDateLoose(raw) ?? parseDate(raw);
    if (norm) return { raw, norm, index: m.index };
  }
  return null;
}

function findAmountToken(tokens: string[]): { amountStr: string; amountIndex: number } | null {
  for (let i = tokens.length - 1; i >= 0; i--) {
    let chunk = tokens[i]!;
    if (/^(CR|DR)$/i.test(chunk) && i > 0) {
      chunk = `${tokens[i - 1]!} ${chunk}`;
      const a = parseAmountLoose(chunk.replace(/\s*(CR|DR)\s*$/i, ''));
      if (a !== null) return { amountStr: chunk, amountIndex: i - 1 };
      continue;
    }
    const a = parseAmountLoose(chunk) ?? parseAmount(chunk);
    if (a !== null) return { amountStr: chunk, amountIndex: i };
  }
  return null;
}

/** Parse "… date … description … amount" — amount only after first date (common bank layout). */
function tryParseAfterDateOnly(trimmed: string): { date: string; amount: number; narration: string } | null {
  const dh = findDateInLine(trimmed);
  if (!dh) return null;

  const afterDate = trimmed.slice(dh.index + dh.raw.length).trim();
  const prefix = trimmed.slice(0, dh.index).trim();
  const tokens = afterDate.split(/\s+/);
  if (!tokens.length) return null;

  const amtHit = findAmountToken(tokens);
  if (!amtHit) return null;

  const amt =
    parseAmountLoose(amtHit.amountStr.replace(/\s*(CR|DR)\s*$/i, '')) ??
    parseAmount(amtHit.amountStr.replace(/\s*(CR|DR)\s*$/i, ''));
  if (amt === null) return null;

  const narrMiddle = tokens.slice(0, amtHit.amountIndex).join(' ').trim();
  const narration = [prefix, narrMiddle].filter(Boolean).join(' — ').trim() || 'Imported';

  return { date: dh.norm, amount: amt, narration };
}

function tryParseStatementLine(line: string): { date: string; amount: number; narration: string } | null {
  const trimmed = line.replace(/\s+/g, ' ').trim();
  if (trimmed.length < 6 || SKIP_LINE.test(trimmed)) return null;

  const dateHit = findDateInLine(trimmed);
  if (!dateHit) return null;

  const before = trimmed.slice(0, dateHit.index).trim();
  const afterDate = trimmed.slice(dateHit.index + dateHit.raw.length).trim();
  const normDate = dateHit.norm;

  const rest = `${before} ${afterDate}`.replace(/\s+/g, ' ').trim();
  const tokens = rest.split(/\s+/);
  if (!tokens.length) return tryParseAfterDateOnly(trimmed);

  const amtHit = findAmountToken(tokens);
  if (!amtHit) return tryParseAfterDateOnly(trimmed);

  const amt =
    parseAmountLoose(amtHit.amountStr.replace(/\s*(CR|DR)\s*$/i, '')) ??
    parseAmount(amtHit.amountStr.replace(/\s*(CR|DR)\s*$/i, ''));
  if (amt === null) return tryParseAfterDateOnly(trimmed);

  const narration =
    tokens.slice(0, amtHit.amountIndex).join(' ').trim() || 'Imported';

  return { date: normDate, amount: amt, narration };
}

export function statementLinesToGrid(lines: string[]): string[][] {
  const header = ['Date', 'Amount', 'Description'];
  const rows: string[][] = [header];

  for (const line of lines) {
    if (line.length < 5) continue;
    const parsed = tryParseStatementLine(line);
    if (parsed) {
      rows.push([parsed.date, String(parsed.amount), parsed.narration]);
    }
  }

  return rows.length > 1 ? rows : [];
}

/** Merge strategies and parse; tries harder for stubborn bank PDFs. */
export async function parsePdfFileToGrid(file: File): Promise<string[][]> {
  const [a, b, c] = await Promise.all([
    extractLinesFromPdf(file, 12),
    extractLinesFromPdfHasEOL(file),
    extractLinesFromPdfBlobSplit(file),
  ]);

  const merged = dedupeLines([...a, ...b, ...c]);
  let grid = statementLinesToGrid(merged);
  if (grid.length > 1) return grid;

  // Second pass: looser line grouping (very tall rows)
  const wide = await extractLinesFromPdf(file, 18);
  grid = statementLinesToGrid(dedupeLines([...merged, ...wide]));
  return grid;
}

/** How much text we could read (for diagnostics / user-facing errors). */
export async function pdfTextStats(file: File): Promise<{ lineCount: number; charCount: number }> {
  const [a, b, c] = await Promise.all([
    extractLinesFromPdf(file),
    extractLinesFromPdfHasEOL(file),
    extractLinesFromPdfBlobSplit(file),
  ]);
  const merged = dedupeLines([...a, ...b, ...c]);
  const blob = merged.join('\n');
  return { lineCount: merged.length, charCount: blob.length };
}

export async function extractPdfPlainTextPreview(file: File, maxLen = 400): Promise<string> {
  const [a, b] = await Promise.all([extractLinesFromPdf(file), extractLinesFromPdfHasEOL(file)]);
  const pick = a.length ? a : b;
  return pick.slice(0, 16).join('\n').slice(0, maxLen);
}
