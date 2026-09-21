import fs from "fs";
import path from "path";
import config from "../../scoobies.config.js";
import { escapeHtml, calculateSummary } from "../utils.js";

class ReportGenerator {
  /**
   * Formats markdown text into clean, structured HTML elements.
   * @param {string} text
   * @returns {string}
   */
  static formatMarkdown(text) {
    if (!text)
      return '<p class="report-p text-muted">No diagnostic output available.</p>';

    const safeText = escapeHtml(text);
    const lines = safeText.split("\n");
    const out = [];
    let inList = false;
    let listItems = [];
    let inTable = false;
    let tableRows = [];

    const flushList = () => {
      if (inList && listItems.length) {
        out.push(
          `<ul class="report-list">${listItems.map((i) => `<li>${i}</li>`).join("")}</ul>`,
        );
        listItems = [];
        inList = false;
      }
    };

    const flushTable = () => {
      if (inTable && tableRows.length >= 2) {
        const headers = tableRows[0]
          .split("|")
          .filter((c) => c.trim())
          .map((c) => `<th>${c.trim()}</th>`)
          .join("");
        const bodyRows = tableRows
          .slice(2)
          .map((r) => {
            const cells = r
              .split("|")
              .filter((c) => c.trim())
              .map((c) => `<td>${c.trim()}</td>`)
              .join("");
            return `<tr>${cells}</tr>`;
          })
          .join("");
        out.push(
          `<div class="table-wrap"><table class="report-table"><thead><tr>${headers}</tr></thead><tbody>${bodyRows}</tbody></table></div>`,
        );
        tableRows = [];
        inTable = false;
      }
    };

    for (const raw of lines) {
      const line = raw.trim();
      if (!line) {
        flushList();
        flushTable();
        continue;
      }

      if (line.startsWith("|") && line.endsWith("|")) {
        flushList();
        inTable = true;
        tableRows.push(line);
        continue;
      }
      flushTable();

      if (/^([-*]|\d+\.)\s+/.test(line)) {
        inList = true;
        listItems.push(line.replace(/^([-*]|\d+\.)\s+/, ""));
        continue;
      }
      flushList();

      if (line.startsWith("#### "))
        out.push(`<h5 class="report-h5">${line.slice(5)}</h5>`);
      else if (line.startsWith("### "))
        out.push(`<h4 class="report-h4">${line.slice(4)}</h4>`);
      else if (line.startsWith("## "))
        out.push(`<h3 class="report-h3">${line.slice(3)}</h3>`);
      else if (line.startsWith("# "))
        out.push(`<h2 class="report-h2">${line.slice(2)}</h2>`);
      else if (line === "---" || line === "***")
        out.push('<hr class="report-divider">');
      else out.push(`<p class="report-p">${line}</p>`);
    }

    flushList();
    flushTable();

    return out
      .join("\n")
      .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
      .replace(/`([^`]+)`/g, '<code class="inline-code">$1</code>');
  }

  /**
   * Generates a standalone, executive minimal light-theme HTML test report.
   * @param {Object} options
   * @param {Array} options.milestones
   * @param {number} options.startTime
   * @param {number} options.endTime
   * @param {string} [options.outputDir="./reports"]
   */
  static generateReport({
    milestones = [],
    startTime,
    endTime,
    outputDir = "./reports",
  }) {
    const totalDurationSec = ((endTime - startTime) / 1000).toFixed(1);
    const summary = calculateSummary(milestones, totalDurationSec);

    const generatedDate = new Date().toLocaleString("en-IN", {
      timeZone: "Asia/Kolkata",
      dateStyle: "medium",
      timeStyle: "short",
    });

    const htmlContent = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Scoobies — QA & Performance Audit</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet">
  <style>
    :root {
      --bg: #f8fafc;
      --surface: #ffffff;
      --surface-subtle: #f1f5f9;
      --border: #e2e8f0;
      --text-main: #0f172a;
      --text-muted: #475569;
      --text-subtle: #94a3b8;
      --pass: #166534;
      --pass-bg: #f0fdf4;
      --pass-border: #bbf7d0;
      --warn: #9a3412;
      --warn-bg: #fff7ed;
      --warn-border: #fed7aa;
      --fail: #991b1b;
      --fail-bg: #fef2f2;
      --fail-border: #fecaca;
      --primary: #2563eb;
      --radius-sm: 6px;
      --radius-md: 10px;
      --radius-lg: 14px;
      --shadow-sm: 0 1px 2px 0 rgba(0, 0, 0, 0.04);
    }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
      background-color: var(--bg);
      color: var(--text-main);
      line-height: 1.5;
      -webkit-font-smoothing: antialiased;
      padding: 2rem 1.25rem;
    }
    .container { max-width: 1360px; margin: 0 auto; }
    .top-header {
      background: var(--surface);
      border: 1px solid var(--border);
      border-radius: var(--radius-lg);
      padding: 1.5rem 1.75rem;
      box-shadow: var(--shadow-sm);
      margin-bottom: 1.25rem;
    }
    .header-row { display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 1rem; }
    .brand-area { display: flex; align-items: center; gap: 0.85rem; }
    .brand-icon {
      width: 38px; height: 38px; border-radius: var(--radius-sm);
      background: #0f172a; color: #fff; display: flex; align-items: center;
      justify-content: center; font-weight: 700; font-size: 1rem;
    }
    .title-group h1 { font-size: 1.25rem; font-weight: 600; letter-spacing: -0.02em; color: var(--text-main); }
    .title-group p { font-size: 0.825rem; color: var(--text-muted); }
    .badge {
      display: inline-flex; align-items: center; gap: 0.4rem; padding: 0.35rem 0.75rem;
      border-radius: 9999px; font-size: 0.8rem; font-weight: 600;
    }
    .badge.pass { background: var(--pass-bg); color: var(--pass); border: 1px solid var(--pass-border); }
    .badge.warn { background: var(--warn-bg); color: var(--warn); border: 1px solid var(--warn-border); }
    .badge.fail { background: var(--fail-bg); color: var(--fail); border: 1px solid var(--fail-border); }
    .status-dot { width: 6px; height: 6px; border-radius: 50%; background: currentColor; }
    .kpi-row { display: grid; grid-template-columns: repeat(auto-fit, minmax(190px, 1fr)); gap: 0.75rem; margin-bottom: 1.25rem; }
    .kpi-card {
      background: var(--surface); border: 1px solid var(--border);
      border-radius: var(--radius-md); padding: 1rem 1.25rem; box-shadow: var(--shadow-sm);
    }
    .kpi-label { font-size: 0.75rem; color: var(--text-subtle); text-transform: uppercase; font-weight: 600; letter-spacing: 0.04em; }
    .kpi-value { font-size: 1.35rem; font-weight: 600; color: var(--text-main); margin-top: 0.25rem; }
    .kpi-meta { font-size: 0.75rem; color: var(--text-muted); margin-top: 0.2rem; }
    .specs-strip {
      display: flex; align-items: center; gap: 1.5rem; flex-wrap: wrap; background: var(--surface);
      border: 1px solid var(--border); border-radius: var(--radius-md); padding: 0.65rem 1.25rem;
      font-size: 0.8rem; color: var(--text-muted); margin-bottom: 1.25rem; box-shadow: var(--shadow-sm);
    }
    .spec-item strong { color: var(--text-main); font-family: 'JetBrains Mono', monospace; font-weight: 500; font-size: 0.775rem; }
    .filter-tabs { display: flex; gap: 0.5rem; overflow-x: auto; padding-bottom: 0.25rem; margin-bottom: 1.25rem; }
    .filter-btn {
      background: var(--surface); border: 1px solid var(--border); border-radius: var(--radius-sm);
      padding: 0.5rem 0.9rem; font-size: 0.8rem; font-weight: 500; color: var(--text-muted);
      cursor: pointer; white-space: nowrap; transition: all 0.15s ease;
    }
    .filter-btn:hover { background: var(--surface-subtle); color: var(--text-main); }
    .filter-btn.active { background: #0f172a; color: #ffffff; border-color: #0f172a; }
    .milestones-wrapper { display: flex; flex-direction: column; gap: 1.25rem; }
    .milestone-item {
      background: var(--surface); border: 1px solid var(--border);
      border-radius: var(--radius-lg); box-shadow: var(--shadow-sm); overflow: hidden;
    }
    .milestone-header {
      padding: 1.15rem 1.5rem; background: #ffffff; border-bottom: 1px solid var(--border);
      display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 0.75rem;
    }
    .m-header-left { display: flex; align-items: center; gap: 0.85rem; }
    .m-index {
      width: 28px; height: 28px; border-radius: var(--radius-sm); background: var(--surface-subtle);
      border: 1px solid var(--border); font-size: 0.85rem; font-weight: 600; display: flex;
      align-items: center; justify-content: center; color: var(--text-main);
    }
    .m-title { font-size: 1rem; font-weight: 600; color: var(--text-main); }
    .m-url { font-size: 0.78rem; color: var(--text-subtle); font-family: 'JetBrains Mono', monospace; text-decoration: none; margin-left: 0.5rem; }
    .m-url:hover { color: var(--primary); text-decoration: underline; }
    .m-duration { font-size: 0.8rem; color: var(--text-subtle); margin-right: 0.75rem; }
    .milestone-content { padding: 1.5rem; display: grid; grid-template-columns: 460px 1fr; gap: 1.5rem; }
    @media (max-width: 1024px) { .milestone-content { grid-template-columns: 1fr; } }
    .left-panel { display: flex; flex-direction: column; gap: 1rem; }
    .browser-frame { border: 1px solid var(--border); border-radius: var(--radius-md); overflow: hidden; background: #ffffff; }
    .browser-toolbar {
      background: #f8fafc; padding: 0.5rem 0.75rem; border-bottom: 1px solid var(--border);
      display: flex; justify-content: space-between; align-items: center;
    }
    .toolbar-dots { display: flex; gap: 5px; }
    .toolbar-dots span { width: 8px; height: 8px; border-radius: 50%; background: #cbd5e1; }
    .toolbar-label { font-size: 0.7rem; color: var(--text-subtle); font-weight: 500; }
    .toolbar-zoom { font-size: 0.725rem; color: var(--primary); cursor: pointer; font-weight: 500; }
    .preview-image { width: 100%; max-height: 380px; object-fit: cover; object-position: top; display: block; cursor: zoom-in; }
    .metrics-bar { display: grid; grid-template-columns: repeat(3, 1fr); gap: 0.5rem; }
    .metric-box { background: var(--surface-subtle); border: 1px solid var(--border); border-radius: var(--radius-sm); padding: 0.5rem 0.65rem; text-align: center; }
    .mb-label { font-size: 0.65rem; color: var(--text-subtle); text-transform: uppercase; font-weight: 600; }
    .mb-value { font-size: 0.95rem; font-weight: 600; color: var(--text-main); font-family: 'JetBrains Mono', monospace; margin-top: 0.1rem; }
    details.tech-accordion { border: 1px solid var(--border); border-radius: var(--radius-sm); background: #ffffff; font-size: 0.8rem; }
    details.tech-accordion summary { padding: 0.6rem 0.85rem; cursor: pointer; user-select: none; font-weight: 500; color: var(--text-muted); background: #f8fafc; }
    details.tech-accordion summary:hover { color: var(--text-main); }
    .accordion-inner { padding: 0.75rem; font-family: 'JetBrains Mono', monospace; font-size: 0.75rem; max-height: 200px; overflow-y: auto; border-top: 1px solid var(--border); }
    .log-row { padding: 0.25rem 0; border-bottom: 1px solid #f1f5f9; display: flex; gap: 0.5rem; }
    .log-warn { color: var(--warn); }
    .log-err { color: var(--fail); }
    .right-panel { display: flex; flex-direction: column; gap: 1rem; }
    .ai-block { border: 1px solid var(--border); border-radius: var(--radius-md); background: #ffffff; padding: 1.25rem; }
    .ai-block-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.85rem; padding-bottom: 0.65rem; border-bottom: 1px solid var(--border); }
    .ai-tag { font-size: 0.75rem; font-weight: 600; color: var(--text-main); display: flex; align-items: center; gap: 0.4rem; }
    .ai-subtag { font-size: 0.7rem; color: var(--text-subtle); font-family: 'JetBrains Mono', monospace; font-weight: 400; }
    .score-chip { font-size: 0.75rem; font-weight: 600; padding: 0.2rem 0.5rem; border-radius: var(--radius-sm); background: var(--pass-bg); color: var(--pass); border: 1px solid var(--pass-border); }
    .report-p { font-size: 0.875rem; color: var(--text-muted); margin-bottom: 0.65rem; line-height: 1.6; }
    .report-h4 { font-size: 0.925rem; font-weight: 600; color: var(--text-main); margin: 0.75rem 0 0.4rem 0; }
    .report-h5 { font-size: 0.825rem; font-weight: 600; color: var(--text-main); margin: 0.65rem 0 0.35rem 0; text-transform: uppercase; letter-spacing: 0.02em; }
    .report-list { padding-left: 1.25rem; font-size: 0.85rem; color: var(--text-muted); margin-bottom: 0.75rem; }
    .report-list li { margin-bottom: 0.3rem; line-height: 1.5; }
    .inline-code { font-family: 'JetBrains Mono', monospace; font-size: 0.75rem; background: var(--surface-subtle); padding: 0.15rem 0.35rem; border-radius: 4px; color: #0f172a; border: 1px solid var(--border); }
    .table-wrap { overflow-x: auto; margin: 0.75rem 0; border: 1px solid var(--border); border-radius: var(--radius-sm); }
    .report-table { width: 100%; border-collapse: collapse; font-size: 0.78rem; text-align: left; }
    .report-table th { background: #f8fafc; padding: 0.5rem 0.75rem; font-weight: 600; color: var(--text-muted); border-bottom: 1px solid var(--border); }
    .report-table td { padding: 0.45rem 0.75rem; border-bottom: 1px solid #f1f5f9; color: var(--text-muted); }
    .report-table tr:last-child td { border-bottom: none; }
    .report-divider { border: none; height: 1px; background: var(--border); margin: 0.85rem 0; }
    .lightbox-modal { display: none; position: fixed; inset: 0; background: rgba(15, 23, 42, 0.7); backdrop-filter: blur(4px); z-index: 9999; justify-content: center; align-items: center; padding: 2rem; }
    .lightbox-modal.open { display: flex; }
    .lightbox-img { max-width: 90vw; max-height: 88vh; border-radius: var(--radius-md); box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.2); border: 1px solid #ffffff; background: #ffffff; }
    .lightbox-close { position: absolute; top: 1.5rem; right: 2rem; color: #ffffff; font-size: 1.75rem; cursor: pointer; font-weight: 600; }
    footer { text-align: center; margin-top: 2.5rem; font-size: 0.78rem; color: var(--text-subtle); }
  </style>
</head>
<body>
  <div class="container">
    <header class="top-header">
      <div class="header-row">
        <div class="brand-area">
          <div class="brand-icon">S</div>
          <div class="title-group">
            <h1>Scoobies India &bull; Quality & Performance Audit</h1>
            <p>Automated User Journey with Dual-Model AI Intelligence</p>
          </div>
        </div>
        <div class="badge ${summary.overallStatus.toLowerCase()}">
          <span class="status-dot"></span>
          <span>${summary.overallStatus === "WARN" ? "Completed with Warnings" : summary.overallStatus} (${summary.passRate}%)</span>
        </div>
      </div>
    </header>

    <section class="kpi-row">
      <div class="kpi-card">
        <div class="kpi-label">Pass Rate</div>
        <div class="kpi-value">${summary.passRate}%</div>
        <div class="kpi-meta">${summary.passedCount + summary.warnCount} of ${milestones.length} milestones passed</div>
      </div>
      <div class="kpi-card">
        <div class="kpi-label">Execution Time</div>
        <div class="kpi-value">${summary.totalDurationSec}s</div>
        <div class="kpi-meta">${milestones.length} milestones verified</div>
      </div>
      <div class="kpi-card">
        <div class="kpi-label">Avg LCP</div>
        <div class="kpi-value">${summary.avgLcp} ms</div>
        <div class="kpi-meta">Benchmark: &lt; 2,500 ms</div>
      </div>
      <div class="kpi-card">
        <div class="kpi-label">Avg Page Load</div>
        <div class="kpi-value">${summary.avgLoadTime} ms</div>
        <div class="kpi-meta">Full window load event</div>
      </div>
      <div class="kpi-card">
        <div class="kpi-label">Network Transferred</div>
        <div class="kpi-value">${summary.totalTransferredMb} MB</div>
        <div class="kpi-meta">${milestones.reduce((acc, m) => acc + (m.performanceMetrics?.requestCount || 0), 0)} total requests</div>
      </div>
    </section>

    <div class="specs-strip">
      <div class="spec-item">Storefront: <strong>https://scoobies.co.in/</strong></div>
      <div class="spec-item">Vision Model: <strong>${config.ai.visionModel}</strong></div>
      <div class="spec-item">Reasoner Model: <strong>${config.ai.reasonerModel}</strong></div>
      <div class="spec-item">Timestamp: <strong>${generatedDate}</strong></div>
    </div>

    <div class="filter-tabs">
      <button class="filter-btn active" onclick="filterMilestone('all', this)">All Milestones (${milestones.length})</button>
      ${milestones
        .map(
          (m) =>
            `<button class="filter-btn" onclick="filterMilestone(${m.id}, this)">${m.id}. ${m.name.split("&")[0].trim()}</button>`,
        )
        .join("")}
    </div>

    <main class="milestones-wrapper">
      ${milestones
        .map((m) => {
          const perf = m.performanceMetrics || {};
          const screenshotSrc = m.screenshot?.base64
            ? `data:image/jpeg;base64,${m.screenshot.base64}`
            : m.screenshot?.filepath
              ? `./screenshots/${m.screenshot.filename}`
              : "";

          return `
        <article class="milestone-item" id="m-${m.id}" data-id="${m.id}">
          <div class="milestone-header">
            <div class="m-header-left">
              <div class="m-index">${m.id}</div>
              <h2 class="m-title">${m.name}</h2>
              <a href="${m.url}" target="_blank" rel="noopener noreferrer" class="m-url">${m.url.replace("https://scoobies.co.in", "") || "/"}</a>
            </div>
            <div>
              <span class="m-duration">${(m.durationMs / 1000).toFixed(1)}s</span>
              <span class="badge ${m.status.toLowerCase()}">${m.status}</span>
            </div>
          </div>

