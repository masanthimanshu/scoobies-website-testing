import groqClient from "./groqClient.js";
import config from "../../scoobies.config.js";

class RootCauseAnalyst {
  constructor() {
    this.model = config.ai.reasonerModel || "openai/gpt-oss-120b";
  }

  /**
   * Diagnoses root causes for milestone execution, network anomalies, DOM issues, and console errors.
   * @param {Object} params
   * @param {string} params.milestoneName
   * @param {string} params.status - 'PASS' | 'FAIL' | 'WARN'
   * @param {string} params.url
   * @param {Object} params.domSnapshot
   * @param {Array} [params.networkData=[]]
   * @param {Array} [params.consoleErrors=[]]
   * @param {Object} [params.performanceMetrics={}]
   * @param {string|null} [params.errorMessage=null]
   */
  async diagnose({
    milestoneName,
    status,
    url,
    domSnapshot,
    networkData = [],
    consoleErrors = [],
    performanceMetrics = {},
    errorMessage = null,
  }) {
    const prompt = `You are a Principal E-Commerce Reliability & Performance Architect analyzing an automated test execution milestone on Scoobies.co.in.

Milestone: "${milestoneName}"
Execution Status: ${status} ${errorMessage ? `(Error: ${errorMessage})` : ""}
Target URL: ${url}

--- TELEMETRY DATA ---
[Performance & Web Vitals]:
- TTFB: ${performanceMetrics.ttfbMs || "N/A"} ms
- FCP: ${performanceMetrics.fcpMs || "N/A"} ms
- LCP: ${performanceMetrics.lcpMs || "N/A"} ms
- CLS: ${performanceMetrics.cls ?? "N/A"}
- Page Load: ${performanceMetrics.loadTimeMs || "N/A"} ms
- Total Transferred: ${performanceMetrics.totalSizeKb ? `${performanceMetrics.totalSizeKb} KB` : "N/A"}
- Total Requests: ${performanceMetrics.requestCount || "N/A"}

[Console Errors & Warnings (${consoleErrors.length})]:
${consoleErrors.length > 0 ? JSON.stringify(consoleErrors.slice(0, 10), null, 2) : "No console errors logged."}

[Network Anomalies & Slow Requests]:
${networkData.length > 0 ? JSON.stringify(networkData.slice(0, 10), null, 2) : "All monitored requests succeeded within thresholds."}

[DOM State Excerpt]:
${JSON.stringify(domSnapshot, null, 2)}

--- INSTRUCTIONS ---
Provide an authoritative engineering diagnostic report:
1. Milestone Health Verdict: Is this milestone performing optimally from an architectural and user-experience perspective?
2. Root Cause Analysis: If there are failures, errors, network 4xx/5xx codes, or Web Vitals degradation (e.g. LCP > 2.5s, slow TTFB, script execution bottlenecks), pinpoint the exact underlying technical causes.
3. Performance & Reliability Bottlenecks: Highlight top bottlenecks observed in the network and DOM lifecycle.
4. Actionable Engineering Fixes: Provide specific code, configuration, or infrastructure recommendations.

Keep your response structured, concise, and technically rigorous.`;

    try {
      const response = await groqClient.chatCompletion({
        model: this.model,
        messages: [{ role: "user", content: prompt }],
        max_tokens: 1000,
        temperature: 0.1,
      });

      if (!response.success) {
        return {
          model: this.model,
          success: false,
          error: response.error,
          analysis:
            "Root-cause diagnostic analysis could not be completed due to an API error.",
        };
      }

      return {
        model: this.model,
        success: true,
        analysis: response.content,
        reasoning: response.reasoning,
        latencyMs: response.latencyMs,
      };
    } catch (err) {
      return {
        model: this.model,
        success: false,
        error: err.message,
        analysis: `Root-cause analyst encountered an unexpected error: ${err.message}`,
      };
    }
  }
}

export default new RootCauseAnalyst();
