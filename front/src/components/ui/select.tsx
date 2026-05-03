import { forwardRef, type SelectHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export const Select = forwardRef<
  HTMLSelectElement,
  SelectHTMLAttributes<HTMLSelectElement>
>(function Select({ className, children, ...props }, ref) {
  return (
    <select
      ref={ref}
      className={cn(
        "h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-900 focus:border-[#1a4d6e] focus:outline-none focus:ring-2 focus:ring-[#1a4d6e]/20 disabled:bg-slate-100",
        className,
      )}
      {...props}
    >
      {children}
    </select>
  );
});
