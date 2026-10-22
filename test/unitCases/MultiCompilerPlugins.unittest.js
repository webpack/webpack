"use strict";

require("../helpers/warmup-webpack");

const path = require("path");
const { Volume, createFsFromVolume } = require("memfs");
const webpack = require("../..");
const expectNoDeprecations = require("../helpers/expectNoDeprecations");

/** @typedef {import("../../").Compiler} Compiler */
/** @typedef {import("../../").MultiCompiler} MultiCompiler */
/** @typedef {import("../../").OutputFileSystem} OutputFileSystem */
/** @typedef {import("memfs").IFs} IFs */

const fixtures = path.join(__dirname, "..", "fixtures");
const outputPath = path.join(fixtures, "dist");
const PLUGIN_NAME = "DevServerLikePlugin";

/**
 * @returns {IFs} an empty in-memory file system
 */
const createFs = () => createFsFromVolume(new Volume());

/**
 * @param {number} ms milliseconds
 * @returns {Promise<void>} resolves after `ms`
 */
const delay = (ms) =>
	new Promise((resolve) => {
		setTimeout(resolve, ms);
	});

// Taps hooks the way webpack-dev-server's `apply()` does, with no branching
// on the compiler type, and records what each hook did.
class DevServerLikePlugin {
	constructor() {
		this.fs = createFs();
		this.applied = 0;
		this.setupCalls = 0;
		this.listenCalls = 0;
		this.stopCalls = 0;
		this.invalidCalls = 0;
		this.doneCalls = 0;
		/** @type {boolean} */
		this.hasLogger = false;
		/** @type {boolean} */
		this.stopFinished = false;
	}

	/**
	 * @param {Compiler | MultiCompiler} compiler a compiler or a multi compiler
	 * @returns {void}
	 */
	apply(compiler) {
		this.applied++;
		this.hasLogger =
			typeof compiler.getInfrastructureLogger(PLUGIN_NAME).info === "function";
		/** @type {Promise<void> | undefined} */
		let setupPromise;
		let inWatchMode = false;
		let listening = false;
		let stopped = false;
		const ensureSetup = () => {
			if (!setupPromise) {
				// Asynchronous like dev-server's setup(), which swaps the output fs.
				setupPromise = delay(10).then(() => {
					this.setupCalls++;
					compiler.outputFileSystem = /** @type {OutputFileSystem} */ (
						/** @type {unknown} */ (this.fs)
					);
				});
			}
			return setupPromise;
		};
		const { hooks } = /** @type {Compiler} */ (compiler);
		hooks.watchRun.tapPromise(PLUGIN_NAME, () => {
			inWatchMode = true;
			return ensureSetup();
		});
		hooks.invalid.tap(PLUGIN_NAME, () => {
			this.invalidCalls++;
		});
		hooks.done.tap(PLUGIN_NAME, () => {
			this.doneCalls++;
			if (listening || !inWatchMode) return;
			listening = true;
			this.listenCalls++;
		});
		hooks.shutdown.tapPromise(PLUGIN_NAME, () => {
			if (stopped) return Promise.resolve();
			stopped = true;
			this.stopCalls++;
			return delay(10).then(() => {
				this.stopFinished = true;
			});
		});
	}
}

/**
 * @typedef {object} Mode
 * @property {string} name label of the mode
 * @property {string[]} bundles emitted bundle names
 * @property {number} invalidCallsPerInvalidate `invalid` calls per `watching.invalidate()`
 * @property {(plugin: DevServerLikePlugin) => Compiler | MultiCompiler} create creates the compiler
 */

