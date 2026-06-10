"use strict";

require("./helpers/warmup-webpack");

/** @typedef {{ name: string, tests: string[] }} Category */
/**
 * @typedef {object} SuiteConfig
 * @property {string} name suite name
 * @property {string=} target target
 * @property {string=} mode mode
 * @property {boolean=} module module
 * @property {boolean=} minimize minimize
 * @property {string | false=} devtool devtool
 * @property {EXPECTED_ANY=} cache cache
 * @property {EXPECTED_ANY=} snapshot snapshot
 * @property {EXPECTED_ANY=} optimization optimization
 * @property {string[]=} deprecations expected deprecations
 * @property {EXPECTED_ANY[]=} plugins plugins
 */
/**
 * @typedef {object} TestConfig
 * @property {((i: EXPECTED_ANY, options: EXPECTED_ANY) => string)=} findBundle
 * @property {number=} timeout
 * @property {number=} cachedTimeout
 * @property {boolean=} noTests
 * @property {((scope: EXPECTED_ANY, options: EXPECTED_ANY) => void)=} moduleScope
 */

const path = require("path");
const fs = require("graceful-fs");
/** @type {{ sync: (p: string) => void, (p: string, cb: (err: EXPECTED_ANY) => void): void }} */
const rimraf = require("rimraf");
const { parseResource } = require("../lib/util/identifier");
const checkArrayExpectation = require("./checkArrayExpectation");
const { TestRunner } = require("./harness/runner");
const captureStdio = require("./helpers/captureStdio");
const createLazyTestEnv = require("./helpers/createLazyTestEnv");
const deprecationTracking = require("./helpers/deprecationTracking");
const filterInfraStructureErrors = require("./helpers/infrastructureLogErrors");

const casesPath = path.join(__dirname, "cases");
/** @type {Category[]} */
const categories = fs.readdirSync(casesPath).map((cat) => ({
	name: cat,
	tests: fs
		.readdirSync(path.join(casesPath, cat))
		.filter((folder) => !folder.includes("_"))
}));

/**
 * @param {string[]} appendTarget log collector
 * @returns {EXPECTED_ANY} logger object
 */
const createLogger = (appendTarget) => ({
	log: (/** @type {string} */ l) => appendTarget.push(l),
	debug: (/** @type {string} */ l) => appendTarget.push(l),
	trace: (/** @type {string} */ l) => appendTarget.push(l),
	info: (/** @type {string} */ l) => appendTarget.push(l),
	warn: console.warn.bind(console),
	error: console.error.bind(console),
	logTime: () => {},
	group: () => {},
	groupCollapsed: () => {},
	groupEnd: () => {},
	profile: () => {},
	profileEnd: () => {},
	clear: () => {},
	status: () => {}
});

/**
 * @param {SuiteConfig} config suite config
 */
