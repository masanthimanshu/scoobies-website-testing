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
      const duration = Date.now() - startTime;
      let status = 0;
      let size = 0;

      try {
        const response = await request.response();
        if (response) {
          status = response.status();
          const headers = response.headers();
          size = parseInt(headers["content-length"] || "0", 10);
        }
      } catch (e) {
        // Response might be disposed or aborted
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
      if (["error", "warning"].includes(type)) {
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
   * Evaluates browser Performance API to get Core Web Vitals and timing metrics.
   * @param {import('playwright').Page} page
   */
  async collectMetrics(page) {
    let browserMetrics = {};

    try {
      browserMetrics = await page.evaluate(() => {
        const timing = window.performance.timing;
        const navEntries = window.performance.getEntriesByType("navigation");
        const nav = navEntries && navEntries[0] ? navEntries[0] : null;

        // TTFB calculation
        let ttfb = 0;
        if (nav && nav.responseStart) {
          ttfb = Math.round(nav.responseStart - nav.requestStart);
        } else if (timing) {
          ttfb = timing.responseStart - timing.requestStart;
        }

        // DOM Content Loaded & Page Load
        let domContentLoaded = 0;
        let loadTime = 0;
        if (nav) {
          domContentLoaded = Math.round(
            nav.domContentLoadedEventEnd - nav.startTime,
          );
          loadTime = Math.round(nav.loadEventEnd - nav.startTime);
        } else if (timing) {
          domContentLoaded =
            timing.domContentLoadedEventEnd - timing.navigationStart;
          loadTime = timing.loadEventEnd - timing.navigationStart;
        }

        // Paint Timing (FCP)
        let fcp = 0;
        const paintEntries = window.performance.getEntriesByType("paint");
        const fcpEntry = paintEntries.find(
          (entry) => entry.name === "first-contentful-paint",
        );
        if (fcpEntry) {
          fcp = Math.round(fcpEntry.startTime);
        }

        // LCP
        let lcp = 0;
        // In Playwright context, check for stored LCP or calculate from largest entry
        const resourceEntries = window.performance.getEntriesByType("resource");
        let largestResourceDuration = 0;
        for (const res of resourceEntries) {
          if (res.duration > largestResourceDuration) {
            largestResourceDuration = res.duration;
          }
        }
        lcp = Math.round(Math.max(fcp, largestResourceDuration));

        // CLS estimate from layout-shift entries
        let cls = 0;
        try {
          const shiftEntries =
            window.performance.getEntriesByType("layout-shift");
          for (const shift of shiftEntries) {
            if (!shift.hadRecentInput) {
              cls += shift.value;
            }
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
      browserMetrics = {
        ttfbMs: 0,
        domContentLoadedMs: 0,
        loadTimeMs: 0,
        fcpMs: 0,
        lcpMs: 0,
        cls: 0,
      };
    }

    // Network summary calculation
    const totalRequests = this.requests.length;
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
      requestCount: totalRequests,
      totalSizeBytes: totalBytes,
      totalSizeKb: Math.round(totalBytes / 1024),
      resourceBreakdown: typeBreakdown,
      anomalies: anomalies.slice(0, 15),
      consoleErrors: [...this.consoleLogs, ...this.pageErrors],
    };
  }

  /**
   * Extracts essential DOM snapshot structure for AI reasoner
   * @param {import('playwright').Page} page
   */
  async extractDomSnapshot(page) {
    try {
      return await page.evaluate(() => {
        const title = document.title;
        const h1 =
          document.querySelector("h1")?.innerText?.trim() || "No H1 found";
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
              activeModals.push({
                tag: el.tagName.toLowerCase(),
                className: el.className.toString().slice(0, 60),
                id: el.id || undefined,
                textPreview: el.innerText.trim().slice(0, 80),
              });
            }
          });

        // Key CTAs
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
          title,
          h1,
          interactiveCounts,
          activeModals: activeModals.slice(0, 5),
          keyCTAs: ctas.slice(0, 8),
        };
      });
    } catch (e) {
      return { error: "DOM snapshot extraction failed: " + e.message };
    }
  }
}

module.exports = PerformanceAuditor;
