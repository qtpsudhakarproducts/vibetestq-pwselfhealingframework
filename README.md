# OrangeHRM Automation Framework

**Playwright · TypeScript · Enterprise POM · Self-Healing · GitHub Pages Reporting**

A production-grade, 9-level test automation framework for [OrangeHRM](https://opensource-demo.orangehrmlive.com) built with Playwright and TypeScript.

[![Nightly Regression](https://github.com/qtpsudhakarproducts/orangehrm-automation/actions/workflows/nightly-regression.yml/badge.svg)](https://github.com/qtpsudhakarproducts/orangehrm-automation/actions/workflows/nightly-regression.yml)
[![PR Check](https://github.com/qtpsudhakarproducts/orangehrm-automation/actions/workflows/pr-check.yml/badge.svg)](https://github.com/qtpsudhakarproducts/orangehrm-automation/actions/workflows/pr-check.yml)

---

## 📊 Live Test Results

**[View Allure Report → GitHub Pages](https://qtpsudhakarproducts.github.io/orangehrm-automation/)**

Reports are published automatically after every nightly run and every manual run.

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
orangehrm-automation/
├── pages/                    ← Page objects (BasePage + module sub-folders)
│   ├── BasePage.ts
│   ├── LoginPage.ts
│   ├── DashboardPage.ts
│   ├── pim/
│   ├── admin/
│   └── leave/
├── helpers/                  ← WaitHelpers, WebActions, AssertionHelpers, DateHelpers
├── fixtures/                 ← Custom Playwright fixtures
├── data/                     ← types.ts, generate.ts, readers.ts
├── api/                      ← ApiClient, EmployeeApi, UserApi, LeaveApi
├── tests/                    ← Test files (organised by module)
│   ├── login.spec.ts
│   ├── pim/
│   ├── admin/
│   └── leave/
├── reporters/                ← Custom SummaryReporter
├── .github/workflows/        ← CI/CD pipelines
├── test-data/                ← CSV, JSON, env config files
├── STANDARDS.md              ← Framework conventions for AI agents
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
| Tag | Description |
|-----|-------------|
| `@smoke` | Core path — runs in ~2min, gates every deploy |
| `@regression` | Full coverage — runs nightly |
| `@sanity` | Post-deploy check |

### Severity
| Tag | Description |
|-----|-------------|
| `@critical` | Failure breaks all users |
| `@high` | Failure blocks primary workflow |
| `@medium` | Feature degraded |
| `@low` | Inconvenience, workaround exists |

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
| `nightly-regression.yml` | Midnight UTC daily | Full suite + Allure + GitHub Pages publish |
| `manual-run.yml` | Manual dispatch | Choose tag and environment |

---

## Application Under Test

**OrangeHRM Demo** — [https://opensource-demo.orangehrmlive.com](https://opensource-demo.orangehrmlive.com)

| Credential | Value |
|-----------|-------|
| Admin username | `Admin` |
| Admin password | `admin123` |

> Note: This is a shared public demo site. Tests use data generators (Faker) to avoid collisions between concurrent runs.

---

## Framework Documentation

All 9 levels are documented in `frameworkdocs/`:

- [level0-theory-foundations.md](frameworkdocs/level0-theory-foundations.md)
- [level1-basic-pom.md](frameworkdocs/level1-basic-pom.md)
- [level2-basepage-inheritance.md](frameworkdocs/level2-basepage-inheritance.md)
- [level3-fixtures-shared-state.md](frameworkdocs/level3-fixtures-shared-state.md)
- [level4-helpers.md](frameworkdocs/level4-helpers.md)
- [level5-test-independence.md](frameworkdocs/level5-test-independence.md)
- [level6-test-data.md](frameworkdocs/level6-test-data.md)
- [level7-reporting.md](frameworkdocs/level7-reporting.md)
- [level8-cicd.md](frameworkdocs/level8-cicd.md)
- [level9-agents.md](frameworkdocs/level9-agents.md)
