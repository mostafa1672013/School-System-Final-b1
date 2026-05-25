# Risk Register — El Shorouk School Management System

> **Document Type:** Risk Register (PMI-aligned, ISO 31000 framework)
> **Status:** Living document — updated weekly
> **Date:** May 2026
> **Document Owner:** Project Tech Lead
> **Version:** 2.0

---

## 1. Risk Management Framework

### 1.1 Risk Scoring System

**Likelihood Scale:**

| Level | Score | Description |
|---|---|---|
| Very Low | 1 | <10% chance |
| Low | 2 | 10-30% |
| Medium | 3 | 30-60% |
| High | 4 | 60-85% |
| Very High | 5 | >85% |

**Impact Scale:**

| Level | Score | Description |
|---|---|---|
| Negligible | 1 | <1 day delay, no cost impact |
| Minor | 2 | 1-3 days delay, minimal cost |
| Moderate | 3 | 1 week delay, manageable cost |
| Major | 4 | 2-4 weeks delay, significant cost |
| Catastrophic | 5 | >1 month delay, project failure risk |

**Risk Score = Likelihood × Impact**

| Score | Priority | Action |
|---|---|---|
| 1-4 | Low | Monitor |
| 5-9 | Medium | Plan mitigation |
| 10-15 | High | Active mitigation |
| 16-25 | Critical | Immediate action |

---

## 2. Critical Risks (Priority Action Required)

### RISK-001: Financial Calculation Errors in Production

| Attribute | Value |
|---|---|
| Category | Quality / Technical |
| Likelihood | Low (2) |
| Impact | Catastrophic (5) |
| Score | **10** |
| Owner | Tech Lead |

**Description:** Errors in fee calculations, discount applications, payroll, accounting, or pro-rata bus fee calculations.

**Triggers:**
- Use of float arithmetic instead of decimal
- Missing edge cases in discount logic (basic + additional)
- Incorrect tax bracket application
- Pro-rata calculation errors for mid-year bus changes
- Race conditions in concurrent transactions

**Mitigation Actions:**
1. Mandate `Decimal` type for all monetary calculations
2. 90%+ test coverage for all financial modules
3. Property-based testing for fee calculation engine and pro-rata
4. Double-entry validation: application logic + database triggers
5. Daily cashier reconciliation enforced
6. Approval workflow for unusual amounts
7. Code review by Tech Lead mandatory for financial code
8. Parallel run with Excel for 30 days

**Contingency Plan:**
- Immediate freeze of affected operations
- Audit log analysis
- Manual reconciliation by finance team
- Emergency patch with full regression
- Communication to affected parties

---

### RISK-002: Catastrophic Data Loss

| Attribute | Value |
|---|---|
| Category | Operations / Technical |
| Likelihood | Very Low (1) |
| Impact | Catastrophic (5) |
| Score | **5** |
| Owner | DevOps |

**Mitigation:** 3-2-1 backup rule, WAL archiving, soft delete only, weekly restore tests, two-person rule for DB admin.

---

### RISK-003: Security Breach with Data Exposure

| Attribute | Value |
|---|---|
| Category | Security |
| Likelihood | Low (2) |
| Impact | Catastrophic (5) |
| Score | **10** |
| Owner | Tech Lead + DevOps |

**Mitigation:** 2FA enforced, strong passwords, account lockout, HTTPS+HSTS, SQL injection prevention, encryption at rest, quarterly audits, dependency scanning, pen-testing before Go-Live.

---

### RISK-004: Team Learning Curve on Django/Next.js

| Attribute | Value |
|---|---|
| Category | Schedule / Resource |
| Likelihood | High (4) |
| Impact | Major (4) |
| Score | **16** (Critical) |
| Owner | Tech Lead |

**Description:** Team has strong Python skills but learning Django/Next.js will slow productivity initially.

**Mitigation Actions:**
1. **3-week bootstrap phase** at project start
2. Pair programming during first 4 weeks
3. Tech Lead conducts weekly code review training
4. Use Spec Kit to enforce structure
5. Leverage Claude Code for boilerplate
6. Build "patterns library" in first month
7. Buffer 1 week per phase for learning catch-up
8. Daily code review by Tech Lead in first month

**Contingency Plan:**
- Reduce MVP-1 scope (move features to Phase 1.5)
- Extend timeline by 2-4 weeks
- Engage Django consultant for 2 weeks if blocking

