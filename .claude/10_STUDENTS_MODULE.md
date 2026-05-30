# Students Module — El Shorouk School Management System

> **Document Type:** Detailed Module Specification
> **Status:** v1.0 — Foundation
> **Date:** May 2026
> **Document Owner:** Project Tech Lead

---

## 1. Module Overview

### 1.1 Purpose

The Students Module is the **central core** of the entire school management system. Every other module (Fees, Cashier, Inventory, Transport, HR-related parents) revolves around the student entity.

This module manages:

- **Family-first architecture** — families as primary entities, students as members
- **Flexible guardianship** — any person (parent, grandparent, etc.) can be primary contact
- **Complete enrollment lifecycle** — from application to graduation/withdrawal
- **Academic structure** — KG + Primary + Preparatory + Secondary across National + International tracks
- **Fee structures** — set per stage + grade + track + academic year (configurable yearly)
- **Flexible installment plans** — 4 default plans + fully customizable
- **Two-tier discount system** — basic + additional with approval workflows
- **Outstanding debts tracking** — separate visibility for prior year debts
- **Sibling detection** — automatic identification for manual discount decisions
- **Track transfers** — National ↔ International with approval at any time
- **Grade promotion** — automatic with manual override for special cases
- **Student 360° View** — comprehensive single-page profile

### 1.2 Current El Shorouk Reality

| Aspect | Current State |
|---|---|
| Total students | ~1,500 |
| Stages | **4** (KG + Primary + Preparatory + Secondary) ⭐ |
| Tracks | 2 (National + International) |
| Fee structure | Set yearly per (stage + track + grade) |
| Installments | Flexible per family + 4 default plans |
| Cash discounts | Not offered |
| Late fees | Not charged |
| Carry-over debts | Supported (previous year balances visible separately) |
| Sibling discounts | Manual decision per case (system detects siblings) |

### 1.3 Key Design Decisions

1. **Family-first model** — Family is parent entity; students belong to families
2. **Flexible guardianship** — Primary contact can be any related person with documented relationship
3. **No automatic discounts** — All discounts are manual decisions (with system support)
4. **Outstanding debts visible** — Always shown separately as distinct line item
5. **Configuration over Code** — All business rules editable from UI
6. **Audit everything** — Every change to student data is logged
7. **4 default installment plans + custom** — Balance simplicity with flexibility

---

## 2. Module Position in Architecture

### 2.1 Bounded Context

```
┌────────────────────────────────────────────────────────────────┐
│                    STUDENTS MODULE                             │
│                                                                │
│  Owns:                                                         │
│  • Families & Family Members                                   │
│  • Students (master data)                                      │
│  • Applications & Exam Records                                 │
│  • Enrollments per academic year                               │
│  • Stages, Tracks, Grade Levels (academic structure)           │
│  • Fee Structures                                              │
│  • Student Invoices & Installment Plans                        │
│  • Discounts (basic + additional)                              │
│  • Outstanding Debts (carry-over)                              │
│  • Credit Balances                                             │
│  • Promotions, Transfers, Withdrawals                          │
│  • Student Documents & Notes                                   │
│                                                                │
│  Public API (students.public):                                 │
│  • get_student_by_id(...)                                      │
│  • get_student_payment_status(...)                             │
│  • get_student_grade_and_track(...)                            │
│  • get_active_students(...)                                    │
│  • get_siblings(...)                                           │
│  • add_to_receivables(...)                                     │
│  • add_credit_balance(...)                                     │
│  • get_student_360_view(...)                                   │
│  • check_eligibility_for_service(...)                          │
└────────────────────────────────────────────────────────────────┘
```

### 2.2 Dependencies

```
Students Module is depended ON BY:
├── Fees Module (uses students)
├── Cashier Module (collects payments from students)
├── Accounting Module (creates entries for student transactions)
├── Inventory Module (sells to students, checks payment status)
├── Transport Module (subscribes students to buses)
├── HR Module (links family members who work at school)
└── Reports Module (generates student-related reports)

Students Module DEPENDS ON:
├── Approval Workflow Engine (submit_request)
├── Notifications Module (notify_family)
├── Audit Module (audit_log)
└── Configuration Module (get_config)
```

---

## 3. Core Concepts

### 3.1 The Family-First Model

```
                ┌────────────────┐
                │     FAMILY     │
                │  (parent unit) │
                └────────┬───────┘
                         │
        ┌────────────────┼────────────────┐
        │                │                │
        ▼                ▼                ▼
┌──────────────┐  ┌──────────────┐  ┌──────────────┐
│  MEMBER 1    │  │  MEMBER 2    │  │  MEMBER 3    │
│  (Father)    │  │  (Mother)    │  │  (Grandfather)│
│  Primary ✓   │  │              │  │              │
└──────────────┘  └──────────────┘  └──────────────┘
        │                │                │
        └────────────────┴────────────────┘
                         │
                         │ (Guardians of)
                         │
        ┌────────────────┼────────────────┐
        │                │                │
        ▼                ▼                ▼
┌──────────────┐  ┌──────────────┐  ┌──────────────┐
│  STUDENT 1   │  │  STUDENT 2   │  │  STUDENT 3   │
│  (Eldest)    │  │  (Middle)    │  │  (Youngest)  │
└──────────────┘  └──────────────┘  └──────────────┘
```

**Why Family-First?**

1. Single source of truth for family contact info
2. Automatic sibling detection
3. Family-level financial view (total fees across children)
4. Communication efficiency (one notification to family)
5. Easier discount review with full family context
6. Future flexibility for parent app (Phase 2)

### 3.2 The Student Lifecycle

```
                    ┌───────────────────┐
                    │     APPLICANT     │
                    └─────────┬─────────┘
                              │ File fee paid
                              ▼
                    ┌───────────────────┐
                    │ UNDER_EXAMINATION │
                    └─────────┬─────────┘
                              │ Exam taken (offline)
                              ▼
                ┌─────────────┴─────────────┐
                ▼                           ▼
        ┌──────────────┐            ┌──────────────┐
        │   REJECTED   │            │   ACCEPTED   │
        └──────────────┘            └──────┬───────┘
                                           │ Activation
                                           ▼
                                    ┌──────────────┐
                                    │    ACTIVE    │
                                    └──────┬───────┘
                                           │
                          ┌────────────────┼────────────────┐
                          ▼                ▼                ▼
                   ┌────────────┐  ┌────────────┐  ┌────────────┐
                   │ GRADUATED  │  │ WITHDRAWN  │  │ TRANSFERRED│
                   └────────────┘  └────────────┘  └────────────┘
                                           │                │
                                           ▼                ▼
                                    ┌────────────┐  ┌────────────┐
                                    │  ARCHIVED  │  │  ARCHIVED  │
                                    │ (after 1y) │  │ (after 1y) │
                                    └────────────┘  └────────────┘

Special Statuses (during ACTIVE):
- SUSPENDED: temporary hold (behavior, payment issues)
- REPEATING: held back to repeat current grade
```

### 3.3 The Two-Account System for Outstanding Debts

When student has unpaid balance from previous year(s):

```
┌──────────────────────────────────────────────────────┐
│              STUDENT FINANCIAL VIEW                  │
├──────────────────────────────────────────────────────┤
│                                                      │
│  ⚠️ OUTSTANDING DEBTS (Previous Years)               │
│  ┌────────────────────────────────────────────┐    │
│  │ Year 2024-2025: 5,000 EGP unpaid          │    │
│  │ Year 2025-2026: 2,000 EGP unpaid          │    │
│  │ ────────────────────────────────────────  │    │
│  │ TOTAL OUTSTANDING: 7,000 EGP              │    │
│  │ [View Payment Plan]                       │    │
│  └────────────────────────────────────────────┘    │
│                                                      │
│  📋 CURRENT YEAR (2026-2027)                        │
│  ┌────────────────────────────────────────────┐    │
│  │ Total Fees: 30,000 EGP                    │    │
│  │ Paid: 15,000 EGP                          │    │
│  │ Remaining: 15,000 EGP                     │    │
│  │ Next installment: 5,000 EGP (Dec 2026)    │    │
│  └────────────────────────────────────────────┘    │
│                                                      │
│  💰 CREDIT BALANCE: 0 EGP                            │
│                                                      │
│  ─────────────────────────────────────────────────  │
│  TOTAL OWED TO SCHOOL: 22,000 EGP                   │
└──────────────────────────────────────────────────────┘
```

### 3.4 The Two-Tier Discount System

