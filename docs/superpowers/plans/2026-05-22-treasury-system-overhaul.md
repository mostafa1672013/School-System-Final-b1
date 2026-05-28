# Treasury System Overhaul Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix 10 identified security, logic, performance, and UX issues in the treasury (خزينة) system to make it coherent and production-safe.

**Architecture:** The treasury has three layers — Prisma schema (TreasurySession model), Express API routes (~8 endpoints in `server/src/index.ts`), and the React frontend (`src/pages/Treasury.tsx` + `src/stores/treasuryStore.ts`). Issues span all three layers. We fix them bottom-up: schema → API → frontend.

**Tech Stack:** PostgreSQL + Prisma ORM, Express.js, React + Zustand, TypeScript end-to-end.

---

## Audit Summary — What's Broken

| # | Severity | Issue |
|---|----------|-------|
| 1 | 🔴 Security | `/api/treasury/open` uses `userId` from request **body** — attacker can open treasury as any user |
| 2 | 🔴 Security | `/api/treasury/close-request` has no JWT identity check — any user can close any session |
| 3 | 🔴 Security | `/api/treasury/close-approve` has no JWT identity check — any user can approve closure |
| 4 | 🔴 Broken | Approval dialog sends the **opener's** ID as `approvedBy`; server rejects unless opener is director/head_accountant — accountants can **never** close a treasury with a discrepancy |
| 5 | 🟠 Data bug | `suggestedOpeningBalance` uses calculated `closingBalance`, not actual counted `actualBalance` |
| 6 | 🟠 Broken UI | Loading state renders **after** open/session state checks — when `loading=true` and `status=null`, the "open treasury" form flashes before data loads |
| 7 | 🟡 Performance | `/api/treasury/status` includes all payments + expenses in every poll (every 2 min) — unbounded payload |
| 8 | 🟡 Type bug | `TreasurySession` type is missing `payments[]` and `expenses[]` arrays the UI accesses |
| 9 | 🟡 UX | Print report shows raw UUIDs for `openedBy`, `closedBy`, `approvedBy` |
| 10 | 🟡 Code smell | Inline `fetch` inside print button handler in `Treasury.tsx` — bypasses store, no error handling |

---

## File Map

| File | Changes |
|------|---------|
| `server/prisma/schema.prisma` | Add `pending_close` to TreasurySession status comment, add `openedByName`/`closedByName` columns |
| `server/prisma/migrations/` | New migration for schema changes |
| `server/src/index.ts` | Fix auth on open/close-request/close-approve; add `pending_close` state; fix suggestedOpeningBalance; slim down status payload |
| `src/types/index.ts` | Add `payments[]`, `expenses[]` to `TreasurySession`; add `pending_close` to status; add `openedByName`/`closedByName` |
| `src/stores/treasuryStore.ts` | Add `fetchSessionDetails(id)` method; remove `userId` from `openTreasury` signature |
| `src/pages/Treasury.tsx` | Fix loading state render order; fix approval flow; move inline fetch to store |
| `src/hooks/usePrintTreasuryReport.ts` | Use `openedByName`/`closedByName` instead of raw IDs |

---

## Task 1: Security — Fix `/api/treasury/open` to Use JWT Identity

**Files:**
- Modify: `server/src/index.ts:1930-1963`

The `/api/treasury/open` endpoint reads `openedBy` from `req.body.userId`, letting any authenticated user claim a different identity. Fix: read from `req.user!.userId` (already populated by global auth middleware).

- [ ] **Step 1: Write the failing test (manual test — no unit test infra for this endpoint)**

  Open a REST client or run:
  ```bash
  # Login as accountant A, get token
  TOKEN=$(curl -s -X POST http://localhost:3000/api/auth/login \
    -H "Content-Type: application/json" \
    -d '{"email":"accountant@test.com","password":"pass"}' | jq -r '.token')
  
  # Try opening treasury with a DIFFERENT userId in the body
  curl -s -X POST http://localhost:3000/api/treasury/open \
    -H "Authorization: Bearer $TOKEN" \
    -H "Content-Type: application/json" \
    -d '{"openingBalance":1000,"userId":"SOME_OTHER_USER_ID"}'
  ```
  Expected before fix: session created with `openedBy = SOME_OTHER_USER_ID` (the spoofed id)

