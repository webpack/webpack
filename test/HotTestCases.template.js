"use strict";

require("./helpers/warmup-webpack");

/** @typedef {{ name: string; tests: string[] }} Category */
/**
 * @typedef {object} SuiteConfig
 * @property {string} name suite name
 * @property {string=} target target
 */
/**
 * @typedef {object} HotTestConfig
 * @property {((scope: EXPECTED_ANY, options: import("../").Configuration) => void)=} moduleScope
 */

const path = require("path");
const fs = require("graceful-fs");
/** @type {{ sync: (p: string) => void }} */
// @ts-ignore no declaration file for rimraf
const rimraf = require("rimraf");
const checkArrayExpectation = require("./checkArrayExpectation");
const { TestRunner } = require("./harness/runner");
const createLazyTestEnv = require("./helpers/createLazyTestEnv");

const casesPath = path.join(__dirname, "hotCases");
/** @type {Category[]} */
const categories = fs
	.readdirSync(casesPath)
	.filter((dir) => fs.statSync(path.join(casesPath, dir)).isDirectory())
	.map((cat) => ({
		name: cat,
		tests: fs
			.readdirSync(path.join(casesPath, cat))
			.filter((folder) => !folder.includes("_"))
	}));

/**
 * @param {SuiteConfig} config suite config
 */
