# Transport Module — El Shorouk School Management System

> **Document Type:** Detailed Module Specification
> **Status:** v1.0 — Foundation
> **Date:** May 2026
> **Document Owner:** Project Tech Lead

---

## 1. Module Overview

### 1.1 Purpose

The Transport Module manages the complete lifecycle of school bus operations including:

- Rental company and contract management
- Bus fleet management (currently all rented, architecture supports owned)
- Routes definition and bus assignments
- Subscriptions for three rider types (students, employees, supervisors)
- Mid-year subscription changes with pro-rata calculations
- Monthly rental invoice processing
- Profitability analysis per bus and per route
- Integration with Students, HR, Accounting, and Approval Engine

### 1.2 Current El Shorouk Reality

| Aspect | Current State |
|---|---|
| Bus ownership | 100% rented (with driver, fuel, maintenance, insurance) |
| Bus count | 50 |
| Routes | 80 |
| Drivers | All external (employed by rental companies) |
| Supervisors | School employees riding for free |
| Tracking level | Medium (all costs + profitability per bus) |
| Depreciation | Not applicable (no owned buses) |

### 1.3 Future-Proofing

Although currently all rented, the schema supports:
- **Owned buses** — full ownership with depreciation tracking (Phase 2)
- **Partially rented** — bus rented without driver (school employs the driver)
- **Mixed fleet** — combination of all three types

This flexibility is built-in but **not active in MVP-1**.

---

## 2. Module Position in Architecture

### 2.1 Bounded Context

```
┌────────────────────────────────────────────────────────────────┐
│                    TRANSPORT MODULE                            │
│                                                                │
│  Owns:                                                         │
│  • Rental Companies                                            │
│  • Rental Contracts                                            │
│  • Buses                                                       │
│  • External Drivers                                            │
│  • Routes                                                      │
│  • Subscriptions                                               │
│  • Subscription Changes                                        │
│  • Settlements                                                 │
│  • Rental Invoices                                             │
│  • Bus Costs                                                   │
│  • Daily Operations                                            │
│                                                                │
│  Public API (transport.public):                                │
│  • get_subscription(...)                                       │
│  • create_subscription(...)                                    │
│  • change_subscription(...)                                    │
│  • cancel_subscription(...)                                    │
│  • calculate_pro_rata(...)                                     │
│  • register_employee_payroll_deduction(...)                    │
│  • get_bus_profitability(...)                                  │
└────────────────────────────────────────────────────────────────┘
```

### 2.2 Dependencies

```
Transport Module depends on:
├── Students Module (public API)
│   • get_student_by_id()
│   • add_to_receivables()
│   • get_active_students()
├── HR Module (public API)
│   • get_employee_by_id()
│   • register_payroll_deduction()
│   • get_supervisors()
├── Accounting Module (public API)
│   • create_journal_entry()
│   • update_supplier_balance()
├── Approval Workflow Engine
│   • submit_request()
└── Notifications Module
    • notify_user()
    • notify_family()
```

---

## 3. Database Schema (Complete)

### 3.1 Master Data Tables

#### 3.1.1 `bus_rental_companies`

```sql
CREATE TABLE bus_rental_companies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR(50) UNIQUE NOT NULL,
    name_ar VARCHAR(200) NOT NULL,
    name_en VARCHAR(200),
    contact_person VARCHAR(200),
    phone VARCHAR(50),
    email VARCHAR(100),
    address TEXT,
    tax_id VARCHAR(50),
    commercial_registration VARCHAR(50),
    bank_name VARCHAR(100),
    bank_account_number VARCHAR(100),
    notes TEXT,
    rating_quality NUMERIC(3,2),         -- 0.00 to 5.00
    rating_punctuality NUMERIC(3,2),
    rating_overall NUMERIC(3,2),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES users(id),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    updated_by UUID REFERENCES users(id),
    deleted_at TIMESTAMPTZ
);

CREATE INDEX idx_bus_rental_companies_active ON bus_rental_companies(is_active) WHERE deleted_at IS NULL;
```

#### 3.1.2 `bus_rental_contracts`

```sql
CREATE TABLE bus_rental_contracts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES bus_rental_companies(id),
    contract_number VARCHAR(100) UNIQUE NOT NULL,
    title VARCHAR(200),
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    monthly_fee_per_bus NUMERIC(12,2) NOT NULL,
    buses_count INTEGER NOT NULL,
    total_monthly_fee NUMERIC(12,2) GENERATED ALWAYS AS (monthly_fee_per_bus * buses_count) STORED,
    total_contract_value NUMERIC(12,2),
    
    -- What's included
    includes_driver BOOLEAN DEFAULT TRUE,
    includes_fuel BOOLEAN DEFAULT TRUE,
    includes_maintenance BOOLEAN DEFAULT TRUE,
    includes_insurance BOOLEAN DEFAULT TRUE,
    includes_supervisor BOOLEAN DEFAULT FALSE,
    
    -- Payment terms
    payment_frequency VARCHAR(20) NOT NULL,    -- 'monthly' / 'quarterly' / 'annual'
    payment_due_day INTEGER,                   -- e.g., 15 of each month
    payment_method VARCHAR(20),                -- 'bank_transfer' / 'cash' / 'cheque'
    
    -- Renewal
    auto_renewal BOOLEAN DEFAULT FALSE,
    renewal_notice_days INTEGER DEFAULT 60,
    
    -- Status
    status VARCHAR(20) NOT NULL,               -- draft/pending/active/expired/terminated/cancelled
    termination_date DATE,
    termination_reason TEXT,
    
    -- Documents
    contract_file_url VARCHAR(500),
    
    -- Approval
    approval_request_id UUID REFERENCES approval_requests(id),
    approved_by UUID REFERENCES users(id),
    approved_at TIMESTAMPTZ,
    
    -- Audit
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES users(id),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    updated_by UUID REFERENCES users(id),
    deleted_at TIMESTAMPTZ,
    
    CONSTRAINT valid_dates CHECK (end_date > start_date),
    CONSTRAINT valid_buses_count CHECK (buses_count > 0),
    CONSTRAINT valid_fees CHECK (monthly_fee_per_bus >= 0)
);

CREATE INDEX idx_rental_contracts_company ON bus_rental_contracts(company_id);
CREATE INDEX idx_rental_contracts_status ON bus_rental_contracts(status);
CREATE INDEX idx_rental_contracts_dates ON bus_rental_contracts(start_date, end_date);
CREATE INDEX idx_rental_contracts_active ON bus_rental_contracts(status) WHERE status = 'active';
```

#### 3.1.3 `buses`

