#!/usr/bin/env node

import path from "path";
import config from "../scoobies.config.js";
import resendClient from "./email/resendClient.js";
import { getArg } from "./utils.js";

const toEmail = getArg(
  ["--to", "--email"],
  process.env.REPORT_RECIPIENT_EMAIL || config.email?.defaultTo || null,
);
const reportFile = getArg("--report", path.resolve("./reports/latest.html"));
const subject = getArg("--subject");

if (!toEmail) {
  console.error("\n❌ Error: Recipient email address is required.");
  console.error("Usage: node src/mailer.js --to <recipient@example.com>");
  console.error("Or set REPORT_RECIPIENT_EMAIL in .env\n");
  process.exit(1);
}

async function send() {
  try {
    const result = await resendClient.sendReport({
      to: toEmail,
      subject,
      reportPath: reportFile,
    });

    console.log("---------------------------------------------------------");
    console.log("✉️  Delivery Confirmed:");
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
