# CI/CD Pipeline Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** إنشاء pipeline CI/CD كامل باستخدام GitHub Actions يغطي الـ linting وtype-checking والبناء والاختبارات والنشر التلقائي للـ frontend والـ backend.

**Architecture:**
- **CI** (على كل PR): lint → type-check → build → unit tests → integration tests
- **CD** (على merge لـ main): بناء Docker image للـ server + نشر الـ frontend على GitHub Pages (موجود بالفعل) + تشغيل Prisma migrations
- **Security**: Dependabot + secret scanning + branch protection rules

**Tech Stack:**
- GitHub Actions (workflows)
- Vitest (اختبارات الـ frontend)
- Jest + Supertest (اختبارات الـ backend API)
- Docker + GitHub Container Registry (GHCR) للـ backend image
- GitHub Pages للـ frontend (deploy موجود بالفعل عبر `gh-pages`)

---

## File Structure

```
.github/
  workflows/
    ci.yml              ← runs on every PR: lint, type-check, build, test
    cd.yml              ← runs on push to main: deploy frontend + backend
    security.yml        ← weekly: dependabot + audit
  dependabot.yml        ← تحديث dependencies تلقائي
src/
  __tests__/            ← اختبارات الـ frontend (Vitest)
    utils.test.ts
server/
  src/
    __tests__/          ← اختبارات الـ backend
      health.test.ts
      auth.test.ts
  jest.config.ts
  jest.setup.ts
vite.config.ts          ← إضافة test config لـ Vitest
Dockerfile              ← لبناء الـ backend (جديد)
.dockerignore
```

---

## Task 1: إعداد Vitest للـ Frontend

**Files:**
- Modify: `vite.config.ts`
- Modify: `package.json`
- Create: `src/__tests__/utils.test.ts`

- [ ] **Step 1: تثبيت Vitest والأدوات المطلوبة**

```bash
npm install -D vitest @vitest/coverage-v8 jsdom @testing-library/react @testing-library/jest-dom @testing-library/user-event
```

- [ ] **Step 2: كتابة الاختبار الأول (failing)**

أنشئ `src/__tests__/utils.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';

// اختبار بسيط للـ cn utility الموجود في src/lib/utils.ts
import { cn } from '@/lib/utils';

describe('cn utility', () => {
  it('merges class names correctly', () => {
    expect(cn('foo', 'bar')).toBe('foo bar');
  });

  it('handles conditional classes', () => {
    expect(cn('base', false && 'hidden', 'visible')).toBe('base visible');
  });

  it('deduplicates tailwind classes', () => {
    const result = cn('p-2', 'p-4');
    expect(result).toBe('p-4');
  });
});
```

- [ ] **Step 3: تشغيل الاختبار للتأكد من الفشل**

```bash
npx vitest run src/__tests__/utils.test.ts
```

Expected: FAIL — "Cannot find package 'vitest'"

- [ ] **Step 4: إضافة Vitest config لـ vite.config.ts**

```typescript
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";

export default defineConfig({
  base: "/",
  server: {
    host: "::",
    port: 8080,
    allowedHosts: true,
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:4000',
        changeOrigin: true,
      },
      '/socket.io': {
        target: 'http://127.0.0.1:4000',
        ws: true,
      }
    }
  },
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/__tests__/setup.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov'],
      include: ['src/**/*.{ts,tsx}'],
      exclude: ['src/__tests__/**', 'src/main.tsx'],
    },
  },
});
```

- [ ] **Step 5: أنشئ setup file**

أنشئ `src/__tests__/setup.ts`:

```typescript
import '@testing-library/jest-dom';
```

- [ ] **Step 6: إضافة scripts في package.json**

في `package.json`، أضف تحت `"scripts"`:

```json
"test": "vitest run",
"test:watch": "vitest",
"test:coverage": "vitest run --coverage",
```

- [ ] **Step 7: تشغيل الاختبار للتأكد من النجاح**

```bash
npm test
```

Expected: PASS — 3 tests passed

- [ ] **Step 8: Commit**

