# Comprehensive Project Review: Rekapitulasi

*Review generated using Gemini CLI Agent Skills: `project-analyzer`, `frontend-ui-designer`, `code-reviewer`, `expert-code-refactoring`, and `react-test-engineer`.*

## 1. Executive Summary & Architecture (Project Analyzer)
**Project Name:** Rekapitlasi
**Description:** A data collection and reporting dashboard application designed for PKK (Pemberdayaan Kesejahteraan Keluarga) at the village/sub-village level in Indonesia. It handles data for various working groups (Pokja 1-4), general data (Data Umum), pregnant women (Bumil), and Dasa Wisma (Dawis).
**Tech Stack:**
- **Framework:** Next.js 16 (App Router), React 19
- **Backend/DB:** Supabase (SQL migrations included), Custom JWT Auth (`jose`, `bcryptjs`)
- **Styling/UI:** Tailwind CSS, Flowbite React, Radix UI Primitives, Framer Motion
- **Integrations:** Google Generative AI (`@google/generative-ai`) for smart mutations/chat, file parsing/export (`docx`, `exceljs`, `pdfkit`)
- **Testing:** Jest, React Testing Library (RTL)

**Architecture Flow:** Client-side components in `components/` request data via Next.js Route Handlers (`app/api/*`). The API routes validate requests (`lib/requestValidation.js`), enforce rate limits (`lib/rate-limit.js`), and communicate with Supabase. 

---

## 2. Code Quality & Technical Debt (Code Reviewer & Expert Code Refactoring)

### 🚨 Identified Code Smells
- **God Components / Large Classes:** 
  - `AiChatBubble.js` (~39KB)
  - `NestedDataPage.js` (~40KB)
  - `BumilDataPage.js` (~32KB)
  - `PokjaDataPage.js` (~35KB)
  These files are doing too much: managing local state, making API calls, handling business logic (like AI streaming or nested data processing), and rendering complex UIs. This violates the **Single Responsibility Principle (SRP)**.

### 🛠 Refactoring Recommendations
1. **Extract Custom Hooks:** Move data fetching, AI streaming logic, and state management out of the UI components into custom hooks (e.g., `useAiChat()`, `useNestedData()`). This follows the *Principle of Least Privilege* and isolates business logic.
2. **Component Composition:** Break down `AiChatBubble.js` into smaller chunks: `<ChatHeader />`, `<ChatMessageList />`, and `<ChatInput />`. This will drastically reduce the cognitive load of the main file.
3. **AHA Programming:** For the various `*DataPage.js` components (Pokja 1-4, Bumil, Dawis), identify shared data-table and pagination logic and extract a unified `<DataTable />` component if not already done perfectly. Avoid duplicating table logic across all Pokja pages.
4. **Auth Mechanism:** The project uses manual JWT generation (`jose`) and bcrypt inside `lib/auth.js` alongside Supabase. Supabase has its own built-in robust Auth and RLS. Ensure this custom JWT implementation doesn't create security loopholes or sync issues with Supabase's native Row Level Security.

---

## 3. UI/UX Design Assessment (Frontend UI Designer)

### ✨ Highlights
- The use of **Radix UI** and **Tailwind CSS** indicates a modern, accessible foundation.
- Components like `DashboardToolbar.jsx`, `EmptyState.jsx`, and `TableSkeleton.jsx` show good UX practices (perceived performance and empty state handling).

### 🎨 Recommendations
1. **Visual Hierarchy & White Space:** For data-heavy pages like `PokjaDataPage`, ensure generous padding (`p-4` to `p-6`) and a subtle background contrast (e.g., `bg-slate-50` for the page, `bg-white` for the table cards) to reduce cognitive load (Bento Box grid style).
2. **Typography Scale:** Ensure data tables have readable line heights and font sizes (e.g., `text-sm text-slate-600` for table bodies, `text-sm font-semibold text-slate-900` for headers).
3. **Micro-interactions:** Add subtle hover states (`hover:bg-slate-50 transition-colors duration-200`) on table rows to help users track their reading position across wide data grids.
4. **Accessibility (A11y):** Ensure all interactive elements in custom components (like the AI Chat Bubble) are keyboard navigable and have `ring-2 ring-offset-2` focus states.

