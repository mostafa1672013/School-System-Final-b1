# Academic Year Management Design

## Goal

Add a formal academic year close/open workflow: a 4-step wizard that generates a year-end report, promotes all eligible students in bulk using pre-defined fee structures, then advances the active academic year system-wide.

---

## Context

- `currentAcademicYear` is currently hardcoded as `'2024-2025'` in `src/lib/utils.ts` — used everywhere (StudentPromotion, StageFeeManagement, Reports, etc.)
- Individual student promotion already exists: `POST /api/students/:id/promote` in `server/src/index.ts`
- `StudentPromotion.tsx` already has `getNextStageAndGrade()` and `calcPromoFees()` helpers
- `FiscalYear` in `AccountingPeriods.tsx` is the accounting/GL fiscal year — a separate concept, not affected by this feature
- `StageFee` records are keyed by `(stage, grade, track, academicYear)` — bulk promotion reads these for the new year's fees

---

## Architecture

### Active Year Storage

A new `SystemSetting` table stores key/value pairs. The `activeAcademicYear` key holds the current student academic year string (e.g. `"2024-2025"`).

```prisma
model SystemSetting {
  key   String @id
  value String
}
```

Seeded with `{ key: "activeAcademicYear", value: "2024-2025" }`.

Two server endpoints manage it:
- `GET /api/settings/academic-year` — returns `{ academicYear: string }`, public (any authenticated user)
- `PUT /api/settings/academic-year` — updates the value, restricted to `school_director | head_accountant`

A new `settingsStore.ts` fetches the value on login and exposes `activeAcademicYear`. All components that currently import `currentAcademicYear` from `utils.ts` switch to reading from the store. The hardcoded constant in `utils.ts` becomes a fallback default only.

### Bulk Promote Endpoint

`POST /api/students/bulk-promote` — new endpoint, restricted to `school_director | head_accountant`.

Request body:
```typescript
{
  toAcademicYear: string;       // e.g. "2025-2026"
  studentIds: string[];         // IDs to promote
}
```

Internally runs the same logic as `POST /api/students/:id/promote` for each student, processed in batches of 50 inside a `$transaction` to avoid timeout on 110+ students. Returns:
```typescript
{
  promoted: number;
  skipped: { id: string; name: string; reason: string }[];
}
```

---

## Wizard: `/year-management`

New page, accessible only to `school_director` and `head_accountant`. Added to Sidebar under الإعدادات.

### Step 1 — التقرير الختامي (Year-End Report)

Rendered by a new `YearEndReport` component. Data pulled from existing store state (no new endpoints needed).

**Report sections:**
- Financial summary card: total fees due, total collected, total outstanding, collection rate %
- Breakdown table by stage (KG / ابتدائي / إعدادي / ثانوي): students count, collected, outstanding
- Non-payers list: students where `paidAmount < totalFees`, sorted by outstanding amount descending, with name + grade + remaining amount
- Print button + Export PDF button (using html2canvas + jspdf, same pattern as StudentStatement)

**Gating:** A "لقد راجعت التقرير" checkbox must be checked before the "التالي" button becomes active.

### Step 2 — مراجعة الترقية (Promotion Preview)

- Input field for target academic year (e.g. `2025-2026`), validated against `academicYears` list
- Table showing all `admitted/active` students grouped by stage/grade with their next stage/grade computed via `getNextStageAndGrade()`
- Warning banner if fee structures (`StageFee` records) for the target year are missing — shows which stage/grade combinations lack a fee structure
- Students in final secondary grade shown separately as "خريجون" (graduates) — they will be set to `status: 'graduated'`
- Count summary: X to promote, Y graduates, Z already in final state
- "التالي" button disabled if target year is invalid

### Step 3 — تنفيذ الترقية (Execute Promotion)

- Confirmation dialog listing the counts before proceeding
- Calls `POST /api/students/bulk-promote` with all eligible student IDs
- Progress bar during execution (polling or streaming — use simple state update after response)
- On completion: shows promoted count, graduates count, and skipped list with reasons
- "التالي" button appears only after successful completion

### Step 4 — تفعيل السنة الجديدة (Activate New Year)

- Summary of what was done (X promoted, Y graduated)
- Warning: "هذا الإجراء لا يمكن التراجع عنه — ستتغير السنة النشطة في النظام كله"
- Text confirmation input: user must type the new year string exactly (e.g. `2025-2026`) before the button activates
- On confirm: calls `PUT /api/settings/academic-year`
- On success: `settingsStore` updates → all components reading `activeAcademicYear` from the store reflect the new year immediately

---

## Non-Promoted Students

Students who remain after bulk promotion (e.g. `applied`, `under_testing`, `inactive` status, or manually excluded) are shown in a post-wizard alert banner with a list. No automatic status change — they can be promoted individually via the existing `StudentPromotion.tsx` page.

---

## Files Changed

| File | Change |
|------|--------|
| `server/prisma/schema.prisma` | Add `SystemSetting` model |
| `server/prisma/migrations/` | New migration for SystemSetting |
| `server/prisma/seed_demo.ts` | Insert `activeAcademicYear` setting row |
| `server/src/index.ts` | Add `GET/PUT /api/settings/academic-year` + `POST /api/students/bulk-promote` |
| `src/types/index.ts` | Add `SystemSetting` type |
| `src/stores/settingsStore.ts` | **New** — Zustand store, fetches `activeAcademicYear` on login |
| `src/lib/utils.ts` | `currentAcademicYear` becomes fallback constant only |
| `src/pages/YearManagement.tsx` | **New** — 4-step wizard page |
| `src/components/year/YearEndReport.tsx` | **New** — year-end report component (financial summary + print/PDF) |
| `src/App.tsx` | Add route `/year-management` |
| `src/components/layout/Sidebar.tsx` | Add "إدارة السنة الدراسية" link under الإعدادات |

---

## Out of Scope

- Reopening a closed year (not needed — old data is read-only via `StudentYearlyFinance` snapshots)
- Partial promotion (some grades but not others) — promote all or nothing; individual exceptions handled via existing single-student promotion
- Syncing with `FiscalYear` in accounting — the two year concepts remain independent
- Fee structure creation during this wizard — user must define `StageFee` records for the new year before running the wizard (warning shown if missing)
