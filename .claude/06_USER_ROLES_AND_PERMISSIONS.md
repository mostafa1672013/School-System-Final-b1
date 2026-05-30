# User Roles & Permissions — El Shorouk School Management System

> **Document Type:** RBAC Specification
> **Status:** v1.0 — Foundation
> **Date:** May 2026
> **Document Owner:** Project Tech Lead

---

## 1. Overview

This document defines the complete Role-Based Access Control (RBAC) system for El Shorouk School Management System, including:

- **8 default roles** with their responsibilities and permissions
- **Permission catalog** (~150 atomic permissions)
- **Role-Permission Matrix**
- **Role Composition** (one user, multiple roles)
- **Segregation of Duties (SoD) rules**
- **Delegation mechanism**
- **Phase 2 additional roles**

**Key Principle:** All roles, permissions, and assignments are **configurable from the UI**. The defaults below are the starting point — the school can modify everything.

---

## 2. Default Roles Catalog

### 2.1 Role 1: System Administrator

**Held by:** Development team (us)

**Purpose:** Technical maintenance, deployment, and emergency access. Not an operational school role.

**Permissions:**
- `system.read_all` — Read access to all data for debugging
- `system.deploy` — Deploy code updates
- `system.manage_db` — Database administration
- `system.manage_backups` — Backup operations
- `system.view_audit_logs` — View all audit logs
- `system.manage_infrastructure` — Server, network, monitoring
- `system.emergency_data_modification` — Modify data with Principal approval

**Restrictions:**
- ❌ Cannot bypass audit logging (all actions logged)
- ❌ Cannot create operational user accounts
- ❌ Cannot modify financial transactions in normal operations
- ❌ Requires Principal approval for any data modification

**Special Notes:**
- 2FA mandatory
- All actions audit-logged with full request details
- Quarterly audit review with Principal
- Two-person rule for sensitive operations

---

### 2.2 Role 2: School Principal

**Held by:** School Principal

**Purpose:** Top authority, strategic decisions, system governance.

**Key Permissions:**

#### System Governance
- `system.configure_workflows` — Create/modify approval workflows
- `system.configure_roles` — Manage roles and permissions
- `system.configure_business_rules` — Modify business configurations
- `system.delegate_authority` — Authorize temporary delegations
- `system.view_audit_logs` — Access audit logs

#### Final Approvals
- `fees.discount.approve.unlimited` — Approve any discount
- `fees.full_exemption.approve` — Full fee exemption
- `purchase.approve.unlimited` — Approve any purchase
- `salary.modify.approve` — Approve salary changes
- `employee.terminate.approve` — Final termination approval
- `student.withdraw.approve` — Final withdrawal approval
- `payroll.run.approve` — Approve monthly payroll
- `journal_entry.approve_modification` — Approve journal modifications
- `sod_exception.approve` — Approve SoD overrides

#### Read All
- `*.read` — Read access to all modules and reports

---

### 2.3 Role 3: Chief Accountant

**Held by:** Chief Accountant

**Purpose:** Senior financial authority, supervises daily financial operations.

**Key Permissions:**

#### All Accountant Permissions, Plus:

#### Financial Approvals
- `fees.discount.approve.medium` — Approve medium discounts (configurable)
- `fees.discount.approve.large` — Approve large discounts (configurable)
- `fees.refund.approve` — Approve refunds
- `receipt.void.approve` — Approve receipt cancellations
- `journal_entry.create_special` — Create special accounting entries
- `journal_entry.modify_pending` — Modify pending entries
- `cashier.review_close` — Review daily cashier closing
- `cashier.shortage.approve` — Approve cashier shortages

#### Payroll
- `payroll.run` — Execute monthly payroll (subject to approval)
- `payroll.calculate` — Calculate payroll
- `payroll.review` — Review before approval

#### Reporting
- `reports.financial.full` — Full financial reports
- `reports.profit_loss` — P&L reports
- `reports.balance_sheet` — Balance sheet
- `reports.export` — Export reports

#### Procurement
- `purchase.approve.medium` — Approve medium purchases
- `supplier.payment.approve` — Approve supplier payments

---

### 2.4 Role 4: Accountant

**Held by:** Accountant (currently also handles Transport and Procurement)

