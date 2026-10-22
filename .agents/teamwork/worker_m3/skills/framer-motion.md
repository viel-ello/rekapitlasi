# Framer Motion (Motion for React) Skill Copy

Source: c:\Users\ipw26\OneDrive\Documents\rekapitlasi\.agent\skills\framer-motion\SKILL.md

Key patterns:
- "use client" on client components using motion.
- GPU acceleration: animate transform (x, y, scale) and opacity only.
- Springs: snappy { type: "spring", stiffness: 350-400, damping: 25-30 }.
- Accessibility: useReducedMotion() for reduced-motion users.
- Modal exit: AnimatePresence wrapping conditional {open && <motion.div ...>}.
- Liquid glass invariants: never animate backdropFilter directly in motion; keep in CSS.