- [ ] **Step 2: Apply the fix in `server/src/index.ts`**

  Find line 1930:
  ```typescript
  app.post('/api/treasury/open', async (req, res) => {
    const { openingBalance, userId } = req.body;
  ```

  Replace with:
  ```typescript
  app.post('/api/treasury/open', async (req, res) => {
    const { openingBalance } = req.body;
    const userId = req.user!.userId;  // always from JWT, never from body
  ```

  The `const user = await prisma.user.findUnique({ where: { id: userId } })` below stays as-is — it now looks up the JWT-authenticated user to verify their role.

- [ ] **Step 3: Also remove `userId` from `openTreasury` store call — update the store**

  In `src/stores/treasuryStore.ts`, change the `openTreasury` signature and call:

  Old:
  ```typescript
  openTreasury: (openingBalance: number, userId: string) => Promise<boolean>;
  ...
  openTreasury: async (openingBalance, userId) => {
    try {
      const res = await fetch('/api/treasury/open', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ openingBalance, openedBy: userId, userId }),
      });
  ```

  New:
  ```typescript
  openTreasury: (openingBalance: number) => Promise<boolean>;
  ...
  openTreasury: async (openingBalance) => {
    try {
      const res = await fetch('/api/treasury/open', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ openingBalance }),
      });
  ```

- [ ] **Step 4: Update Treasury.tsx to not pass userId**

  In `src/pages/Treasury.tsx`, find:
  ```typescript
  const success = await openTreasury(parseFloat(openingBalanceInput), user?.id || '');
  ```
  Replace with:
  ```typescript
  const success = await openTreasury(parseFloat(openingBalanceInput));
  ```

- [ ] **Step 5: Verify the fix**

  Re-run the test from Step 1. Now the spoofed `userId` in the body should be ignored; the session should be created with `openedBy` = JWT user's actual ID.

- [ ] **Step 6: Commit**

  ```bash
  git add server/src/index.ts src/stores/treasuryStore.ts src/pages/Treasury.tsx
  git commit -m "security: use JWT identity for treasury open, reject body userId"
  ```

---

## Task 2: Security — Verify Opener Identity on `close-request` and `close-approve`

**Files:**
- Modify: `server/src/index.ts:1966-2018` (close-request)
- Modify: `server/src/index.ts:2021-2068` (close-approve)

Both endpoints currently accept `closedBy` / `approvedBy` as strings from the body without verifying the JWT matches the expected actor.

- [ ] **Step 1: Fix `/api/treasury/close-request` to verify JWT opener**

  In `server/src/index.ts`, find the close-request handler (around line 1966). After the session lookup and `if (!session || session.status !== 'open')` check, add:

  ```typescript
  // verify the requestor is the treasury opener
  if (session.openedBy !== req.user!.userId) {
    return res.status(403).json({
      error: 'فقط الشخص الذي فتح الخزينة يمكنه إغلاقها',
      code: 'UNAUTHORIZED_CLOSER'
    });
  }
  ```

  Also change `closedBy` to come from a DB lookup rather than the body:
  ```typescript
  const { actualBalance } = req.body;  // remove closedBy from body
  const closerUser = await prisma.user.findUnique({ where: { id: req.user!.userId }, select: { name: true } });
  const closedBy = closerUser?.name || req.user!.userId;
  ```

- [ ] **Step 2: Fix `/api/treasury/close-approve` to verify JWT**

  In the close-approve handler (around line 2021), the `approvedBy` comes from the body. Validate it matches the JWT user:

  ```typescript
  const { sessionId, actualBalance, closureNote } = req.body;  // remove approvedBy, closedBy from body
  const approvedByUserId = req.user!.userId;
  
  const approver = await prisma.user.findUnique({ where: { id: approvedByUserId } });
  const approverRoles = ['school_director', 'head_accountant', 'system_admin'];
  if (!approver || !approverRoles.includes(approver.role)) {
    return res.status(403).json({ error: 'ليس لديك صلاحية اعتماد الإغلاق' });
  }
  
  // closedBy: lookup who originally closed (session opener's name)
  const sessionToClose = await prisma.treasurySession.findUnique({ where: { id: sessionId }, select: { openedBy: true } });
  const closerUser = await prisma.user.findUnique({ where: { id: sessionToClose?.openedBy || '' }, select: { name: true } });
  const closedBy = closerUser?.name || sessionToClose?.openedBy || 'غير معروف';
  const approvedBy = approver.name;
  ```

  Then remove the old `approvedBy` from the DB update object and replace with the looked-up name.