**Purpose:** Daily financial operations.

**Key Permissions:**

#### Daily Financial Operations
- `fees.calculate` — Calculate student fees
- `fees.apply_discount.small` — Apply small discounts (within limit)
- `fees.installment.create` — Create installment plans
- `fees.installment.modify` — Modify installments
- `payment.collect` — Collect payments
- `receipt.create` — Issue receipts
- `receipt.print` — Print receipts
- `student.invoice.view` — View student invoices
- `student.invoice.modify` — Modify pending invoices

#### Cashier Operations (when also acting as Cashier)
- `cashier.open` — Open daily cashier
- `cashier.transaction` — Record transactions
- `cashier.close` — Close daily cashier
- `cashier.count` — Cash counting

#### Accounting
- `journal_entry.create_routine` — Create routine entries
- `journal_entry.view` — View entries
- `accounts.reconcile` — Daily reconciliation
- `accounts.view_receivables` — View receivables

#### Transport (currently bundled)
- `transport.subscription.create` — Create bus subscriptions
- `transport.subscription.view` — View subscriptions
- `transport.subscription.modify_basic` — Basic modifications
- `transport.invoice.process` — Process rental invoices
- `transport.report.view` — View transport reports

#### Procurement (currently bundled)
- `purchase.request.create` — Create purchase requests
- `purchase.request.view` — View requests
- `supplier.create` — Create suppliers
- `supplier.modify` — Modify suppliers
- `supplier.invoice.enter` — Enter supplier invoices

#### Reading
- `students.read` — View student data
- `reports.financial.basic` — Basic financial reports

---

### 2.5 Role 5: Cashier (Treasurer)

**Held by:** Currently bundled with Accountant role (additional role)

**Purpose:** Treasury operations only.

**Key Permissions:**

#### Cashier Operations
- `cashier.open` — Open daily cashier
- `cashier.collect_payment` — Collect cash payments
- `cashier.disburse` — Disburse cash (with approval)
- `cashier.transaction.view` — View transactions
- `cashier.count` — Daily cash count
- `cashier.close` — Close daily cashier (subject to SoD rules)
- `cashier.report.daily` — Daily cashier report
- `receipt.create` — Issue cash receipts
- `receipt.print` — Print receipts

**Restrictions (SoD):**
- Cannot perform `cashier.close` if collected >50% of day's transactions (without override)
- Cannot modify receipts after issuance
- Cannot create invoices (separation of duties)

---

### 2.6 Role 6: Warehouse Manager

**Held by:** Warehouse Manager

**Purpose:** Inventory operations across all 4 (extensible) divisions.

**Key Permissions:**

#### Inventory Master Data
- `inventory.category.read` — View categories
- `inventory.item.create` — Create items
- `inventory.item.modify` — Modify items
- `inventory.item.deactivate` — Deactivate items
- `inventory.warehouse.manage` — Manage warehouses

#### Stock Operations
- `inventory.receive_goods` — Receive goods (Goods Receipt)
- `inventory.issue` — Issue items
- `inventory.issue.skip_payment_check.request` — Request override for unpaid student
- `inventory.transfer` — Transfer between warehouses
- `inventory.return` — Process returns

#### Stock Counting
- `inventory.stock_count.initiate` — Start stock count (subject to SoD)
- `inventory.stock_count.record` — Record counts
- `inventory.adjustment.request` — Request stock adjustments

#### Procurement (Inventory-related)
- `inventory.purchase_request.create` — Create purchase requests
- `inventory.reorder.alert` — Reorder point alerts

#### Reporting
- `inventory.report.stock_levels` — Stock level reports
- `inventory.report.movement` — Movement reports
- `inventory.report.profitability` — Profitability per category
- `inventory.report.low_stock` — Low stock alerts

**Restrictions (SoD):**
- Cannot perform stock count for warehouse where they processed receipts (without override)

---

### 2.7 Role 7: HR Officer

**Held by:** HR Officer

**Purpose:** Human resources management.

**Key Permissions:**

#### Employee Management
- `employee.create` — Create employee records
- `employee.read` — View employee data
- `employee.modify_basic` — Modify basic info (non-financial)
- `employee.modify_salary.request` — Request salary changes (needs approval)
- `employee.contract.manage` — Manage contracts
- `employee.document.upload` — Upload documents (contracts, IDs)

