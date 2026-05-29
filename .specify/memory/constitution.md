<!--
SYNC IMPACT REPORT
==================
Version change: (template / unversioned) → 1.0.0
Bump rationale: First concrete ratification of the project constitution from the
  CLAUDE.md master guide, reconciled against the actual implemented codebase.
  MAJOR (initial adoption baseline).

Principles defined (7):
  I.   Financial Accuracy (NON-NEGOTIABLE)
  II.  Audit Everything Sensitive (NON-NEGOTIABLE)
  III. Configuration over Code
  IV.  Arabic-First & Fully Localized
  V.   Tenant Isolation is Sacred
  VI.  Security by Default
  VII. Test Discipline & No-Regression

Added sections:
  - Technology Stack (Authoritative) — grounded in real code, with documented
    divergence from CLAUDE.md.
  - Development Workflow & Quality Gates
  - Governance

DOCUMENTED DIVERGENCE (file vs. code):
  CLAUDE.md mandates Next.js 15 (App Router) + Drizzle ORM + Better Auth +
  PostgreSQL RLS + next-intl + BullMQ + MinIO. The shipped code is an
  Express 5 + Prisma 6 REST API with JWT auth and a separate React 18 + Vite
  SPA; tenant scoping and i18n are application-level. This constitution treats
  the SHIPPED STACK as authoritative and records the aspirational stack as a
  non-binding North Star (see Technology Stack §Divergence).

Templates / artifacts reviewed:
  ✅ .specify/templates/plan-template.md  — Constitution Check aligns (gates generic)
  ✅ .specify/templates/spec-template.md  — no mandatory-section conflict
  ✅ .specify/templates/tasks-template.md — task categories compatible
  ⚠  CLAUDE.md (/Users/me/Downloads/Education System/.claude/CLAUDE.md) — stack
     section describes the aspirational architecture, not the shipped one. Manual
     follow-up: reconcile or annotate CLAUDE.md to match this constitution.

Deferred TODOs: none.
-->

# School Management SaaS (SchoolSaaS-EG) Constitution

A multi-tenant, Arabic-first school management platform for the Egyptian market.
This constitution defines the non-negotiable principles that govern every change.
It supersedes convenience and speed wherever they conflict.

## Core Principles

### I. Financial Accuracy (NON-NEGOTIABLE)

