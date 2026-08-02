import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '../ui/dialog';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Clock, User, ArrowRight, RotateCcw, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';

interface TransactionVersion {
  version: number;
  timestamp: string;
  editedBy: {
    name: string;
    role: string;
  };
  changes: {
    field: string;
    oldValue: string;
    newValue: string;
  }[];
  isCurrent: boolean;
}

interface TransactionHistoryModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  transaction: any;
}

const mockVersions: TransactionVersion[] = [
  {
    version: 3,
    timestamp: '2025-01-15 10:30:00',
    editedBy: { name: 'John Doe', role: 'Org Admin' },
    changes: [
      { field: 'Amount', oldValue: '₹5,000', newValue: '₹5,500' },
      { field: 'Category', oldValue: 'Miscellaneous', newValue: 'Software & Tools' },
    ],
    isCurrent: true,
  },
  {
    version: 2,
    timestamp: '2025-01-10 14:20:00',
    editedBy: { name: 'Sarah Wilson', role: 'Team Member' },
    changes: [
      { field: 'Narration', oldValue: 'AWS payment', newValue: 'AWS Hosting Payment' },
      { field: 'Personal/Business', oldValue: 'Personal', newValue: 'Business' },
    ],
    isCurrent: false,
  },
  {
    version: 1,
    timestamp: '2025-01-05 09:15:00',
    editedBy: { name: 'System', role: 'Auto-Import' },
    changes: [],
    isCurrent: false,
  },
];

export function TransactionHistoryModal({
  open,
  onOpenChange,
  transaction,
}: TransactionHistoryModalProps) {
  const handleRestore = (version: number) => {
    toast.success(`Transaction restored to version ${version}`);
    onOpenChange(false);
  };

  if (!transaction) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-slate-900 border-slate-800 max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-white text-xl">Transaction History</DialogTitle>
          <DialogDescription className="text-slate-400">
            {transaction.narration} • {transaction.id}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 mt-4">
          {/* Current vs Original Comparison */}
          <div className="grid grid-cols-2 gap-4 p-4 bg-slate-950 rounded-lg border border-slate-800">
            <div>
              <h4 className="text-xs font-medium text-slate-400 uppercase mb-2">Original</h4>
              <div className="space-y-1 text-sm">
                <div className="text-slate-500">Version 1</div>
                <div className="text-slate-300">Created on Jan 5, 2025</div>
              </div>
            </div>
            <div>
              <h4 className="text-xs font-medium text-slate-400 uppercase mb-2">Current</h4>
              <div className="space-y-1 text-sm">
                <div className="text-white font-medium">Version 3</div>
                <div className="text-slate-300">Last edited Jan 15, 2025</div>
              </div>
            </div>
          </div>

          {/* Version Timeline */}
          <div>
            <h3 className="text-sm font-medium text-white mb-3">Version History</h3>
            <div className="space-y-3">
              {mockVersions.map((version, index) => (
                <div
                  key={version.version}
                  className={`p-4 rounded-lg border ${
                    version.isCurrent
                      ? 'bg-blue-950/20 border-blue-900/50'
                      : 'bg-slate-950 border-slate-800'
                  }`}
                >
                  {/* Version Header */}
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-lg ${
                        version.isCurrent ? 'bg-blue-500/20' : 'bg-slate-900'
                      }`}>
                        {version.isCurrent ? (
                          <CheckCircle2 className="size-4 text-blue-400" />
                        ) : version.version === 1 ? (
                          <Clock className="size-4 text-slate-400" />
                        ) : (
                          <RotateCcw className="size-4 text-slate-400" />
                        )}
                      </div>
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <h4 className="text-white font-medium">Version {version.version}</h4>
                          {version.isCurrent && (
                            <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/30 text-xs">
                              Current
                            </Badge>
                          )}
                          {version.version === 1 && (
                            <Badge className="bg-slate-500/20 text-slate-400 border-slate-500/30 text-xs">
                              Original
                            </Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-2 text-xs text-slate-400">
                          <Clock className="size-3" />
                          {version.timestamp}
                        </div>
                      </div>
                    </div>

                    {!version.isCurrent && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleRestore(version.version)}
                        className="border-slate-700 hover:bg-slate-800 text-xs"
                      >
                        <RotateCcw className="size-3 mr-1" />
                        Restore
                      </Button>
                    )}
                  </div>

                  {/* Edited By */}
                  <div className="flex items-center gap-2 text-sm text-slate-400 mb-3">
                    <User className="size-4" />
                    <span>
                      {version.editedBy.name} <span className="text-slate-600">•</span>{' '}
                      <span className="text-slate-500">{version.editedBy.role}</span>
                    </span>
                  </div>

                  {/* Changes */}
                  {version.changes.length > 0 ? (
                    <div className="space-y-2">
                      <h5 className="text-xs font-medium text-slate-400 uppercase">Changes</h5>
                      {version.changes.map((change, idx) => (
                        <div
                          key={idx}
                          className={`p-3 rounded ${
                            version.isCurrent ? 'bg-slate-900' : 'bg-slate-900/50'
                          }`}
                        >
                          <div className="text-xs text-slate-500 mb-1 font-medium">
                            {change.field}
                          </div>
                          <div className="flex items-center gap-2 text-sm">
                            <span className="text-red-400 line-through">{change.oldValue}</span>
                            <ArrowRight className="size-4 text-slate-600" />
                            <span className="text-green-400">{change.newValue}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-xs text-slate-500 italic">Initial creation - no changes</div>
                  )}

                  {/* Timeline Connector */}
                  {index < mockVersions.length - 1 && (
                    <div className="flex justify-center mt-3">
                      <div className="w-px h-4 bg-slate-800" />
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Summary */}
          <div className="p-4 bg-slate-950 rounded-lg border border-slate-800">
            <h4 className="text-sm font-medium text-white mb-2">Summary</h4>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-slate-500">Total Versions:</span>
                <span className="text-white ml-2">{mockVersions.length}</span>
              </div>
              <div>
                <span className="text-slate-500">Last Modified:</span>
                <span className="text-white ml-2">{mockVersions[0].timestamp}</span>
              </div>
              <div className="col-span-2">
                <span className="text-slate-500">Total Changes:</span>
                <span className="text-white ml-2">
                  {mockVersions.reduce((sum, v) => sum + v.changes.length, 0)} fields modified
                </span>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}