```sql
CREATE TABLE buses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR(50) UNIQUE NOT NULL,         -- e.g., "BUS-001"
    plate_number VARCHAR(50) UNIQUE NOT NULL,
    capacity INTEGER NOT NULL,
    
    -- Ownership
    ownership_type VARCHAR(30) NOT NULL DEFAULT 'rented_full',
    -- Values: 'owned' / 'rented_full' / 'rented_no_driver'
    rental_contract_id UUID REFERENCES bus_rental_contracts(id),
    
    -- Owned bus details (NULL for rented)
    purchase_date DATE,
    purchase_price NUMERIC(12,2),
    depreciation_method VARCHAR(20),          -- 'straight_line' / 'declining'
    useful_life_years INTEGER,
    salvage_value NUMERIC(12,2),
    
    -- Bus details
    make VARCHAR(100),                         -- e.g., "Mercedes"
    model VARCHAR(100),
    year INTEGER,
    color VARCHAR(50),
    fuel_type VARCHAR(20),                    -- diesel/petrol/gas
    
    -- Status
    status VARCHAR(20) DEFAULT 'active',      -- active/maintenance/retired/sold
    
    -- Documents
    insurance_expiry DATE,
    license_expiry DATE,
    inspection_expiry DATE,
    
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES users(id),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    updated_by UUID REFERENCES users(id),
    deleted_at TIMESTAMPTZ,
    
    CONSTRAINT valid_capacity CHECK (capacity > 0),
    CONSTRAINT valid_ownership CHECK (
        (ownership_type = 'owned' AND rental_contract_id IS NULL) OR
        (ownership_type IN ('rented_full', 'rented_no_driver') AND rental_contract_id IS NOT NULL)
    )
);

CREATE INDEX idx_buses_status ON buses(status) WHERE deleted_at IS NULL;
CREATE INDEX idx_buses_contract ON buses(rental_contract_id);
CREATE INDEX idx_buses_ownership ON buses(ownership_type);
```

#### 3.1.4 `bus_external_drivers`

```sql
CREATE TABLE bus_external_drivers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR(50) UNIQUE NOT NULL,
    full_name VARCHAR(200) NOT NULL,
    national_id VARCHAR(20) UNIQUE,
    phone VARCHAR(50),
    company_id UUID NOT NULL REFERENCES bus_rental_companies(id),
    license_number VARCHAR(50),
    license_class VARCHAR(20),
    license_expiry DATE,
    employment_start_date DATE,
    notes TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    deleted_at TIMESTAMPTZ
);

CREATE INDEX idx_external_drivers_company ON bus_external_drivers(company_id);
CREATE INDEX idx_external_drivers_active ON bus_external_drivers(is_active);
```

#### 3.1.5 `bus_routes`

```sql
CREATE TABLE bus_routes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR(50) UNIQUE NOT NULL,
    name_ar VARCHAR(200) NOT NULL,
    name_en VARCHAR(200),
    
    -- Geography
    starting_point_ar VARCHAR(200),
    starting_point_en VARCHAR(200),
    ending_point_ar VARCHAR(200) DEFAULT 'مدرسة الشروق',
    ending_point_en VARCHAR(200) DEFAULT 'El Shorouk School',
    distance_km NUMERIC(6,2),
    estimated_duration_minutes INTEGER,
    
    -- Stops (JSON array)
    stops JSONB DEFAULT '[]'::JSONB,
    -- Format: [{"name_ar": "...", "lat": 30.x, "lng": 31.x, "order": 1}, ...]
    
    -- Pricing
    annual_fee NUMERIC(12,2) NOT NULL,        -- Full annual fee for student
    
    -- Operational
    morning_pickup_start_time TIME,
    morning_arrival_school TIME,
    afternoon_departure_school TIME,
    afternoon_dropoff_end_time TIME,
    
    -- Status
    is_active BOOLEAN DEFAULT TRUE,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES users(id),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    deleted_at TIMESTAMPTZ
);

CREATE INDEX idx_routes_active ON bus_routes(is_active) WHERE deleted_at IS NULL;
```

#### 3.1.6 `bus_route_assignments`

```sql
CREATE TABLE bus_route_assignments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    bus_id UUID NOT NULL REFERENCES buses(id),
    route_id UUID NOT NULL REFERENCES bus_routes(id),
    
    -- Driver (polymorphic)
    driver_type VARCHAR(20) NOT NULL,         -- 'external' / 'employee'
    external_driver_id UUID REFERENCES bus_external_drivers(id),
    employee_driver_id UUID REFERENCES employees(id),
    
    -- Supervisor (always employee)
    supervisor_employee_id UUID REFERENCES employees(id),
    
    -- Period
    academic_year_id UUID NOT NULL REFERENCES academic_years(id),
    start_date DATE NOT NULL,
    end_date DATE,                            -- NULL = ongoing
    
    -- Status
    is_active BOOLEAN DEFAULT TRUE,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES users(id),
    
    CONSTRAINT valid_driver CHECK (
        (driver_type = 'external' AND external_driver_id IS NOT NULL AND employee_driver_id IS NULL) OR
        (driver_type = 'employee' AND employee_driver_id IS NOT NULL AND external_driver_id IS NULL)
    )
);

CREATE INDEX idx_route_assignments_active ON bus_route_assignments(is_active);
CREATE INDEX idx_route_assignments_bus ON bus_route_assignments(bus_id, is_active);
CREATE INDEX idx_route_assignments_route ON bus_route_assignments(route_id, is_active);
CREATE INDEX idx_route_assignments_supervisor ON bus_route_assignments(supervisor_employee_id);
```

### 3.2 Subscription Tables

#### 3.2.1 `bus_subscriptions`

```sql
CREATE TABLE bus_subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR(50) UNIQUE NOT NULL,         -- e.g., "SUB-2026-0001"
    
    -- Subscriber (polymorphic)
    subscriber_type VARCHAR(20) NOT NULL,     -- 'student' / 'employee' / 'supervisor'
    student_id UUID REFERENCES students(id),
    employee_id UUID REFERENCES employees(id),
    
    -- Bus and route
    route_id UUID NOT NULL REFERENCES bus_routes(id),
    bus_id UUID REFERENCES buses(id),         -- Optional: specific bus, else any on route
    
    -- Period
    academic_year_id UUID NOT NULL REFERENCES academic_years(id),
    start_date DATE NOT NULL,
    end_date DATE,                            -- NULL = until year-end
    
    -- Pricing
    full_fee_amount NUMERIC(12,2) NOT NULL,   -- Annual fee from route
    discount_pct NUMERIC(5,2) NOT NULL,       -- 0=student, 50=employee, 100=supervisor
    discount_amount NUMERIC(12,2) GENERATED ALWAYS AS 
        (full_fee_amount * discount_pct / 100) STORED,
    net_fee_amount NUMERIC(12,2) GENERATED ALWAYS AS 
        (full_fee_amount * (100 - discount_pct) / 100) STORED,
    
    -- For mid-year subscription, the actual amount charged
    actual_amount_charged NUMERIC(12,2),      -- Pro-rata if joined mid-year
    
    -- Pickup details
    pickup_address TEXT,
    pickup_landmark VARCHAR(200),
    pickup_phone VARCHAR(50),
    
    -- Status
    status VARCHAR(20) NOT NULL,
    -- Values: pending/active/suspended/cancelled/completed
    
    -- Approval
    approval_request_id UUID REFERENCES approval_requests(id),
    approved_by UUID REFERENCES users(id),
    approved_at TIMESTAMPTZ,
    
    -- Audit
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES users(id),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    updated_by UUID REFERENCES users(id),
    deleted_at TIMESTAMPTZ,
    
    CONSTRAINT valid_subscriber CHECK (
        (subscriber_type = 'student' AND student_id IS NOT NULL AND employee_id IS NULL) OR
        (subscriber_type IN ('employee', 'supervisor') AND employee_id IS NOT NULL AND student_id IS NULL)
    ),
    CONSTRAINT valid_discount CHECK (discount_pct >= 0 AND discount_pct <= 100),
    CONSTRAINT valid_dates CHECK (end_date IS NULL OR end_date >= start_date)
);

CREATE INDEX idx_subscriptions_subscriber_student ON bus_subscriptions(student_id) 
    WHERE student_id IS NOT NULL;
CREATE INDEX idx_subscriptions_subscriber_employee ON bus_subscriptions(employee_id) 
    WHERE employee_id IS NOT NULL;
CREATE INDEX idx_subscriptions_route ON bus_subscriptions(route_id, status);
CREATE INDEX idx_subscriptions_status ON bus_subscriptions(status);
CREATE INDEX idx_subscriptions_year ON bus_subscriptions(academic_year_id);
CREATE INDEX idx_subscriptions_active ON bus_subscriptions(status) WHERE status = 'active';
```