#### Attendance
- `attendance.view` — View attendance records
- `attendance.modify` — Modify attendance (corrections)
- `attendance.report` — Attendance reports
- `attendance.device.sync` — Trigger ZKTeco sync

#### Leaves
- `leave.balance.view` — View leave balances
- `leave.request.process` — Process leave requests
- `leave.approve.short` — Approve short leaves (within limit)
- `leave.report` — Leave reports

#### Payroll Preparation
- `payroll.prepare` — Prepare monthly payroll
- `payroll.review` — Review before submission
- `payroll.submit_for_approval` — Submit for approval (cannot approve own work)
- `payslip.generate` — Generate payslips
- `payslip.distribute` — Distribute payslips

#### Loans/Advances
- `loan.request.process` — Process loan requests
- `loan.deduction.manage` — Manage payroll deductions

#### Reporting
- `hr.report.employees` — Employee reports
- `hr.report.payroll_summary` — Payroll summary
- `hr.report.attendance` — Attendance reports
- `hr.report.leaves` — Leave reports

**Restrictions (SoD):**
- Cannot approve `payroll.run` (only Chief Accountant + Principal)
- Cannot modify own data
- Cannot approve own leave

---

### 2.8 Role 8: Student Affairs Officer

**Held by:** Student Affairs Officer (currently also handles stage coordination)

**Purpose:** Student lifecycle management from application to graduation.

**Key Permissions:**

#### Application & Enrollment
- `student.application.create` — Create applications
- `student.application.modify` — Modify applications
- `student.application.submit_to_examination` — Move to "Under Examination"
- `student.exam.record_result` — Record exam results
- `student.fee_determination` — Determine fees based on stage/track
- `student.discount.request` — Request discounts (needs approval)
- `student.acceptance.process` — Process acceptances
- `student.activation` — Activate student in main records

#### Active Student Management
- `student.read` — View student data
- `student.modify_basic` — Modify basic info
- `student.modify_critical.request` — Request critical changes (needs approval)
- `student.transfer.process` — Process transfers between sections
- `student.withdrawal.process` — Process withdrawals
- `student.profile.view_360` — View Student 360° page

#### Family Management
- `family.create` — Create family records
- `family.modify` — Modify family info
- `family.link_student` — Link students to families

#### Stage Coordination (currently bundled)
- `stage.read` — View stage data
- `stage.report` — Stage-level reports
- `stage.student.list` — List students by stage

#### Reporting
- `student.report.demographic` — Demographic reports
- `student.report.enrollment` — Enrollment statistics
- `student.report.lifecycle` — Lifecycle status report

---

## 3. Permission Catalog Summary

The complete permission catalog has approximately 150 atomic permissions organized by module:

| Module | # Permissions | Examples |
|---|---|---|
| auth | 10 | login, logout, change_password, manage_2fa |
| users | 8 | create, read, modify, deactivate |
| rbac | 12 | role.create, permission.assign, etc. |
| students | 25 | application, fee_determination, discount, etc. |
| fees | 15 | calculate, apply_discount, refund, etc. |
| cashier | 12 | open, close, transaction, count |
| accounting | 18 | journal_entry, reconcile, etc. |
| inventory | 22 | receive, issue, count, adjust |
| procurement | 14 | request, approve, supplier mgmt |
| transport | 15 | subscription, contract, invoice |
| hr | 20 | employee, contract, document |
| attendance | 8 | view, modify, sync |
| leaves | 10 | request, approve, balance |
| payroll | 14 | calculate, run, approve, payslip |
| reports | 12 | financial, hr, inventory, transport |
| audit | 4 | view, search, export |
| system | 10 | configure, deploy, backup |
| sod | 6 | rule.create, exception.approve |
| workflow | 8 | create, modify, version, test |

**Total: ~150 permissions**

---

## 4. Role-Permission Matrix (Summary)