```
GROSS FEES (e.g., 30,000 EGP)
    │
    ▼
[Apply BASIC Discount]    ──→  e.g., 10% off gross = 3,000 EGP
    │
    ▼
AFTER BASIC (27,000 EGP)
    │
    ▼
[Apply ADDITIONAL Discount] ──→  e.g., 5% off after_basic = 1,350 EGP
    │
    ▼
NET FEES (25,650 EGP)
```

**Important:** Each discount tier has its own approval workflow. Different limits apply to each tier.

---

## 4. Database Schema

### 4.1 Family Tables

#### 4.1.1 `families`

```sql
CREATE TABLE families (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR(50) UNIQUE NOT NULL,
    
    family_name_ar VARCHAR(200) NOT NULL,
    family_name_en VARCHAR(200),
    
    primary_contact_member_id UUID,            -- FK set after members added
    
    address_line1 VARCHAR(300),
    address_line2 VARCHAR(300),
    city VARCHAR(100),
    governorate VARCHAR(100),
    country VARCHAR(50) DEFAULT 'Egypt',
    postal_code VARCHAR(20),
    
    preferred_language VARCHAR(10) DEFAULT 'ar',
    preferred_contact_method VARCHAR(20) DEFAULT 'phone',
    
    socioeconomic_notes TEXT,
    
    is_active BOOLEAN DEFAULT TRUE,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES users(id),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    updated_by UUID REFERENCES users(id),
    deleted_at TIMESTAMPTZ
);

CREATE INDEX idx_families_active ON families(is_active) WHERE deleted_at IS NULL;
```

#### 4.1.2 `family_members`

```sql
CREATE TABLE family_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR(50) UNIQUE NOT NULL,
    family_id UUID NOT NULL REFERENCES families(id),
    
    full_name_ar VARCHAR(300) NOT NULL,
    full_name_en VARCHAR(300),
    gender VARCHAR(10),
    date_of_birth DATE,
    nationality VARCHAR(50) DEFAULT 'Egyptian',
    religion VARCHAR(50),
    
    national_id VARCHAR(20),
    passport_number VARCHAR(20),
    
    relationship_role VARCHAR(50) NOT NULL,
    -- Values: father / mother / grandfather / grandmother / 
    -- uncle / aunt / sibling_guardian / legal_guardian / other
    relationship_other_description VARCHAR(200),
    
    occupation VARCHAR(200),
    employer VARCHAR(200),
    
    phone_primary VARCHAR(50),
    phone_secondary VARCHAR(50),
    phone_work VARCHAR(50),
    email VARCHAR(100),
    
    has_different_address BOOLEAN DEFAULT FALSE,
    address_line1 VARCHAR(300),
    city VARCHAR(100),
    
    is_primary_contact BOOLEAN DEFAULT FALSE,
    can_pickup_students BOOLEAN DEFAULT TRUE,
    can_view_financials BOOLEAN DEFAULT FALSE,
    can_attend_meetings BOOLEAN DEFAULT TRUE,
    receives_notifications BOOLEAN DEFAULT TRUE,
    can_approve_field_trips BOOLEAN DEFAULT FALSE,
    
    is_school_employee BOOLEAN DEFAULT FALSE,
    employee_id UUID REFERENCES employees(id),
    
    is_active BOOLEAN DEFAULT TRUE,
    is_deceased BOOLEAN DEFAULT FALSE,
    deceased_date DATE,
    
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    deleted_at TIMESTAMPTZ
);

CREATE INDEX idx_members_family ON family_members(family_id);
CREATE INDEX idx_members_national_id ON family_members(national_id) WHERE national_id IS NOT NULL;
CREATE INDEX idx_members_primary ON family_members(family_id) WHERE is_primary_contact = TRUE;
CREATE INDEX idx_members_employee ON family_members(employee_id) WHERE is_school_employee = TRUE;
```

### 4.2 Academic Structure Tables

#### 4.2.1 `stages` (4 stages including KG)

```sql
CREATE TABLE stages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR(20) UNIQUE NOT NULL,
    name_ar VARCHAR(100) NOT NULL,
    name_en VARCHAR(100),
    
    sort_order INTEGER NOT NULL,
    starting_grade_number INTEGER NOT NULL,
    ending_grade_number INTEGER NOT NULL,
    default_minimum_age_years INTEGER,
    default_maximum_age_years INTEGER,
    
    has_dedicated_coordinator BOOLEAN DEFAULT FALSE,
    coordinator_user_id UUID REFERENCES users(id),
    
    is_active BOOLEAN DEFAULT TRUE,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    deleted_at TIMESTAMPTZ
);

-- Default seed (4 stages including KG)
INSERT INTO stages (code, name_ar, name_en, sort_order, starting_grade_number, ending_grade_number, default_minimum_age_years) VALUES
('KG',   'حضانة (KG)', 'Kindergarten', 1, 0,  1,  4),
('PRI',  'ابتدائي',    'Primary',      2, 1,  6,  6),
('PREP', 'إعدادي',     'Preparatory',  3, 7,  9,  12),
('SEC',  'ثانوي',      'Secondary',    4, 10, 12, 15);
```

#### 4.2.2 `tracks`

```sql
CREATE TABLE tracks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR(20) UNIQUE NOT NULL,
    name_ar VARCHAR(100) NOT NULL,
    name_en VARCHAR(100),
    description TEXT,
    curriculum_authority VARCHAR(100),
    available_for_stages UUID[] DEFAULT '{}',
    is_active BOOLEAN DEFAULT TRUE,
    sort_order INTEGER,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    deleted_at TIMESTAMPTZ
);

INSERT INTO tracks (code, name_ar, name_en, sort_order) VALUES
('NAT', 'وطني', 'National', 1),
('INT', 'دولي', 'International', 2);
```

#### 4.2.3 `grade_levels`

```sql
CREATE TABLE grade_levels (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR(20) UNIQUE NOT NULL,
    name_ar VARCHAR(100) NOT NULL,
    name_en VARCHAR(100),
    stage_id UUID NOT NULL REFERENCES stages(id),
    grade_number INTEGER NOT NULL,
    sort_order INTEGER NOT NULL,
    default_age_years INTEGER,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Total: 14 grade levels (KG1, KG2, P1-P6, PREP1-PREP3, SEC1-SEC3)
```

#### 4.2.4 `academic_years`

```sql
CREATE TABLE academic_years (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR(20) UNIQUE NOT NULL,
    name_ar VARCHAR(100) NOT NULL,
    name_en VARCHAR(100),
    
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    
    has_terms BOOLEAN DEFAULT TRUE,
    number_of_terms INTEGER DEFAULT 2,
    
    is_current BOOLEAN DEFAULT FALSE,
    is_archived BOOLEAN DEFAULT FALSE,
    
    enrollment_starts_at DATE,
    enrollment_ends_at DATE,
    fees_finalized_at DATE,
    grade_promotion_date DATE,
    
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    deleted_at TIMESTAMPTZ,
    
    CONSTRAINT valid_dates CHECK (end_date > start_date)
);

CREATE INDEX idx_academic_years_current ON academic_years(is_current) WHERE is_current = TRUE;
```

### 4.3 Student Core Tables

#### 4.3.1 `students` (Master Table)

```sql
CREATE TABLE students (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR(50) UNIQUE NOT NULL,          -- "STU-2026-0001"
    
    family_id UUID NOT NULL REFERENCES families(id),
    
    full_name_ar VARCHAR(300) NOT NULL,
    full_name_en VARCHAR(300),
    nickname VARCHAR(100),
    
    gender VARCHAR(10) NOT NULL,
    date_of_birth DATE NOT NULL,
    place_of_birth VARCHAR(200),
    nationality VARCHAR(50) DEFAULT 'Egyptian',
    religion VARCHAR(50),
    
    national_id VARCHAR(20) UNIQUE,
    passport_number VARCHAR(20),
    
    photo_url VARCHAR(500),
    
    status VARCHAR(20) NOT NULL DEFAULT 'applicant',
    status_changed_at TIMESTAMPTZ DEFAULT NOW(),
    status_change_reason TEXT,
    
    application_id UUID,
    first_application_date DATE,
    
    accepted_at TIMESTAMPTZ,
    accepted_by UUID REFERENCES users(id),
    
    activated_at TIMESTAMPTZ,
    activated_for_year_id UUID REFERENCES academic_years(id),
    
    withdrawn_at TIMESTAMPTZ,
    withdrawn_by UUID REFERENCES users(id),
    withdrawal_reason TEXT,
    
    graduated_at TIMESTAMPTZ,
    graduation_year_id UUID REFERENCES academic_years(id),
    
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES users(id),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    updated_by UUID REFERENCES users(id),
    deleted_at TIMESTAMPTZ,
    
    CONSTRAINT valid_gender CHECK (gender IN ('male', 'female')),
    CONSTRAINT valid_status CHECK (status IN (
        'applicant', 'under_examination', 'rejected', 'accepted',
        'active', 'suspended', 'repeating', 'withdrawn', 'graduated',
        'transferred', 'archived'
    ))
);

CREATE INDEX idx_students_family ON students(family_id);
CREATE INDEX idx_students_status ON students(status);
CREATE INDEX idx_students_active ON students(id) WHERE status = 'active';
CREATE INDEX idx_students_national_id ON students(national_id) WHERE national_id IS NOT NULL;
```