#### 3.2.2 `bus_subscription_changes`

```sql
CREATE TABLE bus_subscription_changes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    subscription_id UUID NOT NULL REFERENCES bus_subscriptions(id),
    
    -- Change type
    change_type VARCHAR(30) NOT NULL,
    -- Values: route_change/bus_change/cancel/suspend/reactivate/refund_request
    
    -- Dates
    change_date DATE NOT NULL,                -- When change requested
    effective_date DATE NOT NULL,             -- When change takes effect
    
    -- Previous state (snapshot)
    previous_route_id UUID REFERENCES bus_routes(id),
    previous_bus_id UUID REFERENCES buses(id),
    previous_full_fee NUMERIC(12,2),
    previous_net_fee NUMERIC(12,2),
    
    -- New state
    new_route_id UUID REFERENCES bus_routes(id),
    new_bus_id UUID REFERENCES buses(id),
    new_full_fee NUMERIC(12,2),
    new_net_fee NUMERIC(12,2),
    
    -- Pro-rata calculation
    months_remaining INTEGER,
    proportion_remaining NUMERIC(5,4),        -- e.g., 0.6000 = 60%
    previous_remaining_fee NUMERIC(12,2),
    new_remaining_fee NUMERIC(12,2),
    pro_rata_difference NUMERIC(12,2),        -- + means subscriber owes more
    
    -- Settlement
    settlement_method VARCHAR(30),
    -- Values: add_to_invoice / payroll_deduction / credit_balance / cash_refund
    settlement_id UUID REFERENCES bus_subscription_settlements(id),
    
    -- Reason
    change_reason TEXT,
    requested_by_role VARCHAR(20),            -- parent/staff/system
    
    -- Approval
    approval_request_id UUID REFERENCES approval_requests(id),
    approved_by UUID REFERENCES users(id),
    approved_at TIMESTAMPTZ,
    
    -- Status
    status VARCHAR(20) NOT NULL,
    -- Values: pending_approval/approved/rejected/applied/cancelled
    
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES users(id)
);

CREATE INDEX idx_subscription_changes_subscription ON bus_subscription_changes(subscription_id);
CREATE INDEX idx_subscription_changes_status ON bus_subscription_changes(status);
CREATE INDEX idx_subscription_changes_date ON bus_subscription_changes(effective_date);
```

#### 3.2.3 `bus_subscription_settlements`

```sql
CREATE TABLE bus_subscription_settlements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR(50) UNIQUE NOT NULL,
    
    -- Source
    change_id UUID REFERENCES bus_subscription_changes(id),
    subscription_id UUID NOT NULL REFERENCES bus_subscriptions(id),
    
    -- Subscriber (denormalized for ease of query)
    subscriber_type VARCHAR(20) NOT NULL,
    student_id UUID REFERENCES students(id),
    employee_id UUID REFERENCES employees(id),
    
    -- Amount
    amount NUMERIC(12,2) NOT NULL,            -- Always positive
    direction VARCHAR(10) NOT NULL,           -- 'debit' (owe school) / 'credit' (school owes)
    
    -- Settlement method
    method VARCHAR(30) NOT NULL,
    -- Values: invoice_addition / installment / payroll_deduction / credit_balance / cash_refund
    
    -- References
    student_invoice_id UUID,                  -- If method = invoice_addition
    student_installment_id UUID,              -- If method = installment
    payroll_period_id UUID,                   -- If method = payroll_deduction
    journal_entry_id UUID,                    -- Always created
    
    -- Status
    status VARCHAR(20) NOT NULL,
    -- Values: pending/applied/cancelled/disputed
    applied_at TIMESTAMPTZ,
    applied_by UUID REFERENCES users(id),
    
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES users(id)
);

CREATE INDEX idx_settlements_subscription ON bus_subscription_settlements(subscription_id);
CREATE INDEX idx_settlements_student ON bus_subscription_settlements(student_id);
CREATE INDEX idx_settlements_employee ON bus_subscription_settlements(employee_id);
CREATE INDEX idx_settlements_status ON bus_subscription_settlements(status);
```

### 3.3 Cost & Invoice Tables

#### 3.3.1 `bus_rental_invoices`

```sql
CREATE TABLE bus_rental_invoices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR(50) UNIQUE NOT NULL,         -- Internal code
    contract_id UUID NOT NULL REFERENCES bus_rental_contracts(id),
    
    -- Invoice details
    supplier_invoice_number VARCHAR(100),     -- From rental company
    invoice_date DATE NOT NULL,
    period_from DATE NOT NULL,
    period_to DATE NOT NULL,
    
    -- Amount
    base_amount NUMERIC(12,2) NOT NULL,
    additional_charges JSONB DEFAULT '[]'::JSONB,
    -- Format: [{"description": "Extra trip", "amount": 500.00}, ...]
    discount_amount NUMERIC(12,2) DEFAULT 0,
    discount_reason TEXT,
    tax_amount NUMERIC(12,2) DEFAULT 0,
    total_amount NUMERIC(12,2) NOT NULL,
    
    -- Status
    status VARCHAR(20) NOT NULL,
    -- Values: pending_review/approved/paid/overdue/disputed/cancelled
    
    -- Payment
    payment_id UUID,                          -- Reference to cashier transaction
    payment_date DATE,
    
    -- Approval
    approval_request_id UUID REFERENCES approval_requests(id),
    approved_by UUID REFERENCES users(id),
    approved_at TIMESTAMPTZ,
    
    -- Audit
    received_date DATE,
    received_by UUID REFERENCES users(id),
    attachment_url VARCHAR(500),
    notes TEXT,
    dispute_reason TEXT,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES users(id),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    deleted_at TIMESTAMPTZ
);

CREATE INDEX idx_rental_invoices_contract ON bus_rental_invoices(contract_id);
CREATE INDEX idx_rental_invoices_status ON bus_rental_invoices(status);
CREATE INDEX idx_rental_invoices_period ON bus_rental_invoices(period_from, period_to);
CREATE INDEX idx_rental_invoices_overdue ON bus_rental_invoices(status, period_to) 
    WHERE status IN ('pending_review', 'approved');
```

#### 3.3.2 `bus_costs`

```sql
CREATE TABLE bus_costs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    bus_id UUID NOT NULL REFERENCES buses(id),
    cost_type VARCHAR(30) NOT NULL,
    -- Values: rental / fuel / maintenance / insurance / repair / other
    cost_date DATE NOT NULL,
    amount NUMERIC(12,2) NOT NULL,
    description TEXT,
    
    -- Source
    rental_invoice_id UUID REFERENCES bus_rental_invoices(id),
    supplier_id UUID,                         -- Different supplier (e.g., fuel station)
    invoice_reference VARCHAR(100),
    
    -- Approval (for non-contract costs)
    approval_request_id UUID REFERENCES approval_requests(id),
    
    -- Accounting
    journal_entry_id UUID,
    
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES users(id)
);

CREATE INDEX idx_bus_costs_bus ON bus_costs(bus_id, cost_date);
CREATE INDEX idx_bus_costs_type ON bus_costs(cost_type);
CREATE INDEX idx_bus_costs_date ON bus_costs(cost_date);
```

