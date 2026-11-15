# JavaScript Fluency System — Phase 6 Development Order

> Canonical detailed plan for **Phase 6 — Mobile Optimization & Ergonomics**.
> Active working record: [`CURRENT_STEP.md`](./CURRENT_STEP.md)
> Overall progress: [`PROJECT_TRACKER.md`](./PROJECT_TRACKER.md)
> Product/architecture: [`PROJECT_SPECIFICATION.md`](./PROJECT_SPECIFICATION.md) §§5.10, 12.5
> Phase 5 completed baseline: [`JavaScript_Fluency_System_Phase_5_Development_Order.md`](./JavaScript_Fluency_System_Phase_5_Development_Order.md)
>
> **Rule:** Complete and verify each step before moving to the next.

---

## 1. Phase 6 Objective

Transform the JavaScript Fluency System into a first-class mobile learning experience optimized for 5–10 minute daily commutes on small screens (down to 360px width) while maintaining complete visual clarity and feature parity on desktop:
1. **Design Tokens & Theme System:** Centralized CSS custom properties with automatic system preference detection (`prefers-color-scheme`) and a persistent 3-way toggle (System / Light / Dark) in the header navigation.
2. **Touch Target Ergonomics:** Guarantee all interactive elements (navigation links, question selection pills, radio answer choices, confidence pills, buttons, inputs) meet the WCAG 2.1 AAA / mobile ergonomics minimum of 44×44px interactive hit area.
3. **Commute Layout & Zero Horizontal Scroll:** Harden layouts across all screens down to 360px width. Guarantee zero horizontal page overflow, wrap metadata gracefully, and constrain `<pre><code>` blocks to self-contained scrollable boxes.
4. **One-Hand Usability Polish:** Enhance Today’s Revision and Dashboard flow so answering questions, reviewing explanations, and navigating sessions feels natural and thumb-friendly.

---

## 2. Execution Order

| Step | Scope | Status |
|---|---|---|
| **Step 0** | Plan Initialization & Working Record Setup (`CURRENT_STEP.md`, Tracker update) | ✅ Complete (2026-11-15) |
| **Step 1** | Centralized CSS Variables & Dark/Light Design Tokens (`src/styles/_tokens.scss`, `src/styles.scss`, component style tokenization) | ✅ Complete (2026-11-15) |
| **Step 2** | Theme Service & Header Theme Toggle Component (`ThemeService`, `AppShell` toggle, unit tests) | ✅ Complete (2026-11-15) |
| **Step 3** | Touch Target Hardening across All Screens (44×44px minimum hit area audit & fix) | ✅ Complete (2026-11-15) |
| **Step 4** | Commute Layout Hardening & Zero-Overflow Audit (360px+ viewport containment, code snippet scroll) | ✅ Complete (2026-11-15) |
| **Step 5** | Typography, Code Block & Contrast Polish | ✅ Complete (2026-11-15) |
| **Step 6** | Comprehensive Testing & Mobile Emulation Verification (unit tests, build, 360px emulation) | 🔄 In Progress |
| **Step 7** | Production Deployment & Documentation Closeout | ⬜ Not started |

---

## 3. Step Details & Verification

### Step 0: Plan Initialization & Working Record Setup
- Initialize `CURRENT_STEP.md` for Step 1.
- Update `PROJECT_TRACKER.md` Section 1 snapshot and Section 2 phase table to Phase 6 in progress.

### Step 1: Centralized CSS Variables & Dark/Light Design Tokens
- Create `src/styles/_tokens.scss` defining light tokens under `:root` and dark tokens under `[data-theme='dark']` and `@media (prefers-color-scheme: dark)`.
- Centralize tokens for: `--app-bg`, `--app-surface`, `--app-surface-subtle`, `--app-line`, `--app-ink`, `--app-muted`, `--app-focus`, `--status-green`, `--status-yellow`, `--status-red`, plus badges and feedback colors.
- Refactor `src/styles.scss`, `src/app/app.scss`, `src/styles/revision-today.scss`, `src/styles/dashboard.scss`, `src/styles/mistakes.scss`, and `src/styles/deep-dive.scss` to use centralized tokens instead of duplicated hardcoded hex values.
- Verification: `npm run build` passes; verify styles compile cleanly without missing variables.

### Step 2: Theme Service & Header Theme Toggle Component
- Create `src/app/core/theme/theme.service.ts` managing `'system' | 'light' | 'dark'`.
- Listen to `matchMedia('(prefers-color-scheme: dark)')` when in `'system'` mode; apply `data-theme` attribute on `document.documentElement`.
- Persist user selection to `localStorage` under key `js_fluency_theme`.
- Add theme toggle button to `AppShell` header with accessible labels and icons.
- Verification: `ThemeService` unit tests passing; toggle switches between system/light/dark seamlessly.

### Step 3: Touch Target Hardening across All Screens
- Ensure all interactive elements have minimum 44×44px hit areas:
  - Header nav links and Disconnect button.
  - Revision question navigation pills (`.revision__qbtn`).
  - MCQ and Confidence radio options (`.revision__option`).
  - Action buttons (`.revision__btn`, `.dashboard__refresh-btn`, etc.).
  - Mistake Log and Deep Dive queue list items and action buttons.
- Verification: Audit hit areas in Chrome DevTools inspector.

### Step 4: Commute Layout Hardening & Zero-Overflow Audit
- Constrain all pages for viewports from 360px to 1440px without horizontal page scroll.
- Ensure `<pre><code>` blocks wrap or scroll internally with `-webkit-overflow-scrolling: touch` and `max-width: 100%`.
- Stack actions vertically on small viewports (`max-width: 640px`) with full-width buttons.
- Verification: Viewport testing at 360px, 390px, 412px, and 768px in Chrome DevTools.

### Step 5: Typography, Code Block & Contrast Polish
- Audit color contrast for WCAG AA compliance (4.5:1 minimum) in both Light and Dark themes.
- Code blocks: syntax-friendly monospace font stack, appropriate padding, and readable dark surface.

### Step 6: Comprehensive Testing & Mobile Emulation Verification
- Run all unit test suites (`ng test`).
- Run production build (`npm run build`).
- Verify manual test checklist on mobile viewport emulation.

### Step 7: Production Deployment & Documentation Closeout
- Commit changes with descriptive commit message.
- Push to `master` and trigger Vercel deployment.
- Verify production deployment at `https://js-fluency-system.vercel.app` on mobile and desktop.
- Update `PROJECT_TRACKER.md` and `CURRENT_STEP.md`.

---

## 4. Phase 6 Exit Criteria Checklist

- [ ] Centralized token palette implemented with full Light and Dark theme support.
- [ ] Theme service supports System / Light / Dark modes and persists preference.
- [ ] Header theme toggle allows 1-click theme switching with accessible labels.
- [ ] All interactive elements meet 44×44px minimum touch targets.
- [ ] Zero horizontal page overflow on screens down to 360px width.
- [ ] Code snippet blocks scroll internally without blowing out page layout.
- [ ] All unit test suites pass (`ng test`).
- [ ] Production build succeeds cleanly (`npm run build`).
- [ ] Verified on production Vercel deployment across mobile and desktop.
- [ ] Tracker and development orders finalized.
