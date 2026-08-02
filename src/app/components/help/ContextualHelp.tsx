import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { HelpCircle, X, Book, Video, MessageCircle, ExternalLink } from 'lucide-react';
import { Card, CardContent } from '../ui/card';
import { Button } from '../ui/button';

interface HelpContent {
  title: string;
  description: string;
  steps?: string[];
  videoUrl?: string;
  docUrl?: string;
  relatedTopics?: string[];
}

interface ContextualHelpProps {
  topic: string;
  position?: 'top' | 'bottom' | 'left' | 'right';
  size?: 'sm' | 'md' | 'lg';
}

const HELP_CONTENT: Record<string, HelpContent> = {
  'profit-intelligence': {
    title: 'Understanding Profit Intelligence',
    description: 'Profit Intelligence analyzes your revenue, costs, and margins across departments, clients, and projects to help you identify your most profitable areas.',
    steps: [
      'Connect your bank accounts and import statements',
      'AI automatically categorizes transactions',
      'Review department allocations and overhead costs',
      'Analyze profit margins by client or project',
      'Use what-if scenarios to forecast changes'
    ],
    videoUrl: 'https://example.com/profit-intelligence-tutorial',
    docUrl: 'https://docs.example.com/profit-intelligence',
    relatedTopics: ['Cash Flow Forecast', 'Department Costing', 'Quote Profitability']
  },
  'cash-flow-forecast': {
    title: 'Cash Flow Forecasting',
    description: 'Predict your future cash position based on historical patterns, scheduled payments, and recurring transactions.',
    steps: [
      'Import at least 3 months of historical data',
      'Mark recurring income and expenses',
      'Add scheduled future payments',
      'Review the 90-day forecast',
      'Set alerts for low cash balance warnings'
    ],
    docUrl: 'https://docs.example.com/cash-flow',
    relatedTopics: ['Transaction Import', 'Recurring Transactions', 'Alert Settings']
  },
  'ai-categorization': {
    title: 'AI Auto-Categorization',
    description: 'Our AI learns from your categorization patterns and automatically classifies transactions with high accuracy.',
    steps: [
      'Review and correct AI suggestions initially',
      'AI learns from your corrections',
      'Confidence scores show AI certainty',
      'Low-confidence transactions ask for review',
      'Categories improve over time automatically'
    ],
    videoUrl: 'https://example.com/ai-categorization',
    docUrl: 'https://docs.example.com/ai-features',
    relatedTopics: ['Transaction Management', 'Category Setup', 'Training the AI']
  },
  'statement-import': {
    title: 'Import Bank Statements',
    description: 'Easily import transactions from CSV, Excel, or PDF bank statements with automatic column mapping.',
    steps: [
      'Click "Import Statement" button',
      'Drag & drop your file or browse',
      'Review the data preview',
      'Confirm AI-suggested column mapping',
      'Review and import transactions'
    ],
    docUrl: 'https://docs.example.com/import-statements',
    relatedTopics: ['Supported File Formats', 'Column Mapping', 'Duplicate Detection']
  },
  'multi-currency': {
    title: 'Multi-Currency Support',
    description: 'Track transactions in multiple currencies with automatic exchange rate updates and conversion.',
    steps: [
      'Set your base currency in Settings',
      'Add accounts in different currencies',
      'Import transactions - currency auto-detected',
      'View reports in base or original currency',
      'Exchange rates updated daily'
    ],
    docUrl: 'https://docs.example.com/multi-currency',
    relatedTopics: ['Currency Settings', 'Exchange Rates', 'Currency Conversion']
  }
};