#### 3.3.3 `bus_daily_operations` (Phase 2 prep, basic in MVP-1)

```sql
CREATE TABLE bus_daily_operations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    bus_id UUID NOT NULL REFERENCES buses(id),
    route_id UUID NOT NULL REFERENCES bus_routes(id),
    operation_date DATE NOT NULL,
    
    -- Morning trip
    morning_status VARCHAR(20),
    -- Values: normal/delayed/cancelled/replaced
    morning_delay_minutes INTEGER,
    morning_actual_pickup_start TIME,
    morning_actual_arrival TIME,
    
    -- Afternoon trip
    afternoon_status VARCHAR(20),
    afternoon_delay_minutes INTEGER,
    afternoon_actual_departure TIME,
    afternoon_actual_dropoff_end TIME,
    
    -- Replacement
    replacement_bus_id UUID REFERENCES buses(id),
    replacement_reason TEXT,
    
    -- Issues
    incident_notes TEXT,
    incident_severity VARCHAR(20),            -- minor/moderate/severe
    
    -- Performance
    fuel_added_liters NUMERIC(6,2),
    fuel_cost NUMERIC(12,2),
    odometer_start INTEGER,
    odometer_end INTEGER,
    
    recorded_by UUID REFERENCES users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(bus_id, operation_date)
);

CREATE INDEX idx_daily_ops_date ON bus_daily_operations(operation_date);
CREATE INDEX idx_daily_ops_bus ON bus_daily_operations(bus_id, operation_date);
```

---

## 4. Pro-Rata Calculation Engine

### 4.1 Core Logic

The pro-rata engine handles calculations when subscriptions start or change mid-year.

```python
from decimal import Decimal, ROUND_HALF_UP
from datetime import date, timedelta
from dataclasses import dataclass


@dataclass
class ProRataResult:
    """Result of pro-rata calculation."""
    months_remaining: int
    total_months: int
    proportion: Decimal
    previous_remaining: Decimal
    new_remaining: Decimal
    difference: Decimal
    direction: str  # 'subscriber_pays' / 'school_refunds' / 'no_change'


class ProRataCalculator:
    """
    Pro-rata calculation engine for bus subscriptions.
    
    Default logic: monthly proportion based on academic year months.
    Configurable via system settings.
    """
    
    DEFAULT_ACADEMIC_MONTHS = 10  # September - June
    
    def __init__(self, config_service):
        self.config = config_service
    
    def calculate_change_difference(
        self,
        previous_full_fee: Decimal,
        previous_discount_pct: Decimal,
        new_full_fee: Decimal,
        new_discount_pct: Decimal,
        change_effective_date: date,
        academic_year_end: date,
    ) -> ProRataResult:
        """
        Calculate pro-rata difference for a mid-year subscription change.
        
        Returns a ProRataResult with full breakdown.
        """
        # Calculate net fees
        previous_net = previous_full_fee * (Decimal('100') - previous_discount_pct) / Decimal('100')
        new_net = new_full_fee * (Decimal('100') - new_discount_pct) / Decimal('100')
        
        # Get months remaining
        months_remaining = self._calculate_months_remaining(
            change_effective_date, 
            academic_year_end
        )
        total_months = self.config.get('transport.academic_year_months', self.DEFAULT_ACADEMIC_MONTHS)
        
        # Calculate proportion
        if total_months == 0:
            proportion = Decimal('0')
        else:
            proportion = (Decimal(months_remaining) / Decimal(total_months)).quantize(
                Decimal('0.0001'), rounding=ROUND_HALF_UP
            )
        
        # Calculate remaining amounts
        previous_remaining = (previous_net * proportion).quantize(
            Decimal('0.01'), rounding=ROUND_HALF_UP
        )
        new_remaining = (new_net * proportion).quantize(
            Decimal('0.01'), rounding=ROUND_HALF_UP
        )
        
        # Calculate difference
        difference = new_remaining - previous_remaining
        
        # Determine direction
        if difference > 0:
            direction = 'subscriber_pays'
        elif difference < 0:
            direction = 'school_refunds'
        else:
            direction = 'no_change'
        
        return ProRataResult(
            months_remaining=months_remaining,
            total_months=total_months,
            proportion=proportion,
            previous_remaining=previous_remaining,
            new_remaining=new_remaining,
            difference=difference,
            direction=direction,
        )
    
    def calculate_partial_subscription(
        self,
        full_annual_fee: Decimal,
        discount_pct: Decimal,
        start_date: date,
        academic_year_end: date,
    ) -> Decimal:
        """
        Calculate fee for subscriber starting mid-year.
        
        Returns the actual amount to charge.
        """
        net_annual = full_annual_fee * (Decimal('100') - discount_pct) / Decimal('100')
        
        months_remaining = self._calculate_months_remaining(start_date, academic_year_end)
        total_months = self.config.get('transport.academic_year_months', self.DEFAULT_ACADEMIC_MONTHS)
        
        proportion = Decimal(months_remaining) / Decimal(total_months)
        partial_fee = (net_annual * proportion).quantize(
            Decimal('0.01'), rounding=ROUND_HALF_UP
        )
        
        return partial_fee
    
    def calculate_cancellation_refund(
        self,
        net_fee_paid: Decimal,
        cancellation_effective_date: date,
        academic_year_end: date,
    ) -> Decimal:
        """
        Calculate refund amount for cancellation.
        
        Returns refund amount (always positive).
        """
        months_remaining = self._calculate_months_remaining(
            cancellation_effective_date, 
            academic_year_end
        )
        total_months = self.config.get('transport.academic_year_months', self.DEFAULT_ACADEMIC_MONTHS)
        
        proportion = Decimal(months_remaining) / Decimal(total_months)
        refund = (net_fee_paid * proportion).quantize(
            Decimal('0.01'), rounding=ROUND_HALF_UP
        )
        
        # Apply cancellation fee if configured
        cancellation_fee = self.config.get('transport.cancellation_fee', Decimal('0'))
        refund = max(Decimal('0'), refund - cancellation_fee)
        
        return refund
    
    def _calculate_months_remaining(
        self, 
        from_date: date, 
        to_date: date
    ) -> int:
        """Calculate complete months between dates."""
        if from_date >= to_date:
            return 0
        
        months = (to_date.year - from_date.year) * 12 + (to_date.month - from_date.month)
        
        # If we're past the day-of-month, count current month as gone
        if from_date.day > to_date.day:
            months -= 1
        
        return max(0, months)
```

### 4.2 Calculation Examples

#### Example 1: Student Changes Bus Mid-Year

