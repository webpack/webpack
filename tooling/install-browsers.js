/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Raj Aryan @aryanraj45
*/

"use strict";

// Downloads the Chrome and Firefox the browser suites compare against, into
// puppeteer's own cache rather than into webpack's dependencies. Each is the
// build puppeteer-core pins, so the engine moves only when the lockfile does
// and a Dependabot bump of puppeteer-core is the one pull request that sees a
// new engine. Safe to re-run: an install that is already there is reported and
// nothing is fetched. `node tooling/install-browsers.js firefox` fetches one.

const os = require("os");
const path = require("path");

// puppeteer's own cache, which `test/helpers/launchBrowser.js` looks in.
const CACHE_DIR =
	process.env.PUPPETEER_CACHE_DIR ||
	path.join(os.homedir(), ".cache", "puppeteer");

const ENGINES = ["chrome", "firefox"];

(async () => {
	// Both are ESM-only, so they are loaded the way puppeteer itself is rather
	// than with `require`.
	const { Browser, detectBrowserPlatform, install } =
		await import("@puppeteer/browsers");
	// Exported at runtime, but kept out of puppeteer-core's types as internal.
	const { PUPPETEER_REVISIONS } =
		/** @type {{ PUPPETEER_REVISIONS: Readonly<Record<"chrome" | "firefox", string>> }} */ (
			/** @type {unknown} */ (await import("puppeteer-core"))
		);
	const platform = detectBrowserPlatform();
	if (platform === undefined) throw new Error("no browser platform detected");
	const wanted = process.argv.slice(2);
	for (const engine of wanted.length > 0 ? wanted : ENGINES) {
		if (!ENGINES.includes(engine)) {
			throw new Error(`no pinned build for ${engine}: ${ENGINES.join(", ")}`);
		}
		const buildId =
			PUPPETEER_REVISIONS[/** @type {"chrome" | "firefox"} */ (engine)];
		const installed = await install({
			browser: engine === "chrome" ? Browser.CHROME : Browser.FIREFOX,
			buildId,
			cacheDir: CACHE_DIR
		});
		console.log(`${engine} ${buildId}: ${installed.executablePath}`);
	}
})().catch((error) => {
	console.error(error);
	process.exitCode = 1;
});
