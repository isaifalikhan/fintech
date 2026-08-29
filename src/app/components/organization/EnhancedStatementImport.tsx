import { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useOrgServices } from '@/hooks/useOrgServices';
import { useService, useServiceArray } from '@/hooks/useService';
import { formatCurrency, formatDate } from '@/lib/formatters';
import { useTheme } from '@/contexts/ThemeContext';
import { AXIOM } from '@/styles/axiom-tokens';
import {
  Upload,
  FileText,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Eye,
  Trash2,
  ArrowRight,
  Sparkles,
  Loader2,
  FileSpreadsheet,
  Building2
} from 'lucide-react';
import { toast } from 'sonner';
import {
  parseCSVFile,
  autoDetectColumnMapping,
  processCSVData,
  findDuplicates,
  calculateImportStats,
  type ImportedTransaction,
  type ColumnMapping,
  columnKeyFromIndex,
} from '@/lib/importUtils';
import {
  parsePdfFileToGrid,
  extractPdfPlainTextPreview,
  pdfTextStats,
} from '@/lib/pdfStatementImport';

/** Tiny sample CSV for smoke / QA without a real file */
const SAMPLE_STATEMENT_CSV = `Date,Amount,Description
2026-01-15,-45.50,COFFEE SHOP
2026-01-14,1200.00,SALARY DEPOSIT
2026-01-13,-12.99,SUBSCRIPTION`;

/** Override list when statement currency differs from the wallet default (e.g. Payoneer USD). */
const IMPORT_CURRENCY_OPTIONS = ['PKR', 'USD', 'EUR', 'GBP', 'AED', 'SAR'] as const;

type ImportStep = 'upload' | 'mapping' | 'review' | 'complete';

