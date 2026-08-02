import { useState, useCallback } from 'react';
import { motion } from 'motion/react';
// ── Phase 9B: Import history fully served by importService.getHistory() ──────
import { useOrgServices } from '@/hooks/useOrgServices';
import { useServiceArray } from '@/hooks/useService';
import { formatCurrency } from '@/lib/formatters';
import { Upload, FileText, CheckCircle, AlertCircle, Clock, X, Download, Eye, Trash2, ArrowRight, Sparkles, Settings, Save, RefreshCw, FileSpreadsheet } from 'lucide-react';
import { toast } from 'sonner';
import { useTheme } from '../../../contexts/ThemeContext';
import { AXIOM } from '../../../styles/axiom-tokens';

interface ParsedTransaction {
  id: string;
  date: string;
  amount: number;
  narration: string;
  category?: string;
  confidence?: number;
  type?: 'income' | 'expense';
  scope?: 'business' | 'personal';
  isDuplicate?: boolean;
  suggestedCategory?: string;
  suggestedScope?: string;
}

export function StatementImportCenter() {
  const { theme } = useTheme();
  const svc = useOrgServices();
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [selectedAccount, setSelectedAccount] = useState('');
  const [processingStatus, setProcessingStatus] = useState<'idle' | 'uploading' | 'parsing' | 'classifying' | 'complete'>('idle');

  // Drag and drop handlers
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    const files = Array.from(e.dataTransfer.files);
    const file = files[0];
    
    if (file && (file.name.endsWith('.csv') || file.name.endsWith('.xlsx') || file.name.endsWith('.xls'))) {
      setSelectedFile(file);
      toast.success(`File "${file.name}" ready to upload`);
    } else {
      toast.error('Please upload a valid CSV or Excel file');
    }
  }, []);

  // File input handler
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      toast.success(`File "${file.name}" selected`);
    }
  };

  // ── Import history from service layer (Phase 9B: enriched — no inline map needed) ──
  const { data: historyRaw, loading: historyLoading } = useServiceArray(
    () => svc.imports.getHistory(),
    [svc.orgId]
  );

  const statementImports = historyRaw.map(imp => ({
    id: imp.id,
    fileName: imp.fileName,
    accountName: imp.accountName,
    uploadDate: imp.importedAt,
    status: imp.status,
    totalTransactions: imp.transactionCount,
    autoPlaced: imp.autoPlaced,
    needsReview: imp.needsReview,
    duplicatesFound: imp.duplicatesFound,
  }));

  const totalImports = statementImports.length;
  const completedImports = statementImports.filter(i => i.status === 'completed').length;
  const needsReview = statementImports.filter(i => i.status === 'needs_review').length;
  const totalAutoPlaced = statementImports.reduce((sum, i) => sum + i.autoPlaced, 0);

  return (
    <div className="min-h-screen p-8 space-y-6" style={{ background: AXIOM.backgrounds.main }}>
      {/* Header */}
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
              <h1 className="text-4xl font-bold" style={AXIOM.text.titleStyle}>Statement Import Center</h1>
              <p className="text-slate-400 text-sm">Upload and process bank statements automatically</p>
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
            onClick={() => document.getElementById('file-upload')?.click()}
          >
            <Upload className="size-4" />
            Upload Statement
          </motion.button>
          <input
            id="file-upload"
            type="file"
            accept=".csv,.xlsx,.xls"
            className="hidden"
            onChange={handleFileSelect}
          />
        </div>
      </motion.div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="p-6 rounded-2xl"
          style={AXIOM.containers.list}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-slate-400 text-sm mb-1">Total Imports</p>
              <p className="text-2xl font-bold text-white">{totalImports}</p>
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
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="p-6 rounded-2xl"
          style={AXIOM.containers.list}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-slate-400 text-sm mb-1">Completed</p>
              <p className="text-2xl font-bold text-emerald-400">{completedImports}</p>
            </div>
            <div 
              className="w-12 h-12 rounded-xl flex items-center justify-center"
              style={{
                background: AXIOM.iconBoxes.green,
                boxShadow: AXIOM.shadows.iconGreen,
              }}
            >
              <CheckCircle className="size-6 text-white" />
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="p-6 rounded-2xl"
          style={AXIOM.containers.list}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-slate-400 text-sm mb-1">Needs Review</p>
              <p className="text-2xl font-bold text-amber-400">{needsReview}</p>
            </div>
            <div 
              className="w-12 h-12 rounded-xl flex items-center justify-center"
              style={{
                background: AXIOM.iconBoxes.orange,
                boxShadow: AXIOM.shadows.iconOrange,
              }}
            >
              <AlertCircle className="size-6 text-white" />
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
          className="p-6 rounded-2xl"
          style={AXIOM.containers.list}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-slate-400 text-sm mb-1">Auto Placed</p>
              <p className="text-2xl font-bold text-cyan-400">{totalAutoPlaced}</p>
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
        </motion.div>
      </div>

      {/* Upload Area */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="p-12 rounded-2xl border-2 border-dashed cursor-pointer text-center group"
        style={{
          background: AXIOM.containers.list.background,
          borderColor: 'rgba(148, 163, 184, 0.2)',
        }}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        onClick={() => document.getElementById('file-upload')?.click()}
        whileHover={{ scale: 1.01 }}
      >
        <div 
          className="w-20 h-20 rounded-2xl flex items-center justify-center mx-auto mb-4 transition-all group-hover:scale-110"
          style={{
            background: AXIOM.iconBoxes.cyan,
            boxShadow: AXIOM.shadows.iconCyan,
          }}
        >
          <Upload className="size-10 text-white" />
        </div>
        <h3 className="text-2xl font-bold text-white mb-2">Upload Bank Statements</h3>
        <p className="text-slate-400 mb-6">Drag and drop CSV or Excel files, or click to browse</p>
        {selectedFile ? (
          <div 
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl mb-4"
            style={AXIOM.badges.success}
          >
            <FileText className="size-4" />
            <span>{selectedFile.name}</span>
            <button
              onClick={(e) => {
                e.stopPropagation();
                setSelectedFile(null);
              }}
              className="ml-2"
            >
              <X className="size-4" />
            </button>
          </div>
        ) : (
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="px-6 py-3 rounded-xl text-sm font-medium"
            style={{
              background: 'linear-gradient(135deg, rgba(6, 182, 212, 0.4), rgba(59, 130, 246, 0.4))',
              border: '1px solid rgba(6, 182, 212, 0.5)',
              boxShadow: '0 10px 30px -10px rgba(6, 182, 212, 0.6)',
              color: '#ffffff',
            }}
            onClick={(e) => {
              e.stopPropagation();
              document.getElementById('file-upload')?.click();
            }}
          >
            Choose Files
          </motion.button>
        )}
        <p className="text-xs text-slate-500 mt-4">Supports CSV, Excel (.xlsx, .xls)</p>
      </motion.div>

      {/* Import History */}
      <div>
        <motion.h2
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.35 }}
          className="text-2xl font-bold text-white mb-4"
        >
          Import History
        </motion.h2>
        <div className="space-y-3">
          {statementImports.map((imp, idx) => {
            const statusConfig = 
              imp.status === 'completed' ? { icon: CheckCircle, box: AXIOM.iconBoxes.green, badge: AXIOM.badges.success } :
              imp.status === 'needs_review' ? { icon: AlertCircle, box: AXIOM.iconBoxes.orange, badge: AXIOM.badges.warning } :
              imp.status === 'processing' ? { icon: Clock, box: AXIOM.iconBoxes.blue, badge: AXIOM.badges.info } :
              { icon: X, box: AXIOM.iconBoxes.red, badge: AXIOM.badges.danger };
            
            const Icon = statusConfig.icon;

            return (
              <motion.div
                key={imp.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 + idx * 0.05 }}
                className="p-6 rounded-2xl group"
                style={AXIOM.containers.list}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4 flex-1">
                    <div 
                      className="w-14 h-14 rounded-xl flex items-center justify-center"
                      style={{
                        background: statusConfig.box,
                        boxShadow: imp.status === 'completed' ? AXIOM.shadows.iconGreen :
                                   imp.status === 'needs_review' ? AXIOM.shadows.iconOrange :
                                   imp.status === 'processing' ? AXIOM.shadows.iconBlue :
                                   AXIOM.shadows.iconRed,
                      }}
                    >
                      <Icon className="size-7 text-white" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <p className="text-white font-bold text-lg">{imp.fileName}</p>
                        <span 
                          className="px-2 py-0.5 rounded-lg text-xs font-medium capitalize"
                          style={statusConfig.badge}
                        >
                          {imp.status.replace('_', ' ')}
                        </span>
                      </div>
                      <p className="text-sm" style={{ color: AXIOM.text.slate400 }}>
                        {imp.accountName} • {new Date(imp.uploadDate).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-8">
                    <div className="text-center">
                      <p className="text-3xl font-bold text-emerald-400">{imp.autoPlaced}</p>
                      <p className="text-xs" style={{ color: AXIOM.text.slate400 }}>Auto Placed</p>
                    </div>
                    <div className="text-center">
                      <p className="text-3xl font-bold text-amber-400">{imp.needsReview}</p>
                      <p className="text-xs" style={{ color: AXIOM.text.slate400 }}>Needs Review</p>
                    </div>
                    <div className="text-center">
                      <p className="text-3xl font-bold" style={{ color: AXIOM.text.slate400 }}>{imp.duplicatesFound}</p>
                      <p className="text-xs" style={{ color: AXIOM.text.slate400 }}>Duplicates</p>
                    </div>
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      className="px-4 py-2 rounded-xl text-sm font-medium flex items-center gap-2"
                      style={{
                        background: 'rgba(168, 85, 247, 0.3)',
                        border: '1px solid rgba(168, 85, 247, 0.5)',
                        color: '#ffffff',
                      }}
                      onClick={() => toast.info('View Details feature coming soon')}
                    >
                      <Eye className="size-4" />
                      View Details
                    </motion.button>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>

      {/* Info Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="p-6 rounded-2xl"
          style={AXIOM.containers.list}
        >
          <div className="flex items-center gap-3 mb-4">
            <div 
              className="w-10 h-10 rounded-xl flex items-center justify-center"
              style={{
                background: AXIOM.iconBoxes.cyan,
                boxShadow: AXIOM.shadows.iconCyan,
              }}
            >
              <Sparkles className="size-5 text-white" />
            </div>
            <h3 className="text-white font-bold">AI Auto-Classification</h3>
          </div>
          <p className="text-sm" style={{ color: AXIOM.text.slate400 }}>
            Transactions are automatically categorized using learned patterns and rules
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.65 }}
          className="p-6 rounded-2xl"
          style={AXIOM.containers.list}
        >
          <div className="flex items-center gap-3 mb-4">
            <div 
              className="w-10 h-10 rounded-xl flex items-center justify-center"
              style={{
                background: AXIOM.iconBoxes.purple,
                boxShadow: AXIOM.shadows.iconPurple,
              }}
            >
              <RefreshCw className="size-5 text-white" />
            </div>
            <h3 className="text-white font-bold">Duplicate Detection</h3>
          </div>
          <p className="text-sm" style={{ color: AXIOM.text.slate400 }}>
            Automatically identifies and flags duplicate transactions to prevent double entries
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7 }}
          className="p-6 rounded-2xl"
          style={AXIOM.containers.list}
        >
          <div className="flex items-center gap-3 mb-4">
            <div 
              className="w-10 h-10 rounded-xl flex items-center justify-center"
              style={{
                background: AXIOM.iconBoxes.blue,
                boxShadow: AXIOM.shadows.iconBlue,
              }}
            >
              <Settings className="size-5 text-white" />
            </div>
            <h3 className="text-white font-bold">Smart Column Mapping</h3>
          </div>
          <p className="text-sm" style={{ color: AXIOM.text.slate400 }}>
            Detects and maps columns automatically, or customize mapping for different bank formats
          </p>
        </motion.div>
      </div>
    </div>
  );
}