import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Keyboard, 
  X,
  Search,
  Plus,
  Upload,
  Command,
  ArrowUp,
  ArrowDown,
  Slash
} from 'lucide-react';
import { Card, CardContent } from '../ui/card';

interface Shortcut {
  keys: string[];
  description: string;
  category: string;
}

const SHORTCUTS: Shortcut[] = [
  // Navigation
  { keys: ['⌘', 'K'], description: 'Open command palette', category: 'Navigation' },
  { keys: ['?'], description: 'Show keyboard shortcuts', category: 'Navigation' },
  { keys: ['G', 'D'], description: 'Go to Dashboard', category: 'Navigation' },
  { keys: ['G', 'P'], description: 'Go to Profit Intelligence', category: 'Navigation' },
  { keys: ['G', 'C'], description: 'Go to Cash Flow Forecast', category: 'Navigation' },
  { keys: ['G', 'T'], description: 'Go to Transactions', category: 'Navigation' },
  { keys: ['ESC'], description: 'Close dialog/modal', category: 'Navigation' },
  
  // Actions
  { keys: ['N'], description: 'New transaction', category: 'Actions' },
  { keys: ['I'], description: 'Import statement', category: 'Actions' },
  { keys: ['E'], description: 'Export data', category: 'Actions' },
  { keys: ['/'], description: 'Focus search', category: 'Actions' },
  { keys: ['⌘', 'S'], description: 'Save current view', category: 'Actions' },
  
  // Selection & Movement
  { keys: ['↑', '↓'], description: 'Navigate items', category: 'Selection' },
  { keys: ['↵'], description: 'Select/confirm', category: 'Selection' },
  { keys: ['⌘', 'A'], description: 'Select all', category: 'Selection' },
  
  // Editing
  { keys: ['⌘', 'Z'], description: 'Undo', category: 'Editing' },
  { keys: ['⌘', '⇧', 'Z'], description: 'Redo', category: 'Editing' },
  { keys: ['⌘', 'C'], description: 'Copy', category: 'Editing' },
  { keys: ['⌘', 'V'], description: 'Paste', category: 'Editing' }
];

export function KeyboardShortcuts() {
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Show shortcuts with "?"
      if (e.key === '?' && !e.metaKey && !e.ctrlKey) {
        const target = e.target as HTMLElement;
        // Don't trigger if typing in an input
        if (target.tagName !== 'INPUT' && target.tagName !== 'TEXTAREA') {
          e.preventDefault();
          setIsOpen(true);
        }
      }
      
      // Close with Escape
      if (e.key === 'Escape' && isOpen) {
        setIsOpen(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  const categories = Array.from(new Set(SHORTCUTS.map(s => s.category)));

  return (
    <>
      {/* Trigger Button */}
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-500 rounded-full flex items-center justify-center shadow-lg hover:shadow-xl transition-shadow z-40"
        title="Keyboard Shortcuts (Press ?)"
      >
        <Keyboard className="w-5 h-5 text-white" />
      </button>

      {/* Shortcuts Modal */}
      <AnimatePresence>
        {isOpen && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-3xl"
            >
              <Card className="bg-slate-900 border-white/10">
                <CardContent className="p-0">
                  {/* Header */}
                  <div className="px-6 py-4 border-b border-white/10 bg-slate-950">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center">
                          <Keyboard className="w-5 h-5 text-white" />
                        </div>
                        <div>
                          <h2 className="text-xl font-bold text-white">Keyboard Shortcuts</h2>
                          <p className="text-sm text-slate-400">Boost your productivity</p>
                        </div>
                      </div>
                      <button
                        onClick={() => setIsOpen(false)}
                        className="text-slate-400 hover:text-white transition-colors"
                      >
                        <X className="w-5 h-5" />
                      </button>
                    </div>
                  </div>

                  {/* Shortcuts List */}
                  <div className="px-6 py-4 max-h-[600px] overflow-y-auto">
                    {categories.map(category => (
                      <div key={category} className="mb-6 last:mb-0">
                        <h3 className="text-sm font-medium text-slate-400 uppercase tracking-wider mb-3">
                          {category}
                        </h3>
                        <div className="space-y-2">
                          {SHORTCUTS.filter(s => s.category === category).map((shortcut, idx) => (
                            <motion.div
                              key={idx}
                              initial={{ opacity: 0, x: -20 }}
                              animate={{ opacity: 1, x: 0 }}
                              transition={{ delay: idx * 0.03 }}
                              className="flex items-center justify-between p-3 bg-white/5 rounded-lg hover:bg-white/10 transition-colors"
                            >
                              <span className="text-white">{shortcut.description}</span>
                              <div className="flex items-center gap-1">
                                {shortcut.keys.map((key, keyIdx) => (
                                  <div key={keyIdx} className="flex items-center gap-1">
                                    {keyIdx > 0 && (
                                      <span className="text-slate-600 text-xs">+</span>
                                    )}
                                    <kbd className="px-2 py-1 bg-slate-800 border border-white/10 rounded text-xs font-mono text-slate-300 min-w-[28px] text-center">
                                      {key}
                                    </kbd>
                                  </div>
                                ))}
                              </div>
                            </motion.div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Footer */}
                  <div className="px-6 py-4 border-t border-white/10 bg-slate-950">
                    <div className="flex items-center justify-between text-xs text-slate-400">
                      <div className="flex items-center gap-2">
                        <div className="flex items-center gap-1">
                          <kbd className="px-1.5 py-0.5 bg-slate-800 border border-white/10 rounded text-xs">⌘</kbd>
                          <span>Command (Mac)</span>
                        </div>
                        <span className="text-slate-600">|</span>
                        <div className="flex items-center gap-1">
                          <kbd className="px-1.5 py-0.5 bg-slate-800 border border-white/10 rounded text-xs">Ctrl</kbd>
                          <span>(Windows/Linux)</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        <span>Press</span>
                        <kbd className="px-1.5 py-0.5 bg-slate-800 border border-white/10 rounded text-xs">?</kbd>
                        <span>anytime to open</span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}
