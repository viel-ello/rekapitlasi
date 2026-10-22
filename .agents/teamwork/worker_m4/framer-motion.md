# Framer Motion (Motion for React) Skill Copy

## 1. Core Rules & Next.js 16 / React 19 Compatibility
- Always use `"use client"`
- Animate GPU properties: `transform` (`x`, `y`, `scale`, `rotate`, `scaleX`, `scaleY`) and `opacity`.
- Avoid animating layout properties directly (`width`, `height`, etc.).
- Spring physics: `{ type: "spring", stiffness: 400, damping: 30 }` or `{ type: "spring", stiffness: 450, damping: 30 }`.
- Respect `prefers-reduced-motion` via `useReducedMotion()`.

## 2. Animation Presets
- Micro-interactions: `whileHover={{ scale: 1.025, y: -1 }}`, `whileTap={{ scale: 0.97 }}`
- Modal/dropdown transitions with `AnimatePresence`.

## 3. Synergy with VisionOS Liquid Glass
- Never alter `backdrop-filter` inside motion state. Keep blur in CSS.
