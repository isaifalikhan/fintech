import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Badge } from '../ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '../ui/dialog';
import { 
  Save, 
  Trash2, 
  Edit, 
  Copy, 
  Plus, 
  FileText, 
  Check, 
  Building2,
  MapPin,
  Calendar,
  Download,
  AlertCircle
} from 'lucide-react';
import { toast } from 'sonner';
import { ViewHeader } from './ViewHeader';

interface ColumnMapping {
  csvColumn: string;
  systemField: string;
  sampleValue: string;
}

interface BankTemplate {
  id: string;
  name: string;
  bankName: string;
  accountType: string;
  dateFormat: string;
  currency: string;
  columnMappings: ColumnMapping[];
  createdAt: string;
  lastUsed: string;
  timesUsed: number;
}

const mockTemplates: BankTemplate[] = [
  {
    id: '1',
    name: 'HBL Business Account',
    bankName: 'Habib Bank Limited',
    accountType: 'Business Current',
    dateFormat: 'DD/MM/YYYY',
    currency: 'PKR',
    columnMappings: [
      { csvColumn: 'Transaction Date', systemField: 'date', sampleValue: '15/01/2025' },
      { csvColumn: 'Description', systemField: 'narration', sampleValue: 'AWS Payment' },
      { csvColumn: 'Debit', systemField: 'debit', sampleValue: '5000' },
      { csvColumn: 'Credit', systemField: 'credit', sampleValue: '' },
      { csvColumn: 'Balance', systemField: 'balance', sampleValue: '125000' },
    ],
    createdAt: '2025-01-10',
    lastUsed: '2025-01-15',
    timesUsed: 12,
  },
  {
    id: '2',
    name: 'Meezan Bank Savings',
    bankName: 'Meezan Bank',
    accountType: 'Savings',
    dateFormat: 'YYYY-MM-DD',
    currency: 'PKR',
    columnMappings: [
      { csvColumn: 'Date', systemField: 'date', sampleValue: '2025-01-15' },
      { csvColumn: 'Particulars', systemField: 'narration', sampleValue: 'Salary Credit' },
      { csvColumn: 'Withdrawal', systemField: 'debit', sampleValue: '' },
      { csvColumn: 'Deposit', systemField: 'credit', sampleValue: '150000' },
      { csvColumn: 'Running Balance', systemField: 'balance', sampleValue: '500000' },
    ],
    createdAt: '2025-01-05',
    lastUsed: '2025-01-14',
    timesUsed: 8,
  },
  {
    id: '3',
    name: 'Bank Alfalah USD Account',
    bankName: 'Bank Alfalah',
    accountType: 'USD Current',
    dateFormat: 'MM/DD/YYYY',
    currency: 'USD',
    columnMappings: [
      { csvColumn: 'Trans Date', systemField: 'date', sampleValue: '01/15/2025' },
      { csvColumn: 'Details', systemField: 'narration', sampleValue: 'International Transfer' },
      { csvColumn: 'Amount Out', systemField: 'debit', sampleValue: '' },
      { csvColumn: 'Amount In', systemField: 'credit', sampleValue: '2500' },
      { csvColumn: 'Balance USD', systemField: 'balance', sampleValue: '15000' },
    ],
    createdAt: '2024-12-20',
    lastUsed: '2025-01-12',
    timesUsed: 5,
  },
];

const systemFields = [
  { value: 'date', label: 'Transaction Date' },
  { value: 'narration', label: 'Narration/Description' },
  { value: 'debit', label: 'Debit Amount' },
  { value: 'credit', label: 'Credit Amount' },
  { value: 'balance', label: 'Running Balance' },
  { value: 'reference', label: 'Reference Number' },
  { value: 'ignore', label: 'Ignore This Column' },
];

