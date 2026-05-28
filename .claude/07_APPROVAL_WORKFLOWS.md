# Approval Workflows — El Shorouk School Management System

> **Document Type:** Detailed Workflow Specifications
> **Status:** v1.0 — Foundation
> **Date:** May 2026
> **Document Owner:** Project Tech Lead

---

## 1. Purpose

This document provides the **detailed specifications** for the Configurable Approval Workflow Engine introduced in `04_ARCHITECTURE.md`. It covers:

- Complete specifications for all 30+ default workflow types
- Step-by-step definitions with conditions and approvers
- UI mockups for workflow management
- API contracts for workflow operations
- Testing strategy
- Patterns for adding new workflows

**Audience:** Backend developers, Frontend developers, QA team, Tech Lead.

---

## 2. Engine Concepts Recap

### 2.1 Core Hierarchy

```
WorkflowType (e.g., 'discount_basic')
    │
    ├── WorkflowDefinition v1 (active until 2026-08-31)
    │   ├── Step 1: Conditions + Approver
    │   ├── Step 2: Conditions + Approver
    │   └── Step 3: Conditions + Approver
    │
    └── WorkflowDefinition v2 (active from 2026-09-01)
        ├── Step 1: Conditions + Approver
        └── Step 2: Conditions + Approver

ApprovalRequest (active instance)
    └── ApprovalActions (audit trail)
```

### 2.2 Step Resolution Algorithm

When a request is submitted:

```python
def resolve_active_steps(workflow_definition, payload):
    """Returns the ordered list of steps that apply to this payload."""
    
    active_steps = []
    
    for step in workflow_definition.steps.order_by('step_number'):
        if evaluate_conditions(step.conditions, payload):
            active_steps.append(step)
    
    return active_steps
```

### 2.3 Condition Evaluation

```python
def evaluate_conditions(conditions, payload):
    """
    Evaluates all conditions on a step.
    Conditions combined with AND/OR logic.
    """
    if not conditions:
        return True  # No conditions = always applicable
    
    result = None
    
    for condition in conditions.order_by('id'):
        value = extract_value(payload, condition.field_path)
        passed = compare(value, condition.operator, condition.value)
        
        if result is None:
            result = passed
        elif condition.logical_op == 'AND':
            result = result and passed
        elif condition.logical_op == 'OR':
            result = result or passed
    
    return result
```

### 2.4 Approver Resolution

```python
def resolve_approver(step, payload, requester_id):
    """Returns the user(s) who must approve this step."""
    
    if step.approver_type == 'role':
        # Anyone with this role
        approvers = get_users_with_role(step.approver_role_id)
        return approvers
    
    elif step.approver_type == 'user':
        return [User.objects.get(id=step.approver_user_id)]
    
    elif step.approver_type == 'dynamic':
        # Resolve from payload
        user_id = extract_value(payload, step.approver_dynamic_rule['field'])
        return [User.objects.get(id=user_id)]
    
    elif step.approver_type == 'group':
        # Committee
        members = get_group_members(step.approver_group_id)
        if step.requires_all_in_group:
            return members  # All must approve
        else:
            return members  # Any single approval sufficient
    
    # Apply delegation
    return [apply_delegation(a, step.workflow_type, requester_id) 
            for a in approvers]
```

---

## 3. Workflow Configuration UI

### 3.1 Workflow List Screen

```
┌──────────────────────────────────────────────────────────────────┐
│  Approval Workflows                              [+ New Workflow] │
├──────────────────────────────────────────────────────────────────┤
│                                                                  │
│  Filter: [All Categories ▼]  [Active Only ☑]  Search: [_______] │
│                                                                  │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │ Workflow                  │ Cat.    │ Active Ver │ Status  │ │
│  ├────────────────────────────────────────────────────────────┤ │
│  │ 💰 Basic Discount         │ Finance │ v3         │ Active  │ │
│  │ 💰 Additional Discount    │ Finance │ v2         │ Active  │ │
│  │ 💰 Full Fee Exemption     │ Finance │ v1         │ Active  │ │
│  │ 💰 Fee Refund             │ Finance │ v1         │ Active  │ │
│  │ 🛒 Purchase Request Small │ Procur. │ v2         │ Active  │ │
│  │ 🛒 Purchase Request Large │ Procur. │ v1         │ Active  │ │
│  │ 📦 Stock Adjustment       │ Invent. │ v1         │ Active  │ │
│  │ 👥 Short Leave            │ HR      │ v1         │ Active  │ │
│  │ 👥 Long Leave             │ HR      │ v1         │ Active  │ │
│  │ 👥 Payroll Run            │ HR      │ v2         │ Active  │ │
│  │ 🎓 Student Acceptance     │ Student │ v1         │ Active  │ │
│  │ 🚌 Bus Subscription       │ Transp. │ v1         │ Active  │ │
│  │ 🚌 Bus Subscription Change│ Transp. │ v1         │ Active  │ │
│  │ 🚌 Rental Contract        │ Transp. │ v1         │ Active  │ │
│  │ ⚙️ SoD Exception           │ System  │ v1         │ Active  │ │
│  │ ⚙️ Delegation Request     │ System  │ v1         │ Active  │ │
│  │ ...                       │ ...     │ ...        │ ...     │ │
│  └────────────────────────────────────────────────────────────┘ │
│                                                                  │
│  Showing 1-20 of 30 workflows                                    │
└──────────────────────────────────────────────────────────────────┘
```

### 3.2 Workflow Builder (Edit Workflow)

```
┌──────────────────────────────────────────────────────────────────┐
│  Edit Workflow: Basic Discount                  [Save Draft] [▾]│
│  Type: discount_basic | Version: v3 (Active)                    │
├──────────────────────────────────────────────────────────────────┤
│                                                                  │
│  General                                                         │
│  Name (AR): [خصم أساسي                                ]         │
│  Name (EN): [Basic Discount                          ]          │
│  Effective from: [2026-09-01]   Effective to: [        ]        │
│  Allow delegation: ☑   Allow cancellation: ☐                    │
│  Requires attachment: ☐                                          │
│                                                                  │
│  ──────────────────────────────────────────────────────────────  │
│  Steps                                                  [+ Add]  │
│                                                                  │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │ Step 1                                            [✏ Edit] │ │
│  │ ───────                                                    │ │
│  │ Name: Small Discount Approval                              │ │
│  │ Conditions:                                                │ │
│  │   • discount_pct ≤ 5                                       │ │
│  │ Approver: Role = Accountant                                │ │
│  │ Timeout: 48 hours                                          │ │
│  │ Escalation: Chief Accountant                               │ │
│  └────────────────────────────────────────────────────────────┘ │
│                                                                  │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │ Step 2                                            [✏ Edit] │ │
│  │ ───────                                                    │ │
│  │ Name: Medium Discount Approval                             │ │
│  │ Conditions:                                                │ │
│  │   • discount_pct > 5 AND discount_pct ≤ 20                 │ │
│  │ Approver: Role = Chief Accountant                          │ │
│  │ Timeout: 72 hours                                          │ │
│  └────────────────────────────────────────────────────────────┘ │
│                                                                  │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │ Step 3                                            [✏ Edit] │ │
│  │ ───────                                                    │ │
│  │ Name: Large Discount Approval                              │ │
│  │ Conditions:                                                │ │
│  │   • discount_pct > 20                                      │ │
│  │ Approver: Group (Chief Accountant + Principal)             │ │
│  │           Requires all: ☑                                  │ │
│  │ Timeout: 5 days                                            │ │
│  └────────────────────────────────────────────────────────────┘ │
│                                                                  │
│  [Test Workflow]  [Activate]  [Discard]                          │
└──────────────────────────────────────────────────────────────────┘
```

### 3.3 Workflow Test Console

```
┌──────────────────────────────────────────────────────────────────┐
│  Test Workflow: Basic Discount v3 (Draft)                        │
├──────────────────────────────────────────────────────────────────┤
│                                                                  │
│  Test Payload (JSON):                                            │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │ {                                                          │ │
│  │   "student_id": "student-uuid",                            │ │
│  │   "fee_type": "tuition",                                   │ │
│  │   "discount_pct": 15,                                      │ │
│  │   "discount_amount": 4500,                                 │ │
│  │   "reason": "Sibling discount",                            │ │
│  │   "requested_by": "user-uuid"                              │ │
│  │ }                                                          │ │
│  └────────────────────────────────────────────────────────────┘ │
│                                                                  │
│  [Run Simulation]                                                │
│                                                                  │
│  ──────────────────────────────────────────────────────────────  │
│                                                                  │
│  Simulation Result:                                              │
│                                                                  │
│  Status: ✅ Workflow Valid                                       │
│                                                                  │
│  Active Steps:                                                   │
│  ✗ Step 1 (Small) — Skipped (discount_pct > 5)                   │
│  ✓ Step 2 (Medium) — Active                                      │
│      Approver: Chief Accountant (Mrs. Aisha)                     │
│      Timeout: 72 hours                                           │
│  ✗ Step 3 (Large) — Skipped (discount_pct ≤ 20)                  │
│                                                                  │
│  Total Approvers: 1                                              │
│  Estimated Approval Time: 1-3 business days                      │
│                                                                  │
│  Issues: None                                                    │
└──────────────────────────────────────────────────────────────────┘
```

### 3.4 Pending Approvals Inbox

User dashboard showing all pending approvals for current user:

```
┌──────────────────────────────────────────────────────────────────┐
│  My Pending Approvals (5)                          [Filter ▼]    │
├──────────────────────────────────────────────────────────────────┤
│                                                                  │
│  Urgent (1)                                                      │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │ 🔴 Discount Request — Student: Ahmed Mohamed                │ │
│  │    Type: Additional Discount (15%)                         │ │
│  │    Requested by: Mrs. Sara (Student Affairs)               │ │
│  │    Submitted: 2 days ago | Expires in: 6 hours             │ │
│  │    [View Details] [Approve] [Reject] [Delegate]            │ │
│  └────────────────────────────────────────────────────────────┘ │
│                                                                  │
│  Today (2)                                                       │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │ 🟡 Bus Subscription Change — Student: Yousef Ali            │ │
│  │    Type: Route change (mid-year)                           │ │
│  │    Pro-rata difference: +1,200 EGP                         │ │
│  │    Requested by: Mr. Khalid (Transport)                    │ │
│  │    [View Details] [Approve] [Reject]                       │ │
│  └────────────────────────────────────────────────────────────┘ │
│                                                                  │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │ 🟡 Purchase Request — IT Equipment                          │ │
│  │    Amount: 25,000 EGP                                      │ │
│  │    Items: 5 laptops for finance department                 │ │
│  │    Requested by: Mr. Mohamed (Accountant)                  │ │
│  │    [View Details] [Approve] [Reject]                       │ │
│  └────────────────────────────────────────────────────────────┘ │
│                                                                  │
│  This Week (2)                                                   │
│  ...                                                             │
└──────────────────────────────────────────────────────────────────┘
```

---

## 4. Detailed Workflow Specifications

For each workflow, the specification includes:

- **Code:** Internal identifier
- **Trigger:** When this workflow is initiated
- **Payload:** Required data fields
- **Default Steps:** Out-of-the-box configuration
- **Variations:** Common modifications schools might make
- **Integration:** Which modules submit and consume

---

### 4.1 Financial Workflows (9)

#### W-001: Basic Discount (`discount_basic`)

**Category:** Financial
**Entity Type:** student_fee
**Allow Delegation:** Yes
**Allow Cancellation:** Yes (before final approval)
**Requires Attachment:** Optional

**Trigger:** Student Affairs Officer requests a basic discount on student fees.

**Payload:**
```json
{
  "student_id": "uuid",
  "academic_year_id": "uuid",
  "fee_type": "tuition",
  "gross_amount": 30000.00,
  "discount_pct": 10.00,
  "discount_amount": 3000.00,
  "reason": "Sibling discount - 2nd child",
  "requested_by": "uuid"
}
```

**Default Steps:**

| Step | Conditions | Approver | Timeout | Escalation |
|---|---|---|---|---|
| 1 | discount_pct ≤ 5 | Role: Accountant | 48h | Chief Accountant |
| 2 | discount_pct > 5 AND ≤ 15 | Role: Chief Accountant | 72h | Principal |
| 3 | discount_pct > 15 | Group: Chief Acc + Principal (all) | 5 days | None |

**On Approval:**
- Update student fee record with discount
- Create audit log entry
- Notify requester
- Update student invoice if already generated

**On Rejection:**
- Notify requester with reason
- Optional: requester can resubmit with different parameters

**Common Variations:**
- Add a step requiring **two Accountants** for amounts > X EGP
- Reduce thresholds to 3% / 10% for stricter control
- Add **"Reason category"** check (sibling vs. need-based vs. merit)

---

#### W-002: Additional Discount (`discount_additional`)

**Category:** Financial
**Entity Type:** student_fee
**Trigger:** Discount applied AFTER basic discount (compounding).

**Payload:**
```json
{
  "student_id": "uuid",
  "fee_type": "tuition",
  "after_basic_amount": 27000.00,
  "additional_discount_pct": 5.00,
  "additional_discount_amount": 1350.00,
  "reason": "Special hardship case",
  "requested_by": "uuid"
}
```

**Default Steps:**

| Step | Conditions | Approver | Timeout |
|---|---|---|---|
| 1 | additional_discount_pct ≤ 10 | Role: Chief Accountant | 72h |
| 2 | additional_discount_pct > 10 | Group: Chief Acc + Principal (all) | 5 days |

---

#### W-003: Full Fee Exemption (`discount_full_exemption`)

**Category:** Financial
**Entity Type:** student_fee
**Trigger:** 100% fee exemption requested.

**Payload:**
```json
{
  "student_id": "uuid",
  "academic_year_id": "uuid",
  "fee_types": ["tuition", "transport", "books"],
  "total_amount_exempted": 35000.00,
  "reason": "Orphan / Severe hardship / Staff family",
  "supporting_documents": ["url1", "url2"],
  "requested_by": "uuid"
}
```

**Default Steps:**

| Step | Conditions | Approver | Timeout |
|---|---|---|---|
| 1 | Always | Group: Chief Acc + Principal + School Owner | 7 days |

**Special Notes:**
- Always requires attachments (documentation)
- Audit log marked as "highly sensitive"
- Annual review of all active exemptions

---

#### W-004: Fee Refund (`fee_refund`)

**Category:** Financial
**Entity Type:** student_fee
**Trigger:** Parent requests refund of paid fees.

**Payload:**
```json
{
  "student_id": "uuid",
  "receipt_id": "uuid",
  "original_amount": 5000.00,
  "refund_amount": 3000.00,
  "refund_reason": "Withdrawal mid-year",
  "refund_method": "bank_transfer",
  "bank_details": {...},
  "requested_by": "uuid"
}
```

**Default Steps:**

| Step | Conditions | Approver | Timeout |
|---|---|---|---|
| 1 | refund_amount ≤ 1000 | Role: Accountant | 48h |
| 2 | refund_amount > 1000 AND ≤ 10000 | Role: Chief Accountant | 72h |
| 3 | refund_amount > 10000 | Group: Chief Acc + Principal | 5 days |

---

#### W-005: Receipt Cancellation (`receipt_void`)

**Category:** Financial
**Entity Type:** receipt
**Trigger:** Cancel a previously issued receipt (e.g., wrong amount, duplicate).

**Payload:**
```json
{
  "receipt_id": "uuid",
  "amount": 2500.00,
  "void_reason": "Duplicate receipt",
  "requested_by": "uuid"
}
```

**Default Steps:**

| Step | Conditions | Approver | Timeout |
|---|---|---|---|
| 1 | Same day as receipt | Role: Cashier (different person) | 4h |
| 2 | Different day | Role: Chief Accountant | 24h |

**Special Notes:**
- Original receipt marked as "voided" (never deleted)
- Reversal journal entry auto-generated on approval

---

#### W-006: Journal Entry Modification (`journal_entry_modification`)

**Category:** Financial
**Entity Type:** journal_entry
**Trigger:** Modify a posted journal entry.

**Payload:**
```json
{
  "journal_entry_id": "uuid",
  "modification_type": "amount" | "account" | "description",
  "old_value": "...",
  "new_value": "...",
  "reason": "Correction of data entry error",
  "requested_by": "uuid"
}
```

**Default Steps:**

| Step | Conditions | Approver | Timeout |
|---|---|---|---|
| 1 | Same period (open) | Role: Chief Accountant | 24h |
| 2 | Closed period | Group: Chief Acc + Principal | 72h |

---

#### W-007: Salary Advance (`salary_advance`)

**Category:** Financial
**Entity Type:** loan
**Trigger:** Employee requests salary advance / loan.

**Payload:**
```json
{
  "employee_id": "uuid",
  "amount": 5000.00,
  "type": "advance" | "loan",
  "repayment_months": 6,
  "monthly_deduction": 833.33,
  "reason": "Medical emergency",
  "requested_by": "uuid"
}
```

**Default Steps:**

| Step | Conditions | Approver | Timeout |
|---|---|---|---|
| 1 | amount ≤ 1 month salary | Role: HR Officer | 48h |
| 2 | amount > 1 AND ≤ 3 months | Role: Chief Accountant | 72h |
| 3 | amount > 3 months | Group: Chief Acc + Principal | 5 days |

---

#### W-008: Salary Modification (`salary_modification`)

**Category:** Financial / HR
**Entity Type:** employee
**Trigger:** Permanent change to employee base salary.

**Payload:**
```json
{
  "employee_id": "uuid",
  "current_salary": 8000.00,
  "new_salary": 9500.00,
  "change_pct": 18.75,
  "effective_date": "2026-09-01",
  "reason": "Annual increment / Promotion",
  "requested_by": "uuid"
}
```

**Default Steps:**

| Step | Conditions | Approver | Timeout |
|---|---|---|---|
| 1 | Always | Group: HR Officer + Chief Accountant + Principal | 5 days |

**SoD Check:** Requester cannot be the employee receiving the change.

---

#### W-009: Cashier Shortage Approval (`cashier_shortage_approval`)

**Category:** Financial
**Entity Type:** cashier_close_session
**Trigger:** Daily cashier closing reveals shortage.

**Payload:**
```json
{
  "cashier_session_id": "uuid",
  "date": "2026-05-02",
  "expected_amount": 15000.00,
  "actual_amount": 14850.00,
  "shortage": 150.00,
  "explanation": "Possible counting error",
  "requested_by": "uuid"
}
```

**Default Steps:**

| Step | Conditions | Approver | Timeout |
|---|---|---|---|
| 1 | shortage ≤ 50 | Role: Chief Accountant | 24h |
| 2 | shortage > 50 AND ≤ 500 | Group: Chief Acc + Principal | 48h |
| 3 | shortage > 500 | Group: All financial roles + Principal | 72h |

**On Approval:**
- Shortage written off OR deducted from cashier salary (per policy)
- Investigation log opened for amounts > 500

---

### 4.2 Procurement Workflows (3)

#### W-010: Small Purchase Request (`purchase_request_small`)

**Category:** Procurement
**Entity Type:** purchase_request
**Trigger:** Standard purchase request.

**Payload:**
```json
{
  "items": [
    {"name": "...", "quantity": 10, "unit_price": 50.00, "total": 500.00}
  ],
  "total_amount": 2500.00,
  "supplier_id": "uuid",
  "department": "Finance",
  "justification": "Office supplies",
  "requested_by": "uuid"
}
```

**Default Steps:**

| Step | Conditions | Approver | Timeout |
|---|---|---|---|
| 1 | total ≤ 1000 | Role: Accountant | 24h |
| 2 | total > 1000 AND ≤ 5000 | Role: Chief Accountant | 48h |
| 3 | total > 5000 | Use `purchase_request_large` workflow |

---

#### W-011: Large Purchase Request (`purchase_request_large`)

**Category:** Procurement
**Entity Type:** purchase_request
**Trigger:** Large purchases requiring extensive approval.

**Default Steps:**

| Step | Conditions | Approver | Timeout |
|---|---|---|---|
| 1 | total > 5000 AND ≤ 25000 | Group: Chief Acc + Principal | 5 days |
| 2 | total > 25000 | Group: Chief Acc + Principal + School Owner | 7 days |

**Special Requirements:**
- Requires 3 quotations attached
- Justification document
- Budget verification

---

#### W-012: Supplier Payment (`supplier_payment`)

**Category:** Procurement
**Entity Type:** supplier_invoice
**Trigger:** Payment to supplier against invoice.

**Default Steps:**

| Step | Conditions | Approver | Timeout |
|---|---|---|---|
| 1 | amount ≤ 5000 | Role: Chief Accountant | 24h |
| 2 | amount > 5000 | Group: Chief Acc + Principal | 48h |

---

### 4.3 Inventory Workflows (3)

#### W-013: Issue Without Payment (`inventory_issue_unpaid`)

**Category:** Inventory
**Entity Type:** inventory_issue
**Trigger:** Issue items to student who hasn't paid yet.

**Payload:**
```json
{
  "student_id": "uuid",
  "items": [...],
  "total_value": 800.00,
  "outstanding_balance": 800.00,
  "reason": "Family will pay tomorrow / Approved credit",
  "requested_by": "uuid"
}
```

**Default Steps:**

| Step | Conditions | Approver | Timeout |
|---|---|---|---|
| 1 | total_value ≤ 500 | Role: Accountant | 4h |
| 2 | total_value > 500 | Role: Chief Accountant | 24h |

---

#### W-014: Stock Adjustment (`inventory_adjustment`)

**Category:** Inventory
**Entity Type:** inventory_adjustment
**Trigger:** After stock count reveals discrepancy.

**Payload:**
```json
{
  "warehouse_id": "uuid",
  "items": [
    {"item_id": "uuid", "expected_qty": 100, "actual_qty": 95, "variance": -5}
  ],
  "total_value_variance": -250.00,
  "explanation": "Possible damage during handling",
  "requested_by": "uuid"
}
```

**Default Steps:**

| Step | Conditions | Approver | Timeout |
|---|---|---|---|
| 1 | abs(value_variance) ≤ 1000 | Role: Warehouse Manager + Chief Accountant | 48h |
| 2 | abs(value_variance) > 1000 | Group: Warehouse + Chief Acc + Principal | 5 days |

---

#### W-015: Stock Write-off (`inventory_writeoff`)

**Category:** Inventory
**Entity Type:** inventory_writeoff
**Trigger:** Damaged or obsolete items removed from stock.

**Default Steps:**

| Step | Conditions | Approver | Timeout |
|---|---|---|---|
| 1 | value ≤ 500 | Role: Warehouse Manager + Chief Accountant | 48h |
| 2 | value > 500 | Group: Warehouse + Chief Acc + Principal | 5 days |

**Special Requirements:**
- Photos attached for damaged items
- Disposal method documented

---

### 4.4 HR Workflows (6)

#### W-016: Short Leave (`leave_short`)

**Category:** HR
**Entity Type:** leave_request
**Trigger:** Employee leave request ≤ X days.

**Payload:**
```json
{
  "employee_id": "uuid",
  "leave_type": "annual" | "sick" | "casual",
  "start_date": "2026-06-15",
  "end_date": "2026-06-17",
  "days": 3,
  "reason": "Personal",
  "covering_employee_id": "uuid",
  "requested_by": "uuid"
}
```

**Default Steps:**

| Step | Conditions | Approver | Timeout |
|---|---|---|---|
| 1 | days ≤ 3 | Role: HR Officer | 24h |
| 2 | days > 3 AND ≤ 7 | Role: HR Officer + Direct Manager | 48h |

---

#### W-017: Long Leave (`leave_long`)

**Category:** HR
**Trigger:** Leave > 7 days.

**Default Steps:**

| Step | Conditions | Approver | Timeout |
|---|---|---|---|
| 1 | Always | Role: HR Officer + Direct Manager + Principal | 5 days |

**Special Requirements:**
- Coverage plan required
- For sick leave > 14 days: medical certificate

---

#### W-018: Unpaid Leave (`leave_unpaid`)

**Default Steps:**

| Step | Conditions | Approver | Timeout |
|---|---|---|---|
| 1 | Any duration | Group: HR + Chief Accountant + Principal | 5 days |

---

#### W-019: Employee Termination (`employee_termination`)

**Category:** HR
**Entity Type:** employee
**Trigger:** End of employment.

**Payload:**
```json
{
  "employee_id": "uuid",
  "termination_type": "resignation" | "termination" | "end_of_contract",
  "effective_date": "2026-08-31",
  "reason": "...",
  "end_of_service_calculation": {
    "years_of_service": 5,
    "monthly_salary": 9000.00,
    "gratuity": 22500.00,
    "unused_leave_days": 12,
    "leave_payout": 4500.00,
    "total_settlement": 27000.00
  },
  "requested_by": "uuid"
}
```

**Default Steps:**

| Step | Conditions | Approver | Timeout |
|---|---|---|---|
| 1 | Always | Group: HR + Chief Acc + Principal | 7 days |

**Special Requirements:**
- Clearance from all departments
- Asset return checklist
- Final settlement calculation

---

#### W-020: Employee Promotion (`employee_promotion`)

**Default Steps:**

| Step | Conditions | Approver | Timeout |
|---|---|---|---|
| 1 | Same dept | Role: Direct Manager + HR | 72h |
| 2 | Cross-dept or large salary jump | Group: Manager + HR + Principal | 5 days |

