# Inventory Module — El Shorouk School Management System

> **Document Type:** Detailed Module Specification
> **Status:** v1.0 — Foundation
> **Date:** May 2026
> **Document Owner:** Project Tech Lead

---

## 1. Module Overview

### 1.1 Purpose

The Inventory Module manages the complete lifecycle of all physical items at El Shorouk School, with a fundamental separation between **two distinct item types**:

1. **Sale Items (Student-Facing):** Books, uniforms — items sold to students with profitability tracking
2. **Consumable Items (Operational):** Office supplies, lab materials, cleaning supplies — items consumed internally as expenses

The module covers:
- Master data management (categories, sections, suppliers, items, variants)
- Procurement cycle (purchase request → approval → PO → receipt)
- FIFO cost tracking with batch lots
- Sales to students with payment verification
- Consumption tracking for operational items
- Returns (from students AND to suppliers)
- Annual + cyclical stock takes with strict SoD
- Profitability analysis per item, per category
- Integration with Students, Cashier, Accounting, Approval Engine

### 1.2 Current El Shorouk Reality

| Aspect | Current State |
|---|---|
| Warehouse | Single physical warehouse with logical sections |
| Categories (initial) | 4 (Books, Uniforms, Stationery, Lab Supplies) |
| Item types | Two: Sale (Books, Uniforms) + Consumable (Stationery, Lab) |
| Cost method | FIFO (First In, First Out) |
| Suppliers | Direct purchasing, no quotation process |
| Stock take | Annual + cyclical for critical items |
| SoD enforcement | Warehouse Manager sees quantities only; Accountant sees prices |

### 1.3 Future-Proofing

The architecture supports:
- **Adding new categories** without code changes
- **Multiple physical warehouses** (Phase 2 if needed)
- **Different cost methods per category** (Weighted Average for some)
- **Supplier rating and performance tracking**
- **Reorder automation**
- **Barcode/QR scanning integration**

---

## 2. Module Position in Architecture

### 2.1 Bounded Context

```
┌────────────────────────────────────────────────────────────────┐
│                    INVENTORY MODULE                            │
│                                                                │
│  Owns:                                                         │
│  • Categories & Sections                                       │
│  • Suppliers                                                   │
│  • Items (Sale + Consumable)                                   │
│  • Item Variants (sizes, etc.)                                 │
│  • Books Curriculum (book↔grade mapping)                       │
│  • Uniform Packages                                            │
│  • Stock Levels & FIFO Lots                                    │
│  • Purchase Requests, Orders, Goods Receipts                   │
│  • Issues (Sales + Consumption)                                │
│  • Returns (Student + Supplier)                                │
│  • Stock Takes & Adjustments                                   │
│                                                                │
│  Public API (inventory.public):                                │
│  • check_stock_availability(...)                               │
│  • create_sale_to_student(...)                                 │
│  • register_consumption(...)                                   │
│  • process_return(...)                                         │
│  • get_student_purchases(...)                                  │
│  • calculate_item_profitability(...)                           │
│  • get_low_stock_items(...)                                    │
│  • get_inventory_value(...)                                    │
└────────────────────────────────────────────────────────────────┘
```

### 2.2 Dependencies

```
Inventory Module depends on:
├── Students Module (public API)
│   • get_student_by_id()
│   • get_student_payment_status()
│   • get_student_grade_and_track()
│   • add_to_receivables()
├── Cashier Module (public API)
│   • create_receipt()
│   • verify_payment()
├── Accounting Module (public API)
│   • create_journal_entry()
│   • register_expense()
│   • register_revenue()
├── HR Module (public API)
│   • get_department_by_id()  (for consumable allocation)
├── Approval Workflow Engine
│   • submit_request()
└── Notifications Module
    • notify_low_stock()
    • notify_purchase_approved()
```

---

## 3. Core Concepts

### 3.1 Item Types

The fundamental distinction in this module:

```
                    ┌─────────────────┐
                    │  INVENTORY ITEM │
                    └────────┬────────┘
                             │
              ┌──────────────┴──────────────┐
              │                             │
        ┌─────▼──────┐                ┌─────▼──────┐
        │ SALE ITEM  │                │ CONSUMABLE │
        │ (Students) │                │   (Ops)    │
        └────────────┘                └────────────┘
        
        Books, Uniforms              Stationery, Lab supplies
        
        ✓ Has cost price (FIFO)      ✓ Has cost price (FIFO)
        ✓ Has SALE price             ✗ No sale price
        ✓ Sold to STUDENTS           ✓ Consumed by DEPARTMENTS
        ✓ Payment verification       ✗ No payment check
        ✓ Generates revenue          ✗ Generates expense
        ✓ Profitability tracked      ✗ Cost only tracked
        ✓ Can be returned by student ✓ Can be returned to supplier
```

### 3.2 Two-Track Issue Process

```
ITEM ISSUE
    │
    ├── If item.type == 'sale' → SALE PROCESS
    │       1. Select student (mandatory)
    │       2. Verify payment status
    │           ├── Paid → Proceed
    │           └── Unpaid → Trigger workflow OR cashier collects first
    │       3. Create receipt
    │       4. Generate revenue + COGS journal entries
    │       5. Update student's purchase history
    │
    └── If item.type == 'consumable' → CONSUMPTION PROCESS
            1. Select department/section (mandatory)
            2. Specify reason
            3. No payment check
            4. Generate expense journal entry
            5. Update department's expense report
```

### 3.3 FIFO Cost Method

When a sale or consumption occurs, the system consumes stock from the **oldest lots first**:

```
Stock for Item "Math Book Grade 5":
┌────────────────────────────────────────────────┐
│ Lot 1: 100 units @ 50 EGP (purchased Sept 1)   │
│ Lot 2: 50 units @ 55 EGP (purchased Oct 15)    │
│ Lot 3: 80 units @ 53 EGP (purchased Nov 20)    │
└────────────────────────────────────────────────┘
Total: 230 units

Sale of 120 units triggers:
  → Consume 100 from Lot 1 (cost: 100 × 50 = 5,000 EGP)
  → Consume 20 from Lot 2 (cost: 20 × 55 = 1,100 EGP)
  → Total COGS: 6,100 EGP
  → Average cost per unit: 50.83 EGP

After sale:
┌────────────────────────────────────────────────┐
│ Lot 1: 0 units (depleted)                      │
│ Lot 2: 30 units @ 55 EGP                       │
│ Lot 3: 80 units @ 53 EGP                       │
└────────────────────────────────────────────────┘
```

---

## 4. Database Schema

### 4.1 Master Data Tables

#### 4.1.1 `inventory_categories`

```sql
CREATE TABLE inventory_categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR(50) UNIQUE NOT NULL,
    name_ar VARCHAR(200) NOT NULL,
    name_en VARCHAR(200),
    description TEXT,
    
    -- Item type (CRITICAL: defines whole behavior)
    default_item_type VARCHAR(20) NOT NULL,    -- 'sale' / 'consumable'
    
    -- Accounting integration
    revenue_account_code VARCHAR(20),          -- For sale categories
    cogs_account_code VARCHAR(20),             -- Cost of Goods Sold (sale categories)
    expense_account_code VARCHAR(20),          -- For consumable categories
    inventory_account_code VARCHAR(20) NOT NULL,  -- Asset account
    
    -- Display
    icon VARCHAR(50),
    color VARCHAR(20),
    sort_order INTEGER DEFAULT 0,
    
    -- Status
    is_active BOOLEAN DEFAULT TRUE,
    is_system_defined BOOLEAN DEFAULT FALSE,   -- Cannot be deleted
    created_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES users(id),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    deleted_at TIMESTAMPTZ,
    
    CONSTRAINT valid_item_type CHECK (default_item_type IN ('sale', 'consumable')),
    CONSTRAINT valid_sale_accounts CHECK (
        default_item_type != 'sale' OR 
        (revenue_account_code IS NOT NULL AND cogs_account_code IS NOT NULL)
    )
);

-- Default categories
INSERT INTO inventory_categories (code, name_ar, name_en, default_item_type, ...) VALUES
('BOOKS', 'كتب', 'Books', 'sale', ...),
('UNIFORMS', 'ملابس', 'Uniforms', 'sale', ...),
('STATIONERY', 'قرطاسية', 'Stationery', 'consumable', ...),
('LAB_SUPPLIES', 'مستلزمات معامل', 'Lab Supplies', 'consumable', ...);
```

#### 4.1.2 `inventory_sections`

```sql
CREATE TABLE inventory_sections (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR(50) UNIQUE NOT NULL,
    name_ar VARCHAR(200) NOT NULL,
    name_en VARCHAR(200),
    
    -- Physical location within the single warehouse
    location_description TEXT,                 -- e.g., "Floor 2, Room 5"
    aisle VARCHAR(50),
    shelf VARCHAR(50),
    
    -- Default category (most items in this section)
    default_category_id UUID REFERENCES inventory_categories(id),
    
    -- Status
    is_active BOOLEAN DEFAULT TRUE,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    deleted_at TIMESTAMPTZ
);

CREATE INDEX idx_sections_category ON inventory_sections(default_category_id);
```

#### 4.1.3 `inventory_suppliers`

```sql
CREATE TABLE inventory_suppliers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR(50) UNIQUE NOT NULL,
    name_ar VARCHAR(200) NOT NULL,
    name_en VARCHAR(200),
    
    -- Contact
    contact_person VARCHAR(200),
    phone VARCHAR(50),
    secondary_phone VARCHAR(50),
    email VARCHAR(100),
    address TEXT,
    
    -- Legal/Financial
    tax_id VARCHAR(50),
    commercial_registration VARCHAR(50),
    bank_name VARCHAR(100),
    bank_account_number VARCHAR(100),
    payment_terms_days INTEGER DEFAULT 30,     -- Net 30 default
    
    -- Categories supplied
    primary_categories UUID[] DEFAULT '{}',    -- Array of category IDs
    
    -- Performance tracking
    rating_quality NUMERIC(3,2) DEFAULT 0,     -- 0.00 - 5.00
    rating_delivery NUMERIC(3,2) DEFAULT 0,
    rating_pricing NUMERIC(3,2) DEFAULT 0,
    total_orders INTEGER DEFAULT 0,
    total_value_lifetime NUMERIC(14,2) DEFAULT 0,
    
    -- Status
    is_active BOOLEAN DEFAULT TRUE,
    is_blacklisted BOOLEAN DEFAULT FALSE,
    blacklist_reason TEXT,
    
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES users(id),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    deleted_at TIMESTAMPTZ
);

CREATE INDEX idx_suppliers_active ON inventory_suppliers(is_active) WHERE deleted_at IS NULL;
```

#### 4.1.4 `inventory_items` (CORE TABLE)

```sql
CREATE TABLE inventory_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR(50) UNIQUE NOT NULL,          -- Internal SKU
    barcode VARCHAR(100) UNIQUE,
    name_ar VARCHAR(300) NOT NULL,
    name_en VARCHAR(300),
    description TEXT,
    
    -- Classification
    category_id UUID NOT NULL REFERENCES inventory_categories(id),
    section_id UUID REFERENCES inventory_sections(id),
    
    -- ⭐ CRITICAL: Item type (inherits from category by default, but can override)
    item_type VARCHAR(20) NOT NULL,            -- 'sale' / 'consumable'
    
    -- Pricing (sale items only have sale_price)
    current_cost_price NUMERIC(12,2),          -- Latest cost (informational)
    average_cost_price NUMERIC(12,2),          -- Calculated from FIFO lots
    sale_price NUMERIC(12,2),                  -- NULL for consumables
    
    -- Variants
    has_variants BOOLEAN DEFAULT FALSE,        -- True for uniforms (sizes)
    variant_type VARCHAR(50),                  -- 'size', 'color', 'size+color'
    
    -- Physical properties
    unit_of_measure VARCHAR(20) DEFAULT 'piece',  -- piece/box/dozen/meter/liter
    weight_grams INTEGER,
    
    -- Stock control
    track_stock BOOLEAN DEFAULT TRUE,
    minimum_stock_level INTEGER DEFAULT 0,     -- Reorder point
    maximum_stock_level INTEGER,
    reorder_quantity INTEGER,
    
    -- Books-specific fields (NULL for non-books)
    book_subject VARCHAR(100),
    book_publisher VARCHAR(100),
    book_isbn VARCHAR(20),
    book_grade_levels INTEGER[] DEFAULT '{}',  -- Grade levels this book is for
    
    -- Uniforms-specific fields (NULL for non-uniforms)
    uniform_type VARCHAR(50),                  -- 'summer', 'winter', 'sports', 'occasion'
    uniform_gender VARCHAR(20),                -- 'boys', 'girls', 'unisex'
    uniform_grade_levels INTEGER[] DEFAULT '{}',
    
    -- Status
    is_active BOOLEAN DEFAULT TRUE,
    is_discontinued BOOLEAN DEFAULT FALSE,
    
    -- Images
    image_url VARCHAR(500),
    
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES users(id),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    updated_by UUID REFERENCES users(id),
    deleted_at TIMESTAMPTZ,
    
    CONSTRAINT valid_item_type CHECK (item_type IN ('sale', 'consumable')),
    CONSTRAINT sale_must_have_price CHECK (
        item_type != 'sale' OR sale_price IS NOT NULL
    ),
    CONSTRAINT consumable_no_sale_price CHECK (
        item_type != 'consumable' OR sale_price IS NULL
    )
);

CREATE INDEX idx_items_category ON inventory_items(category_id);
CREATE INDEX idx_items_type ON inventory_items(item_type);
CREATE INDEX idx_items_active ON inventory_items(is_active) WHERE deleted_at IS NULL;
CREATE INDEX idx_items_low_stock ON inventory_items(id) 
    WHERE track_stock = TRUE AND is_active = TRUE;
CREATE INDEX idx_items_books_grades ON inventory_items USING GIN(book_grade_levels) 
    WHERE category_id IN (SELECT id FROM inventory_categories WHERE code = 'BOOKS');
```

