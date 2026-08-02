import { useState } from 'react';
import { DndProvider, useDrag, useDrop } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { motion } from 'motion/react';
import { 
  GripVertical, 
  Settings, 
  Plus, 
  X,
  TrendingUp,
  DollarSign,
  Wallet,
  Calendar,
  PieChart,
  BarChart3,
  Activity,
  Target
} from 'lucide-react';
import { Button } from '../ui/button';
import { Card, CardContent } from '../ui/card';

interface Widget {
  id: string;
  type: string;
  title: string;
  icon: any;
  size: 'small' | 'medium' | 'large';
  position: number;
}

const AVAILABLE_WIDGETS = [
  { id: 'profit-overview', type: 'profit', title: 'Profit Overview', icon: TrendingUp, size: 'medium' as const },
  { id: 'cash-balance', type: 'cash', title: 'Cash Balance', icon: DollarSign, size: 'small' as const },
  { id: 'account-summary', type: 'accounts', title: 'Account Summary', icon: Wallet, size: 'small' as const },
  { id: 'upcoming-payments', type: 'calendar', title: 'Upcoming Payments', icon: Calendar, size: 'medium' as const },
  { id: 'expense-breakdown', type: 'chart', title: 'Expense Breakdown', icon: PieChart, size: 'large' as const },
  { id: 'revenue-chart', type: 'chart', title: 'Revenue Trend', icon: BarChart3, size: 'large' as const },
  { id: 'cash-flow', type: 'activity', title: 'Cash Flow Activity', icon: Activity, size: 'medium' as const },
  { id: 'budget-goals', type: 'goals', title: 'Budget Goals', icon: Target, size: 'small' as const }
];