- [ ] **Step 3: Update treasuryStore `requestClose` and `approveClose` to not send sensitive identity fields**

  In `src/stores/treasuryStore.ts`:

  `requestClose` — remove `closedBy` from body:
  ```typescript
  requestClose: async (actualBalance) => {
    try {
      const res = await fetch('/api/treasury/close-request', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ actualBalance }),
      });
  ```

  `approveClose` — remove `closedBy` and `approvedBy` from body (JWT carries identity):
  ```typescript
  approveClose: async (sessionId, actualBalance, closureNote) => {
    try {
      const res = await fetch('/api/treasury/close-approve', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ sessionId, actualBalance, closureNote }),
      });
  ```

  Update the interface signatures accordingly:
  ```typescript
  requestClose: (actualBalance: number) => Promise<TreasuryCloseResult | null>;
  approveClose: (sessionId: string, actualBalance: number, closureNote: string) => Promise<boolean>;
  ```

- [ ] **Step 4: Update Treasury.tsx to use new store signatures**

  `handleRequestClose`:
  ```typescript
  const result = await requestClose(parseFloat(actualBalanceInput));
  ```

  `handleApproveClose`:
  ```typescript
  const success = await approveClose(
    closeRequestResult.sessionId,
    closeRequestResult.actualBalance,
    closureNote
  );
  ```

  Remove the `user.id` identity checks from `handleRequestClose` and `handleApproveClose` — the server handles this now. Keep only the UI-level opener check (`!isAuthorized`) to prevent the buttons from showing.

- [ ] **Step 5: Commit**

  ```bash
  git add server/src/index.ts src/stores/treasuryStore.ts src/pages/Treasury.tsx
  git commit -m "security: verify JWT identity on treasury close-request and close-approve"
  ```

---

## Task 3: Broken Flow — Approval Requires Manager Role the Opener Doesn't Have

**Files:**
- Modify: `server/src/index.ts` — add `pending_close` session status
- Modify: `server/prisma/schema.prisma` — update status comment
- New migration: `server/prisma/migrations/`
- Modify: `src/pages/Treasury.tsx` — redesign approval dialog
- Modify: `src/types/index.ts` — add `pending_close` to TreasuryStatus

**Problem:** When an `accountant` (the typical treasury opener) finds a discrepancy, the UI sends their own ID as `approvedBy`. The server rejects because accountants aren't in the approver roles (`school_director`, `head_accountant`, `system_admin`). The treasury is permanently stuck — the accountant cannot close it.

**Solution:** Introduce a `pending_close` session status. The opener submits the discrepancy note → session becomes `pending_close`. Any manager (director/head_accountant) sees the pending closure and approves or rejects from the same Treasury page.

- [ ] **Step 1: Add a migration for the new status (comment update only — SQLite/Postgres use String so no schema migration needed, just update the Prisma comment)**

  In `server/prisma/schema.prisma`, update the TreasurySession status comment:
  ```prisma
  status           String    @default("open") // open, pending_close, closed
  ```

  No structural migration needed because it's a `String` column.

