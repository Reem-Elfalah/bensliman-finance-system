import React from "react";
import { motion, HTMLMotionProps } from "framer-motion";
import { LucideIcon } from "lucide-react";

interface ButtonProps extends Omit<HTMLMotionProps<"button">, "children"> {
  variant?: "primary" | "secondary" | "outline" | "ghost";
  size?: "sm" | "md" | "lg";
  icon?: LucideIcon;
  iconPosition?: "left" | "right";
  loading?: boolean;
  children: React.ReactNode;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      variant = "primary",
      size = "md",
      icon: Icon,
      iconPosition = "left",
      loading = false,
      children,
      className = "",
      disabled,
      ...props
    },
    ref
  ) => {
    const baseClasses =
      "inline-flex items-center justify-center font-medium rounded-xl transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed";

     const variants = {
      primary:
        "bg-primary-700 hover:bg-primary-800 text-white shadow-lg hover:shadow-xl focus:ring-primary-500",
      secondary:
        "bg-primary-100 hover:bg-primary-200 text-primary-700 shadow-md hover:shadow-lg focus:ring-primary-300",
      outline:
        "border-2 border-primary-700 text-primary-700 hover:bg-primary-50 focus:ring-primary-500",
      ghost:
        "text-primary-700 hover:text-primary-900 hover:bg-primary-50 focus:ring-primary-500",
    };

    const sizes = {
      sm: "px-3 py-1.5 text-sm gap-1.5",
      md: "px-4 py-2 text-base gap-2",
      lg: "px-6 py-3 text-lg gap-3",
    };

    return (
      <motion.button
        ref={ref} 
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        transition={{ type: "spring", stiffness: 400, damping: 17 }}
        className={`${baseClasses} ${variants[variant]} ${sizes[size]} ${className}`}
        disabled={disabled || loading}
        {...props}
      >
        {loading && (
          <motion.div
            className="rounded-full h-4 w-4 border-2 border-white border-t-transparent"
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
          />
        )}
        {Icon && iconPosition === "left" && !loading && (
          <Icon className="w-4 h-4" />
        )}
        {children}
        {Icon && iconPosition === "right" && !loading && (
          <Icon className="w-4 h-4" />
        )}
      </motion.button>
    );
  }
);

Button.displayName = "Button";
