import * as React from "react";
import { cn } from "./utils";

interface ModernTextareaProps extends React.ComponentProps<"textarea"> {
  error?: string;
}

const ModernTextarea = React.forwardRef<HTMLTextAreaElement, ModernTextareaProps>(
  ({ className, error, ...props }, ref) => {
    return (
      <div className="w-full">
        <textarea
          ref={ref}
          className={cn(
            "flex min-h-[80px] w-full rounded-lg px-4 py-3 text-sm transition-all",
            "bg-slate-900/50 border border-slate-700/50 text-white placeholder:text-slate-500",
            "focus:outline-none focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500/50",
            "hover:border-slate-600/50",
            "disabled:cursor-not-allowed disabled:opacity-50",
            "resize-y",
            error && "border-red-500/50 focus:ring-red-500/50 focus:border-red-500/50",
            className
          )}
          {...props}
        />
        {error && (
          <p className="mt-1.5 text-xs text-red-400 font-mono">{error}</p>
        )}
      </div>
    );
  }
);
ModernTextarea.displayName = "ModernTextarea";

export { ModernTextarea };