| Permission Category | Sys Admin | Principal | Chief Acc | Accountant | Cashier | Warehouse | HR | Student Affairs |
|---|---|---|---|---|---|---|---|---|
| System Configuration | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| User Management | ❌ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| All Reads | ✅ | ✅ | Mod. | Mod. | Min. | Min. | Min. | Min. |
| Discount Approval | ❌ | ✅ Unlim. | ✅ Med/Lg | ✅ Small | ❌ | ❌ | ❌ | Request |
| Fee Calculation | ❌ | ❌ | ✅ | ✅ | ❌ | ❌ | ❌ | ✅ |
| Cashier Operations | ❌ | View | View | ✅ | ✅ | ❌ | ❌ | ❌ |
| Accounting Entries | ❌ | View | ✅ Full | ✅ Routine | ❌ | ❌ | ❌ | ❌ |
| Inventory Operations | ❌ | View | ❌ | ❌ | ❌ | ✅ | ❌ | ❌ |
| Purchase Requests | ❌ | View | Approve | ✅ Create | ❌ | ✅ Create | ❌ | ❌ |
| Transport Subscriptions | ❌ | View | View | ✅ | ❌ | ❌ | ❌ | ❌ |
| Bus Rental Contracts | ❌ | Approve | Approve | View | ❌ | ❌ | ❌ | ❌ |
| Employee Data | ❌ | View | View | ❌ | ❌ | ❌ | ✅ | ❌ |
| Payroll Run | ❌ | Approve | ✅ Run | ❌ | ❌ | ❌ | Prepare | ❌ |
| Leave Approval | ❌ | ✅ All | View | ❌ | ❌ | ❌ | ✅ Short | ❌ |
| Student Application | ❌ | View | View | View | ❌ | ❌ | ❌ | ✅ |
| Student Activation | ❌ | View | View | View | ❌ | ❌ | ❌ | ✅ |
| 360° Student View | ❌ | ✅ | ✅ | ✅ | ❌ | View | ❌ | ✅ |
| Audit Logs | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Workflow Configuration | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |

**Legend:**
- ✅ = Full permission
- View = Read-only
- Mod. = Moderate (some sub-permissions)
- Min. = Minimal (own module only)
- ❌ = No permission

---

## 5. Role Composition (Multiple Roles per User)

### 5.1 Current El Shorouk Reality

The system fully supports a single user holding multiple roles simultaneously. Current setup at the school:

| User | Holds Roles |
|---|---|
| Principal | School Principal |
| Chief Accountant | Chief Accountant |
| Accountant (Mr./Mrs. X) | Accountant + Cashier + Transport (informal) + Procurement (informal) |
| Warehouse Manager | Warehouse Manager |
| HR Officer | HR Officer |
| Student Affairs (Mr./Mrs. Y) | Student Affairs Officer + Stage Coordinator (informal) |

### 5.2 Future Flexibility

When the school grows or hires specialized staff, splitting roles is **just an admin task**:

```
Currently:
Mr. X = Accountant + Cashier + Transport + Procurement

Future (after school hires dedicated Transport Officer):
Mr. X = Accountant + Cashier + Procurement
Mr. Z = Transport Officer (new hire)
```

**No code changes required.** The Principal goes to "User Management" → finds Mr. X → removes the Transport role → assigns it to Mr. Z.

### 5.3 Permission Aggregation

When a user has multiple roles, their effective permissions are the **union** of all their roles' permissions.

```python
def get_user_permissions(user_id: UUID) -> set[str]:
    """Returns the union of all permissions across user's roles."""
    user_roles = get_user_roles(user_id)
    permissions = set()
    
    for role in user_roles:
        role_perms = get_role_permissions(role.id)
        permissions.update(role_perms)
    
    return permissions
```

### 5.4 SoD Considerations with Role Composition

When a user has roles that would create SoD conflicts, the system:

1. **At role assignment time:** Warns the Principal that this combination creates SoD conflicts
2. **At operation time:** Detects the conflict and triggers override workflow

Example:
- Assigning both Cashier and Accountant to Mr. X creates conflict for `cashier.close` operation
- Principal can either: (a) accept (with periodic review), or (b) split the roles

---

## 6. Segregation of Duties (SoD) Rules

### 6.1 Default SoD Rules

