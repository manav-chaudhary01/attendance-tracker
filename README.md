# Personal Attendance Tracker

A clean, practical attendance tracking web app designed for university students. The application runs entirely client-side with persistent local storage in IndexedDB, requiring no accounts, cloud databases, or external services.

## Current Status (Stage 3 — Subject and Semester Management)

This repository contains the foundation architecture, verified calculation engine, and full semester and subject management:

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
  - Object stores for `semesters`, `subjects`, `attendance_records`, and `settings` with compound indexes and cascade integrity.
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
