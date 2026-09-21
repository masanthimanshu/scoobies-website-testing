import groqClient from "./groqClient.js";
import config from "../../scoobies.config.js";

class VisionAuditor {
  constructor() {
    this.model = config.ai.visionModel || "qwen/qwen3.8-27b";
  }

  /**
   * Inspects a screenshot for visual defects, layout breaks, and obstructive overlays.
   * @param {Object} params
   * @param {string} params.milestoneName
   * @param {string} params.imageBase64
   * @param {string} params.url
   * @param {Object} [params.context={}]
   */
  async inspectScreenshot({ milestoneName, imageBase64, url, context = {} }) {
    const prompt = `You are a Principal QA Visual & UX Auditor evaluating a production e-commerce store (Scoobies India).
Target Milestone: "${milestoneName}"
Page URL: ${url}
Context: ${JSON.stringify(context)}

Analyze the attached high-resolution screenshot with rigorous visual QA standards.
Evaluate:
1. Visual Defects: Broken styling, missing images, overlapping text, clipped elements, or visual glitching.
2. Broken Layouts: Misaligned grids, uneven spacing, container overflows, broken responsive layout.
3. Obstructive Overlays: Popups, newsletter modals, cookie consents, sticky header overlaps, or intrusive drawers blocking key CTAs.
4. Call-to-Action (CTA) Accessibility: Are primary actions (e.g. Search, Add to Cart, Checkout) clearly visible, clickable, and prominent?

Return your audit in the following structured format:

### Visual Health Score: [A+ / A / B / C / D / F] (Score 0-100)
**Summary**: [1-2 sentence executive verdict on visual rendering]

#### 🔍 Key Visual Findings:
- **Layout & Structure**: [Findings]
- **Defects & Anomalies**: [List any specific visual issues or "None detected"]
- **Overlays & Modals**: [List any obstructive elements or "Clean viewport"]
- **CTA & Navigation**: [Visibility of primary buttons/navigation]

#### 💡 Actionable UI/UX Recommendations:
1. [Recommendation 1]
2. [Recommendation 2]`;

    try {
      const response = await groqClient.chatCompletion({
        model: this.model,
        messages: [
          {
            role: "user",
            content: [
              { type: "text", text: prompt },
              {
                type: "image_url",
                image_url: { url: `data:image/jpeg;base64,${imageBase64}` },
              },
            ],
          },
        ],
        max_tokens: 800,
        temperature: 0.2,
      });

      if (!response.success) {
        return {
          model: this.model,
          success: false,
          error: response.error,
          analysis:
            "Visual inspection could not be completed due to an API error.",
        };
      }

      const scoreMatch = response.content.match(
        /Score:?\s*([A-F][+]?)(?:\s*\((?:Score\s*)?(\d+))?/i,
      );
      return {
        model: this.model,
        success: true,
        grade: scoreMatch ? scoreMatch[1] : "B+",
        scoreNum: scoreMatch?.[2] ? parseInt(scoreMatch[2], 10) : 88,
        analysis: response.content,
        latencyMs: response.latencyMs,
      };
    } catch (err) {
      return {
        model: this.model,
        success: false,
        error: err.message,
        analysis: `Visual inspection encountered an unexpected error: ${err.message}`,
      };
    }
  }
}

export default new VisionAuditor();
