import React from "react";
import { motion } from "framer-motion";

interface CardProps {
  children: React.ReactNode;
  className?: string;
  hover?: boolean;
  onClick?: () => void;
}

export function Card({
  children,
  className = "",
  hover = false,
  onClick,
}: CardProps) {
  return (
    <motion.div
      whileHover={hover ? { y: -2, scale: 1.01 } : {}}
      whileTap={onClick ? { scale: 0.98 } : {}}
      onClick={onClick}
      className={`
        bg-primary-50/80 backdrop-blur-sm rounded-xl sm:rounded-2xl shadow-lg border border-primary-100
        ${
          hover
            ? "hover:shadow-xl transition-all duration-300 cursor-pointer"
            : ""
        }
        ${onClick ? "cursor-pointer" : ""}
        ${className}
      `}
      style={{
        // Ensure proper touch targets on mobile
        WebkitTapHighlightColor: "transparent",
      }}
    >
      {children}
    </motion.div>
  );
}
