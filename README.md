# NordFlow — Intelligent Work & Resource Coordination Platform

NordFlow is a Norway-focused B2B operations workspace designed to help small and mid-sized teams coordinate employees, projects, equipment, locations, schedules, budgets and delivery capacity.

This repository is intentionally **GitHub Pages ready**. The deployed demo is a browser-only product simulation with real deterministic conflict detection, recommendation generation, local persistence, audit history and CSV reporting.

> Production boundary: GitHub Pages can host the interface, but it does not provide the API/database/queue/authentication infrastructure required by a true multi-tenant SaaS. The `/docs` folder contains the production architecture blueprint for the full-stack version described in the project brief.

## What the demo demonstrates

- Multi-organization workspace switching.
- Resource and project planning for Norwegian locations.
- Deterministic conflict detection: schedule overlap, skill gap, availability, equipment double-booking, deadline risk, budget warning and resource over-utilization.
- Explainable recommendations with human approval/rejection.
- Audit trail for important changes.
- Utilization and cost reporting with CSV export.
- Responsive B2B SaaS UI designed for desktop and mobile.
- Local browser persistence via `localStorage` for demo continuity.
- GitHub Actions deployment to GitHub Pages.

## Norway focus

The sample organizations and operational locations use Oslo, Bergen, Stavanger, Trondheim, Bodø and Tromsø. Currency is shown in NOK. Working-hour policy is configurable in the UI rather than hard-coded as a legal compliance decision.

For a production Norwegian deployment, connect the policy module to the employer's actual employment agreements, collective agreements and applicable requirements; do not treat demo defaults as legal advice.

## Repository structure

```text
.
├── index.html
├── manifest.webmanifest
├── robots.txt
├── .nojekyll
├── assets/
│   ├── css/app.css
│   ├── js/app.js
│   ├── js/data.js
│   ├── js/engine.js
│   ├── js/reports.js
│   └── favicon.svg
├── docs/
│   ├── production-architecture.md
│   ├── data-model.md
│   ├── security-model.md
│   ├── conflict-engine.md
│   ├── recommendation-engine.md
│   └── github-pages.md
├── tests/
│   └── engine.test.mjs
└── .github/workflows/pages.yml
```

## GitHub Pages deployment

1. Create or use a repository named `nordflow-intelligent-resource-coordination`.
2. Drag the contents of this ZIP into the repository root and commit to `main`.
3. In **Settings → Pages**, select **GitHub Actions** as the source.
4. Push to `main`. The included workflow validates the JavaScript and deploys the repository as a static Pages site.
5. Your project site will follow the normal project-pages pattern: `https://MYG-1107.github.io/nordflow-intelligent-resource-coordination/`.

## Local run

Because this uses ES modules, serve it with a small local web server rather than opening `index.html` directly.

```bash
python -m http.server 8080
```

Then open `http://localhost:8080`.

## Demo behavior

The demo starts with intentionally interesting operational conditions. You can switch organizations, inspect conflicts, review recommendations, approve/reject recommendations, create a demo project and export reports. Use **Reset demo** to restore the initial dataset.

## Production architecture target

The project brief calls for Next.js + TypeScript on the frontend, NestJS + REST/WebSockets on the backend, PostgreSQL + Prisma, Redis + a queue such as BullMQ, secure authentication, RBAC, tenant isolation, observability, automated testing, Docker and CI/CD. The architecture documents in this repository preserve that target while keeping the public GitHub Pages demo lightweight.

## Portfolio positioning

This project is intended to demonstrate:

- domain modelling rather than CRUD-only screens
- deterministic business rules
- explainable decision support
- multi-tenant authorization design
- database and API boundaries
- asynchronous processing strategy
- real-time event design
- security testing strategy
- performance considerations
- deployment automation

Do not claim the GitHub Pages demo itself is production-ready. The full production system requires a server-side trust boundary and persistent infrastructure.