---

### RISK-005: Scope Creep from School

| Attribute | Value |
|---|---|
| Category | Stakeholder / Schedule |
| Likelihood | High (4) |
| Impact | Major (4) |
| Score | **16** (Critical) |
| Owner | Tech Lead + Principal |

**Mitigation:** Locked scope per phase, formal change request process, weekly demos, single point of contact, "Phase 2 Wishlist" for ideas, configuration vs code change distinction, Configurable Approval Engine absorbs 80% of natural workflow changes.

---

### RISK-006: Excel Data Migration Quality

| Attribute | Value |
|---|---|
| Category | Quality / Schedule |
| Likelihood | High (4) |
| Impact | Moderate (3) |
| Score | **12** (High) |
| Owner | Backend Developer + School data owner |

**Mitigation:** Early audit Week 1, standardized templates, robust validation, error reports, manual review for ambiguous cases, dedicated 2-week migration phase, 30-day parallel run, school designates "data steward."

---

### RISK-007: ZKTeco Integration Complexity

| Attribute | Value |
|---|---|
| Category | Technical |
| Likelihood | Medium (3) |
| Impact | Major (4) |
| Score | **12** (High) |
| Owner | Backend Developer |

**Mitigation:** Early prototype Week 4, test with actual devices, use `pyzk` library, Adapter Pattern, comprehensive logging, retry logic, manual fallback option.

---

### RISK-008: Performance Issues at Peak Load

| Attribute | Value |
|---|---|
| Category | Performance |
| Likelihood | Medium (3) |
| Impact | Major (4) |
| Score | **12** (High) |
| Owner | Tech Lead + DevOps |

**Mitigation:** DB indexing strategy from schema design, query optimization in code review, Redis caching, pagination, Celery for heavy ops, load testing before Go-Live, VPS sized for peak.

---

### RISK-009: Internet Outage at School

| Attribute | Value |
|---|---|
| Category | Operations |
| Likelihood | High (4) |
| Impact | Moderate (3) |
| Score | **12** (High) |
| Owner | School IT + DevOps |

**Mitigation:** Mini-PC offline architecture, critical operations buffered locally, ZKTeco devices continue offline, auto-sync on restore, recommend backup internet connection, UPS, status page.

---

### RISK-010: Egyptian Tax/Insurance Law Changes

| Attribute | Value |
|---|---|
| Category | Regulatory / External |
| Likelihood | Medium (3) |
| Impact | Major (4) |
| Score | **12** (High) |
| Owner | Tech Lead |

**Mitigation:** Tax brackets and insurance percentages in configuration tables (date-effective), subscribe to legal newsletters, HR Manager validates calculations, version control on tax config changes.

---

### RISK-011: Configurable Approval Engine Complexity

| Attribute | Value |
|---|---|
| Category | Technical |
| Likelihood | Medium (3) |
| Impact | Major (4) |
| Score | **12** (High) |
| Owner | Tech Lead |

**Description:** The Approval Workflow Engine is now central to the system. Bugs here affect every module that requires approvals.

**Mitigation Actions:**
1. **3 dedicated weeks** at start (Phase 0)
2. Comprehensive test suite (100+ test cases)
3. Start with simple workflows, add complexity incrementally
4. UI for testing workflows before activation
5. Audit log for all workflow decisions
6. Versioning support (in-flight requests use old version)
7. Workflow validation before save (no invalid configs)
8. Document approval rules clearly for school
9. Pilot with one workflow (discount approval) before others

**Contingency Plan:**
- Reduce default workflow types in MVP-1
- Manual approval interface as fallback
- Hardcode critical workflows temporarily if engine has issues

---

### RISK-012: SoD Conflict Detection Errors

| Attribute | Value |
|---|---|
| Category | Security / Quality |
| Likelihood | Medium (3) |
| Impact | Major (4) |
| Score | **12** (High) |
| Owner | Tech Lead |

**Description:** System fails to detect a Segregation of Duties conflict OR generates false positives that paralyze operations.

**Mitigation Actions:**
1. Clear SoD rules definition in configuration
2. Test cases for every SoD scenario
3. "Test SoD" interface for admins
4. Override mechanism with Principal approval
5. Logging of all SoD checks (passes and fails)
6. Monthly SoD violations report
7. Gradual rollout (start permissive, tighten over time)

---

