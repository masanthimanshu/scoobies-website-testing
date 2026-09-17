const config = require("../../scoobies.config");
require("dotenv").config();

class GroqClient {
  constructor() {
    this.apiKey = process.env.GROQ_API_KEY;
    if (!this.apiKey) {
      console.warn("⚠️ GROQ_API_KEY is not set in environment or .env file.");
    }
    this.endpoint = config.ai.groqEndpoint;
    this.maxRetries = config.ai.maxRetries || 3;
    this.retryDelayMs = config.ai.retryDelayMs || 2000;
  }

  async sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  async chatCompletion({
    model,
    messages,
    temperature = 0.2,
    max_tokens = 1000,
  }) {
    if (!this.apiKey) {
      throw new Error(
        "GROQ_API_KEY is missing. Cannot make Groq API requests.",
      );
    }

    let attempt = 0;
    while (attempt < this.maxRetries) {
      attempt++;
      try {
        const startTime = Date.now();
        const response = await fetch(this.endpoint, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${this.apiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model,
            messages,
            temperature,
            max_tokens,
          }),
        });

        const duration = Date.now() - startTime;

        if (response.status === 429 || response.status >= 500) {
          const errorText = await response.text();
          console.warn(
            `[GroqClient] Attempt ${attempt}/${this.maxRetries} failed with status ${response.status}: ${errorText.slice(0, 150)}`,
          );
          if (attempt < this.maxRetries) {
            await this.sleep(this.retryDelayMs * Math.pow(2, attempt - 1));
            continue;
          }
          throw new Error(`Groq API returned ${response.status}: ${errorText}`);
        }

        if (!response.ok) {
          const errorData = await response.text();
          throw new Error(
            `Groq API error HTTP ${response.status}: ${errorData}`,
          );
        }

        const data = await response.json();
        const choice = data.choices?.[0];
        const content = choice?.message?.content || "";
        const reasoning = choice?.message?.reasoning || null;

        return {
          success: true,
          content,
          reasoning,
          model: data.model || model,
          usage: data.usage || null,
          latencyMs: duration,
        };
      } catch (err) {
        if (attempt >= this.maxRetries) {
          return {
            success: false,
            error: err.message,
            model,
          };
        }
        await this.sleep(this.retryDelayMs * attempt);
      }
    }
  }
}

module.exports = new GroqClient();
