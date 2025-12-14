// components/ui/Select.tsx
import { forwardRef } from "react";

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label: string;
  error?: string;
  options: { value: string; label: string }[];
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ label, error, options, ...props }, ref) => {
    return (
      <div className="space-y-1">
        <label className="block text-sm font-medium text-primary-900">
          {label}
        </label>
        <select
          ref={ref}
          className={`w-full px-4 py-3 rounded-xl border  ${
            error ? "border-red-500" : "border-primary-100"
          }
            focus:outline-none 
            focus:ring-2 
            focus:ring-primary-500
            focus:border-primary-500
            transition-all duration-200
            text-primary-900
            bg-white
            backdrop-blur-sm
            appearance-none
            `}
          {...props}
        >
          <option value="" disabled>
            -- اختر --
          </option>
          {options.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
        {error && <p className="text-sm text-red-600">{error}</p>}
      </div>
    );
  }
);

Select.displayName = "Select";
