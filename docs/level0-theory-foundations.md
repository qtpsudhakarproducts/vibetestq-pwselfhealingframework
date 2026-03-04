# Level 0 — Theory, Foundations & Framework Overview
### Playwright · TypeScript · OrangeHRM · Enterprise POM Framework

> **Who this is for:** Anyone starting this framework series — whether you are new to test automation or moving from a different tool or language.
> **What this level covers:** The theory behind Page Object Model, why it matters for enterprise applications, an overview of all 9 levels, and everything you need set up before writing your first line of code.
> **No code in this level.** Level 1 is where coding begins.

---

## 📋 Table of Contents

- [Part 1 — What is a Design Pattern](#part-1--what-is-a-design-pattern)
- [Part 2 — What is Page Object Model](#part-2--what-is-page-object-model)
- [Part 3 — Core Principles Behind POM](#part-3--core-principles-behind-pom)
- [Part 4 — Why POM for Enterprise Applications](#part-4--why-pom-for-enterprise-applications)
- [Part 5 — The 9 Levels of This Framework](#part-5--the-9-levels-of-this-framework)
- [Part 6 — OrangeHRM — The Application We Automate](#part-6--orangehrm--the-application-we-automate)
- [Part 7 — Technology Stack](#part-7--technology-stack)
- [Part 8 — Prerequisites and Setup](#part-8--prerequisites-and-setup)

---

## Part 1 — What is a Design Pattern

### The Idea

A design pattern is a reusable solution to a problem that occurs repeatedly in software development. It is not a piece of code you copy and paste. It is a way of thinking about a problem — a proven approach that has been used successfully across many projects and teams.

Design patterns were popularised by the "Gang of Four" in their 1994 book *Design Patterns: Elements of Reusable Object-Oriented Software*. The idea was simple: experienced developers kept solving the same kinds of problems over and over, arriving at similar solutions independently. Instead of every developer reinventing the wheel, why not document these proven solutions so others can learn from and apply them?

### Why Automation Frameworks Need Patterns

Test automation has the same recurring problems that software development has:

- Code grows and becomes hard to maintain
- The same logic gets duplicated in multiple places
- Changes in the application break tests in unexpected ways
- New team members struggle to understand what existing code does
- Adding new tests becomes harder the larger the suite grows

Design patterns give us structured, proven ways to solve these problems before they get out of hand. They are the difference between a test suite that works for a year and one that collapses under its own weight after three months.

---

## Part 2 — What is Page Object Model

### The Origin

Page Object Model was introduced and popularised by Simon Stewart, one of the creators of Selenium WebDriver. It emerged from the observation that test automation code for web applications had a fundamental structural problem — the same UI elements and interactions were being written directly into test cases, scattered everywhere, duplicated constantly.

When the application changed — a button moved, a form field was renamed, a URL was updated — all those scattered references broke. Maintaining tests became more work than writing them.

The solution was simple in concept: **model each page of the application as a class**. That class is the single point of truth for everything about that page. Tests interact with pages through these classes, not directly with the browser.

### The Core Idea in One Sentence

**Page Object Model separates what you are testing from how you interact with the application.**

What you are testing belongs in test files. How you interact with the application belongs in page objects.

### Before and After

**Without POM — interaction and test logic mixed together:**

```
Test File A:
  - Navigate to login page
  - Fill username field with selector "#username"
  - Fill password field with selector "#password"
  - Click button with selector "#submit"
  - Assert dashboard is visible

Test File B:
  - Navigate to login page
  - Fill username field with selector "#username"    ← duplicated
  - Fill password field with selector "#password"    ← duplicated
  - Click button with selector "#submit"             ← duplicated
  - Do something else...

Test File C, D, E... — same duplication
```

**With POM — clean separation:**

```
LoginPage class:
  - Knows the username field selector
  - Knows the password field selector
  - Knows the submit button selector
  - Has a login() method that uses all three

Test File A:
  - Call loginPage.login()
  - Assert dashboard is visible

Test File B:
  - Call loginPage.login()
  - Do something else...

Test File C, D, E... — all call loginPage.login()
```

When the submit button selector changes, you change it in `LoginPage`. Done. All test files are instantly correct because they never knew the selector — they only knew the `login()` method.

### What a Page Object Is Responsible For

Every page object in this framework has three and only three responsibilities:

**Locators** — the selectors that identify every UI element your tests need to interact with or verify. These are defined once and used by every method that needs them. They are never defined in test files.

**Actions** — methods that represent things a user can do on the page. Login. Add an employee. Select a role from a dropdown. Submit a form. Each action is one method. The test calls the method without knowing how it works internally.

**Assertions** — methods that verify the page is in an expected state. Assert the dashboard is visible. Assert an error message appears. Assert a record exists in a list. Keeping assertions in page objects means they are reusable and the underlying selectors never leak into test files.

### What a Page Object Is NOT Responsible For

- **Test scenarios** — deciding what to test and in what order belongs in test files, not page objects
- **Test data** — email addresses, names, passwords belong in a data layer (Level 6), not in page objects
- **Business logic** — page objects model UI interactions, not business rules
- **Other pages** — a page object for the Login page should not know about the Dashboard page. Navigation results are handled by tests or fixtures

---

## Part 3 — Core Principles Behind POM

POM is built on four software design principles. Understanding these principles explains every decision made in this framework — not just at Level 1 but across all 9 levels.

### 1. Separation of Concerns

Every piece of code should have one clearly defined concern — one job — and nothing else.

In this framework:
- Page objects handle UI interaction — that is their concern
- Test files handle test scenarios — that is their concern
- Fixtures handle state setup — that is their concern (Level 3)
- Helper methods handle common UI patterns — that is their concern (Level 4)
- Test data factories handle data generation — that is their concern (Level 6)

When concerns are separated, changing one thing does not break another. Changing how you fill a form does not change what you are testing. Changing what you test does not change how you interact with the page.

### 2. Single Responsibility Principle

Every class should have one reason to change.

`LoginPage` changes only when the login page UI changes. It does not change when the dashboard changes. It does not change when a test scenario changes. It does not change when a different module is added.

When every class has a single responsibility, the impact of any change is contained and predictable.

### 3. DRY — Don't Repeat Yourself

Every piece of knowledge — every selector, every interaction pattern, every assertion — should exist in exactly one place in the codebase.

When a selector exists in one place, a change requires one edit. When a selector exists in twenty places, a change requires twenty edits — and you will miss some.

POM enforces DRY for selectors and interactions. Higher levels of this framework extend DRY further — BasePage (Level 2) eliminates repeated boilerplate, fixtures (Level 3) eliminate repeated setup, helpers (Level 4) eliminate repeated interaction patterns, data factories (Level 6) eliminate repeated test data.

### 4. Abstraction

The test should not need to know how something works — only that it works.

`loginPage.login('Admin', 'admin123')` is an abstraction. The test knows what it wants — to be logged in. It does not know how the login page is structured, what the username input selector is, or in what order the fields must be filled. That knowledge is abstracted away inside `LoginPage`.

Good abstraction means tests read like user stories, not like browser instructions. A non-technical person reading a test should be able to understand what it does without knowing anything about Playwright.

---

## Part 4 — Why POM for Enterprise Applications

### The Scale Problem

A single-page demo project with 10 tests does not need POM. You can write tests directly and maintain them manually without much effort.

An enterprise application is different:

- Hundreds of pages across multiple modules
- Dozens of QA engineers contributing to the same codebase
- Thousands of test cases covering countless scenarios
- Continuous changes to the UI as the product evolves
- Tests that must run reliably in CI/CD pipelines every day
- New team members joining and needing to contribute immediately

At this scale, every decision that seemed harmless at 10 tests becomes a crisis at 1000 tests. A selector duplicated in 5 places is a minor inconvenience. A selector duplicated in 300 places is a full-day incident every time the UI changes.

### The Maintenance Problem

The number one failure mode of enterprise test automation suites is not technical — it is maintenance. Suites that start strong gradually become unmaintainable:

- Tests fail for reasons unrelated to the application — a selector changed, a page was renamed
- Fixing a broken test breaks three other tests
- Nobody knows where a particular selector or interaction is defined
- Adding new tests requires copying existing ones and modifying them manually
- The suite becomes so fragile that the team stops trusting it

POM addresses the maintenance problem structurally. It does not eliminate change — applications will always change. But it ensures that when the application changes, the cost of updating the test suite is proportional to the actual size of the change, not multiplied by how many places the same thing was duplicated.

### The Collaboration Problem

Enterprise QA teams have multiple engineers working on the same codebase simultaneously. Without structure:

- Two engineers implement the same page object independently
- Selectors are inconsistent across files written by different people
- Code review is difficult because there is no agreed standard
- Merging branches produces conflicts in unexpected places

POM provides the structure. Everyone knows where page objects live, how they are named, what methods they expose, and how tests use them. A new team member can be productive within their first day because the pattern is consistent everywhere.

### The Confidence Problem

An enterprise test suite must be trusted. If the team does not trust the tests, they stop running them. If they stop running them, the entire investment in automation is wasted.

Trust comes from reliability. Tests that fail randomly — because of selector duplication, shared state, or unclear dependencies — erode trust rapidly. POM, combined with the higher levels of this framework, builds a suite that the team can rely on.

---

## Part 5 — The 9 Levels of This Framework

This framework is built across 9 levels. Each level builds directly on the previous ones. You read them in order and implement them in order.

### The Level Map

```
Level 0  ──  Theory, Foundations & Setup             ← You are here
Level 1  ──  Basic Page Object Model
Level 2  ──  BasePage & Inheritance
Level 3  ──  Fixtures & Shared State
Level 4  ──  Reusable Web Action Helpers
Level 5  ──  Test Independence & State Setup
Level 6  ──  Test Data Management
Level 7  ──  Reporting & Test Organisation
Level 8  ──  CI/CD Integration & Execution Strategy
Level 9  ──  AI Agents & Standard-Driven Test Generation
```

---

### Level 0 — Theory, Foundations & Setup
**You are here.**
Covers the design pattern theory, POM principles, the 9-level overview, OrangeHRM introduction, and environment setup. No code.

---

### Level 1 — Basic Page Object Model
**The foundation everything builds on.**
You build your first page objects for OrangeHRM — Login, Dashboard, PIM Employee pages, and Admin User pages. Tests are written using those page objects. By the end you have a working suite that follows the correct pattern, and you will clearly see the duplication problems that Level 2 solves.

What you gain: a working POM test suite
What you will notice: repeated boilerplate in every page object

---

### Level 2 — BasePage & Inheritance
**Eliminating boilerplate through inheritance.**
`BasePage` is introduced — a parent class that every page object extends. Common properties (`page`) and common methods (`navigate`, `waitForPageLoad`, `assertURL`) are defined once in BasePage and inherited by all page objects. You refactor all Level 1 page objects to extend BasePage.

What you gain: no more boilerplate, consistent navigation and waiting behaviour
What you will notice: login steps still repeated in every test file

---

### Level 3 — Fixtures & Shared State
**Eliminating repeated setup through fixtures.**
Playwright's custom fixture system is introduced. A pre-authenticated admin fixture logs in once and injects the ready session into any test that needs it. Page objects are injected into tests as fixtures so they never need to be instantiated manually. Tests become dramatically shorter and more focused.

What you gain: no more repeated login, no more manual page object instantiation
What you will notice: tests still depend on each other for state — one failure cascades

---

### Level 4 — Reusable Web Action Helpers
**Eliminating repeated interaction patterns through helpers.**
Common UI patterns — filling dropdowns, handling autocomplete fields, interacting with OrangeHRM's custom date pickers, waiting for toast notifications, handling confirmation dialogs — are extracted into reusable helper classes. The helper layer has two distinct layers: `WebActions` handles all generic browser interactions (click, fill, check, hover) with centralised error classification; `OrangeHRMControls` handles application-specific UI components and calls `WebActions` internally. Page objects use both through composition — every interaction in the framework flows through `WebActions` at some point, making it the single seam for cross-cutting concerns like self-healing.

What you gain: consistent handling of complex UI patterns, less code in page objects, a clean interaction layer ready for self-healing
What you will notice: tests still depend on each other for state and data is still hardcoded

---

### Level 5 — Test Independence & State Setup
**Making every test self-contained and independent of execution order.**
Tests that depend on other tests for state are fragile — one failure cascades through the entire suite. Level 5 solves this with two approaches: `beforeAll` UI setup for teams without API access, and API state setup for teams whose application exposes an API. Every test creates exactly the preconditions it needs, independently, before the scenario runs.

What you gain: tests run in any order, no cascade failures, faster diagnosis of real failures
What you will notice: test data is still hardcoded in test files

---

### Level 6 — Test Data Management
**Making test data dynamic, centralised, and environment-aware.**
A dedicated test data layer is introduced with generator functions that produce realistic, unique data for each test run using Faker. Employee names, usernames, and passwords are generated dynamically rather than hardcoded. File readers handle CSV, JSON, Excel, and environment-specific configuration. Tests are environment-aware — dev and staging use different credentials and URLs without code changes.

What you gain: no more hardcoded data, unique data per run, no data conflicts between runs
What you will notice: test results are hard to organise and analyse at scale

---

### Level 7 — Reporting & Test Organisation
**Making results meaningful and actionable.**
Tests are tagged by module (PIM, Admin, Leave), by type (smoke, regression, sanity), and by severity (critical, high, medium, low). Custom reporters surface the information that matters. Test suites are grouped so you can run just the smoke suite, just the PIM module, or just the critical path. Reports are structured for different audiences — developers, QA leads, and product managers see different levels of detail.

What you gain: meaningful test organisation, targeted test runs, actionable reports
What you will notice: test execution in CI is not optimised

---

### Level 8 — CI/CD Integration & Execution Strategy
**Running the framework reliably in a pipeline.**
GitHub Actions workflows run the test suite on every pull request, on a schedule, and on demand. Parallel execution is configured correctly for the OrangeHRM demo site. Retry strategy is tuned for flaky network conditions. Smoke tests gate pull request merges. Nightly regression runs the full suite. Test results are published and accessible from the GitHub Actions summary.

What you gain: automated test execution, quality gates, scheduled regression
What you will notice: test creation still requires manual effort for every new feature

---

### Level 9 — AI Agents & Standard-Driven Test Generation
**Using AI to create tests that follow your established standards.**
An AI agent reads your existing codebase — the page objects, fixtures, helpers, and test files from Levels 1 through 8 — and derives your team's coding standards from what it sees. When given a requirement or user story, the agent generates new page objects and tests that are indistinguishable from what your team would write manually. The agent follows your naming conventions, your locator strategy, your fixture patterns, and your assertion style automatically because it learned them from your real code.

What you gain: AI-assisted test authoring that respects your established standards
The journey: complete

---

### Who Each Level is For

| Level | Suitable For |
|-------|-------------|
| 0 | Everyone starting the series |
| 1 | Beginners to POM and Playwright |
| 2 | Engineers who have completed Level 1 |
| 3 | Engineers who feel the pain of repeated login and setup |
| 4 | Engineers with complex UI interactions to handle |
| 5 | Teams with data management challenges |
| 6 | Teams whose tests are slow because UI drives setup |
| 7 | Teams who cannot make sense of their test results |
| 8 | Teams ready to integrate automation into their delivery pipeline |
| 9 | Teams with a mature, stable framework ready for AI augmentation |

---

## Part 6 — OrangeHRM — The Application We Automate

### What is OrangeHRM

OrangeHRM is an open-source Human Resource Management System. It is used by thousands of organisations worldwide to manage employees, leave, recruitment, payroll, and performance reviews.

We use it in this framework because it is:

- **Real** — it is a production-grade application, not a toy demo. It has real complexity, real workflows, and real UI patterns that reflect what enterprise QA engineers face in their work
- **Publicly accessible** — the demo site is free, requires no installation, and can be accessed by anyone
- **Complex enough** — it has multiple modules, role-based access, multi-step workflows, autocomplete fields, date pickers, data tables, and file uploads — enough variety to justify all 9 levels
- **Familiar domain** — HR processes like adding employees, creating users, and managing leave are universally understood, so the test scenarios make intuitive sense without needing domain expertise

### The Demo Site

```
URL:       https://opensource-demo.orangehrmlive.com
Username:  Admin
Password:  admin123
```

**Important:** This site is shared publicly. Data you create may be modified or deleted by other users. This is actually a realistic constraint — real enterprise environments have data consistency challenges too. The higher levels of this framework address this directly.

### The Three Modules We Use

**Admin Module**
Manages system configuration and user access. The System Users section is where you create login credentials for employees. User Management is where you search, view, and manage all system users.

Key pages: System Users list, Add User form

**PIM Module (Personal Information Management)**
The core of OrangeHRM. All employee records live here. You can add employees, view their personal details, contact information, job history, emergency contacts, and much more.

Key pages: Employee List, Add Employee form, Personal Details tab, Contact Details tab

**Leave Module**
Manages employee leave — applying, approving, rejecting, and tracking. This module involves two roles — an ESS employee who applies for leave, and an Admin who approves or rejects it. This multi-role workflow introduces test patterns that Admin and PIM alone cannot demonstrate.

Key pages: Apply Leave form, Leave List, Leave Approval

### The Business Domain

Understanding the business domain helps you write better tests. Here is the OrangeHRM data model in plain English:

**Employee** — a person who works at the company. Has a first name, last name, and employee ID. Can have personal details, contact details, job information, salary details, and qualifications.

**System User** — a login account. Always linked to an Employee. Has a username, password, role (Admin or ESS), and status (Enabled or Disabled). An employee can have a system user account, or can exist as a record without login access.

**ESS User** — Employee Self Service. A standard employee login. Can view their own information, apply for leave, and update limited personal details.

**Admin User** — full system access. Can manage all employees, all users, all leave, and all configuration.

**Leave** — a request by an employee to take time off. Has a type (Annual, Sick, Casual), a date range, and a status (Pending, Approved, Rejected).

### Why Employee Must Come Before User

In OrangeHRM, when you create a System User, you must link it to an existing Employee. The Employee Name field in the Add User form is an autocomplete that searches existing PIM employees. If you try to create a user without an employee, the form cannot be completed.

This is why in our test suite, PIM tests always run before Admin tests. This dependency exists in the real business domain — you cannot give someone a login until they are registered as an employee.

---

## Part 7 — Technology Stack

### Why These Technologies

**Playwright**
Microsoft's modern end-to-end testing framework. Auto-waits for elements, runs tests across Chromium, Firefox, and WebKit, generates detailed HTML reports with traces and screenshots, has excellent TypeScript support, and has a growing ecosystem of tools and integrations. Playwright is the industry standard for modern web test automation.

**TypeScript**
A statically typed superset of JavaScript. Types catch errors at development time rather than at test runtime. Page object classes, method signatures, and data structures are all type-safe. A `LoginPage` that expects a `string` username cannot accidentally receive a `number` — TypeScript prevents it. For enterprise teams with multiple contributors, TypeScript is essential for maintainability and code quality.

**Node.js**
The runtime that Playwright and TypeScript run on. Required for all tooling in this framework.

**OrangeHRM**
The application under test. Described in Part 6.

**GitHub Actions** (introduced in Level 8)
The CI/CD platform used to run tests automatically. Triggers tests on pull requests, on schedules, and on demand. Publishes test results back to GitHub.

### Technology Versions

| Technology | Version |
|-----------|---------|
| Node.js | 20.x LTS or higher |
| Playwright | Latest stable |
| TypeScript | 5.x or higher |

---

## Part 8 — Prerequisites and Setup

Everything in this section needs to be done once before starting Level 1. Level 1 assumes these are already in place.

### 1. Install Node.js

Download and install Node.js 20 LTS from https://nodejs.org

Verify the installation:

```bash
node --version    # should show v20.x.x or higher
npm --version     # should show 10.x.x or higher
```

### 2. Install VS Code

Download from https://code.visualstudio.com

Install the following extensions:
- **Playwright Test for VSCode** — by Microsoft. Lets you run and debug tests directly from the editor, see test results inline, and use the Playwright test recorder
- **ESLint** — for code quality
- **Prettier** — for consistent code formatting

### 3. Install Git

Download from https://git-scm.com

Verify:

```bash
git --version    # should show 2.x.x or higher
```

Set your identity:

```bash
git config --global user.name "Your Name"
git config --global user.email "your@email.com"
```

### 4. Create the Project

```bash
# Create the project folder
mkdir orangehrm-automation
cd orangehrm-automation

# Initialise Playwright — this sets up the project structure,
# installs dependencies, and installs browser binaries
npm init playwright@latest
```

When prompted:
- TypeScript or JavaScript → **TypeScript**
- Tests folder → **tests**
- GitHub Actions workflow → **Yes** (we will customise it in Level 8)
- Install Playwright browsers → **Yes**

### 5. Verify the Setup

```bash
# Run the example tests Playwright generates to confirm everything works
npx playwright test

# Open the HTML report
npx playwright show-report
```

You should see the Playwright HTML report open in your browser with passing tests.

### 6. Create the Project Folder Structure

Delete the example test files Playwright generated and create the structure we will use:

In VS Code, create these folders:

```
pages/
pages/pim/
pages/admin/
pages/leave/
tests/
tests/pim/
tests/admin/
tests/leave/
```

### 7. Create .gitignore

Create a `.gitignore` file in the project root:

```
node_modules/
test-results/
playwright-report/
.playwright/
.env
```

### 8. Verify You Can Access OrangeHRM

Open a browser and navigate to:
```
https://opensource-demo.orangehrmlive.com
```

Log in with:
```
Username: Admin
Password: admin123
```

You should land on the OrangeHRM Dashboard. Spend a few minutes exploring the PIM and Admin modules manually — understanding the application before automating it is always time well spent.

Explore in this order:
1. Admin → User Management — see the list of system users
2. Admin → User Management → Add — see the Add User form and notice the Employee Name autocomplete
3. PIM → Employee List — see the employee records
4. PIM → Employee List → Add — see the Add Employee form
5. Leave → Apply Leave — see what an ESS user sees when applying for leave

This manual exploration means Level 1's page objects and tests will make complete sense when you read them.

---

### Setup Checklist

Before moving to Level 1, confirm all of these:

- [ ] Node.js 20+ installed and verified
- [ ] VS Code installed with Playwright extension
- [ ] Git installed and identity configured
- [ ] Playwright project created with TypeScript
- [ ] Example tests pass
- [ ] Project folder structure created
- [ ] `.gitignore` created
- [ ] OrangeHRM demo site accessible and explored manually

---

> **You are ready for Level 1** once every item on the checklist above is complete. Level 1 starts coding immediately — no setup steps.

---

*Level 0 of 9 — Playwright TypeScript · OrangeHRM · Enterprise POM Framework*
