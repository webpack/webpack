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
 * A real browser for the suites that compare against one. A browser that is
 * missing or will not launch throws rather than skipping, so no environment can
 * report these checks as passing without having run them.
 * @param {(import("puppeteer-core").LaunchOptions & { browser?: "chrome" | "firefox" })=} options extra launch options; `browser` picks the engine
 * @returns {Promise<import("puppeteer-core").Browser>} the running browser
 */
module.exports = async (options) => {
	// require() of puppeteer-core throws under Jest since it is ESM-only (v25+).
	const puppeteer = (await import("puppeteer-core")).default;
	const engine = (options && options.browser) || "chrome";
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
			? {}
			: { args: ["--no-sandbox", "--disable-gpu", "--disable-dev-shm-usage"] }),
		...options
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
