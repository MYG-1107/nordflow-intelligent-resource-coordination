# Engineering trade-offs

## 1. Static GitHub Pages demo vs full production stack
Chosen: static demo for easy portfolio hosting. Trade-off: no trusted server boundary. Production: move auth, database and approvals to an API.

## 2. Modular monolith vs microservices
Chosen: modular monolith. Trade-off: less independent scaling, but much lower operational complexity for a small team.

## 3. Deterministic rules vs opaque AI
Chosen: deterministic rules. Trade-off: less flexible language reasoning, but behavior is testable and explainable.

## 4. Async conflict recalculation vs synchronous every-query evaluation
Chosen: async recalculation plus targeted synchronous validation at write time. Trade-off: eventual UI freshness, but lower request latency and better workload isolation.

## 5. Client-side demo persistence vs server-side database
Chosen: localStorage in the public demo. Trade-off: data is local to one browser only. Production: PostgreSQL with tenant-scoped transactions.

## Database trade-offs

- Normalize authoritative entities; denormalize only measured hotspots.
- Use composite indexes based on real query plans.
- Prefer hard deletes for ephemeral data; soft delete only where history/business semantics justify it.
- Use transactions for multi-row allocation changes.
- Keep audit history append-only.

## Performance considerations

- Paginate high-cardinality API resources.
- Avoid N+1 resource/project lookups.
- Cache stable reference data only when measurement supports it.
- Move heavy conflict/report jobs to workers.
- Separate analytical/reporting workloads from latency-sensitive transactional queries where scale requires it.