          <div class="milestone-content">
            <div class="left-panel">
              ${
                screenshotSrc
                  ? `
              <div class="browser-frame">
                <div class="browser-toolbar">
                  <div class="toolbar-dots"><span></span><span></span><span></span></div>
                  <span class="toolbar-label">1440 × 900</span>
                  <span class="toolbar-zoom" onclick="openLightbox('${screenshotSrc}')">Expand ↗</span>
                </div>
                <img src="${screenshotSrc}" alt="Screenshot of ${m.name}" class="preview-image" onclick="openLightbox('${screenshotSrc}')">
              </div>`
                  : ""
              }

              <div class="metrics-bar">
                <div class="metric-box">
                  <div class="mb-label">TTFB</div>
                  <div class="mb-value">${perf.ttfbMs || 0} ms</div>
                </div>
                <div class="metric-box">
                  <div class="mb-label">FCP</div>
                  <div class="mb-value">${perf.fcpMs || 0} ms</div>
                </div>
                <div class="metric-box">
                  <div class="mb-label">LCP</div>
                  <div class="mb-value">${perf.lcpMs || 0} ms</div>
                </div>
                <div class="metric-box">
                  <div class="mb-label">CLS</div>
                  <div class="mb-value">${perf.cls ?? 0}</div>
                </div>
                <div class="metric-box">
                  <div class="mb-label">DOM Loaded</div>
                  <div class="mb-value">${perf.domContentLoadedMs || 0} ms</div>
                </div>
                <div class="metric-box">
                  <div class="mb-label">Payload</div>
                  <div class="mb-value">${perf.totalSizeKb || 0} KB</div>
                </div>
              </div>

