"use strict";

require("./helpers/warmup-webpack");

/** @typedef {Record<string, EXPECTED_ANY>} Env */
/** @typedef {{ testPath: string, srcPath: string }} TestOptions */

const path = require("path");
const fs = require("graceful-fs");
const vm = require("vm");
const rimraf = require("rimraf");
const { pathToFileURL, fileURLToPath } = require("url");
const checkArrayExpectation = require("./checkArrayExpectation");
const createLazyTestEnv = require("./helpers/createLazyTestEnv");
const { remove } = require("./helpers/remove");
const prepareOptions = require("./helpers/prepareOptions");
const deprecationTracking = require("./helpers/deprecationTracking");
const FakeDocument = require("./helpers/FakeDocument");
const asModule = require("./helpers/asModule");

/**
 * @param {string} src src
 * @param {string} dest dest
 * @param {boolean} initial is initial?
 */
function copyDiff(src, dest, initial) {
	if (!fs.existsSync(dest)) fs.mkdirSync(dest);
	const files = fs.readdirSync(src);
	for (const filename of files) {
		const srcFile = path.join(src, filename);
		const destFile = path.join(dest, filename);
		const directory = fs.statSync(srcFile).isDirectory();
		if (directory) {
			copyDiff(srcFile, destFile, initial);
		} else {
			const content = fs.readFileSync(srcFile);
			if (/^DELETE\s*$/.test(content.toString("utf-8"))) {
				fs.unlinkSync(destFile);
			} else if (/^DELETE_DIRECTORY\s*$/.test(content.toString("utf-8"))) {
				rimraf.sync(destFile);
			} else {
				fs.writeFileSync(destFile, content);
				if (initial) {
					const longTimeAgo = Date.now() - 1000 * 60 * 60 * 24;
					fs.utimesSync(
						destFile,
						Date.now() - longTimeAgo,
						Date.now() - longTimeAgo
					);
				}
			}
		}
	}
}

