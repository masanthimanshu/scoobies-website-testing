# Scoobies.co.in Automated QA & Performance Auditing Suite

[![Node.js](https://img.shields.io/badge/Node.js-18+-339933?style=flat&logo=node.js&logoColor=white)](https://nodejs.org/)
[![Playwright](https://img.shields.io/badge/Playwright-v1.63.0-2EAD33?style=flat&logo=playwright&logoColor=white)](https://playwright.dev/)
[![Groq AI](https://img.shields.io/badge/Groq_AI-Dual--Model-F55036?style=flat&logo=groq&logoColor=white)](https://groq.com/)
[![Resend](https://img.shields.io/badge/Resend-Email_Delivery-000000?style=flat&logo=resend&logoColor=white)](https://resend.com/)
[![Docker](https://img.shields.io/badge/Docker-Ready-2496ED?style=flat&logo=docker&logoColor=white)](https://www.docker.com/)
[![License: ISC](https://img.shields.io/badge/License-ISC-blue.svg)](package.json)

A production-grade, end-to-end automated testing, Core Web Vitals performance auditing, and dual-model AI diagnostic platform purpose-built for the [Scoobies India Storefront](https://scoobies.co.in/).

---

## Table of Contents

- [What the Project Does](#what-the-project-does)
- [Why the Project Is Useful](#why-the-project-is-useful)
- [Project Architecture](#project-architecture)
- [How Users Can Get Started](#how-users-can-get-started)
  - [Prerequisites](#prerequisites)
  - [Installation & Setup](#installation--setup)
  - [Environment Configuration](#environment-configuration)
  - [Running the Test Suite](#running-the-test-suite)
  - [Command-Line Options](#command-line-options)
  - [Dispatching Email Reports](#dispatching-email-reports)
  - [Running with Docker](#running-with-docker)
  - [Viewing the Reports](#viewing-the-reports)
- [Configuration Reference](#configuration-reference)
- [Where Users Can Get Help](#where-users-can-get-help)
- [Who Maintains & Contributes](#who-maintains--contributes)

---

## What the Project Does

This suite automates high-fidelity browser testing and performance auditing across the complete customer shopping journey on [Scoobies.co.in](https://scoobies.co.in/). It replaces fragile manual testing and basic assertion scripts with an intelligent pipeline combining Playwright browser automation with Groq-powered dual-model AI diagnostics.

### End-to-End Customer Milestones

1. **Homepage & Storefront Audit**: Validates top-level navigation, announcement banners, hero carousels, responsive grid stability, and initial load performance.
2. **Search Discovery & Catalog Filtering**: Executes catalog searches (e.g., `stationery`), validates auto-suggestions, sort criteria, filters, and product grid rendering.
3. **Product Selection & PDP Deep Dive**: Inspects Product Detail Pages (PDP), pricing accuracy (sale vs. regular), variant selectors, image zoom galleries, stock notices, and Add-to-Cart readiness.
4. **Cart Modification & Item Quantity Update**: Interacts with cart drawers and `/cart`, verifies line-item data, dynamically increments/decrements quantities, and checks subtotal recalculations.
5. **Checkout Step & Form Validation (Safe Mode)**: Progresses to the Shopify checkout pipeline (`/checkouts/...`), validates customer email entry and shipping address forms without submitting final payments or charging real cards.

### Dual-Model Groq AI Diagnostic Pipeline

- **👁️ Multimodal Visual Auditor (`qwen/qwen3.8-27b`)**: Analyzes full-viewport high-DPI screenshots at every milestone to identify layout clipping, overlapping modals, unreadable fonts, banner misalignment, and obstructive popups.
- **🧠 Diagnostic Root-Cause Reasoner (`openai/gpt-oss-120b`)**: Ingests structured DOM snapshots, network HAR telemetry (slow endpoints > 1500ms, 4xx/5xx HTTP codes, transfer sizes), console exceptions, and Core Web Vitals to deliver prioritized, actionable engineering root-cause diagnoses.

---

## Why the Project Is Useful

Standard automated UI tests verify element presence but frequently miss subtle visual breakage, degraded performance, and third-party script regressions. This project provides:

- **AI-Powered Visual & Functional Verification**: Detects visual defects, broken responsive styling, and unexpected popups that traditional locator assertions overlook.
- **Root-Cause Analysis in Seconds**: Instead of sifting through megabytes of console output and network traces, the AI reasoner pinpoints exact script errors, slow API endpoints, and layout shift triggers.
- **Comprehensive Core Web Vitals Tracking**: Continuously monitors Google Core Web Vitals (TTFB, FCP, LCP, CLS), overall payload weight, and resource breakdowns (scripts, images, styles, fonts) against configurable thresholds.
- **Safe End-to-End E-Commerce Auditing**: Validates the entire checkout funnel through shipping address forms without creating fake completed orders or triggering payment gateways.
- **Standalone Executive HTML Reports**: Emits a self-contained, single-file HTML report (`reports/latest.html`) with embedded base64 screenshots and an interactive click-to-zoom lightbox, ready to open in any browser with zero external dependencies.
- **Instant Stakeholder Emailing via Resend**: Automatically generates inline-styled, mobile-responsive email summaries (<100 KB to avoid Gmail clipping) and attaches the full HTML test report for distribution to development and QA teams.
- **Container & CI/CD Native**: Runs with zero local browser setup via Docker and Docker Compose, pre-configured with shared memory optimizations for lightweight cloud instances.

---

## Project Architecture

```
scoobies-website-testing/
├── Dockerfile                  # Official Playwright Noble image definition
├── compose.yaml                # Docker Compose orchestration with volume mounts
├── .dockerignore               # Container build context filters
├── .gitignore                  # Git exclusions for dependencies, secrets & reports
├── .env.example                # Template for environment variables
├── package.json                # Dependencies and npm runner scripts
├── scoobies.config.js          # Central target URLs, viewports, thresholds & AI models
├── README.md                   # Project documentation
├── src/
│   ├── runner.js               # CLI runner and master orchestration pipeline
│   ├── mailer.js               # Standalone Resend email dispatcher
│   ├── utils.js                # CLI argument parsing, HTML escaping & metric helpers
│   ├── ai/
│   │   ├── groqClient.js       # Resilient Groq client with backoff and retry handling
│   │   ├── visionAuditor.js    # Multimodal visual analysis (Qwen 3.8-27B)
│   │   └── rootCauseAnalyst.js # Diagnostic reasoning and root-cause analysis (GPT OSS 120B)
│   ├── audits/
│   │   └── performanceAuditor.js  # Web Vitals harvester, network telemetry & DOM collector
│   ├── journeys/
│   │   └── userJourney.js      # 5-milestone automated customer journey logic
│   ├── email/
│   │   └── resendClient.js     # Resend client, responsive email generator & attachments
│   └── reporter/
│       └── reportGenerator.js  # Standalone HTML report generator with lightbox viewer
└── reports/                    # Generated output artifacts (gitignored)
    ├── latest.html             # Self-contained standalone HTML report
    ├── latest-run.json         # Complete structured telemetry & AI diagnostics
    └── screenshots/            # High-resolution milestone screenshots
```

---

## How Users Can Get Started

### Prerequisites

- **Node.js**: v18.0.0 or higher
- **npm**: v9.0.0 or higher
- **Docker & Docker Compose** *(optional, for containerized runs)*

### Installation & Setup

1. **Clone the repository**:
   ```bash
   git clone https://github.com/masanthimanshu/scoobies-website-testing.git
   cd scoobies-website-testing
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Install the Playwright browser engine**:
   ```bash
   npx playwright install chromium
   ```

### Environment Configuration

Create your `.env` file from the provided template:

```bash
cp .env.example .env
```

Populate the required keys in `.env`:

```env
# Groq AI API Key (for vision & diagnostic reasoning models)
GROQ_API_KEY=gsk_your_groq_api_key_here

# Resend API Key (for email report dispatch)
RESEND_API_KEY=re_your_resend_api_key_here

# Optional: Default recipients for test reports (comma-separated)
REPORT_RECIPIENT_EMAIL=qa@example.com,dev-team@example.com
```

| Variable | Required | Description |
| :--- | :--- | :--- |
| `GROQ_API_KEY` | Optional* | API key for Groq dual-model diagnostics (*not required if using `--no-ai`). |
| `RESEND_API_KEY` | Optional* | API key for sending email reports via Resend (*required only for emailing). |
| `REPORT_RECIPIENT_EMAIL` | Optional | Default comma-separated email addresses to receive reports. |

### Running the Test Suite

#### 1. Full Production Run (with AI Diagnostics)
Executes all 5 journey milestones, collects Core Web Vitals and network traces, triggers Groq dual-model AI analysis, and compiles the standalone HTML report:
```bash
npm test
# or
npm start
```

#### 2. Fast Sanity Run (Local / No AI)
Runs the entire customer journey and captures performance metrics while bypassing Groq AI calls to save API quota during quick local iterations:
```bash
npm run test:fast
# or
node src/runner.js --no-ai
```

#### 3. Headed Mode (Watch Browser Execution)
Launches a visible Chromium browser window to watch user journey interactions in real time:
```bash
npm run test:headed
```

#### 4. Run with Custom Search Keyword
Test storefront search discovery and catalog filters for a specific product term:
```bash
node src/runner.js --keyword "backpack"
# or
node src/runner.js -k "pencil box"
```

#### 5. Execute Tests and Email Report Automatically
Runs the full suite and immediately dispatches the executive summary and attached HTML report to specified recipients:
```bash
node src/runner.js --email qa-team@example.com
```

### Command-Line Options

The master runner script ([src/runner.js](src/runner.js)) accepts the following CLI arguments:

| Flag | Alias | Description | Example |
| :--- | :--- | :--- | :--- |
| `--headed` | — | Launches a visible browser window instead of headless mode. | `node src/runner.js --headed` |
| `--no-ai` | — | Skips Groq AI visual and reasoning diagnostics for fast execution. | `node src/runner.js --no-ai` |
| `--keyword <term>` | `-k <term>` | Overrides the default search query in [scoobies.config.js](scoobies.config.js). | `node src/runner.js -k "bottle"` |
| `--email <address>` | `--to <address>` | Automatically emails the report upon run completion. | `node src/runner.js --to qa@scoobies.ai` |
| `--output-dir <path>` | — | Sets a custom directory for reports and screenshots. | `node src/runner.js --output-dir ./custom-reports` |

### Dispatching Email Reports

You can dispatch the latest generated HTML report on demand using the standalone mailer utility ([src/mailer.js](src/mailer.js)):

```bash
# Using npm script with recipient flag
npm run email -- --to team@example.com

# Or invoking node directly
node src/mailer.js --to team@example.com --subject "[Custom Audit] Storefront Health"
```

### Running with Docker

The suite includes an optimized [Dockerfile](Dockerfile) based on `mcr.microsoft.com/playwright:v1.50.1-noble` and a preconfigured [compose.yaml](compose.yaml).

#### Using Docker Compose (Recommended)

```bash
# 1. Run full suite with AI diagnostics
docker compose up --build

# 2. Run fast mode without AI calls
docker compose run --rm qa node src/runner.js --no-ai

# 3. Dispatch an email report from the container
docker compose run --rm qa node src/mailer.js --to team@example.com
```

> **Persistent Reports**: The `./reports` directory on your host is mapped to `/app/reports` in the container, ensuring that reports and screenshots persist on your local filesystem after container shutdown.

#### Using Plain Docker CLI

```bash
# Build the image
docker build -t scoobies-qa-suite .

# Run container with environment file and volume mount
docker run --rm --ipc=host --env-file .env -v "$(pwd)/reports:/app/reports" scoobies-qa-suite
```

### Viewing the Reports

After any test execution, open the generated self-contained report in your preferred browser:

```bash
# macOS
open reports/latest.html

# Linux
xdg-open reports/latest.html

# Windows
start reports/latest.html
```

The report features:
- **Executive KPI Cards**: Milestone pass rates, average load times, LCP benchmarks, and total payload size.
- **Dual-Model AI Panel**: Side-by-side visual defect analysis and root-cause engineering advice.
- **Embedded Screenshots**: Full-viewport captures embedded directly with interactive lightbox zoom.
- **Network & Console Breakdown**: Classified request counts, slow endpoint tracking, and browser console error logs.

---

## Configuration Reference

All target URLs, browser parameters, performance thresholds, and AI model settings are centralized in [scoobies.config.js](scoobies.config.js):

```javascript
export default {
  target: {
    baseUrl: "https://scoobies.co.in",
    environment: "Production",
    searchQuery: "stationery",
    sampleProductHandle: "snack-container",
  },
  browser: {
    headless: true,
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 2, // High-DPI screenshots
    timeout: 35000,
    navigationTimeout: 35000,
  },
  ai: {
    visionModel: "qwen/qwen3.8-27b",
    reasonerModel: "openai/gpt-oss-120b",
    maxRetries: 3,
    retryDelayMs: 2000,
    enabled: true,
  },
  thresholds: {
    ttfbMs: 800,
    fcpMs: 1800,
    lcpMs: 2500,
    cls: 0.1,
    domContentLoadedMs: 3000,
    loadMs: 6000,
  },
  reporting: {
    outputDir: "./reports",
    includeBase64Screenshots: true,
  },
  email: {
    from: "Logs <logs@email.scoobies.ai>",
    subjectPrefix: "[QA Audit]",
  },
};
```

---

## Where Users Can Get Help

- **Issue Tracker**: Submit bug reports, feature requests, and edge-case reports via the repository's GitHub Issues tab.
- **Playwright Documentation**: Consult the [Playwright Official Documentation](https://playwright.dev/docs/intro) for browser automation and selector troubleshooting.
- **Groq API Reference**: Learn about model capabilities and rate limits on the [Groq Cloud Documentation](https://console.groq.com/docs).
- **Resend Documentation**: Learn more about email templates and deliverability on the [Resend Docs](https://resend.com/docs).
- **Direct Support**: Reach out to the maintainer via email for urgent queries or store integration assistance.

---

## Who Maintains & Contributes

### Project Maintainer

- **Himanshu** ([masanthimanshu@gmail.com](mailto:masanthimanshu@gmail.com))

### Contributing Guidelines

Contributions, suggestions, and improvements are welcome! Follow these steps to contribute:

1. **Fork the Repository**: Create your own copy of the repository on GitHub.
2. **Create a Feature Branch**:
   ```bash
   git checkout -b feature/your-feature-name
   ```
3. **Validate Your Changes**: Ensure the test suite executes cleanly:
   ```bash
   npm run test:fast
   ```
4. **Commit Your Code**: Keep commit messages concise and descriptive.
5. **Open a Pull Request**: Submit your pull request with a summary of changes and validation steps.

### License

This project is licensed under the [ISC License](package.json).
