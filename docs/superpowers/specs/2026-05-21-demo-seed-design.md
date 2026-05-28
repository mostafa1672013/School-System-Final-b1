# Demo Users & Seed Data Design

## Goal

Create 6 demo user accounts (one per role) and a comprehensive seed script that populates 110+ students with realistic scenarios covering every role's daily workflow for academic year 2024-2025.

---

## Part A: Add `student_affairs` Role

Add `'student_affairs'` to the `UserRole` union in `src/types/index.ts`.

**Permissions (what this role can do):**
- View all students and their details
- Update basic student info (name, guardian, phone, address)
- Change student status (applied → under_testing → admitted)

**Cannot do:** Access payments, treasury, inventory financials, approve fees, promote students.

No server-side middleware changes required — student GET/PATCH endpoints are already accessible to authenticated users. The role is used by the frontend to show/hide navigation and actions.

---

## Part B: Demo Seed Script

**File:** `server/prisma/seed_demo.ts`  
**Run:** `cd server && npx ts-node prisma/seed_demo.ts`  
**Behavior:** All operations use `upsert` — safe to re-run.

### Users (6)

| Role | Name | username (email) | Password |
|------|------|-----------------|----------|
| school_director | أحمد محمد السيد | admin@school.com | Admin@123 |
| head_accountant | فاطمة علي حسن | head@school.com | Head@123 |
| accountant | محمود إبراهيم نصر | acc@school.com | Acc@123 |
| student_affairs | نورة خالد أحمد | affairs@school.com | Stud@123 |
| warehouse_keeper | سامي عبدالله حسين | store@school.com | Ware@123 |
| system_admin | مسؤول النظام | sysadmin@school.com | Sys@123 |

Passwords hashed with `bcrypt` (rounds=12).

### Inventory Items (5)

| Name | Category | Type | Qty | unitPrice |
|------|----------|------|-----|-----------|
| كتاب الرياضيات ابتدائي | books | sale | 200 | 150 |
| كتاب العلوم إعدادي | books | sale | 150 | 180 |
| الزي المدرسي الصيفي | uniform | sale | 300 | 350 |
| الزي المدرسي الشتوي | uniform | sale | 250 | 420 |
| أدوات مكتبية | tools | consumable | 500 | 25 |

### Students (110 total) — all in `academicYear: "2024-2025"`

**Distribution:**

| Batch | Stage/Grade | Count | Status | Scenario |
|-------|------------|-------|--------|---------|
| 1 | KG1/KG2 local | 12 | admitted/active | normal fees, some with siblings |
| 2 | KG1/KG2 international | 8 | admitted/active | higher fees |
| 3 | Primary (6 grades × 6) | 36 | admitted/active | mixed tracks |
| 4 | Preparatory (3 grades × 6) | 18 | admitted/active | some bus fees |
| 5 | Secondary (3 grades × 6) | 18 | admitted/active | 6 in grade 3 |
| 6 | KG–Primary applied/testing | 10 | applied/under_testing | for student_affairs |
| 7 | Promoted from 2023-2024 | 8 | admitted | with yearlyFinance + arrears |

**Total: 110 students**

### Financial Scenarios

**Pending payment requests (15 students from batches 1-5):**
Set `pendingPaymentAmount`, `pendingPaymentType`, `pendingPaymentMethod`, `paymentRequestStatus: 'pending'` — awaiting head_accountant approval.

**Installment plans (25 students):**
- 15 active plans: 4 installments spread over the year, some already paid
- 10 overdue plans: first installment `dueDate` in the past, `status: 'pending'`

**Arrears from 2023-2024 (8 promoted students):**
Set `arrearsFees > 0` on promoted students. Also create `StudentYearlyFinance` record for 2023-2024 with `paidAmount` from that year's payments.

**Discounts (20 students):**
- 12 sibling discounts (`hasSiblings: true`, `discountPercentage: 10`)
- 8 special discounts (`discountPercentage: 15-20`, `discountApprovedBy: 'أحمد محمد السيد'`)

**Approved payments (60 students):**
Students with `status: 'admitted'/'active'` get 1-3 payment records each (tuition, books, uniform). Totals match partial payment of their `totalFees`.

**Inventory transactions (40+ transactions):**
Books and uniform sold to admitted students. Each transaction: `type: 'out'`, `subType: 'sale'`, linked to studentId.

---

## Files Changed

| File | Change |
|------|--------|
| `src/types/index.ts` | Add `'student_affairs'` to `UserRole` |
| `server/prisma/seed_demo.ts` | New: full demo seed script |
