# Project Charter — El Shorouk School Management System

> **Document Type:** Project Charter (PMI-aligned)
> **Status:** Draft v2.0 — Pending School Approval
> **Date:** May 2026
> **Document Owner:** Project Tech Lead

---

## 1. Project Identification

| Attribute | Value |
|---|---|
| Project Name | El Shorouk School Management System (ESSMS) |
| Project Code | ESSMS-2026 |
| Project Sponsor | El Shorouk School Administration |
| Project Tech Lead | [To Be Assigned] |
| Start Date | Week 1 of development |
| Target MVP-1 Go-Live | End of Month 7 |
| Target Phase 2 Completion | End of Month 13 |
| Project Type | Custom Software Development (Single-Tenant) |
| Methodology | Hybrid: Spec-Driven + Iterative + Phased Delivery |

---

## 2. Business Case

### 2.1 Current State (As-Is)

El Shorouk School currently operates with these pain points:
- Fragmented Excel-based operations across departments
- No single source of truth for student data
- Manual financial reconciliation prone to errors
- No audit trail for sensitive operations
- Limited remote access for staff
- High risk of data loss
- Inefficient cross-department workflows
- Manual payroll calculations

### 2.2 Future State (To-Be)

A unified, secure, web-based system delivering:
- Single source of truth for all data
- **Configurable approval workflows** managed by school administration
- Real-time financial accuracy with daily reconciliation
- Complete audit trail
- Anywhere access for authorized staff
- Robust backup and disaster recovery
- **Self-service configuration** by school admin without developer involvement
- Role flexibility (one person can hold multiple roles, easy split when school grows)

### 2.3 Quantifiable Benefits

| Benefit | Estimated Value |
|---|---|
| Time saved in fee calculation and reconciliation | ~80 hours/month |
| Time saved in payroll processing | ~40 hours/month |
| Reduction in financial discrepancies | Target: zero unresolved |
| Reduction in inventory loss/theft | Target: <0.5% of inventory value |
| Reduction in commercial software costs | $750-1,500/month → $25-35/month |
| Self-service approval policy changes | 95% (vs. requiring developers) |
| Improvement in audit response time | Days → minutes |

---

## 3. Project Objectives

### 3.1 SMART Objectives

| # | Objective | Measure | Target Date |
|---|---|---|---|
| 1 | Replace Excel-based student management | 100% of students managed in system | End of Month 4 |
| 2 | Automate fee collection and tracking | All fees calculated & tracked | End of Month 4 |
| 3 | Implement daily cashier reconciliation | Zero discrepancies for 30 days | End of Month 5 |
| 4 | Centralize 4 inventory divisions | All divisions operational | End of Month 5 |
| 5 | Manage 50 buses and 80 routes | All routes in system with rental contracts | End of Month 6 |
| 6 | Automate payroll for 100 employees | First fully automated month | End of Month 7 |
| 7 | Configurable approval workflows operational | Admin can create/modify workflows from UI | End of Month 1 |
| 8 | Achieve 99% uptime during business hours | Measured monthly | Ongoing |
| 9 | Migrate all historical data from Excel | 100% with quality reports | End of Month 7 |

### 3.2 Success Metrics

**Technical:**
- P95 response time < 2 seconds
- Test coverage > 80% for financial logic, > 60% overall
- Zero critical security vulnerabilities at Go-Live
- Daily backup success rate > 99%

**Business:**
- User satisfaction (CSAT) ≥ 4/5
- Reduction in time-to-process common operations ≥ 50%
- Self-service configuration changes ≥ 80% (vs. requiring developers)
- 95% of approval policy changes done via UI (no code change)

**Operational:**
- Incident response time < 4 hours for critical issues
- Mean Time To Recovery (MTTR) < 2 hours

---

## 4. Project Scope

### 4.1 In Scope (MVP-1)

| Module | Key Features |
|---|---|
| **Authentication & Users** | Login, 2FA for sensitive roles, session management |
| **RBAC** | Dynamic roles, configurable permissions, role composition, audit |
| **Configuration Engine** | System settings, business rules, parameters |
| **Configurable Approval Workflow Engine** | Create/modify/version/test workflows from UI |
| **Students** | Full enrollment workflow, lifecycle, family relations, history, Student 360° |
| **Fees** | Structures, two-tier discounts (basic + additional), installments |
| **Cashier** | Daily open/close cycle, transactions, receipts |
| **Accounting** | Receivables, payments, reconciliation |
| **Inventory** | 4 divisions (extensible), full purchase-to-issue cycle, profitability |
| **Transport** | Routes, fully-rented buses, rental contracts, 3 rider types, mid-year changes |
| **HR & Payroll** | Employee data, attendance (ZKTeco), leaves, loans, payroll, tax, insurance, bus deductions |
| **Reports** | Financial, HR, inventory, transport, 360° student |
| **Audit Log** | Complete trail of sensitive operations |
| **Data Migration** | Excel import tools and templates |

