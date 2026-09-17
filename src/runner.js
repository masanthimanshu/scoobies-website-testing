#!/usr/bin/env node

const { chromium } = require("playwright");
const path = require("path");
const fs = require("fs");
const config = require("../scoobies.config");
const UserJourney = require("./journeys/userJourney");
const ReportGenerator = require("./reporter/reportGenerator");
require("dotenv").config();

// Parse CLI flags
const args = process.argv.slice(2);
const isHeaded = args.includes("--headed");
const noAi = args.includes("--no-ai");
const outputDirArgIndex = args.indexOf("--output-dir");
const outputDir =
  outputDirArgIndex !== -1 && args[outputDirArgIndex + 1]
    ? args[outputDirArgIndex + 1]
    : config.reporting.outputDir;

const customKeywordIndex = args.indexOf("--keyword");
if (customKeywordIndex !== -1 && args[customKeywordIndex + 1]) {
  config.target.searchQuery = args[customKeywordIndex + 1];
}

const emailArgIndex =
  args.indexOf("--email") !== -1
    ? args.indexOf("--email")
    : args.indexOf("--to");
const recipientEmail =
  emailArgIndex !== -1 && args[emailArgIndex + 1]
    ? args[emailArgIndex + 1]
    : process.env.REPORT_RECIPIENT_EMAIL || config.email?.defaultTo || null;

async function runTestSuite() {
  console.log(
    "\n===============================================================",
  );
  console.log("  SCOOBIES.CO.IN PRODUCTION QA & PERFORMANCE AUDITING SUITE");
  console.log(
    "===============================================================",
  );
  console.log(`  🌐 Target URL       : ${config.target.baseUrl}`);
  console.log(`  🖥️  Headless Mode   : ${!isHeaded}`);
  console.log(
    `  🤖 Dual-Model AI   : ${noAi ? "DISABLED (--no-ai)" : "ENABLED (Groq API)"}`,
  );
  if (!noAi) {
    console.log(`     - Vision Model   : ${config.ai.visionModel}`);
    console.log(`     - Reasoner Model : ${config.ai.reasonerModel}`);
  }
  console.log(`  📁 Output Directory : ${outputDir}`);
  console.log(
    "===============================================================\n",
  );

  const startTime = Date.now();
  let browser = null;
  let milestones = [];

  try {
    browser = await chromium.launch({
      headless: !isHeaded,
      args: [
        "--no-sandbox",
        "--disable-setuid-sandbox",
        "--disable-dev-shm-usage",
      ],
    });

    const context = await browser.newContext({
      viewport: config.browser.viewport,
      deviceScaleFactor: config.browser.deviceScaleFactor,
      userAgent: config.browser.userAgent,
    });

    const page = await context.newPage();
    page.setDefaultTimeout(config.browser.timeout);
    page.setDefaultNavigationTimeout(config.browser.navigationTimeout);

    const journey = new UserJourney({
      context,
      page,
      enableAi: !noAi,
      outputDir,
    });

    milestones = await journey.executeFullJourney();
  } catch (err) {
    console.error("\n❌ Fatal error executing test suite:", err);
  } finally {
    if (browser) {
      await browser.close();
    }
  }

  const endTime = Date.now();
  const totalDurationSec = ((endTime - startTime) / 1000).toFixed(1);

  // Save raw structured telemetry
  fs.writeFileSync(
    path.join(outputDir, "latest-run.json"),
    JSON.stringify(milestones, null, 2),
    "utf8",
  );

  // Generate Standalone HTML Report
  console.log("\n📊 Generating Standalone HTML Test Report...");
  const reportInfo = ReportGenerator.generateReport({
    milestones,
    startTime,
    endTime,
    outputDir,
  });

  // Terminal Summary
  console.log(
    "\n===============================================================",
  );
  console.log(
    "                     EXECUTION SUMMARY                         ",
  );
  console.log(
    "===============================================================",
  );
  milestones.forEach((m) => {
    const statusIcon =
      m.status === "PASS" ? "✅" : m.status === "WARN" ? "⚠️ " : "❌";
    const loadTime = m.performanceMetrics?.loadTimeMs
      ? `${m.performanceMetrics.loadTimeMs}ms`
      : "N/A";
    const lcp = m.performanceMetrics?.lcpMs
      ? `${m.performanceMetrics.lcpMs}ms`
      : "N/A";
    console.log(
      `  ${statusIcon} [Milestone ${m.id}] ${m.name.padEnd(42)} [${m.status}] (${m.durationMs}ms) | Load: ${loadTime} | LCP: ${lcp}`,
    );
  });
  console.log(
    "---------------------------------------------------------------",
  );
  console.log(`  ⏱️  Total Duration   : ${totalDurationSec}s`);
  console.log(`  📄 Full HTML Report : ${path.resolve(reportInfo.reportPath)}`);
  console.log(`  🔗 Latest Report    : ${path.resolve(reportInfo.latestPath)}`);

  // Dispatch email if recipient specified
  if (recipientEmail) {
    try {
      const resendClient = require("./email/resendClient");
      await resendClient.sendReport({
        to: recipientEmail,
        reportPath: reportInfo.latestPath,
        milestones,
        summary: {
          totalDurationSec,
        },
      });
    } catch (emailErr) {
      console.error("⚠️ Failed to dispatch report email:", emailErr.message);
    }
  }

  console.log(
    "===============================================================\n",
  );

  const hasFailures = milestones.some((m) => m.status === "FAIL");
  if (hasFailures) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

runTestSuite().catch((err) => {
  console.error("Unhandled runner error:", err);
  process.exit(1);
});