#### 4.1.5 `inventory_item_variants` (For uniforms with sizes)

```sql
CREATE TABLE inventory_item_variants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    item_id UUID NOT NULL REFERENCES inventory_items(id),
    code VARCHAR(50) NOT NULL,                 -- e.g., "UNI-001-M", "UNI-001-L"
    barcode VARCHAR(100) UNIQUE,
    
    -- Variant attributes
    size VARCHAR(20),                          -- 'XS', 'S', 'M', 'L', 'XL', 'XXL'
    color VARCHAR(50),
    age_range VARCHAR(20),                     -- e.g., '6-8', '9-11'
    
    -- Pricing override (if different from parent)
    sale_price_override NUMERIC(12,2),         -- NULL = use parent's price
    
    -- Stock control
    minimum_stock_level INTEGER DEFAULT 0,
    
    -- Status
    is_active BOOLEAN DEFAULT TRUE,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(item_id, size, color),
    CONSTRAINT valid_variant CHECK (size IS NOT NULL OR color IS NOT NULL OR age_range IS NOT NULL)
);

CREATE INDEX idx_variants_item ON inventory_item_variants(item_id);
CREATE INDEX idx_variants_active ON inventory_item_variants(is_active);
```

#### 4.1.6 `inventory_books_curriculum` (Book-Grade mapping)

```sql
CREATE TABLE inventory_books_curriculum (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    item_id UUID NOT NULL REFERENCES inventory_items(id),
    grade_level INTEGER NOT NULL,              -- 1-12
    track_id UUID REFERENCES tracks(id),       -- NULL = all tracks
    
    -- ⭐ Mandatory or optional for this grade/track
    is_mandatory BOOLEAN NOT NULL,
    
    -- Subject context
    subject VARCHAR(100),
    semester VARCHAR(20),                      -- 'first', 'second', 'both'
    academic_year_id UUID REFERENCES academic_years(id),
    
    notes TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(item_id, grade_level, track_id, academic_year_id)
);

CREATE INDEX idx_books_curr_grade ON inventory_books_curriculum(grade_level, track_id);
CREATE INDEX idx_books_curr_year ON inventory_books_curriculum(academic_year_id);
CREATE INDEX idx_books_curr_mandatory ON inventory_books_curriculum(is_mandatory);
```

**Example Records:**

```sql
-- Math book Grade 5 - Mandatory for all
('item-math5-uuid', 5, NULL, true, 'Math', 'both', 'year-2026-uuid')

-- French book Grade 7 - Optional for International track
('item-french7-uuid', 7, 'international-track-uuid', false, 'French', 'both', 'year-2026-uuid')

-- French book Grade 7 - Mandatory for National track  
('item-french7-uuid', 7, 'national-track-uuid', true, 'French', 'both', 'year-2026-uuid')
```

#### 4.1.7 `inventory_uniform_packages` (Pre-defined uniform sets per stage)

```sql
CREATE TABLE inventory_uniform_packages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR(50) UNIQUE NOT NULL,
    name_ar VARCHAR(200) NOT NULL,
    name_en VARCHAR(200),
    
    -- Target audience
    stage_id UUID REFERENCES stages(id),       -- Primary, Preparatory, Secondary
    gender VARCHAR(20),                        -- 'boys', 'girls'
    grade_levels INTEGER[] DEFAULT '{}',       -- Specific grades
    
    -- Package contents (JSON for flexibility)
    items JSONB NOT NULL,
    -- Format: [{"item_id": "uuid", "uniform_type": "summer", "quantity": 2, "is_optional": false}]
    
    -- Pricing (sum of items, can override)
    suggested_total_price NUMERIC(12,2),
    
    -- Status
    is_active BOOLEAN DEFAULT TRUE,
    academic_year_id UUID REFERENCES academic_years(id),
    
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    deleted_at TIMESTAMPTZ
);

CREATE INDEX idx_uniform_packages_stage ON inventory_uniform_packages(stage_id);
CREATE INDEX idx_uniform_packages_active ON inventory_uniform_packages(is_active);
```

### 4.2 Stock Tracking Tables (FIFO Core)

#### 4.2.1 `inventory_stock_lots` (FIFO Engine Core)

This is the **most critical table** for FIFO tracking. Each lot represents a batch received at a specific cost.

```sql
CREATE TABLE inventory_stock_lots (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR(50) UNIQUE NOT NULL,          -- e.g., "LOT-2026-0001"
    
    -- Item reference
    item_id UUID NOT NULL REFERENCES inventory_items(id),
    variant_id UUID REFERENCES inventory_item_variants(id),  -- NULL for non-variant items
    
    -- Source
    goods_receipt_id UUID NOT NULL REFERENCES inventory_goods_receipts(id),
    purchase_order_id UUID REFERENCES inventory_purchase_orders(id),
    supplier_id UUID NOT NULL REFERENCES inventory_suppliers(id),
    
    -- Quantities
    received_quantity INTEGER NOT NULL,        -- Original quantity received
    consumed_quantity INTEGER DEFAULT 0,       -- Used so far
    available_quantity INTEGER GENERATED ALWAYS AS 
        (received_quantity - consumed_quantity) STORED,
    
    -- Cost (the heart of FIFO)
    cost_per_unit NUMERIC(12,2) NOT NULL,
    total_lot_value NUMERIC(14,2) GENERATED ALWAYS AS 
        ((received_quantity - consumed_quantity) * cost_per_unit) STORED,
    
    -- Dates (for FIFO ordering)
    received_at TIMESTAMPTZ NOT NULL,          -- Used for FIFO ordering
    expiry_date DATE,                          -- For perishable items
    
    -- Status
    status VARCHAR(20) NOT NULL DEFAULT 'active',
    -- Values: active/depleted/expired/quarantined
    
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES users(id),
    
    CONSTRAINT positive_received CHECK (received_quantity > 0),
    CONSTRAINT consumed_within_received CHECK (consumed_quantity <= received_quantity),
    CONSTRAINT positive_cost CHECK (cost_per_unit >= 0)
);

-- Critical indexes for FIFO performance
CREATE INDEX idx_lots_item_fifo ON inventory_stock_lots(item_id, variant_id, received_at) 
    WHERE status = 'active' AND (received_quantity - consumed_quantity) > 0;
CREATE INDEX idx_lots_supplier ON inventory_stock_lots(supplier_id);
CREATE INDEX idx_lots_expiry ON inventory_stock_lots(expiry_date) 
    WHERE expiry_date IS NOT NULL AND status = 'active';
```

#### 4.2.2 `inventory_stock_levels` (Aggregated view, kept in sync)

This table maintains current totals for fast queries (denormalized for performance).

```sql
CREATE TABLE inventory_stock_levels (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    item_id UUID NOT NULL REFERENCES inventory_items(id),
    variant_id UUID REFERENCES inventory_item_variants(id),
    
    -- Aggregated quantities
    total_quantity INTEGER NOT NULL DEFAULT 0,
    reserved_quantity INTEGER NOT NULL DEFAULT 0,  -- For pending operations
    available_quantity INTEGER GENERATED ALWAYS AS 
        (total_quantity - reserved_quantity) STORED,
    
    -- Calculated values (updated on every transaction)
    average_cost_per_unit NUMERIC(12,2),
    total_value NUMERIC(14,2),
    
    -- Last transaction
    last_received_at TIMESTAMPTZ,
    last_issued_at TIMESTAMPTZ,
    last_stock_take_at TIMESTAMPTZ,
    
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(item_id, variant_id)
);

CREATE INDEX idx_stock_levels_item ON inventory_stock_levels(item_id);
CREATE INDEX idx_stock_levels_low ON inventory_stock_levels(item_id) 
    WHERE total_quantity > 0;
```

### 4.3 Procurement Tables

#### 4.3.1 `inventory_purchase_requests`

```sql
CREATE TABLE inventory_purchase_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR(50) UNIQUE NOT NULL,          -- e.g., "PR-2026-0001"
    
    -- Request details
    requested_by UUID NOT NULL REFERENCES users(id),
    requested_at TIMESTAMPTZ DEFAULT NOW(),
    requested_for_department VARCHAR(100),
    urgency VARCHAR(20) DEFAULT 'normal',      -- low/normal/high/urgent
    needed_by_date DATE,
    
    -- Supplier (optional preference)
    suggested_supplier_id UUID REFERENCES inventory_suppliers(id),
    
    -- Justification
    reason TEXT NOT NULL,
    
    -- Calculated totals (from items)
    items_count INTEGER DEFAULT 0,
    estimated_total NUMERIC(14,2) DEFAULT 0,
    
    -- ⭐ Approval routing based on amount:
    -- ≤ 100 EGP: no approval needed (warehouse manager direct)
    -- > 100 to ≤ 1000: chief accountant
    -- > 1000: principal
    
    -- Status
    status VARCHAR(20) NOT NULL DEFAULT 'draft',
    -- Values: draft/pending_approval/approved/rejected/converted_to_po/cancelled
    
    -- Approval
    approval_request_id UUID REFERENCES approval_requests(id),
    approved_by UUID REFERENCES users(id),
    approved_at TIMESTAMPTZ,
    rejection_reason TEXT,
    
    -- Conversion to PO
    purchase_order_id UUID,                    -- Set when converted
    
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    deleted_at TIMESTAMPTZ
);

CREATE INDEX idx_pr_status ON inventory_purchase_requests(status);
CREATE INDEX idx_pr_requester ON inventory_purchase_requests(requested_by);
```

#### 4.3.2 `inventory_purchase_request_items`

```sql
CREATE TABLE inventory_purchase_request_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    purchase_request_id UUID NOT NULL REFERENCES inventory_purchase_requests(id),
    item_id UUID NOT NULL REFERENCES inventory_items(id),
    variant_id UUID REFERENCES inventory_item_variants(id),
    
    quantity INTEGER NOT NULL,
    estimated_unit_cost NUMERIC(12,2),
    estimated_total NUMERIC(14,2) GENERATED ALWAYS AS 
        (quantity * COALESCE(estimated_unit_cost, 0)) STORED,
    
    notes TEXT,
    
    CONSTRAINT positive_quantity CHECK (quantity > 0)
);

CREATE INDEX idx_pr_items_request ON inventory_purchase_request_items(purchase_request_id);
```

#### 4.3.3 `inventory_purchase_orders`

```sql
CREATE TABLE inventory_purchase_orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR(50) UNIQUE NOT NULL,          -- e.g., "PO-2026-0001"
    
    -- Source
    purchase_request_id UUID REFERENCES inventory_purchase_requests(id),
    supplier_id UUID NOT NULL REFERENCES inventory_suppliers(id),
    
    -- Dates
    order_date DATE NOT NULL DEFAULT CURRENT_DATE,
    expected_delivery_date DATE,
    
    -- Financial
    subtotal NUMERIC(14,2) NOT NULL DEFAULT 0,
    tax_pct NUMERIC(5,2) DEFAULT 0,
    tax_amount NUMERIC(14,2) DEFAULT 0,
    discount_amount NUMERIC(14,2) DEFAULT 0,
    total_amount NUMERIC(14,2) NOT NULL DEFAULT 0,
    
    -- Payment terms
    payment_terms_days INTEGER DEFAULT 30,
    
    -- Delivery
    delivery_address TEXT,
    
    -- Status
    status VARCHAR(20) NOT NULL DEFAULT 'draft',
    -- Values: draft/sent/partially_received/fully_received/cancelled/closed
    
    -- Receipt tracking
    received_quantity_total INTEGER DEFAULT 0,
    pending_quantity_total INTEGER DEFAULT 0,
    
    -- Approval (PO requires re-approval if amount > PR estimate by 10%)
    approval_request_id UUID REFERENCES approval_requests(id),
    
    notes TEXT,
    attachment_url VARCHAR(500),               -- Signed PO document
    created_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES users(id),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    deleted_at TIMESTAMPTZ
);

CREATE INDEX idx_po_supplier ON inventory_purchase_orders(supplier_id);
CREATE INDEX idx_po_status ON inventory_purchase_orders(status);
CREATE INDEX idx_po_dates ON inventory_purchase_orders(order_date, expected_delivery_date);
```

#### 4.3.4 `inventory_purchase_order_items`

```sql
CREATE TABLE inventory_purchase_order_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    purchase_order_id UUID NOT NULL REFERENCES inventory_purchase_orders(id),
    item_id UUID NOT NULL REFERENCES inventory_items(id),
    variant_id UUID REFERENCES inventory_item_variants(id),
    
    -- Quantities
    ordered_quantity INTEGER NOT NULL,
    received_quantity INTEGER DEFAULT 0,
    pending_quantity INTEGER GENERATED ALWAYS AS 
        (ordered_quantity - received_quantity) STORED,
    
    -- Pricing (per item)
    unit_cost NUMERIC(12,2) NOT NULL,
    line_total NUMERIC(14,2) GENERATED ALWAYS AS 
        (ordered_quantity * unit_cost) STORED,
    
    notes TEXT,
    
    CONSTRAINT positive_ordered CHECK (ordered_quantity > 0),
    CONSTRAINT received_within_ordered CHECK (received_quantity <= ordered_quantity)
);

CREATE INDEX idx_po_items_po ON inventory_purchase_order_items(purchase_order_id);
CREATE INDEX idx_po_items_item ON inventory_purchase_order_items(item_id);
```

#### 4.3.5 `inventory_goods_receipts`

