import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Search, 
  X, 
  Clock, 
  TrendingUp,
  Sparkles,
  ArrowRight,
  Filter,
  Calendar,
  DollarSign,
  Tag,
  FileText
} from 'lucide-react';
import { Card, CardContent } from '../ui/card';

interface SearchResult {
  id: string;
  type: 'transaction' | 'client' | 'category' | 'report' | 'suggestion';
  title: string;
  description?: string;
  metadata?: Record<string, any>;
  icon?: any;
  action?: () => void;
}

interface SmartSearchProps {
  placeholder?: string;
  onSearch?: (query: string) => void;
  onResultSelect?: (result: SearchResult) => void;
  recentSearches?: string[];
  className?: string;
}

const QUICK_FILTERS = [
  { id: 'this-month', label: 'This Month', icon: Calendar },
  { id: 'uncategorized', label: 'Uncategorized', icon: Tag },
  { id: 'high-value', label: 'Over PKR 1000', icon: DollarSign },
  { id: 'recent', label: 'Last 7 days', icon: Clock }
];

const AI_SUGGESTIONS = [
  {
    id: 'profit-trend',
    type: 'suggestion' as const,
    title: 'Show profit trend for last quarter',
    description: 'AI-suggested insight',
    icon: TrendingUp
  },
  {
    id: 'top-expenses',
    type: 'suggestion' as const,
    title: 'What are my biggest expenses?',
    description: 'Common question',
    icon: Sparkles
  },
  {
    id: 'cash-forecast',
    type: 'suggestion' as const,
    title: 'Predict cash flow for next month',
    description: 'AI-powered forecast',
    icon: TrendingUp
  }
];

