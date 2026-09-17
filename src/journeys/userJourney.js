const PerformanceAuditor = require("../audits/performanceAuditor");
const visionAuditor = require("../ai/visionAuditor");
const rootCauseAnalyst = require("../ai/rootCauseAnalyst");
const config = require("../../scoobies.config");
const path = require("path");
const fs = require("fs");

class UserJourney {
  /**
   * @param {Object} options
   * @param {import('playwright').BrowserContext} options.context
   * @param {import('playwright').Page} options.page
   * @param {boolean} options.enableAi
   * @param {string} options.outputDir
   */
  constructor({ context, page, enableAi = true, outputDir = "./reports" }) {
    this.context = context;
    this.page = page;
    this.enableAi = enableAi;
    this.outputDir = outputDir;
    this.screenshotsDir = path.join(outputDir, "screenshots");
    this.results = [];

    if (!fs.existsSync(this.screenshotsDir)) {
      fs.mkdirSync(this.screenshotsDir, { recursive: true });
    }
  }

  /**
   * Helper to dismiss common promotional overlays or newsletter dialogs
   */
  async dismissModals() {
    try {
      const dismissSelectors = [
        'button[aria-label="Close"]',
        ".popup-close",
        ".modal__close-button",
        '[class*="close" i][role="button"]',
        "#shopify-pc__banner__btn-accept",
        ".newsletter-popup__close",
      ];
      for (const selector of dismissSelectors) {
        const el = this.page.locator(selector).first();
        if (await el.isVisible({ timeout: 400 }).catch(() => false)) {
          await el.click().catch(() => {});
        }
      }
    } catch (e) {
      // Ignored non-critical dismiss error
    }
  }

  /**
   * Captures a high-resolution screenshot, returns base64 and file path.
   * Automatically prunes prior screenshots for this milestone to keep storage lightweight.
   */
  async captureMilestoneScreenshot(milestoneId) {
    try {
      if (fs.existsSync(this.screenshotsDir)) {
        const existingFiles = fs.readdirSync(this.screenshotsDir);
        for (const file of existingFiles) {
          if (file.startsWith(`${milestoneId}-`) && file.endsWith(".jpg")) {
            fs.unlinkSync(path.join(this.screenshotsDir, file));
          }
        }
      }
    } catch (e) {
      // Ignored non-critical pruning error
    }

    const filename = `${milestoneId}-${Date.now()}.jpg`;
    const filepath = path.join(this.screenshotsDir, filename);

    const buffer = await this.page.screenshot({
      type: "jpeg",
      quality: 85,
      fullPage: false,
    });

    fs.writeFileSync(filepath, buffer);
    return {
      filename,
      filepath,
      base64: buffer.toString("base64"),
    };
  }

  /**
   * Executes an individual milestone with complete telemetry, screenshots, and AI diagnostics
   */
  async runMilestone({ id, name, description, action }) {
    console.log(`\n▶ [Milestone ${id}] ${name}...`);
    const auditor = new PerformanceAuditor();
    auditor.attach(this.page);

    const startTime = Date.now();
    let status = "PASS";
    let errorMessage = null;
    let actionResult = null;

    try {
      actionResult = await action();
      await this.page.waitForTimeout(800); // Allow rendering settle
    } catch (err) {
      status = "FAIL";
      errorMessage = err.message;
      console.error(`  ❌ Milestone ${id} failed: ${err.message}`);
    }

    const durationMs = Date.now() - startTime;
    const currentUrl = this.page.url();

    // Collect performance & DOM telemetry
    const performanceMetrics = await auditor.collectMetrics(this.page);
    const domSnapshot = await auditor.extractDomSnapshot(this.page);

    // Capture high-resolution screenshot
    let screenshotData = { filename: "", filepath: "", base64: "" };
    try {
      screenshotData = await this.captureMilestoneScreenshot(`m${id}`);
    } catch (err) {
      console.warn(
        `  ⚠️ Screenshot capture failed for milestone ${id}: ${err.message}`,
      );
    }

    // AI Audits executed concurrently for maximum performance
    let visionAudit = null;
    let rootCauseAudit = null;

    if (this.enableAi && screenshotData.base64) {
      console.log(
        `  🤖 Running Groq AI (${config.ai.visionModel} & ${config.ai.reasonerModel}) for Milestone ${id}...`,
      );
      const [vResult, rResult] = await Promise.all([
        visionAuditor.inspectScreenshot({
          milestoneName: name,
          imageBase64: screenshotData.base64,
          url: currentUrl,
          context: { description, actionResult, status },
        }),
        rootCauseAnalyst.diagnose({
          milestoneName: name,
          status,
          url: currentUrl,
          domSnapshot,
          networkData: performanceMetrics.anomalies,
          consoleErrors: performanceMetrics.consoleErrors,
          performanceMetrics,
          errorMessage,
        }),
      ]);
      visionAudit = vResult;
      rootCauseAudit = rResult;
    }

    // Determine performance warning status if thresholds exceeded
    if (status === "PASS") {
      if (
        performanceMetrics.fcpMs > config.thresholds.fcpMs ||
        performanceMetrics.ttfbMs > config.thresholds.ttfbMs ||
        performanceMetrics.cls > config.thresholds.cls ||
        performanceMetrics.consoleErrors.length > 3
      ) {
        status = "WARN";
      }
    }

    const milestoneRecord = {
      id,
      name,
      description,
      status,
      durationMs,
      url: currentUrl,
      errorMessage,
      actionResult,
      screenshot: {
        filename: screenshotData.filename,
        filepath: screenshotData.filepath,
        base64: screenshotData.base64,
      },
      performanceMetrics,
      domSnapshot,
      visionAudit,
      rootCauseAudit,
    };

    this.results.push(milestoneRecord);
    console.log(
      `  ✓ Milestone ${id} Completed with status: [${status}] (${durationMs}ms)`,
    );
    return milestoneRecord;
  }