```bash
git add vite.config.ts package.json src/__tests__/
git commit -m "test: setup vitest for frontend with initial utils tests"
```

---

## Task 2: إعداد Jest للـ Backend

**Files:**
- Modify: `server/package.json`
- Create: `server/jest.config.ts`
- Create: `server/jest.setup.ts`
- Create: `server/src/__tests__/health.test.ts`

- [ ] **Step 1: تثبيت Jest وSupertest في server**

```bash
cd server && npm install -D jest ts-jest supertest @types/jest @types/supertest
```

- [ ] **Step 2: كتابة اختبار health check (failing)**

أنشئ `server/src/__tests__/health.test.ts`:

```typescript
import request from 'supertest';

// نستورد الـ app بدون تشغيل listen
// سنحتاج نعمل refactor بسيط في index.ts لتصدير app
import { app } from '../app';

describe('Health Check', () => {
  it('GET /health returns 200', async () => {
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ status: 'ok' });
  });
});
```

- [ ] **Step 3: تشغيل الاختبار للتأكد من الفشل**

```bash
cd server && npx jest src/__tests__/health.test.ts
```

Expected: FAIL — "Cannot find module '../app'"

- [ ] **Step 4: إنشاء jest.config.ts**

```typescript
import type { Config } from 'jest';

const config: Config = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src/__tests__'],
  setupFilesAfterFramework: ['./jest.setup.ts'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },
  collectCoverageFrom: ['src/**/*.ts', '!src/__tests__/**', '!src/index.ts'],
  coverageReporters: ['text', 'lcov'],
  testPathIgnorePatterns: ['/node_modules/', '/dist/'],
};

export default config;
```

- [ ] **Step 5: إنشاء jest.setup.ts**

```typescript
// Reset mocks between tests
beforeEach(() => {
  jest.clearAllMocks();
});
```

- [ ] **Step 6: Refactor server/src/index.ts لتصدير app**

افتح `server/src/index.ts` وأضف في النهاية (قبل سطر `httpServer.listen`):

```typescript
export { app };
```

ثم أضف endpoint الـ health check قبل أي route آخر:

```typescript
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});
```

- [ ] **Step 7: إضافة scripts في server/package.json**

```json
"test": "jest",
"test:coverage": "jest --coverage",
```

- [ ] **Step 8: تشغيل الاختبار للتأكد من النجاح**

```bash
cd server && npm test
```

Expected: PASS — 1 test passed

- [ ] **Step 9: Commit**

```bash
git add server/
git commit -m "test: setup jest for backend with health check test"
```

---

## Task 3: إنشاء Dockerfile للـ Backend

**Files:**
- Create: `Dockerfile` (في جذر المشروع للـ server)
- Create: `.dockerignore`

- [ ] **Step 1: كتابة الاختبار**

تحقق أن الـ Docker build ينجح:

```bash
docker build -f Dockerfile.server -t school-server:test . && echo "BUILD_SUCCESS"
```

Expected: FAIL — "Dockerfile.server not found"

- [ ] **Step 2: إنشاء Dockerfile.server**

```dockerfile
# Build stage
FROM node:20-alpine AS builder

WORKDIR /app

COPY server/package*.json ./
RUN npm ci --only=production=false

COPY server/ ./
RUN npx prisma generate
RUN npm run build

# Production stage
FROM node:20-alpine AS runner

RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 express

WORKDIR /app

COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY server/prisma ./prisma
COPY server/package.json ./

USER express

EXPOSE 3000

CMD ["node", "dist/index.js"]
```

- [ ] **Step 3: إنشاء .dockerignore**

```
node_modules
dist
.env
*.log
.git
.github
src/__tests__
```

- [ ] **Step 4: تشغيل الاختبار**

```bash
docker build -f Dockerfile.server -t school-server:test . && echo "BUILD_SUCCESS"
```

Expected: BUILD_SUCCESS

- [ ] **Step 5: Commit**

```bash
git add Dockerfile.server .dockerignore
git commit -m "build: add multi-stage Dockerfile for backend server"
```

