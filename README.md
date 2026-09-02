# Personal Attendance Tracker

A clean, practical attendance tracking web app designed for university students. The application runs entirely client-side with persistent local storage in IndexedDB, requiring no accounts, cloud databases, or external services.

## Current Status (Stage 1 — Foundation)

This repository contains the foundation architecture and verified core calculations:

- **Core Calculation Engine**:
  - Current attendance percentage calculation (distinguishes unstarted courses from 0% attendance).
  - Target recovery calculation: determines the minimum consecutive classes a student must attend to reach or exceed their attendance target ($x = \lceil (pH - A)/(1 - p) \rceil$) with numerical precision verification.
  - Safe-bunk calculator: calculates the maximum consecutive future classes that can be missed while remaining at or above the target ($b = \lfloor A/p - H \rfloor$).
  - Remaining-classes feasibility: evaluates exam eligibility when given the number of remaining classes, calculating minimum required attendance and safe exam bunks.
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
