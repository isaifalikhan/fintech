import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Progress } from '../ui/progress';
import { 
  AlertTriangle, 
  CheckCircle2, 
  XCircle, 
  RefreshCw, 
  Play,
  Trash2,
  FileText,
  Clock,
  AlertCircle,
  Download,
  Eye
} from 'lucide-react';
import { toast } from 'sonner';

interface FailedTransaction {
  row: number;
  data: {
    date?: string;
    narration?: string;
    amount?: string;
  };
  error: string;
  errorType: 'date_format' | 'missing_field' | 'invalid_amount' | 'duplicate';
  canFix: boolean;
}

interface PartialImport {
  id: string;
  fileName: string;
  accountName: string;
  startedAt: string;
  status: 'failed' | 'paused';
  totalRows: number;
  successfulRows: number;
  failedRows: number;
  failedTransactions: FailedTransaction[];
  errorSummary: {
    date_format: number;
    missing_field: number;
    invalid_amount: number;
    duplicate: number;
  };
}

const mockPartialImports: PartialImport[] = [
  {
    id: '1',
    fileName: 'HBL_Statement_Jan2025.csv',
    accountName: 'HBL Business Account',
    startedAt: '2025-01-15 10:30:00',
    status: 'failed',
    totalRows: 245,
    successfulRows: 198,
    failedRows: 47,
    errorSummary: {
      date_format: 12,
      missing_field: 8,
      invalid_amount: 15,
      duplicate: 12,
    },
    failedTransactions: [
      {
        row: 12,
        data: { date: '15-Jan-2025', narration: 'AWS Payment', amount: '5,000' },
        error: 'Invalid date format. Expected DD/MM/YYYY',
        errorType: 'date_format',
        canFix: true,
      },
      {
        row: 34,
        data: { date: '18/01/2025', narration: '', amount: '2500' },
        error: 'Missing required field: Narration',
        errorType: 'missing_field',
        canFix: false,
      },
      {
        row: 67,
        data: { date: '20/01/2025', narration: 'Office Rent', amount: 'N/A' },
        error: 'Invalid amount value',
        errorType: 'invalid_amount',
        canFix: true,
      },
    ],
  },
  {
    id: '2',
    fileName: 'Meezan_Dec2024.csv',
    accountName: 'Meezan Bank Savings',
    startedAt: '2025-01-10 14:15:00',
    status: 'paused',
    totalRows: 156,
    successfulRows: 142,
    failedRows: 14,
    errorSummary: {
      date_format: 0,
      missing_field: 6,
      invalid_amount: 3,
      duplicate: 5,
    },
    failedTransactions: [
      {
        row: 23,
        data: { date: '05/12/2024', narration: 'Salary', amount: '' },
        error: 'Missing amount',
        errorType: 'missing_field',
        canFix: false,
      },
    ],
  },
];