---

## 4. Testing Strategy (React Test Engineer)

### 🧪 Current State
The project has Jest and RTL configured (`jest.config.js`, `@testing-library/react`), with separate scripts for testing server and client components.

### 🎯 Engineering Guidelines for Improvement
1. **Behavior-Driven Tests:** For the heavy Data Pages, do not test component state directly. Instead, mock the API responses (using `vi.mock` or `jest.mock` on your `lib/api-handler.js` or `fetch`) and test that the tables render the correct rows.
2. **Use `@testing-library/user-event`:** Make sure all form submissions (like adding new Bumil or Pokja data) use `userEvent.setup()` instead of `fireEvent`. This accurately simulates real browser interactions (typing, clicking, blur).
3. **Accessibility Testing:** Install `jest-axe` (since you are using Jest) to automatically catch a11y violations in your forms and tables during unit testing.
4. **Mocking External Boundaries:** 
   - Mock `@google/generative-ai` in your test setup so your test suite doesn't hit live APIs.
   - Mock `pdfkit`, `exceljs`, and `docx` when testing the export endpoints to ensure tests run quickly and deterministically.

---

## Conclusion
The **Rekapitlasi** project has a solid modern stack and well-thought-out features for village data management. The primary focus moving forward should be **refactoring the massive God components** to improve maintainability and testability, coupled with implementing a strict, user-centric testing strategy using React Testing Library.

---

## 🤖 Prompt for Claude 3.5 Sonnet / Claude 4.8
*Copy and paste the prompt below into Claude to begin executing these refactoring recommendations.*

```markdown
Hello Claude, you are acting as an Expert Senior Software Engineer. I want you to help me refactor and improve my Next.js 16 (App Router) project based on the architectural review below.

Here is the context:
- Project: `rekapitlasi` (React 19, Tailwind CSS, Supabase, Radix UI)
- Goal: Systematically eliminate "God Components", improve UI/UX, and write solid React Testing Library tests.

Please execute the following roadmap step-by-step. Do not move to the next step until we have completed and verified the current one. 

**Phase 1: Refactoring God Components (SRP & Custom Hooks)**
Our most critical technical debt lies in massive UI components (`components/AiChatBubble.js`, `components/NestedDataPage.js`, `components/BumilDataPage.js`, `components/PokjaDataPage.js`).
1. Start with `components/AiChatBubble.js`. Read the file and extract its state management and API communication logic into a custom hook (e.g., `hooks/useAiChat.js`).
2. Then, break down the remaining UI of `AiChatBubble.js` into smaller, composed sub-components (e.g., `<ChatHeader />`, `<ChatMessageList />`, `<ChatInput />`).
3. Apply the same extraction pattern to `NestedDataPage.js`, moving data fetching logic into `hooks/useNestedData.js`.

**Phase 2: UI/UX & Accessibility Polish**
1. Review the data tables inside the `*DataPage.js` components. Add subtle background contrast (`bg-slate-50` for the page, `bg-white` for the table cards) and generous padding to reduce cognitive load.
2. Add hover states (`hover:bg-slate-50 transition-colors duration-200`) to all table rows.
3. Ensure all interactive elements, particularly the ones we just extracted from `AiChatBubble.js`, have proper keyboard navigation and focus states (`ring-2 ring-offset-2`).

**Phase 3: Testing Strategy Implementation**
1. We use Jest and React Testing Library. Pick ONE of our newly refactored components (e.g., `AiChatBubble.js` or the extracted `hooks/useAiChat.js`).
2. Write behavior-driven tests using `@testing-library/user-event` to simulate user interaction. 
3. Mock the external API boundaries (e.g., the fetch calls or `@google/generative-ai`) so the tests run deterministically without hitting live endpoints.

Please begin with **Phase 1, Step 1**. Read `components/AiChatBubble.js`, show me the proposed code for `hooks/useAiChat.js` and the refactored UI sub-components. Wait for my approval before modifying the files.
```