              <details class="tech-accordion">
                <summary>Network Details (${perf.anomalies?.length || 0} slow / failed)</summary>
                <div class="accordion-inner">
                  <div><strong>Total Requests:</strong> ${perf.requestCount || 0}</div>
                  <div style="margin: 0.35rem 0;"><strong>Types:</strong> ${JSON.stringify(perf.resourceBreakdown || {})}</div>
                  ${
                    perf.anomalies && perf.anomalies.length > 0
                      ? perf.anomalies
                          .slice(0, 6)
                          .map(
                            (a) => `
                    <div class="log-row">
                      <span class="${a.failed ? "log-err" : "log-warn"}">[${a.status || "ERR"}]</span>
                      <span>${a.method} ${a.url.slice(0, 60)} (${a.duration}ms)</span>
                    </div>`,
                          )
                          .join("")
                      : '<div style="color: var(--pass);">Zero failed HTTP endpoints.</div>'
                  }
                </div>
              </details>

              <details class="tech-accordion">
                <summary>Console Logs (${perf.consoleErrors?.length || 0} warnings / errors)</summary>
                <div class="accordion-inner">
                  ${
                    perf.consoleErrors && perf.consoleErrors.length > 0
                      ? perf.consoleErrors
                          .slice(0, 6)
                          .map(
                            (err) => `
                    <div class="log-row">
                      <span class="${err.type === "error" ? "log-err" : "log-warn"}">[${err.type}]</span>
                      <span>${(err.text || err.message || "").slice(0, 80)}</span>
                    </div>`,
                          )
                          .join("")
                      : '<div style="color: var(--pass);">Clean console (no uncaught errors).</div>'
                  }
                </div>
              </details>
            </div>

