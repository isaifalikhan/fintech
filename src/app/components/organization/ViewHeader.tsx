import { ArrowLeft, Home } from 'lucide-react';
import { Button } from '../ui/button';

interface ViewHeaderProps {
  title: string;
  description?: string;
  onBack?: () => void;
  showBackButton?: boolean;
  children?: React.ReactNode;
}

export function ViewHeader({ 
  title, 
  description, 
  onBack, 
  showBackButton = false,
  children 
}: ViewHeaderProps) {
  return (
    <div className="bg-slate-900 border-b border-slate-800 px-8 py-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          {showBackButton && (
            <Button
              variant="outline"
              size="sm"
              onClick={onBack}
              className="bg-slate-950 border-slate-700 text-slate-300 hover:text-white hover:bg-slate-800"
            >
              <ArrowLeft className="size-4 mr-2" />
              <span className="font-medium">Back</span>
            </Button>
          )}
          <div>
            <h1 className="text-2xl font-bold text-white">{title}</h1>
            {description && (
              <p className="text-slate-400 mt-1">{description}</p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          {children}
        </div>
      </div>
    </div>
  );
}