---

## Task 4: إنشاء CI Workflow (الأهم)

**Files:**
- Create: `.github/workflows/ci.yml`

هذا الـ workflow يعمل على كل PR ويفشل إذا فشل أي خطوة.

- [ ] **Step 1: إنشاء مجلد .github/workflows**

```bash
mkdir -p .github/workflows
```

- [ ] **Step 2: كتابة ci.yml**

أنشئ `.github/workflows/ci.yml`:

```yaml
name: CI

on:
  pull_request:
    branches: [main]
  push:
    branches: [main]

concurrency:
  group: ci-${{ github.ref }}
  cancel-in-progress: true

jobs:
  # ─── Frontend ───────────────────────────────────────────────
  frontend-checks:
    name: Frontend — Lint, Type-check, Build, Test
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Lint
        run: npm run lint

      - name: Type check
        run: npx tsc --noEmit -p tsconfig.app.json

      - name: Run tests
        run: npm test

      - name: Build
        run: npm run build

      - name: Upload build artifact
        uses: actions/upload-artifact@v4
        with:
          name: frontend-dist
          path: dist/
          retention-days: 1

  # ─── Backend ────────────────────────────────────────────────
  backend-checks:
    name: Backend — Type-check, Build, Test
    runs-on: ubuntu-latest

    services:
      postgres:
        image: postgres:16-alpine
        env:
          POSTGRES_USER: test_user
          POSTGRES_PASSWORD: test_password
          POSTGRES_DB: test_db
        ports:
          - 5432:5432
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5

    env:
      DATABASE_URL: postgresql://test_user:test_password@localhost:5432/test_db
      JWT_SECRET: test-secret-for-ci-only
      NODE_ENV: test

    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
          cache-dependency-path: server/package-lock.json

      - name: Install server dependencies
        working-directory: server
        run: npm ci

      - name: Generate Prisma client
        working-directory: server
        run: npx prisma generate

      - name: Run Prisma migrations
        working-directory: server
        run: npx prisma migrate deploy

      - name: Type check
        working-directory: server
        run: npx tsc --noEmit

      - name: Run tests
        working-directory: server
        run: npm test

      - name: Build
        working-directory: server
        run: npm run build

  # ─── Docker ─────────────────────────────────────────────────
  docker-build:
    name: Docker — Build Backend Image
    runs-on: ubuntu-latest
    needs: backend-checks

    steps:
      - uses: actions/checkout@v4

      - name: Set up Docker Buildx
        uses: docker/setup-buildx-action@v3

      - name: Build Docker image (no push on PR)
        uses: docker/build-push-action@v5
        with:
          context: .
          file: Dockerfile.server
          push: false
          tags: school-server:ci-test
          cache-from: type=gha
          cache-to: type=gha,mode=max
```

- [ ] **Step 3: التحقق من صحة الـ YAML**

```bash
npx js-yaml .github/workflows/ci.yml > /dev/null && echo "YAML_VALID"
```

Expected: YAML_VALID

- [ ] **Step 4: Commit**

```bash
git add .github/workflows/ci.yml
git commit -m "ci: add CI workflow for frontend and backend checks"
```

---

## Task 5: إنشاء CD Workflow (النشر التلقائي)

**Files:**
- Create: `.github/workflows/cd.yml`

هذا الـ workflow يعمل فقط على push لـ `main` بعد نجاح CI.

- [ ] **Step 1: كتابة cd.yml**

أنشئ `.github/workflows/cd.yml`:

