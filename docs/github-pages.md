# GitHub Pages deployment guide

GitHub Pages is used here for the public portfolio/demo interface. The repository is deployed as static files through GitHub Actions.

## Configuration

In GitHub:

1. Open the repository.
2. Go to **Settings → Pages**.
3. Under **Build and deployment**, select **GitHub Actions**.
4. Push to `main`.
5. Open the URL printed by the `github-pages` deployment environment.

The workflow is intentionally simple because the demo has no build step. It validates JavaScript modules, uploads the repository as a Pages artifact and deploys it.

## Important production distinction

A true multi-tenant SaaS backend cannot be replaced by GitHub Pages. For production, keep the public web frontend separately deployed and place the API, database, Redis/queue workers and auth service behind a secure server-side boundary.

## Suggested later production hosting

- Web frontend: static hosting / CDN or Next.js hosting
- API: managed container service
- PostgreSQL: managed PostgreSQL with backups and PITR where available
- Redis: managed Redis
- Workers: separate container process using the same domain modules as the API
- Object storage: only when files/exports require durable object storage
- Monitoring: structured logs + metrics + error tracking