```python
# Student subscribed to Route A (annual fee: 6,000 EGP)
# Wants to change to Route B (annual fee: 8,000 EGP)
# Change date: February 15, 2027
# Academic year ends: June 30, 2027
# Months remaining: 4 (Mar, Apr, May, Jun)

result = calculator.calculate_change_difference(
    previous_full_fee=Decimal('6000.00'),
    previous_discount_pct=Decimal('0'),  # Student
    new_full_fee=Decimal('8000.00'),
    new_discount_pct=Decimal('0'),
    change_effective_date=date(2027, 2, 15),
    academic_year_end=date(2027, 6, 30),
)

# Result:
# months_remaining = 4
# total_months = 10
# proportion = 0.4000
# previous_remaining = 6000 × 0.4 = 2400.00
# new_remaining = 8000 × 0.4 = 3200.00
# difference = +800.00 (student pays additional 800 EGP)
# direction = 'subscriber_pays'
```

#### Example 2: Employee Cancels Subscription

```python
# Employee paid full year (fee: 6000, discount: 50%, paid: 3000)
# Cancels effective: January 1, 2027
# Months remaining: 6

refund = calculator.calculate_cancellation_refund(
    net_fee_paid=Decimal('3000.00'),
    cancellation_effective_date=date(2027, 1, 1),
    academic_year_end=date(2027, 6, 30),
)

# Result:
# proportion = 6 / 10 = 0.6
# refund = 3000 × 0.6 = 1800.00 EGP
```

#### Example 3: New Student Joins Mid-Year

```python
# New student joining Route A (annual fee: 6,000 EGP)
# Start date: November 1, 2026
# Months remaining: 8

partial_fee = calculator.calculate_partial_subscription(
    full_annual_fee=Decimal('6000.00'),
    discount_pct=Decimal('0'),
    start_date=date(2026, 11, 1),
    academic_year_end=date(2027, 6, 30),
)

# Result:
# proportion = 8 / 10 = 0.8
# partial_fee = 6000 × 0.8 = 4800.00 EGP
```

---

## 5. Subscription Lifecycle Management

### 5.1 New Subscription Flow

```
┌─────────────────────────────────────────────────────────────────┐
│  NEW BUS SUBSCRIPTION FLOW                                      │
└─────────────────────────────────────────────────────────────────┘

[Trigger: Family/HR/Staff requests bus subscription]
       ↓
[Step 1: Transport Officer creates subscription record]
   - Selects subscriber (student/employee/supervisor)
   - Selects route
   - Auto-fetches route's annual fee
   - Auto-applies discount based on subscriber type:
     • Student: 0% discount
     • Employee: 50% discount (configurable)
     • Supervisor: 100% discount
   - If start_date != academic year start → calls Pro-Rata Calculator
       ↓
[Step 2: System validates]
   - Route capacity check (bus has space?)
   - Subscriber eligibility
   - No duplicate active subscription
       ↓
[Step 3: Submit to Approval Workflow]
   workflow_type = 'transport_subscription_create'
       ↓
   Default routing:
   ├── Standard student/employee → Accountant
   ├── Supervisor (free) → Chief Accountant
   └── Special case → Principal
       ↓
[Step 4: On approval]
   - Subscription status: pending → active
   - Generate financial entries:
     • Student: add to receivables / installment
     • Employee: register payroll deduction
     • Supervisor: zero entry (audit only)
   - Create journal entry
   - Send notifications
   - Update bus capacity
       ↓
[Step 5: Operational]
   - Subscription appears in bus passenger list
   - Driver/supervisor sees pickup details
   - Family receives confirmation with route info
```

### 5.2 Subscription Change Flow

```
┌─────────────────────────────────────────────────────────────────┐
│  SUBSCRIPTION CHANGE FLOW                                       │
└─────────────────────────────────────────────────────────────────┘

[Trigger: Mid-year change request]
       ↓
[Step 1: Transport Officer opens change request]
   - Selects existing subscription
   - Specifies change type:
     • Route change
     • Bus change (same route, different bus)
     • Suspension (temporary)
     • Cancellation (permanent)
       ↓
[Step 2: System auto-calculates]
   - For route change: Pro-Rata Calculator computes difference
   - For cancellation: Pro-Rata Calculator computes refund
   - Determines settlement method:
     • Student: add to invoice / credit balance
     • Employee: payroll deduction / credit
       ↓
[Step 3: Submit to Approval Workflow]
   workflow_type = 'transport_subscription_change'
       ↓
   Routing based on amount:
   ├── difference == 0 → Accountant only
   ├── 0 < difference ≤ 500 → Accountant + Chief Accountant
   ├── difference > 500 → + Principal
   └── refund > 1000 → Chief Accountant + Principal
       ↓
[Step 4: On approval (atomic transaction)]
   1. Update bus_subscriptions:
      - End date previous subscription
      - Create new subscription record OR update existing
   2. Create bus_subscription_changes record
   3. Create bus_subscription_settlements record
   4. Apply settlement:
      • For student debit: add to current invoice / next installment
      • For student credit: increase credit balance
      • For employee debit: register next payroll deduction
      • For employee credit: register next payroll credit
   5. Generate journal entry:
      DR/CR Receivables (students)
      DR/CR Payables to Employees
      CR/DR Transport Revenue
   6. Notify all parties:
      - Family/Employee
      - Bus driver and supervisor
      - Accounting (if change involves money)
   7. Audit log
       ↓
[Step 5: Operational changes]
   - Bus passenger lists updated
   - Pickup notifications updated
   - Reports reflect new state
```

### 5.3 Cancellation Flow

```
[Cancellation request]
       ↓
[Calculate refund (if any)]
       ↓
[Submit transport_subscription_cancel workflow]
       ↓
[On approval]
   - Subscription status: active → cancelled
   - End date set to effective_date
   - If refund > 0: trigger transport_subscription_refund workflow
   - Settlement created
   - Bus capacity restored
   - Notifications sent
```

### 5.4 Suspension Flow (Temporary Pause)

```
[Suspension request]
   - Reason (e.g., extended illness, family travel)
   - From date, to date (or "until further notice")
       ↓
[Calculate fee adjustment]
   - Could be: full pause (no refund), partial refund, or no adjustment
   - Per school policy
       ↓
[Workflow approval]
       ↓
[On approval]
   - Subscription status: active → suspended
   - Bus capacity temporarily restored
   - Reactivation request needed when ready
```

---

## 6. Integration with Other Modules

### 6.1 Integration with Students Module

```python
# Transport calls Students Module:

# 1. Validate student exists and is active
from modules.students.public import students_service

def create_student_subscription(student_id, route_id, ...):
    student = students_service.get_by_id(student_id)
    if not student or student.status != 'active':
        raise ValueError("Student not active")
    
    # ... create subscription ...

# 2. Add to student receivables
from modules.students.public import students_billing_service

def apply_settlement_to_student(settlement):
    if settlement.direction == 'debit':
        students_billing_service.add_to_receivables(
            student_id=settlement.student_id,
            amount=settlement.amount,
            description=f"Bus subscription change: {settlement.code}",
            reference_type='bus_subscription_settlement',
            reference_id=settlement.id,
        )
    else:  # credit
        students_billing_service.add_to_credit_balance(
            student_id=settlement.student_id,
            amount=settlement.amount,
            description=f"Bus subscription refund: {settlement.code}",
        )
```

### 6.2 Integration with HR/Payroll Module