export function SmartSearch({
  placeholder = 'Search transactions, clients, categories...',
  onSearch,
  onResultSelect,
  recentSearches = [],
  className = ''
}: SmartSearchProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const searchRef = useRef<HTMLDivElement>(null);

  // Mock search function
  const performSearch = async (searchQuery: string) => {
    if (!searchQuery.trim()) {
      setResults([]);
      return;
    }

    setIsSearching(true);

    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 300));

    // Mock results
    const mockResults: SearchResult[] = [
      {
        id: '1',
        type: 'transaction',
        title: `AWS Invoice - PKR ${searchQuery.length * 100}`,
        description: 'Cloud Infrastructure · Jan 15, 2024',
        metadata: { amount: 'PKR 450', date: 'Jan 15' },
        icon: FileText
      },
      {
        id: '2',
        type: 'client',
        title: `ABC Corp - ${searchQuery}`,
        description: '12 active projects · PKR 2.5M revenue',
        metadata: { projects: 12, revenue: 'PKR 2.5M' },
        icon: FileText
      },
      {
        id: '3',
        type: 'category',
        title: `${searchQuery} expenses`,
        description: '47 transactions · PKR 125K total',
        metadata: { count: 47, total: 'PKR 125K' },
        icon: Tag
      }
    ];

    setResults(mockResults);
    setIsSearching(false);
  };

  const handleInputChange = (value: string) => {
    setQuery(value);
    performSearch(value);
  };

  const handleResultClick = (result: SearchResult) => {
    onResultSelect?.(result);
    setIsOpen(false);
    setQuery('');
  };

  const handleClear = () => {
    setQuery('');
    setResults([]);
    inputRef.current?.focus();
  };

  // Click outside to close
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Keyboard shortcut (/)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === '/' && !isOpen) {
        const target = e.target as HTMLElement;
        if (target.tagName !== 'INPUT' && target.tagName !== 'TEXTAREA') {
          e.preventDefault();
          setIsOpen(true);
          inputRef.current?.focus();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  return (
    <div ref={searchRef} className={`relative ${className}`}>
      {/* Search Input */}
      <div
        className={`relative ${isOpen ? 'z-50' : ''}`}
        onClick={() => setIsOpen(true)}
      >
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 pointer-events-none" />
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => handleInputChange(e.target.value)}
          onFocus={() => setIsOpen(true)}
          placeholder={placeholder}
          className="w-full pl-11 pr-20 py-2.5 bg-slate-800 border border-white/10 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all"
        />
        
        <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-2">
          {query && (
            <button
              onClick={handleClear}
              className="p-1 hover:bg-white/10 rounded transition-colors"
            >
              <X className="w-4 h-4 text-slate-400" />
            </button>
          )}
          <kbd className="px-2 py-1 bg-slate-700 border border-white/10 rounded text-xs text-slate-400">
            /
          </kbd>
        </div>
      </div>

      {/* Search Results Dropdown */}
      <AnimatePresence>
        {isOpen && (
          <>
            {/* Backdrop */}
            <div className="fixed inset-0 bg-black/20 backdrop-blur-sm z-40" />

            {/* Results Panel */}
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="absolute top-full mt-2 w-full z-50"
            >
              <Card className="bg-slate-900 border-white/10 shadow-2xl overflow-hidden">
                <CardContent className="p-0 max-h-[500px] overflow-y-auto">
                  {/* Quick Filters */}
                  {!query && (
                    <div className="p-3 border-b border-white/10">
                      <p className="text-xs text-slate-400 mb-2">Quick Filters</p>
                      <div className="flex flex-wrap gap-2">
                        {QUICK_FILTERS.map(filter => {
                          const Icon = filter.icon;
                          return (
                            <button
                              key={filter.id}
                              className="flex items-center gap-2 px-3 py-1.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-xs text-white transition-colors"
                            >
                              <Icon className="w-3 h-3" />
                              {filter.label}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Recent Searches */}
                  {!query && recentSearches.length > 0 && (
                    <div className="p-3 border-b border-white/10">
                      <p className="text-xs text-slate-400 mb-2">Recent Searches</p>
                      <div className="space-y-1">
                        {recentSearches.slice(0, 5).map((search, idx) => (
                          <button
                            key={idx}
                            onClick={() => handleInputChange(search)}
                            className="w-full flex items-center gap-3 px-3 py-2 hover:bg-white/5 rounded-lg text-sm text-slate-300 transition-colors text-left"
                          >
                            <Clock className="w-4 h-4 text-slate-500" />
                            {search}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* AI Suggestions */}
                  {!query && (
                    <div className="p-3 border-b border-white/10">
                      <div className="flex items-center gap-2 mb-2">
                        <Sparkles className="w-4 h-4 text-purple-400" />
                        <p className="text-xs text-slate-400">AI Suggestions</p>
                      </div>
                      <div className="space-y-1">
                        {AI_SUGGESTIONS.map(suggestion => {
                          const Icon = suggestion.icon;
                          return (
                            <button
                              key={suggestion.id}
                              onClick={() => handleResultClick(suggestion)}
                              className="w-full flex items-center gap-3 px-3 py-2 hover:bg-purple-500/10 border border-transparent hover:border-purple-500/20 rounded-lg transition-colors text-left group"
                            >
                              <div className="w-8 h-8 rounded-lg bg-purple-500/20 flex items-center justify-center flex-shrink-0">
                                <Icon className="w-4 h-4 text-purple-400" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-sm text-white truncate">{suggestion.title}</p>
                                <p className="text-xs text-slate-400">{suggestion.description}</p>
                              </div>
                              <ArrowRight className="w-4 h-4 text-slate-600 group-hover:text-purple-400 transition-colors" />
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Search Results */}
                  {query && (
                    <div className="p-3">
                      {isSearching ? (
                        <div className="flex items-center justify-center py-8">
                          <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                        </div>
                      ) : results.length > 0 ? (
                        <div className="space-y-1">
                          <p className="text-xs text-slate-400 mb-2">
                            {results.length} result{results.length !== 1 ? 's' : ''}
                          </p>
                          {results.map(result => {
                            const Icon = result.icon || FileText;
                            return (
                              <button
                                key={result.id}
                                onClick={() => handleResultClick(result)}
                                className="w-full flex items-center gap-3 px-3 py-2 hover:bg-white/5 rounded-lg transition-colors text-left group"
                              >
                                <div className="w-8 h-8 rounded-lg bg-blue-500/20 flex items-center justify-center flex-shrink-0">
                                  <Icon className="w-4 h-4 text-blue-400" />
                                </div>
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm text-white truncate">{result.title}</p>
                                  {result.description && (
                                    <p className="text-xs text-slate-400 truncate">{result.description}</p>
                                  )}
                                </div>
                                <ArrowRight className="w-4 h-4 text-slate-600 group-hover:text-white transition-colors" />
                              </button>
                            );
                          })}
                        </div>
                      ) : (
                        <div className="text-center py-8">
                          <Search className="w-12 h-12 text-slate-700 mx-auto mb-3" />
                          <p className="text-slate-400">No results found for "{query}"</p>
                          <p className="text-xs text-slate-500 mt-1">Try adjusting your search</p>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Footer Help */}
                  <div className="px-3 py-2 bg-slate-950 border-t border-white/10">
                    <div className="flex items-center justify-between text-xs text-slate-500">
                      <div className="flex items-center gap-3">
                        <span>Press <kbd className="px-1 py-0.5 bg-slate-800 rounded">↑↓</kbd> to navigate</span>
                        <span><kbd className="px-1 py-0.5 bg-slate-800 rounded">↵</kbd> to select</span>
                      </div>
                      <span><kbd className="px-1 py-0.5 bg-slate-800 rounded">ESC</kbd> to close</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