### 4.2 Out of Scope (Phase 2)

| Module | Phase |
|---|---|
| Student attendance devices integration | Phase 2A |
| Academic process (curriculum, classes, grades) | Phase 2B |
| Mobile applications (Parent + Employee) | Phase 2C |

### 4.3 Permanently Out of Scope

The following are explicitly **not** part of this project:

- Online payment gateway integration
- Library management
- Cafeteria/canteen management
- Online learning platform / LMS
- Government reporting integration
- Multi-school support (single-tenant only)
- Bus ownership management at deep level (current: rental only, but architecture supports adding ownership)
- Bus depreciation accounting (Phase 2 if needed)

---

## 5. Stakeholders

### 5.1 Stakeholder Register

| Stakeholder | Role | Interest | Influence | Engagement Strategy |
|---|---|---|---|---|
| School Owner | Sponsor | High | High | Bi-weekly executive briefing |
| School Principal | Decision Maker | High | High | Weekly review meetings |
| Chief Accountant | SME (Finance) | High | High | Daily during 1A |
| Accountant | SME (Daily Finance, Transport, Procurement) | High | High | Daily during 1A, 1C |
| Cashier | SME (Treasury) | Medium | Medium | Daily during 1A |
| HR Manager | SME (HR, Payroll) | High | High | Daily during 1D |
| Warehouse Manager | SME (Inventory) | Medium | Medium | Sessions during 1B |
| Student Affairs Officer | SME (Students, Stages) | High | High | Daily during 1A |
| IT Support | Operations | Medium | Low | Training before Go-Live |
| Teachers | End Users (Phase 2) | Medium | Low | Training in Phase 2B |
| Parents | End Users (Phase 2) | Low | Low | Communication near Go-Live |
| Students | Beneficiaries | Low | Low | Indirect (via parents) |

### 5.2 Communication Plan

| Audience | Format | Frequency |
|---|---|---|
| Sponsor & Principal | Executive summary report | Bi-weekly |
| Department Managers | Working session + demo | Weekly |
| Project Team | Standup | Daily |
| Project Team | Sprint review | Bi-weekly |
| All Staff | Town hall presentation | Major milestones |

---

## 6. System Administrator Role (Development Team)

### 6.1 Authority

The System Administrator role is held by the **development team** (us) for technical maintenance purposes.

**Authorities:**
- Read access to all data for debugging and maintenance
- Execute database migrations
- Deploy code updates
- Manage backups and restoration
- Access server logs and infrastructure
- Modify system-level configurations

**Restrictions:**
- ❌ Cannot modify business data manually except in emergencies (requires Principal approval)
- ❌ Cannot bypass audit logs
- ❌ Cannot create user accounts for non-team members
- ❌ Cannot change financial transactions

### 6.2 Audit and Accountability

- All System Administrator actions are logged with full audit trail
- Quarterly audit log review with the Principal
- Two-person rule for sensitive database operations (e.g., bulk data changes)
- Emergency access procedure documented and approved

### 6.3 Knowledge Transfer

- Complete documentation handed to school IT at Go-Live
- Training for school IT to perform basic maintenance
- Support contract terms (response time, SLAs) defined separately

---

## 7. Project Constraints

### 7.1 Time Constraints

- **Hard Deadline:** None imposed externally
- **Soft Deadline:** MVP-1 Go-Live before next academic year start
- **Phase 2 Target:** Within 13 months of project start

### 7.2 Budget Constraints

- **Monthly operating budget:** $25-35 USD/month
- **One-time hardware budget:** 8,500-17,500 EGP
- **Development cost:** Internal (4-person team)

### 7.3 Resource Constraints

- **Team size:** 4 developers + Claude Code AI augmentation
- **Skill levels:** Strong Python, learning Django/Next.js
- **Tech Lead:** Available with Java/Python/SQL/Spec Kit experience

### 7.4 Technical Constraints

- Must work in Arabic (RTL) primarily, with English support
- Must run on modest VPS hardware
- Must support offline operation for school's local network
- Must integrate with ZKTeco devices (extensible to others)
- Egyptian regulatory compliance
- All approval workflows must be configurable (no hardcoding)

### 7.5 Organizational Constraints

