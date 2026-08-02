import { useState } from 'react';
import { 
  ModernModal, 
  ModernModalContent, 
  ModernModalDescription, 
  ModernModalHeader, 
  ModernModalTitle,
  ModernModalFooter,
  ModernButton,
  ModernInput,
  ModernLabel,
  ModernSelect,
  ModernSelectContent,
  ModernSelectItem,
  ModernSelectTrigger,
  ModernSelectValue,
  ModernTextarea
} from './ui/modern';
import { Badge } from './ui/badge';
import { Sparkles, AlertCircle } from 'lucide-react';

interface QuickAddTransactionProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function QuickAddTransaction({ open, onOpenChange }: QuickAddTransactionProps) {
  const [narration, setNarration] = useState('');
  const [amount, setAmount] = useState('');
  const [suggestions, setSuggestions] = useState<{
    category: string;
    confidence: number;
    scope: string;
    type: string;
  }[]>([]);
  const [selectedCategory, setSelectedCategory] = useState('');
  const [showManual, setShowManual] = useState(false);

  const handleNarrationChange = (value: string) => {
    setNarration(value);
    
    // Mock AI-powered suggestions based on narration
    if (value.length > 10) {
      const mockSuggestions = [];
      
      if (value.toLowerCase().includes('salary')) {
        mockSuggestions.push({
          category: 'Salaries',
          confidence: 0.95,
          scope: 'business',
          type: 'expense'
        });
      } else if (value.toLowerCase().includes('client') || value.toLowerCase().includes('payment')) {
        mockSuggestions.push({
          category: 'Revenue',
          confidence: 0.92,
          scope: 'business',
          type: 'income'
        });
      } else if (value.toLowerCase().includes('aws') || value.toLowerCase().includes('software')) {
        mockSuggestions.push({
          category: 'Software & Tools',
          confidence: 0.88,
          scope: 'business',
          type: 'expense'
        });
      } else {
        mockSuggestions.push(
          {
            category: 'Office Expenses',
            confidence: 0.65,
            scope: 'business',
            type: 'expense'
          },
          {
            category: 'Miscellaneous',
            confidence: 0.45,
            scope: 'business',
            type: 'expense'
          }
        );
      }
      
      setSuggestions(mockSuggestions);
    } else {
      setSuggestions([]);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Mock submit - would call API in real app
    console.log('Transaction added:', { narration, amount, selectedCategory });
    onOpenChange(false);
    // Reset form
    setNarration('');
    setAmount('');
    setSuggestions([]);
    setSelectedCategory('');
  };

  return (
    <ModernModal open={open} onOpenChange={onOpenChange}>
      <ModernModalContent className="max-w-2xl">
        <ModernModalHeader>
          <ModernModalTitle className="flex items-center gap-2">
            <Sparkles className="size-5 text-blue-400" />
            Quick Add Transaction
          </ModernModalTitle>
          <ModernModalDescription>
            Just describe what happened. The system will learn and classify automatically.
          </ModernModalDescription>
        </ModernModalHeader>

        <form onSubmit={handleSubmit} className="space-y-6 mt-4">
          {/* Narration */}
          <div className="space-y-2">
            <ModernLabel htmlFor="narration">What happened?</ModernLabel>
            <ModernTextarea
              id="narration"
              placeholder="E.g., 'Paid designer salary for December' or 'Received payment from TechCorp for website project'"
              value={narration}
              onChange={(e) => handleNarrationChange(e.target.value)}
              rows={4}
              required
            />
            <p className="text-xs text-slate-500">Write naturally in your own words</p>
          </div>

          {/* Amount */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <ModernLabel htmlFor="amount">Amount</ModernLabel>
              <ModernInput
                id="amount"
                type="number"
                placeholder="0"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <ModernLabel htmlFor="currency">Currency</ModernLabel>
              <ModernSelect defaultValue="PKR">
                <ModernSelectTrigger>
                  <ModernSelectValue />
                </ModernSelectTrigger>
                <ModernSelectContent>
                  <ModernSelectItem value="PKR">PKR</ModernSelectItem>
                  <ModernSelectItem value="USD">USD</ModernSelectItem>
                  <ModernSelectItem value="AED">AED</ModernSelectItem>
                </ModernSelectContent>
              </ModernSelect>
            </div>
          </div>

          {/* AI Suggestions */}
          {suggestions.length > 0 && (
            <div className="p-4 bg-blue-950/30 rounded-lg border border-blue-500/30">
              <div className="flex items-center gap-2 mb-3">
                <Sparkles className="size-4 text-blue-400" />
                <h4 className="font-semibold text-white">AI Suggestions</h4>
              </div>
              <div className="space-y-2">
                {suggestions.map((suggestion, index) => (
                  <button
                    key={index}
                    type="button"
                    onClick={() => {
                      setSelectedCategory(suggestion.category);
                      setShowManual(false);
                    }}
                    className={`w-full p-3 rounded-lg border transition-colors text-left ${
                      selectedCategory === suggestion.category
                        ? 'bg-blue-600/30 border-blue-500'
                        : 'bg-slate-950/50 border-slate-700 hover:border-blue-500/50'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-semibold text-white">{suggestion.category}</p>
                        <p className="text-sm text-slate-400">
                          {suggestion.type} • {suggestion.scope}
                        </p>
                      </div>
                      <Badge 
                        variant="outline" 
                        className={`${
                          suggestion.confidence > 0.85 ? 'border-green-500 text-green-400' :
                          suggestion.confidence > 0.70 ? 'border-yellow-500 text-yellow-400' :
                          'border-orange-500 text-orange-400'
                        }`}
                      >
                        {(suggestion.confidence * 100).toFixed(0)}% confident
                      </Badge>
                    </div>
                  </button>
                ))}
              </div>

              {suggestions[0].confidence < 0.70 && (
                <div className="mt-3 flex items-start gap-2 text-xs text-yellow-400 bg-yellow-950/20 p-2 rounded">
                  <AlertCircle className="size-4 flex-shrink-0 mt-0.5" />
                  <span>Low confidence. The system will ask a few clarifying questions after submission.</span>
                </div>
              )}

              <ModernButton
                type="button"
                variant="ghost"
                size="sm"
                className="mt-3 text-slate-400 hover:text-white"
                onClick={() => setShowManual(!showManual)}
              >
                {showManual ? 'Use AI Suggestions' : 'Manually Select Category'}
              </ModernButton>
            </div>
          )}

          {/* Manual Category Selection */}
          {showManual && (
            <div className="space-y-2">
              <ModernLabel htmlFor="manual-category">Category (Manual)</ModernLabel>
              <ModernSelect value={selectedCategory} onValueChange={setSelectedCategory}>
                <ModernSelectTrigger>
                  <ModernSelectValue placeholder="Select category" />
                </ModernSelectTrigger>
                <ModernSelectContent>
                  <ModernSelectItem value="Revenue">Revenue</ModernSelectItem>
                  <ModernSelectItem value="Salaries">Salaries</ModernSelectItem>
                  <ModernSelectItem value="Software & Tools">Software & Tools</ModernSelectItem>
                  <ModernSelectItem value="Office Expenses">Office Expenses</ModernSelectItem>
                  <ModernSelectItem value="Marketing">Marketing</ModernSelectItem>
                  <ModernSelectItem value="Utilities">Utilities</ModernSelectItem>
                </ModernSelectContent>
              </ModernSelect>
            </div>
          )}

          {/* Account Selection */}
          <div className="space-y-2">
            <ModernLabel htmlFor="account">Account</ModernLabel>
            <ModernSelect defaultValue="acc-1">
              <ModernSelectTrigger>
                <ModernSelectValue />
              </ModernSelectTrigger>
              <ModernSelectContent>
                <ModernSelectItem value="acc-1">Business Account (PKR)</ModernSelectItem>
                <ModernSelectItem value="acc-2">USD Account</ModernSelectItem>
                <ModernSelectItem value="acc-3">Cash in Hand (PKR)</ModernSelectItem>
                <ModernSelectItem value="acc-4">Personal Account</ModernSelectItem>
              </ModernSelectContent>
            </ModernSelect>
          </div>

          {/* Actions */}
          <ModernModalFooter>
            <ModernButton
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </ModernButton>
            <ModernButton
              type="submit"
              disabled={!amount || !narration || (suggestions.length > 0 && !selectedCategory && !showManual)}
            >
              Add Transaction
            </ModernButton>
          </ModernModalFooter>
        </form>
      </ModernModalContent>
    </ModernModal>
  );
}