#### 4.3.2 Other Student Tables (summarized)

The module also includes these supporting tables:

- **`student_health_records`** — blood type, allergies, medications, emergency contact
- **`student_previous_education`** — prior school history
- **`student_documents`** — uploaded documents (birth cert, ID, etc.)
- **`student_status_history`** — audit of all status changes
- **`student_notes`** — administrative notes (behavioral, academic, etc.)

### 4.4 Application & Enrollment Tables

#### 4.4.1 `student_applications`

```sql
CREATE TABLE student_applications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR(50) UNIQUE NOT NULL,          -- "APP-2026-0001"
    
    student_id UUID REFERENCES students(id),
    family_id UUID NOT NULL REFERENCES families(id),
    
    academic_year_id UUID NOT NULL REFERENCES academic_years(id),
    requested_stage_id UUID NOT NULL REFERENCES stages(id),
    requested_grade_level_id UUID NOT NULL REFERENCES grade_levels(id),
    requested_track_id UUID NOT NULL REFERENCES tracks(id),
    
    application_date DATE NOT NULL DEFAULT CURRENT_DATE,
    received_by UUID NOT NULL REFERENCES users(id),
    
    file_fee_amount NUMERIC(12,2) NOT NULL,
    file_fee_paid BOOLEAN DEFAULT FALSE,
    file_fee_receipt_id UUID,
    file_fee_paid_date DATE,
    
    exam_scheduled_date DATE,
    exam_completed BOOLEAN DEFAULT FALSE,
    exam_record_id UUID,
    
    decision VARCHAR(20),                      -- pending / accept / reject
    decision_date DATE,
    decision_by UUID REFERENCES users(id),
    decision_reason TEXT,
    
    -- Manual decision factors (per requirement: no automatic threshold)
    decision_factors JSONB DEFAULT '{}',
    
    converted_to_student BOOLEAN DEFAULT FALSE,
    converted_at TIMESTAMPTZ,
    
    status VARCHAR(20) NOT NULL DEFAULT 'draft',
    
    approval_request_id UUID REFERENCES approval_requests(id),
    
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    deleted_at TIMESTAMPTZ
);

CREATE INDEX idx_applications_status ON student_applications(status);
CREATE INDEX idx_applications_year ON student_applications(academic_year_id);
CREATE INDEX idx_applications_family ON student_applications(family_id);
```

#### 4.4.2 `student_exam_records`

```sql
CREATE TABLE student_exam_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    application_id UUID NOT NULL REFERENCES student_applications(id),
    student_id UUID REFERENCES students(id),
    
    exam_date DATE NOT NULL,
    exam_location VARCHAR(200),
    exam_type VARCHAR(50),
    
    -- Flexible scoring (different exams have different subjects)
    subject_scores JSONB DEFAULT '[]',
    -- Format: [{"subject": "Arabic", "max_score": 100, "score": 85}, ...]
    
    total_score NUMERIC(8,2),
    max_total_score NUMERIC(8,2),
    percentage NUMERIC(5,2),
    
    -- Manual decision (per requirement)
    result VARCHAR(20),                        -- pass / fail / conditional / pending
    
    examiner_name VARCHAR(200),
    examiner_notes TEXT,
    strengths TEXT,
    weaknesses TEXT,
    recommendations TEXT,
    
    is_reexam BOOLEAN DEFAULT FALSE,
    previous_exam_id UUID REFERENCES student_exam_records(id),
    
    exam_paper_url VARCHAR(500),
    
    recorded_at TIMESTAMPTZ DEFAULT NOW(),
    recorded_by UUID REFERENCES users(id),
    
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_exam_records_application ON student_exam_records(application_id);
```

#### 4.4.3 `student_enrollments`

```sql
CREATE TABLE student_enrollments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR(50) UNIQUE NOT NULL,
    student_id UUID NOT NULL REFERENCES students(id),
    
    academic_year_id UUID NOT NULL REFERENCES academic_years(id),
    stage_id UUID NOT NULL REFERENCES stages(id),
    grade_level_id UUID NOT NULL REFERENCES grade_levels(id),
    track_id UUID NOT NULL REFERENCES tracks(id),
    
    class_section VARCHAR(50),
    
    enrollment_date DATE NOT NULL DEFAULT CURRENT_DATE,
    end_date DATE,
    end_reason VARCHAR(50),
    
    status VARCHAR(20) NOT NULL DEFAULT 'active',
    enrollment_source VARCHAR(30),
    
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES users(id),
    
    UNIQUE(student_id, academic_year_id)
);

CREATE INDEX idx_enrollments_student ON student_enrollments(student_id);
CREATE INDEX idx_enrollments_year ON student_enrollments(academic_year_id);
```

### 4.5 Fees Tables

#### 4.5.1 `fee_structures`

```sql
CREATE TABLE fee_structures (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR(50) UNIQUE NOT NULL,
    
    academic_year_id UUID NOT NULL REFERENCES academic_years(id),
    stage_id UUID NOT NULL REFERENCES stages(id),
    grade_level_id UUID NOT NULL REFERENCES grade_levels(id),
    track_id UUID NOT NULL REFERENCES tracks(id),
    
    -- Tuition only (per requirement: books/uniform/transport separate)
    tuition_fee NUMERIC(12,2) NOT NULL,
    
    -- Other mandatory fees
    activity_fee NUMERIC(12,2) DEFAULT 0,
    technology_fee NUMERIC(12,2) DEFAULT 0,
    materials_fee NUMERIC(12,2) DEFAULT 0,
    
    -- File fee (one-time at application)
    file_fee NUMERIC(12,2) NOT NULL DEFAULT 0,
    
    total_annual_fees NUMERIC(12,2) GENERATED ALWAYS AS 
        (tuition_fee + activity_fee + technology_fee + materials_fee) STORED,
    
    is_active BOOLEAN DEFAULT TRUE,
    is_finalized BOOLEAN DEFAULT FALSE,
    finalized_at TIMESTAMPTZ,
    finalized_by UUID REFERENCES users(id),
    
    approval_request_id UUID REFERENCES approval_requests(id),
    
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES users(id),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    deleted_at TIMESTAMPTZ,
    
    UNIQUE(academic_year_id, stage_id, grade_level_id, track_id)
);

CREATE INDEX idx_fee_structures_lookup ON fee_structures(academic_year_id, grade_level_id, track_id);
```

#### 4.5.2 `student_fee_invoices`

```sql
CREATE TABLE student_fee_invoices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR(50) UNIQUE NOT NULL,
    
    student_id UUID NOT NULL REFERENCES students(id),
    enrollment_id UUID NOT NULL REFERENCES student_enrollments(id),
    academic_year_id UUID NOT NULL REFERENCES academic_years(id),
    
    fee_structure_id UUID NOT NULL REFERENCES fee_structures(id),
    
    -- Snapshot from fee structure
    gross_tuition_fee NUMERIC(12,2) NOT NULL,
    gross_activity_fee NUMERIC(12,2) DEFAULT 0,
    gross_technology_fee NUMERIC(12,2) DEFAULT 0,
    gross_materials_fee NUMERIC(12,2) DEFAULT 0,
    gross_total NUMERIC(12,2) NOT NULL,
    
    -- Two-tier discounts
    basic_discount_pct NUMERIC(5,2) DEFAULT 0,
    basic_discount_amount NUMERIC(12,2) DEFAULT 0,
    after_basic_amount NUMERIC(12,2) NOT NULL,
    
    additional_discount_pct NUMERIC(5,2) DEFAULT 0,
    additional_discount_amount NUMERIC(12,2) DEFAULT 0,
    
    total_discount_amount NUMERIC(12,2) GENERATED ALWAYS AS 
        (basic_discount_amount + additional_discount_amount) STORED,
    total_discount_pct NUMERIC(5,2),
    
    net_total NUMERIC(12,2) NOT NULL,
    
    paid_amount NUMERIC(12,2) DEFAULT 0,
    remaining_amount NUMERIC(12,2) GENERATED ALWAYS AS 
        (net_total - paid_amount) STORED,
    
    status VARCHAR(20) NOT NULL DEFAULT 'draft',
    
    basic_discount_approval_id UUID REFERENCES approval_requests(id),
    additional_discount_approval_id UUID REFERENCES approval_requests(id),
    
    discount_reason TEXT,
    notes TEXT,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES users(id),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    finalized_at TIMESTAMPTZ,
    deleted_at TIMESTAMPTZ
);

CREATE INDEX idx_invoices_student ON student_fee_invoices(student_id);
CREATE INDEX idx_invoices_year ON student_fee_invoices(academic_year_id);
CREATE INDEX idx_invoices_status ON student_fee_invoices(status);
```

