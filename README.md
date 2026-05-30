# School Management System — نظام إدارة المدرسة

A full-stack web application for comprehensive school administration — covering student admissions, payments, fees, expenses, inventory, bus routes, and reporting.

---

## Features

### Completed
- Student management (registration, profiles, status tracking)
- Admission workflow (applied → under testing → fee setup → pending approval → admitted)
- Payment recording and receipt printing
- Stage fee configuration per track (local/international)
- Discount management and approval workflows
- Bus route and stop management
- Inventory tracking
- User management with role-based access control
- PDF receipt and report generation
- HR / Employee management (Shifts, attendance, leaves, deductions)

### In Progress
- Expense management and accounting
- Advanced analytics dashboard
- Comprehensive reporting module
- Stripe payment integration

---

## Tech Stack

### Frontend
| Library | Version | Purpose |
|---------|---------|---------|
| React | 19.2.6 | UI framework |
| Vite | 5.4.1 | Build tool & dev server |
| TypeScript | 5.5.3 | Type safety |
| Tailwind CSS | 3.4.11 | Styling |
| Shadcn UI | latest | Component library |
| React Router | 6.26.2 | Client-side routing |
| Redux Toolkit | 2.9.0 | Global state management |
| Zustand | 5.0.8 | Lightweight store |
| React Query | 5.56.2 | Server state & caching |
| React Hook Form | 7.53.0 | Form management |
| Zod | 3.23.8 | Schema validation |

### Backend
| Library | Version | Purpose |
|---------|---------|---------|
| Express | 5.2.1 | HTTP server |
| Prisma | 6.19.3 | ORM |
| PostgreSQL | 16 | Database |
| Socket.IO | 4.8.3 | Real-time events |

---

## Prerequisites

- [Node.js & npm](https://github.com/nvm-sh/nvm#installing-and-updating) (via nvm recommended)
- [Docker](https://www.docker.com/) — for running PostgreSQL

---

## Getting Started

### 1. Start the database

```bash
docker compose up -d
```

This spins up PostgreSQL 16 in a container.

### 2. Install dependencies

```bash
npm install
```

### 3. Start development mode

```bash
npm run dev
```

This runs the frontend and backend concurrently:
- **Frontend (Vite):** http://localhost:5173
- **Backend (Express):** http://localhost:4000

---

## Available Scripts

```bash
npm run dev          # Start frontend + backend together
npm run client       # Start frontend only (Vite on :5173)
npm run server       # Start backend only (Express on :4000)
npm run build        # Production build
npm run build:dev    # Development build
npm run preview      # Preview production build locally
npm run lint         # Run ESLint
npm run test         # Run tests (Vitest)
npm run test:watch   # Watch mode tests
npm run test:coverage # Test coverage report
npm run deploy       # Build and deploy to GitHub Pages
```

---

## Project Structure

```
project/
├── src/                          # Frontend (React + Vite)
│   ├── pages/                    # Page components
│   ├── components/
│   │   ├── layout/               # AppLayout, Sidebar, Header, ProtectedRoute
│   │   ├── features/             # Domain-specific components
│   │   └── ui/                   # Shadcn UI primitives
│   ├── stores/                   # Zustand/Redux stores
│   ├── hooks/                    # Custom React hooks
│   ├── lib/                      # Utility functions
│   └── types/                    # TypeScript type definitions
├── server/                       # Backend (Express + Node.js)
│   ├── src/
│   │   ├── index.ts              # Server entry point & API routes
│   │   ├── accounting-api.ts     # Accounting endpoints
│   │   └── seed-accounts.ts      # Database seed data
│   └── prisma/
│       └── schema.prisma         # Database schema
├── docker-compose.yml
├── vite.config.ts
└── package.json
```

---

## Deployment

The project is pre-configured for GitHub Pages:

```bash
npm run deploy
```

This builds the app and pushes the `dist/` folder to the `gh-pages` branch.

---

## Development Standards

- Strict TypeScript throughout
- Tailwind CSS + Shadcn UI for all UI components
- RTL (Right-to-Left) support for Arabic text
- Error Boundaries on all page-level components
- Lazy loading for route-level code splitting
- Vitest for unit and integration tests

---

## License

ISC