```sql
CREATE TABLE inventory_goods_receipts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR(50) UNIQUE NOT NULL,          -- e.g., "GR-2026-0001"
    
    -- Source
    purchase_order_id UUID NOT NULL REFERENCES inventory_purchase_orders(id),
    supplier_id UUID NOT NULL REFERENCES inventory_suppliers(id),
    
    -- Receipt details
    receipt_date DATE NOT NULL DEFAULT CURRENT_DATE,
    received_by UUID NOT NULL REFERENCES users(id),
    supplier_invoice_number VARCHAR(100),
    supplier_invoice_date DATE,
    
    -- Financial
    invoice_subtotal NUMERIC(14,2),
    invoice_tax_amount NUMERIC(14,2) DEFAULT 0,
    invoice_total NUMERIC(14,2),
    
    -- Status
    status VARCHAR(20) NOT NULL DEFAULT 'pending_approval',
    -- Values: pending_approval/approved/posted/disputed/cancelled
    
    -- Quality check
    quality_check_passed BOOLEAN,
    quality_notes TEXT,
    
    -- Approval (for invoice payment)
    approval_request_id UUID REFERENCES approval_requests(id),
    
    -- Payment
    payment_id UUID,                           -- Reference to cashier payment
    payment_date DATE,
    
    -- Documents
    invoice_attachment_url VARCHAR(500),
    delivery_note_url VARCHAR(500),
    
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    deleted_at TIMESTAMPTZ
);

CREATE INDEX idx_gr_po ON inventory_goods_receipts(purchase_order_id);
CREATE INDEX idx_gr_supplier ON inventory_goods_receipts(supplier_id);
CREATE INDEX idx_gr_status ON inventory_goods_receipts(status);
CREATE INDEX idx_gr_date ON inventory_goods_receipts(receipt_date);
```

#### 4.3.6 `inventory_goods_receipt_items`

```sql
CREATE TABLE inventory_goods_receipt_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    goods_receipt_id UUID NOT NULL REFERENCES inventory_goods_receipts(id),
    purchase_order_item_id UUID NOT NULL REFERENCES inventory_purchase_order_items(id),
    item_id UUID NOT NULL REFERENCES inventory_items(id),
    variant_id UUID REFERENCES inventory_item_variants(id),
    
    -- Quantities
    expected_quantity INTEGER NOT NULL,        -- From PO
    received_quantity INTEGER NOT NULL,        -- Actually received
    accepted_quantity INTEGER NOT NULL,        -- Passed quality check
    rejected_quantity INTEGER DEFAULT 0,
    
    -- Pricing (from invoice, may differ from PO)
    unit_cost NUMERIC(12,2) NOT NULL,
    line_total NUMERIC(14,2) GENERATED ALWAYS AS 
        (accepted_quantity * unit_cost) STORED,
    
    -- Created lot reference (when posted)
    stock_lot_id UUID REFERENCES inventory_stock_lots(id),
    
    -- Quality
    quality_passed BOOLEAN DEFAULT TRUE,
    rejection_reason TEXT,
    
    notes TEXT,
    
    CONSTRAINT received_positive CHECK (received_quantity >= 0),
    CONSTRAINT accepted_within_received CHECK (accepted_quantity <= received_quantity)
);

CREATE INDEX idx_gr_items_gr ON inventory_goods_receipt_items(goods_receipt_id);
CREATE INDEX idx_gr_items_po_item ON inventory_goods_receipt_items(purchase_order_item_id);
```

### 4.4 Issue & Sale Tables

#### 4.4.1 `inventory_issues` (Both Sales and Consumption)

```sql
CREATE TABLE inventory_issues (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR(50) UNIQUE NOT NULL,          -- e.g., "ISS-2026-0001"
    
    -- ⭐ CRITICAL: Issue type
    issue_type VARCHAR(20) NOT NULL,           -- 'sale_to_student' / 'consumption'
    
    -- For sales (sale_to_student)
    student_id UUID REFERENCES students(id),
    payment_status VARCHAR(20),                -- 'paid' / 'unpaid_approved'
    receipt_id UUID,                           -- From cashier
    
    -- For consumption (consumption)
    consuming_department VARCHAR(100),
    consuming_employee_id UUID REFERENCES employees(id),  -- Person who took it
    consumption_purpose TEXT,
    
    -- Financial summary
    subtotal NUMERIC(14,2) NOT NULL DEFAULT 0,
    discount_amount NUMERIC(14,2) DEFAULT 0,
    total_amount NUMERIC(14,2) NOT NULL DEFAULT 0,
    total_cost NUMERIC(14,2) NOT NULL DEFAULT 0,  -- COGS
    profit_amount NUMERIC(14,2) GENERATED ALWAYS AS 
        (total_amount - total_cost) STORED,    -- For sales only
    
    -- Approval (only for unpaid sales or special cases)
    approval_request_id UUID REFERENCES approval_requests(id),
    approved_by UUID REFERENCES users(id),
    
    -- Status
    status VARCHAR(20) NOT NULL DEFAULT 'draft',
    -- Values: draft/pending_payment/pending_approval/completed/cancelled/returned
    
    -- Issuance
    issue_date TIMESTAMPTZ DEFAULT NOW(),
    issued_by UUID REFERENCES users(id),
    
    -- Journal entry reference
    journal_entry_id UUID,
    
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    deleted_at TIMESTAMPTZ,
    
    CONSTRAINT valid_issue_type CHECK (issue_type IN ('sale_to_student', 'consumption')),
    CONSTRAINT sale_must_have_student CHECK (
        issue_type != 'sale_to_student' OR student_id IS NOT NULL
    ),
    CONSTRAINT consumption_no_student CHECK (
        issue_type != 'consumption' OR student_id IS NULL
    ),
    CONSTRAINT consumption_must_have_department CHECK (
        issue_type != 'consumption' OR consuming_department IS NOT NULL
    )
);

CREATE INDEX idx_issues_type ON inventory_issues(issue_type);
CREATE INDEX idx_issues_student ON inventory_issues(student_id) WHERE student_id IS NOT NULL;
CREATE INDEX idx_issues_department ON inventory_issues(consuming_department) 
    WHERE consuming_department IS NOT NULL;
CREATE INDEX idx_issues_status ON inventory_issues(status);
CREATE INDEX idx_issues_date ON inventory_issues(issue_date);
```

#### 4.4.2 `inventory_issue_items` (FIFO consumption tracking)

```sql
CREATE TABLE inventory_issue_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    issue_id UUID NOT NULL REFERENCES inventory_issues(id),
    item_id UUID NOT NULL REFERENCES inventory_items(id),
    variant_id UUID REFERENCES inventory_item_variants(id),
    
    quantity INTEGER NOT NULL,
    
    -- Pricing
    unit_sale_price NUMERIC(12,2),             -- NULL for consumption
    unit_cost_calculated NUMERIC(12,2) NOT NULL,  -- Average from FIFO consumption
    
    line_total_sale NUMERIC(14,2) GENERATED ALWAYS AS 
        (quantity * COALESCE(unit_sale_price, 0)) STORED,
    line_total_cost NUMERIC(14,2) GENERATED ALWAYS AS 
        (quantity * unit_cost_calculated) STORED,
    
    notes TEXT,
    
    CONSTRAINT positive_quantity CHECK (quantity > 0)
);

CREATE INDEX idx_issue_items_issue ON inventory_issue_items(issue_id);
CREATE INDEX idx_issue_items_item ON inventory_issue_items(item_id);
```

#### 4.4.3 `inventory_issue_lot_consumption` (Detailed FIFO trail)

This table tracks **exactly which lots** were consumed for each issue line. Critical for accurate FIFO and audit.

```sql
CREATE TABLE inventory_issue_lot_consumption (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    issue_item_id UUID NOT NULL REFERENCES inventory_issue_items(id),
    stock_lot_id UUID NOT NULL REFERENCES inventory_stock_lots(id),
    
    quantity_consumed INTEGER NOT NULL,
    cost_per_unit NUMERIC(12,2) NOT NULL,      -- Snapshot from lot
    total_cost NUMERIC(14,2) GENERATED ALWAYS AS 
        (quantity_consumed * cost_per_unit) STORED,
    
    consumed_at TIMESTAMPTZ DEFAULT NOW(),
    
    CONSTRAINT positive_consumed CHECK (quantity_consumed > 0)
);

CREATE INDEX idx_lot_consumption_issue_item ON inventory_issue_lot_consumption(issue_item_id);
CREATE INDEX idx_lot_consumption_lot ON inventory_issue_lot_consumption(stock_lot_id);
```

### 4.5 Returns Tables

#### 4.5.1 `inventory_returns`

```sql
CREATE TABLE inventory_returns (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR(50) UNIQUE NOT NULL,          -- e.g., "RET-2026-0001"
    
    -- ⭐ Return type
    return_type VARCHAR(20) NOT NULL,
    -- Values: 'from_student' / 'to_supplier'
    
    -- For student returns
    student_id UUID REFERENCES students(id),
    original_issue_id UUID REFERENCES inventory_issues(id),
    
    -- For supplier returns
    supplier_id UUID REFERENCES inventory_suppliers(id),
    original_goods_receipt_id UUID REFERENCES inventory_goods_receipts(id),
    
    -- Common
    return_date DATE NOT NULL DEFAULT CURRENT_DATE,
    return_reason TEXT NOT NULL,
    return_reason_category VARCHAR(50),
    -- Values: 'wrong_size' / 'defective' / 'student_withdrew' / 'wrong_item' / 'other'
    
    -- Financial impact
    refund_amount NUMERIC(14,2),               -- For student returns (cash/credit)
    credit_to_supplier NUMERIC(14,2),          -- For supplier returns
    refund_method VARCHAR(20),
    -- Values: 'cash' / 'credit_balance' / 'replacement' / 'invoice_credit'
    
    replacement_issue_id UUID REFERENCES inventory_issues(id),  -- If exchanged
    
    -- Status
    status VARCHAR(20) NOT NULL DEFAULT 'pending_approval',
    -- Values: pending_approval/approved/processed/rejected/cancelled
    
    -- Approval
    approval_request_id UUID REFERENCES approval_requests(id),
    approved_by UUID REFERENCES users(id),
    
    -- Stock impact
    items_returned_to_stock BOOLEAN DEFAULT TRUE,  -- False if defective/disposed
    
    -- Documents
    journal_entry_id UUID,
    
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES users(id),
    processed_at TIMESTAMPTZ,
    processed_by UUID REFERENCES users(id),
    deleted_at TIMESTAMPTZ,
    
    CONSTRAINT valid_return_type CHECK (return_type IN ('from_student', 'to_supplier')),
    CONSTRAINT student_return_must_have_student CHECK (
        return_type != 'from_student' OR (student_id IS NOT NULL AND original_issue_id IS NOT NULL)
    ),
    CONSTRAINT supplier_return_must_have_supplier CHECK (
        return_type != 'to_supplier' OR (supplier_id IS NOT NULL AND original_goods_receipt_id IS NOT NULL)
    )
);

CREATE INDEX idx_returns_type ON inventory_returns(return_type);
CREATE INDEX idx_returns_student ON inventory_returns(student_id) WHERE student_id IS NOT NULL;
CREATE INDEX idx_returns_supplier ON inventory_returns(supplier_id) WHERE supplier_id IS NOT NULL;
CREATE INDEX idx_returns_status ON inventory_returns(status);
```

#### 4.5.2 `inventory_return_items`

```sql
CREATE TABLE inventory_return_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    return_id UUID NOT NULL REFERENCES inventory_returns(id),
    item_id UUID NOT NULL REFERENCES inventory_items(id),
    variant_id UUID REFERENCES inventory_item_variants(id),
    
    -- Quantity returned
    quantity INTEGER NOT NULL,
    
    -- For student returns: original sale price for refund calculation
    original_unit_sale_price NUMERIC(12,2),
    refund_unit_amount NUMERIC(12,2),          -- May be less than original (e.g., used)
    line_refund_total NUMERIC(14,2) GENERATED ALWAYS AS 
        (quantity * COALESCE(refund_unit_amount, 0)) STORED,
    
    -- Cost recovery (for inventory adjustment)
    unit_cost_recovered NUMERIC(12,2),         -- FIFO cost for stock return
    
    -- Condition
    item_condition VARCHAR(20) DEFAULT 'good',
    -- Values: 'good' / 'used_acceptable' / 'damaged' / 'unusable'
    
    -- Disposition
    return_to_stock BOOLEAN DEFAULT TRUE,      -- False if dispose
    
    notes TEXT,
    
    CONSTRAINT positive_quantity CHECK (quantity > 0)
);

CREATE INDEX idx_return_items_return ON inventory_return_items(return_id);
CREATE INDEX idx_return_items_item ON inventory_return_items(item_id);
```

### 4.6 Stock Take Tables

#### 4.6.1 `inventory_stock_takes`

