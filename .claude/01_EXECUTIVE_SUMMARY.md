# Executive Summary — El Shorouk School Management System

> **Audience:** School Administration, Project Sponsors, Decision Makers
> **Purpose:** Strategic overview of the project, scope, timeline, and investment
> **Document Owner:** Project Tech Lead
> **Version:** 2.0 — May 2026
> **Classification:** Internal — Confidential

---

## 1. Project Overview

### 1.1 The One-Paragraph Summary

We are building a **custom-tailored, single-tenant school management system** exclusively for **El Shorouk School**, replacing the current Excel-based workflows with a unified, secure, web-based platform. The system handles the complete administrative lifecycle: student registration with full enrollment workflow, fee collection with two-tier discount system, treasury operations, accounting, inventory across four warehouse divisions (books, uniforms, stationery, lab supplies), bus management for 50 fully-rented buses across 80 routes with three rider types (students, employees, supervisors), and full HR with payroll for 100 employees including ZKTeco biometric attendance integration. A core innovation is the **Configurable Approval Workflow Engine** — administrators can define, modify, enable, or disable approval workflows for any sensitive operation entirely from the UI. The system will be delivered in **two major phases**: **Phase 1 (MVP-1, 7 months)** focused on the complete administrative operation, and **Phase 2 (5 months)** adding student attendance devices, the academic process, and dedicated mobile applications.

### 1.2 Strategic Context

**The Problem:**
El Shorouk School currently manages 1,500 students and 100 employees using fragmented Excel spreadsheets. This causes financial calculation errors, missing audit trails, difficulty cross-referencing data, manual payroll prone to errors, no remote access, and risk of data loss.

**The Solution:**
A purpose-built, Arabic-first web application with these core principles:
1. **Configuration over Code** — Business rules editable from UI, not hardcoded
2. **Configurable Approval Workflows** — Admins define who approves what
3. **Financial Accuracy First** — Multi-layered protection against monetary errors
4. **Security by Design** — Audit trails, RBAC, 2FA, Segregation of Duties
5. **Egyptian Context** — Built specifically for Egyptian regulations, currency, language

---

## 2. Key Strategic Decisions

### 2.1 Business Decisions

| Item | Decision |
|---|---|
| Target | El Shorouk School only (single-tenant) |
| Currency | Egyptian Pound (EGP) |
| Primary Language | Arabic (with English support) |
| Calendar | Gregorian |
| Educational Stages | Primary + Preparatory + Secondary |
| Tracks | National + International |
| Student Count | ~1,500 |
| Employee Count | ~100 |
| Bus Fleet | 50 buses, 80 routes (all fully rented) |
| Inventory Divisions | 4 (Books, Uniforms, Stationery, Lab Supplies) — extensible |
| Competitive Priorities | Financial Accuracy > Configurability > Arabic UX > Reports |

### 2.2 Technical Decisions

| Item | Decision | Rationale |
|---|---|---|
| Backend | Python 3.12 + Django 5 + DRF | Strong team Python skills, mature ORM, built-in admin |
| Frontend | Next.js 15 + TypeScript + Tailwind | Best-in-class RTL support, SSR, modern DX |
| Database | PostgreSQL 16 | ACID compliance, robust for financial data |
| Cache & Queue | Redis + Celery | Async tasks (reports, integrations, notifications) |
| Hosting | VPS + Local Mini-PC Hybrid | Internet resilience + remote access |
| API Style | REST (DRF) + OpenAPI 3.0 | Mobile-ready in Phase 2 |
| Authentication | Django AllAuth + JWT + 2FA | Industry standard, mobile-ready |
| File Storage | MinIO (S3-compatible) | Self-hosted, cost-effective |
| Deployment | Docker Compose + GitHub Actions | Reproducible, CI/CD |

### 2.3 The Three Most Important Strategic Decisions

#### Decision 1: Configuration over Code

Every business rule that might change lives in a configuration table editable from the UI. Includes: fee structures, discount policies, HR policies (leave types, allowances, tax brackets), inventory categories, user roles, and permissions. **Trade-off:** Roughly doubles initial development time but eliminates ~80% of future change requests.

#### Decision 2: Configurable Approval Workflow Engine

