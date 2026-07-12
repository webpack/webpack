"use strict";

require("./helpers/warmup-webpack");

const path = require("node:path");
const fs = require("graceful-fs");
const rimraf = require("rimraf");
const webpack = require("..");
const { registerPerCaseSnapshotHooks } = require("./harness/snapshot");
const captureStdio = require("./helpers/captureStdio");
const {
	expectOnlyListedDeprecations
} = require("./helpers/expectNoDeprecations");

/**
 * Escapes regular expression metacharacters
 * @param {string} str String to quote
 * @returns {string} Escaped string
 */
const quoteMeta = (str) => str.replaceAll(/[-[\]\\/{}()*+?.^$|]/g, "\\$&");

const base = path.join(__dirname, "statsCases");
const outputBase = path.join(__dirname, "js", "stats");
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
			describe.skip(testName, () => it("filtered", () => {}));

			return false;
		}
		return true;
	});

/** @typedef {{ toString(): string, toStringRaw(): string, restore(): void, data: string[], reset(): void }} CapturedStdio */

describe("StatsTestCases", () => {
	jest.setTimeout(30000);
	/** @type {CapturedStdio} */
	let stderr;

	beforeEach(() => {
		stderr = captureStdio(process.stderr, true);
	});

	afterEach(() => {
		stderr.restore();
	});

	for (const testName of tests) {
		const testDirectory = path.join(base, testName);

		// eslint-disable-next-line no-loop-func
		describe(testName, () => {
			registerPerCaseSnapshotHooks(testDirectory, "StatsTestCases");
			expectOnlyListedDeprecations(() => testDirectory);

			it(`should print correct stats for ${testName}`, (done) => {
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
				if (fs.existsSync(path.join(testDirectory, "webpack.config.js"))) {
					options = require(path.join(testDirectory, "webpack.config.js"));
				}
				/** @type {{ validate?: (stats: import("../").Stats, stderr: string) => void }} */
				let testConfig = {};
				try {
					// try to load a test file
					testConfig = Object.assign(
						testConfig,
						require(path.join(testDirectory, "test.config.js"))
					);
				} catch {
					// ignored
				}

				const resolvedOptions = Array.isArray(options) ? options : [options];
				for (const options of resolvedOptions) {
					if (!options.context) options.context = testDirectory;
					if (!options.output) options.output ||= {};
					if (!options.output.path) options.output.path = outputDirectory;
					if (!options.plugins) options.plugins = [];
					if (!options.optimization) options.optimization = {};
					if (options.optimization.minimize === undefined) {
						options.optimization.minimize = false;
					}
					if (
						options.cache &&
						options.cache !== true &&
						options.cache.type === "filesystem"
					) {
						options.cache.cacheDirectory = path.resolve(
							outputBase,
							".cache",
							testName
						);
					}
				}
				const c = webpack(options);
				const cAny = /** @type {EXPECTED_ANY} */ (c);
				const compilers = /** @type {import("../").Compiler[]} */ (
					cAny.compilers || [c]
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
										.replaceAll("\r", "")
								);
							}
						]);
					};
					c.hooks.compilation.tap(
						"StatsTestCasesTest",
						(/** @type {import("../").Compilation} */ compilation) => {
							for (const hook of [
								"optimize",
								"optimizeModules",
								"optimizeChunks",
								"afterOptimizeTree",
								"afterOptimizeAssets",
								"beforeHash"
							]) {
								/** @type {Record<string, EXPECTED_ANY>} */ (compilation.hooks)[
									hook
								].tap("TestCasesTest", () => compilation.checkConstraints());
							}
						}
					);
				}
				c.run((err, _stats) => {
					if (err) return done(err);
					const stats = /** @type {import("../").Stats} */ (_stats);
					const statsAny = /** @type {EXPECTED_ANY} */ (stats);
					for (const compilation of /** @type {import("../").Compilation[]} */ (
						[...(statsAny.stats || [stats])].map(
							(/** @type {EXPECTED_ANY} */ s) => s.compilation
						)
					)) {
						compilation.logging.delete("webpack.Compilation.ModuleProfile");
					}
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
					fs.writeFileSync(
						path.join(outputBase, testName, "stats.txt"),
						stats.toString({
							preset: "verbose",
							context: testDirectory,
							colors: false
						}),
						"utf8"
					);

					/** @type {EXPECTED_ANY} */
					let toStringOptions = {
						context: testDirectory,
						colors: false
					};
					let hasColorSetting = false;
					const cOptions = /** @type {EXPECTED_ANY} */ (c.options);
					if (typeof cOptions.stats !== "undefined") {
						toStringOptions = cOptions.stats;
						if (
							toStringOptions === null ||
							typeof toStringOptions !== "object"
						) {
							toStringOptions = { preset: toStringOptions };
						}
						if (!toStringOptions.context) {
							toStringOptions.context = testDirectory;
						}
						hasColorSetting = typeof toStringOptions.colors !== "undefined";
					}
					if (Array.isArray(cOptions) && !toStringOptions.children) {
						toStringOptions.children = cOptions.map(
							(/** @type {EXPECTED_ANY} */ o) => o.stats
						);
					}
					// mock timestamps
					for (const { compilation: s } of statsAny.stats || [stats]) {
						expect(/** @type {EXPECTED_ANY} */ (s).startTime).toBeGreaterThan(
							0
						);
						expect(/** @type {EXPECTED_ANY} */ (s).endTime).toBeGreaterThan(0);
						/** @type {EXPECTED_ANY} */ (s).endTime = new Date(
							"04/20/1970, 12:42:42 PM"
						).getTime();
						/** @type {EXPECTED_ANY} */ (s).startTime =
							/** @type {EXPECTED_ANY} */ (s).endTime - 1234;
					}
					let actual = stats.toString(toStringOptions);
					expect(typeof actual).toBe("string");
					if (!hasColorSetting) {
						actual = stderr.toString() + actual;
						actual = actual
							.replaceAll(/\u001B\[[0-9;]*m/g, "")
							.replaceAll(/[.0-9]+(\s?ms)/g, "X$1");
					} else {
						actual = stderr.toStringRaw() + actual;
						actual = actual
							.replaceAll(/\u001B\[1m\u001B\[([0-9;]*)m/g, "<CLR=$1,BOLD>")
							.replaceAll("\u001B[1m", "<CLR=BOLD>")
							.replaceAll("\u001B[39m\u001B[22m", "</CLR>")
							.replaceAll(/\u001B\[([0-9;]*)m/g, "<CLR=$1>")
							.replaceAll(/[.0-9]+(<\/CLR>)?(\s?ms)/g, "X$1$2");
					}
					// cspell:ignore Xdir
					actual = actual
						.replaceAll(/\r\n?/g, "\n")
						.replaceAll(
							/webpack [^ )]+(\)?) compiled/g,
							"webpack x.x.x$1 compiled"
						)
						.replaceAll(
							new RegExp(quoteMeta(testDirectory), "g"),
							`Xdir/${testName}`
						)
						.replaceAll(/(\w)\\(\w)/g, "$1/$2")
						.replaceAll(", additional resolving: X ms", "")
						.replaceAll(/Unexpected identifier '.+?'/g, "Unexpected identifier")
						// Normalize JSC (Bun) engine error phrasings to the V8 form.
						.replaceAll(
							/Unexpected identifier\. Expected a ':' following the property name '[^']*'\./g,
							"Unexpected identifier"
						)
						.replaceAll(
							"JSON Parse error: Unexpected EOF",
							"Unexpected end of JSON input"
						)
						.replaceAll(/[.0-9]+(\s?(bytes|KiB|MiB|GiB))/g, "X$1")
						.replaceAll(
							/ms\s\([0-9a-f]{6,32}\)|(?!\d+-)[0-9a-f-]{6,32}\./g,
							(match) => `${match.replaceAll(/[0-9a-f]/g, "X")}`
						)
						// Normalize stack traces between Jest v27 and v30
						// Jest v27: at Object.<anonymous>.module.exports
						// Jest v30: at Object.module.exports
						.replaceAll("Object.<anonymous>.", "Object.");
					// Normalize logger trace frames across engines: V8 emits one
					// "at fn (file:line:col)" frame, while JSC (Bun) emits extra
					// internal frames, omits the function name, and reports different
					// line:col. Keep only frames inside the test dir, reduced to the
					// file path.
					const traceFile = new RegExp(
						`Xdir/${quoteMeta(testName)}/[^\\s():]+`
					);
					actual = actual
						.split("\n")
						.reduce((lines, line) => {
							const prefix = line.match(/^(\s*\|\s+)at\b/);
							if (!prefix) {
								lines.push(line);
								return lines;
							}
							const file = line.match(traceFile);
							if (file) lines.push(`${prefix[1]}at ${file[0]}`);
							return lines;
						}, /** @type {string[]} */ ([]))
						.join("\n");
					expect(actual).toMatchSnapshot();

					if (testConfig.validate) {
						try {
							testConfig.validate(stats, stderr.toString());
						} catch (err) {
							done(err);
							return;
						}
					}

					done();
				});
			});
		});
	}
});
