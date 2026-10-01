# Recommendation engine

Recommendations are decision support, not automation authority.

## Recommendation contract

Each recommendation contains:

- proposed change
- reason
- affected entities
- estimated impact
- constraints satisfied
- constraints violated, if any
- status: Pending / Approved / Rejected / Superseded
- created and resolved timestamps

## Candidate generation

For an employee overlap, generate candidates such as:

1. another qualified employee with capacity
2. a task move to a compatible slot
3. a project-priority adjustment
4. a task split when domain rules permit it

For equipment conflicts, generate a schedule move or compatible alternative equipment candidate.

## Approval model

The API re-validates the recommendation at approval time. Never trust that a recommendation generated ten minutes ago is still safe. A new conflict or changed availability can make it stale.

Approval should run in a transaction and write an immutable audit event.
