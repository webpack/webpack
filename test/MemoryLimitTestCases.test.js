"use strict";

require("./helpers/warmup-webpack");

const path = require("path");
const fs = require("graceful-fs");
const rimraf = require("rimraf");
const webpack = require("..");
const captureStdio = require("./helpers/captureStdio");

const toMiB = (/** @type {number} */ bytes) =>
	`${Math.round(bytes / 1024 / 1024)}MiB`;
const base = path.join(__dirname, "memoryLimitCases");
const outputBase = path.join(__dirname, "js", "memoryLimit");
const tests = fs
	.readdirSync(base)
	.filter(
		(testName) =>
			fs.existsSync(path.join(base, testName, "index.js")) ||
			fs.existsSync(path.join(base, testName, "webpack.config.js"))
	)
	.filter((testName) => {
		const testDirectory = path.join(base, testName);
		const filterPath = path.join(testDirectory, "test.filter.js");
		if (fs.existsSync(filterPath) && !require(filterPath)()) {
			// eslint-disable-next-line jest/no-disabled-tests, jest/valid-describe-callback
			describe.skip(testName, () => it("filtered"));

			return false;
		}
		return true;
	});

/** @typedef {{ toString(): string, toStringRaw(): string, restore(): void, data: string[], reset(): void }} CapturedStdio */

describe("MemoryLimitTestCases", () => {
	jest.setTimeout(40000);
	/** @type {CapturedStdio} */
	let stderr;

	beforeEach(() => {
		stderr = captureStdio(process.stderr, true);
		if (global.gc) {
			global.gc();
			global.gc();
		}
	});

	afterEach(() => {
		stderr.restore();
	});

	for (const testName of tests) {
		/** @type {{ heapSizeLimitBytes: number, validate?: (stats: import("../").Stats, stderr: string) => void }} */
		let testConfig = {
			heapSizeLimitBytes: 250 * 1024 * 1024
		};
		try {
			// try to load a test file
			testConfig = Object.assign(
				testConfig,
				require(path.join(base, testName, "test.config.js"))
			);
		} catch (_err) {
			// ignored
		}
		const size = toMiB(testConfig.heapSizeLimitBytes);

		// eslint-disable-next-line no-loop-func
		it(`should build ${JSON.stringify(testName)} with heap limit of ${size}`, (done) => {
			const outputDirectory = path.join(outputBase, testName);
			rimraf.sync(outputDirectory);
			fs.mkdirSync(outputDirectory, { recursive: true });
			/** @type {import("../").Configuration} */
			let options = {
				mode: "development",
				entry: "./index",
				output: {
					filename: "bundle.js"
				}
			};
			if (fs.existsSync(path.join(base, testName, "webpack.config.js"))) {
				options = require(path.join(base, testName, "webpack.config.js"));
			}

			const resolvedOptions = /** @type {import("../").Configuration[]} */ (
				Array.isArray(options) ? options : [options]
			);
			for (const options of resolvedOptions) {
				if (!options.context) options.context = path.join(base, testName);
				if (!options.output) options.output = options.output || {};
				if (!options.output.path) options.output.path = outputDirectory;
				if (!options.plugins) options.plugins = [];
				if (!options.optimization) options.optimization = {};
				if (options.optimization.minimize === undefined) {
					options.optimization.minimize = false;
				}
			}
			const heapSizeStart = process.memoryUsage().heapUsed;
			const c = webpack(options);
			const cAny = /** @type {EXPECTED_ANY} */ (c);
			const compilers = /** @type {import("../").Compiler[]} */ (
				cAny.compilers ? cAny.compilers : [c]
			);
			for (const c of compilers) {
				const ifs = /** @type {NonNullable<typeof c.inputFileSystem>} */ (
					c.inputFileSystem
				);
				c.inputFileSystem = Object.create(ifs);
				/** @type {NonNullable<typeof c.inputFileSystem>} */ (
					c.inputFileSystem
				).readFile = function readFile() {
					// eslint-disable-next-line prefer-rest-params
					const args = Array.prototype.slice.call(arguments);
					const callback = args.pop();
					// eslint-disable-next-line no-useless-call
					/** @type {EXPECTED_ANY} */ (
						/** @type {NonNullable<typeof ifs>} */ (ifs).readFile
					).apply(ifs, [
						...args,
						(
							/** @type {Error | null} */ err,
							/** @type {Buffer | undefined} */ result
						) => {
							if (err) return callback(err);
							if (!/\.(?:js|json|txt)$/.test(args[0])) {
								return callback(null, result);
							}
							callback(
								null,
								/** @type {Buffer} */ (result)
									.toString("utf8")
									.replace(/\r/g, "")
							);
						}
					]);
				};
			}
			c.run((err, _stats) => {
				if (err) return done(err);
				const stats = /** @type {import("../").Stats} */ (_stats);
				expect(stats.hasErrors()).toBe(testName.endsWith("error"));
				if (!testName.endsWith("error") && stats.hasErrors()) {
					return done(
						new Error(
							stats.toString({
								all: false,
								errors: true,
								errorStack: true,
								errorDetails: true
							})
						)
					);
				}
				const heapUsed = process.memoryUsage().heapUsed - heapSizeStart;
				if (heapUsed > testConfig.heapSizeLimitBytes) {
					return done(
						new Error(`Out of memory limit with ${toMiB(heapUsed)} heap used`)
					);
				}
				if (testConfig.validate) testConfig.validate(stats, stderr.toString());
				done();
			});
		});
	}
});
