import { useRef, useState } from 'react';
import { useNavigate } from 'react-router';
import { useOnboarding } from '../../../contexts/OnboardingContext';
import { useAuth } from '../../../contexts/AuthContext';
import {
  parseCSVFile,
  autoDetectColumnMapping,
  processCSVData,
  type ImportedTransaction,
} from '@/lib/importUtils';
import { classifyTransaction } from '@/lib/classificationEngine';
import { dataStore } from '@/services/dataStore';
import { Button } from '../ui/button';
import { Card, CardContent } from '../ui/card';
import { Progress } from '../ui/progress';
import { 
  Sparkles, 
  Building2, 
  Upload, 
  Brain, 
  TrendingUp, 
  X, 
  ArrowRight, 
  ArrowLeft,
  CheckCircle2,
  Rocket
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { toast } from 'sonner';

const STEP_ICONS = {
  welcome: Sparkles,
  'connect-bank': Building2,
  'import-statements': Upload,
  'review-categories': Brain,
  'explore-insights': TrendingUp
};

const STEP_COLORS = {
  welcome: 'from-violet-500 to-purple-500',
  'connect-bank': 'from-blue-500 to-cyan-500',
  'import-statements': 'from-emerald-500 to-green-500',
  'review-categories': 'from-amber-500 to-orange-500',
  'explore-insights': 'from-pink-500 to-rose-500'
};

export function OnboardingWizard() {
  const { 
    isOnboarding, 
    currentStep, 
    steps, 
    nextStep, 
    previousStep, 
    skipOnboarding,
    completeStep
  } = useOnboarding();

  /** Rows parsed from the CSV the user picks in step 3, shown for real in step 4.
   *  Declared before the early return below so hook order stays stable. */
  const [importedRows, setImportedRows] = useState<ImportedTransaction[] | null>(null);

  if (!isOnboarding) return null;

  const step = steps[currentStep];
  const Icon = STEP_ICONS[step.id as keyof typeof STEP_ICONS] || Sparkles;
  const colorClass = STEP_COLORS[step.id as keyof typeof STEP_COLORS] || 'from-blue-500 to-cyan-500';
  const progress = ((currentStep + 1) / steps.length) * 100;

  const handleContinue = () => {
    completeStep(step.id);
    nextStep();
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <AnimatePresence mode="wait">
        <motion.div
          key={currentStep}
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          transition={{ duration: 0.3 }}
          className="w-full max-w-2xl"
        >
          <Card className="bg-slate-900 border-white/10 shadow-2xl max-h-[90vh] overflow-y-auto">
            <CardContent className="p-4 sm:p-8">
              {/* Header */}
              <div className="flex items-center justify-between gap-3 mb-6">
                <div className="flex items-center gap-3 min-w-0">
                  <div
                    className={`w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-gradient-to-br ${colorClass} flex items-center justify-center shrink-0`}
                    style={{
                      boxShadow: '0 10px 30px -10px rgba(139, 92, 246, 0.6)',
                    }}
                  >
                    <Icon className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs text-slate-400">Step {currentStep + 1} of {steps.length}</p>
                    <h2 className="text-lg sm:text-xl font-bold text-white truncate">{step.title}</h2>
                  </div>
                </div>
                <button
                  onClick={skipOnboarding}
                  className="text-slate-400 hover:text-white transition-colors shrink-0"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Progress Bar */}
              <div className="mb-8">
                <Progress value={progress} className="h-2" />
                <div className="flex justify-between mt-2">
                  {steps.map((s, idx) => (
                    <div
                      key={s.id}
                      className={`w-6 h-6 sm:w-8 sm:h-8 rounded-full flex items-center justify-center text-xs font-medium transition-all shrink-0 ${
                        idx < currentStep
                          ? 'bg-green-500 text-white'
                          : idx === currentStep
                          ? `bg-gradient-to-br ${colorClass} text-white`
                          : 'bg-slate-800 text-slate-500'
                      }`}
                    >
                      {idx < currentStep ? (
                        <CheckCircle2 className="w-4 h-4" />
                      ) : (
                        idx + 1
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Content */}
              <div className="mb-8">
                {step.id === 'welcome' && <WelcomeStep />}
                {step.id === 'connect-bank' && <ConnectBankStep />}
                {step.id === 'import-statements' && <ImportStatementsStep onParsed={setImportedRows} />}
                {step.id === 'review-categories' && <ReviewCategoriesStep rows={importedRows} />}
                {step.id === 'explore-insights' && <ExploreInsightsStep />}
              </div>

              {/* Actions */}
              <div className="flex flex-wrap items-center justify-between gap-3">
                <Button
                  variant="outline"
                  onClick={previousStep}
                  disabled={currentStep === 0}
                  className="border-white/10 hover:bg-white/5 text-white order-3 sm:order-none w-full sm:w-auto"
                >
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Back
                </Button>
                <div className="flex gap-2 w-full sm:w-auto">
                  <Button
                    variant="outline"
                    onClick={skipOnboarding}
                    className="border-white/10 hover:bg-white/5 text-slate-400 flex-1 sm:flex-initial"
                  >
                    Skip Tour
                  </Button>
                  <Button
                    onClick={handleContinue}
                    className={`bg-gradient-to-r ${colorClass} hover:opacity-90 text-white flex-1 sm:flex-initial`}
                  >
                    {currentStep === steps.length - 1 ? (
                      <>
                        <Rocket className="w-4 h-4 mr-2" />
                        Get Started
                      </>
                    ) : (
                      <>
                        Continue
                        <ArrowRight className="w-4 h-4 ml-2" />
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

// Step Components

function WelcomeStep() {
  return (
    <div className="space-y-4">
      <div className="text-center py-8">
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.2, type: "spring" }}
          className="inline-block mb-4"
        >
          <Sparkles className="w-16 h-16 text-violet-400" />
        </motion.div>
        <h3 className="text-2xl font-bold text-white mb-3">
          Welcome to Finance OS! 🎉
        </h3>
        <p className="text-slate-400 text-lg mb-6 max-w-md mx-auto">
          The most intelligent finance platform built specifically for agencies and software houses.
        </p>
      </div>
      
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="p-4 bg-white/5 rounded-lg border border-white/10">
          <Brain className="w-8 h-8 text-blue-400 mb-2" />
          <h4 className="text-white font-medium mb-1">AI-Powered</h4>
          <p className="text-xs text-slate-400">Smart categorization learns from your behavior</p>
        </div>
        <div className="p-4 bg-white/5 rounded-lg border border-white/10">
          <TrendingUp className="w-8 h-8 text-green-400 mb-2" />
          <h4 className="text-white font-medium mb-1">Profit Intelligence</h4>
          <p className="text-xs text-slate-400">Deep insights into your agency's profitability</p>
        </div>
        <div className="p-4 bg-white/5 rounded-lg border border-white/10">
          <Upload className="w-8 h-8 text-cyan-400 mb-2" />
          <h4 className="text-white font-medium mb-1">Multi-Currency</h4>
          <p className="text-xs text-slate-400">Handle transactions in any currency</p>
        </div>
        <div className="p-4 bg-white/5 rounded-lg border border-white/10">
          <Building2 className="w-8 h-8 text-purple-400 mb-2" />
          <h4 className="text-white font-medium mb-1">Multi-Org</h4>
          <p className="text-xs text-slate-400">Manage multiple organizations seamlessly</p>
        </div>
      </div>

      <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4 mt-6">
        <p className="text-sm text-blue-200">
          💡 <strong>Pro Tip:</strong> This quick tour will have you set up in under 5 minutes!
        </p>
      </div>
    </div>
  );
}

function ConnectBankStep() {
  return (
    <div className="space-y-4">
      <p className="text-slate-300 text-lg mb-6">{steps[1].description}</p>
      
      <div className="bg-gradient-to-br from-blue-500/10 to-cyan-500/10 border border-blue-500/20 rounded-lg p-6">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-lg bg-blue-500/20 flex items-center justify-center flex-shrink-0">
            <Building2 className="w-6 h-6 text-blue-400" />
          </div>
          <div className="flex-1">
            <h4 className="text-white font-medium mb-2">Secure Bank Connection</h4>
            <p className="text-sm text-slate-400 mb-4">
              We use bank-level encryption to securely connect your accounts. Your credentials are never stored.
            </p>
            <ul className="space-y-2 text-sm text-slate-400">
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-green-400" />
                Automatic transaction imports
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-green-400" />
                Real-time balance updates
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-green-400" />
                Multi-currency support
              </li>
            </ul>
          </div>
        </div>
      </div>

      <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-4">
        <p className="text-sm text-amber-200">
          🔒 <strong>Security:</strong> You can also skip this and manually import CSV files if you prefer.
        </p>
      </div>
    </div>
  );
}

function ImportStatementsStep({ onParsed }: { onParsed: (rows: ImportedTransaction[]) => void }) {
  const { completeStep, nextStep } = useOnboarding();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [parsing, setParsing] = useState(false);

  const openFilePicker = () => fileInputRef.current?.click();

  /** Really parses the chosen CSV with the same pipeline the full importer uses
   *  (parseCSVFile → autoDetectColumnMapping → processCSVData), then classifies each row,
   *  so step 4 shows the user's actual transactions instead of canned samples. */
  const handleFilePicked = async (file: File) => {
    if (!/\.csv$/i.test(file.name)) {
      toast.error('Please choose a .csv file here — Excel and PDF are supported on the full import screen.');
      return;
    }

    setParsing(true);
    try {
      const data = await parseCSVFile(file);
      if (data.length < 2) {
        toast.error('That file has no data rows we could read.');
        return;
      }

      const headers = data[0].map(h => String(h ?? '').trim());
      const mapping = autoDetectColumnMapping(headers);
      const rows = processCSVData(data, mapping, headers);

      if (rows.length === 0) {
        toast.error("We couldn't find date/description/amount columns in that file.");
        return;
      }

      // Real classification against the org's categories + their learned patterns.
      const categories = dataStore.categories;
      const previous = dataStore.transactions;
      const classified = rows.map(r => {
        const result = classifyTransaction(r.narration, r.amount, r.type, categories, previous, []);
        return {
          ...r,
          suggestedCategory: result.categoryName || undefined,
          confidence: result.confidence,
        };
      });

      onParsed(classified);
      toast.success(`Parsed ${classified.length} transaction${classified.length === 1 ? '' : 's'} from ${file.name}`);
      completeStep('import-statements');
      nextStep();
    } catch (e) {
      console.error(e);
      toast.error('Could not read that file. Please check it is a valid CSV.');
    } finally {
      setParsing(false);
    }
  };

  return (
    <div className="space-y-4">
      <p className="text-slate-300 text-lg mb-6">Upload your first bank statement or CSV file to get started.</p>

      <input
        ref={fileInputRef}
        type="file"
        accept=".csv,text/csv"
        className="sr-only"
        onChange={(e) => {
          const file = e.target.files?.[0];
          // Reset so picking the same file again still fires a change event.
          e.target.value = '';
          if (file) void handleFilePicked(file);
        }}
      />

      <div
        role="button"
        tabIndex={0}
        onClick={openFilePicker}
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') openFilePicker(); }}
        className="border-2 border-dashed border-white/20 rounded-lg p-12 text-center bg-white/5 hover:bg-white/10 transition-colors cursor-pointer"
      >
        <Upload className="w-12 h-12 text-emerald-400 mx-auto mb-4" />
        <h4 className="text-white font-medium mb-2">Drag & Drop Your Statement</h4>
        <p className="text-sm text-slate-400 mb-4">
          Pick a CSV file — we'll read it and categorize the real rows on the next step
        </p>
        <Button
          disabled={parsing}
          onClick={(e) => { e.stopPropagation(); openFilePicker(); }}
          className="bg-gradient-to-r from-emerald-500 to-green-500 hover:opacity-90 text-white disabled:opacity-60"
        >
          {parsing ? 'Reading file…' : 'Choose File'}
        </Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-6">
        <div className="text-center p-3 bg-white/5 rounded-lg">
          <p className="text-2xl font-bold text-white mb-1">1.</p>
          <p className="text-xs text-slate-400">Upload file</p>
        </div>
        <div className="text-center p-3 bg-white/5 rounded-lg">
          <p className="text-2xl font-bold text-white mb-1">2.</p>
          <p className="text-xs text-slate-400">AI maps columns</p>
        </div>
        <div className="text-center p-3 bg-white/5 rounded-lg">
          <p className="text-2xl font-bold text-white mb-1">3.</p>
          <p className="text-xs text-slate-400">Review & import</p>
        </div>
      </div>
    </div>
  );
}

function ReviewCategoriesStep({ rows }: { rows: ImportedTransaction[] | null }) {
  // Real rows from the CSV picked in step 3 — only fall back to the canned samples below
  // when the user skipped straight past the upload step without choosing a file.
  if (rows && rows.length > 0) {
    return (
      <div className="space-y-4">
        <p className="text-slate-300 text-lg mb-6">
          We read <span className="text-white font-medium">{rows.length}</span> transaction{rows.length === 1 ? '' : 's'} from your file and categorized them. Review below.
        </p>

        <div className="space-y-3 max-h-80 overflow-y-auto">
          {rows.map((r) => {
            const confident = (r.confidence ?? 0) >= 60;
            return (
              <div key={r.id} className="bg-white/5 border border-white/10 rounded-lg p-4">
                <div className="flex items-center justify-between gap-3 mb-2">
                  <div className="min-w-0">
                    <p className="text-white font-medium truncate">{r.narration}</p>
                    <p className="text-xs text-slate-400">{r.date}</p>
                  </div>
                  <p className={`font-medium shrink-0 ${r.type === 'credit' ? 'text-green-400' : 'text-red-400'}`}>
                    {r.type === 'credit' ? '+' : '-'}{Math.abs(r.amount).toLocaleString()}
                  </p>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  <Brain className={`w-4 h-4 ${confident ? 'text-blue-400' : 'text-amber-400'}`} />
                  <span className="text-xs text-slate-400">
                    {confident ? 'AI suggested:' : 'Needs your review:'}
                  </span>
                  <span className={`text-xs px-2 py-1 rounded border ${
                    confident
                      ? 'bg-blue-500/10 text-blue-400 border-blue-500/20'
                      : 'bg-amber-500/10 text-amber-300 border-amber-500/20'
                  }`}>
                    {r.suggestedCategory || 'Uncategorised'}
                  </span>
                  {!!r.confidence && (
                    <span className={`text-xs ${confident ? 'text-green-400' : 'text-amber-400'}`}>
                      {confident ? '✓ ' : ''}{r.confidence}% confident
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4">
          <p className="text-sm text-blue-200">
            💡 <strong>Smart Learning:</strong> The more you categorize, the smarter the AI becomes!
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <p className="text-slate-300 text-lg mb-6">Here's an example of how our AI automatically categorizes transactions — go back a step and pick a CSV to see it run on your own data.</p>

      <div className="space-y-3">
        {/* Sample transactions — shown only when no file was picked in the previous step */}
        <div className="bg-white/5 border border-white/10 rounded-lg p-4">
          <div className="flex items-center justify-between mb-2">
            <div>
              <p className="text-white font-medium">AWS Invoice - July</p>
              <p className="text-xs text-slate-400">Jul 15, 2024</p>
            </div>
            <p className="text-red-400 font-medium">-$450.00</p>
          </div>
          <div className="flex items-center gap-2">
            <Brain className="w-4 h-4 text-blue-400" />
            <span className="text-xs text-slate-400">AI suggested:</span>
            <span className="text-xs px-2 py-1 bg-blue-500/10 text-blue-400 rounded border border-blue-500/20">
              Cloud Infrastructure
            </span>
            <span className="text-xs text-green-400">✓ 95% confident</span>
          </div>
        </div>

        <div className="bg-white/5 border border-white/10 rounded-lg p-4">
          <div className="flex items-center justify-between mb-2">
            <div>
              <p className="text-white font-medium">Client Payment - ABC Corp</p>
              <p className="text-xs text-slate-400">Jul 20, 2024</p>
            </div>
            <p className="text-green-400 font-medium">+$15,000.00</p>
          </div>
          <div className="flex items-center gap-2">
            <Brain className="w-4 h-4 text-blue-400" />
            <span className="text-xs text-slate-400">AI suggested:</span>
            <span className="text-xs px-2 py-1 bg-green-500/10 text-green-400 rounded border border-green-500/20">
              Client Revenue
            </span>
            <span className="text-xs text-green-400">✓ 98% confident</span>
          </div>
        </div>

        <div className="bg-white/5 border border-amber-500/20 rounded-lg p-4">
          <div className="flex items-center justify-between mb-2">
            <div>
              <p className="text-white font-medium">Office Supplies</p>
              <p className="text-xs text-slate-400">Jul 22, 2024</p>
            </div>
            <p className="text-red-400 font-medium">-$127.50</p>
          </div>
          <div className="flex items-center gap-2">
            <Brain className="w-4 h-4 text-amber-400" />
            <span className="text-xs text-slate-400">Need your help:</span>
            <select className="text-xs px-2 py-1 bg-slate-800 text-white rounded border border-white/10">
              <option>Office Expenses</option>
              <option>Equipment</option>
              <option>Supplies</option>
            </select>
          </div>
        </div>
      </div>

      <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4">
        <p className="text-sm text-blue-200">
          💡 <strong>Smart Learning:</strong> The more you categorize, the smarter the AI becomes!
        </p>
      </div>
    </div>
  );
}

function ExploreInsightsStep() {
  const navigate = useNavigate();
  const { user, isLoading: authLoading } = useAuth();
  const { skipOnboarding, completeStep, nextStep } = useOnboarding();

  const goTo = (view: string) => {
    // Same confirmed-auth guard as ImportStatementsStep — see comment there.
    if (!authLoading && user) {
      skipOnboarding();
      navigate(`/dashboard?view=${view}`);
    } else {
      completeStep('explore-insights');
      nextStep();
    }
  };

  return (
    <div className="space-y-4">
      <p className="text-slate-300 text-lg mb-6">You're all set! Here's what you can do now:</p>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="bg-gradient-to-br from-purple-500/10 to-pink-500/10 border border-purple-500/20 rounded-lg p-4">
          <TrendingUp className="w-8 h-8 text-purple-400 mb-3" />
          <h4 className="text-white font-medium mb-2">Profit Intelligence</h4>
          <p className="text-xs text-slate-400 mb-3">
            See department profitability, client analysis, and project margins
          </p>
          <Button onClick={() => goTo('profit-intelligence')} size="sm" className="bg-purple-500/20 hover:bg-purple-500/30 text-purple-300 text-xs">
            Explore →
          </Button>
        </div>

        <div className="bg-gradient-to-br from-cyan-500/10 to-blue-500/10 border border-cyan-500/20 rounded-lg p-4">
          <TrendingUp className="w-8 h-8 text-cyan-400 mb-3" />
          <h4 className="text-white font-medium mb-2">Cash Flow Forecast</h4>
          <p className="text-xs text-slate-400 mb-3">
            Predict your cash position for the next 90 days
          </p>
          <Button onClick={() => goTo('forecast')} size="sm" className="bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 text-xs">
            Explore →
          </Button>
        </div>

        <div className="bg-gradient-to-br from-amber-500/10 to-orange-500/10 border border-amber-500/20 rounded-lg p-4">
          <TrendingUp className="w-8 h-8 text-amber-400 mb-3" />
          <h4 className="text-white font-medium mb-2">What-If Simulator</h4>
          <p className="text-xs text-slate-400 mb-3">
            Model different scenarios and see financial impact
          </p>
          <Button onClick={() => goTo('simulator')} size="sm" className="bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 text-xs">
            Explore →
          </Button>
        </div>

        <div className="bg-gradient-to-br from-green-500/10 to-emerald-500/10 border border-green-500/20 rounded-lg p-4">
          <Brain className="w-8 h-8 text-green-400 mb-3" />
          <h4 className="text-white font-medium mb-2">AI Assistant</h4>
          <p className="text-xs text-slate-400 mb-3">
            Ask questions and get instant financial insights
          </p>
          <Button onClick={() => goTo('ai-assistant')} size="sm" className="bg-green-500/20 hover:bg-green-500/30 text-green-300 text-xs">
            Chat Now →
          </Button>
        </div>
      </div>

      <div className="bg-gradient-to-r from-violet-500/10 to-purple-500/10 border border-violet-500/20 rounded-lg p-6 text-center">
        <Rocket className="w-12 h-12 text-violet-400 mx-auto mb-3" />
        <h4 className="text-xl font-bold text-white mb-2">You're Ready to Launch! 🚀</h4>
        <p className="text-sm text-slate-400">
          Click "Get Started" to begin managing your agency finances like a pro
        </p>
      </div>
    </div>
  );
}

const steps = [
  {
    id: 'welcome',
    title: 'Welcome to Finance OS',
    description: 'Your intelligent finance platform for agencies',
    completed: false
  },
  {
    id: 'connect-bank',
    title: 'Connect Your Bank',
    description: 'Link your accounts for automatic transaction imports',
    completed: false
  }
];
