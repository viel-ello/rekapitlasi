# Animation Patterns & Recipes for Framer Motion

This guide documents proven patterns for complex state transitions, scroll effects, and tab/drawer components.

---

## 1. Tab Indicator with `layoutId`

Creates an Apple-style sliding pill background across active tabs without manual calculation:

```tsx
"use client";

import { motion } from "framer-motion";
import { useState } from "react";

const tabs = ["Ringkasan", "Pokja I", "Pokja II", "Pokja III", "Pokja IV"];

export function TabSelector() {
  const [activeTab, setActiveTab] = useState(tabs[0]);

  return (
    <div className="flex gap-2 p-1.5 glass-panel rounded-2xl w-fit">
      {tabs.map((tab) => {
        const isActive = activeTab === tab;
        return (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`relative px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
              isActive ? "text-emerald-950 font-semibold" : "text-gray-600 hover:text-gray-900"
            }`}
          >
            {isActive && (
              <motion.div
                layoutId="activeTabBadge"
                transition={{ type: "spring", stiffness: 450, damping: 32 }}
                className="absolute inset-0 bg-white/70 shadow-sm border border-white/80 rounded-xl -z-10"
              />
            )}
            {tab}
          </button>
        );
      })}
    </div>
  );
}
```

---

## 2. Scroll-Triggered Reveal with `whileInView`

Fade and slide items into view once as the user scrolls down:

```tsx
<motion.div
  initial={{ opacity: 0, y: 28 }}
  whileInView={{ opacity: 1, y: 0 }}
  viewport={{ once: true, margin: "-60px" }}
  transition={{ type: "spring", stiffness: 300, damping: 25 }}
  className="glass-card p-6"
>
  <h3>Statistik Dusun</h3>
</motion.div>
```

---

## 3. Accordion / Collapse using `AnimatePresence` and `layout`

Smoothly animates height without jank:

```tsx
<motion.div layout className="glass-card rounded-2xl overflow-hidden mb-3">
  <button onClick={() => setIsExpanded(!isExpanded)} className="w-full flex justify-between p-4 font-medium">
    <span>{title}</span>
    <motion.span animate={{ rotate: isExpanded ? 180 : 0 }} transition={{ duration: 0.2 }}>
      ▼
    </motion.span>
  </button>
  <AnimatePresence initial={false}>
    {isExpanded && (
      <motion.div
        key="content"
        initial={{ opacity: 0, height: 0 }}
        animate={{ opacity: 1, height: "auto" }}
        exit={{ opacity: 0, height: 0 }}
        transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
        className="px-4 pb-4 text-sm text-gray-600"
      >
        {content}
      </motion.div>
    )}
  </AnimatePresence>
</motion.div>
```

---

## 4. Toast Notification Slide & Pop

```tsx
<AnimatePresence>
  {toasts.map((toast) => (
    <motion.div
      key={toast.id}
      initial={{ opacity: 0, y: -20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -10, scale: 0.95 }}
      transition={{ type: "spring", stiffness: 400, damping: 28 }}
      className="glass-strong px-4 py-3 rounded-xl shadow-lg border border-white/60 flex items-center gap-3"
    >
      <span>{toast.message}</span>
    </motion.div>
  ))}
</AnimatePresence>
```