```python
# Transport calls HR Module:

from modules.hr.public import hr_service, payroll_service

def get_eligible_employee(employee_id):
    employee = hr_service.get_by_id(employee_id)
    if not employee or not employee.is_active:
        raise ValueError("Employee not active")
    return employee

def register_employee_subscription(subscription):
    """Register monthly payroll deduction for active employee subscription."""
    employee = hr_service.get_by_id(subscription.employee_id)
    
    monthly_deduction = subscription.net_fee_amount / Decimal('10')  # 10 academic months
    
    payroll_service.register_recurring_deduction(
        employee_id=subscription.employee_id,
        deduction_type='bus_subscription',
        monthly_amount=monthly_deduction,
        start_period=current_payroll_period(),
        end_period=last_payroll_period(),
        reference_type='bus_subscription',
        reference_id=subscription.id,
    )

def apply_settlement_to_employee(settlement):
    """Apply mid-year settlement to employee's payroll."""
    if settlement.direction == 'debit':
        payroll_service.register_one_time_deduction(
            employee_id=settlement.employee_id,
            amount=settlement.amount,
            description=f"Bus subscription change: {settlement.code}",
            apply_in_period=next_payroll_period(),
            reference_type='bus_subscription_settlement',
            reference_id=settlement.id,
        )
    else:  # credit
        payroll_service.register_one_time_addition(
            employee_id=settlement.employee_id,
            amount=settlement.amount,
            description=f"Bus subscription refund: {settlement.code}",
            apply_in_period=next_payroll_period(),
        )
```

### 6.3 Integration with Accounting Module

```python
from modules.accounting.public import accounting_service

def create_subscription_journal_entry(subscription):
    """Create journal entry when subscription activated."""
    accounting_service.create_journal_entry(
        date=subscription.start_date,
        description=f"Bus subscription: {subscription.code}",
        lines=[
            {
                'account_code': '1200',  # Receivables (or Payables for employees)
                'description': f"{subscription.subscriber_type}: {subscription.code}",
                'debit': subscription.net_fee_amount,
                'credit': Decimal('0'),
            },
            {
                'account_code': '4200',  # Transport Revenue
                'description': f"Annual transport fee",
                'debit': Decimal('0'),
                'credit': subscription.net_fee_amount,
            },
        ],
        reference_type='bus_subscription',
        reference_id=subscription.id,
    )

def create_rental_invoice_journal_entry(invoice):
    """Create journal entry for rental invoice."""
    accounting_service.create_journal_entry(
        date=invoice.invoice_date,
        description=f"Bus rental: {invoice.contract.company.name}",
        lines=[
            {
                'account_code': '5300',  # Transport Costs
                'debit': invoice.total_amount,
                'credit': Decimal('0'),
            },
            {
                'account_code': '2100',  # Suppliers Payable
                'debit': Decimal('0'),
                'credit': invoice.total_amount,
            },
        ],
        reference_type='bus_rental_invoice',
        reference_id=invoice.id,
    )
```

### 6.4 Integration with Approval Workflow Engine

Already covered in `07_APPROVAL_WORKFLOWS.md` (workflows W-025 through W-031).

---

## 7. Profitability Analysis

### 7.1 Per-Bus Profitability

```python
class BusProfitabilityCalculator:
    """Calculate profitability per bus over a period."""
    
    def calculate(
        self,
        bus_id: UUID,
        period_from: date,
        period_to: date,
    ) -> dict:
        """Returns full profitability breakdown for a bus."""
        
        # 1. Revenue: from all subscriptions on this bus during period
        revenue = self._calculate_revenue(bus_id, period_from, period_to)
        
        # 2. Costs: from bus_costs and rental_invoices allocated to this bus
        costs = self._calculate_costs(bus_id, period_from, period_to)
        
        # 3. Gross profit
        gross_profit = revenue['total'] - costs['total']
        gross_margin = (gross_profit / revenue['total'] * 100) if revenue['total'] > 0 else 0
        
        return {
            'bus_id': bus_id,
            'period_from': period_from,
            'period_to': period_to,
            'revenue': revenue,
            'costs': costs,
            'gross_profit': gross_profit,
            'gross_margin_pct': gross_margin,
        }
    
    def _calculate_revenue(self, bus_id, period_from, period_to):
        """Calculate total revenue from subscriptions on this bus."""
        active_subs = BusSubscription.objects.filter(
            bus_id=bus_id,
            status='active',
            start_date__lte=period_to,
        ).filter(
            Q(end_date__gte=period_from) | Q(end_date__isnull=True)
        )
        
        total = Decimal('0')
        breakdown = {'student': Decimal('0'), 'employee': Decimal('0'), 'supervisor': Decimal('0')}
        
        for sub in active_subs:
            # Calculate prorated revenue for this period
            sub_revenue = self._prorate_subscription_for_period(sub, period_from, period_to)
            total += sub_revenue
            breakdown[sub.subscriber_type] += sub_revenue
        
        return {
            'total': total,
            'by_subscriber_type': breakdown,
            'subscription_count': active_subs.count(),
        }
    
    def _calculate_costs(self, bus_id, period_from, period_to):
        """Calculate total costs allocated to this bus."""
        # Direct costs
        direct = BusCost.objects.filter(
            bus_id=bus_id,
            cost_date__gte=period_from,
            cost_date__lte=period_to,
        ).values('cost_type').annotate(total=Sum('amount'))
        
        # Allocated rental costs (proportional to monthly fee)
        bus = Bus.objects.get(id=bus_id)
        if bus.rental_contract_id:
            allocated_rental = self._allocate_rental_cost(bus, period_from, period_to)
        else:
            allocated_rental = Decimal('0')
        
        breakdown = {item['cost_type']: item['total'] for item in direct}
        breakdown['rental_allocated'] = allocated_rental
        
        return {
            'total': sum(breakdown.values()),
            'breakdown': breakdown,
        }
```

### 7.2 Per-Route Profitability

Similar to per-bus, but aggregated across all buses operating on a route.

### 7.3 Profitability Reports

**Monthly Profitability Report:**

```
┌──────────────────────────────────────────────────────────────────┐
│  Bus Profitability Report — May 2026                             │
├──────────────────────────────────────────────────────────────────┤
│                                                                  │
│  Bus      Route(s)        Revenue      Costs       Profit  Margin│
│  ─────────────────────────────────────────────────────────────── │
│  BUS-001  Route A (P1)    18,500 EGP   12,000 EGP  6,500   35.1% │
│  BUS-002  Route B (P1)    16,200 EGP   12,000 EGP  4,200   25.9% │
│  BUS-003  Route C (P2)    20,100 EGP   12,000 EGP  8,100   40.3% │
│  BUS-004  Route D (P2)    14,800 EGP   12,000 EGP  2,800   18.9% │
│  ...                                                             │
│  ─────────────────────────────────────────────────────────────── │
│  TOTAL    50 buses        875,000 EGP  600,000 EGP 275,000 31.4% │
│                                                                  │
│  📊 Top 5 Most Profitable                                        │
│  📉 Bottom 5 Least Profitable                                    │
│  ⚠️ 3 buses operating at loss                                    │
└──────────────────────────────────────────────────────────────────┘
```

---

## 8. Default Configuration Values

All configurable from admin UI:

