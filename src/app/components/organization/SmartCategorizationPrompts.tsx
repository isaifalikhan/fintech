import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Progress } from '../ui/progress';
import { 
  Brain, 
  CheckCircle2, 
  XCircle, 
  HelpCircle,
  Sparkles,
  TrendingUp,
  Calendar,
  DollarSign,
  AlertCircle,
  ArrowRight,
  ThumbsUp,
  ThumbsDown,
  Zap
} from 'lucide-react';
import { toast } from 'sonner';
import { formatCurrency, formatDate } from '@/lib/formatters';
import { useTheme } from '../../../contexts/ThemeContext';
import { motion } from 'motion/react';

interface LowConfidenceTransaction {
  id: string;
  date: string;
  narration: string;
  amount: number;
  currency: string;
  type: 'income' | 'expense';
  currentCategory: string;
  confidence: number;
  suggestions: {
    category: string;
    scope: 'business' | 'personal';
    confidence: number;
    reasoning: string;
  }[];
  questions: {
    id: string;
    question: string;
    options: string[];
  }[];
  accountName: string;
}

const mockLowConfidenceTransactions: LowConfidenceTransaction[] = [
  {
    id: '1',
    date: '2025-01-15',
    narration: 'GRAB FOOD DELIVERY',
    amount: 850,
    currency: 'PKR',
    type: 'expense',
    currentCategory: 'Uncategorized',
    confidence: 45,
    suggestions: [
      {
        category: 'Meals & Entertainment',
        scope: 'business',
        confidence: 55,
        reasoning: 'Could be a business lunch or personal meal'
      },
      {
        category: 'Food & Dining',
        scope: 'personal',
        confidence: 45,
        reasoning: 'Common food delivery service'
      }
    ],
    questions: [
      {
        id: 'q1',
        question: 'Was this a business meal with a client/team?',
        options: ['Yes, business meeting', 'No, personal meal', 'Team lunch/dinner']
      }
    ],
    accountName: 'HBL Business Account'
  },
  {
    id: '2',
    date: '2025-01-14',
    narration: 'AMAZON WEB SERVICES',
    amount: 12500,
    currency: 'PKR',
    type: 'expense',
    currentCategory: 'Software & Tools',
    confidence: 65,
    suggestions: [
      {
        category: 'Software & Tools',
        scope: 'business',
        confidence: 85,
        reasoning: 'AWS is typically a business expense'
      },
      {
        category: 'Hosting & Infrastructure',
        scope: 'business',
        confidence: 80,
        reasoning: 'Cloud hosting service'
      }
    ],
    questions: [
      {
        id: 'q1',
        question: 'Which project is this AWS cost for?',
        options: ['Client Project A', 'Client Project B', 'Internal Infrastructure', 'Multiple Projects']
      }
    ],
    accountName: 'HBL Business Account'
  },
  {
    id: '3',
    date: '2025-01-13',
    narration: 'UBER TRIP',
    amount: 450,
    currency: 'PKR',
    type: 'expense',
    currentCategory: 'Uncategorized',
    confidence: 40,
    suggestions: [
      {
        category: 'Transportation',
        scope: 'business',
        confidence: 50,
        reasoning: 'Could be client visit or personal commute'
      },
      {
        category: 'Travel',
        scope: 'personal',
        confidence: 50,
        reasoning: 'Common ride-sharing service'
      }
    ],
    questions: [
      {
        id: 'q1',
        question: 'What was the purpose of this ride?',
        options: ['Client meeting', 'Office commute', 'Personal errand', 'Airport/Travel']
      }
    ],
    accountName: 'HBL Business Account'
  },
  {
    id: '4',
    date: '2025-01-12',
    narration: 'STARBUCKS COFFEE',
    amount: 650,
    currency: 'PKR',
    type: 'expense',
    currentCategory: 'Uncategorized',
    confidence: 38,
    suggestions: [
      {
        category: 'Meals & Entertainment',
        scope: 'business',
        confidence: 48,
        reasoning: 'Could be client meeting at cafe'
      },
      {
        category: 'Food & Dining',
        scope: 'personal',
        confidence: 52,
        reasoning: 'Personal coffee purchase'
      }
    ],
    questions: [
      {
        id: 'q1',
        question: 'Was this coffee with a client or team member?',
        options: ['Yes, business meeting', 'No, personal coffee', 'Working session with team']
      }
    ],
    accountName: 'HBL Business Account'
  }
];

