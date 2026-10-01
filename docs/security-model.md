# Security model

## Trust boundaries

Browser → TLS → API gateway / reverse proxy → API → PostgreSQL / Redis / worker.

The browser must never be treated as an authority for organization membership, role, pricing, budget values, conflict state or approval decisions.

## Authorization

Implement RBAC for Organization Owner, Administrator, Manager, Project Manager, Employee and Viewer, plus resource-level checks where needed.

Examples:

- Viewer: read-only access within the tenant.
- Employee: view permitted schedules and their own assignments.
- Project Manager: manage assigned project work.
- Manager: manage resources and approve recommendations.
- Administrator: manage tenant configuration and permissions.
- Owner: organization-level administration.

## Required security tests

- cross-tenant object access
- vertical privilege escalation
- resource assignment by unauthorized roles
- recommendation approval by unauthorized roles
- direct object reference tampering
- stale membership/session after role changes

## Operational controls

- password hashing with a modern password KDF
- MFA-ready identity model
- secure cookies/session rotation for browser auth
- input validation at API boundaries
- rate limiting for auth and sensitive endpoints
- secure headers and CSP where compatible
- structured audit events
- secrets outside source control
- dependency scanning in CI
- backups and tested restoration procedures
