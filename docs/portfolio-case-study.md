# Portfolio case study outline

## Problem
Norwegian project and field-service teams often coordinate scarce people, skills, equipment and locations across overlapping work. Spreadsheet-based planning can make capacity conflicts difficult to see before commitments are made.

## Product response
NordFlow creates a shared planning model and a deterministic decision-support layer. It explains conflicts and proposes alternatives without silently changing schedules.

## Engineering story
The project demonstrates domain modelling, multi-tenancy, authorization, transactional writes, deterministic rules, async processing, real-time updates, testing, observability and CI/CD.

## What to discuss in an interview

- Why a modular monolith before microservices?
- How would you enforce tenant isolation at every query boundary?
- Which overlap queries need indexes?
- What should be synchronous vs asynchronous?
- How do you make recommendation approval safe against stale data?
- How do you make WebSocket updates recoverable after reconnects?
- How would you scale conflict detection as assignment volume grows?
- Which business rules belong in domain services instead of React components?
