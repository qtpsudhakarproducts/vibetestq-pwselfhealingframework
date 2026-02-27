# VibeTestQ — Self-Healing Test Automation Framework

**Playwright · TypeScript · Enterprise POM · Self-Healing · GitHub Pages Reporting**

A production-grade, 9-level test automation framework for [OrangeHRM](https://opensource-demo.orangehrmlive.com), built with Playwright and TypeScript. Designed with AI-agent compatibility and self-healing locator strategies at its core.

[![Nightly Regression](https://github.com/qtpsudhakarproducts/vibetestq-pwselfhealingframework/actions/workflows/nightly-regression.yml/badge.svg)](https://github.com/qtpsudhakarproducts/vibetestq-pwselfhealingframework/actions/workflows/nightly-regression.yml)
[![PR Check](https://github.com/qtpsudhakarproducts/vibetestq-pwselfhealingframework/actions/workflows/pr-check.yml/badge.svg)](https://github.com/qtpsudhakarproducts/vibetestq-pwselfhealingframework/actions/workflows/pr-check.yml)

---

## 📊 Live Test Results

**[View Allure Report → GitHub Pages](https://qtpsudhakarproducts.github.io/vibetestq-pwselfhealingframework/)**

Reports are published automatically after every nightly run and every manual dispatch run.

---

## What is Self-Healing?

VibeTestQ is built so that **AI agents can read, understand, and repair tests autonomously**:

- Every locator carries a human-readable `.describe()` label — agents know what broke
- `STANDARDS.md` provides explicit conventions for AI agents to follow when modifying the codebase
- Tag taxonomy (`@smoke`, `@critical`, `@pim` …) lets agents scope repairs precisely
- All page objects share a `BasePage` contract — agents learn the pattern once and apply it everywhere
- Test data is generated (Faker) — no hard-coded state for agents to break

---

## Framework Architecture — 9 Levels

| Level | Concept | What It Adds |
|-------|---------|-------------|
| 0 | Theory & Foundations | POM theory, design principles, OrangeHRM overview |
| 1 | Basic POM | Page objects, locators, actions, assertions |
| 2 | BasePage & Inheritance | Shared base class, DRY boilerplate elimination |
| 3 | Fixtures & Shared State | Auth state injection, test setup elimination |
| 4 | Helper Layer | WaitHelpers, WebActions, AssertionHelpers, DateHelpers |
| 5 | Test Independence | beforeAll UI setup, API state setup |
| 6 | Test Data Management | Faker generators, CSV/JSON/ENV readers, types |
| 7 | Reporting | Tagging, Allure, custom summary reporter |
| 8 | CI/CD | GitHub Actions, GitHub Pages, nightly regression |
| 9 | AI Agents | Playwright Agents, STANDARDS.md, self-healing |

---

## Project Structure

```
vibetestq-pwselfhealingframework/
├── pages/                    ← Page objects (BasePage + module sub-folders)
│   ├── BasePage.ts
│   ├── LoginPage.ts
│   ├── DashboardPage.ts
│   ├── pim/
│   ├── admin/
│   └── leave/
├── helpers/                  ← WaitHelpers, WebActions, AssertionHelpers, DateHelpers
├── fixtures/                 ← Custom Playwright fixture extensions
├── data/                     ← types.ts · generate.ts · readers.ts
├── api/                      ← ApiClient · EmployeeApi · UserApi · LeaveApi
├── reporters/                ← Custom SummaryReporter
├── tests/                    ← Test specs organised by module
│   ├── login.spec.ts
│   ├── pim/
│   ├── admin/
│   └── leave/
├── .github/workflows/        ← CI/CD pipelines
├── test-data/                ← CSV, JSON, .env config files
├── STANDARDS.md              ← Framework conventions (source of truth for AI agents)
├── playwright.config.ts
└── global-setup.ts
```

---

## Quick Start

```bash
# Install dependencies
npm install

# Install Chromium browser
npm run setup

# Run smoke tests
npm run test:smoke

# Run full regression
npm test

# Open HTML report
npm run report
```

---

## Test Tags

Every test carries exactly three tags — module, type, severity.

### Module
| Tag | Description |
|-----|-------------|
| `@login` | Authentication and session management |
| `@pim` | Employee management |
| `@admin` | System user management |
| `@leave` | Leave application and approval |

### Type
| Tag | Purpose |
|-----|--------|
| `@smoke` | Core happy-path — runs in ~2 min, gates every deploy |
| `@regression` | Full coverage — runs nightly |
| `@sanity` | Post-deploy health check |

### Severity
| Tag | Meaning |
|-----|--------|
| `@critical` | Failure breaks all users |
| `@high` | Failure blocks primary workflow |
| `@medium` | Feature degraded but workaround exists |
| `@low` | Minor inconvenience |

### Example runs

```bash
# Smoke only
npm run test:smoke

# All PIM tests
npm run test:pim

# Critical path across all modules
npx playwright test --grep @critical

# PIM smoke tests only
npx playwright test --grep "(?=.*@smoke)(?=.*@pim)"
```

---

## CI/CD Pipelines

| Workflow | Trigger | What it does |
|----------|---------|-------------|
| `pr-check.yml` | Every PR to `main` | Smoke suite — blocks merge on failure |
| `nightly-regression.yml` | Midnight UTC daily | Full suite + Allure history + GitHub Pages publish |
| `manual-run.yml` | Manual dispatch | Choose any tag and target environment |

---

## Application Under Test

**OrangeHRM Demo** — [https://opensource-demo.orangehrmlive.com](https://opensource-demo.orangehrmlive.com)

| Role | Username | Password |
|------|----------|----------|
| Admin | `Admin` | `admin123` |
| ESS User | `alice.johnson` | `Alice@1234` |

> **Note:** This is a shared public demo site. All tests use Faker-generated data to avoid collisions between concurrent runs.

---

## Coding Standards

All conventions — naming, tagging, locator strategy, assertion patterns, and AI-agent rules — are captured in [`STANDARDS.md`](STANDARDS.md).

All conventions — naming, tagging, locator strategy, assertion patterns, and AI-agent rules — are captured in [`STANDARDS.md`](STANDARDS.md).
