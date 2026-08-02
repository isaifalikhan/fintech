import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Play,
  Pause,
  RotateCcw,
  Zap,
  CheckCircle2,
  ArrowRight,
  Sparkles,
  Upload,
  FileText,
  Tag,
  TrendingUp
} from 'lucide-react';
import { Button } from '../components/ui/button';
import { Card, CardContent } from '../components/ui/card';
import { TimelineChart, HeatMapChart, FunnelChart, FlowDiagram, SPECIALIZED_CHART_DATA } from '../components/charts/SpecializedCharts';
import { ProgressLoader, DataProcessingLoader } from '../components/loading/LoadingStates';

export function InteractiveDemo() {
  const [activeDemo, setActiveDemo] = useState<'import' | 'categorization' | 'insights' | 'forecast'>('import');
  const [demoStep, setDemoStep] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);

  // Statement Import Demo Steps
  const importSteps = [
    {
      title: 'Upload Statement',
      description: 'Drag and drop your bank statement (CSV, Excel, or PDF)',
      component: (
        <div className="border-2 border-dashed border-white/20 rounded-xl p-12 text-center hover:border-blue-500/50 transition-colors cursor-pointer">
          <Upload className="w-16 h-16 text-slate-400 mx-auto mb-4" />
          <p className="text-white font-medium mb-2">Drop your statement here</p>
          <p className="text-slate-400 text-sm">Supports CSV, XLSX, PDF</p>
        </div>
      )
    },
    {
      title: 'Auto-Detect Format',
      description: 'AI analyzes the file structure and detects columns',
      component: (
        <DataProcessingLoader
          steps={[
            'Reading file structure',
            'Detecting columns',
            'Identifying date format',
            'Parsing transactions'
          ]}
          currentStep={2}
        />
      )
    },
    {
      title: 'Column Mapping',
      description: 'Review and confirm the auto-detected column mapping',
      component: (
        <div className="space-y-3">
          {[
            { detected: 'Date', mapped: 'Transaction Date', confidence: 99 },
            { detected: 'Description', mapped: 'Narration', confidence: 98 },
            { detected: 'Debit', mapped: 'Amount Out', confidence: 95 },
            { detected: 'Credit', mapped: 'Amount In', confidence: 95 },
            { detected: 'Balance', mapped: 'Running Balance', confidence: 92 }
          ].map((col, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.1 }}
              className="flex items-center gap-4 p-3 bg-white/5 rounded-lg border border-white/10"
            >
              <FileText className="w-5 h-5 text-blue-400" />
              <div className="flex-1">
                <p className="text-white text-sm font-medium">{col.detected}</p>
                <p className="text-slate-400 text-xs">→ {col.mapped}</p>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-green-400">{col.confidence}%</span>
                <CheckCircle2 className="w-4 h-4 text-green-400" />
              </div>
            </motion.div>
          ))}
        </div>
      )
    },
    {
      title: 'Import Complete',
      description: '247 transactions imported successfully',
      component: (
        <div className="text-center py-8">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="w-20 h-20 rounded-full bg-green-500 flex items-center justify-center mx-auto mb-4"
          >
            <CheckCircle2 className="w-12 h-12 text-white" />
          </motion.div>
          <h3 className="text-white text-xl font-bold mb-2">Import Successful!</h3>
          <p className="text-slate-400">247 transactions from HBL Current Account</p>
          <div className="mt-6 grid grid-cols-3 gap-4">
            <div className="p-3 bg-white/5 rounded-lg">
              <p className="text-slate-400 text-xs">Income</p>
              <p className="text-green-400 font-bold">$185K</p>
            </div>
            <div className="p-3 bg-white/5 rounded-lg">
              <p className="text-slate-400 text-xs">Expenses</p>
              <p className="text-red-400 font-bold">$124K</p>
            </div>
            <div className="p-3 bg-white/5 rounded-lg">
              <p className="text-slate-400 text-xs">Net</p>
              <p className="text-white font-bold">$61K</p>
            </div>
          </div>
        </div>
      )
    }
  ];

  // AI Categorization Demo Steps
  const categorizationSteps = [
    {
      title: 'Analyzing Transactions',
      description: 'AI examines narration patterns and merchant names',
      component: (
        <div className="space-y-4">
          {[
            { narration: 'AWS Invoice #INV-2024-001', category: 'Cloud Infrastructure', confidence: 98 },
            { narration: 'Facebook Ads Payment', category: 'Marketing', confidence: 95 },
            { narration: 'SALARY-ENG-JAN24', category: 'Salaries', confidence: 100 },
            { narration: 'Office Depot - Supplies', category: 'Office Expenses', confidence: 88 }
          ].map((tx, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.2 }}
              className="p-4 bg-white/5 rounded-lg border border-white/10"
            >
              <div className="flex items-start justify-between mb-3">
                <p className="text-white text-sm font-medium">{tx.narration}</p>
                <Sparkles className="w-4 h-4 text-purple-400 animate-pulse" />
              </div>
              <div className="flex items-center gap-3">
                <Tag className="w-4 h-4 text-blue-400" />
                <span className="px-2 py-1 bg-blue-500/10 text-blue-400 text-xs rounded border border-blue-500/20">
                  {tx.category}
                </span>
                <span className="text-xs text-slate-500">Confidence: {tx.confidence}%</span>
              </div>
            </motion.div>
          ))}
        </div>
      )
    },
    {
      title: 'Learning from Corrections',
      description: 'AI improves accuracy based on your feedback',
      component: (
        <div className="space-y-6">
          <div className="p-4 bg-amber-500/10 border border-amber-500/20 rounded-lg">
            <div className="flex items-start gap-3 mb-3">
              <div className="w-8 h-8 rounded-lg bg-amber-500 flex items-center justify-center flex-shrink-0">
                <Zap className="w-4 h-4 text-white" />
              </div>
              <div>
                <h4 className="text-amber-400 font-medium text-sm">Low Confidence Detected</h4>
                <p className="text-slate-300 text-xs mt-1">
                  "Stationers Inc" - AI suggests "Office Expenses" but only 65% confident
                </p>
              </div>
            </div>
            <div className="flex gap-2">
              <button className="flex-1 px-3 py-2 bg-green-500/20 hover:bg-green-500/30 text-green-400 text-sm rounded-lg border border-green-500/20 transition-colors">
                Correct Category
              </button>
              <button className="flex-1 px-3 py-2 bg-blue-500/20 hover:bg-blue-500/30 text-blue-400 text-sm rounded-lg border border-blue-500/20 transition-colors">
                Looks Good
              </button>
            </div>
          </div>

          <div className="p-4 bg-green-500/10 border border-green-500/20 rounded-lg">
            <div className="flex items-start gap-3">
              <CheckCircle2 className="w-5 h-5 text-green-400 flex-shrink-0 mt-0.5" />
              <div>
                <h4 className="text-green-400 font-medium text-sm mb-1">AI Learned!</h4>
                <p className="text-slate-300 text-xs">
                  Future transactions from "Stationers Inc" will be automatically categorized as "Office Expenses" with 98% confidence
                </p>
              </div>
            </div>
          </div>
        </div>
      )
    }
  ];

  // Insights Demo Steps
  const insightsSteps = [
    {
      title: 'Pattern Recognition',
      description: 'AI identifies spending patterns and anomalies',
      component: (
        <HeatMapChart
          data={SPECIALIZED_CHART_DATA.heatmap.data}
          xLabels={SPECIALIZED_CHART_DATA.heatmap.xLabels}
          yLabels={SPECIALIZED_CHART_DATA.heatmap.yLabels}
          title="Transaction Volume Heatmap"
          subtitle="Daily transaction patterns over 5 weeks"
        />
      )
    },
    {
      title: 'Profit Intelligence',
      description: 'Department and client profitability analysis',
      component: (
        <FlowDiagram
          flows={SPECIALIZED_CHART_DATA.flow}
          title="Revenue Allocation"
          subtitle="How your revenue flows to different cost centers"
        />
      )
    }
  ];

  // Forecast Demo Steps
  const forecastSteps = [
    {
      title: 'Sales Funnel Analysis',
      description: 'Track conversion rates through your sales process',
      component: (
        <FunnelChart
          stages={SPECIALIZED_CHART_DATA.funnel}
          title="Sales Funnel - Q1 2024"
          subtitle="From visitor to customer"
          showConversion
        />
      )
    },
    {
      title: 'Timeline Projections',
      description: 'Key events and milestones on your business timeline',
      component: (
        <TimelineChart
          events={SPECIALIZED_CHART_DATA.timeline}
          title="Recent Business Events"
          subtitle="Last 30 days activity"
        />
      )
    }
  ];

  const demoConfigs = {
    import: { steps: importSteps, title: 'Smart Statement Import', icon: Upload },
    categorization: { steps: categorizationSteps, title: 'AI Categorization', icon: Tag },
    insights: { steps: insightsSteps, title: 'Business Insights', icon: TrendingUp },
    forecast: { steps: forecastSteps, title: 'Analytics & Forecasting', icon: Sparkles }
  };

  const currentConfig = demoConfigs[activeDemo];
  const currentStep = currentConfig.steps[demoStep];

  const handleNext = () => {
    if (demoStep < currentConfig.steps.length - 1) {
      setDemoStep(demoStep + 1);
    }
  };

  const handlePrev = () => {
    if (demoStep > 0) {
      setDemoStep(demoStep - 1);
    }
  };

  const handleReset = () => {
    setDemoStep(0);
    setIsPlaying(false);
  };

  const handleDemoChange = (demo: typeof activeDemo) => {
    setActiveDemo(demo);
    setDemoStep(0);
    setIsPlaying(false);
  };

  return (
    <div className="min-h-screen bg-slate-950 p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-white mb-2">Interactive Feature Demos</h1>
        <p className="text-slate-400">Experience Finance OS capabilities in action</p>
      </div>

      {/* Demo Selector */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {Object.entries(demoConfigs).map(([key, config]) => {
          const Icon = config.icon;
          const isActive = activeDemo === key;
          
          return (
            <button
              key={key}
              onClick={() => handleDemoChange(key as typeof activeDemo)}
              className={`p-4 rounded-xl border-2 transition-all ${
                isActive
                  ? 'bg-blue-500/10 border-blue-500 shadow-lg shadow-blue-500/20'
                  : 'bg-slate-900 border-white/10 hover:border-white/30'
              }`}
            >
              <Icon className={`w-8 h-8 mb-3 ${isActive ? 'text-blue-400' : 'text-slate-400'}`} />
              <p className={`font-medium ${isActive ? 'text-white' : 'text-slate-400'}`}>
                {config.title}
              </p>
            </button>
          );
        })}
      </div>

      {/* Demo Stage */}
      <Card className="bg-slate-900 border-white/10">
        <CardContent className="p-8">
          {/* Progress Bar */}
          <div className="mb-8">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-white font-semibold text-xl">{currentConfig.title}</h2>
              <span className="text-slate-400 text-sm">
                Step {demoStep + 1} of {currentConfig.steps.length}
              </span>
            </div>
            <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
              <motion.div
                className="h-full bg-gradient-to-r from-blue-500 to-purple-500"
                initial={{ width: 0 }}
                animate={{ width: `${((demoStep + 1) / currentConfig.steps.length) * 100}%` }}
                transition={{ duration: 0.3 }}
              />
            </div>
          </div>

          {/* Step Content */}
          <AnimatePresence mode="wait">
            <motion.div
              key={`${activeDemo}-${demoStep}`}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
            >
              <div className="mb-6">
                <h3 className="text-white font-medium text-lg mb-2">{currentStep.title}</h3>
                <p className="text-slate-400 text-sm">{currentStep.description}</p>
              </div>

              <div className="min-h-[400px]">
                {currentStep.component}
              </div>
            </motion.div>
          </AnimatePresence>

          {/* Controls */}
          <div className="flex items-center justify-between mt-8 pt-6 border-t border-white/10">
            <Button
              onClick={handleReset}
              variant="outline"
              className="border-white/10 hover:bg-white/5 text-white"
            >
              <RotateCcw className="w-4 h-4 mr-2" />
              Reset
            </Button>

            <div className="flex items-center gap-3">
              <Button
                onClick={handlePrev}
                disabled={demoStep === 0}
                variant="outline"
                className="border-white/10 hover:bg-white/5 text-white disabled:opacity-50"
              >
                Previous
              </Button>

              {demoStep < currentConfig.steps.length - 1 ? (
                <Button
                  onClick={handleNext}
                  className="bg-blue-500 hover:bg-blue-600 text-white"
                >
                  Next
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              ) : (
                <Button
                  onClick={handleReset}
                  className="bg-green-500 hover:bg-green-600 text-white"
                >
                  <CheckCircle2 className="w-4 h-4 mr-2" />
                  Complete
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Feature Highlights */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="bg-slate-900 border-white/10">
          <CardContent className="p-6">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center mb-4">
              <Zap className="w-6 h-6 text-white" />
            </div>
            <h3 className="text-white font-medium mb-2">Fully Automated</h3>
            <p className="text-slate-400 text-sm">
              Import, categorize, and analyze transactions with minimal manual input
            </p>
          </CardContent>
        </Card>

        <Card className="bg-slate-900 border-white/10">
          <CardContent className="p-6">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center mb-4">
              <Sparkles className="w-6 h-6 text-white" />
            </div>
            <h3 className="text-white font-medium mb-2">AI-Powered</h3>
            <p className="text-slate-400 text-sm">
              Machine learning that improves accuracy with every transaction
            </p>
          </CardContent>
        </Card>

        <Card className="bg-slate-900 border-white/10">
          <CardContent className="p-6">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-green-500 to-emerald-500 flex items-center justify-center mb-4">
              <TrendingUp className="w-6 h-6 text-white" />
            </div>
            <h3 className="text-white font-medium mb-2">Actionable Insights</h3>
            <p className="text-slate-400 text-sm">
              Get real-time intelligence on profitability, cash flow, and trends
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
