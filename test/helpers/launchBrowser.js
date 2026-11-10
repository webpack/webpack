"use strict";

const fs = require("fs");

/** @typedef {"chrome" | "firefox" | "webkit"} Engine */

/**
 * Where a browser a caller or the environment points at sits, if one does.
 * @param {Engine} engine the engine
 * @param {string=} executablePath the one the caller named
 * @returns {string | undefined} the executable path
 */
const pointedAt = (engine, executablePath) =>
	executablePath ||
	process.env[`${engine.toUpperCase()}_EXECUTABLE_PATH`] ||
	undefined;

/**
 * A real browser for the suites that compare against one: the build of the
 * engine the installed playwright-core pins, never the machine's own, so an
 * engine moves only in the pull request bumping playwright-core. One that is
 * missing or will not launch throws rather than skipping the suite.
 * @param {{ browser?: Engine, executablePath?: string, timeout?: number }=} options `browser` picks the engine
 * @returns {Promise<import("playwright-core").Browser>} the running browser
 */
module.exports = async (options) => {
	const { browser: engine = "chrome", executablePath, timeout } = options || {};

	const playwright = require("playwright-core");

	const type = engine === "chrome" ? playwright.chromium : playwright[engine];
	/** @type {import("playwright-core").LaunchOptions} */
	const launchOptions = {
		headless: true,
		// a cold runner can take a while to print the browser's endpoint; this
		// stays under the callers' 120s hook budget
		timeout: timeout || 100000
	};
	if (engine === "chrome") {
		launchOptions.args = ["--disable-gpu", "--disable-dev-shm-usage"];
	}
	const pointed = pointedAt(engine, executablePath);
	if (pointed) {
		launchOptions.executablePath = pointed;
	} else if (fs.existsSync(type.executablePath())) {
		// Chrome for Testing with the full browser's headless mode, not the
		// headless shell, so it renders the way the browser people run does
		if (engine === "chrome") launchOptions.channel = "chromium";
	} else {
		// playwright drives Firefox and WebKit through its own patches, so only
		// its builds of those launch, where any Chrome does
		throw new Error(
			`no ${engine} to launch: run \`yarn setup:browsers ${engine}\`, or point ${engine.toUpperCase()}_EXECUTABLE_PATH at ${engine === "chrome" ? "a Chrome" : `playwright's build of ${engine}`}`
		);
	}
	const browser = await type.launch(launchOptions);
	// WHY: playwright emulates `prefers-color-scheme: light` on every page by
	// default, which outranks the scheme a frame takes from its embedding
	// element, and opens a 1280x720 viewport. The suites read the dark scheme
	// through the frame's own and were measured at 800x600, so a page opens as
	// a plain browser's would, with no media emulated.
	const newPage = browser.newPage.bind(browser);
	browser.newPage = (pageOptions) =>
		newPage({
			colorScheme: null,
			reducedMotion: null,
			forcedColors: null,
			viewport: { width: 800, height: 600 },
			...pageOptions
		});
	return browser;
};