#### 4.5.3 `student_installment_plans`

```sql
CREATE TABLE student_installment_plans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR(50) UNIQUE NOT NULL,
    
    invoice_id UUID NOT NULL UNIQUE REFERENCES student_fee_invoices(id),
    student_id UUID NOT NULL REFERENCES students(id),
    
    -- 4 default plans + custom
    plan_type VARCHAR(20) NOT NULL,
    -- Values: lump_sum / two_payments / three_payments / monthly / custom
    
    total_amount NUMERIC(12,2) NOT NULL,
    number_of_installments INTEGER NOT NULL,
    
    status VARCHAR(20) NOT NULL DEFAULT 'active',
    
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES users(id),
    
    replaces_plan_id UUID REFERENCES student_installment_plans(id),
    restructure_reason TEXT,
    
    deleted_at TIMESTAMPTZ
);

CREATE INDEX idx_plans_student ON student_installment_plans(student_id);
```

#### 4.5.4 `student_installments`

```sql
CREATE TABLE student_installments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR(50) UNIQUE NOT NULL,
    
    plan_id UUID NOT NULL REFERENCES student_installment_plans(id),
    student_id UUID NOT NULL REFERENCES students(id),
    
    installment_number INTEGER NOT NULL,
    due_date DATE NOT NULL,
    amount NUMERIC(12,2) NOT NULL,
    
    paid_amount NUMERIC(12,2) DEFAULT 0,
    remaining_amount NUMERIC(12,2) GENERATED ALWAYS AS 
        (amount - paid_amount) STORED,
    
    status VARCHAR(20) NOT NULL DEFAULT 'pending',
    -- Values: pending / partially_paid / paid / overdue / waived / cancelled
    
    last_payment_date DATE,
    last_payment_id UUID,
    
    reminder_sent_at TIMESTAMPTZ,
    reminder_count INTEGER DEFAULT 0,
    
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    deleted_at TIMESTAMPTZ,
    
    UNIQUE(plan_id, installment_number)
);

CREATE INDEX idx_installments_plan ON student_installments(plan_id);
CREATE INDEX idx_installments_student ON student_installments(student_id, due_date);
CREATE INDEX idx_installments_overdue ON student_installments(due_date, status) 
    WHERE status IN ('pending', 'partially_paid');
```

#### 4.5.5 `student_outstanding_debts`

```sql
CREATE TABLE student_outstanding_debts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR(50) UNIQUE NOT NULL,
    
    student_id UUID NOT NULL REFERENCES students(id),
    
    debt_from_academic_year_id UUID NOT NULL REFERENCES academic_years(id),
    debt_from_invoice_id UUID REFERENCES student_fee_invoices(id),
    
    original_amount NUMERIC(12,2) NOT NULL,
    paid_amount NUMERIC(12,2) DEFAULT 0,
    remaining_amount NUMERIC(12,2) GENERATED ALWAYS AS 
        (original_amount - paid_amount) STORED,
    
    recognized_at_year_id UUID REFERENCES academic_years(id),
    recognized_at TIMESTAMPTZ DEFAULT NOW(),
    
    has_payment_plan BOOLEAN DEFAULT FALSE,
    payment_plan_id UUID REFERENCES student_installment_plans(id),
    
    status VARCHAR(20) NOT NULL DEFAULT 'active',
    
    acceptance_approval_id UUID REFERENCES approval_requests(id),
    
    -- Service impact (configurable per debt)
    blocks_inventory_purchase BOOLEAN DEFAULT TRUE,
    blocks_transport_subscription BOOLEAN DEFAULT FALSE,
    blocks_re_enrollment BOOLEAN DEFAULT FALSE,
    
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    deleted_at TIMESTAMPTZ
);

CREATE INDEX idx_debts_student ON student_outstanding_debts(student_id);
CREATE INDEX idx_debts_active ON student_outstanding_debts(student_id) WHERE status = 'active';
```

#### 4.5.6 `student_credit_balance`

```sql
CREATE TABLE student_credit_balance (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID NOT NULL UNIQUE REFERENCES students(id),
    
    current_balance NUMERIC(12,2) DEFAULT 0,
    last_updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### 4.6 Transitions Tables

#### 4.6.1 `student_grade_promotions`

```sql
CREATE TABLE student_grade_promotions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID NOT NULL REFERENCES students(id),
    
    from_academic_year_id UUID NOT NULL REFERENCES academic_years(id),
    to_academic_year_id UUID NOT NULL REFERENCES academic_years(id),
    
    from_grade_level_id UUID NOT NULL REFERENCES grade_levels(id),
    to_grade_level_id UUID NOT NULL REFERENCES grade_levels(id),
    
    promotion_type VARCHAR(20) NOT NULL,
    -- Values: automatic / manual_override / repeat / skip
    
    reason TEXT,
    decision_factors JSONB,
    
    requires_approval BOOLEAN DEFAULT FALSE,
    approval_request_id UUID REFERENCES approval_requests(id),
    
    status VARCHAR(20) NOT NULL DEFAULT 'pending',
    
    executed_at TIMESTAMPTZ,
    executed_by UUID REFERENCES users(id),
    
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES users(id)
);

CREATE INDEX idx_promotions_student ON student_grade_promotions(student_id);
```

#### 4.6.2 `student_track_transfers`

```sql
CREATE TABLE student_track_transfers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID NOT NULL REFERENCES students(id),
    
    from_track_id UUID NOT NULL REFERENCES tracks(id),
    to_track_id UUID NOT NULL REFERENCES tracks(id),
    
    effective_academic_year_id UUID NOT NULL REFERENCES academic_years(id),
    effective_date DATE NOT NULL,
    
    reason TEXT NOT NULL,
    requesting_party VARCHAR(50),
    
    conditions TEXT,
    conditions_met BOOLEAN DEFAULT FALSE,
    
    fee_difference NUMERIC(12,2),
    fee_settlement_method VARCHAR(30),
    
    approval_request_id UUID REFERENCES approval_requests(id),
    approved_by UUID REFERENCES users(id),
    
    status VARCHAR(20) NOT NULL DEFAULT 'pending',
    executed_at TIMESTAMPTZ,
    
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES users(id)
);

CREATE INDEX idx_track_transfers_student ON student_track_transfers(student_id);
```

#### 4.6.3 `student_withdrawals`

```sql
CREATE TABLE student_withdrawals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR(50) UNIQUE NOT NULL,
    
    student_id UUID NOT NULL REFERENCES students(id),
    
    withdrawal_reason VARCHAR(50),
    detailed_reason TEXT NOT NULL,
    
    destination_school VARCHAR(300),
    destination_country VARCHAR(50),
    
    requested_date DATE NOT NULL DEFAULT CURRENT_DATE,
    effective_date DATE NOT NULL,
    
    fee_invoice_id UUID REFERENCES student_fee_invoices(id),
    paid_so_far NUMERIC(12,2) DEFAULT 0,
    refundable_amount NUMERIC(12,2) DEFAULT 0,
    outstanding_balance NUMERIC(12,2) DEFAULT 0,
    
    refund_method VARCHAR(20),
    
    bus_subscription_to_cancel BOOLEAN DEFAULT FALSE,
    inventory_returns_pending BOOLEAN DEFAULT FALSE,
    documents_to_collect BOOLEAN DEFAULT TRUE,
    
    transfer_certificate_issued BOOLEAN DEFAULT FALSE,
    transfer_certificate_number VARCHAR(100),
    transfer_certificate_date DATE,
    clearance_letter_issued BOOLEAN DEFAULT FALSE,
    
    approval_request_id UUID REFERENCES approval_requests(id),
    approved_by UUID REFERENCES users(id),
    approved_at TIMESTAMPTZ,
    
    status VARCHAR(20) NOT NULL DEFAULT 'pending',
    
    processed_at TIMESTAMPTZ,
    processed_by UUID REFERENCES users(id),
    completed_at TIMESTAMPTZ,
    
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES users(id)
);