const describeCases = config => {
	describe(config.name, () => {
		if (process.env.NO_WATCH_TESTS) {
			// eslint-disable-next-line jest/no-disabled-tests
			it.skip("long running tests excluded", () => {});
			return;
		}

		const casesPath = path.join(__dirname, "watchCases");
		const categories = fs.readdirSync(casesPath).map(cat => ({
			name: cat,
			tests: fs
				.readdirSync(path.join(casesPath, cat))
				.filter(folder => !folder.includes("_"))
				.filter(testName => {
					const testDirectory = path.join(casesPath, cat, testName);
					const filterPath = path.join(testDirectory, "test.filter.js");
					if (fs.existsSync(filterPath) && !require(filterPath)(config)) {
						// eslint-disable-next-line jest/no-disabled-tests, jest/valid-describe-callback
						describe.skip(testName, () => it("filtered", () => {}));
						return false;
					}
					return true;
				})
				.sort()
		}));
		beforeAll(() => {
			let dest = path.join(__dirname, "js");
			if (!fs.existsSync(dest)) fs.mkdirSync(dest);
			dest = path.join(__dirname, "js", `${config.name}-src`);
			if (!fs.existsSync(dest)) fs.mkdirSync(dest);
		});
		for (const category of categories) {
			beforeAll(() => {
				const dest = path.join(
					__dirname,
					"js",
					`${config.name}-src`,
					category.name
				);
				if (!fs.existsSync(dest)) fs.mkdirSync(dest);
			});
			describe(category.name, () => {
				for (const testName of category.tests) {
					describe(testName, () => {
						const tempDirectory = path.join(
							__dirname,
							"js",
							`${config.name}-src`,
							category.name,
							testName
						);
						const testDirectory = path.join(casesPath, category.name, testName);
						/** @type {TODO} */
						const runs = fs
							.readdirSync(testDirectory)
							.sort()
							.filter(name =>
								fs.statSync(path.join(testDirectory, name)).isDirectory()
							)
							.map(name => ({ name }));

						beforeAll(done => {
							rimraf(tempDirectory, done);
						});

						it(`${testName} should compile`, done => {
							const outputDirectory = path.join(
								__dirname,
								"js",
								config.name,
								category.name,
								testName
							);

							rimraf.sync(outputDirectory);

							let options = {};
							const configPath = path.join(testDirectory, "webpack.config.js");
							if (fs.existsSync(configPath)) {
								options = prepareOptions(require(configPath), {
									testPath: outputDirectory,
									srcPath: tempDirectory
								});
							}
							const applyConfig = (options, idx) => {
								if (!options.mode) options.mode = "development";
								if (!options.context) options.context = tempDirectory;
								if (!options.entry) options.entry = "./index.js";
								if (!options.target) options.target = "async-node";
								if (!options.output) options.output = {};
								if (!options.output.path) options.output.path = outputDirectory;
								if (typeof options.output.pathinfo === "undefined")
									options.output.pathinfo = true;
								if (!options.output.filename)
									options.output.filename = "bundle.js";
								if (options.cache && options.cache.type === "filesystem") {
									const cacheDirectory = path.join(tempDirectory, ".cache");
									options.cache.cacheDirectory = cacheDirectory;
									options.cache.name = `config-${idx}`;
								}
								if (config.experiments) {
									if (!options.experiments) options.experiments = {};
									for (const key of Object.keys(config.experiments)) {
										if (options.experiments[key] === undefined)
											options.experiments[key] = config.experiments[key];
									}
								}
								if (config.optimization) {
									if (!options.optimization) options.optimization = {};
									for (const key of Object.keys(config.optimization)) {
										if (options.optimization[key] === undefined)
											options.optimization[key] = config.optimization[key];
									}
								}
							};
							if (Array.isArray(options)) {
								for (const [idx, item] of options.entries()) {
									applyConfig(item, idx);
								}
							} else {
								applyConfig(options, 0);
							}

							const state = {};
							let runIdx = 0;
							let waitMode = false;
							let run = runs[runIdx];
							let triggeringFilename;
							let lastHash = "";
							const currentWatchStepModule = require("./helpers/currentWatchStep");
							let compilationFinished = done;
							currentWatchStepModule.step = run.name;
							copyDiff(path.join(testDirectory, run.name), tempDirectory, true);

							setTimeout(() => {
								const deprecationTracker = deprecationTracking.start();
								const webpack = require("..");
								const compiler = webpack(options);
								compiler.hooks.invalid.tap(
									"WatchTestCasesTest",
									(filename, mtime) => {
										triggeringFilename = filename;
									}
								);
								compiler.watch(
									{
										aggregateTimeout: 1000
									},
									async (err, stats) => {
										if (err) return compilationFinished(err);
										if (!stats) {
											return compilationFinished(
												new Error("No stats reported from Compiler")
											);
										}
										if (stats.hash === lastHash) return;
										lastHash = stats.hash;
										if (run.done && lastHash !== stats.hash) {
											return compilationFinished(
												new Error(
													`Compilation changed but no change was issued ${
														lastHash
													} != ${stats.hash} (run ${runIdx})\n` +
														`Triggering change: ${triggeringFilename}`
												)
											);
										}
										if (waitMode) return;
										run.done = true;
										run.stats = stats;
										if (err) return compilationFinished(err);
										const statOptions = {
											preset: "verbose",
											cached: true,
											cachedAssets: true,
											cachedModules: true,
											colors: false
										};
										fs.mkdirSync(outputDirectory, { recursive: true });
										fs.writeFileSync(
											path.join(
												outputDirectory,
												`stats.${runs[runIdx] && runs[runIdx].name}.txt`
											),
											stats.toString(statOptions),
											"utf-8"
										);
										const jsonStats = stats.toJson({
											errorDetails: true
										});
										if (
											checkArrayExpectation(
												path.join(testDirectory, run.name),
												jsonStats,
												"error",
												"Error",
												options,
												compilationFinished
											)
										)
											return;
										if (
											checkArrayExpectation(
												path.join(testDirectory, run.name),
												jsonStats,
												"warning",
												"Warning",
												options,
												compilationFinished
											)
										)
											return;

										const globalContext = {
											console,
											expect,
											setTimeout,
											clearTimeout,
											document: new FakeDocument()
										};

										const baseModuleScope = {
											console,
											it: run.it,
											beforeEach: _beforeEach,
											afterEach: _afterEach,
											expect,
											jest,
											STATS_JSON: jsonStats,
											nsObj: m => {
												Object.defineProperty(m, Symbol.toStringTag, {
													value: "Module"
												});
												return m;
											},
											window: globalContext,
											self: globalContext,
											WATCH_STEP: run.name,
											STATE: state
										};

										const esmCache = new Map();
										const esmIdentifier = `${category.name}-${testName}`;
										const esmContext = vm.createContext(baseModuleScope, {
											name: "context for esm"
										});
										// ESM
										const isModule =
											options.experiments && options.experiments.outputModule;

										/**
										 * @param {string} currentDirectory The directory to resolve relative paths from
										 * @param {string} module The module to require
										 * @param {("unlinked"|"evaluated")} esmMode The mode for ESM module handling
										 * @returns {EXPECTED_ANY} required module
										 * @private
										 */
										function _require(currentDirectory, module, esmMode) {
											if (/^\.\.?\//.test(module) || path.isAbsolute(module)) {
												let fn;
												const p = path.isAbsolute(module)
													? module
													: path.join(currentDirectory, module);
												const content = fs.readFileSync(p, "utf-8");

												if (isModule) {
													if (!vm.SourceTextModule)
														throw new Error(
															"Running this test requires '--experimental-vm-modules'.\nRun with 'node --experimental-vm-modules node_modules/jest-cli/bin/jest'."
														);
													let esm = esmCache.get(p);
													if (!esm) {
														esm = new vm.SourceTextModule(content, {
															identifier: `${esmIdentifier}-${p}`,
															url: `${pathToFileURL(p).href}?${esmIdentifier}`,
															context: esmContext,
															initializeImportMeta: (meta, module) => {
																meta.url = pathToFileURL(p).href;
															},
															importModuleDynamically: async (
																specifier,
																module
															) => {
																const normalizedSpecifier =
																	specifier.startsWith("file:")
																		? `./${path.relative(
																				path.dirname(p),
																				fileURLToPath(specifier)
																			)}`
																		: specifier.replace(
																				/https:\/\/test.cases\/path\//,
																				"./"
																			);
																const result = await _require(
																	currentDirectory,
																	normalizedSpecifier,
																	"evaluated"
																);
																return await asModule(result, module.context);
															}
														});
														esmCache.set(p, esm);
													}
													if (esmMode === "unlinked") return esm;
													return (async () => {
														if (esmMode === "unlinked") return esm;
														if (esm.status !== "evaluated") {
															await esm.link(
																async (specifier, referencingModule) =>
																	await asModule(
																		await _require(
																			path.dirname(
																				referencingModule.identifier
																					? referencingModule.identifier.slice(
																							esmIdentifier.length + 1
																						)
																					: fileURLToPath(referencingModule.url)
																			),
																			specifier,
																			"unlinked"
																		),
																		referencingModule.context,
																		true
																	)
															);
															// node.js 10 needs instantiate
															if (esm.instantiate) esm.instantiate();
															await esm.evaluate();
														}
														if (esmMode === "evaluated") return esm;
														const ns = esm.namespace;
														return ns.default && ns.default instanceof Promise
															? ns.default
															: ns;
													})();
												}

												if (
													options.target === "web" ||
													options.target === "webworker"
												) {
													fn = vm.runInNewContext(
														"(function(require, module, exports, __dirname, __filename, it, WATCH_STEP, STATS_JSON, STATE, expect, window, self) {" +
															`function nsObj(m) { Object.defineProperty(m, Symbol.toStringTag, { value: "Module" }); return m; }${
																content
															}\n})`,
														globalContext,
														p
													);
												} else {
													fn = vm.runInThisContext(
														"(function(require, module, exports, __dirname, __filename, it, WATCH_STEP, STATS_JSON, STATE, expect) {" +
															"global.expect = expect;" +
															`function nsObj(m) { Object.defineProperty(m, Symbol.toStringTag, { value: "Module" }); return m; }${
																content
															}\n})`,
														p
													);
												}
												const m = {
													exports: {}
												};
												fn.call(
													m.exports,
													_require.bind(null, path.dirname(p)),
													m,
													m.exports,
													path.dirname(p),
													p,
													run.it,
													run.name,
													jsonStats,
													state,
													expect,
													globalContext,
													globalContext
												);
												return module.exports;
											} else if (
												testConfig.modules &&
												module in testConfig.modules
											) {
												return testConfig.modules[module];
											}
											return jest.requireActual(module);
										}

										let testConfig = {};
										try {
											// try to load a test file
											testConfig = require(
												path.join(testDirectory, "test.config.js")
											);
										} catch (_err) {
											// empty
										}

										if (testConfig.noTests)
											return process.nextTick(compilationFinished);

										const getBundle = (outputDirectory, module) => {
											if (Array.isArray(module)) {
												return module.map(arg =>
													path.join(outputDirectory, arg)
												);
											} else if (module instanceof RegExp) {
												return fs
													.readdirSync(outputDirectory)
													.filter(f => module.test(f))
													.map(f => path.join(outputDirectory, f));
											}
											return [path.join(outputDirectory, module)];
										};

										const promises = [];
										for (const p of getBundle(
											outputDirectory,
											testConfig.bundlePath || "./bundle.js"
										)) {
											promises.push(
												Promise.resolve().then(() =>
													_require(outputDirectory, p)
												)
											);
										}
										await Promise.all(promises);

										if (run.getNumberOfTests() < 1)
											return compilationFinished(
												new Error("No tests exported by test case")
											);

										run.it(
											"should compile the next step",
											done => {
												runIdx++;
												if (runIdx < runs.length) {
													run = runs[runIdx];
													waitMode = true;
													setTimeout(() => {
														waitMode = false;
														compilationFinished = done;
														currentWatchStepModule.step = run.name;
														copyDiff(
															path.join(testDirectory, run.name),
															tempDirectory,
															false
														);
													}, 1500);
												} else {
													const deprecations = deprecationTracker();
													if (
														checkArrayExpectation(
															testDirectory,
															{ deprecations },
															"deprecation",
															"Deprecation",
															options,
															done
														)
													) {
														compiler.close(() => {});
														return;
													}
													compiler.close(done);
												}
											},
											45000
										);

										compilationFinished();
									}
								);
							}, 300);
						}, 45000);

						for (const run of runs) {
							const { it: _it, getNumberOfTests } = createLazyTestEnv(
								10000,
								run.name
							);
							run.it = _it;
							run.getNumberOfTests = getNumberOfTests;
							it(`${run.name} should allow to read stats`, done => {
								if (run.stats) {
									run.stats.toString({ all: true });
									run.stats = undefined;
								}
								done();
							});
						}

						afterAll(() => {
							remove(tempDirectory);
						});

						const {
							it: _it,
							beforeEach: _beforeEach,
							afterEach: _afterEach
						} = createLazyTestEnv(10000);
					});
				}
			});
		}
	});
};

// eslint-disable-next-line jest/no-export
module.exports.describeCases = describeCases;
