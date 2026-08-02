import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  X, 
  Trash2, 
  Tag, 
  Download, 
  Archive,
  CheckCircle2,
  Copy,
  Edit,
  MoreHorizontal,
  AlertCircle
} from 'lucide-react';
import { Button } from '../ui/button';

interface BulkActionsBarProps {
  selectedCount: number;
  totalCount: number;
  onClearSelection: () => void;
  onSelectAll?: () => void;
  onDelete?: () => void;
  onCategorize?: () => void;
  onExport?: () => void;
  onArchive?: () => void;
  onApprove?: () => void;
  onDuplicate?: () => void;
  customActions?: {
    label: string;
    icon: any;
    onClick: () => void;
    variant?: 'default' | 'destructive';
  }[];
}

export function BulkActionsBar({
  selectedCount,
  totalCount,
  onClearSelection,
  onSelectAll,
  onDelete,
  onCategorize,
  onExport,
  onArchive,
  onApprove,
  onDuplicate,
  customActions = []
}: BulkActionsBarProps) {
  const [showMoreActions, setShowMoreActions] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  if (selectedCount === 0) return null;

  const handleDelete = () => {
    if (showDeleteConfirm) {
      onDelete?.();
      setShowDeleteConfirm(false);
    } else {
      setShowDeleteConfirm(true);
      // Auto-hide confirmation after 3 seconds
      setTimeout(() => setShowDeleteConfirm(false), 3000);
    }
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ y: 100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 100, opacity: 0 }}
        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
        className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50"
      >
        <div className="bg-slate-900 border border-white/10 rounded-xl shadow-2xl px-4 py-3 backdrop-blur-xl">
          <div className="flex items-center gap-4">
            {/* Selection Info */}
            <div className="flex items-center gap-3 px-3 py-2 bg-blue-500/10 rounded-lg border border-blue-500/20">
              <CheckCircle2 className="w-5 h-5 text-blue-400" />
              <div className="text-sm">
                <span className="text-white font-medium">{selectedCount}</span>
                <span className="text-slate-400 ml-1">
                  {selectedCount === 1 ? 'item' : 'items'} selected
                </span>
              </div>
            </div>

            {/* Select All */}
            {onSelectAll && selectedCount < totalCount && (
              <Button
                size="sm"
                variant="outline"
                onClick={onSelectAll}
                className="border-white/10 hover:bg-white/5 text-white"
              >
                Select All ({totalCount})
              </Button>
            )}

            {/* Divider */}
            <div className="w-px h-8 bg-white/10" />

            {/* Primary Actions */}
            <div className="flex items-center gap-2">
              {onCategorize && (
                <ActionButton
                  icon={Tag}
                  label="Categorize"
                  onClick={onCategorize}
                />
              )}

              {onApprove && (
                <ActionButton
                  icon={CheckCircle2}
                  label="Approve"
                  onClick={onApprove}
                  variant="success"
                />
              )}

              {onExport && (
                <ActionButton
                  icon={Download}
                  label="Export"
                  onClick={onExport}
                />
              )}

              {onDuplicate && (
                <ActionButton
                  icon={Copy}
                  label="Duplicate"
                  onClick={onDuplicate}
                />
              )}

              {onArchive && (
                <ActionButton
                  icon={Archive}
                  label="Archive"
                  onClick={onArchive}
                />
              )}

              {/* Custom Actions */}
              {customActions.slice(0, 2).map((action, idx) => (
                <ActionButton
                  key={idx}
                  icon={action.icon}
                  label={action.label}
                  onClick={action.onClick}
                  variant={action.variant}
                />
              ))}

              {/* More Actions Menu */}
              {customActions.length > 2 && (
                <div className="relative">
                  <ActionButton
                    icon={MoreHorizontal}
                    label="More"
                    onClick={() => setShowMoreActions(!showMoreActions)}
                  />
                  
                  <AnimatePresence>
                    {showMoreActions && (
                      <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 10 }}
                        className="absolute bottom-full mb-2 right-0 w-48 bg-slate-900 border border-white/10 rounded-lg shadow-xl overflow-hidden"
                      >
                        {customActions.slice(2).map((action, idx) => {
                          const Icon = action.icon;
                          return (
                            <button
                              key={idx}
                              onClick={() => {
                                action.onClick();
                                setShowMoreActions(false);
                              }}
                              className="w-full flex items-center gap-3 px-4 py-2 hover:bg-white/5 text-white transition-colors"
                            >
                              <Icon className="w-4 h-4" />
                              <span className="text-sm">{action.label}</span>
                            </button>
                          );
                        })}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              )}
            </div>

            {/* Divider */}
            {onDelete && <div className="w-px h-8 bg-white/10" />}

            {/* Destructive Actions */}
            {onDelete && (
              <motion.div
                animate={showDeleteConfirm ? { scale: [1, 1.05, 1] } : {}}
              >
                <ActionButton
                  icon={showDeleteConfirm ? AlertCircle : Trash2}
                  label={showDeleteConfirm ? 'Confirm Delete?' : 'Delete'}
                  onClick={handleDelete}
                  variant="destructive"
                />
              </motion.div>
            )}

            {/* Close */}
            <button
              onClick={onClearSelection}
              className="p-2 hover:bg-white/5 rounded-lg transition-colors text-slate-400 hover:text-white"
              title="Clear selection (Esc)"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}

function ActionButton({
  icon: Icon,
  label,
  onClick,
  variant = 'default'
}: {
  icon: any;
  label: string;
  onClick: () => void;
  variant?: 'default' | 'success' | 'destructive';
}) {
  const variantClasses = {
    default: 'border-white/10 hover:bg-white/5 text-white',
    success: 'border-green-500/20 bg-green-500/10 hover:bg-green-500/20 text-green-400',
    destructive: 'border-red-500/20 bg-red-500/10 hover:bg-red-500/20 text-red-400'
  };

  return (
    <Button
      size="sm"
      variant="outline"
      onClick={onClick}
      className={variantClasses[variant]}
    >
      <Icon className="w-4 h-4 mr-2" />
      {label}
    </Button>
  );
}

// Checkbox component for multi-select
export function SelectCheckbox({
  checked,
  onChange,
  indeterminate = false
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
  indeterminate?: boolean;
}) {
  return (
    <div className="relative">
      <input
        type="checkbox"
        checked={checked}
        ref={(el) => {
          if (el) el.indeterminate = indeterminate;
        }}
        onChange={(e) => onChange(e.target.checked)}
        className="w-5 h-5 rounded border-2 border-white/20 bg-slate-800 checked:bg-blue-500 checked:border-blue-500 focus:ring-2 focus:ring-blue-500/50 cursor-pointer transition-all"
      />
      {checked && !indeterminate && (
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          className="absolute inset-0 flex items-center justify-center pointer-events-none"
        >
          <CheckCircle2 className="w-5 h-5 text-white" />
        </motion.div>
      )}
    </div>
  );
}
