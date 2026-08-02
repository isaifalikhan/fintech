import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router';
import { 
  Search, 
  TrendingUp, 
  DollarSign, 
  Upload, 
  Brain, 
  Calculator,
  FileText,
  Settings,
  Users,
  Briefcase,
  Building2,
  Zap,
  Waves,
  Target,
  BarChart3,
  PieChart,
  Layers,
  CreditCard,
  Wallet,
  Receipt,
  Plus,
  ChevronRight,
  Clock,
  Command
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface CommandItem {
  id: string;
  title: string;
  description?: string;
  icon: any;
  action: () => void;
  category: 'navigation' | 'actions' | 'recent' | 'search';
  keywords?: string[];
}

export function CommandPalette() {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const navigate = useNavigate();

  // Command items
  const commands: CommandItem[] = useMemo(() => [
    // Navigation
    {
      id: 'nav-dashboard',
      title: 'Dashboard',
      description: 'Overview of your finances',
      icon: BarChart3,
      category: 'navigation',
      keywords: ['home', 'overview', 'main'],
      action: () => {
        navigate('/dashboard');
        setIsOpen(false);
      }
    },
    {
      id: 'nav-profit',
      title: 'Profit Intelligence',
      description: 'Deep profit analysis',
      icon: TrendingUp,
      category: 'navigation',
      keywords: ['profit', 'intelligence', 'analysis', 'departments'],
      action: () => {
        navigate('/dashboard');
        setIsOpen(false);
        // TODO: Navigate to profit intelligence view
      }
    },
    {
      id: 'nav-cashflow',
      title: 'Cash Flow Forecast',
      description: 'Predict future cash position',
      icon: Waves,
      category: 'navigation',
      keywords: ['cash', 'flow', 'forecast', 'prediction'],
      action: () => {
        navigate('/dashboard');
        setIsOpen(false);
        // TODO: Navigate to cash flow view
      }
    },
    {
      id: 'nav-whatif',
      title: 'What-If Simulator',
      description: 'Model business scenarios',
      icon: Zap,
      category: 'navigation',
      keywords: ['what', 'if', 'simulator', 'scenarios', 'modeling'],
      action: () => {
        navigate('/dashboard');
        setIsOpen(false);
        // TODO: Navigate to what-if view
      }
    },
    {
      id: 'nav-transactions',
      title: 'Transaction Ledger',
      description: 'View all transactions',
      icon: Receipt,
      category: 'navigation',
      keywords: ['transactions', 'ledger', 'history'],
      action: () => {
        navigate('/dashboard');
        setIsOpen(false);
        // TODO: Navigate to transactions view
      }
    },
    {
      id: 'nav-accounts',
      title: 'Accounts & Wallets',
      description: 'Manage your accounts',
      icon: Wallet,
      category: 'navigation',
      keywords: ['accounts', 'wallets', 'banks'],
      action: () => {
        navigate('/dashboard');
        setIsOpen(false);
        // TODO: Navigate to accounts view
      }
    },
    {
      id: 'nav-import',
      title: 'Import Statements',
      description: 'Upload bank statements',
      icon: Upload,
      category: 'navigation',
      keywords: ['import', 'upload', 'statements', 'csv'],
      action: () => {
        navigate('/dashboard');
        setIsOpen(false);
        // TODO: Navigate to import view
      }
    },
    {
      id: 'nav-settings',
      title: 'Settings',
      description: 'Organization settings',
      icon: Settings,
      category: 'navigation',
      keywords: ['settings', 'preferences', 'config'],
      action: () => {
        navigate('/dashboard');
        setIsOpen(false);
        // TODO: Navigate to settings view
      }
    },
    // Quick Actions
    {
      id: 'action-add-transaction',
      title: 'Add Transaction',
      description: 'Record a new transaction',
      icon: Plus,
      category: 'actions',
      keywords: ['add', 'create', 'new', 'transaction'],
      action: () => {
        setIsOpen(false);
        // TODO: Open quick add modal
      }
    },
    {
      id: 'action-import',
      title: 'Import Statement',
      description: 'Upload a bank statement',
      icon: Upload,
      category: 'actions',
      keywords: ['import', 'upload', 'statement'],
      action: () => {
        setIsOpen(false);
        // TODO: Open import modal
      }
    },
    {
      id: 'action-categorize',
      title: 'Review Categorizations',
      description: 'Help AI learn categories',
      icon: Brain,
      category: 'actions',
      keywords: ['categorize', 'ai', 'learn', 'review'],
      action: () => {
        setIsOpen(false);
        // TODO: Navigate to categorization view
      }
    }
  ], [navigate]);

  // Filter commands based on search
  const filteredCommands = useMemo(() => {
    if (!search) return commands;
    
    const searchLower = search.toLowerCase();
    return commands.filter(cmd => 
      cmd.title.toLowerCase().includes(searchLower) ||
      cmd.description?.toLowerCase().includes(searchLower) ||
      cmd.keywords?.some(kw => kw.includes(searchLower))
    );
  }, [search, commands]);

  // Group commands by category
  const groupedCommands = useMemo(() => {
    const groups: Record<string, CommandItem[]> = {
      recent: [],
      navigation: [],
      actions: [],
      search: []
    };

    filteredCommands.forEach(cmd => {
      groups[cmd.category].push(cmd);
    });

    return groups;
  }, [filteredCommands]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Cmd+K or Ctrl+K to open
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setIsOpen(prev => !prev);
        setSearch('');
        setSelectedIndex(0);
      }

      // Escape to close
      if (e.key === 'Escape' && isOpen) {
        setIsOpen(false);
        setSearch('');
      }

      // Arrow navigation
      if (isOpen && filteredCommands.length > 0) {
        if (e.key === 'ArrowDown') {
          e.preventDefault();
          setSelectedIndex(prev => 
            prev < filteredCommands.length - 1 ? prev + 1 : prev
          );
        }
        if (e.key === 'ArrowUp') {
          e.preventDefault();
          setSelectedIndex(prev => prev > 0 ? prev - 1 : prev);
        }
        if (e.key === 'Enter') {
          e.preventDefault();
          filteredCommands[selectedIndex]?.action();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, filteredCommands, selectedIndex]);

  // Reset selected index when search changes
  useEffect(() => {
    setSelectedIndex(0);
  }, [search]);

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[100] flex items-start justify-center pt-[15vh] px-4"
      onClick={() => setIsOpen(false)}
    >
      <AnimatePresence>
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: -20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: -20 }}
          transition={{ duration: 0.15 }}
          className="w-full max-w-2xl"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Command Palette Container */}
          <div className="bg-slate-900 border border-white/10 rounded-xl shadow-2xl overflow-hidden">
            {/* Search Input */}
            <div className="flex items-center gap-3 px-4 py-4 border-b border-white/10">
              <Search className="w-5 h-5 text-slate-400" />
              <input
                type="text"
                placeholder="Search or type a command..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="flex-1 bg-transparent text-white placeholder-slate-400 outline-none text-lg"
                autoFocus
              />
              <div className="flex items-center gap-1 text-xs text-slate-500">
                <kbd className="px-2 py-1 bg-slate-800 rounded border border-white/10">ESC</kbd>
              </div>
            </div>

            {/* Results */}
            <div className="max-h-[60vh] overflow-y-auto">
              {filteredCommands.length === 0 ? (
                <div className="px-4 py-12 text-center">
                  <Search className="w-12 h-12 text-slate-600 mx-auto mb-3" />
                  <p className="text-slate-400">No results found</p>
                  <p className="text-xs text-slate-500 mt-1">Try a different search term</p>
                </div>
              ) : (
                <div className="py-2">
                  {/* Recent Commands */}
                  {groupedCommands.recent.length > 0 && (
                    <div className="mb-4">
                      <div className="px-4 py-2 flex items-center gap-2">
                        <Clock className="w-3 h-3 text-slate-500" />
                        <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Recent</p>
                      </div>
                      {groupedCommands.recent.map((cmd, idx) => (
                        <CommandItemComponent
                          key={cmd.id}
                          item={cmd}
                          isSelected={filteredCommands.indexOf(cmd) === selectedIndex}
                          onClick={() => cmd.action()}
                        />
                      ))}
                    </div>
                  )}

                  {/* Navigation */}
                  {groupedCommands.navigation.length > 0 && (
                    <div className="mb-4">
                      <div className="px-4 py-2">
                        <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Navigation</p>
                      </div>
                      {groupedCommands.navigation.map((cmd) => (
                        <CommandItemComponent
                          key={cmd.id}
                          item={cmd}
                          isSelected={filteredCommands.indexOf(cmd) === selectedIndex}
                          onClick={() => cmd.action()}
                        />
                      ))}
                    </div>
                  )}

                  {/* Actions */}
                  {groupedCommands.actions.length > 0 && (
                    <div className="mb-4">
                      <div className="px-4 py-2">
                        <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Actions</p>
                      </div>
                      {groupedCommands.actions.map((cmd) => (
                        <CommandItemComponent
                          key={cmd.id}
                          item={cmd}
                          isSelected={filteredCommands.indexOf(cmd) === selectedIndex}
                          onClick={() => cmd.action()}
                        />
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="px-4 py-3 border-t border-white/10 bg-slate-950 flex items-center justify-between">
              <div className="flex items-center gap-4 text-xs text-slate-500">
                <div className="flex items-center gap-1">
                  <kbd className="px-1.5 py-0.5 bg-slate-800 rounded border border-white/10">↑↓</kbd>
                  <span>Navigate</span>
                </div>
                <div className="flex items-center gap-1">
                  <kbd className="px-1.5 py-0.5 bg-slate-800 rounded border border-white/10">↵</kbd>
                  <span>Select</span>
                </div>
                <div className="flex items-center gap-1">
                  <kbd className="px-1.5 py-0.5 bg-slate-800 rounded border border-white/10">ESC</kbd>
                  <span>Close</span>
                </div>
              </div>
              <div className="flex items-center gap-1 text-xs text-slate-500">
                <Command className="w-3 h-3" />
                <span>+</span>
                <kbd className="px-1.5 py-0.5 bg-slate-800 rounded border border-white/10">K</kbd>
              </div>
            </div>
          </div>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

function CommandItemComponent({ 
  item, 
  isSelected, 
  onClick 
}: { 
  item: CommandItem; 
  isSelected: boolean; 
  onClick: () => void;
}) {
  const Icon = item.icon;

  return (
    <button
      className={`w-full flex items-center gap-3 px-4 py-3 transition-colors ${
        isSelected 
          ? 'bg-blue-500/10 text-blue-400 border-l-2 border-blue-500' 
          : 'text-slate-300 hover:bg-white/5 border-l-2 border-transparent'
      }`}
      onClick={onClick}
      onMouseEnter={(e) => {
        // Update selected index on hover
        const parent = e.currentTarget.parentElement;
        const index = Array.from(parent?.children || []).indexOf(e.currentTarget);
        if (index !== -1) {
          // setSelectedIndex would need to be passed as prop
        }
      }}
    >
      <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
        isSelected ? 'bg-blue-500/20' : 'bg-white/5'
      }`}>
        <Icon className="w-4 h-4" />
      </div>
      <div className="flex-1 text-left">
        <p className="font-medium">{item.title}</p>
        {item.description && (
          <p className="text-xs text-slate-500">{item.description}</p>
        )}
      </div>
      <ChevronRight className="w-4 h-4 text-slate-600" />
    </button>
  );
}