| Rule ID | Conflicting Permissions | Severity | Override Workflow |
|---|---|---|---|
| SOD-001 | `cashier.collect_payment` ↔ `cashier.close_day` | Block | `sod_exception` |
| SOD-002 | `inventory.issue` ↔ `inventory.stock_count` | Block | `sod_exception` |
| SOD-003 | `payroll.prepare` ↔ `payroll.approve` | Block | None (cannot override) |
| SOD-004 | `procurement.create_supplier` ↔ `procurement.approve_invoice` | Warn | `sod_exception` |
| SOD-005 | `inventory.purchase_request.create` ↔ `inventory.purchase_request.approve` | Block | `sod_exception` |
| SOD-006 | `student.discount.request` ↔ `student.discount.approve` | Block | None |
| SOD-007 | `journal_entry.create` ↔ `journal_entry.approve_modification` | Warn | `sod_exception` |
| SOD-008 | `employee.modify_salary.request` ↔ `employee.modify_salary.approve` | Block | None |

### 6.2 SoD Detection Flow

```
[User attempts operation X on entity Y]
       ↓
[System: Check if user has performed conflicting operation Z on entity Y]
   (Look back: same day, same week, or always - configurable per rule)
       ↓
       ├── No conflict → Proceed normally
       │
       └── Conflict detected
           ↓
           [Check rule severity]
                ↓
                ├── 'log' → Log silently + proceed
                ├── 'warn' → Show warning + ask user to confirm + log
                ├── 'block' (no override) → Reject with reason
                └── 'block' (with override) → Trigger sod_exception workflow
                                              ↓
                                       [Principal approves/rejects]
                                              ↓
                                       [If approved: log + proceed]
                                       [If rejected: log + reject]
```

### 6.3 SoD Exception Reporting

