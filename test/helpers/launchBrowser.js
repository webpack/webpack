"use strict";

const os = require("os");
const path = require("path");

// The same cache `yarn setup:firefox` installs into, and the one puppeteer's
// own tooling reads, so the two agree wherever it has been pointed elsewhere.
const CACHE_DIR =
	process.env.PUPPETEER_CACHE_DIR ||
	path.join(os.homedir(), ".cache", "puppeteer");

/**
 * Where an already-downloaded Firefox sits, or `undefined` when none is. The
 * suites do not download one themselves: a cold fetch is tens of megabytes and
 * would expire the callers' hook budget rather than report a browser problem.
 * @returns {Promise<string | undefined>} the executable path
 */
const installedFirefox = async () => {
	// ESM-only, like puppeteer-core itself, so it is loaded the same way.
	const { Browser, detectBrowserPlatform, getInstalledBrowsers } =
		await import("@puppeteer/browsers");

	const platform = detectBrowserPlatform();
	if (platform === undefined) return undefined;
	for (const one of await getInstalledBrowsers({ cacheDir: CACHE_DIR })) {
		if (one.browser === Browser.FIREFOX && one.platform === platform) {
			return one.executablePath;
		}
	}
	return undefined;
};

/**
 * One puppeteer `evaluate` over a playwright page. Playwright takes a single
 * argument where puppeteer takes several, so a call with more is rewritten to
 * spread one array.
 * @param {import("playwright-core").Page} page the playwright page
 * @param {EXPECTED_FUNCTION} fn what to run in it
 * @param {unknown[]} args its arguments
 * @returns {Promise<EXPECTED_ANY>} what it returned
 */
const evaluateOn = (page, fn, args) => {
	if (args.length <= 1) {
		return page.evaluate(
			/** @type {(one: unknown) => EXPECTED_ANY} */ (fn),
			args[0]
		);
	}
	// eslint-disable-next-line no-new-func
	const spread = new Function(
		"passed",
		`return (${fn.toString()}).apply(null, passed);`
	);
	return page.evaluate(
		/** @type {(passed: unknown[]) => EXPECTED_ANY} */ (spread),
		args
	);
};

/**
 * A playwright page under the puppeteer names the browser suites call it by,
 * so one suite drives either driver.
 * @param {import("playwright-core").Page} page the playwright page
 * @returns {EXPECTED_ANY} it, answering to puppeteer's names
 */
const asPuppeteerPage = (page) => ({
	close: () => page.close(),
	setContent: (/** @type {string} */ html) => page.setContent(html),
	goto: (/** @type {string} */ url) => page.goto(url),
	evaluate: (
		/** @type {EXPECTED_FUNCTION} */ fn,
		/** @type {unknown[]} */ ...args
	) => evaluateOn(page, fn, args),
	setViewport: (/** @type {{ width: number, height: number }} */ viewport) =>
		page.setViewportSize({ width: viewport.width, height: viewport.height }),
	// WHY: playwright emulates the color scheme and reduced motion but not
	// `color-gamut`, and a feature the page cannot be put into answers alike for
	// both of its values — which reads as one condition where there are two. So
	// none is offered, `emulatesMedia` reads the throw, and the suite carries
	// what no viewport varies as text, the way it already does for Gecko.
	emulateMediaType: () => {
		throw new Error("playwright drives the media through no such call");
	},
	emulateMediaFeatures: () => {
		throw new Error("playwright drives the media through no such call");
	}
});

/**
 * The WebKit the suites compare against, driven by playwright since puppeteer
 * reaches Chrome and Firefox only. A browser that is missing throws, the way a
 * missing Firefox does.
 * @param {{ timeout?: number, executablePath?: string }} options the launch options
 * @returns {Promise<EXPECTED_ANY>} the running browser, under puppeteer's names
 */
const launchWebkit = async (options) => {
	const { webkit } = await import("playwright-core");
	const browser = await webkit.launch({
		timeout: options.timeout,
		...(options.executablePath || process.env.WEBKIT_EXECUTABLE_PATH
			? {
					executablePath:
						options.executablePath || process.env.WEBKIT_EXECUTABLE_PATH
				}
			: {})
	});
	return {
		close: () => browser.close(),
		newPage: async () => asPuppeteerPage(await browser.newPage())
	};
};

/**
 * A real browser for the suites that compare against one. A browser that is
 * missing or will not launch throws rather than skipping, so no environment can
 * report these checks as passing without having run them.
 * @param {(Omit<import("puppeteer-core").LaunchOptions, "browser"> & { browser?: "chrome" | "firefox" | "webkit" })=} options extra launch options; `browser` picks the engine
 * @returns {Promise<import("puppeteer-core").Browser>} the running browser
 */
module.exports = async (options) => {
	const { browser: engine = "chrome", ...rest } = options || {};
	// WebKit is playwright's, and nothing below reaches it.
	if (engine === "webkit") return launchWebkit({ timeout: 100000, ...rest });
	// require() of puppeteer-core throws under Jest since it is ESM-only (v25+).
	const puppeteer = (await import("puppeteer-core")).default;
	const firefox = engine === "firefox";
	/** @type {import("puppeteer-core").LaunchOptions} */
	const launchOptions = {
		headless: true,
		// puppeteer's own 30s default expires on a cold runner before the browser
		// prints its WS endpoint; this stays under the callers' 120s hook budget
		timeout: 100000,
		// Chrome's sandbox and GPU flags mean nothing to Firefox, which reads its
		// own settings out of `extraPrefsFirefox` instead.
		...(firefox
			? { browser: "firefox" }
			: { args: ["--no-sandbox", "--disable-gpu", "--disable-dev-shm-usage"] }),
		...rest
	};
	if (firefox) {
		// A caller that named one wins: the environment and the cache are what to
		// fall back to, not what to override it with.
		const executablePath =
			launchOptions.executablePath ||
			process.env.FIREFOX_EXECUTABLE_PATH ||
			(await installedFirefox());
		if (executablePath === undefined) {
			throw new Error(
				"no Firefox to launch: run `yarn setup:firefox`, or point FIREFOX_EXECUTABLE_PATH at one"
			);
		}
		launchOptions.executablePath = executablePath;
	} else if (!launchOptions.executablePath) {
		if (process.env.PUPPETEER_EXECUTABLE_PATH) {
			launchOptions.executablePath = process.env.PUPPETEER_EXECUTABLE_PATH;
		} else {
			launchOptions.channel = "chrome";
		}
	}
	return puppeteer.launch(launchOptions);
};
