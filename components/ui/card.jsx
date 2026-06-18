'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';

/**
 * Card — primitive gaya shadcn/ui, disesuaikan untuk look SaaS modern:
 * sudut membulat lembut, border halus, shadow diffuse.
 * Varian `tone`:
 *  - 'default' : kartu putih (light surface)
 *  - 'dark'    : kartu hero gelap (teks terang)
 *  - 'emerald' : kartu aksen emerald lembut
 */
const Card = React.forwardRef(({ className, tone = 'default', ...props }, ref) => {
  const tones = {
    default: 'bg-white border border-gray-100 text-gray-900 shadow-card',
    dark: 'bg-primary-900 text-white border border-primary-700/40 shadow-card-hover',
    emerald: 'bg-primary-50 border border-primary-100 text-primary-900 shadow-card',
    glass: 'glass text-gray-900',
    'glass-dark': 'glass-dark text-white',
  };
  return (
    <div
      ref={ref}
      className={cn('rounded-3xl', tones[tone] || tones.default, className)}
      {...props}
    />
  );
});
Card.displayName = 'Card';

const CardHeader = React.forwardRef(({ className, ...props }, ref) => (
  <div ref={ref} className={cn('flex flex-col space-y-1.5 p-5', className)} {...props} />
));
CardHeader.displayName = 'CardHeader';

const CardTitle = React.forwardRef(({ className, ...props }, ref) => (
  <h3 ref={ref} className={cn('text-base font-semibold leading-tight tracking-tight', className)} {...props} />
));
CardTitle.displayName = 'CardTitle';

const CardDescription = React.forwardRef(({ className, ...props }, ref) => (
  <p ref={ref} className={cn('text-sm text-gray-500', className)} {...props} />
));
CardDescription.displayName = 'CardDescription';

const CardContent = React.forwardRef(({ className, ...props }, ref) => (
  <div ref={ref} className={cn('p-5 pt-0', className)} {...props} />
));
CardContent.displayName = 'CardContent';

const CardFooter = React.forwardRef(({ className, ...props }, ref) => (
  <div ref={ref} className={cn('flex items-center p-5 pt-0', className)} {...props} />
));
CardFooter.displayName = 'CardFooter';

export { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter };
