# Architecture Document — El Shorouk School Management System

> **Document Type:** Software Architecture Document (C4 Model)
> **Status:** v2.0 — Foundation Architecture with Approval Engine & Transport
> **Date:** May 2026
> **Document Owner:** Project Tech Lead

---

## 1. Architecture Vision

### 1.1 Architectural Goals

1. **Financial Accuracy** — Every monetary calculation must be precise, auditable
2. **Single Source of Truth** — One canonical record per entity
3. **Configuration over Code** — Business rules editable from UI without deployment
4. **Configurable Approval Workflows** — Admins manage workflows from UI
5. **Security by Design** — Defense in depth, audit trails, SoD enforcement
6. **Operational Resilience** — Graceful degradation when internet drops
7. **Maintainability** — Code that a 4-person team can sustain
8. **Performance** — Sub-2-second response times for 95% of operations
9. **Arabic-First** — RTL UI, Arabic search, Arabic reports

### 1.2 Architectural Style

**Style:** Modular Monolith (Backend) + Decoupled Frontend + Mobile-Ready API

**Key Principles:**
- Backend (Django) and Frontend (Next.js) decoupled via REST API
- Backend is a modular monolith with clear module boundaries
- Each module has a public API (`public.py`)
- Mobile apps in Phase 2 consume the same backend API

---

## 2. C4 Model — Level 1: System Context

### 2.1 Context Diagram

```
                            EL SHOROUK SCHOOL ECOSYSTEM
                            
    ┌──────────────┐                                      ┌──────────────┐
    │  School      │ uses                                 │  Parents     │
    │  Staff       │──────┐                       ┌───────│  (Phase 2)   │
    └──────────────┘      │                       │       └──────────────┘
                          │                       │
                          ▼                       ▼
                  ┌────────────────────────────────────┐
                  │                                    │
                  │    EL SHOROUK SCHOOL MANAGEMENT    │
                  │           SYSTEM (ESSMS)           │
                  │                                    │
                  └────────────────────────────────────┘
                          │     ▲      │       │       │
                          │     │      │       │       │
                          ▼     │      ▼       ▼       ▼
              ┌──────────────┐  │  ┌──────┐ ┌──────┐ ┌────────┐
              │   ZKTeco     │  │  │ SMS/ │ │Backup│ │Bus     │
              │   Devices    │  │  │ Email│ │      │ │Rental  │
              └──────────────┘  │  └──────┘ └──────┘ │Companies│
                                │                    └────────┘
                          ┌─────┴────────┐
                          │  School      │
                          │  Admin       │
                          └──────────────┘
```

### 2.2 Actors and External Systems

| Actor / System | Type | Integration |
|---|---|---|
| School Staff | Human | Web (laptop/tablet) |
| School Admin | Human | Web (manages workflows, roles) |
| Parents (Phase 2) | Human | Mobile app |
| ZKTeco Devices | External System | TCP/IP via Mini-PC |
| Email Service (Brevo) | External System | SMTP |
| SMS Service (optional) | External System | API |
| Backblaze B2 | External System | S3 API for backup |
| Cloudflare | External System | DNS + CDN |
| Bus Rental Companies | External Entity | Manual (invoices, contracts) |

---

## 3. C4 Model — Level 2: Container Diagram

```
┌──────────────────────────────────────────────────────────────────────┐
│                     CLOUD (Hostinger VPS)                            │
│                                                                      │
│  ┌──────────────────┐    ┌──────────────────┐                        │
│  │   Next.js        │    │   Django + DRF   │                        │
│  │   Frontend       │───▶│   Backend API    │                        │
│  │   (TypeScript)   │    │   (Python)       │                        │
│  └──────────────────┘    └──────────────────┘                        │
│                                  │   │                               │
│                                  ▼   ▼                               │
│                          ┌──────────┐ ┌──────────┐                   │
│                          │ Postgres │ │  Redis   │                   │
│                          │   16     │ │  Cache   │                   │
│                          └──────────┘ └──────────┘                   │
│                                          │                           │
│                                          ▼                           │
│                                  ┌──────────────┐                    │
│                                  │   Celery     │                    │
│                                  │   Workers    │                    │
│                                  └──────────────┘                    │
│  ┌──────────────────┐    ┌──────────────────┐                        │
│  │   Nginx          │    │   MinIO          │                        │
│  │   (SSL/Proxy)    │    │   (Files)        │                        │
│  └──────────────────┘    └──────────────────┘                        │
└──────────────────────────────────────────────────────────────────────┘
                              ▲              ▲
                              │ HTTPS        │ HTTPS
              ┌───────────────┘              └───────────────┐
              │                                              │
┌─────────────┴────────────┐                  ┌──────────────┴─────────┐
│   SCHOOL LAN             │                  │   REMOTE USERS         │
│   ┌──────────────────┐   │                  │   (Phase 2)            │
│   │   Mini-PC        │   │                  └────────────────────────┘
│   │   Sync Agent     │   │
│   └──────────────────┘   │
│           ▲              │
│           │ TCP/IP       │
│   ┌───────┴──────────┐   │
│   │  ZKTeco Devices  │   │
│   └──────────────────┘   │
│                          │
│   School Staff           │
└──────────────────────────┘
```

### 3.1 Container Specifications

| Container | Technology | Resources |
|---|---|---|
| Frontend | Next.js 15 + TypeScript + Tailwind | 1GB RAM, 1 vCPU |
| Backend API | Django 5 + DRF + Python 3.12 | 4GB RAM, 2 vCPU |
| Database | PostgreSQL 16 | 4GB RAM, 1 vCPU, 100GB |
| Cache/Queue | Redis 7 | 1GB RAM |
| Workers | Celery 5 | 2GB RAM |
| Reverse Proxy | Nginx | 256MB RAM |
| File Storage | MinIO | 512MB RAM, 50GB |
| Sync Agent (Mini-PC) | Python custom | 4GB RAM mini-PC |

---

## 4. Backend Modular Structure

The Django backend is organized as a **modular monolith**. Each Django app represents a Bounded Context.

```
school_erp/                          # Django project root
├── core/                            # Shared infrastructure
│   ├── auth/                        # Authentication, sessions, 2FA
│   ├── rbac/                        # Roles, permissions, role composition
│   ├── audit/                       # Audit logging
│   ├── config/                      # Configuration engine
│   ├── workflow/                    # Configurable Approval Workflow Engine ⭐
│   ├── notifications/               # Email/SMS abstraction
│   ├── files/                       # File upload to MinIO
│   ├── sod/                         # Segregation of Duties checking
│   └── i18n/                        # Localization helpers
│
├── modules/                         # Business domain modules
│   ├── users/                       # User profiles, sessions
│   ├── students/                    # Student lifecycle, enrollment workflow
│   ├── families/                    # Parents, guardians, relationships
│   ├── academic_structure/          # Stages, grades, sections (foundation)
│   ├── fees/                        # Fee structures, two-tier discounts
│   ├── installments/                # Installment plans
│   ├── cashier/                     # Daily treasury operations
│   ├── accounting/                  # GL, receivables, reconciliation
│   ├── inventory/                   # 4 divisions, full cycle
│   ├── procurement/                 # Purchase orders, suppliers
│   ├── transport/                   # Buses, routes, rental contracts ⭐
│   ├── hr/                          # Employees, contracts
│   ├── attendance/                  # ZKTeco integration, time tracking
│   ├── leaves/                      # Leave types, balances, requests
│   ├── payroll/                     # Salary, payslips, bus deductions
│   ├── reports/                     # Report generation
│   └── data_migration/              # Excel import tools
│
├── api/v1/                          # REST API layer
└── settings/                        # Django settings
```

### 4.1 Module Anatomy

Every module follows the same internal structure:

```
modules/students/
├── __init__.py
├── apps.py
├── models.py
├── managers.py
├── repositories.py
├── services.py
├── validators.py
├── events.py
├── exceptions.py
├── public.py                        # ⭐ Public API for other modules
├── permissions.py                   # Module permissions catalog
├── signals.py                       # Audit triggers
├── tasks.py                         # Celery tasks
├── workflows.py                     # ⭐ Workflow integrations
├── tests/
└── migrations/
```

### 4.2 Cross-Module Communication Rule

```python
# ❌ WRONG
from modules.students.models import Student

# ✅ RIGHT
from modules.students.public import students_service
student = students_service.get_by_id(student_id, ctx)
```

---

## 5. Configurable Approval Workflow Engine ⭐

This is the **core innovation** of the system. It eliminates code changes for approval policy modifications.

### 5.1 Purpose

Allow administrators to:
- Define new approval workflow types (e.g., "Fee Refund")
- Configure approval rules (who approves, conditions, limits)
- Enable/disable workflows
- Version workflows (changes don't affect in-flight requests)
- Test workflows before activation
- Delegate approvals temporarily

### 5.2 Database Schema

```sql
-- Types of approval workflows (e.g., "discount", "purchase", etc.)
CREATE TABLE approval_workflow_types (
    id UUID PRIMARY KEY,
    code VARCHAR(50) UNIQUE NOT NULL,        -- e.g., 'discount_basic'
    name_ar VARCHAR(200) NOT NULL,
    name_en VARCHAR(200) NOT NULL,
    description_ar TEXT,
    description_en TEXT,
    category VARCHAR(50) NOT NULL,           -- financial/hr/inventory/students/system
    is_system_defined BOOLEAN DEFAULT FALSE, -- Pre-installed vs custom
    is_active BOOLEAN DEFAULT TRUE,
    entity_type VARCHAR(50),                 -- e.g., 'student', 'fee', 'employee'
    requires_attachment BOOLEAN DEFAULT FALSE,
    allow_delegation BOOLEAN DEFAULT TRUE,
    allow_cancellation BOOLEAN DEFAULT FALSE,
    icon VARCHAR(50),
    created_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ
);

-- Versioned workflow definitions
CREATE TABLE approval_workflow_definitions (
    id UUID PRIMARY KEY,
    workflow_type_id UUID REFERENCES approval_workflow_types(id),
    version INTEGER NOT NULL,
    name_ar VARCHAR(200),
    name_en VARCHAR(200),
    is_active BOOLEAN DEFAULT FALSE,         -- Only 1 active per type at a time
    effective_from DATE NOT NULL,
    effective_to DATE,
    created_by UUID REFERENCES users(id),
    approved_by UUID REFERENCES users(id),
    notes TEXT,
    created_at TIMESTAMPTZ,
    UNIQUE(workflow_type_id, version)
);

-- Steps in a workflow (sequential approval steps)
CREATE TABLE approval_workflow_steps (
    id UUID PRIMARY KEY,
    workflow_definition_id UUID REFERENCES approval_workflow_definitions(id),
    step_number INTEGER NOT NULL,
    name_ar VARCHAR(200),
    name_en VARCHAR(200),
    approver_type VARCHAR(20) NOT NULL,      -- 'role' / 'user' / 'dynamic' / 'group'
    approver_role_id UUID REFERENCES roles(id),
    approver_user_id UUID REFERENCES users(id),
    approver_dynamic_rule JSONB,             -- e.g., {"field": "student.stage_coordinator"}
    approver_group_id UUID,
    requires_all_in_group BOOLEAN DEFAULT FALSE,
    is_optional BOOLEAN DEFAULT FALSE,
    timeout_hours INTEGER,
    escalation_to_role_id UUID REFERENCES roles(id),
    UNIQUE(workflow_definition_id, step_number)
);

-- Conditions for step activation
CREATE TABLE approval_workflow_conditions (
    id UUID PRIMARY KEY,
    workflow_step_id UUID REFERENCES approval_workflow_steps(id),
    condition_type VARCHAR(50),              -- 'amount', 'percentage', 'category', etc.
    field_path VARCHAR(200),                 -- e.g., 'discount_pct', 'amount'
    operator VARCHAR(20),                    -- '>', '<', '=', '>=', '<=', 'in'
    value_text TEXT,
    value_number NUMERIC(12,2),
    value_type VARCHAR(20),
    logical_op VARCHAR(10) DEFAULT 'AND'     -- 'AND' / 'OR'
);

-- Active approval requests
CREATE TABLE approval_requests (
    id UUID PRIMARY KEY,
    workflow_type_id UUID REFERENCES approval_workflow_types(id),
    workflow_definition_id UUID REFERENCES approval_workflow_definitions(id),
    requester_id UUID REFERENCES users(id),
    entity_type VARCHAR(50),                 -- e.g., 'student', 'fee'
    entity_id UUID,
    payload JSONB NOT NULL,                  -- Request data
    current_step_number INTEGER DEFAULT 1,
    status VARCHAR(20) NOT NULL,             -- pending/approved/rejected/cancelled/expired
    submitted_at TIMESTAMPTZ DEFAULT NOW(),
    completed_at TIMESTAMPTZ,
    rejection_reason TEXT,
    metadata JSONB
);

-- All approval actions (audit trail)
CREATE TABLE approval_actions (
    id UUID PRIMARY KEY,
    approval_request_id UUID REFERENCES approval_requests(id),
    step_number INTEGER NOT NULL,
    approver_id UUID REFERENCES users(id),
    action VARCHAR(20) NOT NULL,             -- approve/reject/delegate/comment
    action_at TIMESTAMPTZ DEFAULT NOW(),
    comments TEXT,
    delegated_to UUID REFERENCES users(id),
    delegation_reason TEXT,
    attachments JSONB
);

-- Delegation rules
CREATE TABLE approval_delegations (
    id UUID PRIMARY KEY,
    delegator_id UUID REFERENCES users(id),
    delegate_id UUID REFERENCES users(id),
    workflow_type_id UUID REFERENCES approval_workflow_types(id),  -- NULL = all
    starts_at TIMESTAMPTZ,
    ends_at TIMESTAMPTZ,
    reason TEXT,
    approved_by UUID REFERENCES users(id),    -- Principal approval
    is_active BOOLEAN DEFAULT TRUE
);
```

### 5.3 Approver Types

The engine supports 4 types of approvers:

#### Type 1: Role-based (`role`)

```json
{
  "approver_type": "role",
  "approver_role_id": "uuid-of-chief-accountant-role"
}
```

Any user holding this role can approve. Most common type.

#### Type 2: User-specific (`user`)

```json
{
  "approver_type": "user",
  "approver_user_id": "uuid-of-principal"
}
```

Specific named user. Useful for unique roles like "School Principal."

#### Type 3: Dynamic (`dynamic`)

```json
{
  "approver_type": "dynamic",
  "approver_dynamic_rule": {
    "field": "student.stage.coordinator_id"
  }
}
```

Approver is resolved from the request data. Example: "The stage coordinator of the student in question."

#### Type 4: Group (`group`)

```json
{
  "approver_type": "group",
  "approver_group_id": "uuid-of-finance-committee",
  "requires_all_in_group": true
}
```

A committee. `requires_all_in_group=true` means all must approve. `false` means any single approval is sufficient.

### 5.4 Default Workflow Types (System-Defined)

Pre-installed at system setup, fully configurable by admin:

#### Financial Category

| Code | Name | Trigger |
|---|---|---|
| `discount_basic` | Basic Discount | Discount on gross fees |
| `discount_additional` | Additional Discount | Discount after basic |
| `discount_full_exemption` | Full Fee Exemption | 100% discount |
| `fee_refund` | Fee Refund | Parent requests refund |
| `receipt_void` | Receipt Cancellation | Cancel a paid receipt |
| `journal_entry_modification` | Journal Entry Edit | Modify accounting entry after posting |
| `salary_advance` | Salary Advance | Employee loan request |
| `salary_modification` | Salary Change | Modify base salary |
| `cashier_shortage_approval` | Cashier Shortage | Daily close discrepancy |

#### Procurement Category

| Code | Name | Trigger |
|---|---|---|
| `purchase_request_small` | Small Purchase Request | Below threshold |
| `purchase_request_large` | Large Purchase Request | Above threshold |
| `supplier_payment` | Supplier Payment | Payment to supplier |

#### Inventory Category

| Code | Name | Trigger |
|---|---|---|
| `inventory_issue_unpaid` | Issue without Payment | Override payment check |
| `inventory_adjustment` | Stock Adjustment | After stock count discrepancy |
| `inventory_writeoff` | Stock Write-off | Damaged/obsolete items |

#### HR Category

| Code | Name | Trigger |
|---|---|---|
| `leave_short` | Short Leave | ≤ X days |
| `leave_long` | Long Leave | > X days |
| `leave_unpaid` | Unpaid Leave | Any duration |
| `employee_termination` | Termination | End of employment |
| `employee_promotion` | Promotion | Role/salary upgrade |
| `payroll_run` | Payroll Run | Monthly payroll execution |

#### Students Category

| Code | Name | Trigger |
|---|---|---|
| `student_registration_acceptance` | New Student Acceptance | After exam pass |
| `student_data_modification` | Modify Student Data | After registration |
| `student_withdrawal` | Student Withdrawal | Family request |

#### Transport Category

| Code | Name | Trigger |
|---|---|---|
| `transport_subscription_create` | Bus Subscription | New subscription |
| `transport_subscription_change` | Subscription Change | Mid-year change |
| `transport_subscription_cancel` | Subscription Cancel | Mid-year cancellation |
| `transport_subscription_refund` | Bus Fee Refund | Refund request |
| `bus_rental_contract_create` | Rental Contract | New contract with company |
| `bus_rental_contract_renewal` | Contract Renewal | Renewing existing |
| `bus_rental_invoice_payment` | Pay Rental Invoice | Monthly invoice |

#### System Category

| Code | Name | Trigger |
|---|---|---|
| `delegation_request` | Delegation Request | Authority delegation |
| `sod_exception` | SoD Exception | Bypass segregation rule |
| `permission_change` | Permission Change | Modify role permissions |
| `configuration_change_critical` | Critical Config Change | Tax rates, etc. |

### 5.5 Workflow Engine Service API

```python
# Public API (modules/core/workflow/public.py)

class ApprovalWorkflowService:
    
    def submit_request(
        self,
        workflow_type_code: str,
        entity_type: str,
        entity_id: UUID,
        payload: dict,
        requester_id: UUID,
    ) -> ApprovalRequest:
        """Submit a new approval request."""
        pass
    
    def approve(
        self,
        request_id: UUID,
        approver_id: UUID,
        comments: str = None,
        attachments: list = None,
    ) -> ApprovalAction:
        """Approve current step."""
        pass
    
    def reject(
        self,
        request_id: UUID,
        approver_id: UUID,
        reason: str,
    ) -> ApprovalAction:
        """Reject the request."""
        pass
    
    def delegate(
        self,
        request_id: UUID,
        approver_id: UUID,
        delegate_to_id: UUID,
        reason: str,
    ) -> ApprovalAction:
        """Delegate this approval."""
        pass
    
    def get_pending_for_user(self, user_id: UUID) -> list[ApprovalRequest]:
        """Get all pending approvals for this user."""
        pass
    
    def test_workflow(
        self,
        workflow_definition_id: UUID,
        test_payload: dict,
    ) -> WorkflowTestResult:
        """Simulate workflow execution without creating real request."""
        pass
```

### 5.6 Workflow Execution Logic

```python
def submit_request(workflow_type_code, entity_type, entity_id, payload, requester_id):
    # 1. Get active workflow definition
    wf_def = get_active_workflow_definition(workflow_type_code)
    
    # 2. Find applicable steps based on conditions
    applicable_steps = filter_steps_by_conditions(wf_def.steps, payload)
    
    # 3. Create request
    request = ApprovalRequest.objects.create(
        workflow_type=wf_def.workflow_type,
        workflow_definition=wf_def,
        requester_id=requester_id,
        entity_type=entity_type,
        entity_id=entity_id,
        payload=payload,
        current_step_number=applicable_steps[0].step_number,
        status='pending',
    )
    
    # 4. Resolve and notify first approver
    first_step = applicable_steps[0]
    approver = resolve_approver(first_step, payload, requester_id)
    
    # 5. Check delegation
    if has_active_delegation(approver, wf_def.workflow_type):
        approver = get_delegate(approver)
    
    # 6. Send notification
    notify_approver(approver, request)
    
    # 7. Schedule timeout escalation
    if first_step.timeout_hours:
        schedule_escalation(request, first_step.timeout_hours)
    
    # 8. Audit log
    audit_log.record('approval_request_submitted', request)
    
    return request
```

---

## 6. RBAC Architecture

### 6.1 Core Concepts

- **Role:** A named set of permissions (e.g., "Cashier")
- **Permission:** Atomic capability (e.g., `students.create`)
- **User:** Person with one or more roles
- **Role Composition:** A user can hold multiple roles simultaneously

### 6.2 Permission Naming

```
{module}.{action}[.{qualifier}]

Examples:
students.create
students.read
students.update
students.delete
fees.discount.approve
inventory.issue
inventory.issue.skip_payment_check
transport.subscription.modify
hr.payroll.run
hr.payroll.approve
```

### 6.3 Database Schema

```sql
CREATE TABLE roles (
    id UUID PRIMARY KEY,
    code VARCHAR(50) UNIQUE NOT NULL,
    name_ar VARCHAR(100) NOT NULL,
    name_en VARCHAR(100) NOT NULL,
    description_ar TEXT,
    description_en TEXT,
    is_system_defined BOOLEAN DEFAULT FALSE,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ
);

CREATE TABLE permissions (
    id UUID PRIMARY KEY,
    code VARCHAR(100) UNIQUE NOT NULL,
    module VARCHAR(50) NOT NULL,
    action VARCHAR(50) NOT NULL,
    qualifier VARCHAR(50),
    name_ar VARCHAR(200),
    name_en VARCHAR(200),
    description_ar TEXT,
    description_en TEXT,
    is_sensitive BOOLEAN DEFAULT FALSE,      -- Requires extra logging
    requires_2fa BOOLEAN DEFAULT FALSE
);

CREATE TABLE role_permissions (
    role_id UUID REFERENCES roles(id),
    permission_id UUID REFERENCES permissions(id),
    granted_at TIMESTAMPTZ,
    granted_by UUID REFERENCES users(id),
    PRIMARY KEY (role_id, permission_id)
);

CREATE TABLE user_roles (
    user_id UUID REFERENCES users(id),
    role_id UUID REFERENCES roles(id),
    assigned_at TIMESTAMPTZ,
    assigned_by UUID REFERENCES users(id),
    expires_at TIMESTAMPTZ,                  -- For temporary roles
    notes TEXT,
    PRIMARY KEY (user_id, role_id)
);
```

### 6.4 Permission Check Service

```python
class PermissionChecker:
    
    def has_permission(
        self,
        user_id: UUID,
        permission_code: str,
        context: dict = None,
    ) -> bool:
        """
        Check if user has permission, with optional context.
        Caches result in Redis for 5 minutes.
        """
        # 1. Get user's roles
        roles = get_user_roles(user_id)
        
        # 2. Aggregate permissions
        permissions = get_permissions_for_roles(roles)
        
        # 3. Check basic permission
        if permission_code not in permissions:
            return False
        
        # 4. Check context (e.g., amount limits)
        if context:
            return check_contextual_constraints(permission_code, context)
        
        return True
```

---

## 7. Segregation of Duties (SoD) Architecture

### 7.1 SoD Rules

```sql
CREATE TABLE sod_rules (
    id UUID PRIMARY KEY,
    name_ar VARCHAR(200),
    name_en VARCHAR(200),
    description_ar TEXT,
    permission_a_code VARCHAR(100),          -- First conflicting permission
    permission_b_code VARCHAR(100),          -- Second conflicting permission
    severity VARCHAR(20),                    -- 'block' / 'warn' / 'log'
    can_override BOOLEAN DEFAULT TRUE,
    override_workflow_type_code VARCHAR(50), -- Workflow for override approval
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ
);

CREATE TABLE sod_violations (
    id UUID PRIMARY KEY,
    user_id UUID REFERENCES users(id),
    sod_rule_id UUID REFERENCES sod_rules(id),
    operation_type VARCHAR(50),
    entity_type VARCHAR(50),
    entity_id UUID,
    detected_at TIMESTAMPTZ,
    override_request_id UUID REFERENCES approval_requests(id),
    override_status VARCHAR(20),             -- pending/approved/rejected
    override_approved_by UUID REFERENCES users(id),
    override_approved_at TIMESTAMPTZ,
    notes TEXT
);
```

### 7.2 Default SoD Rules

| Rule | Conflict |
|---|---|
| Same person who collects payment cannot close cashier | `cashier.collect_payment` ↔ `cashier.close_day` |
| Same person who issues inventory cannot perform stock count | `inventory.issue` ↔ `inventory.stock_count` |
| Same person who enters payroll cannot approve it | `payroll.enter` ↔ `payroll.approve` |
| Same person who creates supplier cannot approve their invoices | `procurement.create_supplier` ↔ `procurement.approve_invoice` |
| Same person who requests purchase cannot approve it | `inventory.request_purchase` ↔ `inventory.approve_purchase` |

### 7.3 SoD Check Flow

```
[User attempts operation X on entity Y]
       ↓
[System checks: Has user performed conflicting operation Z on Y?]
       ↓
       ├── No conflict → Proceed normally
       │
       └── Conflict detected
           ↓
           [Severity check]
                ↓
                ├── 'block' + can_override=false → Reject with reason
                ├── 'block' + can_override=true → Trigger override workflow
                ├── 'warn' → Log + show warning + ask user to confirm
                └── 'log' → Log silently + proceed
```

---

## 8. Frontend Architecture

### 8.1 Next.js App Structure

```
school_erp_frontend/
├── app/                             # App Router
│   ├── (auth)/login/, 2fa/
│   ├── (dashboard)/
│   │   ├── layout.tsx
│   │   ├── page.tsx                 # Dashboard home
│   │   ├── students/
│   │   ├── fees/
│   │   ├── cashier/
│   │   ├── inventory/
│   │   ├── transport/
│   │   ├── hr/
│   │   ├── reports/
│   │   ├── approvals/               # ⭐ Pending approvals inbox
│   │   ├── workflows/               # ⭐ Workflow management
│   │   └── settings/
│   └── api/                         # BFF if needed
├── components/
├── lib/
│   ├── api/                         # Typed API client
│   ├── auth/, i18n/, hooks/
│   └── validators/                  # Zod schemas
├── public/                          # Static assets
└── tests/
```

### 8.2 Key Patterns

- **Server Components by Default**
- **Server Actions for Mutations**
- **State:** React Query (server), Zustand (client), React Hook Form + Zod (forms)
- **Styling:** Tailwind with logical properties (`ms-4`, `text-end`)
- **RTL:** `<html dir="rtl" lang="ar">`

### 8.3 Approval Workflow UI

Special UI components for the workflow engine:

- **Approvals Inbox:** Shows all pending approvals for the user
- **Workflow Builder:** Drag-and-drop UI for creating/editing workflows
- **Workflow Tester:** Simulate workflow execution
- **Approval History:** Timeline view of all approvals on an entity

---

## 9. Data Architecture

### 9.1 Database Strategy

**Primary Database:** PostgreSQL 16

### 9.2 Data Modeling Principles

1. **Normalization:** 3NF, denormalization only when necessary
2. **Soft Delete:** All data uses `deleted_at`, never hard delete
3. **Auditing:** `created_at`, `updated_at`, `created_by`, `updated_by`
4. **UUIDs:** Internal primary keys
5. **Sequence Codes:** User-facing codes formatted (REC-2026-0001)
6. **Money:** `numeric(12,2)` always
7. **Time:** UTC in DB, displayed in Africa/Cairo
8. **JSON:** JSONB for flexible schemas
9. **Indexing:** On FKs, frequently queried columns

### 9.3 Data Volume Estimates

| Entity | Year 1 | Year 5 |
|---|---|---|
| Students | 1,500 | 1,800 |
| Employees | 100 | 150 |
| Daily transactions | ~100 | ~150 |
| Daily attendance (Phase 2) | ~1,600 | ~2,000 |
| Approval requests | ~50/day | ~80/day |
| Audit log records | ~5,000/day | ~7,500/day |
| Files | ~10,000 | ~50,000 |

**Database Growth:** ~50GB by Year 5

### 9.4 Backup Strategy (3-2-1 Rule)

- **3 copies:** Production, local Mini-PC, Backblaze
- **2 different media:** SSD + HDD + cloud
- **1 off-site:** Backblaze B2

**Frequency:**
- Continuous: WAL archiving
- Daily: Full backup at 2 AM
- Weekly: Full with 12-week retention
- Monthly: Full with 12-month retention

**RPO:** 1 hour | **RTO:** 4 hours

---

## 10. Security Architecture

### 10.1 Defense in Depth

```
Layer 1: Network         → Cloudflare, HTTPS, HSTS
Layer 2: Application     → Auth, RBAC, CSRF, CORS, rate limiting
Layer 3: Data            → Django ORM, encryption at rest
Layer 4: Audit           → Comprehensive logging
Layer 5: SoD             → Conflict detection
Layer 6: Operational     → Backups, monitoring
```

### 10.2 Authentication

**Web (Phase 1):**
- Session-based with secure HTTP-only cookies
- Sessions expire: 15 min (sensitive roles), 60 min (others)
- 2FA via TOTP for: Cashier, HR, Finance, Admin
- Password: min 12 chars, mix of types
- Account lockout: 5 failed attempts = 30 min lock

**Mobile (Phase 2):**
- JWT with short-lived access token (15 min)
- Refresh token (30 days, rotating)

### 10.3 Authorization

- Server-side checks always (defense-in-depth)
- UI hides buttons but server enforces actual access
- Permission check at API endpoint + service layer

### 10.4 Sensitive Data

**Encrypted at Rest:**
- National IDs (Fernet)
- Bank account numbers
- Salary amounts in audit log

**Hashed:** Passwords (Argon2id)

---

## 11. Transport Module Architecture ⭐

### 11.1 Overview

Transport handles **fully-rented buses** with three rider types and complete financial tracking.

### 11.2 Database Schema

```sql
-- Bus rental companies (suppliers)
CREATE TABLE bus_rental_companies (
    id UUID PRIMARY KEY,
    name_ar VARCHAR(200),
    name_en VARCHAR(200),
    contact_person VARCHAR(200),
    phone VARCHAR(50),
    email VARCHAR(100),
    address TEXT,
    tax_id VARCHAR(50),
    notes TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ
);

-- Rental contracts
CREATE TABLE bus_rental_contracts (
    id UUID PRIMARY KEY,
    company_id UUID REFERENCES bus_rental_companies(id),
    contract_number VARCHAR(100) UNIQUE,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    monthly_fee NUMERIC(12,2) NOT NULL,
    includes_driver BOOLEAN DEFAULT TRUE,
    includes_fuel BOOLEAN DEFAULT TRUE,
    includes_maintenance BOOLEAN DEFAULT TRUE,
    includes_insurance BOOLEAN DEFAULT TRUE,
    payment_terms VARCHAR(50),               -- 'monthly', 'quarterly', 'annual'
    auto_renewal BOOLEAN DEFAULT FALSE,
    status VARCHAR(20) NOT NULL,             -- active/expired/terminated/draft
    notes TEXT,
    created_at TIMESTAMPTZ,
    approved_by UUID REFERENCES users(id),
    approval_request_id UUID REFERENCES approval_requests(id)
);

-- Buses (with future-proofing for ownership types)
CREATE TABLE buses (
    id UUID PRIMARY KEY,
    code VARCHAR(50) UNIQUE,
    plate_number VARCHAR(50) UNIQUE,
    capacity INTEGER NOT NULL,
    ownership_type VARCHAR(30) DEFAULT 'rented_full',  -- 'owned' / 'rented_full' / 'rented_no_driver'
    rental_contract_id UUID REFERENCES bus_rental_contracts(id),
    model VARCHAR(100),
    year INTEGER,
    color VARCHAR(50),
    status VARCHAR(20) DEFAULT 'active',
    notes TEXT,
    created_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ
);

-- External drivers (from rental company)
CREATE TABLE bus_external_drivers (
    id UUID PRIMARY KEY,
    full_name VARCHAR(200) NOT NULL,
    national_id VARCHAR(20),
    phone VARCHAR(50),
    company_id UUID REFERENCES bus_rental_companies(id),
    license_number VARCHAR(50),
    license_expiry DATE,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ
);

-- Routes
CREATE TABLE bus_routes (
    id UUID PRIMARY KEY,
    code VARCHAR(50) UNIQUE,
    name_ar VARCHAR(200),
    name_en VARCHAR(200),
    starting_point VARCHAR(200),
    ending_point VARCHAR(200),
    distance_km NUMERIC(6,2),
    estimated_duration_minutes INTEGER,
    annual_fee NUMERIC(12,2) NOT NULL,       -- Full fee for student
    is_active BOOLEAN DEFAULT TRUE,
    notes TEXT,
    created_at TIMESTAMPTZ
);

-- Bus assigned to route (with driver and supervisor)
CREATE TABLE bus_route_assignments (
    id UUID PRIMARY KEY,
    bus_id UUID REFERENCES buses(id),
    route_id UUID REFERENCES bus_routes(id),
    driver_id UUID,                          -- Polymorphic: external_driver or employee
    driver_type VARCHAR(20),                 -- 'external' / 'employee'
    supervisor_employee_id UUID REFERENCES employees(id),
    academic_year_id UUID REFERENCES academic_years(id),
    start_date DATE,
    end_date DATE,
    is_active BOOLEAN DEFAULT TRUE
);

-- Subscriptions (the core entity)
CREATE TABLE bus_subscriptions (
    id UUID PRIMARY KEY,
    subscriber_type VARCHAR(20) NOT NULL,    -- 'student' / 'employee' / 'supervisor'
    subscriber_id UUID NOT NULL,             -- Polymorphic
    route_id UUID REFERENCES bus_routes(id),
    bus_id UUID REFERENCES buses(id),
    academic_year_id UUID REFERENCES academic_years(id),
    start_date DATE NOT NULL,
    end_date DATE,                           -- NULL = ongoing
    full_fee_amount NUMERIC(12,2) NOT NULL,  -- Full annual fee
    discount_pct NUMERIC(5,2) NOT NULL,      -- 0=student, 50=employee, 100=supervisor
    net_fee_amount NUMERIC(12,2) NOT NULL,   -- Calculated
    status VARCHAR(20) NOT NULL,             -- pending/active/suspended/cancelled
    notes TEXT,
    approved_by UUID REFERENCES users(id),
    approval_request_id UUID REFERENCES approval_requests(id),
    created_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ
);

-- History of changes to subscriptions
CREATE TABLE bus_subscription_changes (
    id UUID PRIMARY KEY,
    subscription_id UUID REFERENCES bus_subscriptions(id),
    change_type VARCHAR(30),                 -- route/bus/cancel/suspend/reactivate
    change_date DATE NOT NULL,
    effective_date DATE NOT NULL,
    previous_route_id UUID REFERENCES bus_routes(id),
    new_route_id UUID REFERENCES bus_routes(id),
    previous_fee NUMERIC(12,2),
    new_fee NUMERIC(12,2),
    months_remaining INTEGER,
    pro_rata_difference NUMERIC(12,2),       -- Calculated by engine
    settlement_method VARCHAR(30),           -- 'add_to_invoice' / 'payroll_deduction' / 'credit_balance'
    approval_request_id UUID REFERENCES approval_requests(id),
    approved_by UUID REFERENCES users(id),
    notes TEXT,
    created_at TIMESTAMPTZ
);

-- Financial settlements arising from changes
CREATE TABLE bus_subscription_settlements (
    id UUID PRIMARY KEY,
    change_id UUID REFERENCES bus_subscription_changes(id),
    student_id UUID REFERENCES students(id),
    employee_id UUID REFERENCES employees(id),
    amount NUMERIC(12,2) NOT NULL,
    direction VARCHAR(10) NOT NULL,          -- 'debit' / 'credit'
    settlement_method VARCHAR(30),           -- 'invoice' / 'installment' / 'payroll'
    status VARCHAR(20) NOT NULL,             -- pending/applied/cancelled
    applied_at TIMESTAMPTZ,
    payroll_period_id UUID,                  -- If via payroll
    student_invoice_id UUID,                 -- If via invoice
    notes TEXT,
    created_at TIMESTAMPTZ
);

-- Rental invoices from companies
CREATE TABLE bus_rental_invoices (
    id UUID PRIMARY KEY,
    contract_id UUID REFERENCES bus_rental_contracts(id),
    invoice_number VARCHAR(100),
    invoice_date DATE,
    period_from DATE,
    period_to DATE,
    amount NUMERIC(12,2) NOT NULL,
    status VARCHAR(20),                      -- pending/approved/paid/overdue/disputed
    approval_request_id UUID REFERENCES approval_requests(id),
    payment_id UUID,                         -- Reference to cashier transaction
    notes TEXT,
    attachment_url VARCHAR(500),             -- Scanned invoice
    created_at TIMESTAMPTZ
);

-- Other bus costs (fuel, maintenance, etc. — for owned buses or extras)
CREATE TABLE bus_costs (
    id UUID PRIMARY KEY,
    bus_id UUID REFERENCES buses(id),
    cost_type VARCHAR(30),                   -- fuel/maintenance/insurance/repair/other
    cost_date DATE,
    amount NUMERIC(12,2) NOT NULL,
    supplier_id UUID,
    invoice_reference VARCHAR(100),
    approval_request_id UUID REFERENCES approval_requests(id),
    notes TEXT,
    created_at TIMESTAMPTZ
);

-- Daily bus operations (Phase 2: with attendance)
CREATE TABLE bus_daily_operations (
    id UUID PRIMARY KEY,
    bus_id UUID REFERENCES buses(id),
    route_id UUID REFERENCES bus_routes(id),
    operation_date DATE,
    morning_status VARCHAR(20),              -- 'normal' / 'delayed' / 'cancelled' / 'replaced'
    afternoon_status VARCHAR(20),
    delay_minutes INTEGER,
    incident_notes TEXT,
    replacement_bus_id UUID REFERENCES buses(id),
    recorded_by UUID REFERENCES users(id),
    created_at TIMESTAMPTZ
);
```

### 11.3 Pro-Rata Calculation Engine

When a subscription changes mid-year:

```python
class ProRataCalculator:
    
    DEFAULT_ACADEMIC_MONTHS = 10  # Configurable
    
    def calculate_change_difference(
        self,
        previous_fee: Decimal,
        new_fee: Decimal,
        change_date: date,
        academic_year_end: date,
    ) -> Decimal:
        """
        Calculate pro-rata difference for mid-year change.
        Returns positive if student owes more, negative if owed back.
        """
        months_remaining = self._months_between(change_date, academic_year_end)
        total_months = self._get_academic_year_months(change_date)
        
        proportion_remaining = Decimal(months_remaining) / Decimal(total_months)
        
        previous_remaining = previous_fee * proportion_remaining
        new_remaining = new_fee * proportion_remaining
        
        difference = new_remaining - previous_remaining
        
        return difference.quantize(Decimal('0.01'))
    
    def calculate_partial_subscription(
        self,
        full_annual_fee: Decimal,
        start_date: date,
        academic_year_end: date,
    ) -> Decimal:
        """For students subscribing mid-year."""
        months_remaining = self._months_between(start_date, academic_year_end)
        total_months = self._get_academic_year_months(start_date)
        
        proportion = Decimal(months_remaining) / Decimal(total_months)
        partial_fee = full_annual_fee * proportion
        
        return partial_fee.quantize(Decimal('0.01'))
```

### 11.4 Subscription Change Workflow

```
[Parent/Staff requests bus change]
       ↓
[Transport Officer opens change request in system]
       ↓
[System calculates pro-rata difference automatically]
       ↓
[Submit to Approval Workflow Engine]
   workflow_type = 'transport_subscription_change'
       ↓
   ┌───────────────────────────────────────────┐
   │ Workflow rules (configurable):           │
   │                                          │
   │ IF difference == 0:                      │
   │   → Transport Officer approves alone     │
   │                                          │
   │ ELIF difference > 0 (student pays more): │
   │   → Transport Officer approves           │
   │   → Notify Chief Accountant              │
   │                                          │
   │ ELIF difference < 0 (refund):            │
   │   → Transport Officer + Chief Accountant │
   │   → If > X amount: + Principal           │
   └───────────────────────────────────────────┘
       ↓
[On approval, in single transaction:]
   - Update bus_subscriptions
   - Create bus_subscription_changes record
   - Create bus_subscription_settlements record
   - For students: add to receivables (next invoice)
   - For employees: deduct from next payroll
   - Generate accounting journal entry
   - Send notifications
   - Audit log
```

### 11.5 Default Configuration Values

All editable from admin UI:

| Setting | Default | Notes |
|---|---|---|
| Discount % for employees | 50% | Half-fare |
| Discount % for supervisors | 100% | Free |
| Discount % for drivers | 100% | Free (if employee) |
| Pro-rata calculation | Monthly proportional | |
| Academic year months | 10 | Sept-June |
| Change administrative fee | 0 EGP | |
| Cancellation fee | 0 EGP | |
| Refund method | Credit balance | Not cash refund |
| Suspension grace period | 7 days | After non-payment |
| Employee deduction timing | Next month payroll | |
| Allow waitlist | False | |
| Allow supervisor on multiple buses | False | |

### 11.6 Module Integrations

```
Transport Module
   │
   ├──→ Students Module (public.py)
   │   • get_student_by_id()
   │   • add_to_receivables()
   │
   ├──→ HR/Payroll Module (public.py)
   │   • get_employee_by_id()
   │   • register_payroll_deduction()
   │
   ├──→ Accounting Module (public.py)
   │   • create_journal_entry()
   │
   ├──→ Approval Workflow Engine
   │   • submit_request()
   │
   └──→ Notifications
       • notify_change()
```

---

## 12. Integration Architecture

### 12.1 ZKTeco Integration

**Pattern:** Adapter Pattern

```
┌─────────────────────────┐
│   AttendanceService     │
└─────────────────────────┘
            │
            ▼
┌─────────────────────────┐
│ AttendanceDeviceAdapter │  (Interface)
└─────────────────────────┘
            │
    ┌───────┴───────┬────────────┐
    ▼               ▼            ▼
┌─────────┐   ┌─────────┐  ┌──────────┐
│ ZKTeco  │   │ Suprema │  │ Hikvision│
│ Adapter │   │ Adapter │  │ Adapter  │
└─────────┘   └─────────┘  └──────────┘
```

**Sync Flow:**
1. Mini-PC runs sync agent (every 5 min)
2. Pulls new attendance logs via TCP/IP
3. Posts to Backend API
4. Backend stores raw logs, processes via Celery
5. Applies attendance rules, updates records

### 12.2 Email Integration

**Provider:** Brevo (300/day free, $9/month for 20K)

### 12.3 SMS (Optional)

**Local providers** like 4Jawaly, deferred unless required.

---

## 13. Deployment Architecture

### 13.1 Environments

| Environment | Purpose | Hosting |
|---|---|---|
| Development | Per-developer | Docker on dev machines |
| Staging | Integration, UAT | VPS (or shared dev server) |
| Production | Live system | Hostinger VPS |

### 13.2 Stack

- **Containerization:** Docker Compose
- **Web Server:** Nginx
- **Application Server:** Gunicorn (Django), Node (Next.js)
- **Process Manager:** systemd
- **Configuration:** Environment variables

### 13.3 CI/CD Pipeline

GitHub Actions:

```
PR → Lint → Type check → Tests → Coverage → Security scan → Build
Main → All PR steps → Deploy Staging → Smoke tests
Production → Manual trigger → Backup → Migrate → Deploy → Smoke tests
```

---

## 14. Performance Architecture

### 14.1 Targets

| Operation | Target |
|---|---|
| Login | < 500ms |
| List page | < 1s |
| Detail page | < 1s |
| Form submission | < 2s |
| Small report | < 5s |
| Large report | < 30s, async |
| Dashboard | < 2s |

### 14.2 Strategies

- DB indexes on FKs and search columns
- `select_related` / `prefetch_related` to avoid N+1
- Pagination on all lists
- Materialized views for heavy reports (Phase 1.5)
- Connection pooling (pgbouncer)
- Redis caching (permissions 5min, config 10min)
- Code splitting in frontend
- Cloudflare CDN
- Celery for heavy operations

---

## 15. Architecture Decision Records (ADRs)

### ADR-001: Python/Django over Node.js

**Decision:** Python 3.12 + Django 5 + DRF

**Rationale:** Team's Python expertise, mature ORM, built-in admin saves months.

### ADR-002: Modular Monolith over Microservices

**Decision:** Single Django app with logical module separation.

**Rationale:** Team of 4, single tenant, simpler operations.

### ADR-003: REST over GraphQL

**Decision:** REST API with OpenAPI.

**Rationale:** Team familiarity, simpler tooling, mobile-ready.

### ADR-004: PostgreSQL over MySQL

**Decision:** PostgreSQL 16

**Rationale:** Strong ACID, JSONB, better full-text search, mature.

### ADR-005: Configuration over Code

**Decision:** Business rules in configuration tables, editable from UI.

**Rationale:** School independence, fewer change requests.

### ADR-006: Single-Tenant

**Decision:** Build for El Shorouk only, no multi-tenant features.

**Rationale:** Eliminates 30% complexity. Future schools = separate deployments.

### ADR-007: VPS + Mini-PC Hybrid Hosting

**Decision:** Application on VPS, sync agent on Mini-PC.

**Rationale:** Remote access + offline resilience + low cost.

### ADR-008: Spec-Driven Development with GitHub Spec Kit

**Decision:** Use Spec Kit + Claude Code.

**Rationale:** Reduces ambiguity, better AI output, documentation as byproduct.

### ADR-009: Configurable Approval Workflow Engine ⭐

**Status:** Accepted

**Decision:** Build a dedicated approval engine where workflows are data, not code.

**Consequences:**
- ✅ School manages approval policies independently
- ✅ Eliminates 95% of "change approval rules" requests
- ✅ Versioning protects in-flight requests
- ❌ Adds 2-3 weeks to Phase 0
- ❌ Requires careful UI design

**Mitigation:** Comprehensive testing (100+ test cases), workflow tester before activation, training for school admin.

### ADR-010: Role Composition (User can hold multiple roles) ⭐

**Status:** Accepted

**Decision:** Users can hold multiple roles simultaneously. No "primary role" concept.

**Rationale:** El Shorouk currently has accountant doing 3 roles, student affairs doing 2 roles. System must support this.

### ADR-011: Fully-Rented Buses with Future-Proofing ⭐

**Status:** Accepted

**Decision:** All buses currently rented (with driver/fuel). Schema supports owned and partially-rented for future.

**Rationale:** Current school reality, but flexibility for future ownership.

### ADR-012: Configurable SoD with Override Workflow ⭐

**Status:** Accepted

**Decision:** SoD rules defined as data. Conflicts can be overridden via Principal-approved workflow.

**Rationale:** Small school flexibility while maintaining audit trail.

---

## 16. Scalability

- **Vertical:** Current 4 vCPU, 16GB → Year 5: 8 vCPU, 32GB (~$80/month)
- **Horizontal triggers:** Read replica, multiple backend instances if load demands
- **Architectural limit:** Modular Monolith scales to ~5,000 students

---

## 17. Glossary

| Term | Definition |
|---|---|
| Bounded Context | DDD: clear boundary for a domain model |
| Modular Monolith | Single deployable unit with logical separation |
| RBAC | Role-Based Access Control |
| SoD | Segregation of Duties |
| ORM | Object-Relational Mapping |
| WAL | Write-Ahead Log (PostgreSQL) |
| TOTP | Time-based One-Time Password |
| BFF | Backend for Frontend |
| ADR | Architecture Decision Record |
| Pro-rata | Proportional calculation by time |
| Workflow Type | Category of approval (e.g., 'discount') |
| Workflow Definition | Specific version of a workflow with rules |
| Workflow Step | Single approval step within a definition |
| Approval Request | An active instance of a workflow |
| Delegation | Temporary transfer of approval authority |

---

*End of Architecture Document*

> **Related Documents:**
> - `02_PROJECT_CHARTER.md` — Project foundation
> - `03_RISK_REGISTER.md` — Risk management
> - `06_USER_ROLES_AND_PERMISSIONS.md` — Detailed roles & permissions
> - `07_APPROVAL_WORKFLOWS.md` — Detailed workflow specifications (Round 2)
> - `08_TRANSPORT_MODULE.md` — Detailed transport module (Round 2)
