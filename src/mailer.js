#!/usr/bin/env node

const path = require("path");
const fs = require("fs");
const resendClient = require("./email/resendClient");
const config = require("../scoobies.config");
require("dotenv").config();

const args = process.argv.slice(2);

function getArgValue(flag) {
  const index = args.indexOf(flag);
  return index !== -1 && args[index + 1] ? args[index + 1] : null;
}

const toEmail =
  getArgValue("--to") ||
  getArgValue("--email") ||
  config.email?.defaultTo ||
  process.env.REPORT_RECIPIENT_EMAIL;
const reportFile =
  getArgValue("--report") || path.resolve("./reports/latest.html");
const subject = getArgValue("--subject");

if (!toEmail) {
  console.error("\n❌ Error: Recipient email address is required.");
  console.error("Usage: node src/mailer.js --to <recipient@example.com>");
  console.error("Or set REPORT_RECIPIENT_EMAIL in .env\n");
  process.exit(1);
}

async function send() {
  let milestones = [];
  let summary = {};

  const telemetryPath = path.resolve("./reports/latest-run.json");
  if (fs.existsSync(telemetryPath)) {
    try {
      milestones = JSON.parse(fs.readFileSync(telemetryPath, "utf8"));
    } catch (e) {
      console.warn("⚠️ Could not load telemetry JSON, sending basic summary.");
    }
  }

  try {
    const result = await resendClient.sendReport({
      to: toEmail,
      subject,
      reportPath: reportFile,
      milestones,
      summary,
    });

    console.log("---------------------------------------------------------");
    console.log(`✉️  Delivery Confirmed:`);
    console.log(`   Message ID : ${result.id}`);
    console.log(`   Sender     : ${result.sender}`);
    console.log(`   Recipient  : ${result.recipients.join(", ")}`);
    console.log("---------------------------------------------------------\n");
    process.exit(0);
  } catch (err) {
    console.error("❌ Failed to send report email:", err.message);
    process.exit(1);
  }
}

send();