/** @type {Mode[]} */
const modes = [
	{
		name: "Compiler with the plugin in `plugins`",
		bundles: ["a.js"],
		invalidCallsPerInvalidate: 1,
		create: (plugin) =>
			webpack({
				context: fixtures,
				entry: "./a.js",
				output: { path: outputPath, filename: "a.js" },
				plugins: [plugin]
			})
	},
	{
		name: "MultiCompiler with the plugin in top-level `plugins`",
		bundles: ["a.js", "b.js"],
		// `invalid` is a MultiHook, so the tap fires once per child.
		invalidCallsPerInvalidate: 2,
		create: (plugin) =>
			webpack(
				/** @type {import("../../").MultiConfiguration} */ (
					Object.assign(
						[
							{
								name: "a",
								context: fixtures,
								entry: "./a.js",
								output: { path: outputPath, filename: "a.js" }
							},
							{
								name: "b",
								context: fixtures,
								entry: "./b.js",
								output: { path: outputPath, filename: "b.js" }
							}
						],
						{ plugins: [plugin] }
					)
				)
			)
	}
];

/**
 * @param {Compiler | MultiCompiler} compiler compiler
 * @returns {Promise<void>} resolves once the compiler is closed
 */
const close = (compiler) =>
	new Promise((resolve, reject) => {
		compiler.close((err) => (err ? reject(err) : resolve()));
	});

describe("plugin applied like webpack-dev-server", () => {
	expectNoDeprecations();

	describe.each(modes)("$name", (mode) => {
		/** @type {DevServerLikePlugin} */
		let plugin;
		/** @type {Compiler | MultiCompiler} */
		let compiler;
		/** @type {IFs} */
		let originalFs;

		beforeEach(() => {
			plugin = new DevServerLikePlugin();
			compiler = mode.create(plugin);
			originalFs = createFs();
			compiler.outputFileSystem = /** @type {OutputFileSystem} */ (
				/** @type {unknown} */ (originalFs)
			);
		});

		it("is applied once with a logger", async () => {
			expect(plugin.applied).toBe(1);
			expect(plugin.hasLogger).toBe(true);
			await close(compiler);
		});

		it("sets up on watchRun before emitting, listens once, and rebuilds on invalidate", async () => {
			/** @type {() => void} */
			let onFirstBuild = () => {};
			const firstBuild = new Promise((resolve) => {
				onFirstBuild = () => resolve(undefined);
			});
			let handled = 0;
			compiler.watch({}, (err) => {
				if (err) throw err;
				if (++handled === 1) onFirstBuild();
			});
			await firstBuild;

			expect(plugin.setupCalls).toBe(1);
			expect(plugin.doneCalls).toBe(1);
			expect(plugin.listenCalls).toBe(1);
			// The awaited watchRun swapped the fs before anything was emitted.
			for (const bundle of mode.bundles) {
				expect(plugin.fs.existsSync(path.join(outputPath, bundle))).toBe(true);
				expect(originalFs.existsSync(path.join(outputPath, bundle))).toBe(
					false
				);
			}

			const watching = /** @type {NonNullable<Compiler["watching"]>} */ (
				compiler.watching
			);
			await new Promise((resolve) => {
				watching.invalidate(() => resolve(undefined));
			});

			expect(plugin.invalidCalls).toBe(mode.invalidCallsPerInvalidate);
			expect(plugin.doneCalls).toBe(2);
			expect(plugin.setupCalls).toBe(1);
			expect(plugin.listenCalls).toBe(1);

			await close(compiler);
			expect(plugin.stopCalls).toBe(1);
			expect(plugin.stopFinished).toBe(true);
		});

		it("stays passive for a one-shot run", async () => {
			await new Promise((resolve, reject) => {
				compiler.run((err) => (err ? reject(err) : resolve(undefined)));
			});

			expect(plugin.doneCalls).toBe(1);
			expect(plugin.setupCalls).toBe(0);
			expect(plugin.listenCalls).toBe(0);
			for (const bundle of mode.bundles) {
				expect(originalFs.existsSync(path.join(outputPath, bundle))).toBe(true);
			}

			await close(compiler);
			expect(plugin.stopCalls).toBe(1);
			expect(plugin.stopFinished).toBe(true);
		});
	});
});