### RISK-013: Insider Threat / Permission Abuse

| Attribute | Value |
|---|---|
| Category | Security |
| Likelihood | Low (2) |
| Impact | Major (4) |
| Score | **8** (Medium) |
| Owner | Principal + Tech Lead |

**Description:** A trusted user (e.g., accountant) abuses their permissions to commit fraud or data leak.

**Mitigation Actions:**
1. Comprehensive audit log on all sensitive operations
2. Regular permission review (quarterly)
3. SoD enforcement
4. 2FA for sensitive roles
5. Anomaly detection (e.g., unusual transaction patterns)
6. Periodic random transaction audits
7. Limit data export capabilities
8. IP whitelisting for high-privilege roles

---

### RISK-014: Inadequate Testing Coverage

| Attribute | Value |
|---|---|
| Category | Quality |
| Likelihood | Medium (3) |
| Impact | Major (4) |
| Score | **12** (High) |
| Owner | QA |

**Mitigation:** Test coverage targets enforced in CI, TDD for financial logic, property-based testing, E2E tests for critical journeys, manual UAT, performance testing, security testing.

---

### RISK-015: Configuration Errors by School Admin

| Attribute | Value |
|---|---|
| Category | Operations |
| Likelihood | Medium (3) |
| Impact | Moderate (3) |
| Score | **9** (Medium) |
| Owner | Tech Lead |

**Mitigation:** Validation in Configuration UI, preview mode for workflow changes, audit log on config changes, ability to revert, "Test workflow" feature, configuration changes require admin role, critical configs require additional approval, training for admin users.

---

### RISK-016: Hardware Failure on Mini-PC

| Attribute | Value |
|---|---|
| Category | Operations |
| Likelihood | Low (2) |
| Impact | Moderate (3) |
| Score | **6** (Medium) |
| Owner | School IT |

**Mitigation:** UPS, daily Mini-PC config backup to VPS, spare Mini-PC plan, rebuild from config in <2 hours, ZKTeco retains data even if Mini-PC down.

---

### RISK-017: User Adoption / Change Resistance

| Attribute | Value |
|---|---|
| Category | Stakeholder |
| Likelihood | Medium (3) |
| Impact | Moderate (3) |
| Score | **9** (Medium) |
| Owner | School Principal |

**Mitigation:** Involve key users in design sessions early, UI mimicking familiar Excel patterns, bulk Excel import, phased rollout per module, Arabic training programs, quick reference guides, "Champions" program, demo mode for practice.

---

### RISK-018: Bus Rental Company Issues

| Attribute | Value |
|---|---|
| Category | External / Operations |
| Likelihood | Medium (3) |
| Impact | Moderate (3) |
| Score | **9** (Medium) |
| Owner | Transport / Accountant |

**Description:** Bus rental company has operational issues affecting service (delays, vehicle problems, billing disputes).

**Mitigation Actions:**
1. Track rental contract terms in system
2. Document complaints and incidents
3. Monthly performance review with provider
4. Multiple rental company support in system (no vendor lock-in)
5. Contract renewal alerts (60 days advance)
6. Invoice approval workflow before payment

---

### RISK-019: Mid-Year Subscription Change Volume

| Attribute | Value |
|---|---|
| Category | Operations / Quality |
| Likelihood | Medium (3) |
| Impact | Moderate (3) |
| Score | **9** (Medium) |
| Owner | Transport Officer |

**Description:** High volume of mid-year bus subscription changes overwhelms manual processing.

**Mitigation:** Self-service request capability, automated pro-rata calculation, batch approval for routine changes, clear timeline communication to parents, weekly batch processing option.

---

### RISK-020: Student Enrollment Workflow Bottleneck

| Attribute | Value |
|---|---|
| Category | Operations |
| Likelihood | Medium (3) |
| Impact | Moderate (3) |
| Score | **9** (Medium) |
| Owner | Student Affairs Officer |

**Description:** New student enrollment workflow (multi-step approval) creates bottlenecks during enrollment season.

**Mitigation:** Parallel workflows where possible, SLA on each step (24-48 hours), escalation if delayed, Principal can fast-track urgent cases, batch processing for similar profiles.

---

### RISK-021: VPS Provider Outage

| Score | **8** (Medium) | Owner: DevOps |
|---|---|---|

**Mitigation:** Strong SLA provider, Cloudflare, daily backups separate, 4-hour DR plan, status page, Mini-PC continues most operations.

