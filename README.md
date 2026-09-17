# Scoobies.co.in Automated Testing & Performance Auditing Suite

### Dual-Model AI Intelligence Powered by Groq (`qwen/qwen3.8-27b` + `openai/gpt-oss-120b`)

A production-grade, end-to-end automated testing and performance auditing suite designed specifically for the Indian e-commerce storefront [https://scoobies.co.in/](https://scoobies.co.in/).

---

## 🚀 Key Features

- **End-to-End User Journey**:
  1. **Homepage Browsing & Storefront Audit**: Validates hero banners, navigation hierarchy, announcement bars, and layout stability.
  2. **Search Discovery & Catalog Filtering**: Executes search queries (e.g. `stationery`), validates search input, filters, sort dropdowns, and product grid rendering.
  3. **Product Selection & PDP Deep Dive**: Inspects Product Detail Pages (PDP), pricing (sale vs regular), variant options, image galleries, and Add-to-Cart readiness.
  4. **Cart Modification & Item Quantity Update**: Interacts with cart notifications/drawers, navigates to `/cart`, audits line items, updates item quantity, and checks subtotal calculations.
  5. **Checkout Navigation & Step Validation**: Initiates checkout, safely routes to the Shopify checkout pipeline (`/checkouts/...`), and validates contact email and shipping address forms without placing real orders or charging credit cards.

- **Dual-Model Groq AI Diagnostic Architecture**:
  - 👁️ **Multimodal Vision Model (`qwen/qwen3.8-27b`)**: Inspects full-viewport high-resolution screenshots at every milestone for visual defects, layout clipping, overlapping text, ghosting/sticky header issues, and obstructive popups/overlays.
  - 🧠 **Diagnostic Reasoning Model (`openai/gpt-oss-120b`)**: Ingests structured DOM snapshots, network HAR data (status codes, transfer sizes, slow endpoints), console errors, and Core Web Vitals to conduct root-cause failure analysis and generate actionable engineering recommendations.

- **Deep Performance & Reliability Auditing**:
  - **Core Web Vitals**: TTFB, FCP (First Contentful Paint), LCP (Largest Contentful Paint), CLS (Cumulative Layout Shift).
  - **Network Payload Breakdown**: Total KB/MB transferred, request counts, resource classification (scripts, styles, images, fetch/xhr, fonts).
  - **Console & Network Anomaly Tracking**: Captures 4xx/5xx responses, slow endpoints (> 1500ms), and browser console errors/warnings.

- **Executive Standalone HTML Report**:
  - Completely self-contained single-file HTML report (`reports/latest.html`).
  - Dark-mode themed dashboard with glassmorphic cards and color-coded status badges.
  - High-resolution screenshots embedded directly with interactive click-to-expand lightbox zoom.
  - Side-by-side AI diagnostic cards with health grades and engineering guidance.

- **Automated Email Dispatch (Resend)**:
  - Dispatches clean, responsive HTML executive summaries via the official Resend API.
  - Verified sender: `Logs <logs@email.scoobies.ai>`.
  - Attaches the complete standalone HTML test report (`scoobies-qa-report.html`) with embedded screenshots.

---

## 📁 Repository Structure

```
scoobies-website-testing/
├── Dockerfile                 # Official Playwright container definition
├── compose.yaml                # Container orchestration with volume mounts & profiles
├── .dockerignore              # Docker build context optimization
├── .gitignore                 # Excludes node_modules, reports, secrets & OS files
├── .env                       # GROQ_API_KEY & RESEND_API_KEY configuration
├── package.json               # Dependencies and runner scripts
├── scoobies.config.js         # Centralized configuration & thresholds
├── README.md                  # Comprehensive documentation
├── src/
│   ├── runner.js              # Master CLI runner and orchestrator
│   ├── mailer.js              # Standalone Resend email dispatcher CLI
│   ├── ai/
│   │   ├── groqClient.js      # Resilient Groq API client with exponential backoff
│   │   ├── visionAuditor.js   # Qwen 3.8-27B multimodal visual auditor
│   │   └── rootCauseAnalyst.js# GPT OSS 120B root-cause failure & reliability reasoner
│   ├── audits/
│   │   └── performanceAuditor.js # Web Vitals, network telemetry & DOM harvester
│   ├── journeys/
│   │   └── userJourney.js     # 5-milestone end-to-end journey execution
│   ├── email/
│   │   └── resendClient.js    # Resend SDK client with HTML generator & attachments
│   └── reporter/
│       └── reportGenerator.js # Standalone HTML report generator with embedded lightbox
└── reports/                   # Generated HTML test reports & screenshots
    ├── latest.html            # Latest test report symlink/copy
    ├── latest-run.json        # Structured milestone telemetry
    └── screenshots/           # Milestone high-resolution images
```

---

## 🛠️ Installation & Setup

1. **Install Dependencies**:

   ```bash
   npm install
   ```

2. **Ensure Chromium is Installed**:

   ```bash
   npx playwright install chromium
   ```

3. **Configure Environment**:
   Ensure `.env` contains your API keys:
   ```env
   GROQ_API_KEY=gsk_your_groq_api_key_here
   RESEND_API_KEY=re_your_resend_api_key_here
   ```

---

## 🏃 Running the Tests

### 1. Full Production Run (with AI Dual-Model Diagnostics)

Executes the full 5-milestone journey, captures screenshots, queries `qwen/qwen3.8-27b` and `openai/gpt-oss-120b`, and outputs the HTML report:

```bash
npm test
```

### 2. Full Test Run with Automatic Email Dispatch

Executes the suite and immediately sends the summary + attached HTML report to the recipient:

```bash
node src/runner.js --email recipient@example.com
```

### 3. Live Headed Mode (Watch in Browser)

Launches the Chromium browser window for real-time visual inspection:

```bash
npm run test:headed
```

### 4. Fast Mode (Disable AI for Quick Local Sanity Check)

Runs the end-to-end test and captures performance metrics without making Groq API calls:

```bash
npm run test:fast
```

---

## 📧 Sending Reports via Resend

To dispatch the latest generated test report on demand:

```bash
npm run email -- --to recipient@example.com
# or
node src/mailer.js --to recipient@example.com
```

Sender: `Logs <logs@email.scoobies.ai>`
Format:

- **Email Body**: 100% inline-styled executive dashboard (< 100 KB, 0% Gmail clipping) with embedded CID screenshots.
- **Attachment**: `scoobies-qa-report.html` (interactive standalone report with filter tabs, zoom lightbox, and traces).

---

## 🐳 Docker & Docker Compose

The suite is fully containerized using the official Microsoft Playwright image (`mcr.microsoft.com/playwright:v1.50.1-noble`), requiring zero local browser installations.

### Using Docker Compose (Recommended)

1. **Run Full QA Suite (with Groq AI Diagnostics)**:

   ```bash
   docker compose up --build
   ```

2. **Run Fast Mode (E2E Test without AI Diagnostics)**:

   ```bash
   docker compose --profile fast run --rm scoobies-qa-fast
   ```

3. **Dispatch Email Report on Demand**:
   ```bash
   docker compose --profile mailer run --rm scoobies-mailer
   ```

> **Volume Persistence**: The `./reports` directory on your host is mapped directly to `/app/reports` inside the container, ensuring that `latest.html`, JSON telemetry, and captured milestone screenshots persist locally after every container run.

### Using Plain Docker

1. **Build the Image**:

   ```bash
   docker build -t scoobies-qa-suite .
   ```

2. **Run Container**:
   ```bash
   docker run --rm --ipc=host --env-file .env -v "$(pwd)/reports:/app/reports" scoobies-qa-suite
   ```

---

## 📊 Viewing the Test Report

Open the generated standalone HTML report in any web browser:

```bash
open reports/latest.html
```

No web server required—the report is completely self-contained with embedded base64 screenshots and inline styles.
