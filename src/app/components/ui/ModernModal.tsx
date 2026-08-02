import * as React from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { XIcon } from "lucide-react";
import { cn } from "./utils";
import { motion, AnimatePresence } from "motion/react";

const ModernModal = DialogPrimitive.Root;

const ModernModalTrigger = DialogPrimitive.Trigger;

const ModernModalPortal = DialogPrimitive.Portal;

const ModernModalClose = DialogPrimitive.Close;

const ModernModalOverlay = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Overlay>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Overlay>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Overlay
    ref={ref}
    className={cn(
      "fixed inset-0 z-50 bg-black/80 backdrop-blur-md",
      "data-[state=open]:animate-in data-[state=closed]:animate-out",
      "data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
      className
    )}
    {...props}
  />
));
ModernModalOverlay.displayName = DialogPrimitive.Overlay.displayName;

const ModernModalContent = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Content>
>(({ className, children, ...props }, ref) => (
  <ModernModalPortal>
    <ModernModalOverlay />
    <DialogPrimitive.Content
      ref={ref}
      className={cn(
        "fixed top-[50%] left-[50%] z-50 grid w-full max-w-lg translate-x-[-50%] translate-y-[-50%] gap-6 p-6",
        "bg-slate-950/95 backdrop-blur-xl border border-cyan-500/30 rounded-xl shadow-2xl",
        "data-[state=open]:animate-in data-[state=closed]:animate-out",
        "data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
        "data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95",
        "data-[state=closed]:slide-out-to-left-1/2 data-[state=closed]:slide-out-to-top-[48%]",
        "data-[state=open]:slide-in-from-left-1/2 data-[state=open]:slide-in-from-top-[48%]",
        "duration-200",
        className
      )}
      {...props}
    >
      {/* Glowing border effect */}
      <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-cyan-500/20 via-blue-500/20 to-purple-500/20 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
      
      {children}
      
      <DialogPrimitive.Close className="absolute top-4 right-4 rounded-lg p-1.5 opacity-70 transition-all hover:opacity-100 hover:bg-slate-800/50 focus:outline-none focus:ring-2 focus:ring-cyan-500/50 disabled:pointer-events-none">
        <XIcon className="h-4 w-4 text-slate-400" />
        <span className="sr-only">Close</span>
      </DialogPrimitive.Close>
    </DialogPrimitive.Content>
  </ModernModalPortal>
));
ModernModalContent.displayName = DialogPrimitive.Content.displayName;

function ModernModalHeader({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      className={cn("flex flex-col gap-2 pb-4 border-b border-cyan-500/20", className)}
      {...props}
    />
  );
}

function ModernModalFooter({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      className={cn(
        "flex flex-col-reverse gap-2 pt-4 border-t border-cyan-500/20 sm:flex-row sm:justify-end sm:gap-3",
        className
      )}
      {...props}
    />
  );
}

const ModernModalTitle = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Title>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Title>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Title
    ref={ref}
    className={cn(
      "text-xl font-semibold text-white tracking-tight",
      className
    )}
    {...props}
  />
));
ModernModalTitle.displayName = DialogPrimitive.Title.displayName;

const ModernModalDescription = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Description>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Description>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Description
    ref={ref}
    className={cn("text-sm text-slate-400", className)}
    {...props}
  />
));
ModernModalDescription.displayName = DialogPrimitive.Description.displayName;

export {
  ModernModal,
  ModernModalClose,
  ModernModalContent,
  ModernModalDescription,
  ModernModalFooter,
  ModernModalHeader,
  ModernModalOverlay,
  ModernModalPortal,
  ModernModalTitle,
  ModernModalTrigger,
};