            <div class="right-panel">
              <div class="ai-block">
                <div class="ai-block-header">
                  <div class="ai-tag">
                    <span>Visual QA</span>
                    <span class="ai-subtag">&bull; ${config.ai.visionModel}</span>
                  </div>
                  ${m.visionAudit?.grade ? `<div class="score-chip">Grade: ${m.visionAudit.grade}</div>` : ""}
                </div>
                <div>${ReportGenerator.formatMarkdown(m.visionAudit?.analysis)}</div>
              </div>

              <div class="ai-block">
                <div class="ai-block-header">
                  <div class="ai-tag">
                    <span>Root Cause & Architecture</span>
                    <span class="ai-subtag">&bull; ${config.ai.reasonerModel}</span>
                  </div>
                </div>
                <div>${ReportGenerator.formatMarkdown(m.rootCauseAudit?.analysis)}</div>
              </div>
            </div>
          </div>
        </article>`;
        })
        .join("")}
    </main>

    <div id="lightbox" class="lightbox-modal" onclick="closeLightbox()">
      <span class="lightbox-close">&times;</span>
      <img id="lightbox-img" class="lightbox-img" src="" alt="Zoomed Screenshot">
    </div>

    <footer>
      Scoobies E-Commerce QA & Performance Suite &bull; Automated test execution with Groq AI
    </footer>
  </div>

  <script>
    function filterMilestone(id, btn) {
      document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
      if (btn) btn.classList.add('active');
      document.querySelectorAll('.milestone-item').forEach(item => {
        item.style.display = (id === 'all' || item.getAttribute('data-id') === String(id)) ? 'block' : 'none';
      });
    }

    function openLightbox(src) {
      const modal = document.getElementById('lightbox');
      document.getElementById('lightbox-img').src = src;
      modal.classList.add('open');
    }

    function closeLightbox() {
      document.getElementById('lightbox').classList.remove('open');
    }

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') closeLightbox();
    });
  </script>
</body>
</html>`;

    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    const reportFilename = `scoobies-qa-report-${timestamp}.html`;
    const reportPath = path.join(outputDir, reportFilename);
    const latestPath = path.join(outputDir, "latest.html");

    fs.writeFileSync(reportPath, htmlContent, "utf8");
    fs.writeFileSync(latestPath, htmlContent, "utf8");

    // Report retention: keep at most 2 historical reports to prevent disk bloat
    try {
      const historicalReports = fs
        .readdirSync(outputDir)
        .filter(
          (file) =>
            file.startsWith("scoobies-qa-report-") &&
            file.endsWith(".html") &&
            file !== reportFilename,
        )
        .sort()
        .reverse();

      for (const oldFile of historicalReports.slice(1)) {
        fs.unlinkSync(path.join(outputDir, oldFile));
      }
    } catch (e) {}

    return {
      reportPath,
      latestPath,
      reportFilename,
    };
  }
}

export default ReportGenerator;
