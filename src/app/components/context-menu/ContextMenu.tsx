import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Edit, 
  Trash2, 
  Copy, 
  Eye,
  Download,
  Share2,
  Archive,
  Tag,
  Star,
  MoreHorizontal,
  ChevronRight
} from 'lucide-react';

interface ContextMenuItem {
  id: string;
  label: string;
  icon: any;
  onClick: () => void;
  variant?: 'default' | 'destructive';
  shortcut?: string;
  disabled?: boolean;
  submenu?: ContextMenuItem[];
}

interface ContextMenuProps {
  items: ContextMenuItem[];
  children: React.ReactNode;
  disabled?: boolean;
}

export function ContextMenu({ items, children, disabled = false }: ContextMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [submenuOpen, setSubmenuOpen] = useState<string | null>(null);

  const handleContextMenu = (e: React.MouseEvent) => {
    if (disabled) return;
    
    e.preventDefault();
    e.stopPropagation();

    // Calculate position
    const x = e.clientX;
    const y = e.clientY;

    // Adjust if menu would go off screen
    const menuWidth = 240;
    const menuHeight = items.length * 40 + 16;
    const windowWidth = window.innerWidth;
    const windowHeight = window.innerHeight;

    const adjustedX = x + menuWidth > windowWidth ? x - menuWidth : x;
    const adjustedY = y + menuHeight > windowHeight ? y - menuHeight : y;

    setPosition({ x: adjustedX, y: adjustedY });
    setIsOpen(true);
  };

  const handleItemClick = (item: ContextMenuItem) => {
    if (item.disabled) return;
    
    if (item.submenu) {
      setSubmenuOpen(submenuOpen === item.id ? null : item.id);
    } else {
      item.onClick();
      setIsOpen(false);
      setSubmenuOpen(null);
    }
  };

  // Close on click outside
  useEffect(() => {
    const handleClickOutside = () => {
      setIsOpen(false);
      setSubmenuOpen(null);
    };

    if (isOpen) {
      document.addEventListener('click', handleClickOutside);
      return () => document.removeEventListener('click', handleClickOutside);
    }
  }, [isOpen]);

  // Close on Escape
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsOpen(false);
        setSubmenuOpen(null);
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      return () => document.removeEventListener('keydown', handleEscape);
    }
  }, [isOpen]);

  return (
    <div onContextMenu={handleContextMenu}>
      {children}

      <AnimatePresence>
        {isOpen && (
          <>
            {/* Backdrop */}
            <div className="fixed inset-0 z-[100]" />

            {/* Menu */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.1 }}
              style={{ left: position.x, top: position.y }}
              className="fixed z-[101] w-60 bg-slate-900 border border-white/10 rounded-lg shadow-2xl overflow-hidden backdrop-blur-xl"
            >
              <div className="py-2">
                {items.map((item, index) => (
                  <MenuItem
                    key={item.id}
                    item={item}
                    onClick={() => handleItemClick(item)}
                    isSubmenuOpen={submenuOpen === item.id}
                    showDivider={index < items.length - 1 && items[index + 1]?.variant === 'destructive'}
                  />
                ))}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}

function MenuItem({
  item,
  onClick,
  isSubmenuOpen,
  showDivider
}: {
  item: ContextMenuItem;
  onClick: () => void;
  isSubmenuOpen: boolean;
  showDivider?: boolean;
}) {
  const Icon = item.icon;
  const hasSubmenu = item.submenu && item.submenu.length > 0;

  return (
    <>
      <button
        onClick={onClick}
        disabled={item.disabled}
        className={`w-full flex items-center gap-3 px-3 py-2 transition-colors ${
          item.disabled
            ? 'opacity-50 cursor-not-allowed'
            : item.variant === 'destructive'
            ? 'hover:bg-red-500/10 text-red-400'
            : 'hover:bg-white/5 text-white'
        }`}
      >
        <Icon className="w-4 h-4 flex-shrink-0" />
        <span className="flex-1 text-left text-sm">{item.label}</span>
        {item.shortcut && !hasSubmenu && (
          <kbd className="px-1.5 py-0.5 bg-slate-800 border border-white/10 rounded text-xs text-slate-400">
            {item.shortcut}
          </kbd>
        )}
        {hasSubmenu && (
          <ChevronRight className="w-4 h-4 text-slate-500" />
        )}
      </button>

      {/* Submenu */}
      <AnimatePresence>
        {hasSubmenu && isSubmenuOpen && (
          <motion.div
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -10 }}
            className="pl-8 py-1"
          >
            {item.submenu!.map(subitem => {
              const SubIcon = subitem.icon;
              return (
                <button
                  key={subitem.id}
                  onClick={(e) => {
                    e.stopPropagation();
                    if (!subitem.disabled) {
                      subitem.onClick();
                    }
                  }}
                  disabled={subitem.disabled}
                  className={`w-full flex items-center gap-3 px-3 py-2 transition-colors ${
                    subitem.disabled
                      ? 'opacity-50 cursor-not-allowed'
                      : 'hover:bg-white/5 text-white'
                  }`}
                >
                  <SubIcon className="w-4 h-4 flex-shrink-0" />
                  <span className="flex-1 text-left text-sm">{subitem.label}</span>
                </button>
              );
            })}
          </motion.div>
        )}
      </AnimatePresence>

      {showDivider && <div className="my-1 border-t border-white/10" />}
    </>
  );
}

