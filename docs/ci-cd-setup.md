# CI/CD Setup Guide

## Overview

This project uses GitHub Actions for CI/CD with two workflows:

- **CI** (`ci.yml`): Runs on every PR and push to `main` — linting, type checking, tests, and Docker build verification
- **CD** (`cd.yml`): Runs on push to `main` — deploys frontend to GitHub Pages, pushes Docker image to GHCR, and runs database migrations

## Required GitHub Secrets

Go to: `Repository → Settings → Secrets and variables → Actions`

| Secret | Description |
|--------|-------------|
| `PRODUCTION_DATABASE_URL` | PostgreSQL connection string for production (e.g. `postgresql://user:pass@host:5432/db`) |
| `VITE_API_URL` | Backend API base URL used during frontend build (e.g. `https://api.yourdomain.com`) |

> `GITHUB_TOKEN` is provided automatically by GitHub — no action needed.

## GitHub Environment Setup

The `migrate` job in CD requires a `production` environment with manual approval:

1. Go to: `Repository → Settings → Environments → New environment`
2. Name: `production`
3. Enable **Required reviewers** and add yourself
4. This ensures database migrations require manual approval before running

## Branch Protection (main)

Go to: `Repository → Settings → Branches → Add branch protection rule`

- Branch name pattern: `main`
- ✅ Require a pull request before merging
- ✅ Require status checks to pass before merging
  - Add: `Frontend — Lint, Type-check, Build, Test`
  - Add: `Backend — Type-check, Build, Test`
  - Add: `Docker — Build Backend Image`
- ✅ Require branches to be up to date before merging
- ✅ Do not allow bypassing the above settings

## CI Jobs

### `frontend-checks`
- Lints with ESLint
- Type-checks with `tsc --noEmit`
- Runs Vitest unit tests
- Builds with Vite

### `backend-checks`
- Spins up a real PostgreSQL 16 container
- Runs Prisma migrations against it
- Type-checks with `tsc --noEmit`
- Runs Jest unit tests

### `docker-build`
- Builds the backend Docker image to verify it compiles correctly
- Does NOT push on PRs

## CD Jobs

### `deploy-frontend`
- Builds the React app with Vite
- Deploys to GitHub Pages via `gh-pages`

### `build-and-push`
- Builds multi-stage Docker image for the backend
- Pushes to GHCR with two tags: `latest` and `sha-<commit-sha>`
- Image: `ghcr.io/<owner>/<repo>/school-server`

### `migrate`
- Requires `production` environment approval
- Runs `prisma migrate deploy` against the production database
- Only runs after the Docker image is successfully pushed

## Local Development

```bash
# Run frontend + backend together
npm run dev

# Run frontend only
npm run client

# Run tests
npm test                    # frontend tests (Vitest)
cd server && npm test       # backend tests (Jest)

# Type check
npx tsc --noEmit -p tsconfig.app.json   # frontend
cd server && npx tsc --noEmit           # backend
```
