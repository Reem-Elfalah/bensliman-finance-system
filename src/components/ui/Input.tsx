// components/ui/Input.tsx
import { forwardRef } from "react"

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string
  error?: string
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, ...props }, ref) => {
    return (
      <div className="space-y-1">
        <label className="block text-sm font-medium text-primary-900 text-right">
          {label}
        </label>
        <input
          ref={ref}
          className={`w-full px-4 py-3 rounded-xl border text-right
            ${error ? "border-red-500" : "border-primary-100"}
            focus:outline-none
            focus:ring-2 focus:ring-primary-500
            focus:border-primary-500
            bg-primary-50/70 backdrop-blur-sm
            transition-all duration-200`}
          {...props}
        />
        {error && <p className="text-sm text-red-600">{error}</p>}
      </div>
    )
  }
)

Input.displayName = "Input"