---

#### W-021: Payroll Run (`payroll_run`)

**Category:** HR
**Entity Type:** payroll_run
**Trigger:** Monthly payroll execution.

**Payload:**
```json
{
  "payroll_period": "2026-05",
  "employee_count": 100,
  "gross_total": 850000.00,
  "deductions_total": 175000.00,
  "net_total": 675000.00,
  "tax_total": 95000.00,
  "insurance_total": 85000.00,
  "bus_deductions_total": 12000.00,
  "loan_deductions_total": 8000.00,
  "prepared_by": "uuid",
  "summary_report_url": "..."
}
```

**Default Steps:**

| Step | Conditions | Approver | Timeout |
|---|---|---|---|
| 1 | Always | Role: Chief Accountant | 24h |
| 2 | Always | Role: Principal | 24h |

**Special Notes:**
- HR Officer cannot approve (SoD with prepare)
- Comparison with previous month auto-attached
- Variance report highlighted

---

### 4.5 Students Workflows (3)

#### W-022: New Student Acceptance (`student_registration_acceptance`)

**Category:** Students
**Entity Type:** student_application
**Trigger:** After student passes entrance exam, family accepts fees.

**Payload:**
```json
{
  "application_id": "uuid",
  "student_data": {...},
  "family_data": {...},
  "stage_id": "uuid",
  "track_id": "uuid",
  "agreed_fees": 30000.00,
  "approved_discounts": [...],
  "exam_score": 85,
  "requested_by": "uuid"
}
```

**Default Steps:**

| Step | Conditions | Approver | Timeout |
|---|---|---|---|
| 1 | Standard cases | Role: Student Affairs Officer | 24h |
| 2 | International track | Role: Student Affairs + Principal | 48h |
| 3 | Special cases (siblings, scholarships) | Role: Principal | 72h |

**On Approval:**
- Student record created in main students table
- Initial invoice generated
- Welcome email sent
- Student 360° page initialized

---

#### W-023: Student Data Modification (`student_data_modification`)

**Category:** Students
**Trigger:** Modify student data after registration.

**Default Steps:**

| Step | Conditions | Approver | Timeout |
|---|---|---|---|
| 1 | Non-critical fields | Role: Student Affairs Officer | 24h |
| 2 | Critical fields (national ID, name, DOB) | Role: Student Affairs + Principal | 48h |

**Critical Fields List:**
- National ID
- Full name (legal)
- Date of birth
- Gender
- Religion
- Family relationship structure

---

#### W-024: Student Withdrawal (`student_withdrawal`)

**Category:** Students
**Trigger:** Family requests student withdrawal.

**Payload:**
```json
{
  "student_id": "uuid",
  "withdrawal_reason": "Relocation",
  "withdrawal_date": "2026-06-01",
  "outstanding_balance": 5000.00,
  "refund_due": 0.00,
  "requested_by": "uuid"
}
```

**Default Steps:**

| Step | Conditions | Approver | Timeout |
|---|---|---|---|
| 1 | Always | Role: Student Affairs Officer | 24h |
| 2 | If refund due > 0 | Use `fee_refund` workflow |
| 3 | Final | Role: Principal | 48h |

**On Approval:**
- Student status → "Withdrawn"
- Bus subscription cancelled (if active)
- Final settlement calculated
- Records archived

---

### 4.6 Transport Workflows (7)

#### W-025: Bus Subscription Create (`transport_subscription_create`)

**Category:** Transport
**Entity Type:** bus_subscription
**Trigger:** New bus subscription for student/employee/supervisor.

**Payload:**
```json
{
  "subscriber_type": "student" | "employee" | "supervisor",
  "subscriber_id": "uuid",
  "route_id": "uuid",
  "bus_id": "uuid",
  "academic_year_id": "uuid",
  "start_date": "2026-09-01",
  "end_date": "2027-06-30",
  "full_fee_amount": 6000.00,
  "discount_pct": 50.00,
  "net_fee_amount": 3000.00,
  "requested_by": "uuid"
}
```

**Default Steps:**

| Step | Conditions | Approver | Timeout |
|---|---|---|---|
| 1 | Standard student/employee | Role: Accountant | 24h |
| 2 | Supervisor (free) | Role: Chief Accountant | 24h |
| 3 | Special case (route capacity exception) | Role: Principal | 48h |

---

#### W-026: Bus Subscription Change (`transport_subscription_change`)

**Category:** Transport
**Entity Type:** bus_subscription
**Trigger:** Mid-year change (route, bus).

**Payload:**
```json
{
  "subscription_id": "uuid",
  "change_type": "route_change" | "bus_change",
  "previous_route_id": "uuid",
  "new_route_id": "uuid",
  "change_date": "2026-02-15",
  "months_remaining": 4,
  "previous_fee_remaining": 2400.00,
  "new_fee_remaining": 3200.00,
  "pro_rata_difference": 800.00,
  "settlement_method": "add_to_invoice" | "payroll_deduction",
  "requested_by": "uuid"
}
```

**Default Steps:**

| Step | Conditions | Approver | Timeout |
|---|---|---|---|
| 1 | difference == 0 | Role: Accountant | 24h |
| 2 | difference > 0 (subscriber pays more) | Role: Accountant | 24h |
| 3 | difference < 0 AND abs(difference) ≤ 500 | Role: Chief Accountant | 48h |
| 4 | difference < 0 AND abs(difference) > 500 | Group: Chief Acc + Principal | 72h |

**On Approval:**
- Subscription updated
- Settlement record created
- For students: receivable updated
- For employees: payroll deduction registered
- Journal entry generated

---

#### W-027: Bus Subscription Cancel (`transport_subscription_cancel`)

**Category:** Transport
**Trigger:** Mid-year cancellation.

**Default Steps:**

| Step | Conditions | Approver | Timeout |
|---|---|---|---|
| 1 | Always | Role: Accountant + Chief Accountant | 48h |
| 2 | If refund due | Use `transport_subscription_refund` workflow |

---

#### W-028: Bus Fee Refund (`transport_subscription_refund`)

**Category:** Transport
**Trigger:** Refund of bus fees.

**Default Steps:**

| Step | Conditions | Approver | Timeout |
|---|---|---|---|
| 1 | refund_amount ≤ 1000 | Role: Chief Accountant | 48h |
| 2 | refund_amount > 1000 | Group: Chief Acc + Principal | 72h |

**Note:** Default refund method = "credit balance" (not cash).