| Configuration Key | Default | Purpose |
|---|---|---|
| `transport.employee_discount_pct` | 50 | Standard employee discount |
| `transport.supervisor_discount_pct` | 100 | Supervisor (free) |
| `transport.driver_discount_pct` | 100 | Driver if employee (free) |
| `transport.academic_year_months` | 10 | For pro-rata calc |
| `transport.change_admin_fee` | 0.00 | Fee for processing changes |
| `transport.cancellation_fee` | 0.00 | Fee for cancellation |
| `transport.refund_method` | "credit_balance" | Default: not cash |
| `transport.suspension_grace_days` | 7 | After non-payment |
| `transport.employee_deduction_timing` | "next_month" | Payroll deduction |
| `transport.allow_waitlist` | false | Wait for seat opening |
| `transport.allow_supervisor_multiple_buses` | false | One bus per supervisor |
| `transport.contract_renewal_alert_days` | 60 | Notify before expiry |
| `transport.invoice_auto_create` | true | Auto from contract |
| `transport.invoice_payment_due_days` | 30 | After invoice date |

---

## 9. Reports

### 9.1 Daily Operations Report (Phase 2 detailed)

For Transport Officer:

- Buses operating today
- Delays / incidents
- Replacement buses used
- Notes per route

### 9.2 Subscription Reports

**Active Subscriptions Report:**
- Total active subscriptions
- Breakdown by route
- Breakdown by subscriber type
- Capacity utilization per bus
- Pending subscriptions awaiting approval

**Subscription Changes Report:**
- All changes in a period
- Average pro-rata difference
- Most-changed routes
- Bottleneck analysis

### 9.3 Financial Reports

**Transport Revenue Report:**
- Total revenue per period
- By route
- By subscriber type
- Compared to budget

**Transport Costs Report:**
- Total costs per period
- Rental costs per company
- Cost breakdown by category
- Compared to budget

**Profitability Report:**
- Per bus
- Per route
- Per company (for rental analysis)
- Trends (month-over-month)

### 9.4 Operational Reports

**Bus Capacity Report:**
- Capacity per bus
- Current utilization
- Available seats per route
- Waitlist (if enabled)

**Driver Performance Report (Phase 2):**
- Punctuality
- Incidents
- Customer feedback

**Rental Company Performance Report:**
- Bus availability
- Issue frequency
- Cost vs. service quality
- Renewal recommendations

---

## 10. UI Mockups

### 10.1 Transport Dashboard

```
┌──────────────────────────────────────────────────────────────────┐
│  Transport Dashboard                              May 2, 2026    │
├──────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌─────────────┬─────────────┬─────────────┬─────────────┐      │
│  │ Active      │ Active      │ Buses       │ Routes       │      │
│  │ Subscript.  │ Subscript.  │ Operating   │ Active       │      │
│  │ (Students)  │ (Staff)     │             │              │      │
│  │   875       │   42        │   50        │   80         │      │
│  └─────────────┴─────────────┴─────────────┴─────────────┘      │
│                                                                  │
│  ┌─────────────────────┬──────────────────────────────────┐     │
│  │ Pending Approvals   │ Upcoming Renewals                │     │
│  │                     │                                  │     │
│  │ 🟡 5 subscription   │ 📅 Contract RC-2025-003          │     │
│  │    changes          │    Expires: 2026-08-31 (in 4 mo) │     │
│  │ 🔴 1 large refund   │                                  │     │
│  │ 🟢 12 routine       │ 📅 Contract RC-2025-007          │     │
│  │                     │    Expires: 2026-09-15 (in 4 mo) │     │
│  │ [View All]          │                                  │     │
│  └─────────────────────┴──────────────────────────────────┘     │
│                                                                  │
│  ┌────────────────────────────────────────────────────────┐     │
│  │ Today's Operations                                     │     │
│  │                                                        │     │
│  │ ✅ Morning trips: 50/50 buses normal                   │     │
│  │ ⚠️ 1 bus delayed: BUS-014 (Route 22) - 15 min          │     │
│  │ 🔴 1 incident: BUS-031 - mechanical issue (replaced)   │     │
│  │                                                        │     │
│  │ [View Details]                                         │     │
│  └────────────────────────────────────────────────────────┘     │
│                                                                  │
│  ┌────────────────────────────────────────────────────────┐     │
│  │ Quick Actions                                          │     │
│  │                                                        │     │
│  │ [+ New Subscription]  [Process Invoice]  [+ New Route] │     │
│  │ [Subscription Change] [Cancel Subscript.] [Reports]    │     │
│  └────────────────────────────────────────────────────────┘     │
│                                                                  │
│  ┌────────────────────────────────────────────────────────┐     │
│  │ This Month Profitability                               │     │
│  │                                                        │     │
│  │ Revenue: 875,000 EGP | Costs: 600,000 EGP              │     │
│  │ Profit:  275,000 EGP | Margin: 31.4%                   │     │
│  │                                                        │     │
│  │ [Detailed Report]                                      │     │
│  └────────────────────────────────────────────────────────┘     │
└──────────────────────────────────────────────────────────────────┘
```

### 10.2 Subscription Creation Form

```
┌──────────────────────────────────────────────────────────────────┐
│  New Bus Subscription                              [Cancel] [Save]│
├──────────────────────────────────────────────────────────────────┤
│                                                                  │
│  Subscriber Type:  ⦿ Student  ○ Employee  ○ Supervisor          │
│                                                                  │
│  Subscriber:       [Search student...                       ] 🔍 │
│                    Selected: Ahmed Mohamed (Grade 5)             │
│                                                                  │
│  Route:            [Select route...                         ▼]  │
│                    Selected: Route A — Maadi → School            │
│                    Annual Fee: 6,000 EGP                         │
│                                                                  │
│  Bus (optional):   [Auto-assign based on capacity            ▼]  │
│                                                                  │
│  Academic Year:    [2026-2027                               ▼]  │
│                                                                  │
│  Start Date:       [2026-09-01]                                  │
│  End Date:         [2027-06-30]  (Default: year end)             │
│                                                                  │
│  Pickup Address:   [_____________________________________]      │
│  Landmark:         [_____________________________________]      │
│  Contact Phone:    [_____________________________________]      │
│                                                                  │
│  ──────────────────────────────────────────────────────────────  │
│  💰 Fee Calculation                                              │
│                                                                  │
│  Full annual fee:        6,000.00 EGP                            │
│  Discount (Student):     0% = 0.00 EGP                           │
│  Net annual fee:         6,000.00 EGP                            │
│                                                                  │
│  ⚠️ Mid-year start: Pro-rata applies                              │
│  Months remaining:       10                                      │
│  Total months:           10                                      │
│  Proportion:             100%                                    │
│  Amount to charge:       6,000.00 EGP                            │
│                                                                  │
│  Settlement:             ⦿ Add to invoice  ○ Installment        │
│                                                                  │
│  Notes (optional):                                               │
│  [____________________________________________________]         │
│                                                                  │
│  After saving, this will be submitted for approval.              │
│                                                                  │
│                                          [Submit for Approval]   │
└──────────────────────────────────────────────────────────────────┘
```

### 10.3 Subscription Change Form