CREATE INDEX idx_withdrawals_student ON student_withdrawals(student_id);
CREATE INDEX idx_withdrawals_status ON student_withdrawals(status);
```

---

## 5. Engines & Services

### 5.1 Two-Tier Discount Calculator

```python
from decimal import Decimal, ROUND_HALF_UP
from dataclasses import dataclass


@dataclass
class DiscountCalculationResult:
    gross_amount: Decimal
    basic_discount_pct: Decimal
    basic_discount_amount: Decimal
    after_basic_amount: Decimal
    additional_discount_pct: Decimal
    additional_discount_amount: Decimal
    total_discount_amount: Decimal
    total_discount_pct: Decimal
    net_amount: Decimal


class TwoTierDiscountCalculator:
    """
    Calculates two-tier discount on student fees.
    
    Tier 1 (Basic): % off gross
    Tier 2 (Additional): % off net after basic
    """
    
    def calculate(
        self,
        gross_amount: Decimal,
        basic_discount_pct: Decimal = Decimal('0'),
        additional_discount_pct: Decimal = Decimal('0'),
    ) -> DiscountCalculationResult:
        # Validate
        if not (0 <= basic_discount_pct <= 100):
            raise ValueError("Basic discount % must be 0-100")
        if not (0 <= additional_discount_pct <= 100):
            raise ValueError("Additional discount % must be 0-100")
        
        # Tier 1: Basic discount on gross
        basic_amount = (gross_amount * basic_discount_pct / Decimal('100')).quantize(
            Decimal('0.01'), rounding=ROUND_HALF_UP
        )
        after_basic = gross_amount - basic_amount
        
        # Tier 2: Additional discount on after_basic
        additional_amount = (after_basic * additional_discount_pct / Decimal('100')).quantize(
            Decimal('0.01'), rounding=ROUND_HALF_UP
        )
        net_amount = after_basic - additional_amount
        
        # Total
        total_discount = basic_amount + additional_amount
        total_pct = (total_discount / gross_amount * Decimal('100')).quantize(
            Decimal('0.01'), rounding=ROUND_HALF_UP
        ) if gross_amount > 0 else Decimal('0')
        
        return DiscountCalculationResult(
            gross_amount=gross_amount,
            basic_discount_pct=basic_discount_pct,
            basic_discount_amount=basic_amount,
            after_basic_amount=after_basic,
            additional_discount_pct=additional_discount_pct,
            additional_discount_amount=additional_amount,
            total_discount_amount=total_discount,
            total_discount_pct=total_pct,
            net_amount=net_amount,
        )
```

### 5.2 Installment Plan Builder

```python
from datetime import date, timedelta
from typing import List
from dataclasses import dataclass


@dataclass
class InstallmentScheduleItem:
    installment_number: int
    due_date: date
    amount: Decimal


class InstallmentPlanBuilder:
    """
    Builds installment plans (4 default templates + custom).
    """
    
    DEFAULT_PLANS = {
        'lump_sum': {
            'count': 1,
            'months_offset': [0],
            'distribution': 'equal',
        },
        'two_payments': {
            'count': 2,
            'months_offset': [0, 4],   # Sep + Jan
            'distribution': 'equal',
        },
        'three_payments': {
            'count': 3,
            'months_offset': [0, 3, 6],   # Sep + Dec + Mar
            'distribution': 'equal',
        },
        'monthly': {
            'count': 10,
            'months_offset': list(range(10)),  # Sep through June
            'distribution': 'equal',
        },
    }
    
    def build_default_plan(
        self,
        plan_type: str,
        total_amount: Decimal,
        academic_year_start: date,
    ) -> List[InstallmentScheduleItem]:
        if plan_type not in self.DEFAULT_PLANS:
            raise ValueError(f"Unknown plan type: {plan_type}")
        
        config = self.DEFAULT_PLANS[plan_type]
        count = config['count']
        offsets = config['months_offset']
        
        # Equal distribution (with last installment absorbing rounding)
        per_installment = (total_amount / count).quantize(
            Decimal('0.01'), rounding=ROUND_HALF_UP
        )
        
        installments = []
        running_total = Decimal('0')
        
        for i, month_offset in enumerate(offsets):
            due_date = self._add_months(academic_year_start, month_offset)
            
            if i == count - 1:  # Last installment absorbs rounding
                amount = total_amount - running_total
            else:
                amount = per_installment
                running_total += amount
            
            installments.append(InstallmentScheduleItem(
                installment_number=i + 1,
                due_date=due_date,
                amount=amount,
            ))
        
        return installments
    
    def build_custom_plan(
        self,
        installments_spec: List[dict],
        total_amount: Decimal,
    ) -> List[InstallmentScheduleItem]:
        """
        Build fully custom plan from user spec.
        installments_spec: [{"due_date": date, "amount": Decimal}, ...]
        """
        # Validate sum matches total
        spec_sum = sum(item['amount'] for item in installments_spec)
        if spec_sum != total_amount:
            raise ValueError(
                f"Installments sum ({spec_sum}) doesn't match total ({total_amount})"
            )
        
        # Validate all amounts positive
        for item in installments_spec:
            if item['amount'] <= 0:
                raise ValueError("All installments must be positive")
        
        # Sort by date
        sorted_items = sorted(installments_spec, key=lambda x: x['due_date'])
        
        return [
            InstallmentScheduleItem(
                installment_number=i + 1,
                due_date=item['due_date'],
                amount=item['amount'],
            )
            for i, item in enumerate(sorted_items)
        ]
    
    def _add_months(self, source_date: date, months: int) -> date:
        """Add N months to a date."""
        month = source_date.month - 1 + months
        year = source_date.year + month // 12
        month = month % 12 + 1
        day = min(source_date.day, [31,29,31,30,31,30,31,31,30,31,30,31][month-1])
        return date(year, month, day)
```

### 5.3 Sibling Detection Service

```python
class SiblingDetectionService:
    """Detect siblings via family relationships."""
    
    def get_siblings(
        self, 
        student_id: UUID, 
        only_active: bool = True
    ) -> List[Student]:
        """Get all siblings of given student (same family)."""
        student = Student.objects.get(id=student_id)
        
        query = Student.objects.filter(
            family_id=student.family_id,
        ).exclude(id=student_id)
        
        if only_active:
            query = query.filter(status='active')
        
        return list(query.select_related('family'))
    
    def get_family_summary(self, family_id: UUID) -> dict:
        """Get family overview with all students."""
        family = Family.objects.get(id=family_id)
        students = Student.objects.filter(family_id=family_id)
        
        return {
            'family': family,
            'total_students': students.count(),
            'active_students': students.filter(status='active').count(),
            'students_by_status': {
                status: students.filter(status=status).count()
                for status in ['active', 'graduated', 'withdrawn']
            },
            'students_list': list(students),
            'has_siblings_in_school': students.filter(status='active').count() > 1,
        }
    
    def get_sibling_count_for_discount_decision(self, student_id: UUID) -> dict:
        """Returns sibling info for manual discount review."""
        siblings = self.get_siblings(student_id, only_active=True)
        student = Student.objects.get(id=student_id)
        
        return {
            'this_student': student,
            'active_siblings_count': len(siblings),
            'siblings': [
                {
                    'student': s,
                    'grade': self._get_current_grade(s.id),
                    'fees_paid_status': self._get_payment_status(s.id),
                }
                for s in siblings
            ],
            'is_eldest': self._is_eldest(student, siblings),
            'is_youngest': self._is_youngest(student, siblings),
            'birth_order': self._get_birth_order(student, siblings),
        }