A dedicated engine where administrators can:
- Define new approval workflow types (e.g., fee refund, student withdrawal)
- Configure who approves what with what limits
- Enable/disable workflows on demand
- Version workflows (changes don't affect in-flight requests)
- Test workflows before activation
- Delegate approvals temporarily

This eliminates code changes for 95% of approval policy modifications.

#### Decision 3: Single-Tenant Architecture

Built specifically for El Shorouk only, eliminating multi-tenant complexity (~30% reduction in code). If a second school is needed, it would be a separate deployment.

---

## 3. User Roles in the System

The system defines **8 default roles** that map to actual positions at El Shorouk School. Roles are **flexible** — one person can hold multiple roles, and roles can be split when the school grows.

### 3.1 Default Roles Catalog

| # | Role | Responsibility | Current at El Shorouk |
|---|---|---|---|
| 1 | System Administrator | Technical maintenance | Development team (us) |
| 2 | School Principal | Top authority, strategic decisions | Principal |
| 3 | Chief Accountant | Senior financial authority | Chief Accountant |
| 4 | Accountant | Daily financial operations | Currently also handles transport + procurement |
| 5 | Cashier | Treasury operations | Currently held by accountant (additional role) |
| 6 | Warehouse Manager | Inventory operations | Warehouse Manager |
| 7 | HR Officer | Human resources | HR Officer |
| 8 | Student Affairs Officer | Student lifecycle | Currently also handles stage coordination |

### 3.2 Role Flexibility

The system supports **role composition**:
- One person can hold multiple roles simultaneously
- Roles can be split when needed (e.g., when school hires dedicated Transport Officer)
- No code changes required for role assignments
- Permissions follow roles, not people

### 3.3 Phase 2 Additional Roles

- Teacher
- Head of Subject
- Parent (mobile app)
- Student (limited access)

**Detailed permissions and workflows are documented in `06_USER_ROLES_AND_PERMISSIONS.md`.**

---

## 4. Approved Scope for First Release (MVP-1)

MVP-1 covers the **complete administrative operation** of the school. It is divided into 5 logical sub-phases delivered sequentially:

### Phase 0 — Foundation (3 weeks)
- Infrastructure setup (VPS, Mini-PC, domains, SSL)
- Development environment and CI/CD pipeline
- Authentication and Dynamic RBAC system
- **Configurable Approval Workflow Engine** (the core innovation)
- Configuration framework

### Phase 1A — Administrative Core (8 weeks)
- **Students Module:** Full enrollment workflow (Application → Receipt → Exam → Fee Determination → Discount Approval → Acceptance → Active Student)
- **Student 360° View:** Complete student profile from enrollment to graduation
- **Fees Module:** Two-tier discount system (basic + additional), installment plans
- **Cashier Module:** Daily treasury cycle (open → operations → count → close)
- **Accounting Module:** Receivables, payments, daily reconciliation

### Phase 1B — Inventory (5 weeks)
- 4 warehouse divisions (Books, Uniforms, Stationery, Lab Supplies)
- Configuration to add new divisions
- Complete cycle: Purchase Request → Approval → PO → Goods Receipt → Issue → Stock Take
- Payment verification before student issuance
- Profit/loss tracking per category

### Phase 1C — Transport (4 weeks)
- 80 routes, 50 fully-rented buses
- 3 rider types: Students (full fee), Employees (half fee), Supervisors (free)
- Rental company and contract management
- Monthly rental invoice processing
- Mid-year subscription changes with pro-rata calculations
- Profitability per bus
- Driver management (external — belongs to rental company)

### Phase 1D — HR & Payroll (6 weeks)
- Employee master data and lifecycle
- Egyptian payroll engine (tax brackets, social insurance per current law)
- Leave management (annual, sick, casual, maternity, hajj, unpaid + extensible)
- Loan/advance management with monthly deductions
- ZKTeco device integration (with adapter pattern for future devices)
- Bus subscription deduction integration
- Payslip generation (Arabic PDF)
- End-of-service calculations

### Phase 1E — Reporting & Stabilization (2 weeks)
- 360° student report
- Financial reports (daily, monthly, yearly)
- HR reports (payroll summary, attendance, leaves)
- Inventory reports (stock levels, movement, profitability)
- Transport reports (bus profitability, daily movement)
- Performance optimization and final UAT

### Data Migration Phase (2 weeks, parallel with 1E)
- Excel templates provided to school
- Bulk import tools with validation
- Data quality reports
- Parallel run period (1 month)

**Total MVP-1 Duration: 30 weeks (~7 months)**

---

## 5. Phase 2 Scope (Post-MVP-1)

### Phase 2A — Student Attendance Devices (4 weeks)
- Integration with ZKTeco devices for student attendance
- Adapter framework for future devices (Suprema, Hikvision)
- Daily attendance reports per class
- Absence notifications to parents

### Phase 2B — Academic Process (10 weeks)
- Curriculum structure (subjects, grade levels, sections)
- Class scheduling and timetable management
- Teacher assignments
- Grades and assessments (quizzes, midterms, finals)
- Report cards and transcripts
- Behavior tracking

### Phase 2C — Mobile Applications (8 weeks)
- Parent App (React Native + Expo)
- Employee App
- Push notifications

**Total Phase 2 Duration: 22 weeks (~5 months)**

---

## 6. Key Workflows

### 6.1 Student Enrollment Workflow

```
[Applicant arrives]
   ↓
[Student Affairs creates application]
   → Status: "Applicant"
   → Generates: file fee receipt request
   ↓
[Cashier collects file fee]
   → Status: "Under Examination"
   ↓
[Exam conducted (offline)]
   ↓
   ├── Failed → Status: "Rejected"
   └── Passed
       ↓
[Student Affairs determines fees]
   → Based on stage + track
   ↓
[Optional: Discount Request]
   → Basic discount (% off gross fees)
   → Additional discount (% off net after basic)
   → Approval routing per Configurable Workflow
   ↓
[Family accepts final fees]
   → Status: "Accepted"
   ↓
[Transfer to active students]
   → Status: "Active"
   → Student 360° page opens
   ↓
[Continuous lifecycle tracking]
   → Fees, transport, books, uniform, attendance
   ↓
[Graduation / Withdrawal]
```

### 6.2 Bus Subscription Mid-Year Change Workflow

```
[Parent requests bus change for student]
   ↓
[Transport Officer opens change request]
   ↓
[System auto-calculates pro-rata difference]
   ↓
   ├── Difference = 0 → Auto-approved
   ├── Increase → Routed per workflow
   └── Decrease → Senior approval required
   ↓
[On approval:]
   ├── Update subscription
   ├── Generate accounting entry
   ├── For students: add to receivables
   ├── For employees: deduct from next payroll
   └── Notify all parties
```

---

## 7. Hosting Architecture: VPS + Mini-PC Hybrid

### 7.1 The Setup

```
┌─────────────────────────────────────────────────────────┐
│                  CLOUD (Hostinger VPS)                  │
│  • Django Backend (4 vCPU, 16GB RAM)                    │
│  • PostgreSQL Primary                                   │
│  • Redis (cache + queue)                                │
│  • Celery Workers                                       │
│  • MinIO (file storage)                                 │
│  • Next.js Frontend                                     │
│  • Nginx + Let's Encrypt SSL                            │
└─────────────────────────────────────────────────────────┘
            ▲                                       ▲
            │ HTTPS                                 │ HTTPS
            │                                       │
┌───────────┴──────────────┐         ┌──────────────┴─────────┐
│   EL SHOROUK SCHOOL      │         │   REMOTE USERS          │
│   ┌──────────────────┐   │         │   (Phase 2: Parents,    │
│   │   Mini-PC        │   │         │    Off-site Staff)      │
│   │   Sync Agent     │   │         └─────────────────────────┘
│   │   - ZKTeco Bridge│   │
│   │   - Local Cache  │   │
│   │   - Sync Queue   │   │
│   └──────────────────┘   │
│   School Staff           │
│   (Laptops/Tablets)      │
└──────────────────────────┘
```

### 7.2 Operating Modes

**Normal Mode:** All operations go to VPS. Mini-PC syncs ZKTeco real-time.
**Degraded Mode (Internet Down):** Mini-PC continues collecting attendance. Critical writes queued. Auto-sync when restored.

---

## 8. Investment Summary

### 8.1 Monthly Operating Costs

| Item | Cost (USD) |
|---|---|
| Hostinger VPS (KVM 4: 4 vCPU, 16GB RAM, 200GB) | $20-22 |
| Domain | ~$1 |
| Backup (Backblaze B2) | $3-5 |
| SSL, CDN, Monitoring | Free |
| Email (Brevo) | $0-10 |
| **Monthly Total** | **$25-35 USD** |

### 8.2 One-Time Costs (EGP)

| Item | Cost |
|---|---|
| Mini-PC | 5,000 - 10,000 |
| UPS for Mini-PC | 1,500 - 2,500 |
| Network setup | 2,000 - 5,000 |
| **One-Time Total** | **8,500 - 17,500 EGP** |

### 8.3 5-Year Cost Comparison

| Alternative | 5-Year Cost |
|---|---|
| Commercial school SaaS | $45,000 - $90,000 |
| **Our Self-Hosted Solution** | **$1,500 - $2,100** |

---

## 9. Timeline

### 9.1 MVP-1 Schedule (30 weeks)

```
Month 1     ████████░░░░░░░░░░░░░░░░░░░░░  Phase 0 (3 weeks) + Phase 1A start
Month 2     ████████████████░░░░░░░░░░░░░  Phase 1A: Students + Fees
Month 3     ████████████████████████░░░░░  Phase 1A: Cashier + Accounting
Month 4     ███████████████████████████░░  Phase 1B: Inventory
Month 5     ████████████████████████████░  Phase 1B done + Phase 1C start
Month 6     ████████████████████████████░  Phase 1C: Transport (4 weeks)
Month 7     ████████████████████████████░  Phase 1D: HR & Payroll
Month 7.5   ████████████████████████████   Phase 1E: Reports + Migration + Go-Live
```

### 9.2 Phase 2 Schedule (22 weeks)

| Period | Activity |
|---|---|
| Months 8-9 | Phase 2A: Student attendance devices |
| Months 9-11 | Phase 2B: Academic process |
| Months 11-13 | Phase 2C: Mobile applications |

### 9.3 Critical Path Risks

The most time-sensitive activities are:
1. **Weeks 1-3 (Foundation + Approval Engine)** — Delays cascade
2. **Weeks 9-12 (Cashier + Accounting Integration)** — Financial accuracy validation
3. **Weeks 18-23 (HR & Payroll)** — Egyptian regulations complexity

---

## 10. Top 5 Risks and Mitigation

| # | Risk | Impact | Likelihood | Mitigation |
|---|---|---|---|---|
| 1 | Financial calculation errors | Catastrophic | Low | Decimal arithmetic, 90% test coverage, audit logs, daily reconciliation |
| 2 | Team learning curve (Django/Next.js) | High | High | 3-week bootstrap, Tech Lead mentoring, code reviews |
| 3 | Scope creep | High | High | Locked scope per phase, formal change request process |
| 4 | Excel data migration quality | Medium | High | Dedicated migration phase, data quality reports, parallel run |
| 5 | Configurable Approval Engine complexity | High | Medium | 3 dedicated weeks at start, comprehensive test suite |

A complete Risk Register with 28+ identified risks is in `03_RISK_REGISTER.md`.

---

## 11. Success Criteria

### 11.1 MVP-1 Success Criteria (End of Month 7)

- ✅ El Shorouk School operates daily on the system, no longer using Excel for covered modules
- ✅ All 1,500 students migrated with verified data
- ✅ Complete student lifecycle works (application → admission → active → graduation)
- ✅ Daily cashier closing with zero discrepancies for 30 consecutive days
- ✅ Monthly payroll for 100 employees runs successfully with correct tax/insurance
- ✅ All 4 inventory divisions operate with payment verification
- ✅ Bus subscriptions for active routes managed with mid-year change support
- ✅ All sensitive operations have audit trails
- ✅ Approval workflows fully configurable from UI
- ✅ P95 response time under 2 seconds
- ✅ System uptime ≥ 99% during business hours

### 11.2 Phase 2 Success Criteria (End of Month 13)

- ✅ MVP-1 features remain stable
- ✅ Student attendance via biometric devices operational
- ✅ Teachers can record grades and generate report cards
- ✅ Parent and Employee mobile apps published
- ✅ System uptime ≥ 99.5% over 3-month rolling window
- ✅ User satisfaction ≥ 4/5

---

## 12. Team Structure

### 12.1 Roles

| Role | Count | Primary Responsibility |
|---|---|---|
| Tech Lead | 1 | Architecture, code reviews, technical decisions, school liaison |
| Backend Developer | 1 | Django/DRF implementation, API design, database |
| Frontend Developer | 1 | Next.js, UI/UX implementation, RTL polish |
| QA + DevOps | 1 | Testing, CI/CD, deployment, monitoring |

### 12.2 Tools

- **Claude Code** — AI pair programming
- **GitHub Spec Kit** — Specification-driven development

### 12.3 Working Style

- **Spec-first development**
- **Trunk-based development with feature flags**
- **Code review required for every PR**
- **Daily standups + weekly demo to school**
- **Monthly retrospectives**

---

## 13. Open Decisions Pending Before Development Starts

The following must be confirmed with El Shorouk School before Week 1:

| # | Decision | Required From |
|---|---|---|
| 1 | Complete fee structure per stage and track | Finance Team |
| 2 | Discount policy (basic + additional) | Administration |
| 3 | Current installment plans | Finance Team |
| 4 | Default approval routing for each workflow type | Administration |
| 5 | Specific HR policies | HR Department |
| 6 | Existing Excel files for migration | All departments |
| 7 | ZKTeco device models (exact serial/model) | IT/Procurement |
| 8 | Bus rental contracts (companies, terms, costs) | Transport |
| 9 | Inventory item categories and current stock | Warehouse Manager |
| 10 | Confirmation of security policies | Administration |

---

## 14. Why This Project Will Succeed

**1. Right Stack for the Right Team** — Python expertise leveraged through Django.

**2. Configuration Over Code Philosophy** — Long-term maintainability built-in.

**3. Configurable Approval Engine** — School manages workflow policies independently.

**4. Phased Delivery with Real Value Each Phase** — MVP-1 is fully operational, not a demo.

**5. Egyptian Context First** — Built specifically for Egyptian regulations.

**6. Right-Sized Architecture** — Single-tenant simplicity with enterprise-grade quality where it matters.

**7. AI-Augmented Development** — Claude Code + Spec Kit allow a 4-person team to deliver enterprise-quality output.

---

## 15. Immediate Next Steps

### Week 0 (Before Development)

1. **School Kick-off Meeting** — Confirm requirements
2. **Infrastructure Provisioning** — VPS, Mini-PC, domain, SSL
3. **Tooling Setup** — Git repos, CI/CD, project board
4. **Document Handoff** — Team reviews all 8 documents in this set

### Week 1 (Development Begins)

- Project bootstrap (Django + Next.js skeleton)
- Database connection and initial migrations
- Authentication scaffolding
- RTL Arabic layout foundation
- Approval Workflow Engine schema design

### Recurring Reviews

- **Weekly:** Internal team review + school demo
- **Bi-weekly:** Stakeholder review with administration
- **Monthly:** Milestone review with budget check

---

## 16. Closing Statement

This project is **achievable** with the available resources and timeline. The plan is **realistic, phased, and risk-aware**. The two-phase approach allows the school to start benefiting from the system in 7 months while continuing to build toward the complete vision.

The success of this project depends on three factors equally:

1. **Disciplined adherence to Configuration over Code**
2. **Quality-first approach for all financial calculations**
3. **Continuous communication with the school**

---

*End of Executive Summary*

> **For detailed information, see:**
> - `02_PROJECT_CHARTER.md` — Project foundation
> - `03_RISK_REGISTER.md` — Risk management
> - `04_ARCHITECTURE.md` — Technical design
> - `05_ملخص_المدير_الفني_عربي.md` — Arabic summary for Tech Lead
> - `06_USER_ROLES_AND_PERMISSIONS.md` — Roles, permissions, and workflows
> - `07_APPROVAL_WORKFLOWS.md` — Approval engine details (Round 2)
> - `08_TRANSPORT_MODULE.md` — Transport system details (Round 2)