export function EnhancedStatementImport({
  embedded = false,
}: {
  /** Compact layout for dashboard modal */
  embedded?: boolean;
} = {}) {
  const { theme } = useTheme();
  const [currentStep, setCurrentStep] = useState<ImportStep>('upload');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [selectedAccount, setSelectedAccount] = useState<string>('');
  /** Empty = use selected bank account currency */
  const [importCurrencyOverride, setImportCurrencyOverride] = useState('');
  const [dragActive, setDragActive] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [csvHeaders, setCsvHeaders] = useState<string[]>([]);
  const [csvData, setCsvData] = useState<string[][]>([]);
  const [columnMapping, setColumnMapping] = useState<ColumnMapping>({
    date: '',
    amount: '',
    narration: '',
    amountMode: 'single',
  });
  const [parsedTransactions, setParsedTransactions] = useState<ImportedTransaction[]>([]);
  const [filterDuplicates, setFilterDuplicates] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [lastImportedCount, setLastImportedCount] = useState(0);
  const [reviewMode, setReviewMode] = useState<'step' | 'list'>('step');
  const [reviewStepIndex, setReviewStepIndex] = useState(0);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const svc = useOrgServices();

  // Bank accounts for account selector
  const { data: bankAccounts } = useServiceArray(
    () => svc.accounts.getBankAccounts(),
    [svc.orgId],
    ['bankAccounts']
  );

  const { data: categories } = useServiceArray(
    () => svc.categories.getAll(),
    [svc.orgId],
    ['categories']
  );

  // Existing transactions for duplicate detection
  const { data: txnResult, refetch: refetchTransactions } = useService(
    () => svc.transactions.getAll({ pageSize: 1000 }),
    [svc.orgId],
    ['transactions']
  );
  const existingTransactions = txnResult?.items ?? [];

  // Drag and drop handlers
  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  }, []);

  const handleFileSelected = useCallback(async (file: File) => {
    const name = file.name.toLowerCase();
    const isCsv = name.endsWith('.csv');
    const isPdf = name.endsWith('.pdf');
    if (!isCsv && !isPdf) {
      toast.error('Please use a CSV or PDF bank statement');
      return;
    }

    setSelectedFile(file);
    setProcessing(true);

    try {
      let data: string[][];

      if (isPdf) {
        data = await parsePdfFileToGrid(file);
        if (!data.length || data.length < 2) {
          let stats = { lineCount: 0, charCount: 0 };
          try {
            stats = await pdfTextStats(file);
            const preview = await extractPdfPlainTextPreview(file, 500);
            console.warn('[Statement import] PDF read stats:', stats, '\nPreview:\n', preview);
          } catch {
            /* ignore */
          }
          const noText = stats.charCount < 20;
          toast.error('No transactions found in this PDF', {
            description: noText
              ? 'This file has almost no selectable text — it may be a scanned image. Export CSV from your bank, or use a PDF with copy-pasteable text.'
              : `We extracted about ${stats.lineCount} lines but could not match date + amount rows. Try CSV export, or another PDF from your bank.`,
          });
          setProcessing(false);
          return;
        }
      } else {
        data = await parseCSVFile(file);
        if (!data.length) {
          toast.error('This file looks empty. Export again as CSV (UTF-8) from your bank or Excel.');
          setProcessing(false);
          return;
        }
      }

      const headers = data[0];
      if (!headers?.length) {
        toast.error(
          isPdf
            ? 'Could not build columns from this PDF. Try CSV instead.'
            : 'Could not read column headers. Check the file is a comma or semicolon CSV.'
        );
        setProcessing(false);
        return;
      }

      setCsvHeaders(headers);
      setCsvData(data);

      const detectedMapping = autoDetectColumnMapping(headers);
      setColumnMapping(detectedMapping);

      setCurrentStep('mapping');
      toast.success(isPdf ? 'PDF text extracted — review column mapping' : 'File parsed successfully!');
    } catch (error) {
      console.error('Error parsing file:', error);
      toast.error(
        name.endsWith('.pdf')
          ? 'Could not read this PDF. Try another file or export CSV from your bank.'
          : 'Failed to parse file. Try UTF-8 CSV with a header row.'
      );
    } finally {
      setProcessing(false);
    }
  }, []);

  const handleDrop = useCallback(
    async (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setDragActive(false);

      const files = Array.from(e.dataTransfer.files);
      const file = files[0];

      const n = file?.name.toLowerCase() ?? '';
      if (file && (n.endsWith('.csv') || n.endsWith('.pdf'))) {
        await handleFileSelected(file);
      } else {
        toast.error('Please upload a CSV or PDF file');
      }
    },
    [handleFileSelected]
  );

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (file) {
      void handleFileSelected(file);
    }
  };

  const mappingIsComplete = useMemo(() => {
    if (!columnMapping.date?.trim() || !columnMapping.narration?.trim()) return false;
    if (columnMapping.amountMode === 'debit_credit') {
      return !!(columnMapping.debit?.trim() && columnMapping.credit?.trim());
    }
    return !!columnMapping.amount?.trim();
  }, [columnMapping]);

  const selectedBankAccount = useMemo(
    () => bankAccounts.find(a => a.id === selectedAccount),
    [bankAccounts, selectedAccount]
  );

  const resolvedImportCurrency = useMemo(() => {
    const o = importCurrencyOverride.trim().toUpperCase();
    if (o) return o;
    return (selectedBankAccount?.currency || 'USD').toUpperCase();
  }, [importCurrencyOverride, selectedBankAccount?.currency]);

  const handleProceedToReview = async () => {
    if (bankAccounts.length === 0) {
      toast.error('Add a bank account or wallet before importing.');
      return;
    }
    if (!selectedAccount) {
      toast.error('Choose which bank account this statement is for');
      return;
    }
    if (!mappingIsComplete) {
      toast.error(
        columnMapping.amountMode === 'debit_credit'
          ? 'Please map date, description, debit column, and credit column'
          : 'Please map date, amount, and description columns'
      );
      return;
    }

    setProcessing(true);

    try {
      // Process CSV data
      const transactions = processCSVData(csvData, columnMapping, csvHeaders);

      // Never advance to Review with nothing to review — that used to show a dead
      // "Total 0 / To Import 0" screen plus a "Parsed 0 rows" *success* toast, leaving the
      // user stuck with no idea what went wrong. Explain the likely cause instead.
      if (transactions.length === 0) {
        const dataRowCount = Math.max(0, csvData.length - 1);
        toast.error(
          dataRowCount === 0
            ? 'That file has no data rows below the header.'
            : `None of the ${dataRowCount} row(s) could be read. Check the Column Mapping step — the date, description and amount columns must point at real columns.`,
          { duration: 8000 },
        );
        setCurrentStep('mapping');
        return;
      }

      // Detect duplicates (ledger rows may omit fields — handled in importUtils)
      findDuplicates(transactions, existingTransactions);

      const batchPayload = transactions.map(t => ({
        narration: t.narration,
        amount: t.amount,
        type: t.type,
      }));
      const classRes = await svc.classification.batchClassify(batchPayload);
      if (classRes.success && classRes.data) {
        transactions.forEach((txn, i) => {
          const r = classRes.data!.get(i);
          if (r) {
            txn.confidence = r.confidence;
            txn.suggestedCategory = r.categoryName;
          }
        });
      }

      setParsedTransactions(
        transactions.map(t => ({ ...t, usage: t.usage ?? 'business' }))
      );
      setReviewStepIndex(0);
      setReviewMode('step');
      setCurrentStep('review');
      toast.success(`Parsed ${transactions.length} rows — review each below`);
    } catch (e) {
      console.error(e);
      toast.error('Could not prepare review step');
    } finally {
      setProcessing(false);
    }
  };

  const handleImport = async () => {
    if (!selectedAccount || !selectedFile) {
      toast.error('Choose a bank account and file first');
      return;
    }

    const account = bankAccounts.find(a => a.id === selectedAccount);
    if (!account) {
      toast.error('Bank account not found');
      return;
    }

    const rowsToCommit = parsedTransactions.filter(txn => {
      if (filterDuplicates && txn.isDuplicate) return false;
      if (searchQuery && !txn.narration.toLowerCase().includes(searchQuery.toLowerCase())) {
        return false;
      }
      return true;
    });

    if (rowsToCommit.length === 0) {
      toast.error('No rows to import. Adjust filters or mapping.');
      return;
    }

    setProcessing(true);

    const res = await svc.imports.commitParsedImport(
      selectedAccount,
      resolvedImportCurrency,
      selectedFile.name,
      rowsToCommit,
      { skipDuplicates: false, autoClassify: true }
    );

    setProcessing(false);

    if (!res.success || !res.data) {
      toast.error(res.error || 'Import failed');
      return;
    }

    setLastImportedCount(res.data.imported);
    setCurrentStep('complete');
    await refetchTransactions();
    toast.success(res.message || 'Import completed');
  };

  const loadSampleCsv = async () => {
    if (bankAccounts.length > 0 && !selectedAccount) {
      setSelectedAccount(bankAccounts[0].id);
    }

    const blob = new Blob([SAMPLE_STATEMENT_CSV], { type: 'text/csv' });
    const file = new File([blob], 'sample-statement.csv', { type: 'text/csv' });
    await handleFileSelected(file);
  };

  const stats = calculateImportStats(parsedTransactions);

  const patchTransaction = useCallback((id: string, patch: Partial<ImportedTransaction>) => {
    setParsedTransactions(prev =>
      prev.map(t => (t.id === id ? { ...t, ...patch } : t))
    );
  }, []);

  const filteredTransactions = parsedTransactions.filter(txn => {
    if (filterDuplicates && txn.isDuplicate) return false;
    if (searchQuery && !txn.narration.toLowerCase().includes(searchQuery.toLowerCase())) {
      return false;
    }
    return true;
  });

  useEffect(() => {
    if (filteredTransactions.length === 0) {
      setReviewStepIndex(0);
      return;
    }
    setReviewStepIndex(i => (i >= filteredTransactions.length ? filteredTransactions.length - 1 : i));
  }, [filteredTransactions.length]);

  const focusedTxn = filteredTransactions[reviewStepIndex] ?? null;

  const stepIndex = ['upload', 'mapping', 'review', 'complete'].indexOf(currentStep);

  const resetImport = useCallback(() => {
    setCurrentStep('upload');
    setSelectedFile(null);
    setParsedTransactions([]);
    setSelectedAccount('');
    setLastImportedCount(0);
    setCsvHeaders([]);
    setCsvData([]);
    setColumnMapping({ date: '', amount: '', narration: '', amountMode: 'single' });
    setImportCurrencyOverride('');
    setSearchQuery('');
    setFilterDuplicates(true);
  }, []);

  const handleNewImport = useCallback(() => {
    resetImport();
    window.setTimeout(() => fileInputRef.current?.click(), 0);
  }, [resetImport]);

  const canNavigateTo = useCallback(
    (step: ImportStep): boolean => {
      switch (step) {
        case 'upload':
          return true;
        case 'mapping':
          return csvData.length > 0 && csvHeaders.length > 0;
        case 'review':
          return parsedTransactions.length > 0;
        case 'complete':
          return currentStep === 'complete' || lastImportedCount > 0;
        default:
          return false;
      }
    },
    [csvData.length, csvHeaders.length, parsedTransactions.length, currentStep, lastImportedCount]
  );

  const goToStep = useCallback(
    (step: ImportStep) => {
      if (!canNavigateTo(step)) return;
      setCurrentStep(step);
    },
    [canNavigateTo]
  );

  /** Upload step: go to upload screen and open the same file dialog as the drop zone */
  const handleUploadStepClick = useCallback(() => {
    setCurrentStep('upload');
    window.setTimeout(() => fileInputRef.current?.click(), 0);
  }, []);

  return (
    <div
      className={embedded ? 'space-y-4' : 'min-h-screen p-8 space-y-6'}
      style={embedded ? undefined : { background: AXIOM.backgrounds.main }}
    >
      {/* Header */}
      {!embedded && (
        <motion.div {...AXIOM.animations.fadeInTop}>
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div
                className="p-3 rounded-xl flex items-center justify-center"
                style={{
                  background: AXIOM.iconBoxes.cyan,
                  boxShadow: AXIOM.shadows.iconCyan,
                }}
              >
                <FileSpreadsheet className="size-6 text-white" />
              </div>
              <div>
                <h1 className="text-4xl font-bold" style={AXIOM.text.titleStyle}>
                  Enhanced Statement Import
                </h1>
                <p className="text-slate-400 text-sm">
                  Import and auto-classify bank statements with smart detection
                </p>
              </div>
            </div>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="px-4 py-2 rounded-xl text-sm font-medium flex items-center gap-2"
              style={{
                background: 'linear-gradient(135deg, rgba(6, 182, 212, 0.4), rgba(59, 130, 246, 0.4))',
                border: '1px solid rgba(6, 182, 212, 0.5)',
                boxShadow: '0 10px 30px -10px rgba(6, 182, 212, 0.6)',
                color: '#ffffff',
              }}
              type="button"
              onClick={handleNewImport}
            >
              <Upload className="size-4" />
              New Import
            </motion.button>
          </div>
        </motion.div>
      )}

      {embedded && (
        <div className="flex justify-end">
          <motion.button
            type="button"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 border border-slate-600 text-slate-200 hover:bg-slate-800/80"
            onClick={handleNewImport}
          >
            <Upload className="size-3.5" />
            Start over
          </motion.button>
        </div>
      )}

      {/* Progress Steps */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className={`flex items-center gap-3 ${embedded ? 'overflow-x-auto pb-1 -mx-1 px-1' : ''}`}
      >
        {[
          { id: 'upload', label: 'Upload File', icon: Upload },
          { id: 'mapping', label: 'Column Mapping', icon: FileText },
          { id: 'review', label: 'Review & Classify', icon: Eye },
          { id: 'complete', label: 'Complete', icon: CheckCircle2 },
        ].map((step, index) => {
          const Icon = step.icon;
          const stepId = step.id as ImportStep;
          const isActive = currentStep === step.id;
          const isCompleted = stepIndex > index;
          const navigable = canNavigateTo(stepId);
          const isUpload = step.id === 'upload';

          return (
            <div key={step.id} className="flex items-center flex-1">
              <motion.button
                type="button"
                whileHover={navigable || isUpload ? { scale: 1.02 } : undefined}
                onClick={() => {
                  if (isUpload) {
                    handleUploadStepClick();
                  } else {
                    goToStep(stepId);
                  }
                }}
                disabled={!isUpload && !navigable}
                title={
                  isUpload
                    ? 'Choose CSV or PDF'
                    : !navigable
                      ? 'Complete the previous step first'
                      : `Go to ${step.label}`
                }
                className="flex items-center gap-3 px-4 py-3 rounded-xl flex-1 transition-all text-left w-full disabled:opacity-50 disabled:cursor-not-allowed enabled:cursor-pointer"
                style={{
                  background: isActive
                    ? 'linear-gradient(135deg, rgba(6, 182, 212, 0.2), rgba(59, 130, 246, 0.2))'
                    : isCompleted
                      ? 'rgba(16, 185, 129, 0.1)'
                      : AXIOM.containers.item.background,
                  border: isActive
                    ? '1px solid rgba(6, 182, 212, 0.5)'
                    : isCompleted
                      ? '1px solid rgba(16, 185, 129, 0.3)'
                      : AXIOM.containers.item.border,
                }}
              >
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                  style={{
                    background: isActive
                      ? AXIOM.iconBoxes.cyan
                      : isCompleted
                        ? AXIOM.iconBoxes.green
                        : 'rgba(0, 0, 0, 0.3)',
                    boxShadow: isActive
                      ? AXIOM.shadows.iconCyan
                      : isCompleted
                        ? AXIOM.shadows.iconGreen
                        : 'none',
                  }}
                >
                  <Icon className="size-5 text-white" />
                </div>
                <div className="min-w-0">
                  <div
                    className="text-sm font-semibold"
                    style={{
                      color: isActive ? '#22d3ee' : isCompleted ? '#34d399' : AXIOM.text.slate400,
                    }}
                  >
                    {step.label}
                  </div>
                </div>
              </motion.button>
              {index < 3 && (
                <ArrowRight className="size-5 mx-2 shrink-0" style={{ color: AXIOM.text.slate400 }} />
              )}
            </div>
          );
        })}
      </motion.div>

      {/* Step Content */}
      {/* mode="wait" previously serialized step transitions behind the OLD step's exit
          animation finishing. If that animation never completes (throttled/hidden tab,
          reduced-motion settings, a GPU hiccup) the wizard looked permanently stuck on
          "Processing file..." even though parsing had already succeeded and state had
          already advanced — the next step's content just never mounted. Default (sync)
          mode mounts the new step immediately; old and new steps cross-fade instead of
          strictly sequencing. */}
      <AnimatePresence>
        {currentStep === 'upload' && (
          <motion.div
            key="upload"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="space-y-6"
          >
            {/* Account Selection */}
            <div className="p-6 rounded-2xl" style={AXIOM.containers.list}>
              <h3 className="text-xl font-bold text-white mb-4">Select bank account</h3>
              <p className="text-sm text-slate-400 mb-4">
                Statement lines are saved to this wallet so reports and future matching stay aligned.
              </p>
              {bankAccounts.length === 0 ? (
                <p className="text-slate-400 text-sm">
                  No bank accounts yet. Add one under Accounts &amp; wallets or Payment methods first.
                </p>
              ) : null}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {bankAccounts.map((account) => (
                  <motion.button
                    key={account.id}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => setSelectedAccount(account.id)}
                    className="p-4 rounded-xl transition-all text-left"
                    style={{
                      background: selectedAccount === account.id
                        ? 'linear-gradient(135deg, rgba(6, 182, 212, 0.2), rgba(59, 130, 246, 0.2))'
                        : AXIOM.containers.item.background,
                      border: selectedAccount === account.id
                        ? '1px solid rgba(6, 182, 212, 0.5)'
                        : AXIOM.containers.item.border,
                    }}
                  >
                    <div className="flex items-center gap-3 mb-2">
                      <div 
                        className="w-10 h-10 rounded-xl flex items-center justify-center"
                        style={{
                          background: AXIOM.iconBoxes.blue,
                          boxShadow: AXIOM.shadows.iconBlue,
                        }}
                      >
                        <Building2 className="size-5 text-white" />
                      </div>
                      <div className="flex-1">
                        <div className="text-white font-semibold">{account.bankName}</div>
                        <div className="text-xs" style={{ color: AXIOM.text.slate400 }}>
                          {account.accountNumber}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-baseline justify-between gap-2">
                      <div className="text-lg font-bold text-cyan-400">
                        {formatCurrency(account.balance, account.currency)}
                      </div>
                      <span className="text-xs font-medium uppercase text-slate-500">{account.currency}</span>
                    </div>
                  </motion.button>
                ))}
              </div>
            </div>

            {/* File upload — entire dashed area is clickable (label fills box) */}
            <div
              onDragEnter={handleDrag}
              onDragOver={handleDrag}
              onDragLeave={handleDrag}
              onDrop={handleDrop}
              className="rounded-2xl border-2 border-dashed text-center transition-all"
              style={{
                background: dragActive
                  ? 'rgba(6, 182, 212, 0.1)'
                  : AXIOM.containers.list.background,
                borderColor: dragActive ? 'rgba(6, 182, 212, 0.5)' : 'rgba(148, 163, 184, 0.2)',
              }}
            >
              <label
                htmlFor="file-upload"
                className="flex flex-col items-center justify-center min-h-[220px] cursor-pointer p-12"
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  id="file-upload"
                  className="sr-only"
                  accept=".csv,.pdf,text/csv,application/pdf"
                  onChange={handleFileInputChange}
                />
                <div
                  className="w-24 h-24 mx-auto mb-6 rounded-2xl flex items-center justify-center"
                  style={{
                    background: AXIOM.iconBoxes.cyan,
                    boxShadow: AXIOM.shadows.iconCyan,
                  }}
                >
                  <Upload className="size-12 text-white" />
                </div>
                <h3 className="text-2xl font-bold text-white mb-2">
                  {selectedFile ? selectedFile.name : 'Drop your statement file here'}
                </h3>
                <p className="text-slate-400 mb-6">or click anywhere in this box</p>
                <div className="flex flex-wrap items-center justify-center gap-3">
                  <span className="px-4 py-2 rounded-lg text-sm" style={AXIOM.badges.info}>
                    CSV or PDF
                  </span>
                </div>
              </label>
            </div>

            <div className="flex justify-center">
              <motion.button
                type="button"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => void loadSampleCsv()}
                className="px-4 py-2 rounded-xl text-sm font-medium border border-slate-600 text-slate-200 hover:bg-slate-800/80"
              >
                Try sample CSV
              </motion.button>
            </div>

            {selectedFile && !processing && (
              <div className="flex justify-end">
                <motion.button
                  type="button"
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => selectedFile && void handleFileSelected(selectedFile)}
                  className="px-6 py-3 rounded-xl text-sm font-medium flex items-center gap-2"
                  style={{
                    background:
                      'linear-gradient(135deg, rgba(6, 182, 212, 0.4), rgba(59, 130, 246, 0.4))',
                    border: '1px solid rgba(6, 182, 212, 0.5)',
                    boxShadow: '0 10px 30px -10px rgba(6, 182, 212, 0.6)',
                    color: '#ffffff',
                  }}
                >
                  Parse again / proceed to mapping
                  <ArrowRight className="size-4" />
                </motion.button>
              </div>
            )}

            {processing && (
              <div className="flex items-center justify-center gap-3 py-8">
                <Loader2 className="size-6 text-cyan-400 animate-spin" />
                <span className="text-slate-400">Processing file...</span>
              </div>
            )}
          </motion.div>
        )}

        {currentStep === 'mapping' && (
          <motion.div
            key="mapping"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="space-y-6"
          >
            <div className="p-6 rounded-2xl" style={AXIOM.containers.list}>
              <h3 className="text-xl font-bold text-white mb-2">Import settings</h3>
              <p className="text-sm text-slate-400 mb-4">
                Choose the wallet and currency for these lines. Default is the wallet&apos;s currency; override
                if the statement is in another currency (e.g. Payoneer in USD).
              </p>
              {bankAccounts.length === 0 ? (
                <p className="text-sm text-amber-400/90">
                  Add a bank account or wallet under Accounts first, then run this import again.
                </p>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-slate-400 mb-2">Bank account</label>
                    <select
                      value={selectedAccount}
                      onChange={e => setSelectedAccount(e.target.value)}
                      className="w-full px-4 py-3 rounded-xl text-white focus:outline-none transition-all"
                      style={{
                        background: AXIOM.inputs.background,
                        border: AXIOM.inputs.border,
                      }}
                    >
                      <option value="">Select account…</option>
                      {bankAccounts.map(a => (
                        <option key={a.id} value={a.id}>
                          {a.bankName} · {a.accountNumber} ({a.currency})
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-400 mb-2">Currency</label>
                    <select
                      value={importCurrencyOverride}
                      onChange={e => setImportCurrencyOverride(e.target.value)}
                      className="w-full px-4 py-3 rounded-xl text-white focus:outline-none transition-all"
                      style={{
                        background: AXIOM.inputs.background,
                        border: AXIOM.inputs.border,
                      }}
                    >
                      <option value="">
                        Same as account ({selectedBankAccount?.currency?.toUpperCase() ?? '—'})
                      </option>
                      {IMPORT_CURRENCY_OPTIONS.map(c => (
                        <option key={c} value={c}>
                          {c}
                        </option>
                      ))}
                    </select>
                    <p className="text-xs text-slate-500 mt-2">
                      Stored as{' '}
                      <span className="text-slate-300 font-medium">{resolvedImportCurrency}</span>
                    </p>
                  </div>
                </div>
              )}
            </div>

            <div className="p-6 rounded-2xl" style={AXIOM.containers.list}>
              <h3 className="text-xl font-bold text-white mb-2">Map CSV Columns</h3>
              <p className="text-sm text-slate-400 mb-4">
                Choose which <span className="text-slate-300">column number</span> (left to right) matches each
                field — works even when bank headers differ. Common layouts: Date, Description, Debit, Credit,
                Balance.
              </p>

              <div className="mb-6 p-4 rounded-xl border border-slate-600/60 bg-slate-900/40">
                <p className="text-sm font-medium text-slate-300 mb-3">How amounts appear in this file</p>
                <div className="flex flex-col sm:flex-row sm:flex-wrap gap-3">
                  <label className="flex items-center gap-2 cursor-pointer text-sm text-slate-300">
                    <input
                      type="radio"
                      name="amountMode"
                      className="accent-cyan-500"
                      checked={columnMapping.amountMode !== 'debit_credit'}
                      onChange={() =>
                        setColumnMapping({
                          ...columnMapping,
                          amountMode: 'single',
                          debit: undefined,
                          credit: undefined,
                        })
                      }
                    />
                    One amount column
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer text-sm text-slate-300">
                    <input
                      type="radio"
                      name="amountMode"
                      className="accent-cyan-500"
                      checked={columnMapping.amountMode === 'debit_credit'}
                      onChange={() =>
                        setColumnMapping({
                          ...columnMapping,
                          amountMode: 'debit_credit',
                          amount: '',
                        })
                      }
                    />
                    Separate Debit and Credit columns
                  </label>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {(
                  [
                    { key: 'date', label: 'Date', required: true },
                    { key: 'narration', label: 'Description / narration', required: true },
                  ] as const
                ).map(field => (
                  <div key={field.key}>
                    <label className="block text-sm font-medium text-slate-400 mb-2">
                      {field.label}
                      {field.required && <span className="text-red-400 ml-1">*</span>}
                    </label>
                    <select
                      value={columnMapping[field.key] || ''}
                      onChange={e =>
                        setColumnMapping({ ...columnMapping, [field.key]: e.target.value })
                      }
                      className="w-full px-4 py-3 rounded-xl text-white focus:outline-none transition-all"
                      style={{
                        background: AXIOM.inputs.background,
                        border: AXIOM.inputs.border,
                      }}
                    >
                      <option value="">Select column…</option>
                      {csvHeaders.map((header, idx) => (
                        <option key={idx} value={columnKeyFromIndex(idx)}>
                          Column {idx + 1} — {header || '(empty)'}
                        </option>
                      ))}
                    </select>
                  </div>
                ))}

                {columnMapping.amountMode === 'debit_credit' ? (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-slate-400 mb-2">
                        Debit (outflow) <span className="text-red-400 ml-1">*</span>
                      </label>
                      <select
                        value={columnMapping.debit || ''}
                        onChange={e =>
                          setColumnMapping({ ...columnMapping, debit: e.target.value || undefined })
                        }
                        className="w-full px-4 py-3 rounded-xl text-white focus:outline-none transition-all"
                        style={{
                          background: AXIOM.inputs.background,
                          border: AXIOM.inputs.border,
                        }}
                      >
                        <option value="">Select column…</option>
                        {csvHeaders.map((header, idx) => (
                          <option key={idx} value={columnKeyFromIndex(idx)}>
                            Column {idx + 1} — {header || '(empty)'}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-400 mb-2">
                        Credit (inflow) <span className="text-red-400 ml-1">*</span>
                      </label>
                      <select
                        value={columnMapping.credit || ''}
                        onChange={e =>
                          setColumnMapping({ ...columnMapping, credit: e.target.value || undefined })
                        }
                        className="w-full px-4 py-3 rounded-xl text-white focus:outline-none transition-all"
                        style={{
                          background: AXIOM.inputs.background,
                          border: AXIOM.inputs.border,
                        }}
                      >
                        <option value="">Select column…</option>
                        {csvHeaders.map((header, idx) => (
                          <option key={idx} value={columnKeyFromIndex(idx)}>
                            Column {idx + 1} — {header || '(empty)'}
                          </option>
                        ))}
                      </select>
                    </div>
                  </>
                ) : (
                  <div>
                    <label className="block text-sm font-medium text-slate-400 mb-2">
                      Amount <span className="text-red-400 ml-1">*</span>
                    </label>
                    <select
                      value={columnMapping.amount || ''}
                      onChange={e => setColumnMapping({ ...columnMapping, amount: e.target.value })}
                      className="w-full px-4 py-3 rounded-xl text-white focus:outline-none transition-all"
                      style={{
                        background: AXIOM.inputs.background,
                        border: AXIOM.inputs.border,
                      }}
                    >
                      <option value="">Select column…</option>
                      {csvHeaders.map((header, idx) => (
                        <option key={idx} value={columnKeyFromIndex(idx)}>
                          Column {idx + 1} — {header || '(empty)'}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                <details className="md:col-span-2 mt-1 rounded-xl border border-slate-600/50 bg-slate-900/30">
                  <summary className="cursor-pointer list-none px-4 py-3 text-sm font-medium text-slate-300 [&::-webkit-details-marker]:hidden flex items-center gap-2">
                    <span className="text-cyan-400/90">▸</span>
                    More column roles (optional — balance, reference, Dr/Cr)
                  </summary>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 px-4 pb-4 pt-0 border-t border-slate-700/50">
                    {(
                      [
                        { key: 'balance', label: 'Balance (optional)', required: false },
                        { key: 'reference', label: 'Reference (optional)', required: false },
                        { key: 'type', label: 'Type Dr/Cr (optional)', required: false },
                      ] as const
                    ).map(field => (
                      <div key={field.key} className={field.key === 'type' ? 'md:col-span-2' : ''}>
                        <label className="block text-sm font-medium text-slate-400 mb-2">{field.label}</label>
                        <select
                          value={columnMapping[field.key] || ''}
                          onChange={e =>
                            setColumnMapping({
                              ...columnMapping,
                              [field.key]: e.target.value || undefined,
                            })
                          }
                          className="w-full px-4 py-3 rounded-xl text-white focus:outline-none transition-all"
                          style={{
                            background: AXIOM.inputs.background,
                            border: AXIOM.inputs.border,
                          }}
                        >
                          <option value="">Select column…</option>
                          {csvHeaders.map((header, idx) => (
                            <option key={idx} value={columnKeyFromIndex(idx)}>
                              Column {idx + 1} — {header || '(empty)'}
                            </option>
                          ))}
                        </select>
                      </div>
                    ))}
                  </div>
                </details>
              </div>

              <div 
                className="mt-6 p-4 rounded-xl"
                style={{
                  background: 'rgba(59, 130, 246, 0.1)',
                  border: '1px solid rgba(59, 130, 246, 0.3)',
                }}
              >
                <div className="flex items-start gap-3">
                  <Sparkles className="size-5 text-blue-400 mt-0.5" />
                  <div>
                    <h4 className="text-sm font-semibold text-blue-400 mb-1">Smart detection</h4>
                    <p className="text-xs text-slate-400">
                      We guess mappings from header names when we can. Always match by column number if your
                      bank uses unusual labels — e.g. Column 1 = date, Column 2 = description, Column 3 = debit.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex justify-between">
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setCurrentStep('upload')}
                className="px-6 py-3 rounded-xl text-sm font-medium"
                style={AXIOM.buttons.secondary}
              >
                Back
              </motion.button>
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={handleProceedToReview}
                disabled={
                  processing ||
                  !mappingIsComplete ||
                  bankAccounts.length === 0 ||
                  !selectedAccount
                }
                className="px-6 py-3 rounded-xl text-sm font-medium flex items-center gap-2"
                style={{
                  ...(mappingIsComplete &&
                    !processing &&
                    bankAccounts.length > 0 &&
                    !!selectedAccount
                    ? {
                        background: 'linear-gradient(135deg, rgba(6, 182, 212, 0.4), rgba(59, 130, 246, 0.4))',
                        border: '1px solid rgba(6, 182, 212, 0.5)',
                        boxShadow: '0 10px 30px -10px rgba(6, 182, 212, 0.6)',
                        color: '#ffffff',
                      }
                    : {
                        background: 'rgba(148, 163, 184, 0.1)',
                        border: '1px solid rgba(148, 163, 184, 0.2)',
                        color: AXIOM.text.slate400,
                        opacity: 0.5,
                        cursor: 'not-allowed',
                      }),
                }}
              >
                {processing ? (
                  <>
                    <Loader2 className="size-4 animate-spin" />
                    Preparing…
                  </>
                ) : (
                  <>
                    Proceed to Review
                    <ArrowRight className="size-4" />
                  </>
                )}
              </motion.button>
            </div>
          </motion.div>
        )}

        {currentStep === 'review' && (
          <motion.div
            key="review"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="space-y-6"
          >
            {/* Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="p-6 rounded-2xl" style={AXIOM.containers.list}>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-slate-400 text-sm mb-1">Total</p>
                    <p className="text-2xl font-bold text-white">{stats.total}</p>
                  </div>
                  <div 
                    className="w-12 h-12 rounded-xl flex items-center justify-center"
                    style={{
                      background: AXIOM.iconBoxes.purple,
                      boxShadow: AXIOM.shadows.iconPurple,
                    }}
                  >
                    <FileText className="size-6 text-white" />
                  </div>
                </div>
              </div>

              <div className="p-6 rounded-2xl" style={AXIOM.containers.list}>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-slate-400 text-sm mb-1">Auto-Classified</p>
                    <p className="text-2xl font-bold text-emerald-400">{stats.classified}</p>
                  </div>
                  <div 
                    className="w-12 h-12 rounded-xl flex items-center justify-center"
                    style={{
                      background: AXIOM.iconBoxes.green,
                      boxShadow: AXIOM.shadows.iconGreen,
                    }}
                  >
                    <CheckCircle2 className="size-6 text-white" />
                  </div>
                </div>
              </div>

              <div className="p-6 rounded-2xl" style={AXIOM.containers.list}>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-slate-400 text-sm mb-1">Duplicates</p>
                    <p className="text-2xl font-bold text-amber-400">{stats.duplicates}</p>
                  </div>
                  <div 
                    className="w-12 h-12 rounded-xl flex items-center justify-center"
                    style={{
                      background: AXIOM.iconBoxes.orange,
                      boxShadow: AXIOM.shadows.iconOrange,
                    }}
                  >
                    <AlertTriangle className="size-6 text-white" />
                  </div>
                </div>
              </div>

              <div className="p-6 rounded-2xl" style={AXIOM.containers.list}>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-slate-400 text-sm mb-1">To Import</p>
                    <p className="text-2xl font-bold text-cyan-400">{filteredTransactions.length}</p>
                  </div>
                  <div 
                    className="w-12 h-12 rounded-xl flex items-center justify-center"
                    style={{
                      background: AXIOM.iconBoxes.cyan,
                      boxShadow: AXIOM.shadows.iconCyan,
                    }}
                  >
                    <Sparkles className="size-6 text-white" />
                  </div>
                </div>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-4 px-1">
              <label className="flex items-center gap-2 text-sm text-slate-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={filterDuplicates}
                  onChange={e => setFilterDuplicates(e.target.checked)}
                  className="rounded border-slate-600"
                />
                Hide likely duplicates
              </label>
            </div>

            <div className="flex flex-wrap items-center gap-3 px-1">
              <span className="text-sm text-slate-500">Review</span>
              <button
                type="button"
                onClick={() => setReviewMode('step')}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium border ${
                  reviewMode === 'step'
                    ? 'border-cyan-500 text-cyan-300 bg-cyan-950/40'
                    : 'border-slate-600 text-slate-400 hover:bg-slate-800/80'
                }`}
              >
                One by one
              </button>
              <button
                type="button"
                onClick={() => setReviewMode('list')}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium border ${
                  reviewMode === 'list'
                    ? 'border-cyan-500 text-cyan-300 bg-cyan-950/40'
                    : 'border-slate-600 text-slate-400 hover:bg-slate-800/80'
                }`}
              >
                All rows
              </button>
            </div>

            {reviewMode === 'step' && focusedTxn && (
              <div className="p-6 rounded-2xl space-y-4" style={AXIOM.containers.list}>
                <div className="flex flex-wrap justify-between items-start gap-4">
                  <div>
                    <h3 className="text-lg font-bold text-white">
                      Transaction {reviewStepIndex + 1} of {filteredTransactions.length}
                    </h3>
                    <p className="text-sm text-slate-400 mt-1">
                      {formatDate(focusedTxn.date)} ·{' '}
                      <span
                        className={
                          focusedTxn.type === 'credit' ? 'text-emerald-400' : 'text-red-400'
                        }
                      >
                        {formatCurrency(focusedTxn.amount, resolvedImportCurrency)}
                      </span>
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      disabled={reviewStepIndex <= 0}
                      onClick={() => setReviewStepIndex(i => Math.max(0, i - 1))}
                      className="px-3 py-2 rounded-lg text-sm border border-slate-600 text-slate-200 disabled:opacity-40"
                    >
                      Previous
                    </button>
                    <button
                      type="button"
                      disabled={reviewStepIndex >= filteredTransactions.length - 1}
                      onClick={() =>
                        setReviewStepIndex(i => Math.min(filteredTransactions.length - 1, i + 1))
                      }
                      className="px-3 py-2 rounded-lg text-sm border border-slate-600 text-slate-200 disabled:opacity-40"
                    >
                      Next
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-400 mb-2">
                    Description / narration
                  </label>
                  <textarea
                    value={focusedTxn.narration}
                    onChange={e =>
                      patchTransaction(focusedTxn.id, { narration: e.target.value })
                    }
                    rows={3}
                    className="w-full px-4 py-3 rounded-xl text-white placeholder:text-slate-500 focus:outline-none resize-y min-h-[80px]"
                    style={{
                      background: AXIOM.inputs.background,
                      border: AXIOM.inputs.border,
                    }}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-400 mb-2">
                    Category (salary, software, etc.)
                  </label>
                  <select
                    value={focusedTxn.importCategoryId ?? ''}
                    onChange={e =>
                      patchTransaction(focusedTxn.id, {
                        importCategoryId: e.target.value || undefined,
                      })
                    }
                    className="w-full max-w-lg px-4 py-3 rounded-xl text-white focus:outline-none"
                    style={{
                      background: AXIOM.inputs.background,
                      border: AXIOM.inputs.border,
                    }}
                  >
                    <option value="">Let auto-classify decide</option>
                    {categories.map(c => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <span className="block text-sm font-medium text-slate-400 mb-2">Spend type</span>
                  <div className="flex flex-wrap gap-4">
                    <label className="flex items-center gap-2 text-sm text-slate-300 cursor-pointer">
                      <input
                        type="radio"
                        name={`usage-${focusedTxn.id}`}
                        checked={focusedTxn.usage === 'business'}
                        onChange={() => patchTransaction(focusedTxn.id, { usage: 'business' })}
                        className="rounded-full border-slate-600"
                      />
                      Business
                    </label>
                    <label className="flex items-center gap-2 text-sm text-slate-300 cursor-pointer">
                      <input
                        type="radio"
                        name={`usage-${focusedTxn.id}`}
                        checked={focusedTxn.usage === 'personal'}
                        onChange={() => patchTransaction(focusedTxn.id, { usage: 'personal' })}
                        className="rounded-full border-slate-600"
                      />
                      Personal
                    </label>
                  </div>
                </div>
              </div>
            )}

            {bankAccounts.length > 0 && (
              <div className="p-4 rounded-xl" style={AXIOM.containers.list}>
                <label className="block text-sm font-medium text-slate-400 mb-2">
                  Import into bank account
                </label>
                <select
                  value={selectedAccount}
                  onChange={e => setSelectedAccount(e.target.value)}
                  className="w-full max-w-md px-4 py-3 rounded-xl text-white focus:outline-none"
                  style={{
                    background: AXIOM.inputs.background,
                    border: AXIOM.inputs.border,
                  }}
                >
                  <option value="">Select account…</option>
                  {bankAccounts.map(a => (
                    <option key={a.id} value={a.id}>
                      {a.bankName} · {a.accountNumber} ({a.currency})
                    </option>
                  ))}
                </select>
                <p className="text-xs text-slate-500 mt-2">
                  Amounts import in <span className="text-slate-300">{resolvedImportCurrency}</span>
                  {importCurrencyOverride ? ' (override from mapping step)' : ''}
                </p>
              </div>
            )}

            {/* Transaction List */}
            <div className="p-6 rounded-2xl" style={AXIOM.containers.list}>
              <h3 className="text-xl font-bold text-white mb-4">
                Transactions to Import
                {reviewMode === 'list' ? ' (all rows)' : ' (summary)'}
              </h3>
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {(reviewMode === 'list' ? filteredTransactions : filteredTransactions.slice(0, 15)).map((txn, idx) => (
                  <motion.div
                    key={idx}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: idx * 0.05 }}
                    className="p-4 rounded-xl flex items-center justify-between"
                    style={AXIOM.containers.item}
                  >
                    <div className="flex-1">
                      <p className="text-white font-semibold">{txn.narration}</p>
                      <p className="text-sm text-slate-400">{formatDate(txn.date)}</p>
                    </div>
                    <div className="text-right">
                      <p
                        className={`text-lg font-bold ${
                          txn.type === 'credit' ? 'text-emerald-400' : 'text-red-400'
                        }`}
                      >
                        {formatCurrency(txn.amount, resolvedImportCurrency)}
                      </p>
                      {!!txn.confidence && (
                        <p className="text-xs text-slate-400">
                          {txn.confidence}% confidence
                        </p>
                      )}
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>

            {filteredTransactions.length === 0 && stats.total > 0 && stats.duplicates === stats.total && (
              <div className="flex items-center gap-3 px-4 py-3 rounded-xl" style={AXIOM.containers.list}>
                <AlertTriangle className="size-5 text-amber-400 shrink-0" />
                <p className="text-sm text-amber-400/90">
                  All {stats.total} {stats.total === 1 ? 'row' : 'rows'} in this file already{' '}
                  {stats.total === 1 ? 'exists' : 'exist'} in your transactions — nothing new to
                  import.
                </p>
              </div>
            )}

            <div className="flex justify-between">
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setCurrentStep('mapping')}
                className="px-6 py-3 rounded-xl text-sm font-medium"
                style={AXIOM.buttons.secondary}
              >
                Back
              </motion.button>
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={handleImport}
                disabled={
                  processing ||
                  filteredTransactions.length === 0 ||
                  (bankAccounts.length > 0 && !selectedAccount)
                }
                className="px-6 py-3 rounded-xl text-sm font-medium flex items-center gap-2"
                style={{
                  background: 'linear-gradient(135deg, rgba(6, 182, 212, 0.4), rgba(59, 130, 246, 0.4))',
                  border: '1px solid rgba(6, 182, 212, 0.5)',
                  boxShadow: '0 10px 30px -10px rgba(6, 182, 212, 0.6)',
                  color: '#ffffff',
                }}
              >
                {processing ? (
                  <>
                    <Loader2 className="size-4 animate-spin" />
                    Importing...
                  </>
                ) : (
                  <>
                    Import Transactions
                    <CheckCircle2 className="size-4" />
                  </>
                )}
              </motion.button>
            </div>
          </motion.div>
        )}

        {currentStep === 'complete' && (
          <motion.div
            key="complete"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="p-12 rounded-2xl text-center"
            style={AXIOM.containers.list}
          >
            <div 
              className="w-24 h-24 mx-auto mb-6 rounded-2xl flex items-center justify-center"
              style={{
                background: AXIOM.iconBoxes.green,
                boxShadow: AXIOM.shadows.iconGreen,
              }}
            >
              <CheckCircle2 className="size-12 text-white" />
            </div>
            <h2 className="text-3xl font-bold text-white mb-2">Import Complete!</h2>
            <p className="text-slate-400 mb-8">
              Successfully imported {lastImportedCount} transaction{lastImportedCount === 1 ? '' : 's'}
            </p>
            <motion.button
              type="button"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={handleNewImport}
              className="px-6 py-3 rounded-xl text-sm font-medium"
              style={{
                background: 'linear-gradient(135deg, rgba(6, 182, 212, 0.4), rgba(59, 130, 246, 0.4))',
                border: '1px solid rgba(6, 182, 212, 0.5)',
                boxShadow: '0 10px 30px -10px rgba(6, 182, 212, 0.6)',
                color: '#ffffff',
              }}
            >
              Import another file
            </motion.button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}