// src/components/ui/Dialog.tsx
import * as React from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import { VisuallyHidden } from "@radix-ui/react-visually-hidden";

export const Dialog = DialogPrimitive.Root;
export const DialogTrigger = DialogPrimitive.Trigger;

export const DialogContent = ({
  children,
  className,
  ...props
}: React.PropsWithChildren<React.ComponentProps<typeof DialogPrimitive.Content>>) => (
  <DialogPrimitive.Portal>
    <DialogPrimitive.Overlay className="fixed inset-0 bg-primary-900/60" />
    <DialogPrimitive.Content
      className={`fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2
                  bg-primary-50 p-8 rounded-xl shadow-xl
                  focus:outline-none focus:ring-2 focus:ring-primary-500
                  ${className || ""}`}
      {...props}
    >
      {children}
      <DialogPrimitive.Close className="absolute top-4 left-4 w-5 h-5">
        <X className="w-full h-full" />
      </DialogPrimitive.Close>
    </DialogPrimitive.Content>
  </DialogPrimitive.Portal>
);


export const DialogTitle = ({
  children,
  className,
  ...props
}: React.PropsWithChildren<React.ComponentProps<typeof DialogPrimitive.Title>>) => (
  <DialogPrimitive.Title
    className={`text-lg font-bold ${className || ""}`}
    {...props}
  >
    {children || <VisuallyHidden>Dialog</VisuallyHidden>}
  </DialogPrimitive.Title>
);

export const DialogClose = ({ className, ...props }: React.ComponentProps<typeof DialogPrimitive.Close>) => (
  <DialogPrimitive.Close
    className={`absolute left-4 top-4 w-5 h-5 text-gray-600 hover:text-gray-800 ${className || ""}`}
    {...props}
  >
    <X className="w-full h-full" />
  </DialogPrimitive.Close>
);