```

### 5.4 Outstanding Debt Service

```python
class OutstandingDebtService:
    """Manages carry-over debts from previous years."""
    
    def recognize_debt_from_invoice(
        self,
        invoice_id: UUID,
        recognized_by: UUID,
    ) -> StudentOutstandingDebt:
        """Convert unpaid invoice to outstanding debt at year-end."""
        invoice = StudentFeeInvoice.objects.get(id=invoice_id)
        
        if invoice.remaining_amount <= 0:
            raise ValueError("Invoice is fully paid")
        
        debt = StudentOutstandingDebt.objects.create(
            code=generate_code('DEBT'),
            student_id=invoice.student_id,
            debt_from_academic_year_id=invoice.academic_year_id,
            debt_from_invoice_id=invoice_id,
            original_amount=invoice.remaining_amount,
            recognized_at_year_id=current_academic_year().id,
            status='active',
            blocks_inventory_purchase=True,  # Default: yes
            blocks_transport_subscription=False,
            blocks_re_enrollment=False,
        )
        
        # Notify family
        notify_family_of_debt(debt)
        
        return debt
    
    def check_debt_blocks(
        self,
        student_id: UUID,
        service_type: str,  # 'inventory' / 'transport' / 'enrollment'
    ) -> dict:
        """Check if outstanding debts block a service."""
        debts = StudentOutstandingDebt.objects.filter(
            student_id=student_id,
            status__in=['active', 'partially_paid'],
        )
        
        block_field_map = {
            'inventory': 'blocks_inventory_purchase',
            'transport': 'blocks_transport_subscription',
            'enrollment': 'blocks_re_enrollment',
        }
        
        block_field = block_field_map.get(service_type)
        if not block_field:
            return {'blocked': False}
        
        blocking_debts = [d for d in debts if getattr(d, block_field)]
        
        if not blocking_debts:
            return {'blocked': False}
        
        total_blocking = sum(d.remaining_amount for d in blocking_debts)
        
        return {
            'blocked': True,
            'reason': 'outstanding_debt',
            'blocking_debts': blocking_debts,
            'total_amount': total_blocking,
            'requires_approval_to_override': True,
            'override_workflow': 'outstanding_debt_service_override',
        }
    
    def create_payment_plan_for_debt(
        self,
        debt_id: UUID,
        installments_spec: list,
        created_by: UUID,
    ) -> StudentInstallmentPlan:
        """Create payment plan for debt (separate from current year)."""
        debt = StudentOutstandingDebt.objects.get(id=debt_id)
        
        # Build plan
        plan = StudentInstallmentPlan.objects.create(
            code=generate_code('PLAN'),
            student_id=debt.student_id,
            plan_type='custom',
            total_amount=debt.remaining_amount,
            number_of_installments=len(installments_spec),
            status='active',
            notes=f"Payment plan for outstanding debt {debt.code}",
        )
        
        # Create installments
        for i, item in enumerate(installments_spec):
            StudentInstallment.objects.create(
                code=generate_code('INST'),
                plan_id=plan.id,
                student_id=debt.student_id,
                installment_number=i + 1,
                due_date=item['due_date'],
                amount=item['amount'],
                status='pending',
            )
        
        # Link to debt
        debt.has_payment_plan = True
        debt.payment_plan_id = plan.id
        debt.save()
        
        return plan
```

### 5.5 Promotion Engine (Automatic + Manual)

```python
class PromotionEngine:
    """Handles end-of-year grade promotion."""
    
    def execute_annual_promotion(
        self,
        from_year_id: UUID,
        to_year_id: UUID,
        executed_by: UUID,
        manual_overrides: dict = None,
    ) -> dict:
        """
        Promote all active students automatically.
        Manual overrides specify students NOT to auto-promote.
        
        Returns summary of promotions.
        """
        from_year = AcademicYear.objects.get(id=from_year_id)
        to_year = AcademicYear.objects.get(id=to_year_id)
        manual_overrides = manual_overrides or {}
        
        # Get all active enrollments for from_year
        enrollments = StudentEnrollment.objects.filter(
            academic_year_id=from_year_id,
            status='active',
        ).select_related('student', 'grade_level', 'stage', 'track')
        
        results = {
            'total': enrollments.count(),
            'auto_promoted': 0,
            'manual_required': 0,
            'graduated': 0,
            'errors': [],
        }
        
        for enrollment in enrollments:
            student_id = enrollment.student_id
            
            # Check manual override
            if student_id in manual_overrides:
                override = manual_overrides[student_id]
                if override == 'repeat':
                    self._mark_for_repeat(enrollment, to_year_id, executed_by)
                    results['manual_required'] += 1
                    continue
                elif override == 'skip':
                    # Manual processing required
                    self._create_manual_promotion_request(
                        enrollment, to_year_id, executed_by
                    )
                    results['manual_required'] += 1
                    continue
            
            # Get next grade
            next_grade = self._get_next_grade(enrollment.grade_level)
            
            if next_grade is None:
                # Last grade → graduation
                self._graduate_student(enrollment, executed_by)
                results['graduated'] += 1
                continue
            
            # Auto-promote
            self._auto_promote(enrollment, next_grade, to_year_id, executed_by)
            results['auto_promoted'] += 1
        
        return results
    
    def _get_next_grade(self, current_grade: GradeLevel) -> Optional[GradeLevel]:
        """Get the next grade level (e.g., P1 → P2, P6 → PREP1)."""
        return GradeLevel.objects.filter(
            sort_order__gt=current_grade.sort_order,
            is_active=True,
        ).order_by('sort_order').first()
    
    def _auto_promote(self, enrollment, next_grade, to_year_id, executed_by):
        """Auto-promote student to next grade."""
        # End current enrollment
        enrollment.end_date = AcademicYear.objects.get(id=enrollment.academic_year_id).end_date
        enrollment.end_reason = 'promoted'
        enrollment.status = 'completed'
        enrollment.save()
        
        # Create new enrollment
        StudentEnrollment.objects.create(
            code=generate_code('ENR'),
            student_id=enrollment.student_id,
            academic_year_id=to_year_id,
            stage_id=next_grade.stage_id,
            grade_level_id=next_grade.id,
            track_id=enrollment.track_id,  # Same track
            enrollment_source='promotion',
            status='active',
            created_by=executed_by,
        )
        
        # Create promotion record
        StudentGradePromotion.objects.create(
            student_id=enrollment.student_id,
            from_academic_year_id=enrollment.academic_year_id,
            to_academic_year_id=to_year_id,
            from_grade_level_id=enrollment.grade_level_id,
            to_grade_level_id=next_grade.id,
            promotion_type='automatic',
            status='completed',
            executed_at=timezone.now(),
            executed_by=executed_by,
        )
```

### 5.6 Student 360° Aggregator

```python
class Student360Service:
    """Aggregates all student information for the 360° view."""
    
    def get_student_360(self, student_id: UUID) -> dict:
        """Returns comprehensive student profile."""
        student = Student.objects.select_related('family').get(id=student_id)
        
        return {
            # Basic info
            'student': student,
            'family': student.family,
            'family_members': self._get_family_members(student.family_id),
            'siblings': self._get_siblings(student_id),
            
            # Academic
            'current_enrollment': self._get_current_enrollment(student_id),
            'enrollment_history': self._get_enrollment_history(student_id),
            'application': self._get_application(student_id),
            'exam_records': self._get_exam_records(student_id),
            
            # Health
            'health_record': self._get_health_record(student_id),
            
            # Financial
            'current_invoice': self._get_current_invoice(student_id),
            'installment_plan': self._get_installment_plan(student_id),
            'next_installment': self._get_next_installment(student_id),
            'outstanding_debts': self._get_outstanding_debts(student_id),
            'credit_balance': self._get_credit_balance(student_id),
            'payment_history': self._get_payment_history(student_id),
            'total_owed': self._calculate_total_owed(student_id),
            
            # Transport
            'bus_subscription': self._get_bus_subscription(student_id),
            
            # Inventory
            'inventory_purchases': self._get_inventory_purchases(student_id),
            
            # Documents
            'documents': self._get_documents(student_id),
            
            # Notes
            'notes': self._get_notes(student_id),
            
            # Communication
            'recent_contacts': self._get_recent_contacts(student.family_id),
            
            # Status
            'status_history': self._get_status_history(student_id),
            
            # Computed flags
            'flags': {
                'has_outstanding_debt': self._has_outstanding_debt(student_id),
                'is_in_grace_period': self._is_in_grace_period(student_id),
                'has_siblings_in_school': len(self._get_siblings(student_id)) > 0,
                'has_pending_approvals': self._has_pending_approvals(student_id),
                'bus_subscription_active': self._has_active_bus_subscription(student_id),
                'has_unpaid_installments': self._has_unpaid_installments(student_id),
            }
        }
```

---

## 6. Workflows

### 6.1 Student Application & Acceptance Flow

```
[1. Family inquiry]
    ↓
[2. Student Affairs creates Application]
    - Family info (existing or new)
    - Student personal info
    - Requested stage + grade + track
    - Generate APP-2026-0001
    ↓
[3. File fee invoice generated]
    ↓
[4. Cashier collects file fee]
    - Receipt issued
    - Application status: under_examination
    ↓
[5. Exam scheduled]
    ↓
[6. Exam conducted (offline)]
    ↓
[7. Student Affairs records exam results]
    - Subject scores in JSONB
    - Notes from examiner
    - Result: pass / fail / conditional
    ↓
[8. Decision Process]
    
    IF result == 'fail':
        ├── Decision: reject
        └── Application status: rejected
        
    IF result == 'pass' OR 'conditional':
        ├── Manual decision considering:
        │   • Exam score
        │   • Sibling presence (auto-detected)
        │   • Previous school reputation
        │   • Family history
        │   • Capacity
        ├── Submit to workflow:
        │   workflow_type = 'student_registration_acceptance'
        │   approver = Student Affairs Officer
        └── If International track: + Principal approval
    ↓