```sql
CREATE TABLE inventory_stock_takes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR(50) UNIQUE NOT NULL,          -- e.g., "ST-2026-0001"
    
    -- Type
    stock_take_type VARCHAR(20) NOT NULL,
    -- Values: 'annual' / 'cyclical' / 'spot_check' / 'investigation'
    
    -- Scope
    scope VARCHAR(20) NOT NULL,
    -- Values: 'all_items' / 'category' / 'section' / 'specific_items'
    category_id UUID REFERENCES inventory_categories(id),  -- If scope=category
    section_id UUID REFERENCES inventory_sections(id),      -- If scope=section
    
    -- Period
    planned_date DATE NOT NULL,
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    
    -- Committee (⭐ SoD enforced)
    warehouse_manager_id UUID NOT NULL REFERENCES users(id),  -- Counts quantities only
    accountant_id UUID NOT NULL REFERENCES users(id),         -- Sees prices, finalizes
    
    -- Status
    status VARCHAR(20) NOT NULL DEFAULT 'planned',
    -- Values: planned/in_progress/quantities_counted/prices_assigned/pending_approval/finalized/cancelled
    
    -- Counts summary
    total_items_planned INTEGER DEFAULT 0,
    total_items_counted INTEGER DEFAULT 0,
    items_with_variance INTEGER DEFAULT 0,
    
    -- Financial summary (visible to accountant only until finalized)
    total_value_expected NUMERIC(14,2),
    total_value_actual NUMERIC(14,2),
    total_variance_value NUMERIC(14,2),
    
    -- Approval (for variance adjustments)
    approval_request_id UUID REFERENCES approval_requests(id),
    
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES users(id),
    deleted_at TIMESTAMPTZ,
    
    CONSTRAINT different_committee_members CHECK (warehouse_manager_id != accountant_id)
);

CREATE INDEX idx_stock_takes_status ON inventory_stock_takes(status);
CREATE INDEX idx_stock_takes_date ON inventory_stock_takes(planned_date);
```

#### 4.6.2 `inventory_stock_take_items`

```sql
CREATE TABLE inventory_stock_take_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    stock_take_id UUID NOT NULL REFERENCES inventory_stock_takes(id),
    item_id UUID NOT NULL REFERENCES inventory_items(id),
    variant_id UUID REFERENCES inventory_item_variants(id),
    
    -- ⭐ Counted by warehouse manager (sees only quantities)
    expected_quantity INTEGER NOT NULL,        -- From system
    counted_quantity INTEGER,                  -- Actual count
    quantity_variance INTEGER GENERATED ALWAYS AS 
        (COALESCE(counted_quantity, 0) - expected_quantity) STORED,
    counted_at TIMESTAMPTZ,
    counted_by UUID REFERENCES users(id),
    count_notes TEXT,
    
    -- ⭐ Reviewed by accountant (sees prices)
    cost_per_unit_at_count NUMERIC(12,2),      -- Snapshot from FIFO at count time
    expected_value NUMERIC(14,2),              -- expected_qty × cost
    actual_value NUMERIC(14,2),                -- counted_qty × cost
    variance_value NUMERIC(14,2),
    accountant_notes TEXT,
    accountant_reviewed_at TIMESTAMPTZ,
    
    -- Resolution
    requires_adjustment BOOLEAN DEFAULT FALSE,
    adjustment_id UUID REFERENCES inventory_stock_adjustments(id),
    
    UNIQUE(stock_take_id, item_id, variant_id)
);

CREATE INDEX idx_st_items_stocktake ON inventory_stock_take_items(stock_take_id);
CREATE INDEX idx_st_items_variance ON inventory_stock_take_items(stock_take_id) 
    WHERE quantity_variance != 0;
```

#### 4.6.3 `inventory_stock_adjustments`

```sql
CREATE TABLE inventory_stock_adjustments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR(50) UNIQUE NOT NULL,          -- e.g., "ADJ-2026-0001"
    
    -- Source
    stock_take_id UUID REFERENCES inventory_stock_takes(id),  -- If from stock take
    adjustment_type VARCHAR(30) NOT NULL,
    -- Values: stock_take_variance / damage / loss / theft / discovery / correction
    
    -- Date
    adjustment_date DATE NOT NULL DEFAULT CURRENT_DATE,
    
    -- Financial impact
    total_value_change NUMERIC(14,2) NOT NULL,  -- + or -
    direction VARCHAR(10) NOT NULL,             -- 'increase' / 'decrease'
    
    -- Reason
    reason TEXT NOT NULL,
    
    -- Approval (mandatory)
    approval_request_id UUID NOT NULL REFERENCES approval_requests(id),
    approved_by UUID REFERENCES users(id),
    approved_at TIMESTAMPTZ,
    
    -- Status
    status VARCHAR(20) NOT NULL DEFAULT 'pending_approval',
    -- Values: pending_approval/approved/posted/rejected
    
    -- Accounting
    journal_entry_id UUID,
    
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES users(id)
);

CREATE INDEX idx_adjustments_type ON inventory_stock_adjustments(adjustment_type);
CREATE INDEX idx_adjustments_status ON inventory_stock_adjustments(status);
CREATE INDEX idx_adjustments_date ON inventory_stock_adjustments(adjustment_date);
```

#### 4.6.4 `inventory_stock_adjustment_items`

```sql
CREATE TABLE inventory_stock_adjustment_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    adjustment_id UUID NOT NULL REFERENCES inventory_stock_adjustments(id),
    item_id UUID NOT NULL REFERENCES inventory_items(id),
    variant_id UUID REFERENCES inventory_item_variants(id),
    
    -- Adjustment details
    quantity_change INTEGER NOT NULL,           -- + (add) or - (remove)
    cost_per_unit NUMERIC(12,2) NOT NULL,
    total_value_change NUMERIC(14,2) GENERATED ALWAYS AS 
        (quantity_change * cost_per_unit) STORED,
    
    -- For decreases: which lots were affected (FIFO)
    affected_lots JSONB DEFAULT '[]'::JSONB,
    -- Format: [{"lot_id": "uuid", "quantity": 10, "cost": 50.00}]
    
    -- For increases: new lot created
    new_lot_id UUID REFERENCES inventory_stock_lots(id),
    
    notes TEXT
);

CREATE INDEX idx_adj_items_adj ON inventory_stock_adjustment_items(adjustment_id);
CREATE INDEX idx_adj_items_item ON inventory_stock_adjustment_items(item_id);
```

---

## 5. Engines & Services

### 5.1 FIFO Cost Engine

The heart of cost calculation. Handles consumption from oldest lots first.

```python
from decimal import Decimal, ROUND_HALF_UP
from dataclasses import dataclass
from typing import List
from uuid import UUID


@dataclass
class LotConsumption:
    """Result of consuming from a single lot."""
    lot_id: UUID
    quantity_consumed: int
    cost_per_unit: Decimal
    total_cost: Decimal


@dataclass
class FifoConsumptionResult:
    """Result of FIFO consumption."""
    item_id: UUID
    variant_id: UUID
    total_quantity_requested: int
    total_quantity_fulfilled: int
    total_cost: Decimal
    average_cost_per_unit: Decimal
    lot_consumptions: List[LotConsumption]
    is_partial: bool  # True if not enough stock
    remaining_quantity_needed: int


class FifoCostEngine:
    """
    Implements FIFO cost calculation for inventory consumption.
    
    Always consumes from oldest available lots first.
    """
    
    def consume_stock(
        self,
        item_id: UUID,
        variant_id: UUID,
        quantity_to_consume: int,
        consumption_context: dict,
    ) -> FifoConsumptionResult:
        """
        Consume stock using FIFO method.
        
        Returns detailed breakdown of which lots were used.
        """
        # 1. Get available lots, oldest first
        available_lots = self._get_available_lots(item_id, variant_id)
        
        if not available_lots:
            return FifoConsumptionResult(
                item_id=item_id,
                variant_id=variant_id,
                total_quantity_requested=quantity_to_consume,
                total_quantity_fulfilled=0,
                total_cost=Decimal('0'),
                average_cost_per_unit=Decimal('0'),
                lot_consumptions=[],
                is_partial=True,
                remaining_quantity_needed=quantity_to_consume,
            )
        
        # 2. Consume from lots
        remaining = quantity_to_consume
        consumptions = []
        total_cost = Decimal('0')
        
        for lot in available_lots:
            if remaining <= 0:
                break
            
            consume_qty = min(remaining, lot.available_quantity)
            cost = consume_qty * lot.cost_per_unit
            
            # Record consumption
            consumptions.append(LotConsumption(
                lot_id=lot.id,
                quantity_consumed=consume_qty,
                cost_per_unit=lot.cost_per_unit,
                total_cost=cost,
            ))
            
            # Update lot in DB
            self._update_lot_consumption(lot.id, consume_qty)
            
            total_cost += cost
            remaining -= consume_qty
        
        # 3. Calculate metrics
        fulfilled = quantity_to_consume - remaining
        avg_cost = (total_cost / fulfilled).quantize(Decimal('0.01')) if fulfilled > 0 else Decimal('0')
        
        # 4. Update aggregate stock level
        self._update_stock_level(item_id, variant_id)
        
        return FifoConsumptionResult(
            item_id=item_id,
            variant_id=variant_id,
            total_quantity_requested=quantity_to_consume,
            total_quantity_fulfilled=fulfilled,
            total_cost=total_cost,
            average_cost_per_unit=avg_cost,
            lot_consumptions=consumptions,
            is_partial=(remaining > 0),
            remaining_quantity_needed=remaining,
        )
    
    def _get_available_lots(self, item_id: UUID, variant_id: UUID) -> List:
        """Get lots ordered by FIFO (oldest first)."""
        return InventoryStockLot.objects.filter(
            item_id=item_id,
            variant_id=variant_id,
            status='active',
        ).filter(
            received_quantity__gt=models.F('consumed_quantity')
        ).order_by('received_at', 'id')  # FIFO order
    
    def _update_lot_consumption(self, lot_id: UUID, quantity: int):
        """Update lot's consumed quantity."""
        InventoryStockLot.objects.filter(id=lot_id).update(
            consumed_quantity=models.F('consumed_quantity') + quantity,
            status=Case(
                When(
                    consumed_quantity__gte=models.F('received_quantity') - quantity,
                    then=Value('depleted')
                ),
                default=Value('active'),
            ),
        )
    
    def _update_stock_level(self, item_id: UUID, variant_id: UUID):
        """Recalculate aggregated stock level."""
        result = InventoryStockLot.objects.filter(
            item_id=item_id,
            variant_id=variant_id,
            status='active',
        ).aggregate(
            total=models.Sum(models.F('received_quantity') - models.F('consumed_quantity')),
            value=models.Sum(
                (models.F('received_quantity') - models.F('consumed_quantity')) * 
                models.F('cost_per_unit')
            ),
        )
        
        total_qty = result['total'] or 0
        total_value = result['value'] or Decimal('0')
        avg_cost = (total_value / total_qty).quantize(Decimal('0.01')) if total_qty > 0 else Decimal('0')
        
        InventoryStockLevel.objects.update_or_create(
            item_id=item_id,
            variant_id=variant_id,
            defaults={
                'total_quantity': total_qty,
                'total_value': total_value,
                'average_cost_per_unit': avg_cost,
                'last_issued_at': timezone.now(),
            }
        )
    
    def reverse_consumption(self, lot_consumptions: List[LotConsumption]):
        """
        Reverse consumption (e.g., when issue is cancelled or returned).
        Adds quantities back to lots.
        """
        for consumption in lot_consumptions:
            InventoryStockLot.objects.filter(id=consumption.lot_id).update(
                consumed_quantity=models.F('consumed_quantity') - consumption.quantity_consumed,
                status='active',  # Reactivate if was depleted
            )
```

### 5.2 Sale to Student Service

Handles the complete sale flow with payment verification.