---

#### W-029: Rental Contract Create (`bus_rental_contract_create`)

**Category:** Transport
**Entity Type:** bus_rental_contract
**Trigger:** New contract with rental company.

**Payload:**
```json
{
  "company_id": "uuid",
  "contract_number": "RC-2026-001",
  "start_date": "2026-09-01",
  "end_date": "2027-08-31",
  "monthly_fee": 8000.00,
  "total_value": 96000.00,
  "buses_count": 5,
  "includes": ["driver", "fuel", "maintenance", "insurance"],
  "payment_terms": "monthly",
  "auto_renewal": false,
  "attachments": ["contract.pdf"],
  "requested_by": "uuid"
}
```

**Default Steps:**

| Step | Conditions | Approver | Timeout |
|---|---|---|---|
| 1 | total_value ≤ 50000 | Group: Accountant + Chief Accountant | 5 days |
| 2 | total_value > 50000 | Group: Chief Acc + Principal | 7 days |

---

#### W-030: Rental Contract Renewal (`bus_rental_contract_renewal`)

**Category:** Transport
**Trigger:** Renewing existing contract.

**Default Steps:**

| Step | Conditions | Approver | Timeout |
|---|---|---|---|
| 1 | Same terms or better | Role: Chief Accountant | 5 days |
| 2 | Increased terms | Group: Chief Acc + Principal | 7 days |

**Special Notes:**
- Auto-triggered 60 days before contract expiry
- Performance report attached
- Comparison with market rates suggested

---

#### W-031: Rental Invoice Payment (`bus_rental_invoice_payment`)

**Category:** Transport
**Entity Type:** bus_rental_invoice
**Trigger:** Pay monthly rental invoice.

**Payload:**
```json
{
  "invoice_id": "uuid",
  "contract_id": "uuid",
  "company_id": "uuid",
  "invoice_number": "INV-2026-05-001",
  "invoice_date": "2026-05-01",
  "period_from": "2026-05-01",
  "period_to": "2026-05-31",
  "amount": 8000.00,
  "due_date": "2026-05-15",
  "approved_by_transport": "uuid",
  "requested_by": "uuid"
}
```

**Default Steps:**

| Step | Conditions | Approver | Timeout |
|---|---|---|---|
| 1 | Amount matches contract | Role: Chief Accountant | 48h |
| 2 | Amount differs from contract | Group: Transport + Chief Acc + Principal | 72h |

---

### 4.7 System Workflows (4)

#### W-032: Delegation Request (`delegation_request`)

**Category:** System
**Entity Type:** approval_delegation
**Trigger:** User requests temporary delegation of approval authority.

**Payload:**
```json
{
  "delegator_id": "uuid",
  "delegate_id": "uuid",
  "workflow_type_id": "uuid_or_null",
  "starts_at": "2026-06-01T00:00:00Z",
  "ends_at": "2026-06-15T23:59:59Z",
  "reason": "Annual vacation",
  "requested_by": "uuid"
}
```

**Default Steps:**

| Step | Conditions | Approver | Timeout |
|---|---|---|---|
| 1 | Always | Role: Principal | 24h |

**Special Notes:**
- Principal's own delegations require School Owner approval
- Delegations cannot exceed 30 days without renewal

---

#### W-033: SoD Exception (`sod_exception`)

**Category:** System
**Entity Type:** sod_violation
**Trigger:** User attempts operation that violates SoD rule.

**Payload:**
```json
{
  "violation_id": "uuid",
  "user_id": "uuid",
  "attempted_operation": "cashier.close_day",
  "conflicting_operation": "cashier.collect_payment",
  "entity_type": "cashier_session",
  "entity_id": "uuid",
  "justification": "No other cashier available today"
}
```

**Default Steps:**

| Step | Conditions | Approver | Timeout |
|---|---|---|---|
| 1 | Always | Role: Principal | 4h (urgent) |

**Special Notes:**
- All exceptions reported in monthly compliance report
- Pattern detection: same user repeatedly requesting overrides

---

#### W-034: Permission Change (`permission_change`)

**Category:** System
**Entity Type:** role_permission
**Trigger:** Add/remove permission from a role.

**Default Steps:**

| Step | Conditions | Approver | Timeout |
|---|---|---|---|
| 1 | Standard permissions | Role: Principal | 24h |
| 2 | Sensitive permissions (`*.approve`, financial) | Group: Principal + School Owner | 48h |

---

#### W-035: Critical Configuration Change (`configuration_change_critical`)

**Category:** System
**Entity Type:** system_configuration
**Trigger:** Change to critical config (tax rates, insurance %, fee structures, etc.)

**Payload:**
```json
{
  "config_key": "tax.brackets.2026",
  "old_value": {...},
  "new_value": {...},
  "effective_date": "2026-09-01",
  "reason": "New government regulation",
  "supporting_document": "url",
  "requested_by": "uuid"
}
```

**Default Steps:**

| Step | Conditions | Approver | Timeout |
|---|---|---|---|
| 1 | Always | Group: Chief Accountant + Principal | 48h |

---

## 5. API Contracts

### 5.1 Submit Approval Request

**POST** `/api/v1/workflows/requests`

**Request:**
```json
{
  "workflow_type_code": "discount_basic",
  "entity_type": "student_fee",
  "entity_id": "uuid",
  "payload": {
    "student_id": "uuid",
    "fee_type": "tuition",
    "discount_pct": 10
  },
  "attachments": ["url1", "url2"]
}
```

**Response:**
```json
{
  "request_id": "uuid",
  "status": "pending",
  "current_step": {
    "step_number": 2,
    "name": "Medium Discount Approval",
    "approver": {
      "type": "role",
      "name": "Chief Accountant",
      "users": [{"id": "uuid", "name": "Mrs. Aisha"}]
    },
    "timeout_at": "2026-05-05T15:30:00Z"
  },
  "submitted_at": "2026-05-02T15:30:00Z"
}
```

### 5.2 Approve Request

**POST** `/api/v1/workflows/requests/{request_id}/approve`

**Request:**
```json
{
  "comments": "Approved per sibling discount policy",
  "attachments": ["url"]
}
```

**Response:**
```json
{
  "action_id": "uuid",
  "request_id": "uuid",
  "new_status": "approved" | "pending_next_step",
  "next_step": {...} | null
}
```

### 5.3 Reject Request

**POST** `/api/v1/workflows/requests/{request_id}/reject`

**Request:**
```json
{
  "reason": "Insufficient documentation"
}
```