export function PartialImportResume() {
  const [imports, setImports] = useState<PartialImport[]>(mockPartialImports);
  const [selectedImport, setSelectedImport] = useState<PartialImport | null>(null);
  const [showDetails, setShowDetails] = useState(false);

  const handleResumeImport = (importItem: PartialImport) => {
    toast.success(`Resuming import: ${importItem.fileName}`);
    
    // Simulate resuming import
    setTimeout(() => {
      setImports(imports.filter(i => i.id !== importItem.id));
      toast.success(`✅ Import completed! ${importItem.successfulRows} transactions added.`);
    }, 2000);
  };

  const handleFixAndResume = (importItem: PartialImport) => {
    const fixableErrors = importItem.failedTransactions.filter(t => t.canFix).length;
    toast.success(`Attempting to fix ${fixableErrors} transactions...`);
    
    setTimeout(() => {
      toast.success(`✅ Fixed ${fixableErrors} transactions! Resuming import...`);
    }, 1500);
  };

  const handleDeleteImport = (id: string) => {
    setImports(imports.filter(i => i.id !== id));
    toast.success('Failed import deleted');
  };

  const handleViewDetails = (importItem: PartialImport) => {
    setSelectedImport(importItem);
    setShowDetails(true);
  };

  const handleDownloadErrorReport = (importItem: PartialImport) => {
    toast.success(`Downloading error report for ${importItem.fileName}`);
  };

  const getErrorTypeLabel = (type: string) => {
    switch (type) {
      case 'date_format':
        return 'Date Format';
      case 'missing_field':
        return 'Missing Field';
      case 'invalid_amount':
        return 'Invalid Amount';
      case 'duplicate':
        return 'Duplicate';
      default:
        return type;
    }
  };

  const getErrorTypeColor = (type: string) => {
    switch (type) {
      case 'date_format':
        return 'bg-amber-500/20 text-amber-400 border-amber-500/30';
      case 'missing_field':
        return 'bg-red-500/20 text-red-400 border-red-500/30';
      case 'invalid_amount':
        return 'bg-orange-500/20 text-orange-400 border-orange-500/30';
      case 'duplicate':
        return 'bg-purple-500/20 text-purple-400 border-purple-500/30';
      default:
        return 'bg-slate-500/20 text-slate-400 border-slate-500/30';
    }
  };

  if (imports.length === 0) {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold text-white mb-2">Partial Import Resume</h2>
          <p className="text-slate-400">Resume failed or paused imports</p>
        </div>

        <Card className="bg-slate-900 border-slate-800">
          <CardContent className="py-16 text-center">
            <div className="inline-flex items-center justify-center size-16 bg-green-500/20 rounded-full mb-4">
              <CheckCircle2 className="size-8 text-green-400" />
            </div>
            <h3 className="text-xl font-medium text-white mb-2">All Imports Successful</h3>
            <p className="text-slate-400 mb-6 max-w-md mx-auto">
              You don't have any failed or paused imports. All your statement imports completed successfully!
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-white mb-2">Partial Import Resume</h2>
        <p className="text-slate-400">Resume failed or paused imports</p>
      </div>

      {/* Alert Banner */}
      <Card className="bg-amber-950/20 border-amber-900/50">
        <CardContent className="pt-6">
          <div className="flex items-start gap-3">
            <AlertTriangle className="size-5 text-amber-400 flex-shrink-0 mt-0.5" />
            <div>
              <h4 className="text-sm font-medium text-amber-200 mb-1">
                {imports.length} Incomplete Import{imports.length > 1 ? 's' : ''}
              </h4>
              <p className="text-xs text-amber-300/80">
                These imports have transactions that couldn't be processed. Review and fix the errors to complete the import.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Failed Imports List */}
      <div className="space-y-4">
        {imports.map((importItem) => {
          const successRate = (importItem.successfulRows / importItem.totalRows) * 100;
          const hasFixableErrors = importItem.failedTransactions.some(t => t.canFix);

          return (
            <Card key={importItem.id} className="bg-slate-900 border-slate-800 hover:border-slate-700 transition-colors">
              <CardContent className="pt-6">
                <div className="space-y-4">
                  {/* Header */}
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-4">
                      <div className="p-3 bg-amber-500/20 rounded-lg">
                        <AlertCircle className="size-6 text-amber-400" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <h4 className="text-white font-medium">{importItem.fileName}</h4>
                          <Badge className={
                            importItem.status === 'failed'
                              ? 'bg-red-500/20 text-red-400 border-red-500/30'
                              : 'bg-amber-500/20 text-amber-400 border-amber-500/30'
                          }>
                            {importItem.status}
                          </Badge>
                        </div>
                        <p className="text-sm text-slate-400 mb-2">{importItem.accountName}</p>
                        <div className="flex items-center gap-2 text-xs text-slate-500">
                          <Clock className="size-3" />
                          <span>Started: {importItem.startedAt}</span>
                        </div>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleViewDetails(importItem)}
                        className="border-slate-700 hover:bg-slate-800"
                      >
                        <Eye className="size-3 mr-1" />
                        View Details
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeleteImport(importItem.id)}
                        className="text-red-400 hover:text-red-300"
                      >
                        <Trash2 className="size-3" />
                      </Button>
                    </div>
                  </div>

                  {/* Progress */}
                  <div>
                    <div className="flex items-center justify-between text-sm mb-2">
                      <span className="text-slate-400">Import Progress</span>
                      <span className="text-white font-medium">{successRate.toFixed(1)}% Complete</span>
                    </div>
                    <Progress value={successRate} className="h-2" />
                    <div className="flex items-center justify-between text-xs mt-2">
                      <span className="text-green-400">
                        <CheckCircle2 className="size-3 inline mr-1" />
                        {importItem.successfulRows} successful
                      </span>
                      <span className="text-red-400">
                        <XCircle className="size-3 inline mr-1" />
                        {importItem.failedRows} failed
                      </span>
                      <span className="text-slate-500">
                        Total: {importItem.totalRows} rows
                      </span>
                    </div>
                  </div>

                  {/* Error Summary */}
                  <div className="p-4 bg-slate-950 rounded-lg">
                    <h5 className="text-sm font-medium text-white mb-3">Error Breakdown</h5>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                      {Object.entries(importItem.errorSummary).map(([type, count]) => (
                        count > 0 && (
                          <div key={type} className="text-center p-2 bg-slate-900 rounded">
                            <div className="text-xl font-bold text-white mb-1">{count}</div>
                            <div className="text-xs text-slate-400">{getErrorTypeLabel(type)}</div>
                          </div>
                        )
                      ))}
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex gap-2 pt-2">
                    {hasFixableErrors && (
                      <Button
                        onClick={() => handleFixAndResume(importItem)}
                        className="flex-1 bg-gradient-to-r from-green-600 to-emerald-600"
                      >
                        <RefreshCw className="size-4 mr-2" />
                        Auto-Fix & Resume
                      </Button>
                    )}
                    <Button
                      onClick={() => handleResumeImport(importItem)}
                      variant="outline"
                      className="flex-1 border-slate-700 hover:bg-slate-800"
                    >
                      <Play className="size-4 mr-2" />
                      Resume (Skip Failed)
                    </Button>
                    <Button
                      onClick={() => handleDownloadErrorReport(importItem)}
                      variant="outline"
                      size="sm"
                      className="border-slate-700 hover:bg-slate-800"
                    >
                      <Download className="size-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Details Modal */}
      {showDetails && selectedImport && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50">
          <Card className="bg-slate-900 border-slate-800 max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
            <CardHeader className="border-b border-slate-800">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-white">{selectedImport.fileName}</CardTitle>
                  <CardDescription className="text-slate-400">
                    Failed Transactions Details
                  </CardDescription>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowDetails(false)}
                >
                  ✕
                </Button>
              </div>
            </CardHeader>

            <div className="flex-1 overflow-y-auto p-6">
              <div className="space-y-3">
                {selectedImport.failedTransactions.map((transaction, idx) => (
                  <div
                    key={idx}
                    className="p-4 bg-slate-950 rounded-lg border border-slate-800"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <Badge className="bg-slate-800 text-slate-400 border-slate-700 mb-2">
                          Row {transaction.row}
                        </Badge>
                        <Badge className={getErrorTypeColor(transaction.errorType)}>
                          {getErrorTypeLabel(transaction.errorType)}
                        </Badge>
                      </div>
                      {transaction.canFix && (
                        <Badge className="bg-green-500/20 text-green-400 border-green-500/30">
                          Auto-fixable
                        </Badge>
                      )}
                    </div>

                    <div className="space-y-2 text-sm mb-3">
                      {transaction.data.date && (
                        <div className="flex items-center gap-2">
                          <span className="text-slate-500 w-20">Date:</span>
                          <span className="text-white">{transaction.data.date}</span>
                        </div>
                      )}
                      {transaction.data.narration && (
                        <div className="flex items-center gap-2">
                          <span className="text-slate-500 w-20">Narration:</span>
                          <span className="text-white">{transaction.data.narration}</span>
                        </div>
                      )}
                      {transaction.data.amount && (
                        <div className="flex items-center gap-2">
                          <span className="text-slate-500 w-20">Amount:</span>
                          <span className="text-white">{transaction.data.amount}</span>
                        </div>
                      )}
                    </div>

                    <div className="p-3 bg-red-950/20 rounded border border-red-900/30">
                      <div className="flex items-start gap-2">
                        <XCircle className="size-4 text-red-400 flex-shrink-0 mt-0.5" />
                        <div>
                          <p className="text-xs font-medium text-red-300 mb-1">Error</p>
                          <p className="text-xs text-red-400">{transaction.error}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="border-t border-slate-800 p-4">
              <div className="flex gap-2">
                <Button
                  onClick={() => {
                    handleFixAndResume(selectedImport);
                    setShowDetails(false);
                  }}
                  className="flex-1 bg-gradient-to-r from-green-600 to-emerald-600"
                >
                  <RefreshCw className="size-4 mr-2" />
                  Fix All & Resume
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setShowDetails(false)}
                  className="border-slate-700 hover:bg-slate-800"
                >
                  Close
                </Button>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* Help Section */}
      <Card className="bg-slate-900 border-slate-800">
        <CardHeader>
          <CardTitle className="text-white">How to Resolve Import Errors</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="p-3 bg-slate-950 rounded-lg">
            <h5 className="text-sm font-medium text-white mb-1">🔧 Auto-Fix</h5>
            <p className="text-xs text-slate-400">
              Click "Auto-Fix & Resume" to automatically fix common errors like date formats and amount parsing
            </p>
          </div>
          <div className="p-3 bg-slate-950 rounded-lg">
            <h5 className="text-sm font-medium text-white mb-1">⏭️ Skip Failed</h5>
            <p className="text-xs text-slate-400">
              Click "Resume (Skip Failed)" to import only successful transactions and skip errors
            </p>
          </div>
          <div className="p-3 bg-slate-950 rounded-lg">
            <h5 className="text-sm font-medium text-white mb-1">📄 Download Report</h5>
            <p className="text-xs text-slate-400">
              Download error report to manually fix issues in your CSV file and re-import
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
