"use strict";

const path = require("node:path");
const fs = require("graceful-fs");
const rimraf = require("rimraf");
const ProfilingPlugin = require("../lib/debug/ProfilingPlugin");

describe("Profiling Plugin", () => {
	it("should persist the passed output path", () => {
		const outputPath = path.join(__dirname, "invest_in_doge_coin");
		const plugin = new ProfilingPlugin({
			outputPath
		});
		expect(plugin.options.outputPath).toBe(outputPath);
	});

	it("should handle no options", () => {
		expect(() => {
			// eslint-disable-next-line no-new
			new ProfilingPlugin();
		}).not.toThrow();
	});

	it("should handle when unable to require the inspector", () => {
		// @ts-expect-error intentionally calling without required argument
		const profiler = new ProfilingPlugin.Profiler();
		return profiler.startProfiling();
	});

	it("should handle when unable to start a profiling session", () => {
		const profiler = new ProfilingPlugin.Profiler(
			/** @type {EXPECTED_ANY} */ ({
				Session() {
					throw new Error("Sean Larkin was here.");
				}
			})
		);

		return profiler.startProfiling();
	});

	it("handles sending a profiling message when no session", () => {
		// @ts-expect-error intentionally calling without required argument
		const profiler = new ProfilingPlugin.Profiler();
		return profiler.sendCommand(
			"randy",
			/** @type {EXPECTED_OBJECT} */ (/** @type {unknown} */ ("is awesome"))
		);
	});

	it("handles destroying when no session", () => {
		// @ts-expect-error intentionally calling without required argument
		const profiler = new ProfilingPlugin.Profiler();
		return profiler.destroy();
	});
});

// Optional dependency: the browser end-to-end check only runs where puppeteer-core
// (and a Chrome it can launch) are present. puppeteer-core is ESM-only since v25,
// so it is loaded lazily via dynamic import inside beforeAll; it self-skips on
// Bun/Deno or when no Chrome launches. See #17234.
const globalScope = /** @type {{ Bun?: unknown, Deno?: unknown }} */ (
	globalThis
);
const onBunOrDeno = Boolean(globalScope.Bun) || Boolean(globalScope.Deno);

/**
 * @typedef {{ frame: string, parent?: string }} TraceFrame
 * @typedef {{ name: string, args: { data: { frames: TraceFrame[] } } }} TraceEvent
 */

describe("ProfilingPlugin in real Chrome", () => {
	/** @type {import("puppeteer-core").Browser | undefined} */
	let browser;

	beforeAll(async () => {
		if (onBunOrDeno) return;
		/** @type {typeof import("puppeteer-core").default} */
		let puppeteer;
		try {
			// require() of puppeteer-core throws under Jest since it is ESM-only (v25+).
			puppeteer = (await import("puppeteer-core")).default;
		} catch {
			return;
		}
		try {
			/** @type {import("puppeteer-core").LaunchOptions} */
			const launchOptions = {
				headless: true,
				args: ["--no-sandbox", "--disable-gpu", "--disable-dev-shm-usage"]
			};
			// Use an explicit binary when provided, otherwise the installed Chrome.
			if (process.env.PUPPETEER_EXECUTABLE_PATH) {
				launchOptions.executablePath = process.env.PUPPETEER_EXECUTABLE_PATH;
			} else {
				launchOptions.channel = "chrome";
			}
			browser = await puppeteer.launch(launchOptions);
		} catch {
			// No usable Chrome in this environment — the test self-skips below.
			browser = undefined;
		}
	}, 120000);

	afterAll(async () => {
		if (browser) await browser.close();
	});

	it("should generate a trace Chrome DevTools can load (#17234)", (done) => {
		if (!browser) {
			console.warn("Skipping: could not launch Chrome via puppeteer-core.");
			return done();
		}

		// Narrowed handle so the type survives into the callbacks below.
		const activeBrowser = browser;

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
					/** @type {TraceEvent[]} */
					const events = JSON.parse(fs.readFileSync(eventsPath, "utf8"));
					const page = await activeBrowser.newPage();
					// Run Chrome DevTools' trace bootstrap (MetaHandler) in the real
					// browser: iterate the TracingStartedInBrowser frames and pick the
					// parent-less main frame. A missing `frames` array threw
					// "frames is not iterable" and the whole trace failed to load.
					const result = await page.evaluate(
						(/** @type {TraceEvent[]} */ evs) => {
							const event = evs.find(
								(e) => e && e.name === "TracingStartedInBrowser"
							);
							if (!event) return { ok: false, threw: null, mainFrame: null };
							/** @type {string | null} */
							let threw = null;
							/** @type {string | null} */
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
	}, 120000);
});
