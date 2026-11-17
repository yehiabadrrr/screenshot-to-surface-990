# CenterOS — Phase 1: Full Clickable App (Design-Accurate, Realistic Demo Data)

The PRD is a large multi-release spec. Phase 1 builds every screen from the design brief as a polished, working web app with realistic Egyptian demo data, English + Arabic (RTL). Phase 2 (after approval of the look) connects Lovable Cloud for real logins, multi-center/branch data, the payment ledger and teacher payouts.

## Visual direction
- Palette from the brief: navy #142B4A, blue #2864A6, teal #19A7A0, off-white #F7F9FC, charcoal text, slate secondary, restrained red for negatives.
- Typography: IBM Plex Sans + IBM Plex Sans Arabic (professional, finance feel, strong Arabic support); tabular numbers for money.
- Light mode, 12px radius, subtle borders, Linear/Stripe-like density.

## Screens (each its own page)
1. Login — logo, email/password, remember me, forgot password, branded panel.
2. Overview (owner dashboard) — 6 KPI cards with month comparison + sparkline; charts: revenue vs collections, enrollment, attendance, revenue by class; recent transactions, overdue students, upcoming classes, top classes, quick actions.
3. Students — search, filters, table (ID, name, phone, classes, balance, attendance, status), add/import/export/edit.
4. Student profile — tabs: Overview, Enrollments, Attendance, Financial history, Guardian.
5. Classes & Courses — list with teacher, enrolled/capacity, schedule, branch; create/edit dialog; tutoring vs language course types.
6. Attendance — date + class picker, one-tap Present/Absent/Excused, "mark all present", counts and submit status.
7. Payments & Finance — 6 summary cards, transaction table, method filters (Cash, InstaPay, Fawry, Bank transfer, Other), prominent Record Payment dialog.
8. Teachers — profiles, classes, attendance, compensation model (monthly, per session, per attending student, % of tuition), payable and history.
9. Reports & Analytics — revenue, collections, outstanding, attendance, payouts, class performance, branch comparison; date range + export CSV.
10. Communications — overdue list, parent contacts, reminder/absence templates (AR/EN), WhatsApp send links.
11. Settings — organization, branches, users/roles, language.

## Shared shell
Collapsible left sidebar (logo, organization, branch selector, nav, user profile), top bar with search and EN/AR toggle that flips the whole layout to RTL. EGP formatting (e.g. "EGP 48,250" / "٤٨٬٢٥٠ ج.م"), Egyptian names and phone numbers.

## Technical details
- TanStack routes per screen; shadcn components; recharts for charts.
- Demo data in a typed local module (students, classes, teachers, transactions, attendance) with derived calculations (balances, payables) in pure functions, plus unit tests for payout formulas and balance math.
- Simple i18n dictionary + `dir` attribute on html; logical CSS properties (ms/me, ps/pe) for RTL.
- Login is visual only in Phase 1; Phase 2 adds Lovable Cloud auth, tenant/branch tables with access rules, and the ledger.