```
┌──────────────────────────────────────────────────────────────────┐
│  Change Subscription: SUB-2026-0145                              │
├──────────────────────────────────────────────────────────────────┤
│                                                                  │
│  Current Subscription:                                           │
│  Subscriber: Ahmed Mohamed (Grade 5)                             │
│  Route: Route A (6,000 EGP/year)                                 │
│  Bus: BUS-007                                                    │
│  Status: Active since 2026-09-01                                 │
│                                                                  │
│  ──────────────────────────────────────────────────────────────  │
│  Change Type:    ⦿ Route Change  ○ Bus Change  ○ Cancel          │
│                                                                  │
│  New Route:      [Route C — Heliopolis → School    ▼]           │
│                  Annual Fee: 8,000 EGP                           │
│                                                                  │
│  Effective:      [2027-02-15]                                    │
│                                                                  │
│  ──────────────────────────────────────────────────────────────  │
│  💰 Pro-Rata Calculation                                         │
│                                                                  │
│  Months remaining: 4 (Mar, Apr, May, Jun)                        │
│  Total months:     10                                            │
│  Proportion:       40%                                           │
│                                                                  │
│  Previous remaining: 6,000 × 0.40 = 2,400.00 EGP                 │
│  New remaining:      8,000 × 0.40 = 3,200.00 EGP                 │
│                                                                  │
│  ➕ Difference: +800.00 EGP (subscriber pays additional)         │
│                                                                  │
│  Settlement Method: ⦿ Add to next invoice                        │
│                     ○ Add to installment                         │
│                                                                  │
│  Reason: [Family relocated to Heliopolis area_____]              │
│                                                                  │
│  ──────────────────────────────────────────────────────────────  │
│  Approval Required:                                              │
│  • Accountant approval (auto-routed since difference > 0)        │
│                                                                  │
│                                          [Submit for Approval]   │
└──────────────────────────────────────────────────────────────────┘
```

---

## 11. Edge Cases

### 11.1 Bus Capacity Exceeded

**Scenario:** Trying to add subscription when bus is full.

**Handling:**
1. System checks capacity at submission
2. If full and waitlist disabled → reject with clear message
3. If full and waitlist enabled → add to waitlist
4. When seat opens → notify next on waitlist

### 11.2 Subscriber Not Active Anymore

**Scenario:** Active student subscription, but student withdraws.

**Handling:**
1. Student withdrawal triggers transport hook
2. System auto-creates `transport_subscription_cancel` change request
3. Pro-rata refund calculated
4. Goes through standard approval

### 11.3 Bus Becomes Unavailable

**Scenario:** Bus goes for maintenance or rental contract terminated.

**Handling:**
1. Transport Officer reassigns route to another bus
2. All subscriptions on that bus auto-updated (no fee change, just bus assignment)
3. Notifications sent
4. If permanent unavailability without replacement → may trigger cancellation workflow

### 11.4 Mid-Period Rental Contract Termination

**Scenario:** Need to terminate contract before end date.

**Handling:**
1. Workflow approval required (high-level)
2. Settlement with rental company per contract terms
3. Plan transition for affected buses (replacement contract)
4. No impact on subscriptions if alternative bus available

### 11.5 Pro-Rata for Partial Months

**Scenario:** Change in middle of a month.

**Handling (configurable):**
- **Option A (default):** Round to whole months. If change ≤ 15th, current month counts as full. If > 15th, current month doesn't count.
- **Option B:** Calculate by exact days
- **Option C:** Always count current month as full

### 11.6 Multiple Subscriptions for Same Subscriber

**Scenario:** A student has subscription on Route A, parent wants to switch to Route B.

**Handling:**
- Cannot have 2 active subscriptions for same subscriber
- Must use change workflow (atomic: cancel old + create new)

---

## 12. Performance Considerations

### 12.1 Indexes

Already defined in schema. Key queries optimized:

- Find active subscriptions for a student/employee
- List passengers on a specific bus
- Find subscriptions by route
- Find pending changes
- Profitability calculation per bus

### 12.2 Caching

- Active routes (rarely change) — 1 hour TTL
- Bus assignments (per academic year) — 1 hour TTL
- Configuration values — 10 min TTL

### 12.3 Async Operations

- Profitability reports → Celery
- Bulk subscription operations (e.g., year start) → Celery
- Notification sending → Celery
- Invoice generation → Celery

---

## 13. Testing Strategy

### 13.1 Unit Tests

**Pro-Rata Calculator:**
- All scenarios in section 4.2
- Edge cases: 0 months, full year, exact end date
- Currency precision (no floating point errors)

**Subscription Service:**
- Create subscription happy path
- Mid-year creation
- Capacity validation
- Discount application by type

**Settlement Service:**
- Each settlement method (invoice, installment, payroll)
- Direction (debit/credit)
- Integration with destination modules

### 13.2 Integration Tests

End-to-end flows:
- New subscription → approval → student receivable updated
- Subscription change → approval → settlement applied
- Cancellation → refund → credit balance updated
- Employee subscription → payroll deduction
- Rental invoice → approval → payment

### 13.3 Performance Tests

- 1,000 active subscriptions
- 50 simultaneous subscription changes
- Profitability report for full month with all buses

---

## 14. Migration Considerations

### 14.1 Initial Data Setup

**Step 1:** Migrate rental companies
**Step 2:** Migrate rental contracts
**Step 3:** Migrate buses (linked to contracts)
**Step 4:** Migrate routes
**Step 5:** Assign buses to routes
**Step 6:** Migrate active subscriptions

### 14.2 Excel Templates

Provide templates for:
- Rental companies list
- Contracts (one per row)
- Buses (linking to contracts by code)
- Routes
- Bus-route assignments
- Active subscriptions (linking to students/employees by code)

### 14.3 Validation

- All buses must link to contracts (in MVP-1)
- All routes must have valid pricing
- Subscription totals must reconcile with student receivables
- Employee deductions must reconcile with HR records

---

## 15. Future Enhancements (Phase 2+)

### 15.1 Phase 2 Additions

- **Student attendance on buses** — pickup/dropoff confirmation
- **Real-time bus tracking** — GPS integration
- **Parent mobile app** — see bus location, ETA
- **Driver mobile app** — passenger list, navigation
- **Incident reporting** — structured reporting from drivers/supervisors

### 15.2 Phase 3 Possibilities

- **Owned buses** — full lifecycle (purchase, depreciation, sale)
- **Maintenance scheduling** — for owned buses
- **Insurance management**
- **Route optimization** — algorithm for optimal route planning
- **Predictive analytics** — demand forecasting
- **Multi-school transport sharing** (if school expands)

---

## 16. Summary

### 16.1 Module Statistics

- **Tables:** 12
- **Default Workflows:** 7
- **Configuration Items:** 14+
- **Default Discount Tiers:** 3 (Student/Employee/Supervisor)
- **Pro-Rata Modes:** 3 scenarios (change, partial start, cancellation)
- **Integration Points:** 4 modules

### 16.2 Key Design Decisions

1. **All buses currently rented, but architecture supports ownership**
2. **Pro-rata calculated by months (configurable)**
3. **Refunds default to credit balance, not cash**
4. **Employee deductions via payroll, automatic**
5. **Profitability tracked per bus**
6. **All sensitive operations approval-gated**
7. **Configuration over hardcoding**

### 16.3 Success Metrics for MVP-1

- ✅ All 50 buses managed in system
- ✅ All 80 routes operational
- ✅ ~875 student subscriptions active
- ✅ ~42 employee subscriptions with auto payroll deductions
- ✅ Mid-year changes processed within 48 hours
- ✅ Monthly rental invoices reconciled
- ✅ Profitability reports generated monthly
- ✅ Zero discrepancies in subscriber accounting

---

*End of Transport Module Document*

> **Related Documents:**
> - `04_ARCHITECTURE.md` — Overall architecture
> - `06_USER_ROLES_AND_PERMISSIONS.md` — Roles involved
> - `07_APPROVAL_WORKFLOWS.md` — Transport workflows in detail
