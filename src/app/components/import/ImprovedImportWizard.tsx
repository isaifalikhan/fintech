import { useState, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Upload, 
  FileSpreadsheet, 
  CheckCircle2, 
  AlertCircle, 
  Sparkles,
  ArrowRight,
  ArrowLeft,
  Download,
  X,
  Brain,
  Zap,
  FileText
} from 'lucide-react';
import { Button } from '../ui/button';
import { Card, CardContent } from '../ui/card';
import { Progress } from '../ui/progress';

interface ImportStep {
  id: string;
  title: string;
  description: string;
}

interface ParsedData {
  headers: string[];
  rows: any[][];
  totalRows: number;
}

const IMPORT_STEPS: ImportStep[] = [
  { id: 'upload', title: 'Upload File', description: 'Select your bank statement or CSV file' },
  { id: 'preview', title: 'Preview Data', description: 'Review the parsed data' },
  { id: 'mapping', title: 'Map Columns', description: 'AI will suggest column mappings' },
  { id: 'confirm', title: 'Confirm Import', description: 'Review and import transactions' }
];

export function ImprovedImportWizard() {
  const [currentStep, setCurrentStep] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [parsedData, setParsedData] = useState<ParsedData | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingProgress, setProcessingProgress] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Column mapping state
  const [columnMapping, setColumnMapping] = useState<Record<string, string>>({});

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile) {
      processFile(droppedFile);
    }
  }, []);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      processFile(selectedFile);
    }
  };

  const processFile = async (selectedFile: File) => {
    setFile(selectedFile);
    setIsProcessing(true);
    setProcessingProgress(0);

    // Simulate file processing with progress
    const progressInterval = setInterval(() => {
      setProcessingProgress(prev => {
        if (prev >= 100) {
          clearInterval(progressInterval);
          return 100;
        }
        return prev + 10;
      });
    }, 150);

    // Simulate parsing delay
    setTimeout(() => {
      // Mock parsed data
      const mockData: ParsedData = {
        headers: ['Date', 'Description', 'Amount', 'Balance', 'Category'],
        rows: [
          ['2024-01-15', 'AWS Invoice - Cloud Services', '-450.00', '12,550.00', ''],
          ['2024-01-20', 'Client Payment - ABC Corp', '15,000.00', '27,550.00', ''],
          ['2024-01-22', 'Office Supplies - Amazon', '-127.50', '27,422.50', ''],
          ['2024-01-25', 'Salary - John Doe', '-5,000.00', '22,422.50', ''],
          ['2024-01-28', 'Adobe Creative Cloud', '-79.99', '22,342.51', ''],
        ],
        totalRows: 5
      };

      setParsedData(mockData);
      setIsProcessing(false);
      setCurrentStep(1);

      // AI suggests column mappings
      setColumnMapping({
        'Date': 'transaction_date',
        'Description': 'narration',
        'Amount': 'amount',
        'Balance': 'balance',
        'Category': 'category'
      });
    }, 1500);
  };

  const nextStep = () => {
    if (currentStep < IMPORT_STEPS.length - 1) {
      setCurrentStep(prev => prev + 1);
    }
  };

  const previousStep = () => {
    if (currentStep > 0) {
      setCurrentStep(prev => prev - 1);
    }
  };

  const handleImport = () => {
    // TODO: Implement actual import logic
    console.log('Importing with mapping:', columnMapping);
    alert('Import successful! (Demo)');
  };

  const step = IMPORT_STEPS[currentStep];
  const progress = ((currentStep + 1) / IMPORT_STEPS.length) * 100;

  return (
    <div className="w-full max-w-4xl mx-auto p-6">
      <Card className="bg-slate-900 border-white/10">
        <CardContent className="p-8">
          {/* Header */}
          <div className="mb-6">
            <h2 className="text-2xl font-bold text-white mb-2">Import Statements</h2>
            <p className="text-slate-400">Upload your bank statements and let AI do the heavy lifting</p>
          </div>

          {/* Progress */}
          <div className="mb-8">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm text-slate-400">Step {currentStep + 1} of {IMPORT_STEPS.length}</span>
              <span className="text-sm font-medium text-white">{step.title}</span>
            </div>
            <Progress value={progress} className="h-2 mb-4" />
            
            {/* Step indicators */}
            <div className="flex justify-between">
              {IMPORT_STEPS.map((s, idx) => (
                <div
                  key={s.id}
                  className={`flex flex-col items-center ${idx <= currentStep ? 'opacity-100' : 'opacity-40'}`}
                >
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center mb-2 ${
                    idx < currentStep 
                      ? 'bg-green-500 text-white' 
                      : idx === currentStep
                      ? 'bg-gradient-to-br from-blue-500 to-cyan-500 text-white'
                      : 'bg-slate-800 text-slate-500'
                  }`}>
                    {idx < currentStep ? (
                      <CheckCircle2 className="w-5 h-5" />
                    ) : (
                      idx + 1
                    )}
                  </div>
                  <p className="text-xs text-slate-400 text-center">{s.title}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Content */}
          <AnimatePresence mode="wait">
            <motion.div
              key={currentStep}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3 }}
            >
              {step.id === 'upload' && (
                <UploadStep
                  isDragging={isDragging}
                  file={file}
                  isProcessing={isProcessing}
                  processingProgress={processingProgress}
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  onFileSelect={handleFileSelect}
                  fileInputRef={fileInputRef}
                />
              )}

              {step.id === 'preview' && parsedData && (
                <PreviewStep data={parsedData} />
              )}

              {step.id === 'mapping' && parsedData && (
                <MappingStep
                  data={parsedData}
                  mapping={columnMapping}
                  onMappingChange={setColumnMapping}
                />
              )}

              {step.id === 'confirm' && parsedData && (
                <ConfirmStep data={parsedData} mapping={columnMapping} />
              )}
            </motion.div>
          </AnimatePresence>

          {/* Actions */}
          <div className="flex items-center justify-between mt-8 pt-6 border-t border-white/10">
            <Button
              variant="outline"
              onClick={previousStep}
              disabled={currentStep === 0}
              className="border-white/10 hover:bg-white/5 text-white"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </Button>

            {currentStep === IMPORT_STEPS.length - 1 ? (
              <Button
                onClick={handleImport}
                className="bg-gradient-to-r from-green-500 to-emerald-500 hover:opacity-90 text-white"
              >
                <Upload className="w-4 h-4 mr-2" />
                Import {parsedData?.totalRows} Transactions
              </Button>
            ) : (
              <Button
                onClick={nextStep}
                disabled={!file && currentStep === 0}
                className="bg-gradient-to-r from-blue-500 to-cyan-500 hover:opacity-90 text-white"
              >
                Continue
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// Upload Step Component
function UploadStep({
  isDragging,
  file,
  isProcessing,
  processingProgress,
  onDragOver,
  onDragLeave,
  onDrop,
  onFileSelect,
  fileInputRef
}: any) {
  return (
    <div className="space-y-4">
      <input
        ref={fileInputRef}
        type="file"
        accept=".csv,.xlsx,.xls,.pdf"
        onChange={onFileSelect}
        className="hidden"
      />

      <div
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onDrop={onDrop}
        className={`border-2 border-dashed rounded-xl p-12 text-center transition-all cursor-pointer ${
          isDragging
            ? 'border-blue-500 bg-blue-500/10 scale-105'
            : 'border-white/20 bg-white/5 hover:bg-white/10 hover:border-white/30'
        }`}
        onClick={() => fileInputRef.current?.click()}
      >
        {isProcessing ? (
          <div className="space-y-4">
            <div className="w-16 h-16 mx-auto bg-gradient-to-br from-blue-500 to-cyan-500 rounded-full flex items-center justify-center">
              <Sparkles className="w-8 h-8 text-white animate-pulse" />
            </div>
            <h4 className="text-white font-medium">Processing your file...</h4>
            <div className="max-w-xs mx-auto">
              <Progress value={processingProgress} className="h-2" />
              <p className="text-xs text-slate-400 mt-2">{processingProgress}% complete</p>
            </div>
          </div>
        ) : file ? (
          <div className="space-y-3">
            <div className="w-16 h-16 mx-auto bg-green-500/20 rounded-full flex items-center justify-center">
              <CheckCircle2 className="w-8 h-8 text-green-400" />
            </div>
            <h4 className="text-white font-medium">{file.name}</h4>
            <p className="text-sm text-slate-400">{(file.size / 1024).toFixed(2)} KB</p>
            <Button
              size="sm"
              variant="outline"
              className="border-white/10 hover:bg-white/5 text-white"
              onClick={(e) => {
                e.stopPropagation();
                fileInputRef.current?.click();
              }}
            >
              Choose Different File
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="w-16 h-16 mx-auto bg-blue-500/20 rounded-full flex items-center justify-center">
              <Upload className="w-8 h-8 text-blue-400" />
            </div>
            <div>
              <h4 className="text-white font-medium mb-2">Drag & Drop Your Statement</h4>
              <p className="text-sm text-slate-400 mb-4">
                or click to browse
              </p>
            </div>
            <div className="flex items-center justify-center gap-3 text-xs text-slate-500">
              <div className="flex items-center gap-1">
                <FileSpreadsheet className="w-4 h-4" />
                <span>CSV</span>
              </div>
              <div className="flex items-center gap-1">
                <FileSpreadsheet className="w-4 h-4" />
                <span>Excel</span>
              </div>
              <div className="flex items-center gap-1">
                <FileText className="w-4 h-4" />
                <span>PDF</span>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="grid grid-cols-3 gap-3">
        <div className="bg-white/5 border border-white/10 rounded-lg p-4 text-center">
          <Zap className="w-6 h-6 text-blue-400 mx-auto mb-2" />
          <p className="text-xs text-slate-400">Auto-detect format</p>
        </div>
        <div className="bg-white/5 border border-white/10 rounded-lg p-4 text-center">
          <Brain className="w-6 h-6 text-purple-400 mx-auto mb-2" />
          <p className="text-xs text-slate-400">AI column mapping</p>
        </div>
        <div className="bg-white/5 border border-white/10 rounded-lg p-4 text-center">
          <CheckCircle2 className="w-6 h-6 text-green-400 mx-auto mb-2" />
          <p className="text-xs text-slate-400">Duplicate detection</p>
        </div>
      </div>
    </div>
  );
}

// Preview Step Component
function PreviewStep({ data }: { data: ParsedData }) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-white font-medium">Data Preview</h3>
          <p className="text-sm text-slate-400">{data.totalRows} rows detected</p>
        </div>
        <Button size="sm" variant="outline" className="border-white/10 hover:bg-white/5 text-white">
          <Download className="w-4 h-4 mr-2" />
          Export Preview
        </Button>
      </div>

      <div className="bg-slate-950 border border-white/10 rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-900 border-b border-white/10">
              <tr>
                {data.headers.map((header, idx) => (
                  <th key={idx} className="px-4 py-3 text-left text-slate-400 font-medium">
                    {header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {data.rows.map((row, rowIdx) => (
                <tr key={rowIdx} className="hover:bg-white/5">
                  {row.map((cell, cellIdx) => (
                    <td key={cellIdx} className="px-4 py-3 text-white">
                      {cell}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4">
        <p className="text-sm text-blue-200 flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4" />
          All rows parsed successfully. No errors detected.
        </p>
      </div>
    </div>
  );
}

// Mapping Step Component
function MappingStep({ data, mapping, onMappingChange }: any) {
  const availableFields = [
    { value: 'transaction_date', label: 'Transaction Date' },
    { value: 'narration', label: 'Description/Narration' },
    { value: 'amount', label: 'Amount' },
    { value: 'balance', label: 'Balance' },
    { value: 'category', label: 'Category' },
    { value: 'reference', label: 'Reference Number' },
    { value: 'skip', label: 'Skip Column' }
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-start gap-3 bg-purple-500/10 border border-purple-500/20 rounded-lg p-4">
        <Brain className="w-5 h-5 text-purple-400 flex-shrink-0 mt-0.5" />
        <div>
          <h4 className="text-white font-medium mb-1">AI Smart Mapping</h4>
          <p className="text-sm text-purple-200">
            We've automatically mapped your columns based on common patterns. Review and adjust if needed.
          </p>
        </div>
      </div>

      <div className="space-y-3">
        {data.headers.map((header: string, idx: number) => (
          <div key={idx} className="flex items-center gap-4 bg-white/5 border border-white/10 rounded-lg p-4">
            <div className="flex-1">
              <p className="text-white font-medium mb-1">{header}</p>
              <p className="text-xs text-slate-400">Sample: {data.rows[0][idx]}</p>
            </div>
            
            <ArrowRight className="w-5 h-5 text-slate-600" />
            
            <select
              value={mapping[header] || 'skip'}
              onChange={(e) => onMappingChange({ ...mapping, [header]: e.target.value })}
              className="flex-1 bg-slate-900 border border-white/10 rounded-lg px-4 py-2 text-white"
            >
              {availableFields.map(field => (
                <option key={field.value} value={field.value}>
                  {field.label}
                </option>
              ))}
            </select>

            <div className="w-24 text-right">
              {mapping[header] && mapping[header] !== 'skip' && (
                <span className="text-xs px-2 py-1 bg-green-500/20 text-green-400 rounded border border-green-500/30">
                  ✓ Mapped
                </span>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// Confirm Step Component
function ConfirmStep({ data, mapping }: any) {
  const mappedFields = Object.entries(mapping).filter(([_, value]) => value !== 'skip');

  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-br from-green-500/10 to-emerald-500/10 border border-green-500/20 rounded-lg p-6 text-center">
        <CheckCircle2 className="w-16 h-16 text-green-400 mx-auto mb-4" />
        <h3 className="text-xl font-bold text-white mb-2">Ready to Import!</h3>
        <p className="text-slate-400">
          Everything looks good. Review the summary below and click Import to proceed.
        </p>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white/5 border border-white/10 rounded-lg p-4">
          <p className="text-2xl font-bold text-white mb-1">{data.totalRows}</p>
          <p className="text-xs text-slate-400">Total Transactions</p>
        </div>
        <div className="bg-white/5 border border-white/10 rounded-lg p-4">
          <p className="text-2xl font-bold text-white mb-1">{mappedFields.length}</p>
          <p className="text-xs text-slate-400">Mapped Fields</p>
        </div>
        <div className="bg-white/5 border border-white/10 rounded-lg p-4">
          <p className="text-2xl font-bold text-white mb-1">0</p>
          <p className="text-xs text-slate-400">Duplicates Found</p>
        </div>
      </div>

      <div className="bg-slate-950 border border-white/10 rounded-lg p-4">
        <h4 className="text-white font-medium mb-3">Field Mapping Summary</h4>
        <div className="space-y-2">
          {mappedFields.map(([source, target]: any) => (
            <div key={source} className="flex items-center justify-between text-sm">
              <span className="text-slate-400">{source}</span>
              <ArrowRight className="w-4 h-4 text-slate-600" />
              <span className="text-white font-medium">{target}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