// Quick Actions Menu - Pre-built common actions
export function QuickActionsMenu({ 
  onEdit,
  onView,
  onDuplicate,
  onArchive,
  onExport,
  onShare,
  onDelete,
  customActions,
  children
}: {
  onEdit?: () => void;
  onView?: () => void;
  onDuplicate?: () => void;
  onArchive?: () => void;
  onExport?: () => void;
  onShare?: () => void;
  onDelete?: () => void;
  customActions?: ContextMenuItem[];
  children: React.ReactNode;
}) {
  const menuItems: ContextMenuItem[] = [];

  if (onView) {
    menuItems.push({
      id: 'view',
      label: 'View Details',
      icon: Eye,
      onClick: onView,
      shortcut: '↵'
    });
  }

  if (onEdit) {
    menuItems.push({
      id: 'edit',
      label: 'Edit',
      icon: Edit,
      onClick: onEdit,
      shortcut: 'E'
    });
  }

  if (onDuplicate) {
    menuItems.push({
      id: 'duplicate',
      label: 'Duplicate',
      icon: Copy,
      onClick: onDuplicate,
      shortcut: '⌘D'
    });
  }

  if (onShare) {
    menuItems.push({
      id: 'share',
      label: 'Share',
      icon: Share2,
      onClick: onShare
    });
  }

  if (onExport) {
    menuItems.push({
      id: 'export',
      label: 'Export',
      icon: Download,
      onClick: onExport,
      submenu: [
        {
          id: 'export-pdf',
          label: 'Export as PDF',
          icon: Download,
          onClick: () => {
            onExport();
            console.log('Export PDF');
          }
        },
        {
          id: 'export-csv',
          label: 'Export as CSV',
          icon: Download,
          onClick: () => {
            onExport();
            console.log('Export CSV');
          }
        },
        {
          id: 'export-excel',
          label: 'Export as Excel',
          icon: Download,
          onClick: () => {
            onExport();
            console.log('Export Excel');
          }
        }
      ]
    });
  }

  if (onArchive) {
    menuItems.push({
      id: 'archive',
      label: 'Archive',
      icon: Archive,
      onClick: onArchive
    });
  }

  // Add custom actions
  if (customActions) {
    menuItems.push(...customActions);
  }

  if (onDelete) {
    menuItems.push({
      id: 'delete',
      label: 'Delete',
      icon: Trash2,
      onClick: onDelete,
      variant: 'destructive',
      shortcut: '⌫'
    });
  }

  return (
    <ContextMenu items={menuItems}>
      {children}
    </ContextMenu>
  );
}
