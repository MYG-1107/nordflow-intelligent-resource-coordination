# Conflict detection engine

The conflict engine is deterministic and explainable. AI may assist with natural-language explanations later, but it does not become the source of truth.

## Detection passes

1. Employee overlap: compare assignment intervals for the same employee.
2. Equipment overlap: compare equipment intervals and location commitments.
3. Skill/certification: verify the employee has the required skill/certification.
4. Availability: compare assignment dates/windows with availability records.
5. Working-hour policy: aggregate planned hours against the configured organizational policy.
6. Location: detect incompatible physical-site requirements.
7. Deadline risk: compare project health, remaining work and deadline proximity.
8. Utilization: surface high-load resources before further allocation.
9. Budget: flag projects above configured spend thresholds.
10. Maintenance: block or warn against equipment assignment during maintenance windows.

## Explanation contract

Every conflict stores:

- conflict type
- severity
- affected resources
- affected projects
- time period
- plain-language explanation
- detection timestamp
- current status

## Algorithm shape

```text
load impacted assignments
→ group by resource
→ sort intervals by start
→ compare neighboring / candidate overlaps
→ check resource constraints
→ evaluate project constraints
→ emit stable conflict IDs
→ upsert conflict records
→ enqueue recommendation generation
```

The production version should make every rule testable independently and should record the rule version that produced a conflict so historical decisions remain explainable.
