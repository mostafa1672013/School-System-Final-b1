# Feature Specification: Architecture Alignment to ARCHITECTURE.md (Single-Tenant)

**Feature Branch**: `002-architecture-alignment`

**Created**: 2026-05-29

**Input**: User description: "change Architecture based for Architecture.md in claude folder" → refined to: apply the architecture as a **single-tenant** deployment (one school per installation), replacing the multi-tenant framing.

## Overview

The project's authoritative architecture document (`ARCHITECTURE.md`) describes a set
of structural and safety guarantees: bounded-context modules that talk only through
public interfaces, a two-layer audit trail (application + database), a
configuration-driven approval engine, and explicit performance/security targets. The
document also describes multi-tenant isolation via shared-database row-level security.

This feature aligns the running system to the **principles** of `ARCHITECTURE.md` for a
**single-tenant** deployment model: each installation serves exactly one school. As a
result, cross-tenant isolation (shared-database RLS, per-request tenant resolution,
super-admin bypass) is **explicitly dropped** from scope. Every other architectural
guarantee — auditability, module boundaries, configurable approval routing, security
defense-in-depth, and performance targets — still applies and is the focus of this
work. Within the single school, correctness of role-based access control replaces
tenant isolation as the top data-protection concern.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Users only see and do what their role permits (Priority: P1)

As the school director, I need every user to be able to read and change only the data
and actions their assigned role permits, so that, for example, a cashier cannot alter
permissions and a teacher cannot view payroll. With a single school there is no
cross-school boundary, so role-based access control is the primary protection of
sensitive data.

**Why this priority**: In a single-tenant deployment, the dominant data-protection risk
is a user exceeding their authority within the one school. Access-control correctness
is the highest-value guarantee and underpins financial and audit integrity.

**Independent Test**: For each role, attempt every protected action and data view; the
user can perform exactly the actions their role grants and is denied all others,
including threshold-bound actions (e.g., approving a discount above their limit).

**Acceptance Scenarios**:

1. **Given** a user with a limited role, **When** they attempt an action outside their
   permissions, **Then** the action is denied and no data is changed.
2. **Given** a role with an approval threshold, **When** the user acts on a request
   above that threshold, **Then** the action is denied and routed per configuration.
3. **Given** a change to a role's permissions in configuration, **When** an affected
   user next acts, **Then** their allowed actions reflect the updated permissions
   without any code change.

---

### User Story 2 - Every sensitive change is captured even if the app misses it (Priority: P1)

As a finance/compliance stakeholder, I need every change to money, students,
permissions, and configuration recorded in a tamper-evident audit trail, with a
database-level safety net that captures changes even when they bypass the normal
application path (e.g., direct database edits or admin tooling).

**Why this priority**: The architecture mandates a two-layer audit (application for rich
context + database safety net). The shipped system has only the application layer, so any
change that skips the app is invisible. Auditability is a non-negotiable principle and
does not depend on tenancy model.

**Independent Test**: Make a sensitive change through the normal application flow and
confirm a rich audit entry (actor, before/after, reason) exists. Then make an equivalent
change directly at the data layer, bypassing the application, and confirm the safety-net
layer still recorded it.

**Acceptance Scenarios**:

1. **Given** a financial record is modified through the application, **When** the change
   commits, **Then** an audit entry records actor, role, before-state, after-state,
   timestamp, and reason.
2. **Given** a record on an audited table is changed outside the application path,
   **When** the change commits, **Then** the database safety-net layer records the change
   with table, operation, identifiers, and timestamp.
3. **Given** any audit entry, **When** it is reviewed, **Then** it cannot be silently
   altered or deleted without detection.

---

### User Story 3 - Modules interact only through clear boundaries (Priority: P2)

As a maintainer, I need each business area (students, fees, cashier, accounting,
inventory, etc.) to expose a defined public interface and to be reached only through
that interface, so that internal changes in one area cannot silently break another and
the system stays understandable as it grows.

**Why this priority**: The architecture defines bounded contexts with public-API-only
interaction. Enforcing boundaries reduces regression risk and keeps the modular monolith
maintainable. Important, but lower immediate risk than access control and audit.

**Independent Test**: Inspect cross-area interactions; confirm each area is reached only
through its declared public interface and never by reaching into another area's internals
or data tables directly. Changing an internal detail of one area does not require edits
in unrelated areas.