[9. On approval]
    - Create student record (STU-2026-0001)
    - Status: accepted
    - Notify family
    ↓
[10. Activation Process]
    - Determine fees (from fee_structure)
    - Optional: apply discounts (each in separate workflow)
    - Create invoice
    - Setup installment plan (default or custom)
    - Family signs acceptance
    - Status: active
    - Student 360° page opens
```

### 6.2 Discount Approval Flows

#### Basic Discount Workflow

```python
DISCOUNT_BASIC_WORKFLOW = {
    'workflow_type_code': 'discount_basic',
    'category': 'financial',
    'steps': [
        {
            'step_number': 1,
            'name': 'Small Basic Discount',
            'conditions': [
                {'field': 'basic_discount_pct', 'op': '<=', 'value': 5}
            ],
            'approver_type': 'role',
            'approver_role_code': 'accountant',
            'timeout_hours': 48,
        },
        {
            'step_number': 2,
            'name': 'Medium Basic Discount',
            'conditions': [
                {'field': 'basic_discount_pct', 'op': '>', 'value': 5},
                {'field': 'basic_discount_pct', 'op': '<=', 'value': 15, 'logical_op': 'AND'},
            ],
            'approver_type': 'role',
            'approver_role_code': 'chief_accountant',
            'timeout_hours': 72,
        },
        {
            'step_number': 3,
            'name': 'Large Basic Discount',
            'conditions': [
                {'field': 'basic_discount_pct', 'op': '>', 'value': 15}
            ],
            'approver_type': 'group',
            'approver_group': ['chief_accountant', 'principal'],
            'requires_all_in_group': True,
            'timeout_hours': 5 * 24,
        },
    ],
}
```

### 6.3 Track Transfer Workflow

```python
TRACK_TRANSFER_WORKFLOW = {
    'workflow_type_code': 'student_track_transfer',
    'category': 'students',
    'steps': [
        {
            'step_number': 1,
            'name': 'Academic Review',
            'approver_type': 'role',
            'approver_role_code': 'student_affairs_officer',
            'timeout_hours': 48,
        },
        {
            'step_number': 2,
            'name': 'Principal Approval',
            'approver_type': 'role',
            'approver_role_code': 'principal',
            'timeout_hours': 5 * 24,
        },
    ],
}
```

### 6.4 Withdrawal Workflow

```python
WITHDRAWAL_WORKFLOW = {
    'workflow_type_code': 'student_withdrawal',
    'category': 'students',
    'steps': [
        {
            'step_number': 1,
            'name': 'Student Affairs Initial Review',
            'approver_type': 'role',
            'approver_role_code': 'student_affairs_officer',
            'timeout_hours': 24,
        },
        {
            'step_number': 2,
            'name': 'Financial Settlement Review',
            'approver_type': 'role',
            'approver_role_code': 'chief_accountant',
            'timeout_hours': 48,
        },
        {
            'step_number': 3,
            'name': 'Principal Final Approval',
            'approver_type': 'role',
            'approver_role_code': 'principal',
            'timeout_hours': 48,
        },
    ],
}
```

### 6.5 New Workflows in This Module

**Workflows added by this module:**

| Code | Trigger | Default Approvers |
|---|---|---|
| `student_registration_acceptance` | New student acceptance | Student Affairs (+ Principal for International) |
| `student_data_modification` | Modify critical data | Student Affairs (+ Principal for ID/name) |
| `student_track_transfer` | National ↔ International | Student Affairs + Principal |
| `student_grade_repeat` | Decision to repeat grade | Student Affairs + Principal |
| `student_withdrawal` | Family withdraws student | Student Affairs + Chief Accountant + Principal |
| `discount_basic` | Basic % discount on gross | Tiered by amount |
| `discount_additional` | Additional % discount | Chief Accountant + Principal |
| `student_acceptance_with_debt` | Accept with prior debt | Chief Accountant + Principal |
| `outstanding_debt_service_override` | Override service block | Chief Accountant |

---

## 7. Default Configuration Values

| Configuration Key | Default | Purpose |
|---|---|---|
| `students.code_prefix` | "STU" | Student code prefix |
| `students.code_format` | "STU-{year}-{seq:04d}" | Code generation format |
| `students.application_code_prefix` | "APP" | Application code prefix |
| `students.outstanding_debt_blocks_inventory_default` | true | Default block setting |
| `students.outstanding_debt_blocks_transport_default` | false | Default block setting |
| `students.outstanding_debt_blocks_enrollment_default` | false | Default block setting |
| `students.installment_default_plan` | "three_payments" | Default plan if family doesn't choose |
| `students.allow_custom_installments` | true | Enable custom installment plans |
| `students.minimum_installments` | 1 | Min number of installments |
| `students.maximum_installments` | 12 | Max number of installments |
| `students.installment_reminder_days_before` | 7 | Send reminder N days before due |
| `students.installment_overdue_grace_days` | 3 | Days before marking overdue |
| `students.archive_after_withdrawal_days` | 365 | Auto-archive after withdrawal |
| `students.archive_after_graduation_days` | 1095 | Keep graduates 3 years |
| `students.exam_reexam_allowed` | true | Allow re-exam on failure |
| `students.exam_reexam_max_attempts` | 1 | Max re-exam attempts |
| `students.discount_basic_max_pct` | 100 | Hard limit on basic discount |
| `students.discount_additional_max_pct` | 100 | Hard limit on additional discount |
| `students.sibling_detection_enabled` | true | Auto-detect siblings |
| `students.allow_track_transfer_anytime` | true | Allow mid-year track transfers |
| `students.fee_structure_finalize_year_start` | true | Lock fees once year starts |

---

## 8. Reports

### 8.1 Student Roster Report

```
┌──────────────────────────────────────────────────────────────────┐
│  Student Roster — Academic Year 2026-2027                        │
├──────────────────────────────────────────────────────────────────┤
│                                                                  │
│  Filter: [All Stages ▼] [All Tracks ▼] [Active Only ☑]          │
│                                                                  │
│  📊 Summary:                                                     │
│  • KG: 145 students (KG1: 75, KG2: 70)                           │
│  • Primary: 620 students                                         │
│  • Preparatory: 380 students                                     │
│  • Secondary: 355 students                                       │
│  • TOTAL: 1,500 active students                                  │
│                                                                  │
│  By Track:                                                       │
│  • National: 1,100 (73.3%)                                       │
│  • International: 400 (26.7%)                                    │
│                                                                  │
│  ────────────────────────────────────────────────────────────    │
│  Code        Name              Stage  Grade  Track  Status        │
│  ────────────────────────────────────────────────────────────    │
│  STU-2025-001 Ahmed M. Hassan  PRI    P5     NAT    Active        │
│  STU-2025-002 Sara K. Ahmed    PRI    P5     INT    Active        │
│  ...                                                             │
│                                                                  │
│  [Export to Excel]   [Print]                                     │
└──────────────────────────────────────────────────────────────────┘
```

### 8.2 Student Financial Status Report

Shows all students with outstanding balances or debts.

### 8.3 Sibling Families Report

For discount decision support.

### 8.4 Application Status Report

Track all applications in pipeline.

### 8.5 Withdrawal Analysis Report

Track withdrawal reasons and patterns.

### 8.6 Promotion Status Report

End-of-year promotion outcomes.

---

## 9. UI Mockups

### 9.1 Student 360° View

```
┌──────────────────────────────────────────────────────────────────┐
│  ← Back to Students        Ahmed Mohamed Hassan      [Edit] [⋮] │
│                                                                  │
│  ┌─────────┐  STU-2026-0245                                     │
│  │  Photo  │  Grade 5 - Primary - National Track                │
│  │         │  Status: ✅ Active                                  │
│  └─────────┘  Born: March 15, 2016 (10 years)                   │
│                                                                  │
│  ──────────────────────────────────────────────────────────────  │
│  Tabs: [Overview] [Family] [Financial] [Academic] [Documents]   │
│                                                                  │
│  📋 OVERVIEW                                                     │
│                                                                  │
│  Family: عائلة حسن (FAM-2026-0089)                              │
│  Primary Contact: Mr. Mohamed Hassan (Father)                   │
│  Phone: 01001234567 | Email: m.hassan@email.com                 │
│  Siblings in school: 2 (sister: STU-2026-0246, brother: ...)    │
│                                                                  │
│  💰 FINANCIAL SUMMARY                                            │
│  ┌────────────────────────────────────────────────────────┐     │
│  │ ⚠️ Outstanding Debt (2025-2026): 5,000 EGP            │     │
│  │ Current Year Fees: 30,000 EGP                          │     │
│  │ Paid This Year: 15,000 EGP                             │     │
│  │ Remaining This Year: 15,000 EGP                        │     │
│  │ ────────────────────────────────────────────────────── │     │
│  │ TOTAL OWED TO SCHOOL: 20,000 EGP                       │     │
│  │                                                        │     │
│  │ Next Installment: 5,000 EGP due Dec 15, 2026          │     │
│  └────────────────────────────────────────────────────────┘     │
│                                                                  │
│  🚌 TRANSPORT                                                    │
│  Bus: BUS-007 (Route A: Maadi → School)                         │
│  Annual Fee: 6,000 EGP - Paid                                   │
│                                                                  │
│  📚 INVENTORY PURCHASES (This Year)                              │
│  Books: 950 EGP (12 items) ✓ Delivered                          │
│  Uniforms: 1,200 EGP (5 items) ✓ Delivered                      │
│                                                                  │
│  📊 ACADEMIC HISTORY                                             │
│  • 2026-2027: Grade 5 (Active)                                   │
│  • 2025-2026: Grade 4 (Promoted)                                 │
│  • 2024-2025: Grade 3 (Promoted)                                 │
│                                                                  │
│  📝 RECENT NOTES (3)                                             │
│  • [Behavioral - Info] 2026-04-15: Excellent participation...   │
│  • [Financial - Warning] 2026-03-10: Late payment notice...     │
│  • [Academic - Info] 2026-02-20: Top of class in Math...        │
│                                                                  │
│  📞 RECENT FAMILY CONTACTS (2)                                   │
│  • 2026-04-20: Phone call about payment plan (resolved)         │
│  • 2026-04-15: SMS about parent meeting (sent)                  │
│                                                                  │
│  ⚙️ QUICK ACTIONS                                                │
│  [Record Payment] [Process Discount Request] [Add Note]         │
│  [Schedule Bus Change] [Issue Withdrawal Process]               │
└──────────────────────────────────────────────────────────────────┘
```

### 9.2 New Application Form

Shows guided multi-step form for creating applications.

### 9.3 Custom Installment Plan Builder

Allows accountant to build custom plans with validation.

### 9.4 Family Management Screen

Single screen to manage family + all members + all student-children.

---

## 10. Edge Cases

### 10.1 Family Without Father

Mother/grandfather can be primary contact. System doesn't enforce specific relationship for primary.

### 10.2 Single Student in Multiple Families (Divorced Parents)

Phase 2 consideration. MVP-1: One family per student.

### 10.3 Student Becomes 18 Mid-Year

System tracks but doesn't change permissions. Some legal documents may require student signature themselves.

### 10.4 Family Member Dies

Mark as deceased. If was primary contact: auto-prompt to assign new primary.

### 10.5 Re-Application After Rejection

Allowed. New application created. Previous rejection visible in history.

### 10.6 Re-Enrollment After Withdrawal

Possible. Historical data preserved. New enrollment created. Outstanding debts must be addressed.

### 10.7 Emergency Acceptance Without Exam

Special case workflow: requires Principal approval + documented reason.

### 10.8 Student Without Egyptian National ID (Foreign)

Use passport number instead. System supports both fields.

### 10.9 Custom Installment Validation Edge Cases

- Sum mismatch: Reject
- Negative amount: Reject
- Past due date: Allow (for already-overdue installments)
- More than 12 installments: Configurable max
- Same due date: Allow but warn

### 10.10 Track Transfer with Fee Difference

System auto-calculates difference. Settlement options: add to invoice / payroll deduction (if employee child) / credit balance / cash refund.

---

## 11. Integration Patterns

### 11.1 With Cashier Module

```python
# When cashier collects payment
cashier_service.collect_payment(...)
    ↓