```python
class StudentSaleService:
    """
    Handles sales of inventory items to students.
    
    Includes payment verification, FIFO cost calculation,
    receipt generation, and accounting entries.
    """
    
    def __init__(
        self,
        fifo_engine: FifoCostEngine,
        students_service,
        cashier_service,
        accounting_service,
        workflow_service,
    ):
        self.fifo = fifo_engine
        self.students = students_service
        self.cashier = cashier_service
        self.accounting = accounting_service
        self.workflow = workflow_service
    
    @transaction.atomic
    def create_sale(
        self,
        student_id: UUID,
        items: list,  # [{item_id, variant_id, quantity}]
        issued_by: UUID,
        payment_method: str = 'cash',
        skip_payment_check: bool = False,
    ) -> InventoryIssue:
        """
        Create sale to student with full validation and processing.
        """
        # 1. Validate student
        student = self.students.get_by_id(student_id)
        if not student or student.status != 'active':
            raise ValueError("Student not active")
        
        # 2. Validate items are sale-type
        for line in items:
            item = InventoryItem.objects.get(id=line['item_id'])
            if item.item_type != 'sale':
                raise ValueError(f"Item {item.code} is not for sale")
            if item.sale_price is None:
                raise ValueError(f"Item {item.code} has no sale price set")
        
        # 3. Calculate totals
        subtotal = Decimal('0')
        for line in items:
            item = InventoryItem.objects.get(id=line['item_id'])
            variant_price = self._get_variant_price(item, line.get('variant_id'))
            line_total = variant_price * line['quantity']
            subtotal += line_total
            line['unit_price'] = variant_price
            line['line_total'] = line_total
        
        # 4. Check student payment status
        payment_status = self.students.get_payment_status(student_id)
        
        if not payment_status.is_current and not skip_payment_check:
            # Trigger workflow for unpaid student
            workflow_request = self.workflow.submit_request(
                workflow_type_code='inventory_issue_unpaid',
                entity_type='inventory_issue',
                entity_id=None,  # Will be set after creation
                payload={
                    'student_id': str(student_id),
                    'items': items,
                    'total_value': str(subtotal),
                    'outstanding_balance': str(payment_status.outstanding),
                },
                requester_id=issued_by,
            )
            
            # Create issue in pending state
            issue = InventoryIssue.objects.create(
                code=generate_code('ISS'),
                issue_type='sale_to_student',
                student_id=student_id,
                payment_status='pending_approval',
                subtotal=subtotal,
                total_amount=subtotal,
                approval_request_id=workflow_request.id,
                status='pending_approval',
                issued_by=issued_by,
            )
            
            return issue  # Wait for approval before fulfilling
        
        # 5. Create receipt in cashier (if payment method is cash)
        receipt = None
        if payment_method == 'cash':
            receipt = self.cashier.create_receipt(
                amount=subtotal,
                received_from=f"Student: {student.full_name}",
                description=f"Inventory sale: {len(items)} items",
                payment_for='inventory_sale',
                paid_by_id=student_id,
            )
        elif payment_method == 'add_to_invoice':
            # Add to student's invoice/receivables
            self.students.add_to_receivables(
                student_id=student_id,
                amount=subtotal,
                description=f"Inventory items",
            )
        
        # 6. Create issue
        issue = InventoryIssue.objects.create(
            code=generate_code('ISS'),
            issue_type='sale_to_student',
            student_id=student_id,
            payment_status='paid',
            receipt_id=receipt.id if receipt else None,
            subtotal=subtotal,
            total_amount=subtotal,
            status='completed',
            issue_date=timezone.now(),
            issued_by=issued_by,
        )
        
        # 7. Process each item: FIFO consumption + line creation
        total_cost = Decimal('0')
        for line in items:
            issue_item = InventoryIssueItem.objects.create(
                issue_id=issue.id,
                item_id=line['item_id'],
                variant_id=line.get('variant_id'),
                quantity=line['quantity'],
                unit_sale_price=line['unit_price'],
            )
            
            # FIFO consumption
            consumption_result = self.fifo.consume_stock(
                item_id=line['item_id'],
                variant_id=line.get('variant_id'),
                quantity_to_consume=line['quantity'],
                consumption_context={'issue_id': issue.id},
            )
            
            if consumption_result.is_partial:
                raise InsufficientStockError(
                    f"Item {line['item_id']}: requested {line['quantity']}, "
                    f"only {consumption_result.total_quantity_fulfilled} available"
                )
            
            # Update issue item with calculated cost
            issue_item.unit_cost_calculated = consumption_result.average_cost_per_unit
            issue_item.save()
            
            # Record lot consumption details
            for lot_consumption in consumption_result.lot_consumptions:
                InventoryIssueLotConsumption.objects.create(
                    issue_item_id=issue_item.id,
                    stock_lot_id=lot_consumption.lot_id,
                    quantity_consumed=lot_consumption.quantity_consumed,
                    cost_per_unit=lot_consumption.cost_per_unit,
                )
            
            total_cost += consumption_result.total_cost
        
        # 8. Update issue totals
        issue.total_cost = total_cost
        issue.save()
        
        # 9. Create accounting journal entry
        # Sale: DR Cash/Receivables | CR Revenue
        # COGS: DR COGS | CR Inventory
        journal = self._create_sale_journal_entry(issue, items, total_cost)
        issue.journal_entry_id = journal.id
        issue.save()
        
        # 10. Update student purchase history (signal)
        self.students.add_purchase_record(
            student_id=student_id,
            issue_id=issue.id,
            amount=subtotal,
            items_count=len(items),
        )
        
        # 11. Audit log
        audit_log.record(
            user_id=issued_by,
            action='inventory.sale_to_student',
            entity_type='inventory_issue',
            entity_id=issue.id,
            metadata={
                'student_id': str(student_id),
                'amount': str(subtotal),
                'cost': str(total_cost),
                'profit': str(subtotal - total_cost),
            }
        )
        
        return issue
    
    def _get_variant_price(self, item, variant_id):
        """Get effective price (variant override or item base)."""
        if variant_id:
            variant = InventoryItemVariant.objects.get(id=variant_id)
            if variant.sale_price_override:
                return variant.sale_price_override
        return item.sale_price
    
    def _create_sale_journal_entry(self, issue, items, total_cost):
        """Create journal entry for sale + COGS."""
        # Get accounts (different per category)
        first_item = InventoryItem.objects.get(id=items[0]['item_id'])
        category = first_item.category
        
        return self.accounting.create_journal_entry(
            date=issue.issue_date.date(),
            description=f"Inventory sale: {issue.code}",
            lines=[
                # Sale entries
                {
                    'account_code': '1100',  # Cash (or 1200 Receivables)
                    'description': f"Sale to {issue.student_id}",
                    'debit': issue.total_amount,
                    'credit': Decimal('0'),
                },
                {
                    'account_code': category.revenue_account_code,
                    'description': f"Inventory revenue: {category.name_en}",
                    'debit': Decimal('0'),
                    'credit': issue.total_amount,
                },
                # COGS entries
                {
                    'account_code': category.cogs_account_code,
                    'description': f"COGS: {category.name_en}",
                    'debit': total_cost,
                    'credit': Decimal('0'),
                },
                {
                    'account_code': category.inventory_account_code,
                    'description': f"Inventory reduction",
                    'debit': Decimal('0'),
                    'credit': total_cost,
                },
            ],
            reference_type='inventory_issue',
            reference_id=issue.id,
        )
```

### 5.3 Consumption Service (For Operational Items)

```python
class ConsumptionService:
    """
    Handles consumption of operational/consumable items.
    
    No payment, no student. Just expense recognition.
    """
    
    def __init__(self, fifo_engine, accounting_service):
        self.fifo = fifo_engine
        self.accounting = accounting_service
    
    @transaction.atomic
    def register_consumption(
        self,
        items: list,
        consuming_department: str,
        consuming_employee_id: UUID,
        purpose: str,
        issued_by: UUID,
    ) -> InventoryIssue:
        """Register consumption of operational items."""
        
        # 1. Validate items are consumable
        for line in items:
            item = InventoryItem.objects.get(id=line['item_id'])
            if item.item_type != 'consumable':
                raise ValueError(f"Item {item.code} is not consumable; use sale flow")
        
        # 2. Create issue
        issue = InventoryIssue.objects.create(
            code=generate_code('ISS'),
            issue_type='consumption',
            consuming_department=consuming_department,
            consuming_employee_id=consuming_employee_id,
            consumption_purpose=purpose,
            status='completed',
            issued_by=issued_by,
        )
        
        # 3. Process each item with FIFO
        total_cost = Decimal('0')
        for line in items:
            issue_item = InventoryIssueItem.objects.create(
                issue_id=issue.id,
                item_id=line['item_id'],
                variant_id=line.get('variant_id'),
                quantity=line['quantity'],
                unit_sale_price=None,  # No sale price for consumption
            )
            
            # FIFO consumption
            consumption = self.fifo.consume_stock(
                item_id=line['item_id'],
                variant_id=line.get('variant_id'),
                quantity_to_consume=line['quantity'],
                consumption_context={'issue_id': issue.id},
            )
            
            if consumption.is_partial:
                raise InsufficientStockError(...)
            
            issue_item.unit_cost_calculated = consumption.average_cost_per_unit
            issue_item.save()
            
            # Record lot consumption
            for lc in consumption.lot_consumptions:
                InventoryIssueLotConsumption.objects.create(
                    issue_item_id=issue_item.id,
                    stock_lot_id=lc.lot_id,
                    quantity_consumed=lc.quantity_consumed,
                    cost_per_unit=lc.cost_per_unit,
                )
            
            total_cost += consumption.total_cost
        
        # 4. Update totals
        issue.total_cost = total_cost
        issue.subtotal = Decimal('0')  # No revenue
        issue.total_amount = Decimal('0')
        issue.save()
        
        # 5. Create journal entry: DR Expense | CR Inventory
        first_item = InventoryItem.objects.get(id=items[0]['item_id'])
        category = first_item.category
        
        journal = self.accounting.create_journal_entry(
            date=issue.issue_date.date(),
            description=f"Consumption: {consuming_department} - {purpose}",
            lines=[
                {
                    'account_code': category.expense_account_code,
                    'description': f"Expense: {category.name_en} for {consuming_department}",
                    'debit': total_cost,
                    'credit': Decimal('0'),
                },
                {
                    'account_code': category.inventory_account_code,
                    'description': f"Inventory consumed",
                    'debit': Decimal('0'),
                    'credit': total_cost,
                },
            ],
            reference_type='inventory_issue',
            reference_id=issue.id,
        )
        
        issue.journal_entry_id = journal.id
        issue.save()
        
        return issue
```

### 5.4 Profitability Calculator

```python
class ProfitabilityCalculator:
    """Calculate profitability per item, per category, per period."""
    
    def calculate_item_profitability(
        self,
        item_id: UUID,
        period_from: date,
        period_to: date,
    ) -> dict:
        """Calculate profitability for a single item over a period."""
        
        # Sum all sales of this item in period
        sales = InventoryIssueItem.objects.filter(
            item_id=item_id,
            issue__issue_type='sale_to_student',
            issue__status='completed',
            issue__issue_date__gte=period_from,
            issue__issue_date__lte=period_to,
        ).aggregate(
            quantity=Sum('quantity'),
            revenue=Sum('line_total_sale'),
            cost=Sum('line_total_cost'),
        )
        
        # Subtract returns
        returns = InventoryReturnItem.objects.filter(
            item_id=item_id,
            return_obj__return_type='from_student',
            return_obj__status='processed',
            return_obj__return_date__gte=period_from,
            return_obj__return_date__lte=period_to,
        ).aggregate(
            quantity_returned=Sum('quantity'),
            refund_total=Sum('line_refund_total'),
        )
        
        net_quantity = (sales['quantity'] or 0) - (returns['quantity_returned'] or 0)
        net_revenue = (sales['revenue'] or Decimal('0')) - (returns['refund_total'] or Decimal('0'))
        net_cost = sales['cost'] or Decimal('0')  # Cost adjusted in returns
        
        gross_profit = net_revenue - net_cost
        margin_pct = (gross_profit / net_revenue * 100) if net_revenue > 0 else Decimal('0')
        
        return {
            'item_id': item_id,
            'period_from': period_from,
            'period_to': period_to,
            'units_sold_net': net_quantity,
            'revenue_net': net_revenue,
            'cost_total': net_cost,
            'gross_profit': gross_profit,
            'margin_pct': margin_pct.quantize(Decimal('0.01')),
        }
    
    def calculate_category_profitability(
        self,
        category_id: UUID,
        period_from: date,
        period_to: date,
    ) -> dict:
        """Aggregate profitability across all items in a category."""
        
        items = InventoryItem.objects.filter(
            category_id=category_id,
            item_type='sale',
        )
        
        breakdown = []
        total_revenue = Decimal('0')
        total_cost = Decimal('0')
        
        for item in items:
            item_data = self.calculate_item_profitability(item.id, period_from, period_to)
            if item_data['units_sold_net'] > 0:
                breakdown.append({
                    'item': item,
                    **item_data,
                })
                total_revenue += item_data['revenue_net']
                total_cost += item_data['cost_total']
        
        gross_profit = total_revenue - total_cost
        margin_pct = (gross_profit / total_revenue * 100) if total_revenue > 0 else Decimal('0')
        
        return {
            'category_id': category_id,
            'period_from': period_from,
            'period_to': period_to,
            'items_count': len(breakdown),
            'total_revenue': total_revenue,
            'total_cost': total_cost,
            'gross_profit': gross_profit,
            'margin_pct': margin_pct.quantize(Decimal('0.01')),
            'breakdown_by_item': breakdown,
        }
```

### 5.5 Stock Take Engine (with SoD)