export function SavedBankTemplates() {
  const [templates, setTemplates] = useState<BankTemplate[]>(mockTemplates);
  const [selectedTemplate, setSelectedTemplate] = useState<BankTemplate | null>(null);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editMode, setEditMode] = useState(false);

  // Form state for create/edit
  const [templateName, setTemplateName] = useState('');
  const [bankName, setBankName] = useState('');
  const [accountType, setAccountType] = useState('');
  const [dateFormat, setDateFormat] = useState('DD/MM/YYYY');
  const [currency, setCurrency] = useState('PKR');

  const handleViewTemplate = (template: BankTemplate) => {
    setSelectedTemplate(template);
    setViewDialogOpen(true);
  };

  const handleEditTemplate = (template: BankTemplate) => {
    setSelectedTemplate(template);
    setTemplateName(template.name);
    setBankName(template.bankName);
    setAccountType(template.accountType);
    setDateFormat(template.dateFormat);
    setCurrency(template.currency);
    setEditMode(true);
    setCreateDialogOpen(true);
  };

  const handleDeleteTemplate = (id: string) => {
    setTemplates(templates.filter(t => t.id !== id));
    toast.success('Template deleted successfully');
  };

  const handleDuplicateTemplate = (template: BankTemplate) => {
    const newTemplate = {
      ...template,
      id: Date.now().toString(),
      name: `${template.name} (Copy)`,
      createdAt: new Date().toISOString().split('T')[0],
      lastUsed: '-',
      timesUsed: 0,
    };
    setTemplates([newTemplate, ...templates]);
    toast.success('Template duplicated successfully');
  };

  const handleCreateTemplate = () => {
    setEditMode(false);
    setTemplateName('');
    setBankName('');
    setAccountType('');
    setDateFormat('DD/MM/YYYY');
    setCurrency('PKR');
    setCreateDialogOpen(true);
  };

  const handleSaveTemplate = () => {
    if (!templateName || !bankName) {
      toast.error('Please fill in all required fields');
      return;
    }

    if (editMode && selectedTemplate) {
      // Update existing template
      setTemplates(templates.map(t => 
        t.id === selectedTemplate.id
          ? { ...t, name: templateName, bankName, accountType, dateFormat, currency }
          : t
      ));
      toast.success('Template updated successfully');
    } else {
      // Create new template
      const newTemplate: BankTemplate = {
        id: Date.now().toString(),
        name: templateName,
        bankName,
        accountType,
        dateFormat,
        currency,
        columnMappings: [],
        createdAt: new Date().toISOString().split('T')[0],
        lastUsed: '-',
        timesUsed: 0,
      };
      setTemplates([newTemplate, ...templates]);
      toast.success('Template created successfully');
    }

    setCreateDialogOpen(false);
  };

  const handleUseTemplate = (template: BankTemplate) => {
    // Update last used and times used
    setTemplates(templates.map(t => 
      t.id === template.id
        ? { 
            ...t, 
            lastUsed: new Date().toISOString().split('T')[0],
            timesUsed: t.timesUsed + 1 
          }
        : t
    ));
    toast.success(`Using template: ${template.name}`);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white mb-2">Saved Bank Templates</h2>
          <p className="text-slate-400">Save and reuse your bank statement import mappings</p>
        </div>
        <Button 
          onClick={handleCreateTemplate}
          className="bg-gradient-to-r from-blue-600 to-cyan-600"
        >
          <Plus className="size-4 mr-2" />
          Create Template
        </Button>
      </div>

      {/* Info Card */}
      <Card className="bg-blue-950/20 border-blue-900/50">
        <CardContent className="pt-6">
          <div className="flex items-start gap-3">
            <div className="p-2 bg-blue-500/20 rounded-lg">
              <AlertCircle className="size-5 text-blue-400" />
            </div>
            <div>
              <h4 className="text-sm font-medium text-blue-200 mb-1">Save Time on Imports</h4>
              <p className="text-xs text-blue-300/80">
                Create templates for your bank statements so you don't have to re-map columns every time.
                Simply select your saved template during import and skip the mapping step!
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Templates Grid */}
      {templates.length === 0 ? (
        <Card className="bg-slate-900 border-slate-800">
          <CardContent className="py-16 text-center">
            <div className="inline-flex items-center justify-center size-16 bg-slate-800 rounded-full mb-4">
              <FileText className="size-8 text-slate-400" />
            </div>
            <h3 className="text-xl font-medium text-white mb-2">No Templates Yet</h3>
            <p className="text-slate-400 mb-6 max-w-md mx-auto">
              Create your first bank template to save time on future imports
            </p>
            <Button 
              onClick={handleCreateTemplate}
              className="bg-gradient-to-r from-blue-600 to-cyan-600"
            >
              <Plus className="size-4 mr-2" />
              Create Your First Template
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {templates.map((template) => (
            <Card key={template.id} className="bg-slate-900 border-slate-800 hover:border-slate-700 transition-colors">
              <CardHeader>
                <div className="flex items-start justify-between mb-2">
                  <div className="p-2 bg-gradient-to-br from-blue-500/20 to-cyan-500/20 rounded-lg">
                    <Building2 className="size-5 text-blue-400" />
                  </div>
                  <Badge className="bg-slate-950 text-slate-400 border-slate-700">
                    {template.currency}
                  </Badge>
                </div>
                <CardTitle className="text-white text-lg">{template.name}</CardTitle>
                <CardDescription className="text-slate-400">{template.bankName}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Template Details */}
                <div className="space-y-2 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500">Account Type</span>
                    <span className="text-slate-300">{template.accountType}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500">Date Format</span>
                    <span className="text-slate-300">{template.dateFormat}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500">Columns Mapped</span>
                    <Badge className="bg-green-500/20 text-green-400 border-green-500/30">
                      {template.columnMappings.length}
                    </Badge>
                  </div>
                </div>

                {/* Usage Stats */}
                <div className="pt-3 border-t border-slate-800 space-y-2 text-xs">
                  <div className="flex items-center gap-2 text-slate-400">
                    <Calendar className="size-3" />
                    <span>Created: {template.createdAt}</span>
                  </div>
                  <div className="flex items-center gap-2 text-slate-400">
                    <Check className="size-3" />
                    <span>Used {template.timesUsed} times • Last: {template.lastUsed}</span>
                  </div>
                </div>

                {/* Actions */}
                <div className="grid grid-cols-2 gap-2 pt-3">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleUseTemplate(template)}
                    className="bg-blue-500/10 border-blue-500/30 text-blue-400 hover:bg-blue-500/20"
                  >
                    <Download className="size-3 mr-1" />
                    Use
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleViewTemplate(template)}
                    className="border-slate-700 hover:bg-slate-800"
                  >
                    View
                  </Button>
                </div>

                <div className="grid grid-cols-3 gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleEditTemplate(template)}
                    className="text-xs"
                  >
                    <Edit className="size-3 mr-1" />
                    Edit
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDuplicateTemplate(template)}
                    className="text-xs"
                  >
                    <Copy className="size-3 mr-1" />
                    Copy
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDeleteTemplate(template.id)}
                    className="text-xs text-red-400 hover:text-red-300"
                  >
                    <Trash2 className="size-3 mr-1" />
                    Del
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* View Template Dialog */}
      <Dialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
        <DialogContent className="bg-slate-900 border-slate-800 max-w-3xl">
          <DialogHeader>
            <DialogTitle className="text-white">{selectedTemplate?.name}</DialogTitle>
            <DialogDescription className="text-slate-400">
              {selectedTemplate?.bankName} • {selectedTemplate?.accountType}
            </DialogDescription>
          </DialogHeader>

          {selectedTemplate && (
            <div className="space-y-4 mt-4">
              {/* Template Info */}
              <div className="grid grid-cols-2 gap-4 p-4 bg-slate-950 rounded-lg">
                <div>
                  <Label className="text-slate-400 text-xs">Currency</Label>
                  <p className="text-white">{selectedTemplate.currency}</p>
                </div>
                <div>
                  <Label className="text-slate-400 text-xs">Date Format</Label>
                  <p className="text-white">{selectedTemplate.dateFormat}</p>
                </div>
              </div>

              {/* Column Mappings */}
              <div>
                <h4 className="text-sm font-medium text-white mb-3">Column Mappings</h4>
                <div className="space-y-2">
                  {selectedTemplate.columnMappings.map((mapping, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between p-3 bg-slate-950 rounded-lg"
                    >
                      <div className="flex-1">
                        <div className="text-sm text-white font-medium mb-1">
                          {mapping.csvColumn}
                        </div>
                        <div className="text-xs text-slate-500">
                          Sample: {mapping.sampleValue || 'N/A'}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <MapPin className="size-4 text-slate-600" />
                        <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/30">
                          {systemFields.find(f => f.value === mapping.systemField)?.label}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-2 pt-4">
                <Button
                  onClick={() => {
                    handleUseTemplate(selectedTemplate);
                    setViewDialogOpen(false);
                  }}
                  className="flex-1 bg-gradient-to-r from-blue-600 to-cyan-600"
                >
                  <Download className="size-4 mr-2" />
                  Use This Template
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    setViewDialogOpen(false);
                    handleEditTemplate(selectedTemplate);
                  }}
                  className="border-slate-700 hover:bg-slate-800"
                >
                  <Edit className="size-4 mr-2" />
                  Edit
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Create/Edit Template Dialog */}
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent className="bg-slate-900 border-slate-800 max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-white">
              {editMode ? 'Edit Template' : 'Create New Template'}
            </DialogTitle>
            <DialogDescription className="text-slate-400">
              {editMode 
                ? 'Update your bank template information'
                : 'Save your bank import configuration for future use'
              }
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 mt-4">
            <div>
              <Label className="text-white">Template Name *</Label>
              <Input
                placeholder="e.g., HBL Business Account"
                value={templateName}
                onChange={(e) => setTemplateName(e.target.value)}
                className="bg-slate-950 border-slate-700 mt-2"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-white">Bank Name *</Label>
                <Input
                  placeholder="e.g., Habib Bank Limited"
                  value={bankName}
                  onChange={(e) => setBankName(e.target.value)}
                  className="bg-slate-950 border-slate-700 mt-2"
                />
              </div>
              <div>
                <Label className="text-white">Account Type</Label>
                <Input
                  placeholder="e.g., Business Current"
                  value={accountType}
                  onChange={(e) => setAccountType(e.target.value)}
                  className="bg-slate-950 border-slate-700 mt-2"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-white">Date Format</Label>
                <select
                  value={dateFormat}
                  onChange={(e) => setDateFormat(e.target.value)}
                  className="w-full h-10 px-3 rounded-md bg-slate-950 border border-slate-700 text-white mt-2"
                >
                  <option value="DD/MM/YYYY">DD/MM/YYYY</option>
                  <option value="MM/DD/YYYY">MM/DD/YYYY</option>
                  <option value="YYYY-MM-DD">YYYY-MM-DD</option>
                  <option value="DD-MM-YYYY">DD-MM-YYYY</option>
                </select>
              </div>
              <div>
                <Label className="text-white">Currency</Label>
                <select
                  value={currency}
                  onChange={(e) => setCurrency(e.target.value)}
                  className="w-full h-10 px-3 rounded-md bg-slate-950 border border-slate-700 text-white mt-2"
                >
                  <option value="PKR">PKR - Pakistani Rupee</option>
                  <option value="USD">USD - US Dollar</option>
                  <option value="AED">AED - UAE Dirham</option>
                  <option value="EUR">EUR - Euro</option>
                  <option value="GBP">GBP - British Pound</option>
                </select>
              </div>
            </div>

            <div className="p-4 bg-slate-950 rounded-lg border border-slate-800">
              <p className="text-xs text-slate-400">
                💡 After creating this template, you'll be able to map your CSV columns during the import process.
                The mapping will be saved with this template for future imports.
              </p>
            </div>

            <div className="flex gap-2 pt-4">
              <Button
                onClick={handleSaveTemplate}
                className="flex-1 bg-gradient-to-r from-blue-600 to-cyan-600"
              >
                <Save className="size-4 mr-2" />
                {editMode ? 'Update Template' : 'Create Template'}
              </Button>
              <Button
                variant="outline"
                onClick={() => setCreateDialogOpen(false)}
                className="border-slate-700 hover:bg-slate-800"
              >
                Cancel
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}