  /**
   * Executes the complete end-to-end 5-milestone journey
   */
  async executeFullJourney() {
    console.log("====================================================");
    console.log("  SCOOBIES.CO.IN END-TO-END QA & PERFORMANCE AUDIT  ");
    console.log("====================================================");

    // ----------------------------------------------------
    // Milestone 1: Homepage Browsing & Storefront Audit
    // ----------------------------------------------------
    await this.runMilestone({
      id: 1,
      name: "Homepage Browsing & Storefront Audit",
      description:
        "Navigates to Scoobies homepage, audits hero banners, primary navigation, announcement bar, and layout stability.",
      action: async () => {
        await this.page.goto(config.target.baseUrl, {
          waitUntil: "domcontentloaded",
          timeout: config.browser.navigationTimeout,
        });
        await this.page
          .waitForLoadState("networkidle", { timeout: 8000 })
          .catch(() => {});
        await this.dismissModals();

        // Scroll slightly to trigger lazy-loaded sections and test sticky header behavior
        await this.page.evaluate(() =>
          window.scrollBy({ top: 400, behavior: "smooth" }),
        );
        await this.page.waitForTimeout(1000);
        await this.page.evaluate(() =>
          window.scrollTo({ top: 0, behavior: "smooth" }),
        );
        await this.page.waitForTimeout(500);

        const pageTitle = await this.page.title();
        const headerExists = await this.page
          .locator("header, .header, nav")
          .first()
          .isVisible();
        return { pageTitle, headerExists };
      },
    });

    // ----------------------------------------------------
    // Milestone 2: Search & Catalog Filtering
    // ----------------------------------------------------
    await this.runMilestone({
      id: 2,
      name: "Search Discovery & Catalog Filtering",
      description:
        'Executes catalog search for keyword "stationery", audits search modal/input, results grid, and filter options.',
      action: async () => {
        // Try searching via search input or direct search URL
        const searchInput = this.page
          .locator('input[name="q"], #Search-In-Modal, input[type="search"]')
          .first();
        const searchIcon = this.page
          .locator(
            'summary.header__icon--search, [aria-label*="Search" i], [title*="Search" i]',
          )
          .first();

        let searchUsed = "direct-input";
        if (await searchIcon.isVisible({ timeout: 1000 }).catch(() => false)) {
          await searchIcon.click().catch(() => {});
          await this.page.waitForTimeout(500);
        }

        if (await searchInput.isVisible({ timeout: 1500 }).catch(() => false)) {
          await searchInput.fill(config.target.searchQuery);
          await this.page.keyboard.press("Enter");
        } else {
          // Fallback to Shopify standard search URL
          searchUsed = "url-navigation";
          await this.page.goto(
            `${config.target.baseUrl}/search?q=${encodeURIComponent(config.target.searchQuery)}`,
            {
              waitUntil: "domcontentloaded",
            },
          );
        }

        await this.page
          .waitForLoadState("networkidle", { timeout: 8000 })
          .catch(() => {});
        await this.dismissModals();

        const productCards = await this.page
          .locator(
            '.product-card, .card-wrapper, .grid__item, a[href*="/products/"]',
          )
          .count();
        const resultsCountText = await this.page
          .locator('[id*="ProductCount" i], .facets__heading, .search__header')
          .first()
          .innerText()
          .catch(() => "N/A");

        return {
          query: config.target.searchQuery,
          searchUsed,
          productCardsFound: productCards,
          resultsCountText: resultsCountText.trim(),
        };
      },
    });

    // ----------------------------------------------------
    // Milestone 3: Product Detail Selection (PDP)
    // ----------------------------------------------------
    let selectedProductUrl = `${config.target.baseUrl}/products/${config.target.sampleProductHandle}`;
    await this.runMilestone({
      id: 3,
      name: "Product Selection & PDP Deep Dive",
      description:
        "Navigates to product detail page, verifies title, pricing, variant selectors, gallery images, and Add-to-Cart readiness.",
      action: async () => {
        // Find first valid product link from search results or fallback to sample
        const firstProductLink = this.page
          .locator('a[href*="/products/"]')
          .first();
        if (
          await firstProductLink.isVisible({ timeout: 2000 }).catch(() => false)
        ) {
          const href = await firstProductLink.getAttribute("href");
          if (href && !href.includes("#")) {
            selectedProductUrl = href.startsWith("http")
              ? href
              : `${config.target.baseUrl}${href}`;
          }
        }

        await this.page.goto(selectedProductUrl, {
          waitUntil: "domcontentloaded",
          timeout: config.browser.navigationTimeout,
        });
        await this.page
          .waitForLoadState("networkidle", { timeout: 8000 })
          .catch(() => {});
        await this.dismissModals();

        const productTitle = await this.page
          .locator("h1, .product__title")
          .first()
          .innerText()
          .catch(() => "Product Title");
        const price = await this.page
          .locator(".price, [data-product-price]")
          .first()
          .innerText()
          .catch(() => "Price");
        const atcButton = this.page
          .locator('button[name="add"], .product-form__submit')
          .first();
        const isAtcEnabled = await atcButton.isEnabled().catch(() => false);

        return {
          productUrl: selectedProductUrl,
          productTitle: productTitle.trim(),
          price: price.trim(),
          isAtcEnabled,
        };
      },
    });

    // ----------------------------------------------------
    // Milestone 4: Cart Modification & Line Item Verification
    // ----------------------------------------------------
    await this.runMilestone({
      id: 4,
      name: "Cart Modification & Item Quantity Update",
      description:
        "Adds product to cart, observes cart notification/drawer, navigates to cart page, and audits line items & totals.",
      action: async () => {
        const atcButton = this.page
          .locator('button[name="add"], .product-form__submit')
          .first();
        if (await atcButton.isVisible({ timeout: 2000 })) {
          await atcButton.click();
          await this.page.waitForTimeout(2000); // Allow drawer animation or notification
        }

        // Navigate directly to cart page for strict audit
        await this.page.goto(`${config.target.baseUrl}/cart`, {
          waitUntil: "domcontentloaded",
          timeout: config.browser.navigationTimeout,
        });
        await this.page
          .waitForLoadState("networkidle", { timeout: 8000 })
          .catch(() => {});
        await this.dismissModals();

        const cartItemsCount = await this.page
          .locator(".cart-item, tr.cart-item, .cart__items")
          .count();
        const hasCheckoutBtn = await this.page
          .locator(
            'button#checkout, button[name="checkout"], .cart__checkout-button',
          )
          .first()
          .isVisible()
          .catch(() => false);

        // Attempt quantity modification if quantity controls exist
        const plusButton = this.page
          .locator('button[name="plus"], .quantity__button[name="plus"]')
          .first();
        let quantityModified = false;
        if (await plusButton.isVisible({ timeout: 1000 }).catch(() => false)) {
          await plusButton.click().catch(() => {});
          await this.page.waitForTimeout(1000);
          quantityModified = true;
        }

        return {
          cartItemsCount,
          hasCheckoutBtn,
          quantityModified,
        };
      },
    });

    // ----------------------------------------------------
    // Milestone 5: Checkout Navigation & Form Readiness
    // ----------------------------------------------------
    await this.runMilestone({
      id: 5,
      name: "Checkout Navigation & Step Validation",
      description:
        "Initiates checkout from cart, verifies secure redirection to Shopify Checkout pipeline and customer contact inputs (Zero purchase executed).",
      action: async () => {
        const checkoutBtn = this.page
          .locator(
            'button#checkout, button.cart__checkout-button, button[name="checkout"]',
          )
          .first();

        await Promise.all([
          this.page
            .waitForURL(/.*(checkouts|checkout).*/, { timeout: 25000 })
            .catch(() => {}),
          checkoutBtn.click().catch(async () => {
            // Fallback: navigate directly to /checkout
            await this.page.goto(`${config.target.baseUrl}/checkout`, {
              waitUntil: "domcontentloaded",
            });
          }),
        ]);

        await this.page
          .waitForLoadState("networkidle", { timeout: 8000 })
          .catch(() => {});
        await this.dismissModals();

        const checkoutUrl = this.page.url();
        const checkoutTitle = await this.page.title();

        const formFields = await this.page.evaluate(() => {
          return {
            hasEmailField: !!document.querySelector(
              'input[type="email"], input[autocomplete*="email"], #email',
            ),
            hasShippingAddress: !!document.querySelector(
              'input[autocomplete*="address-line1"], [placeholder*="Address" i]',
            ),
            hasOrderSummary: !!document.querySelector(
              '[role="table"], .order-summary, [data-order-summary]',
            ),
          };
        });

        return {
          checkoutUrl,
          checkoutTitle,
          fieldsDetected: formFields,
        };
      },
    });

    return this.results;
  }
}

module.exports = UserJourney;
