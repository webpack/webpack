"use strict";

require("./helpers/warmup-webpack");

const path = require("path");
const fs = require("graceful-fs");
const rimraf = require("rimraf");

// Optional dependency: the browser end-to-end check only runs where puppeteer
// (and a working Chrome) are present. puppeteer is not a committed dependency —
// CI installs it and runs this on the latest LTS only (see test.yml, #17234).
let puppeteer;
try {
	const name = "puppeteer";
	puppeteer = require(name);
} catch (_err) {
	puppeteer = undefined;
}

describe("ProfilingPlugin in real Chrome", () => {
	jest.setTimeout(120000);

	/** @type {EXPECTED_ANY} */
	let browser;

	beforeAll(async () => {
		if (!puppeteer) return;
		try {
			browser = await puppeteer.launch({
				headless: true,
				args: ["--no-sandbox", "--disable-gpu", "--disable-dev-shm-usage"]
			});
		} catch (_err) {
			// No usable Chrome in this environment — the test self-skips below.
			browser = undefined;
		}
	});

	afterAll(async () => {
		if (browser) await browser.close();
	});

	it("should generate a trace Chrome DevTools can load (#17234)", (done) => {
		if (!browser) {
			console.warn("Skipping: could not launch Chrome via puppeteer.");
			return done();
		}

		const webpack = require("..");

		const outputPath = path.join(__dirname, "js/profiling-chrome");
		const eventsPath = path.join(outputPath, "events.json");

		rimraf(outputPath, () => {
			const compiler = webpack({
				context: __dirname,
				entry: "./fixtures/a.js",
				output: { path: path.join(outputPath, "dist") },
				plugins: [new webpack.debug.ProfilingPlugin({ outputPath: eventsPath })]
			});
			compiler.run(async (err) => {
				if (err) return done(err);
				try {
					const events = JSON.parse(fs.readFileSync(eventsPath, "utf8"));
					const page = await browser.newPage();
					// Run Chrome DevTools' trace bootstrap (MetaHandler) in the real
					// browser: iterate the TracingStartedInBrowser frames and pick the
					// parent-less main frame. A missing `frames` array threw
					// "frames is not iterable" and the whole trace failed to load.
					const result = await page.evaluate(
						(/** @type {EXPECTED_ANY[]} */ evs) => {
							const event = evs.find(
								(e) => e && e.name === "TracingStartedInBrowser"
							);
							if (!event) return { ok: false, reason: "no bootstrap event" };
							let threw = null;
							let mainFrame = null;
							try {
								for (const frame of event.args.data.frames) {
									if (!frame.parent) mainFrame = frame.frame;
								}
							} catch (err_) {
								threw = err_ instanceof Error ? err_.message : String(err_);
							}
							return { ok: threw === null, threw, mainFrame };
						},
						events
					);
					await page.close();

					expect(result.threw).toBeNull();
					expect(result.ok).toBe(true);
					expect(typeof result.mainFrame).toBe("string");
					done();
				} catch (err_) {
					done(err_);
				}
			});
		});
	});
});
