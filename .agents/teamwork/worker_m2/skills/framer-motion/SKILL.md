---
name: framer-motion
description: Expert guide and pattern library for Framer Motion (Motion for React) animations in Next.js 16 (App Router) and React 19. Covers declarative animations, variants, micro-interactions, gesture feedback, staggered entrance sequences, AnimatePresence, scroll effects, Liquid Glass synergies, and GPU performance best practices. Use whenever implementing or refining animations, transitions, modals, interactive cards, or motion states.
---

# Framer Motion (Motion for React) Skill

Comprehensive workflow, design patterns, and best practices for creating smooth, 60fps+ animations with Framer Motion in Next.js App Router and React 19.

---

## 1. Core Rules & Next.js 16 / React 19 Compatibility

### 1.1 Always Use `"use client"`
Framer Motion components hook into DOM events and browser animation APIs:
```tsx
"use client";

import { motion, AnimatePresence } from "framer-motion";
```

### 1.2 GPU Hardware Acceleration
To guarantee 60fps animations and prevent layout thrashing / reflow:
- ✅ **Animate GPU properties:** `transform` (`x`, `y`, `scale`, `rotate`, `scaleX`, `scaleY`) and `opacity`.
- ❌ **Avoid animating layout properties directly:** `width`, `height`, `top`, `left`, `margin`, `padding`. If layout resizing is needed, prefer `layout` or `layoutId`.

### 1.3 Spring vs Tween Physics
- **Springs** (`type: "spring"`): Best for UI interactions (buttons, gestures, dialogs, cards). Creates natural, physical responsiveness.
  - Snappy UI: `{ type: "spring", stiffness: 400, damping: 30 }`
  - Gentle / Fluid: `{ type: "spring", stiffness: 260, damping: 20 }`
  - Bouncy Micro-interaction: `{ type: "spring", stiffness: 500, damping: 15 }`
- **Tweens** (`type: "tween"`): Best for fades, progress bars, and timed sequences.
  - Standard Ease: `{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }` (custom ease-out)

### 1.4 Accessibility: Respect `prefers-reduced-motion`
Always verify if user prefers reduced motion:
```tsx
import { useReducedMotion } from "framer-motion";

export function AccessibleCard({ children }) {
  const shouldReduceMotion = useReducedMotion();

  return (
    <motion.div
      initial={{ opacity: 0, y: shouldReduceMotion ? 0 : 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      {children}
    </motion.div>
  );
}
```

---

## 2. Animation Presets & Design Patterns

### 2.1 Micro-Interactions (Hover, Tap, Focus)
Ideal for buttons, badges, table actions, and clickable tiles:
```tsx
<motion.button
  whileHover={{ scale: 1.025, y: -1 }}
  whileTap={{ scale: 0.97 }}
  transition={{ type: "spring", stiffness: 400, damping: 25 }}
  className="btn-primary"
>
  Simpan Data
</motion.button>
```

### 2.2 Staggered Container & Child Entrance
For dashboards, data cards, statistics rows, and list items:
```tsx
export const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.06,
      delayChildren: 0.05,
    },
  },
};

export const itemVariants = {
  hidden: { opacity: 0, y: 16 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { type: "spring", stiffness: 320, damping: 24 },
  },
};
```
