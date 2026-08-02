import * as React from "react";
import { cn } from "./utils";

interface ModernInputProps extends React.ComponentProps<"input"> {
  icon?: React.ReactNode;
  error?: string;
}

const ModernInput = React.forwardRef<HTMLInputElement, ModernInputProps>(
  ({ className, type, icon, error, ...props }, ref) => {
    return (
      <div className="w-full">
        <div className="relative">
          {icon && (
            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">
              {icon}
            </div>
          )}
          <input
            type={type}
            ref={ref}
            className={cn(
              "flex h-11 w-full rounded-lg px-4 py-2 text-sm transition-all",
              "bg-slate-900/50 border border-slate-700/50 text-white placeholder:text-slate-500",
              "focus:outline-none focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500/50",
              "hover:border-slate-600/50",
              "disabled:cursor-not-allowed disabled:opacity-50",
              "file:border-0 file:bg-transparent file:text-sm file:font-medium",
              icon && "pl-10",
              error && "border-red-500/50 focus:ring-red-500/50 focus:border-red-500/50",
              className
            )}
            {...props}
          />
        </div>
        {error && (
          <p className="mt-1.5 text-xs text-red-400 font-mono">{error}</p>
        )}
      </div>
    );
  }
);
ModernInput.displayName = "ModernInput";

export { ModernInput };