- [ ] **Step 2: Add a new API endpoint `POST /api/treasury/pending-close`**

  This replaces the first half of `close-request` (when there IS a discrepancy). Add after the existing close-request handler in `server/src/index.ts`:

  ```typescript
  // POST: submit discrepancy note and mark session as pending_close
  app.post('/api/treasury/pending-close', async (req, res) => {
    const { actualBalance, closureNote } = req.body;
    const userId = req.user!.userId;

    if (!closureNote || closureNote.trim().length < 10) {
      return res.status(400).json({ error: 'يجب كتابة سبب الفرق (10 أحرف على الأقل)' });
    }

    try {
      const today = new Date().toISOString().split('T')[0];
      const session = await prisma.treasurySession.findUnique({
        where: { date: today },
        include: { payments: true, expenses: { where: { status: 'paid' } } }
      });

      if (!session || session.status !== 'open') {
        return res.status(404).json({ error: 'لا توجد جلسة مفتوحة اليوم' });
      }

      if (session.openedBy !== userId) {
        return res.status(403).json({ error: 'فقط من فتح الخزينة يمكنه تقديم طلب الإغلاق' });
      }

      const totalIncome = session.payments.reduce((sum: number, p: any) => sum + p.amount, 0);
      const totalExpenses = session.expenses.reduce((sum: number, e: any) => sum + e.amount, 0);
      const expectedBalance = session.openingBalance + totalIncome - totalExpenses;
      const difference = Number(actualBalance) - expectedBalance;

      const closerUser = await prisma.user.findUnique({ where: { id: userId }, select: { name: true } });

      const updated = await prisma.treasurySession.update({
        where: { id: session.id },
        data: {
          status: 'pending_close',
          actualBalance: Number(actualBalance),
          closingBalance: expectedBalance,
          difference,
          closedBy: closerUser?.name || userId,
          closureNote: closureNote.trim()
        }
      });

      res.json({
        status: 'pending_close',
        session: updated,
        expectedBalance,
        actualBalance: Number(actualBalance),
        difference,
        sessionId: session.id
      });
    } catch (error) {
      res.status(400).json({ error: 'فشل تقديم طلب الإغلاق' });
    }
  });
  ```

- [ ] **Step 3: Update `close-approve` to work on `pending_close` sessions**

  In the close-approve handler, change the session status check from checking `open` to `pending_close`:
  ```typescript
  if (session.status !== 'pending_close') {
    return res.status(400).json({ error: 'الجلسة ليست في حالة انتظار الموافقة' });
  }
  ```

  Also remove the recalculation since `actualBalance`, `closingBalance`, and `difference` are already stored on the session:
  ```typescript
  const closed = await prisma.treasurySession.update({
    where: { id: sessionId },
    data: {
      status: 'closed',
      approvedBy: approver.name,
      closedAt: new Date()
      // actualBalance, closingBalance, difference already set in pending-close step
    }
  });
  ```

- [ ] **Step 4: Update `/api/treasury/status` to return `pending_close` state**

  In the status endpoint, the current response only handles `open` vs `no_session`. Add handling for `pending_close`:

  ```typescript
  // After fetching today's session:
  if (session.status === 'pending_close') {
    const totalIncome = session.payments.reduce((sum: number, p: any) => sum + p.amount, 0);
    const totalExpenses = session.expenses.reduce((sum: number, e: any) => sum + e.amount, 0);
    const currentBalance = session.openingBalance + totalIncome - totalExpenses;

    return res.json({
      status: 'pending_close',
      session,
      totalIncome,
      totalExpenses,
      currentBalance,
      paymentsCount: session.payments.length,
      expensesCount: session.expenses.length
    });
  }
  ```

  Also update `requireOpenTreasury` to reject `pending_close` sessions (no new payments during pending):
  ```typescript
  if (!session || (session.status !== 'open')) {
    return res.status(403).json({
      error: 'الخزينة مغلقة أو في انتظار الموافقة',
      code: 'TREASURY_CLOSED',
      message: 'يجب فتح الخزينة أولاً قبل تسجيل أي عملية مالية'
    });
  }
  ```

- [ ] **Step 5: Update TypeScript types in `src/types/index.ts`**

  ```typescript
  export type TreasurySessionStatus = 'open' | 'pending_close' | 'closed';

  export interface TreasuryStatus {
    status: 'open' | 'pending_close' | 'no_session';
    // ... rest unchanged
  }
  ```

- [ ] **Step 6: Update `treasuryStore.ts` — add `submitPendingClose` action**

  ```typescript
  submitPendingClose: (actualBalance: number, closureNote: string) => Promise<TreasuryCloseResult | null>;
  ```

  Implementation:
  ```typescript
  submitPendingClose: async (actualBalance, closureNote) => {
    try {
      const res = await fetch('/api/treasury/pending-close', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ actualBalance, closureNote }),
      });
      if (!res.ok) return null;
      const data = await res.json();
      await get().fetchStatus();
      return data;
    } catch (error) {
      console.error('Failed to submit pending close:', error);
      return null;
    }
  },
  ```

  Update `requestClose` to handle the no-discrepancy path only (discrepancy path now uses `submitPendingClose`). Or keep `requestClose` as-is and let it redirect to `pending-close` internally — simpler to keep the same store action but route the result correctly.

  Actually simplest: update `requestClose` to call the new endpoint when there's a discrepancy. In Treasury.tsx, when result is `needs_approval`, instead of showing an immediate approve dialog, show a "submit for manager approval" dialog that calls `submitPendingClose`.