**Acceptance Scenarios**:

1. **Given** two business areas, **When** one needs data or behavior from the other,
   **Then** it obtains it only through the other's published interface.
2. **Given** a change to an area's internal data shape, **When** the change is made,
   **Then** no unrelated area requires modification.

---

### User Story 4 - Configurable approval routing instead of hardcoded rules (Priority: P2)

As a school administrator, I need approval routing (who must approve a discount, an
adjustment, etc., and at what thresholds) to be driven by configuration I can change,
rather than rules fixed in code, matching the configuration-over-code principle and the
approval-engine design in the architecture.

**Why this priority**: Configuration-over-code is a core project principle and the
approval engine is described as the system's "killer feature." Where routing is
currently hardcoded, it must move to configuration.

**Independent Test**: Change an approval threshold or approver assignment through
configuration only (no code change) and confirm a subsequent request routes to the new
approver. Multi-step and threshold-based routing resolve correctly from configuration.

**Acceptance Scenarios**:

1. **Given** an approval rule defined in configuration, **When** a request meeting its
   condition is submitted, **Then** it routes to the configured approver(s).
2. **Given** a threshold is changed in configuration, **When** a new request is
   submitted, **Then** routing reflects the new threshold without any code change.

---

### User Story 5 - The system meets its stated performance and security targets (Priority: P3)

As the school director, I need the system to meet the architecture's defined targets for
responsiveness under expected load and to apply its defined defense-in-depth security
layers, so staff have a fast, safe experience.

**Why this priority**: Performance and security targets are defined in the architecture
and protect the user experience and data, but they build on top of the access-control,
audit, and structural guarantees above.

**Independent Test**: Under the architecture's stated concurrency and data-volume
assumptions, measured responsiveness meets the documented targets, and each defined
security layer (input validation, authentication, rate limiting, secret handling,
encryption of sensitive identifiers) is present and active.

**Acceptance Scenarios**:

1. **Given** the expected number of concurrent school users, **When** they use list and
   report screens, **Then** responses meet the architecture's stated responsiveness
   targets.
2. **Given** sensitive personal identifiers, **When** they are stored, **Then** they are
   protected at rest as the architecture requires.

---

### Edge Cases

- How does the system behave if the database-level audit safety net is temporarily
  unavailable — is the sensitive operation blocked, or recorded for later, and is that
  choice consistent with financial-accuracy guarantees?
- How is a configuration rule with no matching approval step handled (no approver
  resolves)?
- How does boundary enforcement treat existing cross-area access that currently bypasses
  public interfaces — is it migrated, wrapped, or flagged?
- What happens to any tenant-scoping fields/logic that exist in the current data and code
  now that the deployment is single-tenant — are they removed, retained as inert, or
  fixed to a single constant value?
- How is a brand-new installation initialized for its one school (the single set of roles,
  permissions, fee types, and approval workflows) without a tenant-provisioning step?

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The system MUST treat each installation as serving exactly one school; it
  MUST NOT require, expose, or depend on cross-tenant isolation, per-request tenant
  resolution, or a super-admin cross-tenant bypass.
- **FR-002**: The system MUST enforce role-based access control so that each user can
  perform only the actions and view only the data their assigned role permits, including
  threshold-bound actions.
- **FR-003**: Role and permission assignments MUST be defined in configuration and
  resolved at runtime, with no hardcoded role checks governing access decisions.
- **FR-004**: The system MUST record a rich application-level audit entry — actor, role,
  before-state, after-state, timestamp, and reason (where required) — for every change to
  money, student status/fees, permissions, and configuration.
- **FR-005**: The system MUST additionally capture changes to audited records via a
  database-level safety net that records changes even when the application path is
  bypassed.
- **FR-006**: Audit records MUST be tamper-evident; silent alteration or deletion MUST be
  detectable.
- **FR-007**: Each business area MUST expose a defined public interface, and all
  cross-area interaction MUST occur only through that interface — never by accessing
  another area's internal data directly.
- **FR-008**: Approval routing rules (conditions, thresholds, approvers, multi-step
  sequences) MUST be defined in configuration and resolved at runtime, with no hardcoded
  approver or threshold logic.