export function CustomizableDashboard() {
  const [isEditMode, setIsEditMode] = useState(false);
  const [widgets, setWidgets] = useState<Widget[]>([
    { ...AVAILABLE_WIDGETS[0], position: 0 },
    { ...AVAILABLE_WIDGETS[1], position: 1 },
    { ...AVAILABLE_WIDGETS[2], position: 2 },
    { ...AVAILABLE_WIDGETS[3], position: 3 }
  ]);
  const [showWidgetLibrary, setShowWidgetLibrary] = useState(false);

  const moveWidget = (dragIndex: number, hoverIndex: number) => {
    const updatedWidgets = [...widgets];
    const [draggedWidget] = updatedWidgets.splice(dragIndex, 1);
    updatedWidgets.splice(hoverIndex, 0, draggedWidget);
    
    // Update positions
    const reindexed = updatedWidgets.map((w, idx) => ({ ...w, position: idx }));
    setWidgets(reindexed);
  };

  const addWidget = (widget: typeof AVAILABLE_WIDGETS[0]) => {
    const newWidget: Widget = {
      ...widget,
      id: `${widget.id}-${Date.now()}`,
      position: widgets.length
    };
    setWidgets([...widgets, newWidget]);
    setShowWidgetLibrary(false);
  };

  const removeWidget = (widgetId: string) => {
    setWidgets(widgets.filter(w => w.id !== widgetId));
  };

  const getSizeClass = (size: string) => {
    switch (size) {
      case 'small': return 'col-span-1';
      case 'medium': return 'col-span-2';
      case 'large': return 'col-span-3';
      default: return 'col-span-1';
    }
  };

  return (
    <DndProvider backend={HTML5Backend}>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-white">Dashboard</h2>
            <p className="text-slate-400">Customize your view</p>
          </div>
          <div className="flex gap-2">
            <Button
              variant={isEditMode ? 'default' : 'outline'}
              onClick={() => setIsEditMode(!isEditMode)}
              className={isEditMode 
                ? 'bg-gradient-to-r from-blue-500 to-cyan-500 text-white' 
                : 'border-white/10 hover:bg-white/5 text-white'
              }
            >
              <Settings className="w-4 h-4 mr-2" />
              {isEditMode ? 'Done Editing' : 'Customize'}
            </Button>
            {isEditMode && (
              <Button
                onClick={() => setShowWidgetLibrary(true)}
                className="bg-gradient-to-r from-green-500 to-emerald-500 text-white"
              >
                <Plus className="w-4 h-4 mr-2" />
                Add Widget
              </Button>
            )}
          </div>
        </div>

        {/* Edit Mode Banner */}
        {isEditMode && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4"
          >
            <p className="text-blue-200 text-sm">
              💡 <strong>Edit Mode:</strong> Drag and drop widgets to rearrange, or click the X to remove them
            </p>
          </motion.div>
        )}

        {/* Widgets Grid */}
        <div className="grid grid-cols-3 gap-4">
          {widgets.map((widget, index) => (
            <DraggableWidget
              key={widget.id}
              widget={widget}
              index={index}
              isEditMode={isEditMode}
              moveWidget={moveWidget}
              removeWidget={removeWidget}
              sizeClass={getSizeClass(widget.size)}
            />
          ))}
        </div>

        {/* Widget Library Modal */}
        {showWidgetLibrary && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="w-full max-w-3xl bg-slate-900 border border-white/10 rounded-xl p-6"
            >
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className="text-xl font-bold text-white">Widget Library</h3>
                  <p className="text-sm text-slate-400">Add widgets to your dashboard</p>
                </div>
                <button
                  onClick={() => setShowWidgetLibrary(false)}
                  className="text-slate-400 hover:text-white"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="grid grid-cols-2 gap-4">
                {AVAILABLE_WIDGETS.map(widget => {
                  const Icon = widget.icon;
                  const isAdded = widgets.some(w => w.type === widget.type && w.title === widget.title);
                  
                  return (
                    <button
                      key={widget.id}
                      onClick={() => !isAdded && addWidget(widget)}
                      disabled={isAdded}
                      className={`flex items-start gap-4 p-4 rounded-lg border transition-all ${
                        isAdded
                          ? 'bg-slate-800/50 border-white/5 opacity-50 cursor-not-allowed'
                          : 'bg-white/5 border-white/10 hover:bg-white/10 hover:border-white/20'
                      }`}
                    >
                      <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center flex-shrink-0">
                        <Icon className="w-6 h-6 text-white" />
                      </div>
                      <div className="flex-1 text-left">
                        <h4 className="text-white font-medium mb-1">{widget.title}</h4>
                        <p className="text-xs text-slate-400">Size: {widget.size}</p>
                        {isAdded && (
                          <span className="text-xs text-green-400 mt-1 inline-block">✓ Added</span>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            </motion.div>
          </div>
        )}
      </div>
    </DndProvider>
  );
}

// Draggable Widget Component
function DraggableWidget({
  widget,
  index,
  isEditMode,
  moveWidget,
  removeWidget,
  sizeClass
}: {
  widget: Widget;
  index: number;
  isEditMode: boolean;
  moveWidget: (dragIndex: number, hoverIndex: number) => void;
  removeWidget: (id: string) => void;
  sizeClass: string;
}) {
  const [{ isDragging }, drag, preview] = useDrag({
    type: 'WIDGET',
    item: { index },
    canDrag: isEditMode,
    collect: (monitor) => ({
      isDragging: monitor.isDragging()
    })
  });

  const [, drop] = useDrop({
    accept: 'WIDGET',
    hover: (item: { index: number }) => {
      if (item.index !== index) {
        moveWidget(item.index, index);
        item.index = index;
      }
    }
  });

  const Icon = widget.icon;

  return (
    <div
      ref={(node) => {
        if (isEditMode) {
          drag(drop(node));
        }
      }}
      className={`${sizeClass} ${isDragging ? 'opacity-50' : 'opacity-100'}`}
    >
      <Card className={`bg-slate-900 border-white/10 h-full ${isEditMode ? 'cursor-move' : ''}`}>
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              {isEditMode && (
                <GripVertical className="w-4 h-4 text-slate-600" />
              )}
              <Icon className="w-5 h-5 text-blue-400" />
              <h3 className="font-medium text-white">{widget.title}</h3>
            </div>
            {isEditMode && (
              <button
                onClick={() => removeWidget(widget.id)}
                className="text-slate-400 hover:text-red-400 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
          
          {/* Widget Content Placeholder */}
          <div className="space-y-3">
            <div className="h-24 bg-slate-800/50 rounded-lg flex items-center justify-center">
              <p className="text-slate-500 text-sm">Widget Content</p>
            </div>
            {widget.size === 'large' && (
              <div className="h-32 bg-slate-800/50 rounded-lg flex items-center justify-center">
                <p className="text-slate-500 text-sm">Chart Area</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
