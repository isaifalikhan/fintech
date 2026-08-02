import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Switch } from '../ui/switch';
import { Label } from '../ui/label';
import { 
  Download, 
  Package, 
  FileText, 
  Database, 
  Users, 
  Settings, 
  Shield,
  AlertTriangle,
  CheckCircle2,
  Clock,
  HardDrive
} from 'lucide-react';
import { toast } from 'sonner';

interface ExportOption {
  id: string;
  name: string;
  description: string;
  icon: any;
  enabled: boolean;
  estimatedSize: string;
  itemCount: string;
}

export function DataExportCenter() {
  const [exportOptions, setExportOptions] = useState<ExportOption[]>([
    {
      id: 'transactions',
      name: 'Transactions',
      description: 'All income and expense entries',
      icon: FileText,
      enabled: true,
      estimatedSize: '2.5 MB',
      itemCount: '1,247 transactions',
    },
    {
      id: 'accounts',
      name: 'Accounts & Wallets',
      description: 'Bank accounts, cash, and balances',
      icon: Database,
      enabled: true,
      estimatedSize: '150 KB',
      itemCount: '12 accounts',
    },
    {
      id: 'rules',
      name: 'Logic Rules',
      description: 'Auto-classification and learning rules',
      icon: Shield,
      enabled: true,
      estimatedSize: '300 KB',
      itemCount: '89 rules',
    },
    {
      id: 'team',
      name: 'Team Members',
      description: 'Users, roles, and permissions',
      icon: Users,
      enabled: true,
      estimatedSize: '50 KB',
      itemCount: '8 members',
    },
    {
      id: 'audit',
      name: 'Audit Logs',
      description: 'Complete activity history',
      icon: Clock,
      enabled: false,
      estimatedSize: '800 KB',
      itemCount: '450 entries',
    },
    {
      id: 'settings',
      name: 'Settings & Configuration',
      description: 'Organization preferences and setup',
      icon: Settings,
      enabled: true,
      estimatedSize: '100 KB',
      itemCount: '1 configuration',
    },
  ]);

  const [exportFormat, setExportFormat] = useState<'csv' | 'json' | 'excel'>('csv');
  const [includeAttachments, setIncludeAttachments] = useState(false);
  const [dateFrom, setDateFrom] = useState('2024-01-01');
  const [dateTo, setDateTo] = useState('2025-12-31');
  const [showExitDialog, setShowExitDialog] = useState(false);

  const toggleOption = (id: string) => {
    setExportOptions(exportOptions.map(opt => 
      opt.id === id ? { ...opt, enabled: !opt.enabled } : opt
    ));
  };

  const calculateTotalSize = () => {
    const enabledOptions = exportOptions.filter(opt => opt.enabled);
    // Simple mock calculation
    const totalKB = enabledOptions.reduce((sum, opt) => {
      const size = opt.estimatedSize.includes('MB') 
        ? parseFloat(opt.estimatedSize) * 1024 
        : parseFloat(opt.estimatedSize);
      return sum + size;
    }, 0);
    
    if (totalKB > 1024) {
      return `${(totalKB / 1024).toFixed(1)} MB`;
    }
    return `${totalKB.toFixed(0)} KB`;
  };

  const handleExport = () => {
    const enabledOptions = exportOptions.filter(opt => opt.enabled);
    if (enabledOptions.length === 0) {
      toast.error('Please select at least one data type to export');
      return;
    }

    toast.success('Generating export package...');
    
    // Simulate export generation
    setTimeout(() => {
      toast.success(`Export complete! Downloaded: finance-os-export-${Date.now()}.zip`);
    }, 2000);
  };

  const handleExitPlatform = () => {
    toast.error('Exit platform feature requires confirmation from platform admin');
    setShowExitDialog(false);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-white mb-2">Data Export Center</h2>
        <p className="text-slate-400">Export all your data or leave the platform</p>
      </div>

      {/* Export Package Builder */}
      <Card className="bg-slate-900 border-slate-800">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Package className="size-5 text-blue-400" />
            <div>
              <CardTitle className="text-white">Build Export Package</CardTitle>
              <CardDescription>Select what data to include in your export</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Data Type Selection */}
          <div className="space-y-3">
            {exportOptions.map((option) => {
              const Icon = option.icon;
              return (
                <div
                  key={option.id}
                  className={`p-4 rounded-lg border transition-all ${
                    option.enabled
                      ? 'bg-slate-950 border-blue-900/50'
                      : 'bg-slate-950/50 border-slate-800'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-3 flex-1">
                      <div className={`p-2 rounded-lg ${
                        option.enabled ? 'bg-blue-500/20' : 'bg-slate-900'
                      }`}>
                        <Icon className={`size-5 ${
                          option.enabled ? 'text-blue-400' : 'text-slate-400'
                        }`} />
                      </div>
                      <div className="flex-1">
                        <h4 className="text-white font-medium mb-1">{option.name}</h4>
                        <p className="text-sm text-slate-400 mb-2">{option.description}</p>
                        <div className="flex items-center gap-4 text-xs text-slate-500">
                          <span>{option.itemCount}</span>
                          <span>•</span>
                          <span>{option.estimatedSize}</span>
                        </div>
                      </div>
                    </div>
                    <Switch
                      checked={option.enabled}
                      onCheckedChange={() => toggleOption(option.id)}
                    />
                  </div>
                </div>
              );
            })}
          </div>

          {/* Export Options */}
          <div className="pt-4 border-t border-slate-800 space-y-4">
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <Label className="text-white mb-2 block">Export Format</Label>
                <div className="grid grid-cols-3 gap-2">
                  {(['csv', 'json', 'excel'] as const).map((format) => (
                    <button
                      key={format}
                      onClick={() => setExportFormat(format)}
                      className={`p-3 rounded-lg border transition-all ${
                        exportFormat === format
                          ? 'bg-blue-500/20 border-blue-500/50 text-blue-400'
                          : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                      }`}
                    >
                      <div className="font-medium uppercase text-xs">{format}</div>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <Label className="text-white mb-2 block">Date Range (for transactions)</Label>
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="date"
                    value={dateFrom}
                    onChange={(e) => setDateFrom(e.target.value)}
                    className="h-10 px-3 rounded-md bg-slate-950 border border-slate-700 text-white text-sm"
                  />
                  <input
                    type="date"
                    value={dateTo}
                    onChange={(e) => setDateTo(e.target.value)}
                    className="h-10 px-3 rounded-md bg-slate-950 border border-slate-700 text-white text-sm"
                  />
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between p-3 bg-slate-950 rounded-lg">
              <div>
                <Label className="text-white mb-1">Include Attachments</Label>
                <p className="text-xs text-slate-400">Include uploaded statement files and receipts</p>
              </div>
              <Switch
                checked={includeAttachments}
                onCheckedChange={setIncludeAttachments}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Preview & Summary */}
      <Card className="bg-gradient-to-br from-blue-950/20 to-cyan-950/20 border-blue-900/50">
        <CardContent className="pt-6">
          <div className="flex items-start gap-4">
            <div className="p-3 bg-blue-500/20 rounded-lg">
              <HardDrive className="size-6 text-blue-400" />
            </div>
            <div className="flex-1">
              <h4 className="text-white font-medium mb-1">Export Preview</h4>
              <p className="text-sm text-slate-400 mb-3">Your package will include:</p>
              <div className="grid md:grid-cols-3 gap-4 text-sm">
                <div>
                  <span className="text-slate-500">Data Types:</span>
                  <span className="text-white ml-2">
                    {exportOptions.filter(opt => opt.enabled).length} selected
                  </span>
                </div>
                <div>
                  <span className="text-slate-500">Estimated Size:</span>
                  <span className="text-white ml-2">{calculateTotalSize()}</span>
                </div>
                <div>
                  <span className="text-slate-500">Format:</span>
                  <span className="text-white ml-2 uppercase">{exportFormat}</span>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Export Action */}
      <div className="flex items-center justify-between p-6 bg-slate-900 rounded-lg border border-slate-800">
        <div>
          <h4 className="text-white font-medium mb-1">Ready to Export</h4>
          <p className="text-sm text-slate-400">
            Your data will be packaged as a ZIP file with organized folders
          </p>
        </div>
        <Button
          onClick={handleExport}
          className="bg-gradient-to-r from-blue-600 to-cyan-600"
        >
          <Download className="size-4 mr-2" />
          Generate & Download
        </Button>
      </div>

      {/* Danger Zone - Exit Platform */}
      <Card className="bg-red-950/10 border-red-900/50">
        <CardHeader>
          <div className="flex items-center gap-2">
            <AlertTriangle className="size-5 text-red-400" />
            <div>
              <CardTitle className="text-white">Danger Zone</CardTitle>
              <CardDescription>Permanently leave Finance OS</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="p-4 bg-slate-950 rounded-lg border border-red-900/30">
            <h4 className="text-white font-medium mb-2">Exit Platform</h4>
            <p className="text-sm text-slate-400 mb-4">
              If you want to leave Finance OS, you can export all your data and request account closure.
              This action requires approval from the platform administrator.
            </p>
            <div className="space-y-2 text-sm text-slate-400 mb-4">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="size-4 text-green-400" />
                <span>Your data will be exported in full</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="size-4 text-green-400" />
                <span>You can re-import to another system</span>
              </div>
              <div className="flex items-center gap-2">
                <AlertTriangle className="size-4 text-amber-400" />
                <span>Your account will be deactivated</span>
              </div>
              <div className="flex items-center gap-2">
                <AlertTriangle className="size-4 text-amber-400" />
                <span>This cannot be undone without admin approval</span>
              </div>
            </div>
            
            {!showExitDialog ? (
              <Button
                variant="outline"
                onClick={() => setShowExitDialog(true)}
                className="border-red-900/50 text-red-400 hover:bg-red-950/20"
              >
                I Want to Leave
              </Button>
            ) : (
              <div className="p-4 bg-red-950/20 rounded-lg border border-red-900/50">
                <p className="text-sm text-red-300 mb-3">
                  Are you sure? This will export all your data and request account closure.
                </p>
                <div className="flex gap-2">
                  <Button
                    onClick={handleExitPlatform}
                    className="bg-red-600 hover:bg-red-700"
                  >
                    Yes, Export & Request Exit
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => setShowExitDialog(false)}
                    className="border-slate-700 hover:bg-slate-800"
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Info */}
      <div className="p-4 bg-slate-950 rounded-lg border border-slate-800">
        <h4 className="text-sm font-medium text-white mb-2">Export Package Contents</h4>
        <div className="text-xs text-slate-400 space-y-1">
          <p>• <strong>README.txt</strong> - Instructions for using your exported data</p>
          <p>• <strong>/transactions</strong> - All transactions in {exportFormat.toUpperCase()} format</p>
          <p>• <strong>/accounts</strong> - Account and wallet data</p>
          <p>• <strong>/rules</strong> - Logic and classification rules (JSON)</p>
          <p>• <strong>/team</strong> - Team members and permissions</p>
          <p>• <strong>/settings</strong> - Organization configuration</p>
          {includeAttachments && <p>• <strong>/attachments</strong> - Statement files and receipts</p>}
        </div>
      </div>
    </div>
  );
}
