import { ChevronRight, Home } from 'lucide-react';
import { useNavigate } from 'react-router';
import { motion } from 'motion/react';

export interface BreadcrumbItem {
  label: string;
  href?: string;
  icon?: any;
}

interface BreadcrumbsProps {
  items: BreadcrumbItem[];
  showHome?: boolean;
}

export function Breadcrumbs({ items, showHome = true }: BreadcrumbsProps) {
  const navigate = useNavigate();

  const allItems = showHome 
    ? [{ label: 'Home', href: '/dashboard', icon: Home }, ...items]
    : items;

  return (
    <nav className="flex items-center gap-2 text-sm">
      {allItems.map((item, index) => {
        const isLast = index === allItems.length - 1;
        const Icon = item.icon;

        return (
          <motion.div
            key={index}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.05 }}
            className="flex items-center gap-2"
          >
            {index > 0 && (
              <ChevronRight className="w-4 h-4 text-slate-500" />
            )}
            
            {item.href && !isLast ? (
              <button
                onClick={() => navigate(item.href!)}
                className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors"
              >
                {Icon && <Icon className="w-4 h-4" />}
                <span>{item.label}</span>
              </button>
            ) : (
              <div className={`flex items-center gap-2 ${isLast ? 'text-white font-medium' : 'text-slate-400'}`}>
                {Icon && <Icon className="w-4 h-4" />}
                <span>{item.label}</span>
              </div>
            )}
          </motion.div>
        );
      })}
    </nav>
  );
}
