# Personal Attendance Tracker

A clean, practical attendance tracking web app designed for university students. The application runs entirely client-side with persistent local storage in IndexedDB, requiring no accounts, cloud databases, or external services.

## Current Status: Motion-First UI Redesign (Inspired by Organimo)

This repository contains the complete, production-ready personal attendance tracker web app, featuring a refined, tactile motion design inspired by Organimo:

- **Organimo-Inspired Motion & Tactile System**:
  - Silky cubic-bezier easing (`cubic-bezier(0.16, 1, 0.3, 1)`) matching organic, tactile motion pacing.
  - Page entry transitions with subtle translations and opacity cross-fades that prevent flicker and layout shifts.
  - Custom scroll reveal system (`useScrollReveal`, `MotionReveal`) with one-time viewport observation and progressive enhancement.
  - Tactile card micro-interactions (`.tactile-card`, `.interactive-card`) providing subtle lift (`translateY(-1.5px)`), border glow, and shadow elevation on hover.
  - Tactile button feedback (`.tactile-button`) with subtle scale down (`scale-[0.98]`) on active clicks.
  - Smooth progress bar transitions (`duration-600`) visualizing attendance progress changes organically.
  - Global `prefers-reduced-motion` compliance: CSS and React hooks collapse motion to instant display while maintaining full visual state clarity.
- **Enhanced Student Dashboard**:
  - Active semester banner with academic year, term dates, and direct "Log Today's Attendance" CTA shortcut.
  - Mathematically sound weighted overall attendance percentage ($\frac{\sum A}{\sum H}$) across active semester subjects, avoiding unweighted averaging distortion.
  - Three-tier actionable subject status categorization:
    - **Below Target**: Highlights subjects in danger with current deficit, attendance counts, and exact consecutive classes needed to recover.
    - **Borderline**: Identifies subjects within 5% of the target threshold with safe-bunk cushions.
    - **Comfortably On Track**: Displays resilient subjects meeting or exceeding their target with calculated safe bunks.
  - Recent attendance activity stream showing the latest 3–5 records with status badges (Full, Partial, Absent), class counts, and session notes.
  - Embedded interactive Decision Tools: switchable Attendance Recovery Calculator and Safe Bunk Analyzer pre-populated with active semester metrics.
  - Graceful empty states for newly initialized semesters or semesters without subjects.
- **Backup & Recovery / Settings**:
  - Client-side JSON backup export generating timestamped file downloads (`attendance-backup-YYYY-MM-DD.json`).
  - Strict JSON schema v1 validation verifying payload structure, schema version, date order, and cross-entity referential integrity.
  - Import preview modal displaying counts for semesters, subjects, and daily records before committing changes.
  - Atomic IndexedDB restoration (`storage.importData`) ensuring consistent all-or-nothing rollback on failure.
  - Safe database reset with modal confirmation dialog to reset local state.
  - Configurable application preferences: default attendance target (0–100%) and heatmap week start day (Monday vs Sunday).
- **Yearly Attendance Heatmap**:
  - Signature GitHub-contribution-style calendar grid tracking attendance consistency throughout the entire year (53 weeks × 7 days).
  - Forest-green intensity palette with 4 proportional levels based on classes attended.
  - Granular day status classification: full attendance (100%), partial attendance, zero attendance (alert-styled), explicit no-class records, unrecorded dates, and locked future dates.
  - Zero-assumption policy: never infers that a class was held or missed merely because a date has no record.
  - Accessible hover and focus tooltips displaying formatted date, classes attended/held, and attendance percentage.
  - Day inspection modal (`DayDetailsModal`) presenting full subject breakdowns, counts, notes, and a 1-click shortcut to edit that day in the Daily Logger.
  - Multi-dimensional filters: toggle between All Semesters, specific active or archived semesters, and individual subjects.
  - Annual summary metrics: Total Classes Held, Total Attended, Missed, Annual Rate (%), Active Attendance Days, and Longest Attendance Streak.
  - Full keyboard accessibility and `prefers-reduced-motion` compliance.
- **Attendance History Log**:
  - Filterable, searchable historical record ledger with multi-level filtering by semester, subject, and date range.
  - Quick date presets: "All Time", "Last 7 Days", "Last 30 Days", "This Month".
  - Keyword search matching subject name, course code, and session notes.
  - Inline Quick Edit modal for rapid updates to classes held, attended, and notes.
  - Delete record action with accessible `ConfirmDialog` explaining atomic recalculation.
  - Single atomic IndexedDB batch updates (`saveAttendanceBatch`) ensuring that editing or deleting past records automatically recomputes subject attendance aggregates with zero drift.
  - Unified view switching between "Daily Entry" form and "Attendance Log" ledger.