---

### RISK-022: Browser Compatibility Issues

| Score | **4** (Low) | Mitigation: Test on Chrome, Firefox, Edge, Safari. Modern browsers only. |
|---|---|---|

---

### RISK-023: Time Zone Bugs

| Score | **4** (Low) | Mitigation: All times in UTC in DB, display in Africa/Cairo. |
|---|---|---|

---

### RISK-024: Email Delivery Issues

| Score | **4** (Low) | Mitigation: Use Brevo/SendGrid with reputation monitoring. SPF/DKIM/DMARC. |
|---|---|---|

---

### RISK-025: Localization (Arabic Number Formatting)

| Score | **3** (Low) | Mitigation: Use proven libraries. Test all reports. |
|---|---|---|

---

### RISK-026: SSL Certificate Expiry

| Score | **4** (Low) | Mitigation: Let's Encrypt auto-renewal. Alerts at 30 days before. |
|---|---|---|

---

### RISK-027: Dependency Conflicts on Updates

| Score | **6** (Medium) | Mitigation: Pin versions. Test updates in staging. Dependabot for security. |
|---|---|---|

---

### RISK-028: Print Layout Issues for Reports

| Score | **4** (Low) | Mitigation: Generate PDFs server-side. Test on real printers. |
|---|---|---|

---

## 3. Risk Summary Dashboard

### 3.1 Risk Distribution by Category

| Category | Count | Highest Score |
|---|---|---|
| Technical | 8 | 16 |
| Schedule | 4 | 16 |
| Quality | 5 | 12 |
| Security | 3 | 12 |
| Operations | 7 | 12 |
| Stakeholder | 2 | 16 |
| Regulatory | 1 | 12 |
| External | 2 | 9 |

### 3.2 Top 5 Risks Requiring Active Management

1. **RISK-004** — Team Learning Curve (Score: 16)
2. **RISK-005** — Scope Creep (Score: 16)
3. **RISK-006** — Excel Migration Quality (Score: 12)
4. **RISK-007** — ZKTeco Integration (Score: 12)
5. **RISK-011** — Approval Engine Complexity (Score: 12)
6. **RISK-012** — SoD Conflict Detection (Score: 12)

### 3.3 Risks Requiring Sponsor Awareness

- RISK-001 (Financial Errors) — Catastrophic if occurs
- RISK-002 (Data Loss) — Catastrophic if occurs
- RISK-003 (Security Breach) — Catastrophic if occurs

---

## 4. Risk Review Cadence

| Cadence | Activity | Participants |
|---|---|---|
| Daily | Identify new risks during standup | All team |
| Weekly | Review top 6 risks with mitigation status | Tech Lead, QA |
| Bi-weekly | Update full risk register | Tech Lead |
| Monthly | Sponsor briefing on critical risks | Tech Lead, Principal |
| Per Phase | Risk review at phase boundaries | All team + School |

---

## 5. Risk Triggers and Early Warning Indicators

| Indicator | Triggers Risk |
|---|---|
| 3+ days behind schedule on a task | RISK-004 (Learning curve) |
| 2+ feature requests outside scope per week | RISK-005 (Scope creep) |
| 10%+ of imported records have errors | RISK-006 (Migration quality) |
| ZKTeco sync failures > 5% | RISK-007 (Integration) |
| Page load > 3 seconds in testing | RISK-008 (Performance) |
| Internet downtime at school > 2 hours/week | RISK-009 (Outage) |
| Approval engine bug in critical workflow | RISK-011 (Engine complexity) |
| 3+ false positive SoD blocks per week | RISK-012 (SoD detection) |
| Failed test coverage check in CI | RISK-014 (Testing) |
| User reports configuration confusion | RISK-015 (Config errors) |
| Bus rental invoice dispute | RISK-018 (Rental issues) |
| Enrollment workflow > 7 days average | RISK-020 (Enrollment bottleneck) |

---

## 6. Lessons Learned (Updated as Project Progresses)

| Date | Event | Lesson | Action Taken |
|---|---|---|---|
| TBD | TBD | TBD | TBD |

---

*End of Risk Register*

> **Related Documents:**
> - `02_PROJECT_CHARTER.md` — Project foundation
> - `01_EXECUTIVE_SUMMARY.md` — High-level overview
> - `04_ARCHITECTURE.md` — Technical risk context