```python
class StockTakeEngine:
    """
    Manages stock take process with strict SoD enforcement.
    
    Warehouse Manager: counts quantities (cannot see prices)
    Accountant: assigns prices, calculates variance value, finalizes
    """
    
    @transaction.atomic
    def initiate_stock_take(
        self,
        scope: str,
        scope_id: UUID,
        warehouse_manager_id: UUID,
        accountant_id: UUID,
        planned_date: date,
        initiated_by: UUID,
    ) -> InventoryStockTake:
        """Create new stock take with assigned committee."""
        
        # SoD validation
        if warehouse_manager_id == accountant_id:
            raise ValueError("Same person cannot be both committee members")
        
        # Verify roles
        wh_user = User.objects.get(id=warehouse_manager_id)
        acc_user = User.objects.get(id=accountant_id)
        
        if not has_role(wh_user, 'warehouse_manager'):
            raise ValueError("First member must be Warehouse Manager")
        if not has_role(acc_user, 'accountant') and not has_role(acc_user, 'chief_accountant'):
            raise ValueError("Second member must be Accountant or Chief Accountant")
        
        # Determine scope items
        items_to_count = self._get_items_for_scope(scope, scope_id)
        
        # Create stock take
        stock_take = InventoryStockTake.objects.create(
            code=generate_code('ST'),
            stock_take_type='annual' if scope == 'all_items' else 'cyclical',
            scope=scope,
            category_id=scope_id if scope == 'category' else None,
            section_id=scope_id if scope == 'section' else None,
            planned_date=planned_date,
            warehouse_manager_id=warehouse_manager_id,
            accountant_id=accountant_id,
            status='planned',
            total_items_planned=len(items_to_count),
            created_by=initiated_by,
        )
        
        # Snapshot expected quantities (and prices, but hidden from WH manager)
        for item in items_to_count:
            stock_level = self._get_stock_level(item)
            
            InventoryStockTakeItem.objects.create(
                stock_take_id=stock_take.id,
                item_id=item.id,
                variant_id=item.variant_id if hasattr(item, 'variant_id') else None,
                expected_quantity=stock_level.total_quantity,
                # Price snapshot for accountant - NOT visible to WH manager
                cost_per_unit_at_count=stock_level.average_cost_per_unit,
                expected_value=stock_level.total_value,
            )
        
        return stock_take
    
    def get_count_view_for_warehouse_manager(self, stock_take_id: UUID) -> list:
        """
        Returns items for WH manager - WITHOUT prices or values.
        
        ⭐ SoD: WH manager cannot see financial data.
        """
        items = InventoryStockTakeItem.objects.filter(
            stock_take_id=stock_take_id
        ).select_related('item', 'variant')
        
        return [
            {
                'id': item.id,
                'item_code': item.item.code,
                'item_name': item.item.name_ar,
                'variant_code': item.variant.code if item.variant else None,
                'variant_size': item.variant.size if item.variant else None,
                'expected_quantity': item.expected_quantity,
                'counted_quantity': item.counted_quantity,
                # ⭐ NO PRICES, NO VALUES
            }
            for item in items
        ]
    
    def get_count_view_for_accountant(self, stock_take_id: UUID) -> list:
        """Returns items for accountant - WITH prices and values."""
        items = InventoryStockTakeItem.objects.filter(
            stock_take_id=stock_take_id
        ).select_related('item', 'variant')
        
        return [
            {
                'id': item.id,
                'item_code': item.item.code,
                'item_name': item.item.name_ar,
                'expected_quantity': item.expected_quantity,
                'counted_quantity': item.counted_quantity,
                'variance': item.quantity_variance,
                # Financial data visible
                'cost_per_unit': item.cost_per_unit_at_count,
                'expected_value': item.expected_value,
                'actual_value': item.counted_quantity * item.cost_per_unit_at_count if item.counted_quantity else None,
                'variance_value': item.variance_value,
            }
            for item in items
        ]
    
    def submit_count(
        self,
        stock_take_item_id: UUID,
        counted_quantity: int,
        counted_by: UUID,
        notes: str = None,
    ) -> InventoryStockTakeItem:
        """Warehouse Manager submits count for an item."""
        item = InventoryStockTakeItem.objects.get(id=stock_take_item_id)
        
        # Verify counter is the assigned WH manager
        if counted_by != item.stock_take.warehouse_manager_id:
            raise PermissionError("Only assigned WH Manager can submit counts")
        
        item.counted_quantity = counted_quantity
        item.counted_at = timezone.now()
        item.counted_by = counted_by
        item.count_notes = notes
        item.save()
        
        return item
    
    @transaction.atomic
    def finalize_stock_take(
        self,
        stock_take_id: UUID,
        finalized_by: UUID,
    ):
        """
        Finalize stock take: create adjustment for variances.
        Only Accountant can finalize.
        """
        stock_take = InventoryStockTake.objects.get(id=stock_take_id)
        
        if finalized_by != stock_take.accountant_id:
            raise PermissionError("Only assigned Accountant can finalize")
        
        # Calculate variance values (now accountant has prices)
        items_with_variance = []
        total_variance_value = Decimal('0')
        
        for st_item in stock_take.items.filter(quantity_variance__ne=0):
            variance_value = st_item.quantity_variance * st_item.cost_per_unit_at_count
            st_item.variance_value = variance_value
            st_item.actual_value = st_item.counted_quantity * st_item.cost_per_unit_at_count
            st_item.requires_adjustment = True
            st_item.save()
            
            items_with_variance.append(st_item)
            total_variance_value += variance_value
        
        # Update stock take totals
        stock_take.items_with_variance = len(items_with_variance)
        stock_take.total_variance_value = total_variance_value
        stock_take.status = 'pending_approval'
        stock_take.save()
        
        # Create adjustment with workflow approval
        if items_with_variance:
            adjustment = self._create_adjustment_from_stocktake(
                stock_take, items_with_variance, finalized_by
            )
        
        return stock_take
    
    def _create_adjustment_from_stocktake(
        self,
        stock_take: InventoryStockTake,
        variance_items: list,
        created_by: UUID,
    ):
        """Create stock adjustment for variances, requires approval."""
        
        # Determine workflow type based on total variance value
        abs_variance = abs(stock_take.total_variance_value)
        
        # Submit to workflow
        workflow_request = workflow_service.submit_request(
            workflow_type_code='inventory_adjustment',
            entity_type='inventory_stock_adjustment',
            entity_id=None,
            payload={
                'stock_take_id': str(stock_take.id),
                'total_variance_value': str(abs_variance),
                'items_count': len(variance_items),
                'direction': 'increase' if stock_take.total_variance_value > 0 else 'decrease',
            },
            requester_id=created_by,
        )
        
        # Create adjustment record
        adjustment = InventoryStockAdjustment.objects.create(
            code=generate_code('ADJ'),
            stock_take_id=stock_take.id,
            adjustment_type='stock_take_variance',
            adjustment_date=timezone.now().date(),
            total_value_change=abs_variance,
            direction='increase' if stock_take.total_variance_value > 0 else 'decrease',
            reason=f"Stock take variance from {stock_take.code}",
            approval_request_id=workflow_request.id,
            status='pending_approval',
            created_by=created_by,
        )
        
        # Create adjustment items
        for var_item in variance_items:
            InventoryStockAdjustmentItem.objects.create(
                adjustment_id=adjustment.id,
                item_id=var_item.item_id,
                variant_id=var_item.variant_id,
                quantity_change=var_item.quantity_variance,
                cost_per_unit=var_item.cost_per_unit_at_count,
            )
        
        return adjustment
```

### 5.6 Return Service

```python
class ReturnService:
    """Handles returns from students and to suppliers."""
    
    @transaction.atomic
    def process_student_return(
        self,
        original_issue_id: UUID,
        items_to_return: list,  # [{issue_item_id, quantity, condition, refund_amount}]
        return_reason: str,
        return_reason_category: str,
        refund_method: str,
        processed_by: UUID,
    ) -> InventoryReturn:
        """
        Process a return from student.
        
        Flow:
        1. Validate return is within policy
        2. Create return record
        3. Submit for approval
        4. On approval: refund + restock or dispose
        """
        # 1. Validate
        original_issue = InventoryIssue.objects.get(id=original_issue_id)
        if original_issue.issue_type != 'sale_to_student':
            raise ValueError("Can only return sale issues")
        
        # 2. Create return
        total_refund = sum(item['refund_amount'] for item in items_to_return)
        
        return_obj = InventoryReturn.objects.create(
            code=generate_code('RET'),
            return_type='from_student',
            student_id=original_issue.student_id,
            original_issue_id=original_issue_id,
            return_date=timezone.now().date(),
            return_reason=return_reason,
            return_reason_category=return_reason_category,
            refund_amount=total_refund,
            refund_method=refund_method,
            status='pending_approval',
            created_by=processed_by,
        )
        
        # 3. Create return items
        for item_data in items_to_return:
            InventoryReturnItem.objects.create(
                return_id=return_obj.id,
                item_id=item_data['item_id'],
                variant_id=item_data.get('variant_id'),
                quantity=item_data['quantity'],
                original_unit_sale_price=item_data['original_price'],
                refund_unit_amount=item_data['refund_amount'] / item_data['quantity'],
                item_condition=item_data['condition'],
                return_to_stock=item_data['condition'] in ('good', 'used_acceptable'),
            )
        
        # 4. Submit for approval
        workflow_request = workflow_service.submit_request(
            workflow_type_code='inventory_return_from_student',
            entity_type='inventory_return',
            entity_id=return_obj.id,
            payload={
                'student_id': str(original_issue.student_id),
                'total_refund': str(total_refund),
                'reason_category': return_reason_category,
                'items_count': len(items_to_return),
            },
            requester_id=processed_by,
        )
        
        return_obj.approval_request_id = workflow_request.id
        return_obj.save()
        
        return return_obj
    
    @transaction.atomic
    def execute_approved_return(self, return_id: UUID, executed_by: UUID):
        """Execute return after approval (called by workflow signal)."""
        return_obj = InventoryReturn.objects.get(id=return_id)
        
        if return_obj.status != 'approved':
            raise ValueError("Return not approved")
        
        # Process based on type
        if return_obj.return_type == 'from_student':
            self._execute_student_return(return_obj, executed_by)
        elif return_obj.return_type == 'to_supplier':
            self._execute_supplier_return(return_obj, executed_by)
    
    def _execute_student_return(self, return_obj, executed_by):
        """Execute approved student return."""
        
        # 1. Restock items (FIFO reverse - add back to original lots if known, else new lot)
        for ret_item in return_obj.items.all():
            if ret_item.return_to_stock:
                # Reverse FIFO - add back to lot or create new lot
                self._restock_returned_item(ret_item)
        
        # 2. Process refund
        if return_obj.refund_method == 'cash':
            cashier_service.create_disbursement(
                amount=return_obj.refund_amount,
                paid_to=f"Refund to student",
                description=f"Return: {return_obj.code}",
                reference_id=return_obj.id,
            )
        elif return_obj.refund_method == 'credit_balance':
            students_service.add_credit_balance(
                student_id=return_obj.student_id,
                amount=return_obj.refund_amount,
                description=f"Inventory return refund",
            )
        elif return_obj.refund_method == 'invoice_credit':
            students_service.reduce_receivables(
                student_id=return_obj.student_id,
                amount=return_obj.refund_amount,
                description=f"Inventory return refund",
            )
        
        # 3. Create reversal journal entry
        # Reverse: DR Revenue | CR Cash/Receivables
        # Reverse: DR Inventory | CR COGS (if items returned to stock)
        journal = self._create_return_journal_entry(return_obj)
        return_obj.journal_entry_id = journal.id
        
        # 4. Update status
        return_obj.status = 'processed'
        return_obj.processed_at = timezone.now()
        return_obj.processed_by = executed_by
        return_obj.save()
    
    def _restock_returned_item(self, ret_item):
        """Add returned item back to stock (creates new FIFO lot)."""
        if ret_item.unit_cost_recovered:
            cost = ret_item.unit_cost_recovered
        else:
            # Get current FIFO cost
            cost = self._get_current_avg_cost(ret_item.item_id, ret_item.variant_id)
        
        # Create new lot for returned item
        lot = InventoryStockLot.objects.create(
            code=generate_code('LOT'),
            item_id=ret_item.item_id,
            variant_id=ret_item.variant_id,
            received_quantity=ret_item.quantity,
            cost_per_unit=cost,
            received_at=timezone.now(),
            status='active',
            notes=f"Returned from student: {ret_item.return_id}",
        )
        
        # Update stock level
        fifo_engine._update_stock_level(ret_item.item_id, ret_item.variant_id)
```

---

## 6. Workflows Specifications

The Inventory Module uses several approval workflows. Most are documented in `07_APPROVAL_WORKFLOWS.md`. Here are the inventory-specific ones with their exact configurations:

### 6.1 Purchase Request Workflows

Per requirement: based on amount thresholds.

#### W-PR-1: No Approval (≤ 100 EGP)
- **Code:** `purchase_request_minimal`
- **Approver:** None (warehouse manager direct execution)
- **Auto-approved at submission**

#### W-PR-2: Chief Accountant Approval (101-1000 EGP)
- **Code:** `purchase_request_small`
- **Step 1:** Chief Accountant (timeout: 24h)

#### W-PR-3: Principal Approval (> 1000 EGP)
- **Code:** `purchase_request_large`
- **Step 1:** Chief Accountant (timeout: 24h)
- **Step 2:** Principal (timeout: 48h)

### 6.2 Item Price Change Workflow

#### W-INV-1: Item Sale Price Change
- **Code:** `inventory_item_price_change`
- **Trigger:** Changing sale price of a sale-type item
- **Step 1:** Chief Accountant (timeout: 24h)
- **Step 2:** Principal if change > 20% from current price (timeout: 48h)

### 6.3 Issue to Unpaid Student

#### W-INV-2: Issue Without Payment Verification
- **Code:** `inventory_issue_unpaid`
- **Trigger:** Issuing items to student with outstanding balance
- **Step 1:** Accountant if value ≤ 500 EGP (timeout: 4h)
- **Step 2:** Chief Accountant if value > 500 EGP (timeout: 24h)

### 6.4 Return Workflows

#### W-INV-3: Return From Student
- **Code:** `inventory_return_from_student`
- **Trigger:** Student wants to return purchased items
- **Step 1:** Warehouse Manager (verify physical return) - 24h
- **Step 2:** Accountant if refund ≤ 500 EGP (24h)
- **Step 2 alternate:** Chief Accountant if refund > 500 EGP (48h)

#### W-INV-4: Return To Supplier
- **Code:** `inventory_return_to_supplier`
- **Trigger:** Defective items being returned to supplier
- **Step 1:** Warehouse Manager (verify defect) - 24h
- **Step 2:** Chief Accountant (approve credit/refund) - 48h

### 6.5 Stock Take Workflows

#### W-INV-5: Stock Adjustment from Stock Take
- **Code:** `inventory_adjustment`
- **Trigger:** Variance found during stock take
- **Step 1:** Chief Accountant if abs(variance) ≤ 1000 EGP (48h)
- **Step 2:** Principal if abs(variance) > 1000 EGP (5 days)

### 6.6 Write-off Workflow

#### W-INV-6: Inventory Write-off
- **Code:** `inventory_writeoff`
- **Trigger:** Damaged/obsolete items disposal
- **Step 1:** Warehouse Manager + Chief Accountant if value ≤ 500 (48h)
- **Step 2:** + Principal if value > 500 (5 days)

---

## 7. Default Configuration Values

All editable from admin UI:

| Configuration Key | Default | Purpose |
|---|---|---|
| `inventory.cost_method` | "FIFO" | Cost calculation method |
| `inventory.purchase_request_no_approval_limit` | 100.00 | Auto-approval threshold |
| `inventory.purchase_request_small_limit` | 1000.00 | Chief Accountant threshold |
| `inventory.price_change_significant_pct` | 20.00 | % triggering Principal approval |
| `inventory.unpaid_issue_small_limit` | 500.00 | Accountant approval limit |
| `inventory.return_period_days_uniforms` | 14 | Return window for uniforms |
| `inventory.return_period_days_books` | 7 | Return window for books |
| `inventory.return_used_item_pct` | 70.00 | Refund % for used acceptable items |
| `inventory.stock_take_variance_small_limit` | 1000.00 | Threshold for chief accountant |
| `inventory.low_stock_alert_enabled` | true | Send low stock alerts |
| `inventory.allow_negative_stock` | false | Prevent overselling |
| `inventory.require_supplier_invoice` | true | Receipt requires invoice |
| `inventory.allow_partial_receipt` | true | Receive partial PO quantities |
| `inventory.auto_create_pr_for_low_stock` | false | Auto PR generation |
| `inventory.uniform_exchange_within_days` | 30 | Exchange policy for uniforms |