### 5.4 Delegate Request

**POST** `/api/v1/workflows/requests/{request_id}/delegate`

**Request:**
```json
{
  "delegate_to_id": "uuid",
  "reason": "Out of office today"
}
```

### 5.5 List Pending Approvals

**GET** `/api/v1/workflows/requests/pending`

**Query Params:**
- `urgency`: urgent | today | week | all
- `category`: financial | hr | etc.
- `entity_type`: student_fee | leave_request | etc.

**Response:**
```json
{
  "count": 5,
  "results": [
    {
      "request_id": "uuid",
      "workflow_type": "...",
      "entity": {...},
      "submitted_at": "...",
      "timeout_at": "...",
      "is_urgent": true,
      "summary": "..."
    }
  ]
}
```

### 5.6 Workflow Management

**POST** `/api/v1/workflows/definitions` — Create new definition (draft)
**PUT** `/api/v1/workflows/definitions/{id}` — Update draft
**POST** `/api/v1/workflows/definitions/{id}/activate` — Activate (deactivates previous)
**POST** `/api/v1/workflows/definitions/{id}/test` — Test with sample payload

---

## 6. Testing Strategy

### 6.1 Unit Tests

For each workflow type:
- Conditions evaluation (all combinations)
- Approver resolution (all 4 types)
- Step skipping logic
- Multi-step transitions
- Delegation application
- Timeout/escalation logic

**Target:** 100% code coverage for the engine, 95% for individual workflows.

### 6.2 Integration Tests

End-to-end workflow execution:
- Submit → Approve → Status change in target entity
- Submit → Reject → No status change
- Submit → Delegate → Re-approve
- Submit → Timeout → Escalate
- Multi-step: Submit → Approve step 1 → Submit step 2 approver

### 6.3 Specific Test Scenarios

**Discount Workflow Tests:**

```python
def test_discount_basic_small_amount():
    request = submit_request(
        workflow_type='discount_basic',
        payload={'discount_pct': 3, ...}
    )
    assert request.current_step.step_number == 1
    assert request.current_step.approver.role == 'accountant'

def test_discount_basic_medium_amount():
    request = submit_request(
        workflow_type='discount_basic',
        payload={'discount_pct': 10, ...}
    )
    assert request.current_step.step_number == 2
    assert request.current_step.approver.role == 'chief_accountant'

def test_discount_basic_with_delegation():
    create_delegation(
        delegator='chief_accountant_user',
        delegate='senior_accountant_user',
        workflow='discount_basic',
        active_now=True,
    )
    request = submit_request(
        workflow_type='discount_basic',
        payload={'discount_pct': 10, ...}
    )
    assert request.current_step.approver_user == 'senior_accountant_user'
```

**Bus Subscription Change Tests:**

```python
def test_bus_change_zero_difference():
    request = submit_request(
        workflow_type='transport_subscription_change',
        payload={'pro_rata_difference': 0, ...}
    )
    assert request.current_step.approver.role == 'accountant'

def test_bus_change_large_refund():
    request = submit_request(
        workflow_type='transport_subscription_change',
        payload={'pro_rata_difference': -1500, ...}
    )
    # Group approval required
    assert request.current_step.approver.type == 'group'
    assert 'principal' in [a.role for a in request.current_step.approver.users]
```

### 6.4 Manual UAT Checklist

For each workflow before MVP-1 Go-Live:

- [ ] Submit happy path → completes successfully
- [ ] Submit each conditional path → routes correctly
- [ ] Approve → entity updated correctly
- [ ] Reject → entity unchanged, requester notified
- [ ] Delegate → approval authority transferred
- [ ] Timeout → escalates correctly
- [ ] Cancel (if allowed) → request voided
- [ ] Workflow modification → new version created, in-flight unaffected
- [ ] Audit log → all actions captured

---

## 7. Implementation Patterns

### 7.1 How to Submit a Request from a Module

```python
# In modules/students/services.py

from modules.core.workflow.public import workflow_service

def request_discount(student_id, discount_pct, requested_by):
    # Calculate amounts
    fee = get_student_fee(student_id)
    discount_amount = fee.amount * (discount_pct / 100)
    
    # Submit workflow request
    request = workflow_service.submit_request(
        workflow_type_code='discount_basic',
        entity_type='student_fee',
        entity_id=fee.id,
        payload={
            'student_id': str(student_id),
            'fee_type': fee.fee_type,
            'gross_amount': str(fee.amount),
            'discount_pct': str(discount_pct),
            'discount_amount': str(discount_amount),
        },
        requester_id=requested_by,
    )
    
    return request
```

### 7.2 How to Listen for Approval Events

```python
# In modules/students/signals.py

from modules.core.workflow.signals import workflow_approved

@receiver(workflow_approved, sender='discount_basic')
def handle_discount_approved(sender, request, **kwargs):
    """Apply the discount when approved."""
    
    student_id = request.payload['student_id']
    discount_pct = Decimal(request.payload['discount_pct'])
    fee = get_student_fee_by_request(request)
    
    apply_discount(fee, discount_pct, approved_by=request.last_approver)
    
    # Update student invoice
    regenerate_invoice(student_id)
    
    # Notify family
    notify_family_of_discount(student_id, discount_pct)
```

### 7.3 Adding a New Workflow Type

**Step 1:** Create migration with workflow type:

```python
# migrations/000X_add_new_workflow.py
def add_workflow(apps, schema_editor):
    WorkflowType = apps.get_model('workflow', 'WorkflowType')
    WorkflowType.objects.create(
        code='my_new_workflow',
        name_ar='سير العمل الجديد',
        name_en='My New Workflow',
        category='financial',
        entity_type='my_entity',
        is_system_defined=True,
    )
```

**Step 2:** Define default workflow in Python:

```python
# modules/my_module/workflows.py

DEFAULT_WORKFLOW = {
    'type_code': 'my_new_workflow',
    'version': 1,
    'effective_from': '2026-09-01',
    'steps': [
        {
            'step_number': 1,
            'name': 'Initial Approval',
            'approver_type': 'role',
            'approver_role_code': 'accountant',
            'conditions': [
                {'field': 'amount', 'op': '<=', 'value': 1000},
            ],
            'timeout_hours': 24,
        },
        {
            'step_number': 2,
            'name': 'Senior Approval',
            'approver_type': 'role',
            'approver_role_code': 'chief_accountant',
            'conditions': [
                {'field': 'amount', 'op': '>', 'value': 1000},
            ],
            'timeout_hours': 48,
        },
    ],
}
```

