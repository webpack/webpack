/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Raj Aryan @aryanraj45
*/

"use strict";

// Downloads the Firefox the browser suites compare against, into puppeteer's own
// cache rather than into webpack's dependencies. Safe to re-run: an install that
// is already there is reported and nothing is fetched.

const os = require("os");

const CACHE_DIR = `${os.homedir()}/.cache/puppeteer`;

(async () => {
	// `@puppeteer/browsers` is ESM-only, so it is loaded the way puppeteer itself
	// is rather than with `require`.
	const { Browser, detectBrowserPlatform, install, resolveBuildId } =
		await import("@puppeteer/browsers");
	const platform = detectBrowserPlatform();
	if (platform === undefined) throw new Error("no browser platform detected");
	const buildId = await resolveBuildId(Browser.FIREFOX, platform, "stable");
	const installed = await install({
		browser: Browser.FIREFOX,
		buildId,
		cacheDir: CACHE_DIR
	});
	console.log(`firefox ${buildId}: ${installed.executablePath}`);
})();