export function ContextualHelp({ topic, position = 'right', size = 'md' }: ContextualHelpProps) {
  const [isOpen, setIsOpen] = useState(false);
  const content = HELP_CONTENT[topic];

  if (!content) return null;

  const sizeClasses = {
    sm: 'w-64',
    md: 'w-80',
    lg: 'w-96'
  };

  const positionClasses = {
    top: 'bottom-full mb-2',
    bottom: 'top-full mt-2',
    left: 'right-full mr-2',
    right: 'left-full ml-2'
  };

  return (
    <div className="relative inline-block">
      {/* Help Icon */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="text-slate-400 hover:text-blue-400 transition-colors"
        title="Get help"
      >
        <HelpCircle className="w-4 h-4" />
      </button>

      {/* Help Popup */}
      <AnimatePresence>
        {isOpen && (
          <>
            {/* Backdrop for mobile */}
            <div
              className="fixed inset-0 z-40 lg:hidden"
              onClick={() => setIsOpen(false)}
            />

            {/* Help Panel */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className={`absolute ${positionClasses[position]} ${sizeClasses[size]} z-50`}
            >
              <Card className="bg-slate-900 border-blue-500/20 shadow-2xl">
                <CardContent className="p-4">
                  {/* Header */}
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-start gap-2">
                      <div className="w-8 h-8 rounded-lg bg-blue-500/20 flex items-center justify-center flex-shrink-0">
                        <HelpCircle className="w-4 h-4 text-blue-400" />
                      </div>
                      <div>
                        <h4 className="text-white font-medium text-sm">{content.title}</h4>
                      </div>
                    </div>
                    <button
                      onClick={() => setIsOpen(false)}
                      className="text-slate-400 hover:text-white"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Description */}
                  <p className="text-sm text-slate-300 mb-3">{content.description}</p>

                  {/* Steps */}
                  {content.steps && content.steps.length > 0 && (
                    <div className="mb-3">
                      <p className="text-xs font-medium text-slate-400 mb-2">Quick Steps:</p>
                      <ol className="space-y-1.5">
                        {content.steps.map((step, idx) => (
                          <li key={idx} className="flex gap-2 text-xs text-slate-300">
                            <span className="w-5 h-5 rounded-full bg-blue-500/20 text-blue-400 flex items-center justify-center flex-shrink-0 text-[10px] font-medium">
                              {idx + 1}
                            </span>
                            <span className="flex-1">{step}</span>
                          </li>
                        ))}
                      </ol>
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex flex-col gap-2 pt-3 border-t border-white/10">
                    {content.videoUrl && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="w-full justify-start border-white/10 hover:bg-white/5 text-white"
                        onClick={() => window.open(content.videoUrl, '_blank')}
                      >
                        <Video className="w-3 h-3 mr-2" />
                        Watch Tutorial
                        <ExternalLink className="w-3 h-3 ml-auto" />
                      </Button>
                    )}
                    {content.docUrl && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="w-full justify-start border-white/10 hover:bg-white/5 text-white"
                        onClick={() => window.open(content.docUrl, '_blank')}
                      >
                        <Book className="w-3 h-3 mr-2" />
                        Read Documentation
                        <ExternalLink className="w-3 h-3 ml-auto" />
                      </Button>
                    )}
                    <Button
                      size="sm"
                      variant="outline"
                      className="w-full justify-start border-white/10 hover:bg-white/5 text-white"
                    >
                      <MessageCircle className="w-3 h-3 mr-2" />
                      Ask AI Assistant
                    </Button>
                  </div>

                  {/* Related Topics */}
                  {content.relatedTopics && content.relatedTopics.length > 0 && (
                    <div className="mt-3 pt-3 border-t border-white/10">
                      <p className="text-xs text-slate-400 mb-2">Related topics:</p>
                      <div className="flex flex-wrap gap-1">
                        {content.relatedTopics.map((topic, idx) => (
                          <span
                            key={idx}
                            className="text-xs px-2 py-1 bg-white/5 text-slate-300 rounded border border-white/10 hover:bg-white/10 cursor-pointer"
                          >
                            {topic}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}

// Interactive Tooltip Component
export function InteractiveTooltip({
  children,
  title,
  description,
  shortcut,
  position = 'top'
}: {
  children: React.ReactNode;
  title: string;
  description?: string;
  shortcut?: string;
  position?: 'top' | 'bottom' | 'left' | 'right';
}) {
  const [isVisible, setIsVisible] = useState(false);

  const positionClasses = {
    top: 'bottom-full mb-2 left-1/2 -translate-x-1/2',
    bottom: 'top-full mt-2 left-1/2 -translate-x-1/2',
    left: 'right-full mr-2 top-1/2 -translate-y-1/2',
    right: 'left-full ml-2 top-1/2 -translate-y-1/2'
  };

  return (
    <div
      className="relative inline-block"
      onMouseEnter={() => setIsVisible(true)}
      onMouseLeave={() => setIsVisible(false)}
    >
      {children}

      <AnimatePresence>
        {isVisible && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            transition={{ duration: 0.15 }}
            className={`absolute ${positionClasses[position]} z-50 pointer-events-none`}
          >
            <div className="bg-slate-950 border border-white/20 rounded-lg px-3 py-2 shadow-xl max-w-xs">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-white text-sm font-medium">{title}</p>
                  {description && (
                    <p className="text-slate-400 text-xs mt-1">{description}</p>
                  )}
                </div>
                {shortcut && (
                  <kbd className="px-1.5 py-0.5 bg-slate-800 border border-white/10 rounded text-xs text-slate-300 font-mono flex-shrink-0">
                    {shortcut}
                  </kbd>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