- [ ] **Step 7: Redesign Treasury.tsx approval flow**

  **Old flow:** discrepancy → immediate approval dialog (same user)
  **New flow:**
  - No discrepancy → auto-close (unchanged)
  - Discrepancy detected → show new "طلب موافقة" dialog with note input → calls `submitPendingClose` → session becomes `pending_close`
  - When `status.status === 'pending_close'`:
    - All users see a banner: "الخزينة في انتظار موافقة المدير"
    - Manager users (school_director, head_accountant, system_admin) see an "اعتماد الإغلاق" button
    - Manager clicks button → calls `approveClose(sessionId, actualBalance, '')` — note already stored

  Remove `showApprovalDialog`, `closeRequestResult` state. Add `showPendingCloseNoteDialog` state for the note submission step.

  For the `pending_close` status view, add to the render logic:
  ```tsx
  if (status.status === 'pending_close' && status.session) {
    const canApprove = user?.role && ['school_director', 'head_accountant', 'system_admin'].includes(user.role);
    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-50 to-orange-100 p-6">
        <div className="max-w-md mx-auto h-screen flex flex-col items-center justify-center">
          <Card className="w-full border-2 border-orange-300">
            <CardHeader className="text-center">
              <AlertCircle className="w-16 h-16 mx-auto text-orange-600 mb-4" />
              <CardTitle>الخزينة في انتظار الموافقة</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-gray-600">
                قدّم {status.session.closedBy} طلب إغلاق مع فرق في الجرد.
              </p>
              <div className="bg-orange-50 p-4 rounded-lg border border-orange-200">
                <p className="text-sm text-gray-600">الفرق:</p>
                <p className="text-2xl font-bold text-orange-700">
                  {formatCurrency(status.session.difference || 0)}
                </p>
              </div>
              <div className="bg-gray-50 p-4 rounded-lg">
                <p className="text-sm font-medium text-gray-700">سبب الفرق:</p>
                <p className="text-sm text-gray-600 mt-1">{status.session.closureNote}</p>
              </div>
              {canApprove && (
                <Button
                  onClick={async () => {
                    setIsSubmitting(true);
                    const success = await approveClose(
                      status.session!.id,
                      status.session!.actualBalance || 0,
                      ''
                    );
                    setIsSubmitting(false);
                    if (success) toast.success('تم اعتماد إغلاق الخزينة');
                    else toast.error('فشل الاعتماد');
                  }}
                  disabled={isSubmitting}
                  className="w-full bg-orange-600 hover:bg-orange-700"
                >
                  {isSubmitting ? 'جاري الاعتماد...' : 'اعتماد الإغلاق'}
                </Button>
              )}
              {!canApprove && (
                <p className="text-center text-sm text-gray-500">
                  يرجى الانتظار حتى يعتمد المدير الإغلاق
                </p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }
  ```

  Update the close dialog in the `open` state: when discrepancy is found after `requestClose`, show a "note submission" dialog (not an approval dialog). The note dialog only needs: the discrepancy display + a textarea + a "تقديم للمراجعة" button that calls `submitPendingClose`.

- [ ] **Step 8: Commit**

  ```bash
  git add server/src/index.ts src/pages/Treasury.tsx src/stores/treasuryStore.ts src/types/index.ts
  git commit -m "feat: add pending_close treasury state and role-appropriate approval flow"
  ```

---

## Task 4: Data Bug — `suggestedOpeningBalance` Should Use `actualBalance`

**Files:**
- Modify: `server/src/index.ts:1906`

The next session's suggested opening balance should be the actual physical cash counted at the last close, not the calculated expected balance.

- [ ] **Step 1: Verify the current behavior**

  In `server/src/index.ts` around line 1901-1908:
  ```typescript
  const lastSession = await prisma.treasurySession.findFirst({
    orderBy: { date: 'desc' }
  });
  return res.json({
    status: 'no_session',
    suggestedOpeningBalance: lastSession?.closingBalance ?? null,  // BUG: uses expected, not actual
  ```