- **Daily Attendance Tracking**:
  - Fast multi-subject logging session defaulting to the local device calendar date (`YYYY-MM-DD`), preventing UTC day-shift bugs.
  - 1-click "Present" (1/1) and "Absent" (0/1) buttons per subject, with multiple-classes stepper support (e.g. double periods, labs) and "No Class" handling.
  - Live projected attendance percentage and count changes before saving.
  - Past date selection and historical correction without duplicate records or double-counting.
  - Future date guard policy: future date navigation is permitted for calendar viewing, but logging is safely locked.
  - Strict tracking mode separation: Daily Attendance subjects derive totals dynamically and transactionally, while Manual Totals subjects are isolated to prevent double-counting.
  - Single atomic IndexedDB transaction (`saveAttendanceBatch`) synchronizing daily records and subject aggregate totals.
- **Semester Management**:
  - Full semester CRUD: creation with name, optional academic year, and date ranges (with date range ordering validation).
  - Explicit active semester selection with automatic detection and seamless switching.
  - Archiving completed semesters to preserve historical records without affecting the active semester's totals.
  - Isolated scoping: switching active semesters never cross-contaminates subjects or attendance records.
- **Subject Management**:
  - Dynamic subject CRUD: add subjects to the selected semester, edit name, course code, and target percentage (0% to 100%).
  - Configurable tracking mode: choose between daily attendance tracking and manual class totals.
  - Per-semester unique name and code validation: prevents duplicates within the same term while allowing course names to recur across different semesters.
  - Real-time subject cards displaying attendance progress, eligibility status, safe bunks available, or recovery classes needed.
  - Accessible deletion confirmation with modal dialogs explaining record removal consequences.
- **Dashboard Overview**:
  - Weighted overall attendance calculation across all subjects in the active semester.
  - Quick "Log Attendance" action navigating straight to today's entry form.
  - Subject status overview (number of subjects meeting targets vs needing attention).
  - Integrated attendance recovery and safe-bunk analysis tools.
- **Core Calculation Engine**:
  - Current attendance percentage calculation (distinguishes unstarted courses from 0% attendance).
  - Target recovery calculation: determines the minimum consecutive classes a student must attend to reach or exceed their attendance target ($x = \lceil (pH - A)/(1 - p) \rceil$) with numerical precision verification.
  - Safe-bunk calculator: calculates the maximum consecutive future classes that can be missed while remaining at or above the target ($b = \lfloor A/p - H \rfloor$).
  - Remaining-classes feasibility: evaluates exam eligibility when given the number of remaining classes, calculating minimum required attendance and safe exam bunks.
  - Anti-misleading rounding guard: prevents rounding up to target when a student is strictly below target.
  - Weighted semester overall: sums total classes held and attended across subjects rather than unweighted percentage averaging.
  - Handled edge cases: 0 classes held, exact targets, 0% target, 100% target with absences, and boundary floating-point values.
- **Local Persistence Layer**:
  - IndexedDB database schema (`personal-attendance-tracker`, version 1) built on `idb`.
  - Object stores for `semesters`, `subjects`, `attendance_records`, and `settings` with compound indexes (`by-subject-date`) and cascade integrity.
  - Storage abstraction (`IStorage`) and export/import backup schema definition.
- **Application Shell & Navigation**:
  - Responsive horizontal top navigation with accessible landmarks, keyboard skip link, active page indicators, and mobile drawer.
  - Clean, restrained UI styling using Inter typography, warm neutral backgrounds, and muted forest green accents.

## Tech Stack

- **Framework**: React 19 + TypeScript (strict mode)
- **Bundler & Dev Server**: Vite 7
- **Styling**: Tailwind CSS
- **Local Database**: IndexedDB via `idb`
- **Testing**: Vitest + React Testing Library + jsdom
- **Icons**: Lucide React

## Getting Started

### Prerequisites

- Node.js (v18 or higher recommended)
- npm (v9 or higher)

### Installation

```bash
# Clone the repository
git clone https://github.com/manav-chaudhary01/attendance-tracker.git
cd attendance-tracker

# Install dependencies
npm install
```

### Development Scripts

```bash
# Start local development server
npm run dev

# Run automated unit and component tests
npm test

# Run tests in watch mode
npm run test:watch

# Compile TypeScript and build for production
npm run build

# Preview the production build locally
npm run preview
```