**Step 3:** Submit from your module:

```python
workflow_service.submit_request(
    workflow_type_code='my_new_workflow',
    entity_type='my_entity',
    entity_id=entity.id,
    payload={'amount': 1500, ...},
    requester_id=user.id,
)
```

**Step 4:** Listen for approval:

```python
@receiver(workflow_approved, sender='my_new_workflow')
def handle_my_workflow_approved(sender, request, **kwargs):
    # Do something
    pass
```

**Step 5:** Test:

```python
def test_my_new_workflow():
    request = submit(workflow_type='my_new_workflow', payload={...})
    approve(request, user=...)
    assert entity.status == 'approved'
```

**Step 6:** Document for school admin (in Arabic) — workflow purpose, conditions, expected approvers.

---

## 8. Migration & Versioning

### 8.1 Versioning Rules

- Each workflow can have multiple definitions
- Only ONE active definition per workflow type at a time
- Activating a new version automatically deactivates the previous
- In-flight requests keep using their original definition (frozen reference)

### 8.2 Activating a New Version

```python
# admin UI flow:
1. User clicks "New Version" on existing workflow
2. System creates draft (copy of current)
3. User edits steps, conditions, approvers
4. User clicks "Test" → simulate with sample payload
5. User clicks "Activate"
6. System validates:
   - At least one step
   - All conditions valid
   - All approvers resolvable
7. System sets:
   - Old definition: is_active=False, effective_to=NOW
   - New definition: is_active=True, effective_from=NOW
8. Audit log created
9. New requests use new version
10. In-flight requests continue with old version
```

### 8.3 Rolling Back a Version

```python
1. User selects previous version from history
2. User clicks "Restore as Active"
3. System creates a new version (copy of selected)
4. Activates new version
5. Audit log created with reason
```

---

## 9. Reporting

### 9.1 Approval Performance Reports

**For Principal (monthly):**
- Approvals processed by user
- Average response time per workflow type
- Approval/rejection ratio
- Bottleneck workflows (highest pending count)
- Timeout/escalation incidents
- SoD exceptions count

**For Chief Accountant (weekly):**
- Pending approvals by category
- Financial approvals processed
- Aging report (oldest pending)
- Rejected requests with reasons

### 9.2 Audit Reports

**For internal audit (annual):**
- Complete approval log per category
- All SoD exceptions with justifications
- Delegation history
- Workflow definition changes

---

## 10. Edge Cases & Error Handling

### 10.1 Approver Unavailable

**Scenario:** User assigned as approver is deactivated/deleted.

**Handling:**
1. System checks at submission time
2. If unavailable: skip to next eligible person in same role
3. If role has no active members: escalate to Principal
4. Audit log records the substitution

### 10.2 No Active Workflow Definition

**Scenario:** Workflow type has no active definition (e.g., admin disabled all versions).

**Handling:**
1. Submission fails with clear error
2. UI shows: "Workflow not configured. Contact administrator."
3. Operation cannot proceed
4. Logged for admin attention

### 10.3 Circular Delegation

**Scenario:** A delegates to B, who delegates to A.

**Handling:**
1. Validate at delegation creation time
2. Check chain depth (max 3 levels)
3. Reject if cycle detected

### 10.4 Workflow Modification Mid-Flight

**Scenario:** Admin changes workflow while requests are pending.

**Handling:**
1. In-flight requests keep their original definition (frozen reference)
2. New requests use new definition
3. Both definitions remain in DB

### 10.5 Approver Approves Their Own Request

**Scenario:** User submits request and is also resolved as approver.

**Handling:**
1. System detects at resolution time
2. Skips that approver
3. Falls back to next person in role / escalation
4. Logs the skip

---

## 11. Performance Considerations

### 11.1 Caching

- Active workflow definitions cached in Redis (10 min TTL)
- User roles and permissions cached (5 min TTL)
- Active delegations cached (5 min TTL)

### 11.2 Database Indexes

```sql
CREATE INDEX idx_approval_requests_status ON approval_requests(status);
CREATE INDEX idx_approval_requests_requester ON approval_requests(requester_id, status);
CREATE INDEX idx_approval_requests_entity ON approval_requests(entity_type, entity_id);
CREATE INDEX idx_approval_requests_type_def ON approval_requests(workflow_type_id, workflow_definition_id);
CREATE INDEX idx_approval_actions_request ON approval_actions(approval_request_id);
CREATE INDEX idx_workflow_steps_def ON approval_workflow_steps(workflow_definition_id, step_number);
CREATE INDEX idx_delegations_active ON approval_delegations(delegator_id, is_active, starts_at, ends_at);
```

### 11.3 Asynchronous Processing

These operations run in Celery (not synchronous):
- Notifications (email, SMS)
- Timeout/escalation checks (scheduled)
- Audit log denormalization
- Report generation

---

## 12. Security Considerations

### 12.1 Authorization Checks

For every workflow operation:
- User authenticated
- User has permission to perform action
- User is actual approver (or valid delegate)
- Request is in correct state for action

### 12.2 Tampering Prevention

- All payload changes after submission rejected
- Only specific fields can be added (comments, attachments)
- Original payload signed/hashed for verification

### 12.3 Rate Limiting

- Max 100 requests per user per hour
- Max 1000 requests system-wide per hour
- Suspicious patterns flagged

---

## 13. Summary

### 13.1 Workflows Catalog

**Total:** 35+ default workflow types covering:
- Financial: 9
- Procurement: 3
- Inventory: 3
- HR: 6
- Students: 3
- Transport: 7
- System: 4

### 13.2 Configurability

**Fully Configurable:**
- ✅ Step conditions and thresholds
- ✅ Approvers (role/user/dynamic/group)
- ✅ Timeouts and escalations
- ✅ Delegation rules
- ✅ Adding new workflow types

**Code Required:**
- ❌ Adding new entity types
- ❌ New approver resolution algorithms
- ❌ Custom condition operators

### 13.3 What This Enables

1. School can change approval policies without IT
2. Audit-ready compliance
3. Scaling workflows as school grows
4. Quick adaptation to regulatory changes
5. Clear accountability per decision

---

*End of Approval Workflows Document*

> **Related Documents:**
> - `04_ARCHITECTURE.md` — Engine architecture
> - `06_USER_ROLES_AND_PERMISSIONS.md` — Roles and SoD
> - `08_TRANSPORT_MODULE.md` — Transport-specific workflows in context
