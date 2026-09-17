module.exports = {
  target: {
    baseUrl: "https://scoobies.co.in",
    name: "Scoobies India Storefront",
    environment: "Production",
    searchQuery: "stationery",
    sampleProductHandle: "snack-container",
  },
  browser: {
    headless: true,
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 2, // High-resolution screenshot capture
    timeout: 35000,
    navigationTimeout: 35000,
    userAgent:
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36 ScoobiesQA/1.0",
  },
  ai: {
    groqEndpoint: "https://api.groq.com/openai/v1/chat/completions",
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
    maxErrorCount: 0,
  },
  reporting: {
    outputDir: "./reports",
    reportTitle: "Scoobies E-Commerce QA & Performance Audit Report",
    includeBase64Screenshots: true,
  },
  email: {
    from: "Logs <logs@email.scoobies.ai>",
    subjectPrefix: "[QA Audit]",
    defaultTo: process.env.REPORT_RECIPIENT_EMAIL || "",
  },
};