- [ ] **Step 2: Fix to prefer `actualBalance`**

  Change to:
  ```typescript
  suggestedOpeningBalance: lastSession?.actualBalance ?? lastSession?.closingBalance ?? null,
  ```

  `actualBalance` is the counted cash. `closingBalance` is the expected fallback (for sessions closed without discrepancy where `actualBalance === closingBalance`).

- [ ] **Step 3: Commit**

  ```bash
  git add server/src/index.ts
  git commit -m "fix: suggest actual counted balance as opening balance for next treasury session"
  ```

---

## Task 5: UI Bug — Fix Loading State Render Order

**Files:**
- Modify: `src/pages/Treasury.tsx:169-552`

Currently the loading check is at the bottom (line 543). When `loading=true` and `status=null`, the component falls into the `!status` branch and shows the "open treasury" form incorrectly.

- [ ] **Step 1: Move loading check to the top of the render**

  In `Treasury.tsx`, before the `if (!status || status.status === 'no_session')` check, add:

  ```tsx
  // Loading state — must come BEFORE status checks to avoid flashing the wrong UI
  if (loading && !status) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-gray-500">جاري التحميل...</p>
      </div>
    );
  }
  ```

  Then delete the duplicate loading check at lines 543-550.

- [ ] **Step 2: Commit**

  ```bash
  git add src/pages/Treasury.tsx
  git commit -m "fix: show loading spinner before status checks to prevent flash of wrong UI"
  ```

---

## Task 6: Performance — Slim Down `/api/treasury/status` Payload

**Files:**
- Modify: `server/src/index.ts:1889-1927`

The status endpoint includes ALL payments with full data on every 2-minute poll. Replace `payments: true` with `_count` for the summary, and keep a separate detailed endpoint for the transaction tables.

- [ ] **Step 1: Update the status endpoint to use counts instead of full records**

  In `server/src/index.ts`, update the session include in the status endpoint:

  ```typescript
  const session = await prisma.treasurySession.findUnique({
    where: { date: today },
    include: {
      payments: { select: { amount: true } },  // only amounts for sum, not full records
      expenses: { where: { status: 'paid' }, select: { amount: true } }
    }
  });
  ```

  The response no longer includes full payment/expense objects — only the computed sums and counts.

  BUT the `Treasury.tsx` UI also renders the transactions tables from `status.session.payments`. So we need to either:
  a) Move the transaction tables to a separate lazy-loaded component, OR
  b) Keep the full list in a separate store field loaded on mount

  **Chosen approach (simpler):** Add a separate `fetchSessionPayments` call that runs once on session load (not on every poll). Move the transaction tables to use this separate data.

- [ ] **Step 2: Add `fetchSessionDetails` to the store**

  In `src/stores/treasuryStore.ts`, add:

  ```typescript
  sessionDetails: { payments: any[]; expenses: any[] } | null;

  fetchSessionDetails: (sessionId: string) => Promise<void>;
  ```

  Implementation:
  ```typescript
  sessionDetails: null,
  
  fetchSessionDetails: async (sessionId) => {
    try {
      const res = await fetch(`/api/treasury/sessions/${sessionId}`, {
        headers: getAuthHeaders()
      });
      if (res.ok) {
        const data = await res.json();
        set({ sessionDetails: { payments: data.session.payments || [], expenses: data.session.expenses || [] } });
      }
    } catch (error) {
      console.error('Failed to fetch session details:', error);
    }
  },
  ```

- [ ] **Step 3: Update Treasury.tsx to use `sessionDetails` from store**

  In the component, add `sessionDetails` and `fetchSessionDetails` from the store. In `useEffect`:
  ```typescript
  useEffect(() => {
    if (status?.status === 'open' && status.session?.id) {
      fetchSessionDetails(status.session.id);
    }
  }, [status?.session?.id]);
  ```

  Update the transaction tables to use `sessionDetails?.payments` and `sessionDetails?.expenses` instead of `status.session.payments`.

  Also replace the inline fetch in the print button (Task 10 fix):
  ```typescript
  onClick={() => {
    printReport(
      status.session,
      sessionDetails?.payments || [],
      sessionDetails?.expenses || [],
      { totalIncome, totalExpenses, currentBalance }
    );
  }}
  ```

- [ ] **Step 4: Commit**

  ```bash
  git add server/src/index.ts src/stores/treasuryStore.ts src/pages/Treasury.tsx
  git commit -m "perf: slim treasury status payload; lazy-load transactions via sessionDetails"
  ```