```yaml
name: CD

on:
  push:
    branches: [main]

concurrency:
  group: cd-production
  cancel-in-progress: false

jobs:
  # ─── Deploy Frontend to GitHub Pages ────────────────────────
  deploy-frontend:
    name: Deploy Frontend → GitHub Pages
    runs-on: ubuntu-latest
    permissions:
      contents: write

    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Build
        run: npm run build
        env:
          VITE_API_URL: ${{ secrets.VITE_API_URL }}

      - name: Deploy to GitHub Pages
        run: npm run deploy
        env:
          GH_TOKEN: ${{ secrets.GITHUB_TOKEN }}

  # ─── Build & Push Docker Image ──────────────────────────────
  build-and-push:
    name: Build & Push Backend Image → GHCR
    runs-on: ubuntu-latest
    permissions:
      contents: read
      packages: write

    outputs:
      image-tag: ${{ steps.meta.outputs.tags }}

    steps:
      - uses: actions/checkout@v4

      - name: Set up Docker Buildx
        uses: docker/setup-buildx-action@v3

      - name: Log in to GitHub Container Registry
        uses: docker/login-action@v3
        with:
          registry: ghcr.io
          username: ${{ github.actor }}
          password: ${{ secrets.GITHUB_TOKEN }}

      - name: Extract metadata (tags, labels)
        id: meta
        uses: docker/metadata-action@v5
        with:
          images: ghcr.io/${{ github.repository }}/school-server
          tags: |
            type=sha,prefix=sha-
            type=raw,value=latest

      - name: Build and push
        uses: docker/build-push-action@v5
        with:
          context: .
          file: Dockerfile.server
          push: true
          tags: ${{ steps.meta.outputs.tags }}
          labels: ${{ steps.meta.outputs.labels }}
          cache-from: type=gha
          cache-to: type=gha,mode=max

  # ─── Run Database Migrations ─────────────────────────────────
  migrate:
    name: Run Prisma Migrations
    runs-on: ubuntu-latest
    needs: build-and-push
    environment: production

    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
          cache-dependency-path: server/package-lock.json

      - name: Install server dependencies
        working-directory: server
        run: npm ci

      - name: Generate Prisma client
        working-directory: server
        run: npx prisma generate

      - name: Deploy migrations
        working-directory: server
        run: npx prisma migrate deploy
        env:
          DATABASE_URL: ${{ secrets.PRODUCTION_DATABASE_URL }}
```

- [ ] **Step 2: التحقق من صحة الـ YAML**

```bash
npx js-yaml .github/workflows/cd.yml > /dev/null && echo "YAML_VALID"
```

Expected: YAML_VALID

- [ ] **Step 3: Commit**

```bash
git add .github/workflows/cd.yml
git commit -m "cd: add CD workflow for frontend deploy and backend Docker push"
```

---

## Task 6: إعداد Dependabot

**Files:**
- Create: `.github/dependabot.yml`

- [ ] **Step 1: كتابة dependabot.yml**

أنشئ `.github/dependabot.yml`:

```yaml
version: 2

updates:
  # Frontend dependencies
  - package-ecosystem: "npm"
    directory: "/"
    schedule:
      interval: "weekly"
      day: "monday"
      time: "09:00"
    open-pull-requests-limit: 5
    groups:
      radix-ui:
        patterns:
          - "@radix-ui/*"
      react:
        patterns:
          - "react"
          - "react-dom"
          - "@types/react*"

  # Backend dependencies
  - package-ecosystem: "npm"
    directory: "/server"
    schedule:
      interval: "weekly"
      day: "monday"
      time: "09:00"
    open-pull-requests-limit: 5

  # GitHub Actions
  - package-ecosystem: "github-actions"
    directory: "/"
    schedule:
      interval: "weekly"
      day: "monday"
```

- [ ] **Step 2: Commit**

```bash
git add .github/dependabot.yml
git commit -m "ci: add Dependabot for automated dependency updates"
```

---

## Task 7: إعداد GitHub Secrets وBranch Protection

هذه المرحلة تتم يدوياً على GitHub UI. وثّق الخطوات هنا.

- [ ] **Step 1: إضافة Secrets في GitHub**

اذهب إلى: `Repository → Settings → Secrets and variables → Actions`

أضف هذه الـ secrets:

| Secret Name | القيمة |
|-------------|--------|
| `PRODUCTION_DATABASE_URL` | رابط قاعدة البيانات الإنتاجية |
| `VITE_API_URL` | رابط الـ backend API الإنتاجي |

> ملاحظة: `GITHUB_TOKEN` متاح تلقائياً بدون إضافة.

- [ ] **Step 2: إعداد GitHub Environment "production"**

اذهب إلى: `Repository → Settings → Environments → New environment`

- Name: `production`
- فعّل "Required reviewers" وأضف نفسك
- هذا يضمن أن migration لا يعمل إلا بعد موافقتك

- [ ] **Step 3: إعداد Branch Protection لـ main**

اذهب إلى: `Repository → Settings → Branches → Add rule`

- Branch name pattern: `main`
- فعّل: `Require a pull request before merging`
- فعّل: `Require status checks to pass before merging`
- ابحث عن هذه الـ checks وأضفها:
  - `Frontend — Lint, Type-check, Build, Test`
  - `Backend — Type-check, Build, Test`
  - `Docker — Build Backend Image`
- فعّل: `Require branches to be up to date before merging`
- فعّل: `Do not allow bypassing the above settings`

- [ ] **Step 4: Commit documentation**

أنشئ `docs/ci-cd-setup.md`:

```markdown
# CI/CD Setup

## Secrets Required
- `PRODUCTION_DATABASE_URL` — PostgreSQL connection string for production
- `VITE_API_URL` — Backend API URL for frontend build

## Workflows
- **CI** (`ci.yml`): runs on every PR — lint, type-check, tests, build
- **CD** (`cd.yml`): runs on push to main — deploys frontend + pushes Docker image + runs migrations

## Branch Protection
- main is protected: PRs required, all CI checks must pass

## Docker Images
- Backend image pushed to: `ghcr.io/<owner>/<repo>/school-server`
- Tags: `latest` + `sha-<commit-sha>`
```

```bash
git add docs/ci-cd-setup.md
git commit -m "docs: add CI/CD setup documentation"
```

---

## Task 8: التحقق النهائي

- [ ] **Step 1: اعمل PR تجريبي**

```bash
git checkout -b test/ci-verification
echo "# CI Test" >> README.md
git add README.md
git commit -m "test: verify CI pipeline runs correctly"
git push origin test/ci-verification
```

ثم افتح PR على GitHub واراقب الـ checks.

- [ ] **Step 2: تأكد أن الـ checks التالية تظهر وتنجح**

- ✅ `Frontend — Lint, Type-check, Build, Test`
- ✅ `Backend — Type-check, Build, Test`
- ✅ `Docker — Build Backend Image`

- [ ] **Step 3: Merge الـ PR وراقب CD**

بعد merge، راقب:
- ✅ GitHub Pages deployment يكتمل
- ✅ Docker image يُدفع إلى GHCR
- ✅ Prisma migrations تنتظر الموافقة (production environment)

- [ ] **Step 4: حذف الـ test branch**

```bash
git checkout main
git branch -d test/ci-verification
git push origin --delete test/ci-verification
```

---

## ملخص الملفات التي ستُنشأ أو تُعدَّل

| الملف | نوع التعديل |
|-------|-------------|
| `vite.config.ts` | تعديل: إضافة Vitest config |
| `package.json` | تعديل: إضافة test scripts + devDeps |
| `src/__tests__/utils.test.ts` | جديد: أول اختبار للـ frontend |
| `src/__tests__/setup.ts` | جديد: إعداد testing library |
| `server/package.json` | تعديل: إضافة Jest + test scripts |
| `server/jest.config.ts` | جديد: إعداد Jest |
| `server/jest.setup.ts` | جديد: setup للاختبارات |
| `server/src/__tests__/health.test.ts` | جديد: اختبار الـ API |
| `server/src/index.ts` | تعديل: تصدير app + إضافة health endpoint |
| `Dockerfile.server` | جديد: multi-stage Docker build |
| `.dockerignore` | جديد |
| `.github/workflows/ci.yml` | جديد: CI pipeline |
| `.github/workflows/cd.yml` | جديد: CD pipeline |
| `.github/dependabot.yml` | جديد: تحديثات تلقائية |
| `docs/ci-cd-setup.md` | جديد: توثيق |