---

## 8. Reports

### 8.1 Stock Levels Report

```
┌──────────────────────────────────────────────────────────────────┐
│  Stock Levels Report — As of May 2, 2026                         │
├──────────────────────────────────────────────────────────────────┤
│                                                                  │
│  Filter: [All Categories ▼] [Show Low Stock ☐] [Search...]      │
│                                                                  │
│  📚 BOOKS                                                        │
│  Item                          Stock   Value (EGP)    Min  Status│
│  ─────────────────────────────────────────────────────────────── │
│  Math Grade 5                  450     22,500.00     100   OK    │
│  Math Grade 6                   85      4,250.00     100   ⚠ LOW │
│  Arabic Grade 5                380     19,000.00     100   OK    │
│  ... (extends)                                                   │
│  Subtotal: 4,250 items, 212,500.00 EGP                           │
│                                                                  │
│  👕 UNIFORMS                                                     │
│  Item                          Stock   Value (EGP)    Min  Status│
│  ─────────────────────────────────────────────────────────────── │
│  Summer Boys Primary - Size M  120      9,600.00      30   OK    │
│  Summer Boys Primary - Size L   25      2,000.00      30   ⚠ LOW │
│  ... (extends)                                                   │
│  Subtotal: 2,180 items, 174,400.00 EGP                           │
│                                                                  │
│  ✏️ STATIONERY (Consumable)                                      │
│  Item                          Stock   Value (EGP)    Min  Status│
│  ─────────────────────────────────────────────────────────────── │
│  A4 Paper Ream                  45        675.00      20   OK    │
│  Whiteboard Marker              200       400.00      50   OK    │
│  ... (extends)                                                   │
│  Subtotal: 1,250 items, 8,500.00 EGP                             │
│                                                                  │
│  🧪 LAB SUPPLIES (Consumable)                                    │
│  ...                                                             │
│                                                                  │
│  ─────────────────────────────────────────────────────────────── │
│  TOTAL INVENTORY VALUE: 412,300.00 EGP                           │
│  Low Stock Alerts: 17 items                                      │
└──────────────────────────────────────────────────────────────────┘
```

### 8.2 Stock Movement Report

For each item:

```
┌──────────────────────────────────────────────────────────────────┐
│  Stock Movement: Math Book Grade 5                               │
│  Period: April 1 - May 2, 2026                                   │
├──────────────────────────────────────────────────────────────────┤
│                                                                  │
│  Date       Type          Reference   Qty In   Qty Out  Balance  │
│  ─────────────────────────────────────────────────────────────── │
│  Apr 1     (Opening)                                       500   │
│  Apr 5     Receipt        GR-2026-12   +100              600   │
│  Apr 7     Sale           ISS-2026-45            -25     575   │
│  Apr 8     Sale           ISS-2026-46            -15     560   │
│  Apr 12    Sale           ISS-2026-50            -30     530   │
│  Apr 15    Return         RET-2026-08    +5              535   │
│  Apr 20    Sale           ISS-2026-55            -50     485   │
│  ...                                                             │
│  May 2     (Closing)                                       450   │
│                                                                  │
│  Period Summary:                                                 │
│  Receipts: 100 units                                             │
│  Sales: 175 units (revenue: 17,500 EGP)                          │
│  Returns: 5 units                                                │
│  COGS: 8,750 EGP (FIFO)                                          │
│  Gross Profit: 8,750 EGP (50% margin)                            │
└──────────────────────────────────────────────────────────────────┘
```

### 8.3 Profitability Report

#### Per Category

```
┌──────────────────────────────────────────────────────────────────┐
│  Profitability Report — May 2026                                 │
├──────────────────────────────────────────────────────────────────┤
│                                                                  │
│  Category    Revenue     Cost (COGS)  Profit      Margin %       │
│  ─────────────────────────────────────────────────────────────── │
│  Books       125,500     78,500       47,000      37.4%          │
│  Uniforms     85,200     58,200       27,000      31.7%          │
│  ─────────────────────────────────────────────────────────────── │
│  TOTAL       210,700    136,700       74,000      35.1%          │
│                                                                  │
│  Note: Stationery & Lab Supplies are consumable (expense only)   │
│  Stationery Expense: 4,500 EGP                                   │
│  Lab Supplies Expense: 6,200 EGP                                 │
└──────────────────────────────────────────────────────────────────┘
```

#### Per Item (Top 10)

```
┌──────────────────────────────────────────────────────────────────┐
│  Top 10 Most Profitable Items — May 2026                         │
├──────────────────────────────────────────────────────────────────┤
│                                                                  │
│  Rank  Item              Units  Revenue   Cost    Profit  Margin │
│  ─────────────────────────────────────────────────────────────── │
│  1     Math Grade 5      175    17,500    8,750   8,750   50.0% │
│  2     Arabic Grade 5    180    16,200    8,100   8,100   50.0% │
│  3     Summer Uniform M   45    13,500    9,000   4,500   33.3% │
│  4     Math Grade 6      120    14,400    7,200   7,200   50.0% │
│  ...                                                             │
└──────────────────────────────────────────────────────────────────┘
```

### 8.4 Student Purchases Report

```
┌──────────────────────────────────────────────────────────────────┐
│  Student Purchase History: Ahmed Mohamed (Grade 5)               │
│  Academic Year: 2026-2027                                        │
├──────────────────────────────────────────────────────────────────┤
│                                                                  │
│  📚 Books Purchased:                                             │
│  Date      Item                Qty   Amount  Receipt             │
│  ─────────────────────────────────────────────────────────────── │
│  2026-09-05  Math Grade 5      1     100.00  REC-2026-1015       │
│  2026-09-05  Arabic Grade 5    1      90.00  REC-2026-1015       │
│  2026-09-05  Science Grade 5   1      85.00  REC-2026-1015       │
│  ...                                                             │
│  Subtotal: 12 books, 950.00 EGP                                  │
│                                                                  │
│  👕 Uniforms Purchased:                                          │
│  Date      Item                Qty   Amount  Receipt             │
│  ─────────────────────────────────────────────────────────────── │
│  2026-09-08  Summer Boys Pri-M 2     600.00  REC-2026-1042       │
│  2026-09-08  Sports Uniform-M  1     250.00  REC-2026-1042       │
│  ...                                                             │
│  Subtotal: 5 items, 1,200.00 EGP                                 │
│                                                                  │
│  📦 Returns:                                                     │
│  Date      Item                Qty   Refund  Reason              │
│  ─────────────────────────────────────────────────────────────── │
│  2026-09-15  Summer Boys Pri-M 1    -300.00  Wrong size          │
│                                                                  │
│  ─────────────────────────────────────────────────────────────── │
│  Total Net Purchases: 1,850.00 EGP                               │
│  Total Refunded: 300.00 EGP                                      │
│  Net Spend: 1,550.00 EGP                                         │
└──────────────────────────────────────────────────────────────────┘
```

### 8.5 Other Reports

- **Low Stock Alert Report** — Items below minimum
- **Suppliers Performance Report** — Rating, on-time delivery, quality issues
- **Stock Take Variance Report** — Discrepancies and adjustments
- **Inventory Aging Report** — Old stock that hasn't moved
- **Purchase Request Status Report** — Pending/approved/converted
- **Inventory Valuation Report** — Total value for accounting/budget

---

## 9. UI Mockups

### 9.1 Inventory Dashboard

```
┌──────────────────────────────────────────────────────────────────┐
│  Inventory Dashboard                              May 2, 2026    │
├──────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌─────────────┬─────────────┬─────────────┬─────────────┐      │
│  │ Total       │ Items       │ Pending     │ Low Stock    │      │
│  │ Value       │ Count       │ Receipts    │ Alerts       │      │
│  │             │             │             │              │      │
│  │ 412,300 EGP │   2,180     │     5       │    17        │      │
│  └─────────────┴─────────────┴─────────────┴─────────────┘      │
│                                                                  │
│  ┌────────────────────────────────────────────────────────┐     │
│  │ ⚠️ Low Stock Items (17)                                │     │
│  │                                                        │     │
│  │ • Math Grade 6 (85 / min 100)                          │     │
│  │ • Summer Boys Primary - Size L (25 / min 30)           │     │
│  │ • A4 Paper Ream (45 / min 20) ✓ OK                     │     │
│  │ ... [View All]                                         │     │
│  └────────────────────────────────────────────────────────┘     │
│                                                                  │
│  ┌─────────────────────────┬──────────────────────────────┐     │
│  │ Pending Approvals       │ Recent Activities            │     │
│  │                         │                              │     │
│  │ 🟡 3 purchase requests  │ ✅ Sale ISS-2026-156         │     │
│  │ 🟡 1 return request     │    Ahmed Mohamed             │     │
│  │ 🟡 2 stock adjustments  │ ✅ Receipt GR-2026-45        │     │
│  │                         │    Books from Publisher X    │     │
│  │ [View All]              │ ... [View All]               │     │
│  └─────────────────────────┴──────────────────────────────┘     │
│                                                                  │
│  ┌────────────────────────────────────────────────────────┐     │
│  │ Quick Actions                                          │     │
│  │                                                        │     │
│  │ [+ New Purchase] [Receive Goods] [Sell to Student]     │     │
│  │ [Issue for Use]  [Process Return] [Stock Take]         │     │
│  └────────────────────────────────────────────────────────┘     │
│                                                                  │
│  ┌────────────────────────────────────────────────────────┐     │
│  │ Profitability This Month (Sale Items Only)             │     │
│  │                                                        │     │
│  │ Revenue: 210,700 EGP | COGS: 136,700 EGP               │     │
│  │ Profit:   74,000 EGP | Margin: 35.1%                   │     │
│  │                                                        │     │
│  │ [Detailed Report]                                      │     │
│  └────────────────────────────────────────────────────────┘     │
└──────────────────────────────────────────────────────────────────┘
```

### 9.2 Sale to Student Form

```
┌──────────────────────────────────────────────────────────────────┐
│  Sell to Student                                  [Cancel] [Save]│
├──────────────────────────────────────────────────────────────────┤
│                                                                  │
│  Student:        [Search by code/name...                  ] 🔍  │
│                  Selected: Ahmed Mohamed (S-2026-1015)           │
│                  Grade: 5 | Track: National                      │
│                                                                  │
│  💰 Payment Status: ✅ Paid (Up to date)                         │
│                                                                  │
│  ──────────────────────────────────────────────────────────────  │
│  📚 Books for Grade 5 (Recommended)                              │
│                                                                  │
│  ☑ Math Grade 5                              100.00  EGP         │
│  ☑ Arabic Grade 5                             90.00  EGP         │
│  ☑ Science Grade 5                            85.00  EGP         │
│  ☐ French (Optional)                          75.00  EGP         │
│  ☐ Religion Grade 5                           60.00  EGP         │
│                                                                  │
│  ──────────────────────────────────────────────────────────────  │
│  👕 Uniforms (Available Sizes)                                   │
│                                                                  │
│  Item: [Summer Uniform Boys Primary    ▼]                        │
│  Size: [M  ▼] Qty: [2]                       Price: 600.00 EGP   │
│  [Add]                                                           │
│                                                                  │
│  ──────────────────────────────────────────────────────────────  │
│  🛒 Selected Items                                               │
│                                                                  │
│  ┌────────────────────────────────────────────────────────┐     │
│  │ Item                          Qty   Unit    Total      │     │
│  ├────────────────────────────────────────────────────────┤     │
│  │ Math Grade 5                   1   100.00  100.00      │     │
│  │ Arabic Grade 5                 1    90.00   90.00      │     │
│  │ Science Grade 5                1    85.00   85.00      │     │
│  │ Summer Uniform Boys M          2   300.00  600.00      │     │
│  │                                            ─────────   │     │
│  │ Subtotal:                                  875.00 EGP  │     │
│  │ Discount:                                    0.00 EGP  │     │
│  │ TOTAL:                                     875.00 EGP  │     │
│  └────────────────────────────────────────────────────────┘     │
│                                                                  │
│  Payment Method:  ⦿ Cash now (Cashier)                           │
│                   ○ Add to invoice (Receivables)                 │
│                                                                  │
│  Notes: [_______________________________________]               │
│                                                                  │
│                    [Process Sale & Print Receipt]                │
└──────────────────────────────────────────────────────────────────┘
```

### 9.3 Stock Take Counting Screen — Warehouse Manager View

```
┌──────────────────────────────────────────────────────────────────┐
│  Stock Take ST-2026-0001                                         │
│  Annual Stock Take | Year-end                                    │
│                                                                  │
│  Counting by: Mr. Ahmed (Warehouse Manager)                      │
│  Status: In Progress | Items Counted: 145 / 250                  │
├──────────────────────────────────────────────────────────────────┤
│                                                                  │
│  Filter: [All Categories ▼] [Not Counted ☐] [Search...]         │
│                                                                  │
│  ┌────────────────────────────────────────────────────────┐     │
│  │ Item                                  Expected  Actual │     │
│  ├────────────────────────────────────────────────────────┤     │
│  │ Math Grade 5                          450      [____]  │     │
│  │ Math Grade 6                           85      [____]  │     │
│  │ Arabic Grade 5                        380      [____]  │     │
│  │ Summer Uniform Boys M                 120      [____]  │     │
│  │ Summer Uniform Boys L                  25      [____]  │     │
│  │ A4 Paper Ream                          45      [____]  │     │
│  │ Whiteboard Markers                    200      [____]  │     │
│  │ ...                                                    │     │
│  └────────────────────────────────────────────────────────┘     │
│                                                                  │
│  ⓘ You can only see quantities. Prices are managed by the        │
│     accountant after counting is complete.                       │
│                                                                  │
│  [Save Progress]    [Submit All Counts]                          │
└──────────────────────────────────────────────────────────────────┘
```

