import { motion } from 'motion/react';
import { 
  Clock, 
  User, 
  Upload, 
  Edit, 
  Trash2, 
  DollarSign,
  Tag,
  FileText,
  Settings,
  UserPlus,
  Shield,
  Database,
  Download
} from 'lucide-react';
import { Card, CardContent } from '../ui/card';
import { Button } from '../ui/button';

export interface ActivityEvent {
  id: string;
  type: 'create' | 'update' | 'delete' | 'import' | 'export' | 'user' | 'system';
  action: string;
  description: string;
  user: {
    name: string;
    avatar?: string;
    role?: string;
  };
  timestamp: Date;
  metadata?: Record<string, any>;
  changes?: { field: string; from: string; to: string }[];
}

interface ActivityTimelineProps {
  events: ActivityEvent[];
  showFilters?: boolean;
  maxHeight?: string;
}

const EVENT_ICONS = {
  create: FileText,
  update: Edit,
  delete: Trash2,
  import: Upload,
  export: Download,
  user: UserPlus,
  system: Settings
};

const EVENT_COLORS = {
  create: 'from-green-500 to-emerald-500',
  update: 'from-blue-500 to-cyan-500',
  delete: 'from-red-500 to-pink-500',
  import: 'from-purple-500 to-indigo-500',
  export: 'from-amber-500 to-orange-500',
  user: 'from-cyan-500 to-blue-500',
  system: 'from-slate-500 to-slate-600'
};