- Single-tenant architecture
- No external integrations with government systems initially
- Cash and bank transfer payments only

---

## 8. Project Assumptions

| # | Assumption | Risk if False |
|---|---|---|
| 1 | School will provide complete data for migration | Major delay |
| 2 | School staff available for weekly working sessions | Slower requirements |
| 3 | ZKTeco devices use standard SDK | Custom integration |
| 4 | Internet at school reasonably stable (>95%) | Need aggressive offline mode |
| 5 | Team reaches Django/Next.js productivity in 3 weeks | Schedule slippage |
| 6 | Egyptian tax/insurance laws stable during project | Recalculation needed |
| 7 | School dedicates power user for testing each module | Slower acceptance |
| 8 | VPS delivers advertised performance | May need higher tier |
| 9 | School provides Mini-PC and network access | Delays ZKTeco integration |
| 10 | Mobile apps in Phase 2 are nice-to-have | Affects Phase 2 flexibility |
| 11 | Bus rental companies provide invoices in usable format | Manual data entry |
| 12 | Approval workflows can be designed with school in first 3 weeks | Engine delays |

---

## 9. Project Deliverables

### 9.1 MVP-1 Deliverables

**Software:**
1. Production web application
2. Mini-PC sync agent installed
3. Complete source code in private GitHub repository
4. Database with full schema and migrations
5. CI/CD pipeline with automated testing and deployment

**Documentation:**
1. User manuals (Arabic) per role
2. Administrator guide for system configuration
3. **Approval workflow management guide** (Arabic)
4. Technical documentation (API, architecture, schema)
5. Operations runbook
6. Disaster recovery procedure

**Training:**
1. Train-the-trainer sessions
2. Role-based training videos (Arabic)
3. Quick reference cards
4. **Approval workflow administration training** for Principal and Chief Accountant

**Data:**
1. All historical data migrated and validated
2. Data migration audit report
3. Parallel run reconciliation report

### 9.2 Phase 2 Deliverables

**Software:**
1. Student attendance integration
2. Academic module
3. Parent mobile app (iOS + Android)
4. Employee mobile app (iOS + Android)

**Documentation & Training:**
1. Updated user manuals
2. Mobile app user guides
3. Teacher training materials

---

## 10. Major Milestones

| Milestone | Target Date | Definition of Done |
|---|---|---|
| **M1: Project Kickoff** | Week 0 | Charter signed, team onboarded, infrastructure provisioned |
| **M2: Foundation + Approval Engine Complete** | Week 3 | Auth, RBAC, Approval Engine operational |
| **M3: Administrative Core Live** | Week 13 | Students + Fees + Cashier + Accounting in UAT |
| **M4: Inventory Operational** | Week 18 | All 4 divisions accepting transactions |
| **M5: Transport Operational** | Week 22 | All routes, rental contracts, subscriptions |
| **M6: HR & Payroll Operational** | Week 28 | First successful automated payroll run |
| **M7: MVP-1 Go-Live** | Week 30 | School operates daily on system |
| **M8: Stabilization Complete** | Week 34 | 30 days post-launch with <5 critical issues |
| **M9: Phase 2A Complete** | Week 38 | Student attendance live |
| **M10: Phase 2B Complete** | Week 48 | Academic module operational |
| **M11: Phase 2C Complete** | Week 56 | Mobile apps published |

---

## 11. Project Governance

### 11.1 Decision-Making Authority

| Decision Type | Authority |
|---|---|
| Technical architecture | Tech Lead |
| Scope changes (within phase) | Tech Lead + School Principal |
| Scope changes (cross-phase) | School Sponsor |
| Budget changes | School Sponsor |
| Schedule changes (>1 week) | School Principal + Tech Lead |
| Production deployments | Tech Lead with QA approval |
| **Approval workflow definitions (post Go-Live)** | **School Principal** |
| **Permission catalog modifications** | **School Principal + Tech Lead** |
| Configuration changes | School Administrator |
| Role creation/modification | School Principal |
| Delegation assignments | School Principal |

### 11.2 Change Management Process

Any change request goes through:

1. **Submission:** Written request to Tech Lead with rationale
2. **Impact Analysis:** Tech Lead assesses time, cost, risk
3. **Decision:** Per authority matrix above
4. **Documentation:** Change logged with approval
5. **Implementation:** Updated plan and execution

### 11.3 Quality Assurance Standards

- **Code Reviews:** Mandatory for every PR
- **Automated Tests:** Min 80% coverage for financial logic, 60% overall
- **Manual UAT:** Required before each module Go-Live
- **Security Review:** Required before MVP-1 Go-Live
- **Performance Testing:** Required before MVP-1 Go-Live

