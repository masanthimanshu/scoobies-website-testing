#!/usr/bin/env node

import { chromium } from "playwright";
import path from "path";
import fs from "fs";
import config from "../scoobies.config.js";
import UserJourney from "./journeys/userJourney.js";
import ReportGenerator from "./reporter/reportGenerator.js";
import resendClient from "./email/resendClient.js";
import { getArg, hasFlag } from "./utils.js";

// Parse CLI flags
const isHeaded = hasFlag("--headed");
const noAi = hasFlag("--no-ai");
const outputDir = getArg("--output-dir", config.reporting.outputDir);
const customKeyword = getArg(["--keyword", "-k"]);
if (customKeyword) {
  config.target.searchQuery = customKeyword;
}

const recipientEmail = getArg(
  ["--email", "--to"],
  process.env.REPORT_RECIPIENT_EMAIL || config.email?.defaultTo || null,
);

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

  // Persist raw structured telemetry
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
    const icon =
      m.status === "PASS" ? "✅" : m.status === "WARN" ? "⚠️ " : "❌";
    const load = m.performanceMetrics?.loadTimeMs
      ? `${m.performanceMetrics.loadTimeMs}ms`
      : "N/A";
    const lcp = m.performanceMetrics?.lcpMs
      ? `${m.performanceMetrics.lcpMs}ms`
      : "N/A";
    console.log(
      `  ${icon} [Milestone ${m.id}] ${m.name.padEnd(42)} [${m.status}] (${m.durationMs}ms) | Load: ${load} | LCP: ${lcp}`,
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
      await resendClient.sendReport({
        to: recipientEmail,
        reportPath: reportInfo.latestPath,
        milestones,
        summary: { totalDurationSec },
      });
    } catch (emailErr) {
      console.error("⚠️ Failed to dispatch report email:", emailErr.message);
    }
  }

  console.log(
    "===============================================================\n",
  );

  const hasFailures = milestones.some((m) => m.status === "FAIL");
  process.exit(hasFailures ? 1 : 0);
}

runTestSuite().catch((err) => {
  console.error("Unhandled runner error:", err);
  process.exit(1);
});
