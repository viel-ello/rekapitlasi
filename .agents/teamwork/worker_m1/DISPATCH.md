# Dispatch Assignment: Milestone M1 - Navigation & Layout Morphing (R1)

## Exclusive File Ownership
- `components/Sidebar.js`
- `components/DashboardToolbar.jsx`
- `components/ui/FormProgressBar.jsx`
- `app/dashboard/admin/page.js`
- `app/dashboard/admin/tabs/ColumnsTab.jsx`
- `components/DensityToggle.jsx`

## Objective & Requirements
Implement 21st.dev style spring-physics sliding active indicator pills (`layoutId`) across navigation and tabs:

1. **`components/Sidebar.js`**:
   - Add `layoutId="sidebarActivePill"`.
   - When an item is active, render `<motion.div layoutId="sidebarActivePill" className="absolute inset-0 bg-gradient-to-b from-emerald-600/90 to-emerald-700/90 rounded-[14px] shadow-sm -z-10" transition={{ type: "spring", stiffness: 350, damping: 30 }} />`.
   - CRITICAL: Retain the `.nav-item-active` class and `.nav-item` class on the `<Link>` element to ensure `Sidebar.test.js` continues to pass 100%. Ensure parent `<Link>` has `relative` and text/icon spans have `relative z-10`.
2. **`components/DashboardToolbar.jsx`**:
   - Add `layoutId="dashboardFilterPill"` for filter tabs with spring transition. Ensure parent button has `relative` and content has `relative z-10`.
   - Retain all classes, role/aria attributes, and test-ids.
3. **`components/ui/FormProgressBar.jsx`**:
   - Add `layoutId="formProgressActivePill"` on current active step pill.
   - Animate progress bar fill width with `motion.div`.
4. **`app/dashboard/admin/page.js` & `app/dashboard/admin/tabs/ColumnsTab.jsx`**:
   - Add `layoutId="adminActiveTabIndicator"` for admin subpanel tabs.
   - Add `layoutId="columnsSubtabIndicator"` for column subtabs.
5. **`components/DensityToggle.jsx`**:
   - Add `layoutId="densityTogglePill"` for 2-state compact/comfortable switch.

## Mandatory Rules & Integrity
- DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A teamwork_preview_auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.
- Animate strictly on GPU properties (`transform`, `opacity`). Never animate `backdrop-filter` in motion props.
- Run `npm test` and `npm run build` to verify 100% pass and 0 errors.

## Deliverable
Write your report in `.agents/teamwork/worker_m1/handoff.md` and report back via send_message.

## 2026-10-22T11:50:44Z
[Message received from parent 0c22180d-d9b7-430b-85ce-270db2e50d88]
Assignment: Milestone M1: Navigation & Layout Morphing (R1).
Exclusive files:
- components/Sidebar.js
- components/DashboardToolbar.jsx
- components/ui/FormProgressBar.jsx
- app/dashboard/admin/page.js
- app/dashboard/admin/tabs/ColumnsTab.jsx
- components/DensityToggle.jsx