const describeCases = (config) => {
	describe(config.name, () => {
		/** @type {ReturnType<typeof captureStdio>} */
		let stderr;

		beforeEach(() => {
			stderr = captureStdio(process.stderr, true);
		});

		afterEach(() => {
			stderr.restore();
		});

		for (const category of categories) {
			// eslint-disable-next-line no-loop-func
			describe(category.name, () => {
				jest.setTimeout(30000);

				for (const testName of category.tests.filter((test) => {
					const testDirectory = path.join(casesPath, category.name, test);
					const filterPath = path.join(testDirectory, "test.filter.js");
					if (fs.existsSync(filterPath) && !require(filterPath)(config)) {
						// eslint-disable-next-line jest/no-disabled-tests
						describe.skip(test, () => {
							it("filtered", () => {});
						});

						return false;
					}
					return true;
				})) {
					/** @type {string[]} */
					const infraStructureLog = [];

					// eslint-disable-next-line no-loop-func
					describe(testName, () => {
						const testDirectory = path.join(casesPath, category.name, testName);
						const outputDirectory = path.join(
							__dirname,
							"js",
							config.name,
							category.name,
							testName
						);
						const cacheDirectory = path.join(
							__dirname,
							"js/.cache",
							config.name,
							category.name,
							testName
						);
						/** @type {TestConfig} */
						let testConfig = {
							findBundle(_, options) {
								const ext = path.extname(
									parseResource(options.output.filename).path
								);
								return `./bundle${ext}`;
							}
						};
						const testConfigPath = path.join(testDirectory, "test.config.js");
						if (fs.existsSync(testConfigPath)) {
							testConfig = require(testConfigPath);
						}

						const TerserPlugin = require("minimizer-webpack-plugin");

						const terserForTesting = new TerserPlugin({
							parallel: false
						});
						/** @type {import("../").Configuration} */
						let options = /** @type {import("../").Configuration} */ ({
							context: casesPath,
							entry: `./${category.name}/${testName}/`,
							target: config.target || "async-node",
							devtool: config.devtool,
							mode: config.mode || "none",
							optimization: config.mode
								? {
										emitOnErrors: true,
										minimizer: [terserForTesting],
										...config.optimization
									}
								: {
										removeAvailableModules: true,
										removeEmptyChunks: true,
										mergeDuplicateChunks: true,
										flagIncludedChunks: true,
										sideEffects: true,
										providedExports: true,
										usedExports: true,
										mangleExports: true,
										emitOnErrors: true,
										concatenateModules: false,
										moduleIds: "size",
										chunkIds: "size",
										minimizer: [terserForTesting],
										...config.optimization
									},
							performance: {
								hints: false
							},
							node: {
								__dirname: "mock",
								__filename: "mock"
							},
							cache: config.cache && {
								cacheDirectory,
								...config.cache
							},
							output: {
								pathinfo: "verbose",
								path: outputDirectory,
								filename: config.module ? "bundle.mjs" : "bundle.js"
							},
							resolve: {
								modules: ["web_modules", "node_modules"],
								mainFields: [
									"webpack",
									"browser",
									"web",
									"browserify",
									["jam", "main"],
									"main"
								],
								aliasFields: ["browser"],
								extensions: [".webpack.js", ".web.js", ".js", ".json"]
							},
							resolveLoader: {
								modules: [
									"web_loaders",
									"web_modules",
									"node_loaders",
									"node_modules"
								],
								mainFields: ["webpackLoader", "webLoader", "loader", "main"],
								extensions: [
									".webpack-loader.js",
									".web-loader.js",
									".loader.js",
									".js"
								]
							},
							module: {
								rules: [
									{
										test: /\.coffee$/,
										loader: "coffee-loader"
									},
									{
										test: /\.pug/,
										loader: "@webdiscus/pug-loader"
									},
									{
										test: /\.wat$/i,
										loader: "wast-loader",
										type: "webassembly/async"
									}
								]
							},
							plugins: [
								...(config.plugins || []),
								/** @this {import("../").Compiler} */
								function testCasesTest() {
									this.hooks.compilation.tap(
										"TestCasesTest",
										(/** @type {EXPECTED_ANY} */ compilation) => {
											for (const hook of [
												"optimize",
												"optimizeModules",
												"optimizeChunks",
												"afterOptimizeTree",
												"afterOptimizeAssets"
											]) {
												compilation.hooks[hook].tap("TestCasesTest", () =>
													compilation.checkConstraints()
												);
											}
										}
									);
								}
							],
							experiments: {
								asyncWebAssembly: true,
								topLevelAwait: true,
								backCompat: false,
								...(config.module ? { outputModule: true } : {})
							},
							infrastructureLogging: config.cache && {
								debug: true,
								console: createLogger(infraStructureLog)
							}
						});

						beforeAll((done) => {
							rimraf(cacheDirectory, done);
						});

						/** @type {(() => void)[]} */
						const cleanups = [];

						afterAll(() => {
							options = /** @type {EXPECTED_ANY} */ (undefined);
							testConfig = /** @type {EXPECTED_ANY} */ (undefined);
							for (const fn of cleanups) fn();
						});

						if (config.cache) {
							it(
								`${testName} should pre-compile to fill disk cache (1st)`,
								(done) => {
									const output = /** @type {EXPECTED_ANY} */ (options.output);
									const oldPath = output.path;
									output.path = path.join(
										/** @type {string} */ (output.path),
										"cache1"
									);
									infraStructureLog.length = 0;
									const deprecationTracker = deprecationTracking.start();

									const webpack = require("..");

									webpack(options, (err) => {
										deprecationTracker();
										output.path = oldPath;
										if (err) return done(err);
										const infrastructureLogErrors = filterInfraStructureErrors(
											infraStructureLog,
											{
												run: 1,
												options
											}
										);
										if (
											infrastructureLogErrors.length &&
											checkArrayExpectation(
												testDirectory,
												{ infrastructureLogs: infrastructureLogErrors },
												"infrastructureLog",
												"infrastructure-log",
												"InfrastructureLog",
												options,
												done
											)
										) {
											return;
										}
										done();
									});
								},
								testConfig.timeout || 60000
							);

							it(
								`${testName} should pre-compile to fill disk cache (2nd)`,
								(done) => {
									const output2 = /** @type {EXPECTED_ANY} */ (options.output);
									const oldPath = output2.path;
									output2.path = path.join(
										/** @type {string} */ (output2.path),
										"cache2"
									);
									infraStructureLog.length = 0;
									const deprecationTracker = deprecationTracking.start();

									const webpack = require("..");

									webpack(options, (err) => {
										deprecationTracker();
										output2.path = oldPath;
										if (err) return done(err);
										const infrastructureLogErrors = filterInfraStructureErrors(
											infraStructureLog,
											{
												run: 2,
												options
											}
										);
										if (
											infrastructureLogErrors.length &&
											checkArrayExpectation(
												testDirectory,
												{ infrastructureLogs: infrastructureLogErrors },
												"infrastructureLog",
												"infrastructure-log",
												"InfrastructureLog",
												options,
												done
											)
										) {
											return;
										}
										done();
									});
								},
								testConfig.cachedTimeout || testConfig.timeout || 10000
							);
						}

						it(
							`${testName} should compile`,
							(done) => {
								infraStructureLog.length = 0;

								const webpack = require("..");

								const compiler = webpack(options);
								const run = () => {
									const deprecationTracker = deprecationTracking.start();
									compiler.run((err, _stats) => {
										const stats = /** @type {import("../").Stats} */ (_stats);
										const deprecations = deprecationTracker();
										if (err) return done(err);
										const infrastructureLogErrors = filterInfraStructureErrors(
											infraStructureLog,
											{
												run: 3,
												options
											}
										);
										if (
											infrastructureLogErrors.length &&
											checkArrayExpectation(
												testDirectory,
												{ infrastructureLogs: infrastructureLogErrors },
												"infrastructureLog",
												"infrastructure-log",
												"InfrastructureLog",
												options,
												done
											)
										) {
											return;
										}
										compiler.close((err) => {
											if (err) return done(err);
											const statOptions = {
												preset: "verbose",
												colors: false,
												modules: true,
												reasonsSpace: 1000
											};
											fs.mkdirSync(outputDirectory, { recursive: true });
											fs.writeFileSync(
												path.join(outputDirectory, "stats.txt"),
												stats.toString(statOptions),
												"utf8"
											);
											const jsonStats = stats.toJson({
												errorDetails: true,
												modules: false,
												assets: false,
												chunks: false
											});
											if (
												checkArrayExpectation(
													testDirectory,
													jsonStats,
													"error",
													"Error",
													options,
													done
												)
											) {
												return;
											}
											if (
												checkArrayExpectation(
													testDirectory,
													jsonStats,
													"warning",
													"Warning",
													options,
													done
												)
											) {
												return;
											}
											const infrastructureLogging = stderr.toString();
											if (infrastructureLogging) {
												done(
													new Error(
														`Errors/Warnings during build:\n${infrastructureLogging}`
													)
												);
											}

											expect(deprecations).toEqual(config.deprecations || []);

											Promise.resolve().then(done);
										});
									});
								};
								if (config.cache) {
									// pre-compile to fill memory cache
									const deprecationTracker = deprecationTracking.start();
									compiler.run((err) => {
										deprecationTracker();
										if (err) return done(err);
										run();
									});
								} else {
									run();
								}
							},
							testConfig.cachedTimeout ||
								testConfig.timeout ||
								(config.cache ? 20000 : 60000)
						);

						it(`${testName} should load the compiled tests`, (done) => {
							const { results } = TestRunner.runBundles({
								optionsArr: [options],
								outputDirectory,
								testConfig,
								category,
								testName,
								setupRunner: ({ runner }) => {
									runner.mergeModuleScope({
										it: _it
									});
									if (testConfig.moduleScope) {
										testConfig.moduleScope(runner._moduleScope, options);
									}
									const runnerRequire = /** @type {EXPECTED_ANY} */ (
										runner.require
									);
									runnerRequire.webpackTestSuiteRequire = true;
								},
								getBundlePaths: (i, options) =>
									/** @type {NonNullable<TestConfig["findBundle"]>} */ (
										testConfig.findBundle
									)(i, options)
							});
							Promise.all(results).then(() => {
								if (getNumberOfTests() === 0) {
									return done(new Error("No tests exported by test case"));
								}
								done();
							}, done);
						}, 10000);

						const { it: _it, getNumberOfTests } = createLazyTestEnv(
							testConfig.timeout || 10000
						);
					});
				}
			});
		}
	});
};

// eslint-disable-next-line jest/no-export
module.exports.describeCases = describeCases;
