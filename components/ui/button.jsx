'use client';

import * as React from 'react';
import { Slot } from '@radix-ui/react-slot';
import { cva } from 'class-variance-authority';
import { motion, useReducedMotion } from 'framer-motion';
import { cn } from '@/lib/utils';

/**
 * Button — gaya shadcn/ui dengan bentuk "pill" (rounded-full) mengikuti
 * referensi dashboard SaaS modern. Warna aksi tetap emerald.
 * Dilengkapi respons sentuhan pegas Framer Motion (whileTap={{ scale: 0.97 }}).
 */
const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-full text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 select-none cursor-pointer disabled:cursor-not-allowed',
  {
    variants: {
      variant: {
        default: 'bg-primary-600 text-white hover:bg-primary-700 active:bg-primary-700 shadow-sm',
        dark: 'bg-primary-900 text-white hover:bg-primary-800 shadow-sm',
        secondary: 'bg-white text-gray-700 border border-gray-200 hover:bg-gray-50 shadow-sm dark:bg-surface-dark dark:text-gray-200 dark:border-white/10 dark:hover:bg-surface-dark-elevated',
        outline: 'border border-primary-200 text-primary-700 hover:bg-primary-50 dark:border-primary-500/30 dark:text-primary-300 dark:hover:bg-primary-950/20',
        ghost: 'text-gray-600 hover:bg-gray-100 hover:text-gray-900 dark:text-gray-300 dark:hover:bg-white/10 dark:hover:text-white',
        danger: 'bg-red-600 text-white hover:bg-red-700 shadow-sm',
      },
      size: {
        default: 'h-10 px-5 py-2',
        sm: 'h-8 px-3.5 text-xs',
        lg: 'h-11 px-6',
        icon: 'h-10 w-10 rounded-full',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  }
);

const Button = React.forwardRef(
  (
    {
      className,
      variant,
      size,
      asChild = false,
      whileTap,
      whileHover,
      transition,
      disabled,
      ...props
    },
    ref
  ) => {
    const shouldReduceMotion = useReducedMotion();

    if (asChild) {
      return (
        <Slot
          ref={ref}
          className={cn(buttonVariants({ variant, size }), className)}
          {...props}
        />
      );
    }

    const defaultTap = disabled || shouldReduceMotion ? undefined : { scale: 0.97 };
    const defaultTransition = shouldReduceMotion
      ? { duration: 0.1 }
      : { type: 'spring', stiffness: 500, damping: 30 };

    return (
      <motion.button
        ref={ref}
        disabled={disabled}
        whileTap={whileTap !== undefined ? whileTap : defaultTap}
        whileHover={whileHover}
        transition={transition !== undefined ? transition : defaultTransition}
        className={cn(buttonVariants({ variant, size }), className)}
        {...props}
      />
    );
  }
);
Button.displayName = 'Button';

export { Button, buttonVariants };
