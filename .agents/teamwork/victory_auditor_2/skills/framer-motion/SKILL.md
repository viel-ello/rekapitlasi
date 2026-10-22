---
name: framer-motion
description: Local reference copy for victory auditor
---

# Framer Motion (Motion for React) Skill
Local reference copy dumped for victory audit verification.
Key rules:
1. "use client" for all Framer Motion components.
2. GPU hardware acceleration: animate transform (x, y, scale) and opacity. Never animate layout properties (width/height/top/left) or backdrop-filter in runtime animation frames.
3. Springs for UI interactions (stiffness 300-400, damping 25-30).
4. Accessibility: Respect prefers-reduced-motion using useReducedMotion() or MotionConfig.
5. AnimatePresence for clean mount/unmount exit transitions.
