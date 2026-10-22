# VisionOS Liquid Glass Framer Motion Presets

These presets are specifically tuned for the application's VisionOS Translucent Liquid Glass theme (`.glass`, `.glass-card`, `.glass-panel`, `.glass-ambient`).

---

## 1. Liquid Glass Card Hover & Tilt

```tsx
"use client";

import { motion } from "framer-motion";

export const liquidGlassCardVariants = {
  initial: {
    y: 0,
    boxShadow: "0 8px 32px 0 rgba(0, 0, 0, 0.06), inset 0 1.5px 2px 0 rgba(255, 255, 255, 0.88)",
  },
  hover: {
    y: -4,
    boxShadow: "0 16px 40px 0 rgba(0, 0, 0, 0.12), inset 0 2px 3px 0 rgba(255, 255, 255, 0.95)",
    transition: {
      type: "spring",
      stiffness: 350,
      damping: 24,
    },
  },
  tap: {
    scale: 0.985,
    y: -1,
    transition: {
      type: "spring",
      stiffness: 450,
      damping: 20,
    },
  },
};
```

---

## 2. Liquid Frosted Sheet / Drawer (Mobile & Desktop)

Slide up from bottom with spring bounce:

```tsx
export const drawerVariants = {
  hidden: { y: "100%", opacity: 0 },
  visible: {
    y: "0%",
    opacity: 1,
    transition: {
      type: "spring",
      damping: 30,
      stiffness: 300,
    },
  },
  exit: {
    y: "100%",
    opacity: 0,
    transition: {
      duration: 0.25,
      ease: [0.32, 0, 0.67, 0],
    },
  },
};
```

---

## 3. Ambient Light Pulse (Background Orbs)

For subtle continuous floating of ambient radial gradient orbs behind the glass surfaces:

```tsx
<motion.div
  animate={{
    x: [0, 20, -15, 0],
    y: [0, -25, 10, 0],
    scale: [1, 1.05, 0.98, 1],
  }}
  transition={{
    duration: 18,
    repeat: Infinity,
    ease: "easeInOut",
  }}
  className="absolute -top-24 -left-24 w-96 h-96 rounded-full bg-emerald-400/20 blur-3xl pointer-events-none"
/>
```