### 11.4 Escalation Path

```
Level 1: Within team (Daily standup)
   ↓ If unresolved in 24h
Level 2: Tech Lead intervention
   ↓ If unresolved in 48h
Level 3: School Principal involvement
   ↓ If unresolved in 1 week
Level 4: School Sponsor decision
```

---

## 12. Risk Management Approach

### 12.1 Risk Categories

- **Technical:** Architecture, performance, security, integration
- **Schedule:** Estimation accuracy, dependencies, resources
- **Quality:** Bugs, performance issues, usability
- **Stakeholder:** Adoption, satisfaction, change resistance
- **External:** Internet outages, hardware failure, regulatory changes

### 12.2 Risk Review Cadence

- **Weekly:** New risks identified during work
- **Bi-weekly:** Risk register review and reprioritization
- **Monthly:** Sponsor briefing on top risks

A complete Risk Register is maintained in `03_RISK_REGISTER.md`.

---

## 13. Acceptance Criteria

### 13.1 MVP-1 Acceptance

The school accepts MVP-1 when:

1. ✅ All modules in MVP-1 scope are functional
2. ✅ All historical data migrated with documented quality
3. ✅ At least 30 days of parallel running with consistent results
4. ✅ All identified critical and high-severity bugs resolved
5. ✅ User training completed for all key roles
6. ✅ Operations runbook delivered and tested
7. ✅ Backup and recovery procedure tested successfully
8. ✅ Performance benchmarks met
9. ✅ Security review shows no high-severity findings
10. ✅ All deliverables in Section 9.1 delivered
11. ✅ **All default approval workflows configured per school's policies**
12. ✅ **Principal can independently create new approval workflows**

### 13.2 Module-Level Acceptance

Each module is accepted when its `Definition of Done` checklist is fully satisfied.

---

## 14. Project Boundaries

### 14.1 Tech Lead Authorities

The Tech Lead **has** authority to:
- Make technical architecture decisions
- Approve PRs and code reviews
- Delegate tasks within the team
- Engage with school stakeholders for clarification
- Manage development environment and tooling

The Tech Lead **does not** have authority to:
- Change scope without approval
- Change budget without approval
- Make commitments to school beyond approved plan
- Hire or fire team members

### 14.2 Boundaries with School

- School provides timely subject matter expertise
- School designates a primary point of contact per module
- School approves deliverables in writing
- School manages user adoption and change management internally
- Project team does NOT directly train end-users beyond train-the-trainer

---

## 15. Success Definition

This project is **successful** when:

1. **Functional Success:** School operates daily on the system
2. **Quality Success:** No critical financial errors in 30 days post Go-Live
3. **Adoption Success:** ≥ 90% of staff actively use system within 60 days
4. **Performance Success:** Meets performance and uptime targets
5. **Self-Sufficiency Success:** School configures most changes without developer help
6. **Workflow Independence:** Principal manages approval workflows without IT
7. **Cost Success:** Operating costs stay within budget
8. **Phase 2 Readiness:** Architecture supports Phase 2 without rework

---

## 16. Sign-Off

This Project Charter requires sign-off from:

| Role | Name | Signature | Date |
|---|---|---|---|
| School Sponsor | _____________ | _____________ | _____ |
| School Principal | _____________ | _____________ | _____ |
| Tech Lead | _____________ | _____________ | _____ |

---

## Appendix A: Glossary

| Term | Definition |
|---|---|
| MVP | Minimum Viable Product |
| RBAC | Role-Based Access Control |
| 2FA | Two-Factor Authentication |
| SoD | Segregation of Duties |
| SSR | Server-Side Rendering |
| RTL | Right-To-Left |
| DRF | Django REST Framework |
| ORM | Object-Relational Mapping |
| API | Application Programming Interface |
| CI/CD | Continuous Integration / Continuous Deployment |
| UAT | User Acceptance Testing |
| UPS | Uninterruptible Power Supply |
| VPS | Virtual Private Server |
| LAN | Local Area Network |
| SLA | Service Level Agreement |
| MTTR | Mean Time To Recovery |
| CSAT | Customer Satisfaction Score |
| Pro-rata | Proportional calculation based on time elapsed |

---

*End of Project Charter*

> **Related Documents:**
> - `01_EXECUTIVE_SUMMARY.md` — High-level overview
> - `03_RISK_REGISTER.md` — Detailed risk management
> - `04_ARCHITECTURE.md` — Technical design
> - `06_USER_ROLES_AND_PERMISSIONS.md` — Detailed roles and permissions