- **FR-009**: The system MUST validate all external input at its boundaries and apply the
  architecture's defined security layers (authentication on protected paths, rate
  limiting, required secrets with no insecure fallback, encryption of sensitive personal
  identifiers at rest).
- **FR-010**: The alignment MUST NOT change financial totals, existing audit history, or
  permission outcomes except where a change is the explicit, reviewed intent.
- **FR-011**: Any existing multi-tenant scoping in data or logic MUST be resolved to a
  defined single-tenant outcome (removed or fixed to a single constant) without breaking
  existing data or financial correctness.
- **FR-012**: A new installation MUST be initializable for its single school (baseline
  roles, permissions, fee types, and approval workflows) without a tenant-provisioning
  step.
- **FR-013**: The system MUST meet the architecture's documented responsiveness targets
  under its stated concurrency and data-volume assumptions.
- **FR-014**: A documented, repeatable verification MUST exist proving access-control
  correctness, audit coverage (both layers), boundary conformance, and configurable
  approval routing.

### Key Entities *(include if feature involves data)*

- **School (single)**: The one organization a given installation serves; all data belongs
  to it implicitly, with no cross-organization boundary.
- **User / Role / Permission Assignment**: A user holds one or more roles; each role grants
  a configurable set of permissions (optionally threshold-bound). Access decisions resolve
  from these at runtime.
- **Audit Entry**: A record of a sensitive change, capturing actor, role, action, entity
  type and identifier, before/after state, reason, and timestamp; exists in both an
  application-context form and a database-safety-net form.
- **Approval Workflow / Step / Request / Decision**: Configuration-defined routing rules
  (workflow + ordered conditional steps), the pending requests they generate, and the
  recorded decisions that resolve them.
- **Business Area Module**: A bounded context (e.g., students, fees, cashier, accounting,
  inventory) with a published public interface and private internals.
- **Sensitive Identifier**: Personal data (e.g., national identifiers, bank details) that
  must be protected at rest.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: For every role, 100% of permitted actions succeed and 100% of non-permitted
  actions are denied, including threshold-bound cases — verified across all protected
  paths.
- **SC-002**: 100% of sensitive changes made through the application produce a complete
  audit entry; 100% of equivalent changes made outside the application path are still
  captured by the safety-net layer.
- **SC-003**: 100% of cross-area interactions occur through published interfaces; zero
  direct accesses into another area's internals or data remain.
- **SC-004**: An approval threshold, approver, or role permission can be changed and take
  effect with zero code changes, verified end-to-end.
- **SC-005**: Under the architecture's stated concurrent-user and data-volume
  assumptions, 95% of list and report interactions complete within the documented
  responsiveness target with zero data-store connection-exhaustion errors.
- **SC-006**: After alignment, financial totals, historical audit entries, and permission
  outcomes are unchanged except where explicitly intended, demonstrated by a green
  regression pass.
- **SC-007**: All sensitive personal identifiers are stored protected at rest, with zero
  such fields stored in plain readable form.
- **SC-008**: A clean installation can be brought to a working single-school baseline with
  no tenant-provisioning step.

## Assumptions

- **Single-tenant deployment**: Each installation serves exactly one school. Multi-tenant
  isolation (shared-database row-level security, per-request tenant resolution,
  super-admin cross-tenant bypass) described in `ARCHITECTURE.md` is deliberately **out of
  scope** for this deployment model. Serving multiple schools later would be a separate,
  constitution-governed decision.
- **Stack is preserved, not replaced**: This feature aligns the system to the *principles*
  of `ARCHITECTURE.md` on the currently shipped platform. A literal re-platform to the
  document's named technologies (web framework, ORM, auth provider, background-job system,
  object store) is out of scope and requires a separate recorded migration decision.
- **ARCHITECTURE.md is the target**: Where the document and the shipped reality differ,
  the document defines the desired end-state for the in-scope principles; the shipped code
  is the current state to be changed.
- **Existing tenant fields**: Any tenant identifier currently present in data or code is
  treated as legacy to be removed or pinned to a single value; historical data must remain
  readable and financially correct after the change.
- **MVP volumes**: Concurrency and data volumes follow the architecture's stated MVP
  assumptions for one school (tens of concurrent users; up to a few thousand students).
- **Verification is required**: A repeatable verification procedure for access control,
  audit, boundaries, and approval configurability is part of the deliverable.