const describeCases = (config) => {
	describe(config.name, () => {
		for (const category of categories) {
			describe(category.name, () => {
				for (const testName of category.tests) {
					const testDirectory = path.join(casesPath, category.name, testName);
					const filterPath = path.join(testDirectory, "test.filter.js");
					if (fs.existsSync(filterPath) && !require(filterPath)(config)) {
						// eslint-disable-next-line jest/no-disabled-tests
						describe.skip(testName, () => {
							it("filtered", () => {});
						});

						continue;
					}

					describe(testName, () => {
						/** @type {import("../").Compiler} */
						let compiler;

						afterAll((/** @type {EXPECTED_ANY} */ callback) => {
							compiler.close(callback);
							compiler = /** @type {EXPECTED_ANY} */ (undefined);
						});

						it(`${testName} should compile`, (done) => {
							const webpack = require("..");

							const outputDirectory = path.join(
								__dirname,
								"js",
								`hot-cases-${config.name}`,
								category.name,
								testName
							);
							rimraf.sync(outputDirectory);
							const recordsPath = path.join(outputDirectory, "records.json");
							const fakeUpdateLoaderOptions = {
								updateIndex: 0
							};
							const configPath = path.join(testDirectory, "webpack.config.js");
							/** @type {import("../").Configuration} */
							let options = /** @type {import("../").Configuration} */ ({});
							if (fs.existsSync(configPath)) options = require(configPath);
							if (typeof (/** @type {EXPECTED_ANY} */ (options)) === "function") {
								options = /** @type {EXPECTED_ANY} */ (options)({ config });
							}
							if (!options.mode) options.mode = "development";
							if (!options.devtool) options.devtool = false;
							if (!options.context) options.context = testDirectory;
							if (!options.entry) options.entry = "./index.js";
							if (!options.output) options.output = {};
							if (!options.output.path) options.output.path = outputDirectory;
							if (!options.output.filename) {
								options.output.filename = `bundle${
									options.experiments && options.experiments.outputModule
										? ".mjs"
										: ".js"
								}`;
							}
							if (!options.output.chunkFilename) {
								options.output.chunkFilename = "[name].chunk.[fullhash].js";
							}
							if (options.output.pathinfo === undefined) {
								options.output.pathinfo = true;
							}
							if (options.output.publicPath === undefined) {
								options.output.publicPath = "https://test.cases/path/";
							}
							if (options.output.library === undefined) {
								options.output.library = { type: "commonjs2" };
							}
							if (!options.optimization) options.optimization = {};
							if (!options.optimization.moduleIds) {
								options.optimization.moduleIds = "named";
							}
							if (!options.module) options.module = {};
							if (!options.module.rules) options.module.rules = [];
							options.module.rules.push({
								loader: path.join(
									__dirname,
									"hotCases",
									"fake-update-loader.js"
								),
								enforce: "pre"
							});
							if (!options.target) options.target = config.target;
							if (!options.plugins) options.plugins = [];
							options.plugins.push(
								new webpack.HotModuleReplacementPlugin(),
								new webpack.LoaderOptionsPlugin(fakeUpdateLoaderOptions)
							);
							if (!options.recordsPath) options.recordsPath = recordsPath;
							let testConfig = {};
							try {
								// try to load a test file
								testConfig = Object.assign(
									testConfig,
									require(path.join(testDirectory, "test.config.js"))
								);
							} catch (_err) {
								// ignored
							}

							const onCompiled = (err, stats) => {
								if (err) return done(err);
								const jsonStats = stats.toJson({
									errorDetails: true
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

								function runCompiler(callback) {
									fakeUpdateLoaderOptions.updateIndex++;
									compiler.run((err, stats) => {
										if (err) return callback(err);
										const jsonStats = stats.toJson({
											errorDetails: true
										});
										if (
											checkArrayExpectation(
												testDirectory,
												jsonStats,
												"error",
												`errors${fakeUpdateLoaderOptions.updateIndex}`,
												"Error",
												options,
												callback
											)
										) {
											return;
										}
										if (
											checkArrayExpectation(
												testDirectory,
												jsonStats,
												"warning",
												`warnings${fakeUpdateLoaderOptions.updateIndex}`,
												"Warning",
												options,
												callback
											)
										) {
											return;
										}
										callback(null, jsonStats);
									});
								}

								const _stats = stats.toJson({ all: false, entrypoints: true });
								const { results } = TestRunner.runBundles({
									optionsArr: [options],
									outputDirectory,
									testConfig: {
										...testConfig,
										evaluateScriptOnAttached: true
									},
									category,
									testName,
									setupRunner: ({ runner }) => {
										if (testConfig.moduleScope) {
											testConfig.moduleScope(runner._moduleScope, options);
										}
										runner.mergeModuleScope({
											it: _it,
											beforeEach: _beforeEach,
											afterEach: _afterEach,
											STATE: jsonStats,
											NEXT: runCompiler,
											NEXT_DEFERRED: (cb) => {
												// https://github.com/webpack/webpack/actions/runs/22039709807/job/63678606467?pr=20412
												// When lazyCompilation is enabled, delay the first compilation re-run by 1000ms during HMR
												// to ensure that HTTP requests from dynamic imports (e.g., const promiseA = import("./moduleA"))
												// have already reached lazyCompilationBackend. This prevents NEXT from triggering
												// a recompilation while moduleA is still not marked as Activated and still returns
												// LazyCompilationProxyModule, which would cause a "No update available" error.
												setTimeout(() => {
													runCompiler(cb);
												}, 1000);
											}
										});
									},
									getBundlePaths: (_i, _options, runner) => {
										const bundles = _stats.entrypoints.main.assets.map(
											(i) => i.name
										);
										if (config.target === "web") {
											return bundles;
										}
										return [bundles[bundles.length - 1]];
									}
								});
								Promise.all(results).then(
									() => {
										if (getNumberOfTests() < 1) {
											return done(new Error("No tests exported by test case"));
										}

										done();
									},
									(err) => {
										console.log(err);
										done(err);
									}
								);
							};
							compiler = webpack(options);
							compiler.run(onCompiled);
						}, 20000);

						const {
							it: _it,
							beforeEach: _beforeEach,
							afterEach: _afterEach,
							getNumberOfTests
						} = createLazyTestEnv(20000);
					});
				}
			});
		}
	});
};

// eslint-disable-next-line jest/no-export
module.exports.describeCases = describeCases;