Monthly report to Principal includes:
- All SoD conflicts detected
- All exceptions approved (by whom, why, when)
- Trends (any user repeatedly triggering exceptions?)
- Recommendations (should this rule be relaxed? Or this user's role split?)

---

## 7. Delegation Mechanism

### 7.1 Concept

When an authorized user is unavailable (vacation, illness, business trip), they can delegate their approval authority to another user **with Principal approval**.

### 7.2 Delegation Rules

- Delegations require Principal approval (workflow: `delegation_request`)
- Delegations have explicit start and end dates
- Can be scoped to specific workflow types or all
- Can be revoked early
- Audit-logged

### 7.3 Delegation Database

```sql
CREATE TABLE approval_delegations (
    id UUID PRIMARY KEY,
    delegator_id UUID REFERENCES users(id),
    delegate_id UUID REFERENCES users(id),
    workflow_type_id UUID REFERENCES approval_workflow_types(id), -- NULL = all
    starts_at TIMESTAMPTZ NOT NULL,
    ends_at TIMESTAMPTZ NOT NULL,
    reason TEXT,
    approved_by UUID REFERENCES users(id),
    approval_request_id UUID REFERENCES approval_requests(id),
    is_active BOOLEAN DEFAULT TRUE,
    revoked_at TIMESTAMPTZ,
    revoked_by UUID REFERENCES users(id),
    revoke_reason TEXT
);
```

### 7.4 Delegation in Workflow Execution

```python
def resolve_approver(step, payload, requester_id):
    base_approver = resolve_base_approver(step, payload)
    
    # Check active delegation
    delegation = get_active_delegation(
        delegator_id=base_approver.id,
        workflow_type=step.workflow_type,
        at=now()
    )
    
    if delegation:
        return delegation.delegate
    
    return base_approver
```

### 7.5 Delegation UI Flow

```
[Principal goes to "User Management" → "Delegations"]
       ↓
[Sees list of active delegations]
       ↓
[Creates new delegation:]
   - Who delegates? (Chief Accountant)
   - To whom? (Senior Accountant)
   - From when? (2026-06-01)
   - Until when? (2026-06-15)
   - Which workflows? (All / Specific)
   - Reason? (Vacation)
       ↓
[Submits → triggers delegation_request workflow]
       ↓
[Principal approves their own delegation request (loop)]
       ↓
[Delegation activated]
       ↓
[Notifications sent to delegator and delegate]
```

---

## 8. Student Enrollment Workflow (Detailed)

### 8.1 The Workflow

This is the **most important workflow** in the system, involving multiple roles.

```
┌──────────────────────────────────────────────────────────┐
│  STUDENT ENROLLMENT WORKFLOW                             │
└──────────────────────────────────────────────────────────┘

[Step 1: Application]
   Actor: Student Affairs Officer
   Action: Creates application with student data
   Status: "Applicant"
   Output: File fee receipt requested
        ↓
[Step 2: File Fee Payment]
   Actor: Cashier (or Accountant)
   Action: Collects file fee, issues receipt
   Status: "Under Examination"
        ↓
[Step 3: Examination (Offline)]
   Conducted by school's exam committee
        ↓
[Step 4: Result Recording]
   Actor: Student Affairs Officer
   Action: Records exam result
        ↓
   ├── Result: Failed → Status: "Rejected"
   │
   └── Result: Passed
        ↓
[Step 5: Fee Determination]
   Actor: Student Affairs Officer
   Action: Determines fees based on stage + track
   Calculation: Automatic based on configuration
        ↓
[Step 6: Optional Discount Request]
   Actor: Student Affairs Officer
   Action: Requests discount (if applicable)
   Types:
     - Basic discount (% off gross fees)
     - Additional discount (% off net after basic)
        ↓
   Submits to Approval Workflow Engine
   workflow_type = 'discount_basic' / 'discount_additional'
        ↓
   Approval routing per Configurable Workflow:
   IF discount ≤ 5% → Accountant
   ELIF discount ≤ 20% → Chief Accountant
   ELIF discount > 20% → Principal + Chief Accountant
   ELIF discount = 100% → Special workflow (Full Exemption)
        ↓
[Step 7: Family Acceptance]
   Family reviews final fees and accepts
   Status: "Accepted"
        ↓
[Step 8: Activation]
   Actor: Student Affairs Officer
   Action: Transfers to active students
   Status: "Active"
   Output: Student 360° page opens
        ↓
[Continuous: Student Lifecycle Tracking]
   - Fees and payments
   - Bus subscription
   - Books and uniforms (Inventory)
   - Attendance (Phase 2)
   - Academic records (Phase 2)
        ↓
[Eventual: Graduation / Withdrawal]
   - Status: "Graduated" / "Withdrawn"
   - Final clearance
   - Records archived
```

### 8.2 Two-Tier Discount Calculation

```python
def calculate_final_fees(
    gross_fees: Decimal,
    basic_discount_pct: Decimal,
    additional_discount_pct: Decimal,
) -> dict:
    """
    Calculate fees with two-tier discount system.
    
    Tier 1: Basic discount applies to gross
    Tier 2: Additional discount applies to net after basic
    """
    basic_discount_amount = gross_fees * (basic_discount_pct / 100)
    after_basic = gross_fees - basic_discount_amount
    
    additional_discount_amount = after_basic * (additional_discount_pct / 100)
    final_fees = after_basic - additional_discount_amount
    
    total_discount = basic_discount_amount + additional_discount_amount
    total_discount_pct = (total_discount / gross_fees) * 100
    
    return {
        'gross_fees': gross_fees.quantize(Decimal('0.01')),
        'basic_discount_pct': basic_discount_pct,
        'basic_discount_amount': basic_discount_amount.quantize(Decimal('0.01')),
        'after_basic': after_basic.quantize(Decimal('0.01')),
        'additional_discount_pct': additional_discount_pct,
        'additional_discount_amount': additional_discount_amount.quantize(Decimal('0.01')),
        'final_fees': final_fees.quantize(Decimal('0.01')),
        'total_discount_amount': total_discount.quantize(Decimal('0.01')),
        'total_discount_pct': total_discount_pct.quantize(Decimal('0.01')),
    }


# Example:
# gross = 30,000 EGP
# basic_discount = 10%
# additional_discount = 5%

# basic_discount_amount = 30,000 × 0.10 = 3,000
# after_basic = 30,000 - 3,000 = 27,000
# additional_discount_amount = 27,000 × 0.05 = 1,350
# final = 27,000 - 1,350 = 25,650
# total_discount = 4,350 (14.5% of gross)
```

---

## 9. Phase 2 Additional Roles

### 9.1 Teacher

**Permissions (planned for Phase 2B):**
- `class.read.assigned` — View assigned classes
- `student.read.in_class` — View students in their classes
- `grade.enter` — Enter grades
- `grade.modify_pending` — Modify pending grades
- `attendance.record_class` — Record class attendance
- `behavior.record` — Record behavior
- `homework.assign` — Assign homework

### 9.2 Head of Subject

**Permissions:** All Teacher permissions, plus:
- `grade.review.subject` — Review grades in their subject
- `grade.approve.final` — Approve final grades
- `teacher.coordinate.subject` — Coordinate subject teachers

### 9.3 Parent (Mobile App)

**Permissions:** Read-only access to their children:
- `student.read.own_children` — View own children
- `fee.read.own_children` — View fees of own children
- `payment.history.own_children` — Payment history
- `transport.subscription.read.own_children` — Bus subscription
- `attendance.read.own_children` — Attendance records (Phase 2)
- `grade.read.own_children` — Grades (Phase 2)
- `notification.receive` — Receive notifications

### 9.4 Student (Mobile App, Limited)

**Permissions (very limited):**
- `student.profile.read.self` — View own profile
- `grade.read.self` — View own grades (Phase 2)
- `attendance.read.self` — View own attendance (Phase 2)

---

## 10. Permission Configuration UI

### 10.1 Role Management Screen

The Principal accesses "Settings" → "Roles & Permissions":

```
┌──────────────────────────────────────────────────────────┐
│  Roles & Permissions Management                          │
├──────────────────────────────────────────────────────────┤
│                                                          │
│  [+ New Role]    [Import Template]                       │
│                                                          │
│  ┌────────────────────────────────────────────────────┐ │
│  │ Role                  │ Users │ Status │ Actions   │ │
│  ├────────────────────────────────────────────────────┤ │
│  │ ✅ System Admin       │   2   │  ✓     │ [View]    │ │
│  │ ✅ Principal          │   1   │  ✓     │ [Edit]    │ │
│  │ ✅ Chief Accountant   │   1   │  ✓     │ [Edit]    │ │
│  │ ✅ Accountant         │   2   │  ✓     │ [Edit]    │ │
│  │ ✅ Cashier            │   2   │  ✓     │ [Edit]    │ │
│  │ ✅ Warehouse Manager  │   1   │  ✓     │ [Edit]    │ │
│  │ ✅ HR Officer         │   1   │  ✓     │ [Edit]    │ │
│  │ ✅ Student Affairs    │   2   │  ✓     │ [Edit]    │ │
│  │ ✅ Custom Role: ...   │   3   │  ✓     │ [Edit]    │ │
│  └────────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────┘
```

### 10.2 Edit Role Screen

Shows the full permission catalog grouped by module:

```
┌──────────────────────────────────────────────────────────┐
│  Edit Role: Accountant                                   │
├──────────────────────────────────────────────────────────┤
│                                                          │
│  📂 Fees Module                                          │
│  ☑ fees.calculate                                        │
│  ☑ fees.apply_discount.small (limit: 5%)                 │
│  ☐ fees.apply_discount.medium                            │
│  ☐ fees.apply_discount.large                             │
│  ☑ fees.installment.create                               │
│  ☑ fees.installment.modify                               │
│  ...                                                     │
│                                                          │
│  📂 Cashier Module                                       │
│  ☑ cashier.open                                          │
│  ☑ cashier.transaction                                   │
│  ☑ cashier.close (⚠ may conflict with collect)          │
│  ...                                                     │
│                                                          │
│  📂 Transport Module                                     │
│  ☑ transport.subscription.create                         │
│  ☑ transport.subscription.view                           │
│  ☑ transport.subscription.modify_basic                   │
│  ...                                                     │
│                                                          │
│  [Cancel]    [Save Changes]                              │
└──────────────────────────────────────────────────────────┘
```

### 10.3 User-Role Assignment Screen

```
┌──────────────────────────────────────────────────────────┐
│  Edit User: Mr. Mohamed Ahmed                            │
├──────────────────────────────────────────────────────────┤
│                                                          │
│  Email: m.ahmed@elshorouk.com                            │
│  Status: ✓ Active                                        │
│                                                          │
│  Assigned Roles:                                         │
│  ☑ Accountant     (since 2026-09-01)                     │
│  ☑ Cashier        (since 2026-09-01)                     │
│  ☑ [+ Add Role]                                          │
│                                                          │
│  ⚠ SoD Warning: Accountant + Cashier may create          │
│     conflicts in: cashier.close operation                │
│                                                          │
│  Effective Permissions: 47 permissions [View Details]    │
│                                                          │
│  Active Delegations:                                     │
│  • Receiving from Chief Accountant (2026-06-01 to 06-15) │
│                                                          │
│  [Cancel]    [Save]                                      │
└──────────────────────────────────────────────────────────┘
```

---

## 11. Audit and Compliance

### 11.1 Permission-Related Audit Events

All these events are audit-logged:

- Role created / modified / deactivated
- Permission added to / removed from role
- User assigned to / removed from role
- Delegation created / approved / revoked
- SoD violation detected
- SoD exception approved
- Sensitive operation performed

### 11.2 Quarterly Permission Review

Recommended process:

1. Principal reviews all role assignments
2. Identifies stale assignments (e.g., user changed jobs)
3. Reviews SoD violations report
4. Adjusts roles or splits where appropriate

### 11.3 Compliance Considerations

- Egyptian Personal Data Protection Law: User access to PII is logged
- Financial regulations: Cannot bypass approval workflows
- Internal audit: All exceptions documented

---

## 12. Implementation Notes for Development

### 12.1 Permission Check Pattern

```python
# At every API endpoint
@api_view(['POST'])
def approve_discount(request, request_id):
    # 1. Authentication (handled by middleware)
    
    # 2. Permission check
    discount_pct = request.data.get('discount_pct')
    
    if not has_permission(
        user_id=request.user.id,
        permission_code='fees.discount.approve',
        context={'discount_pct': discount_pct}
    ):
        return Response({'error': 'Forbidden'}, status=403)
    
    # 3. SoD check
    sod_check = check_sod(
        user_id=request.user.id,
        operation='fees.discount.approve',
        entity_id=request_id
    )
    
    if sod_check.has_conflict and sod_check.severity == 'block':
        if not sod_check.can_override:
            return Response({'error': sod_check.reason}, status=403)
        else:
            # Trigger override workflow
            return Response({
                'error': 'SoD conflict',
                'override_required': True,
                'workflow_initiated': sod_check.override_request_id
            }, status=409)
    
    # 4. Proceed with operation
    result = approval_service.approve(request_id, request.user.id)
    return Response(result)
```

### 12.2 Caching Strategy

- User permissions cached in Redis (5 min TTL)
- Cache invalidated on role/permission change
- SoD rules cached (1 hour TTL)

### 12.3 Testing Requirements

- Unit tests for every permission check
- Integration tests for SoD detection
- E2E tests for approval workflows
- Specific tests for role composition edge cases

---

## 13. Summary

### 13.1 Key Takeaways

1. **8 default roles** cover current El Shorouk reality with flexibility for growth
2. **Role composition** allows multiple roles per user (current school's need)
3. **~150 atomic permissions** provide fine-grained control
4. **Configurable from UI** — Principal manages everything without code changes
5. **SoD with override** — strict by default, flexible when needed
6. **Delegation** — formal mechanism for temporary authority transfer
7. **Phase 2 ready** — additional roles for academic features

### 13.2 What's Configurable

- ✅ Role names and descriptions
- ✅ Permission assignments to roles
- ✅ User assignments to roles
- ✅ SoD rules and severity
- ✅ Delegation rules
- ✅ Approval workflow rules per permission

### 13.3 What's Hardcoded

- ❌ Permission codes (cannot rename `fees.calculate`)
- ❌ Permission semantics (what each permission grants)
- ❌ Authentication mechanism (login flow)
- ❌ Audit logging (cannot disable)
- ❌ Core security (encryption, password policy)

### 13.4 Default Configuration

The system ships with default roles and permissions that match El Shorouk's current reality. Principal can:

1. Use defaults as-is (recommended for first 30 days)
2. Adjust gradually based on real usage
3. Create custom roles when needed

---

*End of User Roles & Permissions Document*

> **Related Documents:**
> - `04_ARCHITECTURE.md` — Technical RBAC implementation
> - `07_APPROVAL_WORKFLOWS.md` — Detailed workflow specifications (Round 2)
> - `02_PROJECT_CHARTER.md` — Stakeholder roles