students_service.apply_payment_to_student(
    student_id, 
    amount, 
    payment_id,
    application_order='oldest_debt_first'  # Or 'current_year_first'
)
    ↓
# Updates: outstanding_debts → installments → invoice
```

### 11.2 With Inventory Module

```python
# Before selling to student
inventory_service.create_sale_to_student(student_id, items)
    ↓
students_service.check_eligibility_for_service(student_id, 'inventory')
    ↓
# Returns: blocked? blocking_debts? requires_override?
```

### 11.3 With Transport Module

```python
# Before creating bus subscription
transport_service.create_subscription(student_id, route_id)
    ↓
students_service.check_eligibility_for_service(student_id, 'transport')
```

### 11.4 With Accounting Module

All financial transactions create journal entries via accounting service.

---

## 12. Testing Strategy

### 12.1 Unit Tests

- Two-tier discount calculation (all percentages)
- Installment plan builder (4 default + custom validation)
- Sibling detection
- Promotion engine logic
- Outstanding debt recognition

### 12.2 Integration Tests

End-to-end flows:
- Complete application → exam → acceptance → activation
- Year-end promotion for all students
- Withdrawal with full settlement
- Track transfer with fee adjustment
- Student with debt accessing services

### 12.3 Performance Tests

- 1,500 students roster query < 1s
- Student 360° view < 2s
- Annual promotion of 1,500 students < 30s
- Concurrent application creation by multiple staff

---

## 13. Migration Considerations

### 13.1 Initial Setup Order

1. Stages (4) + Tracks (2) + Grade Levels (14)
2. Academic Years (current + previous)
3. Fee Structures (one per stage+grade+track+year)
4. Families
5. Family Members
6. Students (master)
7. Student Enrollments (current year)
8. Student Documents
9. Outstanding Debts (from previous years)
10. Active Invoices + Installment Plans

### 13.2 Excel Templates

- Families template
- Family Members template (with relationship_role)
- Students master template
- Student Enrollments template
- Outstanding Debts template (critical for migration)

### 13.3 Validation Rules

- Each student must have a family
- Each family must have at least one primary_contact member
- National IDs must be unique (where present)
- Birth dates must match grade level age range
- Outstanding debts sum should match accounting books

---

## 14. Future Enhancements

### Phase 2 Considerations

- Parent mobile app login (one per family)
- Student attendance integration
- Academic grades and report cards
- Behavior tracking system
- Class scheduling and timetables
- Teacher-parent communication portal
- Online application submission portal
- Online payment integration

### Phase 3 Possibilities

- Multi-family support (divorced parents)
- AI-powered student performance predictions
- Automated college recommendation
- Alumni network management

---

## 15. Summary

### 15.1 Module Statistics

- **Tables:** 22 (master data + transactions + audit)
- **Services/Engines:** 6 (Discount, Installment Builder, Sibling Detection, Outstanding Debt, Promotion, Student 360°)
- **Default Workflows:** 9 student-specific
- **Stages Supported:** 4 (KG + Primary + Preparatory + Secondary) ⭐
- **Grade Levels:** 14 (KG1, KG2, P1-P6, PREP1-PREP3, SEC1-SEC3)
- **Tracks:** 2 (National + International)

### 15.2 Key Design Decisions

1. **Family-first model** — Better organization, automatic siblings
2. **Flexible guardianship** — Any related person can be primary
3. **4 stages including KG** ⭐ — Updated from original 3
4. **Manual exam decision** — No automatic threshold (per requirement)
5. **Tuition only in core fees** — Books/uniform/transport separate (per requirement)
6. **Flexible installments** — 4 templates + custom (per requirement)
7. **No discounts/late fees** — But supports manual discounts (per requirement)
8. **Outstanding debts visible** — Separate display (per requirement)
9. **Manual sibling discount** — System detects, accountant decides (per requirement)
10. **Flexible track transfer** — Any time with approval (per requirement)

### 15.3 Success Metrics for MVP-1

- ✅ All 1,500 students managed in system
- ✅ Complete enrollment workflow operational
- ✅ Two-tier discount calculations accurate to the cent
- ✅ Automatic promotion processes 1,500 students at year-end
- ✅ Family-level financial views accessible
- ✅ Outstanding debts tracked separately and clearly visible
- ✅ Sibling detection works automatically
- ✅ Track transfers processed within SLA
- ✅ Withdrawal process with full financial settlement
- ✅ Student 360° view loads under 2 seconds

---

*End of Students Module Document*

> **Related Documents:**
> - `04_ARCHITECTURE.md` — Overall architecture
> - `06_USER_ROLES_AND_PERMISSIONS.md` — Roles involved
> - `07_APPROVAL_WORKFLOWS.md` — Workflows in detail
> - `09_INVENTORY_MODULE.md` — Integration for inventory sales
> - `08_TRANSPORT_MODULE.md` — Integration for bus subscriptions
