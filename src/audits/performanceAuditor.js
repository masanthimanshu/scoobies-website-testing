class PerformanceAuditor {
  constructor() {
    this.requests = [];
    this.consoleLogs = [];
    this.pageErrors = [];
    this._requestStartTimes = new Map();
  }

  /**
   * Attaches listeners to the Playwright page to monitor network, console, and errors.
   * @param {import('playwright').Page} page
   */
  attach(page) {
    this.requests = [];
    this.consoleLogs = [];
    this.pageErrors = [];
    this._requestStartTimes.clear();

    page.on("request", (request) => {
      this._requestStartTimes.set(request, Date.now());
    });

    page.on("requestfinished", async (request) => {
      const startTime = this._requestStartTimes.get(request) || Date.now();
      this._requestStartTimes.delete(request);
      const duration = Date.now() - startTime;
      let status = 0;
      let size = 0;

      try {
        const response = await request.response();
        if (response) {
          status = response.status();
          size = parseInt(response.headers()["content-length"] || "0", 10);
        }
      } catch (e) {
        // Disposed or aborted response
      }

      this.requests.push({
        url: request.url(),
        method: request.method(),
        resourceType: request.resourceType(),
        status,
        duration,
        size,
        failed: status >= 400,
      });
    });

    page.on("requestfailed", (request) => {
      const startTime = this._requestStartTimes.get(request) || Date.now();
      this._requestStartTimes.delete(request);
      const duration = Date.now() - startTime;
      const failure = request.failure();

      this.requests.push({
        url: request.url(),
        method: request.method(),
        resourceType: request.resourceType(),
        status: 0,
        duration,
        size: 0,
        failed: true,
        errorText: failure
          ? failure.errorText
          : "Request Aborted / Network Error",
      });
    });

    page.on("console", (msg) => {
      const type = msg.type();
      if (type === "error" || type === "warning") {
        this.consoleLogs.push({
          type,
          text: msg.text(),
          location: msg.location(),
        });
      }
    });

    page.on("pageerror", (err) => {
      this.pageErrors.push({
        type: "uncaught-exception",
        message: err.message,
        stack: err.stack,
      });
    });
  }

  /**
   * Evaluates browser Performance API to harvest Core Web Vitals and timing metrics.
   * @param {import('playwright').Page} page
   */
  async collectMetrics(page) {
    let browserMetrics = {
      ttfbMs: 0,
      domContentLoadedMs: 0,
      loadTimeMs: 0,
      fcpMs: 0,
      lcpMs: 0,
      cls: 0,
    };

    try {
      browserMetrics = await page.evaluate(() => {
        const nav = window.performance.getEntriesByType("navigation")?.[0];
        const timing = window.performance.timing;

        let ttfb = 0;
        let domContentLoaded = 0;
        let loadTime = 0;

        if (nav && nav.responseStart) {
          ttfb = Math.round(nav.responseStart - nav.requestStart);
          domContentLoaded = Math.round(
            nav.domContentLoadedEventEnd - nav.startTime,
          );
          loadTime = Math.round(nav.loadEventEnd - nav.startTime);
        } else if (timing) {
          ttfb = timing.responseStart - timing.requestStart;
          domContentLoaded =
            timing.domContentLoadedEventEnd - timing.navigationStart;
          loadTime = timing.loadEventEnd - timing.navigationStart;
        }

        const paint = window.performance.getEntriesByType("paint");
        const fcpEntry = paint.find((e) => e.name === "first-contentful-paint");
        const fcp = fcpEntry ? Math.round(fcpEntry.startTime) : 0;

        let maxResourceDur = 0;
        for (const res of window.performance.getEntriesByType("resource")) {
          if (res.duration > maxResourceDur) maxResourceDur = res.duration;
        }
        const lcp = Math.round(Math.max(fcp, maxResourceDur));

        let cls = 0;
        try {
          for (const shift of window.performance.getEntriesByType(
            "layout-shift",
          )) {
            if (!shift.hadRecentInput) cls += shift.value;
          }
        } catch (e) {}

        return {
          ttfbMs: Math.max(0, ttfb),
          domContentLoadedMs: Math.max(0, domContentLoaded),
          loadTimeMs: Math.max(0, loadTime),
          fcpMs: Math.max(0, fcp),
          lcpMs: Math.max(0, lcp),
          cls: parseFloat(cls.toFixed(3)),
        };
      });
    } catch (e) {
      console.warn("Failed to harvest browser performance metrics:", e.message);
    }

    let totalBytes = 0;
    const typeBreakdown = {};
    const anomalies = [];

    for (const req of this.requests) {
      totalBytes += req.size || 0;
      typeBreakdown[req.resourceType] =
        (typeBreakdown[req.resourceType] || 0) + 1;

      if (req.failed || req.duration > 1500) {
        anomalies.push({
          url: req.url.slice(0, 100),
          method: req.method,
          resourceType: req.resourceType,
          status: req.status,
          duration: req.duration,
          errorText: req.errorText || null,
        });
      }
    }

    return {
      ...browserMetrics,
      requestCount: this.requests.length,
      totalSizeBytes: totalBytes,
      totalSizeKb: Math.round(totalBytes / 1024),
      resourceBreakdown: typeBreakdown,
      anomalies: anomalies.slice(0, 15),
      consoleErrors: [...this.consoleLogs, ...this.pageErrors],
    };
  }

  /**
   * Extracts essential DOM snapshot structure for AI diagnostic reasoning.
   * @param {import('playwright').Page} page
   */
  async extractDomSnapshot(page) {
    try {
      return await page.evaluate(() => {
        const interactiveCounts = {
          buttons: document.querySelectorAll("button").length,
          inputs: document.querySelectorAll("input").length,
          links: document.querySelectorAll("a").length,
          images: document.querySelectorAll("img").length,
        };

        const activeModals = [];
        document
          .querySelectorAll(
            '[class*="modal" i], [class*="popup" i], [class*="drawer" i], [class*="banner" i]',
          )
          .forEach((el) => {
            const style = window.getComputedStyle(el);
            if (
              style.display !== "none" &&
              style.visibility !== "hidden" &&
              style.opacity !== "0" &&
              el.offsetHeight > 50
            ) {
              const classNameStr =
                typeof el.className === "string"
                  ? el.className
                  : String(el.className.baseVal || "");
              activeModals.push({
                tag: el.tagName.toLowerCase(),
                className: classNameStr.slice(0, 60),
                id: el.id || undefined,
                textPreview: (el.innerText || "").trim().slice(0, 80),
              });
            }
          });

        const ctas = [];
        document
          .querySelectorAll('button, input[type="submit"], a.btn, a.button')
          .forEach((btn) => {
            const text = (btn.innerText || btn.value || "").trim();
            if (text && text.length < 30) {
              ctas.push({
                text,
                tag: btn.tagName.toLowerCase(),
                disabled: btn.disabled || false,
                visible: btn.offsetParent !== null,
              });
            }
          });

        return {
          title: document.title,
          h1: document.querySelector("h1")?.innerText?.trim() || "No H1 found",
          interactiveCounts,
          activeModals: activeModals.slice(0, 5),
          keyCTAs: ctas.slice(0, 8),
        };
      });
    } catch (e) {
      return { error: `DOM snapshot extraction failed: ${e.message}` };
    }
  }
}

export default PerformanceAuditor;