export function SmartCategorizationPrompts() {
  const [transactions, setTransactions] = useState<LowConfidenceTransaction[]>(mockLowConfidenceTransactions);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [learnedCount, setLearnedCount] = useState(0);

  const currentTransaction = transactions[currentIndex];
  const progress = ((currentIndex / transactions.length) * 100);
  const remaining = transactions.length - currentIndex;

  const handleAnswer = (questionId: string, answer: string) => {
    setAnswers({ ...answers, [`${currentTransaction.id}_${questionId}`]: answer });
  };

  const handleConfirm = (suggestion: any) => {
    // Apply the suggestion and create a learning rule
    toast.success(`✓ Learned: "${currentTransaction.narration}" → ${suggestion.category} (${suggestion.scope})`);
    
    setLearnedCount(learnedCount + 1);
    moveToNext();
  };

  const handleSkip = () => {
    toast.info('Transaction skipped');
    moveToNext();
  };

  const handleReject = () => {
    toast.info('Suggestion rejected - will stay uncategorized');
    moveToNext();
  };

  const moveToNext = () => {
    if (currentIndex < transactions.length - 1) {
      setCurrentIndex(currentIndex + 1);
      setAnswers({});
    } else {
      toast.success(`🎉 All done! Learned ${learnedCount + 1} new patterns`);
      setTransactions([]);
    }
  };

  if (transactions.length === 0) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <div 
            className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center"
            style={{
              boxShadow: '0 10px 30px -10px rgba(59, 130, 246, 0.6)',
            }}
          >
            <Brain className="w-6 h-6 text-white" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-white">Smart Categorization</h2>
            <p className="text-slate-400 text-sm">Help the system learn from your transactions</p>
          </div>
        </div>

        <Card className="bg-slate-900 border-slate-800">
          <CardContent className="py-16 text-center">
            <div className="inline-flex items-center justify-center size-16 bg-green-500/20 rounded-full mb-4">
              <CheckCircle2 className="size-8 text-green-400" />
            </div>
            <h3 className="text-xl font-medium text-white mb-2">All Caught Up!</h3>
            <p className="text-slate-400 mb-6 max-w-md mx-auto">
              No transactions need your attention right now. The system has high confidence in all categorizations.
            </p>
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-blue-500/10 rounded-lg border border-blue-500/20">
              <Brain className="size-4 text-blue-400" />
              <span className="text-sm text-blue-400">{learnedCount} patterns learned today</span>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div 
            className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center"
            style={{
              boxShadow: '0 10px 30px -10px rgba(59, 130, 246, 0.6)',
            }}
          >
            <Brain className="w-6 h-6 text-white" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-white">Smart Categorization</h2>
            <p className="text-slate-400 text-sm">Help improve categorization accuracy</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/30">
            <Brain className="size-3 mr-1" />
            {learnedCount} learned
          </Badge>
          <Badge className="bg-amber-500/20 text-amber-400 border-amber-500/30">
            {remaining} remaining
          </Badge>
        </div>
      </div>

      {/* Progress */}
      <Card className="bg-slate-900 border-slate-800">
        <CardContent className="pt-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-slate-400">Overall Progress</span>
            <span className="text-sm text-white font-medium">
              {currentIndex + 1} of {transactions.length}
            </span>
          </div>
          <Progress value={progress} className="h-2" />
        </CardContent>
      </Card>

      {/* Current Transaction */}
      <Card className="bg-gradient-to-br from-blue-950/20 to-purple-950/20 border-blue-900/50">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-blue-500/20 rounded-lg">
                <HelpCircle className="size-6 text-blue-400" />
              </div>
              <div>
                <CardTitle className="text-white">Review Transaction</CardTitle>
                <CardDescription className="text-slate-400">
                  Low confidence: {currentTransaction.confidence}%
                </CardDescription>
              </div>
            </div>
            <Badge className="bg-amber-500/20 text-amber-400 border-amber-500/30">
              Needs Attention
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Transaction Details */}
          <div className="p-4 bg-slate-950 rounded-lg">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <div className="flex items-center gap-2 text-xs text-slate-400 mb-1">
                  <Calendar className="size-3" />
                  Date
                </div>
                <p className="text-white font-medium">{formatDate(currentTransaction.date)}</p>
              </div>
              <div className="col-span-2">
                <div className="flex items-center gap-2 text-xs text-slate-400 mb-1">
                  <Sparkles className="size-3" />
                  Description
                </div>
                <p className="text-white font-medium">{currentTransaction.narration}</p>
              </div>
              <div>
                <div className="flex items-center gap-2 text-xs text-slate-400 mb-1">
                  <DollarSign className="size-3" />
                  Amount
                </div>
                <p className={`font-bold ${currentTransaction.type === 'income' ? 'text-green-400' : 'text-red-400'}`}>
                  {currentTransaction.type === 'income' ? '+' : '-'}
                  {formatCurrency(currentTransaction.amount, currentTransaction.currency)}
                </p>
              </div>
            </div>
            <div className="mt-3 pt-3 border-t border-slate-800">
              <p className="text-xs text-slate-500">
                Account: {currentTransaction.accountName}
              </p>
            </div>
          </div>

          {/* Questions */}
          {currentTransaction.questions.map((question) => (
            <div key={question.id} className="space-y-3">
              <div className="flex items-start gap-2">
                <AlertCircle className="size-5 text-blue-400 flex-shrink-0 mt-0.5" />
                <h4 className="text-white font-medium">{question.question}</h4>
              </div>
              <div className="grid grid-cols-2 gap-2">
                {question.options.map((option) => (
                  <button
                    key={option}
                    onClick={() => handleAnswer(question.id, option)}
                    className={`p-3 rounded-lg border transition-all text-left ${
                      answers[`${currentTransaction.id}_${question.id}`] === option
                        ? 'bg-blue-500/20 border-blue-500/50 text-blue-300'
                        : 'bg-slate-950 border-slate-800 text-slate-300 hover:border-slate-700'
                    }`}
                  >
                    <div className="text-sm">{option}</div>
                  </button>
                ))}
              </div>
            </div>
          ))}

          {/* AI Suggestions */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Brain className="size-5 text-purple-400" />
              <h4 className="text-white font-medium">AI Suggestions</h4>
            </div>
            <div className="space-y-2">
              {currentTransaction.suggestions.map((suggestion, idx) => (
                <div
                  key={idx}
                  className="p-4 bg-slate-950 rounded-lg border border-slate-800 hover:border-slate-700 transition-colors"
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h5 className="text-white font-medium">{suggestion.category}</h5>
                        <Badge className={
                          suggestion.scope === 'business'
                            ? 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20'
                            : 'bg-purple-500/10 text-purple-400 border-purple-500/20'
                        }>
                          {suggestion.scope}
                        </Badge>
                      </div>
                      <p className="text-xs text-slate-400">{suggestion.reasoning}</p>
                    </div>
                    <div className="flex flex-col items-end gap-2">
                      <div className="flex items-center gap-1">
                        <TrendingUp className="size-3 text-green-400" />
                        <span className="text-xs text-green-400 font-medium">
                          {suggestion.confidence}% confident
                        </span>
                      </div>
                      <Button
                        size="sm"
                        onClick={() => handleConfirm(suggestion)}
                        className="bg-gradient-to-r from-green-600 to-emerald-600 h-8"
                      >
                        <CheckCircle2 className="size-3 mr-1" />
                        Use This
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-2 pt-4 border-t border-slate-800">
            <Button
              variant="outline"
              onClick={handleReject}
              className="flex-1 border-red-900/50 text-red-400 hover:bg-red-950/20"
            >
              <XCircle className="size-4 mr-2" />
              Reject All
            </Button>
            <Button
              variant="outline"
              onClick={handleSkip}
              className="flex-1 border-slate-700 hover:bg-slate-800"
            >
              Skip for Now
            </Button>
            <Button
              onClick={() => handleConfirm(currentTransaction.suggestions[0])}
              className="flex-1 bg-gradient-to-r from-blue-600 to-cyan-600"
              disabled={!answers[`${currentTransaction.id}_${currentTransaction.questions[0].id}`]}
            >
              Confirm & Learn
              <ArrowRight className="size-4 ml-2" />
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Learning Stats */}
      <div className="grid grid-cols-3 gap-4">
        <Card className="bg-slate-900 border-slate-800">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-500/20 rounded-lg">
                <CheckCircle2 className="size-5 text-green-400" />
              </div>
              <div>
                <div className="text-2xl font-bold text-white">{learnedCount}</div>
                <div className="text-xs text-slate-400">Patterns Learned</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-slate-900 border-slate-800">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-500/20 rounded-lg">
                <Brain className="size-5 text-blue-400" />
              </div>
              <div>
                <div className="text-2xl font-bold text-white">
                  {Math.round((learnedCount / (learnedCount + remaining)) * 100)}%
                </div>
                <div className="text-xs text-slate-400">Accuracy Improved</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-slate-900 border-slate-800">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-500/20 rounded-lg">
                <Zap className="size-5 text-purple-400" />
              </div>
              <div>
                <div className="text-2xl font-bold text-white">{remaining}</div>
                <div className="text-xs text-slate-400">To Review</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tips */}
      <Card className="bg-blue-950/20 border-blue-900/50">
        <CardContent className="pt-6">
          <div className="flex items-start gap-3">
            <Sparkles className="size-5 text-blue-400 flex-shrink-0 mt-0.5" />
            <div>
              <h4 className="text-sm font-medium text-blue-200 mb-1">Learning Tip</h4>
              <p className="text-xs text-blue-300/80">
                Every transaction you review helps the AI get smarter. After reviewing 10-20 transactions,
                the system will automatically categorize similar ones with high confidence!
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}