### 9.4 Stock Take Review Screen — Accountant View

```
┌──────────────────────────────────────────────────────────────────┐
│  Stock Take ST-2026-0001 - Variance Review                       │
│  Reviewing by: Mrs. Aisha (Chief Accountant)                     │
│                                                                  │
│  Status: Quantities Counted - Awaiting Finalization              │
├──────────────────────────────────────────────────────────────────┤
│                                                                  │
│  Filter: [Show Variances Only ☑]                                 │
│                                                                  │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │ Item               Expected Counted Var  Cost   Var Value  │ │
│  ├────────────────────────────────────────────────────────────┤ │
│  │ Math Grade 5         450     448   -2  50.00    -100.00   │ │
│  │ Summer Uni Boys M    120     115   -5  300.00 -1,500.00   │ │
│  │ A4 Paper Ream         45      48   +3  15.00      45.00   │ │
│  │ Whiteboard Marker    200     185  -15   2.00     -30.00   │ │
│  │ ...                                                        │ │
│  └────────────────────────────────────────────────────────────┘ │
│                                                                  │
│  Summary:                                                        │
│  Total Items: 250                                                │
│  Items with Variance: 12                                         │
│  Total Variance Value: -1,585.00 EGP (loss)                      │
│                                                                  │
│  Notes for Adjustment:                                           │
│  [Possible damaged items + counting errors. Investigation needed]│
│                                                                  │
│  ⚠️ This will create a stock adjustment requiring approval        │
│      from Chief Accountant + Principal (variance > 1,000 EGP)    │
│                                                                  │
│  [Re-request Recount]    [Submit for Adjustment Approval]        │
└──────────────────────────────────────────────────────────────────┘
```

### 9.5 Goods Receipt Screen

```
┌──────────────────────────────────────────────────────────────────┐
│  Receive Goods                                    [Cancel] [Save]│
├──────────────────────────────────────────────────────────────────┤
│                                                                  │
│  Purchase Order:  [PO-2026-0123 ▼]                               │
│                   Supplier: Publisher X                          │
│                   Order Date: April 25, 2026                     │
│                                                                  │
│  Receipt Date:    [May 2, 2026]                                  │
│  Supplier Invoice #: [INV-12345]                                 │
│  Invoice Date:    [May 1, 2026]                                  │
│  Invoice Total:   [25,500.00] EGP                                │
│                                                                  │
│  ──────────────────────────────────────────────────────────────  │
│  Items to Receive:                                               │
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │ Item              Ordered Received Accepted Cost   Total │   │
│  ├──────────────────────────────────────────────────────────┤   │
│  │ Math Grade 5      [100]  [100]    [100]    [50.00] 5,000 │   │
│  │ Arabic Grade 5    [100]  [100]    [98]     [45.00] 4,410 │   │
│  │   2 books defective - mark for return to supplier?       │   │
│  │ Science Grade 5   [80]   [80]     [80]     [42.50] 3,400 │   │
│  │ ...                                                      │   │
│  └──────────────────────────────────────────────────────────┘   │
│                                                                  │
│  Quality Check: ⦿ Passed  ○ Issues Found                         │
│  Quality Notes: [2 Arabic books had cover damage_____________]   │
│                                                                  │
│  Attachments:                                                    │
│  📎 Invoice scan: [Choose file]                                  │
│  📎 Delivery note: [Choose file]                                 │
│                                                                  │
│  Notes: [_______________________________________]               │
│                                                                  │
│  Subtotal: 25,200.00 EGP                                         │
│  Tax: 0.00 EGP                                                   │
│  Total: 25,200.00 EGP                                            │
│                                                                  │
│  ⚠️ Discrepancy: Invoice 25,500 vs Receipt 25,200                │
│      Will be flagged for accountant review                       │
│                                                                  │
│  [Save Draft] [Submit for Approval]                              │
└──────────────────────────────────────────────────────────────────┘
```

---

## 10. Edge Cases

### 10.1 Selling Books to a Student Whose Books Are Optional

**Scenario:** French book is optional for Grade 7 students. System should clearly show this.

**Handling:**
1. UI shows "Optional" badge next to French book
2. Doesn't auto-include in selected list
3. Student/parent must explicitly select
4. Receipt clearly indicates "Optional purchase"

### 10.2 Unifying Sales for Family Discount

**Scenario:** Parent buys for 3 children at once.

**Handling:**
1. Could create 3 separate sales (one per student)
2. Or use multi-student sale with single payment
3. **MVP-1 decision:** Separate sales (simpler), grouped in single receipt

### 10.3 Stock Becomes Insufficient During Sale Process

**Scenario:** Two cashiers selling same item; first depletes stock.

**Handling:**
1. Stock check at submission AND at finalization
2. Reservation system: items added to cart are reserved (10 min timeout)
3. If stock runs out: clear error + suggest alternative variants

### 10.4 Receipt Discrepancy with Invoice

**Scenario:** Supplier invoice says 100 units, only 95 received.

**Handling:**
1. Goods Receipt records actual received (95)
2. System flags discrepancy
3. Workflow notifies accountant
4. Options: (a) accept and pay 95 only (b) dispute (c) wait for missing 5

### 10.5 Returning Item from Old Sale (After Months)

**Scenario:** Student wants to return a uniform from 6 months ago.

**Handling:**
1. System checks return policy (default 30 days)
2. If outside window: requires Principal approval
3. Refund value may be reduced (per policy)

### 10.6 Negative Variance Discovered After Sales Made

**Scenario:** Stock take finds 50 books missing, but 30 sales already happened with old (incorrect) stock.

**Handling:**
1. Adjustment is "as of stock take date"
2. Future sales use corrected stock
3. Loss recognized in P&L
4. Investigation may follow

### 10.7 Item Type Change

**Scenario:** Admin wants to convert a consumable item to sale (or vice versa).

**Handling:**
1. **Forbidden if has any transactions**
2. Must mark old item as inactive, create new item
3. Migrate stock manually if needed (with adjustment)

### 10.8 Receiving Items at Different Cost Than PO

**Scenario:** PO says 50 EGP/unit, supplier invoice says 52 EGP/unit.

**Handling:**
1. Receipt uses actual invoice price
2. New FIFO lot at 52 EGP
3. If discrepancy > 5%: workflow approval needed
4. PO updated to reflect actual cost

---

## 11. Integration Patterns

### 11.1 Integration with Students Module

```python
# When student withdraws, check for purchases & potential refunds
@receiver(student_withdrawal_completed)
def handle_student_withdrawal(student_id, **kwargs):
    """Auto-trigger return workflow for active books/uniforms."""
    
    recent_purchases = inventory_service.get_student_purchases(
        student_id=student_id,
        period_days=90,  # Last 90 days
    )
    
    if recent_purchases:
        # Notify warehouse to assess returnable items
        notification_service.notify(
            user_role='warehouse_manager',
            template='student_withdrew_with_purchases',
            data={
                'student_id': student_id,
                'purchases_count': len(recent_purchases),
                'total_value': sum(p.amount for p in recent_purchases),
            }
        )
```

### 11.2 Integration with Cashier

```python
# Cashier integrates for receipt creation on sale
class CashierIntegration:
    
    def create_inventory_sale_receipt(self, issue):
        return self.cashier_service.create_receipt(
            receipt_type='inventory_sale',
            amount=issue.total_amount,
            received_from=f"{issue.student.full_name} ({issue.student.code})",
            description=f"Inventory sale: {issue.code}",
            payment_method=issue.payment_method,
            reference_type='inventory_issue',
            reference_id=issue.id,
        )
```

### 11.3 Integration with Accounting

Already shown in Service classes above. Two key flows:

**Sale Flow Journal Entry:**
```
DR Cash/Receivables           [total_amount]
    CR Sales Revenue                          [total_amount]
DR Cost of Goods Sold         [total_cost]
    CR Inventory                              [total_cost]
```

**Consumption Flow Journal Entry:**
```
DR Operating Expense          [total_cost]
    CR Inventory                              [total_cost]
```

---

## 12. Testing Strategy

### 12.1 Unit Tests

**FIFO Engine:**
- Single lot consumption
- Multiple lot consumption (crossing lots)
- Insufficient stock handling
- Reverse consumption
- Edge: zero quantity, exact lot depletion

**Stock Take Engine:**
- SoD enforcement (WH manager can't see prices)
- Variance calculation
- Adjustment generation
- Permission checks at each step

**Profitability Calculator:**
- Item with sales only
- Item with sales + returns
- Period boundaries (start/end dates)
- Currency precision

### 12.2 Integration Tests

End-to-end flows:
- Purchase request → approval → PO → goods receipt → stock available
- Sale to paid student → COGS calculated → revenue recorded
- Sale to unpaid student → workflow → approved → completed
- Return from student → approval → restock + refund
- Stock take → variance → adjustment → approval → posted

### 12.3 SoD Tests

```python
def test_warehouse_manager_cannot_see_prices_in_stocktake():
    st = create_stock_take(wh_manager=user_a, accountant=user_b)
    
    # Login as warehouse manager
    response = client.get(f'/api/inventory/stock-takes/{st.id}/items',
                          headers={'Authorization': f'Bearer {token_a}'})
    
    items = response.json()['items']
    for item in items:
        assert 'cost_per_unit' not in item
        assert 'expected_value' not in item
        assert 'variance_value' not in item
        # Should have:
        assert 'expected_quantity' in item
        assert 'counted_quantity' in item

def test_accountant_can_see_prices():
    st = create_stock_take(wh_manager=user_a, accountant=user_b)
    
    response = client.get(f'/api/inventory/stock-takes/{st.id}/items',
                          headers={'Authorization': f'Bearer {token_b}'})
    
    items = response.json()['items']
    for item in items:
        assert 'cost_per_unit' in item
        assert 'expected_value' in item
```

### 12.4 Performance Tests

- 10,000 items in catalog
- 1,000 stock movements per day
- Stock take with 5,000 items
- Profitability report for 1 year period

---

## 13. Migration Considerations

### 13.1 Initial Setup

**Order of migration:**
1. Categories (4 default + custom)
2. Sections (warehouse layout)
3. Suppliers
4. Items master data
5. Item variants (uniforms)
6. Books curriculum mapping
7. Uniform packages
8. Initial stock (with FIFO lots created from opening balance)
9. Active purchase orders (if any)

### 13.2 Excel Templates

**Template 1: Items**
- Code, Name AR, Name EN, Category, Item Type, Cost Price, Sale Price, Min Stock

**Template 2: Variants** (for uniforms)
- Item Code, Size, Color, Sale Price Override, Min Stock

**Template 3: Books Curriculum**
- Book Code, Grade Level, Track (or "All"), Mandatory (Y/N), Subject

**Template 4: Initial Stock**
- Item Code, Variant Code (if any), Quantity, Cost Per Unit, Acquired Date

### 13.3 Validation

- All sale items must have sale_price
- All books must be in books category
- All uniforms must have at least one variant
- Initial stock creates "opening" FIFO lots
- Suppliers list must be deduplicated

---

## 14. Future Enhancements

### 14.1 Phase 2 Possibilities

- **Barcode scanning** — Faster receipt and counting
- **Automatic reorder** — When stock hits minimum
- **Supplier portal** — Suppliers see POs, submit invoices
- **Mobile inventory app** — Stock take on tablets
- **Multiple warehouses** — Different physical locations
- **Inter-warehouse transfers**
- **Forecasting** — Predict demand based on history

### 14.2 Phase 3 Possibilities

- **RFID integration**
- **Smart shelves** — Automatic count
- **AI demand forecasting**
- **Integration with publishers** — Direct ordering API

---

## 15. Summary

### 15.1 Module Statistics

- **Tables:** 17 (master data + tracking + transactions)
- **Item Types:** 2 (sale + consumable)
- **Default Categories:** 4 (extensible)
- **Workflows:** 6 inventory-specific
- **Engines:** 6 (FIFO, Sale, Consumption, Profitability, Stock Take, Returns)
- **Integration Points:** 5 modules

### 15.2 Key Design Decisions

1. **Two distinct item types** (sale vs consumable) — different lifecycles
2. **FIFO method** for cost calculation
3. **Single warehouse** with logical sections
4. **Strict SoD in stock take** (WH manager: quantities; Accountant: values)
5. **Configurable approval thresholds** (100/1000 EGP)
6. **Returns supported** for both students and suppliers
7. **Configuration over hardcoding** for all business rules
8. **Full audit trail** via FIFO lot consumption tracking

### 15.3 Success Metrics for MVP-1

- ✅ All inventory items managed in system
- ✅ FIFO cost calculation accurate to the cent
- ✅ Daily sales processed without delay
- ✅ Annual stock take completed with full reconciliation
- ✅ Profitability per item/category visible monthly
- ✅ Zero financial discrepancies in inventory accounting
- ✅ Student purchase history complete and accessible
- ✅ Return policy enforced consistently
- ✅ All sensitive operations approval-gated
- ✅ Low stock alerts trigger reordering proactively

---

*End of Inventory Module Document*

> **Related Documents:**
> - `04_ARCHITECTURE.md` — Overall architecture
> - `06_USER_ROLES_AND_PERMISSIONS.md` — Roles involved
> - `07_APPROVAL_WORKFLOWS.md` — Inventory workflows in detail
> - `08_TRANSPORT_MODULE.md` — Reference for similar module structure