Money is never approximated. All monetary values MUST be stored with fixed
precision (2 decimal places) and computed with a decimal-safe representation —
never JavaScript `number`/float arithmetic for accumulation, totals, or tax.
Every financial mutation MUST execute inside a database transaction, and every
balance-affecting operation MUST be reconcilable against its source records.
Rounding rules are fixed: HALF_UP for fees and discounts, HALF_EVEN (banker's)
for tax. Display always shows two decimals.

Rationale: The first customer is a real school handling real tuition. A single
silent rounding or float error erodes trust irreparably. Correctness outranks
development speed, always.

### II. Audit Everything Sensitive (NON-NEGOTIABLE)

Any operation that creates, updates, or deletes a financial record, changes a
student's status or fees, modifies configuration, approves/rejects a workflow,
or alters permissions MUST write an audit entry capturing actor, role,
before-state, after-state, timestamp, and (for sensitive operations) a reason.
Audit logging happens after the protected operation commits — never before, and
never in a way that can be silently skipped. Audit structure is hardcoded, not
configurable.

Rationale: Financial and access-control history must be tamper-evident and
complete for dispute resolution, compliance, and internal control.

### III. Configuration over Code

Any business rule that may change between schools or over time MUST live in a
configuration table, not in code: approval workflows and thresholds, fee types,
discount types, installment plans, roles and permissions, stages/tracks,
holidays, and route pricing. Code MUST read these rules at runtime. Hardcoding
an approver role, a fee category, or a permission check threshold is a defect.

Exceptions (deliberately hardcoded for safety): audit structure, authentication
flow, tenant-isolation logic, currency-precision math, and reconciliation logic.

Rationale: The platform's core value is configurability without redeployment.

### IV. Arabic-First & Fully Localized

Arabic (ar-EG, RTL) is the default UI language; English (en, LTR) is secondary.
User-facing strings MUST come from translation resources — never hardcoded in
components. Layout MUST use logical/RTL-aware styling. Numbers and dates are
stored in canonical form (Western digits, ISO dates) and localized only at
display. Configuration entities carry both Arabic and English display names.

Rationale: The target users operate primarily in Arabic; localization is
foundational, not a feature toggle.

### V. Tenant Isolation is Sacred

The system is multi-tenant. Every tenant-scoped record carries a tenant
identifier, and every query MUST be constrained to the caller's tenant. No code
path may return or mutate another tenant's data. Tenant context is resolved from
the authenticated session/token at request time and applied to all data access.
Data-access logic MUST be abstracted so a tenant can later be migrated to a
dedicated database without rewriting callers.

Rationale: Cross-tenant leakage is the single worst failure a SaaS can have.

### VI. Security by Default

Authentication is required for all non-public endpoints. Passwords MUST be
hashed with a strong adaptive algorithm (bcrypt cost ≥ 12). Secrets (e.g.
JWT signing key) MUST be required from the environment with no insecure
fallback. All input MUST be validated with Zod schemas at the boundary.
Security headers (Helmet) and rate limiting on authentication MUST stay enabled.
Sensitive personal identifiers (National IDs, bank details) MUST be encrypted at
rest. Financial/admin roles SHOULD support 2FA.

Rationale: The system holds minors' personal data and financial records under
Egyptian data expectations; defense-in-depth is mandatory.

### VII. Test Discipline & No-Regression

Critical financial logic MUST carry meaningful automated tests; the backend
Jest suite and frontend type-check/build MUST be green before any merge. Changes
MUST NOT alter financial totals, audit behavior, or permission outcomes unless
that is the explicit, reviewed intent of the change. Performance and caching
layers MUST NEVER change correctness: caches are read-through with direct-DB
fallback, and pagination MUST NOT drop or miscount records.

Rationale: A regression in money math or access control is a production
incident, not a bug. Green tests are the contract for merge.

## Technology Stack (Authoritative)

The following reflects the **shipped codebase** and is binding for current work:

- **Backend**: Node.js + Express 5 (REST API), TypeScript (strict).
- **Database/ORM**: PostgreSQL + Prisma 6. Connection pool tuned for expected
  concurrency; migrations are the only path for schema change.
- **Auth**: JWT (jsonwebtoken) + bcrypt; token-version revocation; rate-limited
  login.
- **Validation/Security**: Zod, Helmet, express-rate-limit.
- **Caching**: Redis (ioredis) read-through with DB fallback.
- **Realtime**: socket.io (where used).
- **Frontend**: React 18 + Vite 5 SPA, TanStack Query (server cache) + Zustand
  (client state), React Router, React Hook Form, Radix/shadcn + Tailwind CSS.
- **Testing**: Jest (backend), Vitest + Testing Library (frontend).

### Divergence from CLAUDE.md (North Star vs. Reality)

`CLAUDE.md` describes an aspirational architecture — Next.js 15 (App Router),
Drizzle ORM, Better Auth, PostgreSQL row-level-security, next-intl, BullMQ, and
MinIO. The shipped product does **not** use these; it uses the stack listed
above with **application-level** tenant scoping and i18n rather than database
RLS and next-intl. Where the two conflict, this constitution and the shipped
stack win. The aspirational stack is retained only as a long-term direction and
MUST NOT be cited to block or rewrite working code without an explicit migration
decision recorded under Governance.

## Development Workflow & Quality Gates

- **Module boundaries**: Business logic is organized by domain; data access is
  isolated from transport. Cross-domain calls go through a module's public API,
  not its internals or its tables.
- **Per-change checklist**: schema/migration (if needed) → Zod validators →
  data access → business logic → permission checks → endpoints/UI →
  translations (ar + en) → audit integration → tests.
- **Merge gate**: backend `npm test` (Jest) green, frontend
  `tsc --noEmit` + build green, and no unreviewed change to financial totals,
  audit entries, or permission behavior.
- **Commits/PRs**: Conventional Commit messages; secrets (`.env`, credentials)
  are never committed; PRs state what changed, why, and any reviewer caveats.
- **Ask, don't guess**: Schema changes, new configuration tables, permission-
  model changes, and anything touching money or audit MUST be confirmed with a
  maintainer before implementation.

## Governance

This constitution supersedes ad-hoc practice. All reviews MUST verify compliance
with the seven principles, with special scrutiny on Principles I, II, V, and VI.

- **Amendments** require a written rationale, a version bump per the policy
  below, and propagation to affected templates and guidance docs in the same
  change.
- **Versioning policy** (semantic):
  - MAJOR — removal or backward-incompatible redefinition of a principle or
    governance rule.
  - MINOR — a new principle/section or materially expanded mandate.
  - PATCH — clarifications and wording with no change in obligations.
- **Stack migration** (e.g., adopting any aspirational CLAUDE.md technology)
  requires a recorded decision and a MINOR or MAJOR amendment before code
  begins.
- **Compliance review**: any PR found to violate a NON-NEGOTIABLE principle is
  blocked until remediated; complexity or shortcuts that bypass a principle MUST
  be justified in writing and approved.
- Runtime, day-to-day development guidance lives in `CLAUDE.md`; where it
  conflicts with this constitution, this constitution prevails.

**Version**: 1.0.0 | **Ratified**: 2026-05-29 | **Last Amended**: 2026-05-29