export function ActivityTimeline({ 
  events, 
  showFilters = false,
  maxHeight = '600px'
}: ActivityTimelineProps) {
  const formatTimestamp = (date: Date) => {
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;
    
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric',
      year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined
    });
  };

  return (
    <Card className="bg-slate-900 border-white/10">
      <CardContent className="p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
              <Clock className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="text-white font-medium">Activity Timeline</h3>
              <p className="text-xs text-slate-400">Recent changes and events</p>
            </div>
          </div>
          {showFilters && (
            <Button
              size="sm"
              variant="outline"
              className="border-white/10 hover:bg-white/5 text-white"
            >
              Filters
            </Button>
          )}
        </div>

        {/* Timeline */}
        <div className="relative" style={{ maxHeight, overflowY: 'auto' }}>
          {/* Vertical line */}
          <div className="absolute left-6 top-0 bottom-0 w-px bg-white/10" />

          {/* Events */}
          <div className="space-y-6">
            {events.map((event, index) => (
              <ActivityItem
                key={event.id}
                event={event}
                isFirst={index === 0}
                formatTimestamp={formatTimestamp}
              />
            ))}
          </div>

          {/* Load More */}
          {events.length > 0 && (
            <div className="flex justify-center mt-6">
              <Button
                size="sm"
                variant="outline"
                className="border-white/10 hover:bg-white/5 text-white"
              >
                Load More
              </Button>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function ActivityItem({ 
  event, 
  isFirst,
  formatTimestamp 
}: { 
  event: ActivityEvent;
  isFirst: boolean;
  formatTimestamp: (date: Date) => string;
}) {
  const Icon = EVENT_ICONS[event.type];
  const colorClass = EVENT_COLORS[event.type];

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.3 }}
      className="relative pl-16"
    >
      {/* Icon */}
      <div className="absolute left-0 flex items-start gap-3">
        <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${colorClass} flex items-center justify-center relative z-10`}>
          <Icon className="w-6 h-6 text-white" />
        </div>
      </div>

      {/* Content */}
      <div className="bg-white/5 border border-white/10 rounded-lg p-4 hover:bg-white/10 transition-colors">
        {/* Header */}
        <div className="flex items-start justify-between mb-2">
          <div>
            <h4 className="text-white font-medium text-sm mb-1">{event.action}</h4>
            <p className="text-xs text-slate-400">{event.description}</p>
          </div>
          <span className="text-xs text-slate-500 whitespace-nowrap ml-4">
            {formatTimestamp(event.timestamp)}
          </span>
        </div>

        {/* Changes */}
        {event.changes && event.changes.length > 0 && (
          <div className="mt-3 pt-3 border-t border-white/10">
            <p className="text-xs text-slate-400 mb-2">Changes:</p>
            <div className="space-y-1">
              {event.changes.map((change, idx) => (
                <div key={idx} className="flex items-center gap-2 text-xs">
                  <span className="text-slate-400">{change.field}:</span>
                  <span className="text-red-400 line-through">{change.from}</span>
                  <span className="text-slate-600">→</span>
                  <span className="text-green-400">{change.to}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Metadata */}
        {event.metadata && Object.keys(event.metadata).length > 0 && (
          <div className="mt-3 pt-3 border-t border-white/10">
            <div className="flex flex-wrap gap-2">
              {Object.entries(event.metadata).map(([key, value]) => (
                <span
                  key={key}
                  className="text-xs px-2 py-1 bg-slate-800 rounded border border-white/10 text-slate-300"
                >
                  {key}: <span className="text-white">{value}</span>
                </span>
              ))}
            </div>
          </div>
        )}

        {/* User */}
        <div className="flex items-center gap-2 mt-3 pt-3 border-t border-white/10">
          <div className="w-6 h-6 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center">
            <span className="text-xs text-white font-medium">
              {event.user.name.charAt(0).toUpperCase()}
            </span>
          </div>
          <div className="text-xs">
            <span className="text-white">{event.user.name}</span>
            {event.user.role && (
              <span className="text-slate-400 ml-2">· {event.user.role}</span>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
}

// Sample data generator for testing
export const SAMPLE_ACTIVITIES: ActivityEvent[] = [
  {
    id: '1',
    type: 'import',
    action: 'Statement Imported',
    description: 'Imported 247 transactions from HBL Current Account',
    user: { name: 'Sarah Khan', role: 'Owner' },
    timestamp: new Date(Date.now() - 5 * 60000),
    metadata: {
      'Account': 'HBL Current',
      'Transactions': '247',
      'Date Range': 'Jan 1-31, 2024'
    }
  },
  {
    id: '2',
    type: 'update',
    action: 'Transaction Categorized',
    description: 'Updated category for AWS Invoice payment',
    user: { name: 'Ahmed Ali', role: 'Admin' },
    timestamp: new Date(Date.now() - 2 * 3600000),
    changes: [
      { field: 'Category', from: 'Uncategorized', to: 'Cloud Infrastructure' },
      { field: 'Department', from: 'None', to: 'Engineering' }
    ]
  },
  {
    id: '3',
    type: 'create',
    action: 'Budget Created',
    description: 'Created Q1 2024 budget for Marketing department',
    user: { name: 'Sarah Khan', role: 'Owner' },
    timestamp: new Date(Date.now() - 5 * 3600000),
    metadata: {
      'Department': 'Marketing',
      'Period': 'Q1 2024',
      'Amount': 'PKR 500,000'
    }
  },
  {
    id: '4',
    type: 'user',
    action: 'User Invited',
    description: 'Invited new team member to organization',
    user: { name: 'Sarah Khan', role: 'Owner' },
    timestamp: new Date(Date.now() - 24 * 3600000),
    metadata: {
      'Email': 'john@example.com',
      'Role': 'Viewer'
    }
  },
  {
    id: '5',
    type: 'system',
    action: 'AI Model Updated',
    description: 'Categorization AI model retrained with new data',
    user: { name: 'System', role: 'Automated' },
    timestamp: new Date(Date.now() - 48 * 3600000),
    metadata: {
      'Accuracy': '94.2%',
      'Training Data': '1,247 transactions'
    }
  },
  {
    id: '6',
    type: 'export',
    action: 'Report Exported',
    description: 'Exported Profit & Loss report for December 2023',
    user: { name: 'Ahmed Ali', role: 'Admin' },
    timestamp: new Date(Date.now() - 72 * 3600000),
    metadata: {
      'Format': 'PDF',
      'Period': 'Dec 2023'
    }
  }
];
