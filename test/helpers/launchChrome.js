"use strict";

/**
 * A real Chrome for the browser suites. A browser that is missing or will not
 * launch throws rather than skipping, so no environment can report these checks
 * as passing without having run them. Set `PUPPETEER_EXECUTABLE_PATH` to use a
 * binary other than the installed Chrome channel.
 * @param {import("puppeteer-core").LaunchOptions=} options extra launch options
 * @returns {Promise<import("puppeteer-core").Browser>} the running browser
 */
module.exports = async (options) => {
	// require() of puppeteer-core throws under Jest since it is ESM-only (v25+).
	const puppeteer = (await import("puppeteer-core")).default;
	/** @type {import("puppeteer-core").LaunchOptions} */
	const launchOptions = {
		headless: true,
		// puppeteer's own 30s default expires on a cold runner before Chrome
		// prints its WS endpoint; this stays under the callers' 120s hook budget
		timeout: 100000,
		args: ["--no-sandbox", "--disable-gpu", "--disable-dev-shm-usage"],
		...options
	};
	if (process.env.PUPPETEER_EXECUTABLE_PATH) {
		launchOptions.executablePath = process.env.PUPPETEER_EXECUTABLE_PATH;
	} else {
		launchOptions.channel = "chrome";
	}
	return puppeteer.launch(launchOptions);
};