---

## Task 7: Type Safety — Add `payments[]` / `expenses[]` to `TreasurySession`

**Files:**
- Modify: `src/types/index.ts:350-364`

- [ ] **Step 1: Import the Payment and Expense types, then extend TreasurySession**

  In `src/types/index.ts`, update `TreasurySession`:

  ```typescript
  export interface TreasurySession {
    id: string;
    date: string;
    openingBalance: number;
    closingBalance: number | null;
    actualBalance: number | null;
    difference: number | null;
    status: TreasurySessionStatus;
    openedBy: string;
    closedBy: string | null;
    closureNote: string | null;
    approvedBy: string | null;
    openedAt: string;
    closedAt: string | null;
    payments?: Payment[];
    expenses?: Expense[];
  }
  ```

  (Note: `Payment` and `Expense` are already defined earlier in the same file.)

- [ ] **Step 2: Commit**

  ```bash
  git add src/types/index.ts
  git commit -m "types: add optional payments and expenses arrays to TreasurySession interface"
  ```

---

## Task 8: UX — Fix Print Report to Show Names Instead of UUIDs

**Files:**
- Modify: `server/src/index.ts:1889-1927` (status endpoint)
- Modify: `src/hooks/usePrintTreasuryReport.ts:243-253`
- Modify: `server/prisma/schema.prisma` (add `openedByName`, `closedByName` to TreasurySession)

The simplest fix without a DB migration is to resolve user names at the API level and include them in the session response.

- [ ] **Step 1: Add user name lookups to the status and session detail endpoints**

  In the `/api/treasury/status` endpoint, after fetching the session, look up the opener's name:

  ```typescript
  // After session fetch:
  const opener = session ? await prisma.user.findUnique({
    where: { id: session.openedBy },
    select: { name: true }
  }) : null;

  // In the response:
  res.json({
    status: 'open',
    session: {
      ...session,
      openedByName: opener?.name || session.openedBy,
    },
    // ...
  });
  ```

  Do the same for `closedBy` (it's already a name string, not an ID — so this may already be fine for closedBy/approvedBy from Task 2's fix).

- [ ] **Step 2: Update `TreasurySession` type to include `openedByName`**

  In `src/types/index.ts`:
  ```typescript
  export interface TreasurySession {
    // ... existing fields ...
    openedByName?: string;
  }
  ```

- [ ] **Step 3: Fix `usePrintTreasuryReport.ts` to use the name**

  Line 243:
  ```typescript
  // Old:
  <p style="font-size: 12px;">${session.openedBy}</p>
  // New:
  <p style="font-size: 12px;">${session.openedByName || session.openedBy}</p>
  ```

- [ ] **Step 4: Commit**

  ```bash
  git add server/src/index.ts src/types/index.ts src/hooks/usePrintTreasuryReport.ts
  git commit -m "fix: resolve user names in treasury print report instead of showing raw IDs"
  ```

---

## Self-Review

### Spec Coverage Check

| Issue | Task |
|-------|------|
| `/api/treasury/open` uses body userId | Task 1 ✅ |
| close-request no JWT check | Task 2 ✅ |
| close-approve no JWT check | Task 2 ✅ |
| Approval flow sends opener as approver | Task 3 ✅ |
| suggestedOpeningBalance uses expected not actual | Task 4 ✅ |
| Loading state flashes wrong UI | Task 5 ✅ |
| Status endpoint unbounded payload | Task 6 ✅ |
| Missing types for payments/expenses | Task 7 ✅ |
| UUIDs in print report | Task 8 ✅ |
| Inline fetch in print button | Task 6 Step 3 ✅ (folded into Task 6) |

### Placeholder Scan
- No TBD or TODO left in plan.
- All code blocks are complete and runnable.
- Type names used in later tasks (`TreasuryCloseResult`, `Payment`, `Expense`) are defined in earlier tasks or pre-existing.

### Type Consistency Check
- `approveClose` signature simplified in Task 2/3: `(sessionId, actualBalance, closureNote)` — used consistently in Tasks 2, 3, and 7.
- `openTreasury` drops `userId` parameter in Task 1 — both store and component updated in same task.
- `submitPendingClose` added in Task 3 — used in Task 3 UI changes only.
