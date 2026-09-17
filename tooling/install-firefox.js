"use strict";

// Downloads the Firefox the browser suites compare against, into puppeteer's own
// cache rather than into webpack's dependencies. Safe to re-run: an install that
// is already there is reported and nothing is fetched.

const os = require("os");
const {
	Browser,
	detectBrowserPlatform,
	install,
	resolveBuildId
} = require("@puppeteer/browsers");

const CACHE_DIR = `${os.homedir()}/.cache/puppeteer`;

(async () => {
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
