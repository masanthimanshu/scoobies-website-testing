/**
 * Shared utilities for CLI parsing, HTML escaping, and metrics computation.
 */

/**
 * Escapes special HTML characters to prevent XSS and malformed tags.
 * @param {string} str
 * @returns {string}
 */
export function escapeHtml(str) {
  if (!str) return "";
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

/**
 * Computes consolidated summary KPIs and pass rates from milestone telemetry.
 * @param {Array} milestones
 * @param {string|number} [totalDurationSec="0.0"]
 * @returns {Object}
 */
export function calculateSummary(milestones = [], totalDurationSec = "0.0") {
  const len = milestones.length || 1;
  const passedCount = milestones.filter((m) => m.status === "PASS").length;
  const warnCount = milestones.filter((m) => m.status === "WARN").length;
  const failedCount = milestones.filter((m) => m.status === "FAIL").length;

  const totalTransferredKb = milestones.reduce(
    (acc, m) => acc + (m.performanceMetrics?.totalSizeKb || 0),
    0,
  );
  const totalLoadTime = milestones.reduce(
    (acc, m) =>
      acc +
      (m.performanceMetrics?.loadTimeMs ||
        m.performanceMetrics?.domContentLoadedMs ||
        0),
    0,
  );
  const totalLcp = milestones.reduce(
    (acc, m) => acc + (m.performanceMetrics?.lcpMs || 0),
    0,
  );

  return {
    passedCount,
    warnCount,
    failedCount,
    overallStatus: failedCount > 0 ? "FAIL" : warnCount > 0 ? "WARN" : "PASS",
    passRate: Math.round(((passedCount + warnCount) / len) * 100),
    avgLoadTime: Math.round(totalLoadTime / len),
    avgLcp: Math.round(totalLcp / len),
    totalTransferredKb,
    totalTransferredMb: (totalTransferredKb / 1024).toFixed(2),
    totalDurationSec: String(totalDurationSec),
  };
}

/**
 * Retrieves the value of a CLI flag with optional fallback.
 * @param {string|string[]} flags - Flag or array of flag aliases (e.g. ['--to', '--email'])
 * @param {*} [fallback=null]
 * @param {string[]} [args=process.argv.slice(2)]
 * @returns {*}
 */
export function getArg(flags, fallback = null, args = process.argv.slice(2)) {
  const flagList = Array.isArray(flags) ? flags : [flags];
  for (const flag of flagList) {
    const idx = args.indexOf(flag);
    if (idx !== -1 && args[idx + 1] && !args[idx + 1].startsWith("--")) {
      return args[idx + 1];
    }
  }
  return fallback;
}

/**
 * Checks if a CLI flag is present.
 * @param {string|string[]} flags
 * @param {string[]} [args=process.argv.slice(2)]
 * @returns {boolean}
 */
export function hasFlag(flags, args = process.argv.slice(2)) {
  const flagList = Array.isArray(flags) ? flags : [flags];
  return flagList.some((f) => args.includes(f));
}
