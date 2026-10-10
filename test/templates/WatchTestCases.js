"use strict";

require("../helpers/warmup-webpack");

/** @typedef {Record<string, EXPECTED_ANY>} Env */
/** @typedef {{ testPath: string, srcPath: string }} TestOptions */
/**
 * @typedef {object} SuiteConfig
 * @property {string} name suite name
 * @property {EXPECTED_ANY=} experiments experiments overrides
 * @property {EXPECTED_ANY=} optimization optimization overrides
 */
/**
 * @typedef {object} WatchTestConfig
 * @property {((i: EXPECTED_ANY, options: EXPECTED_ANY) => string)=} findBundle
 * @property {boolean=} noTests
 * @property {boolean=} restartCompiler close the compiler after each step and start a new one
 * @property {boolean=} strictWatchDependencies require identical dependency sets for history-independent fixtures
 * @property {((error: Error, compiler: import("../../").Compiler | import("../../").MultiCompiler) => void | Promise<void>)=} watchError check a watch or comparison error and request recovery on the same compiler
 * @property {string=} skipFreshAssetContent reason asset contents depend on build history
 * @property {string=} skipFreshWarnings reason warnings depend on build history
 * @property {string=} skipFreshCompilation reason an independent compilation cannot reproduce this case
 */

const path = require("path");
const fs = require("graceful-fs");
/** @type {{ sync: (p: string) => void, (p: string, cb: (err: EXPECTED_ANY) => void): void }} */
const rimraf = require("rimraf");
const { parseResource } = require("../../lib/util/identifier");
const { TestRunner } = require("../harness/runner");
const assertModuleGraph = require("../helpers/assertModuleGraph");
const checkArrayExpectation = require("../helpers/checkArrayExpectation");
const compareWatchCompilation = require("../helpers/compareWatchCompilation");
const createLazyTestEnv = require("../helpers/createLazyTestEnv");
const deprecationTracking = require("../helpers/deprecationTracking");
const loadWatchConfig = require("../helpers/loadWatchConfig");
const prepareOptions = require("../helpers/prepareOptions");
const { remove } = require("../helpers/remove");
const supportsObjectHasOwn = require("../helpers/supportsObjectHasOwn");
const supportsOptionalChaining = require("../helpers/supportsOptionalChaining");

const testRootDirectory = path.join(__dirname, "..");
const STEP_DELAY = 200;
const AGGREGATE_TIMEOUT = 50;
const RETOUCH_DELAY = 1000;
const RETOUCH_LIMIT = 3;

/**
 * @param {string} src src
 * @param {string} dest dest
 * @param {boolean} initial is initial?
 * @param {Set<string>=} changed collects the files written or deleted
 */
function copyDiff(src, dest, initial, changed) {
	if (!fs.existsSync(dest)) fs.mkdirSync(dest);
	const files = fs.readdirSync(src);
	for (const filename of files) {
		const srcFile = path.join(src, filename);
		const destFile = path.join(dest, filename);
		const directory = fs.statSync(srcFile).isDirectory();
		if (directory) {
			copyDiff(srcFile, destFile, initial, changed);
		} else {
			const content = fs.readFileSync(srcFile);
			if (changed) changed.add(destFile);
			if (/^DELETE\s*$/.test(content.toString("utf8"))) {
				fs.unlinkSync(destFile);
			} else if (/^DELETE_DIRECTORY\s*$/.test(content.toString("utf8"))) {
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

/**
 * @param {string} file file
 * @param {Iterable<string>} paths files or directories
 * @returns {boolean} true when the file is one of the paths or inside one
 */
function isWithin(file, paths) {
	for (const item of paths) {
		if (file === item || file.startsWith(item + path.sep)) return true;
	}
	return false;
}

/**
 * @param {SuiteConfig} config suite config
 */
const describeCases = (config) => {
	describe(config.name, () => {
		beforeAll(() => {
			// other suites' workers create test/js at the same time
			fs.mkdirSync(path.join(testRootDirectory, "js", `${config.name}-src`), {
				recursive: true
			});
		});

		if (process.env.NO_WATCH_TESTS) {
			// eslint-disable-next-line jest/no-disabled-tests
			it.skip("long running tests excluded", () => {});

			return;
		}

		const casesPath = path.join(testRootDirectory, "watchCases");
		const categories = fs.readdirSync(casesPath).map((cat) => ({
			name: cat,
			tests: fs
				.readdirSync(path.join(casesPath, cat))
				.filter((folder) => !folder.includes("_"))
				.filter((testName) => {
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

		for (const category of categories) {
			// eslint-disable-next-line jest/prefer-hooks-on-top, jest/no-duplicate-hooks
			beforeAll(() => {
				const dest = path.join(
					testRootDirectory,
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
							testRootDirectory,
							"js",
							`${config.name}-src`,
							category.name,
							testName
						);
						const testDirectory = path.join(casesPath, category.name, testName);
						/** @type {import("../../").Compiler | import("../../").MultiCompiler | undefined} */
						let watchedCompiler;
						/** @type {Promise<Error | null | undefined> | undefined} */
						let closing;
						/** @type {ReturnType<typeof setTimeout> | undefined} */
						let timer;
						/** @type {ReturnType<typeof setTimeout> | undefined} */
						let retouchTimer;
						/** @type {ReturnType<typeof deprecationTracking.start> | undefined} */
						let deprecationTracker;
						let failed = false;
						/** @type {Error | undefined} */
						let pendingError;
						/** @returns {Promise<Error | null | undefined>} compiler close result */
						const closeCompiler = () => {
							clearTimeout(timer);
							clearTimeout(retouchTimer);
							if (!closing) {
								closing = new Promise((resolve) => {
									if (watchedCompiler) watchedCompiler.close(resolve);
									else resolve(undefined);
								});
							}
							return closing;
						};
						/** @type {{ name: string, done?: boolean, stats?: import("../../").Stats, it?: EXPECTED_ANY, getNumberOfTests?: () => number }[]} */
						const runs = fs
							.readdirSync(testDirectory)
							.sort()
							.filter((name) =>
								fs.statSync(path.join(testDirectory, name)).isDirectory()
							)
							.map((name) => ({ name }));

						beforeAll((done) => {
							rimraf(tempDirectory, done);
						});

						afterEach(async () => {
							const currentTest = global.JEST_STATE_SYMBOL.currentlyRunningTest;
							if (currentTest && currentTest.errors.length > 0) failed = true;
							if (failed) await closeCompiler();
							if (pendingError) {
								const error = pendingError;
								pendingError = undefined;
								throw error;
							}
						});

						it(`${testName} should compile`, (done) => {
							const outputDirectory = path.join(
								testRootDirectory,
								"js",
								config.name,
								category.name,
								testName
							);

							const freshOutputDirectory = path.join(
								testRootDirectory,
								"js",
								`${config.name}-fresh`,
								category.name,
								testName
							);

							rimraf.sync(outputDirectory);
							rimraf.sync(freshOutputDirectory);

							let options = {};
							const configPath = path.join(testDirectory, "webpack.config.js");
							if (fs.existsSync(configPath)) {
								options = prepareOptions(require(configPath), {
									testPath: outputDirectory,
									srcPath: tempDirectory
								});
							}
							const applyConfig = (
								/** @type {import("../../").Configuration} */ options,
								/** @type {number} */ idx
							) => {
								if (!options.mode) options.mode = "development";
								if (!options.context) options.context = tempDirectory;
								if (!options.entry) options.entry = "./index.js";
								if (!options.target) options.target = "async-node";
								if (!options.output) options.output = {};
								if (!options.output.environment) {
									options.output.environment = {};
								}
								if (
									options.output.environment.optionalChaining === undefined &&
									!supportsOptionalChaining()
								) {
									// generated runtime runs in this Node.js process; avoid `?.` on Node < 14
									options.output.environment.optionalChaining = false;
								}
								if (
									options.output.environment.hasOwn === undefined &&
									!supportsObjectHasOwn()
								) {
									// generated runtime runs in this Node.js process; avoid `Object.hasOwn` on Node < 16.9
									options.output.environment.hasOwn = false;
								}
								if (options.output.clean === undefined) {
									options.output.clean = true;
								}
								if (!options.output.path) options.output.path = outputDirectory;
								if (typeof options.output.pathinfo === "undefined") {
									options.output.pathinfo = true;
								}
								if (!options.output.filename) {
									options.output.filename = `bundle${
										options.output.module ? ".mjs" : ".js"
									}`;
								}
								if (
									options.cache &&
									/** @type {import("../../").FileCacheOptions} */ (
										options.cache
									).type === "filesystem"
								) {
									const cacheDirectory = path.join(tempDirectory, ".cache");
									/** @type {import("../../").FileCacheOptions} */ (
										options.cache
									).cacheDirectory = cacheDirectory;
									/** @type {import("../../").FileCacheOptions} */ (
										options.cache
									).name = `config-${idx}`;
								}
								if (config.experiments) {
									if (!options.experiments) options.experiments = {};
									for (const key of Object.keys(config.experiments)) {
										if (
											/** @type {EXPECTED_ANY} */ (options.experiments)[key] ===
											undefined
										) {
											/** @type {EXPECTED_ANY} */ (options.experiments)[key] =
												config.experiments[key];
										}
									}
								}
								if (config.optimization) {
									if (!options.optimization) options.optimization = {};
									for (const key of Object.keys(config.optimization)) {
										if (
											/** @type {EXPECTED_ANY} */ (options.optimization)[
												key
											] === undefined
										) {
											/** @type {EXPECTED_ANY} */ (options.optimization)[key] =
												config.optimization[key];
										}
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
							/** @returns {Promise<import("../../").Configuration[]>} independent configurations */
							const createFreshOptions = async () => {
								const freshOptions = fs.existsSync(configPath)
									? await prepareOptions(loadWatchConfig(configPath), {
											testPath: outputDirectory,
											srcPath: tempDirectory
										})
									: {};
								const configurations = Array.isArray(freshOptions)
									? freshOptions
									: [freshOptions];
								for (const [index, options] of configurations.entries()) {
									applyConfig(options, index);
								}
								return configurations;
							};

							const testConfigPath = path.join(testDirectory, "test.config.js");
							// A fresh compiler per step reads the cache back from disk
							const restartCompiler = Boolean(
								fs.existsSync(testConfigPath) &&
									require(testConfigPath).restartCompiler
							);
							const state = {};
							let runIdx = 0;
							let waitMode = false;
							let run = runs[runIdx];
							/** @type {string | null | undefined} */
							let triggeringFilename;
							let lastHash = "";
							/** @type {Set<string>} */
							let lastFileDependencies = new Set();
							/** @type {string[]} */
							let lastContextDependencies = [];
							/** @type {Set<string>} */
							let lastMissingDependencies = new Set();
							// watched files the current step changed which no build has reported yet
							/** @type {Set<string>} */
							const unseenChanges = new Set();

							const currentWatchStepModule = require("../helpers/currentWatchStep");

							/** @type {((err?: Error | null) => void) | undefined} */
							let compilationFinished = done;
							/**
							 * @param {Error | null=} error compilation failure
							 * @returns {void}
							 */
							const finish = (error) => {
								const callback = compilationFinished;
								compilationFinished = undefined;
								if (callback) callback(error);
							};
							/**
							 * @param {Error} error original failure
							 * @returns {Promise<void>} cleanup before reporting the failure
							 */
							const fail = async (error) => {
								if (failed) return;
								failed = true;
								pendingError = error;
								await closeCompiler();
								if (compilationFinished) {
									pendingError = undefined;
									finish(error);
								}
							};
							/** @type {{ step: string | undefined }} */ (
								currentWatchStepModule
							).step = run.name;
							copyDiff(path.join(testDirectory, run.name), tempDirectory, true);

							/** @type {WatchTestConfig} */
							let testConfig = {
								findBundle(_, options) {
									const ext = path.extname(
										parseResource(options.output.filename).path
									);
									return `./bundle${ext}`;
								}
							};
							try {
								// try to load a test file
								testConfig = Object.assign(
									testConfig,
									require(path.join(testDirectory, "test.config.js"))
								);
							} catch (_err) {
								// empty
							}

							/**
							 * Gives the watcher a new mtime for each change no build reported while idle.
							 * @param {import("../../").Compiler[]} compilers watched compilers
							 * @param {number} retries re-touches left before the step fails
							 */
							const retouchUnseenChanges = (compilers, retries) => {
								retouchTimer = setTimeout(() => {
									if (failed || unseenChanges.size === 0) return;
									// a build still running reports the changes when it ends
									if (
										compilers.some(
											(child) => child.watching && child.watching.running
										)
									) {
										return retouchUnseenChanges(compilers, retries);
									}
									if (retries === 0) {
										return fail(
											new Error(
												`No build reported the change to ${[...unseenChanges].join(", ")}`
											)
										);
									}
									// macOS can drop a change event entirely
									const now = new Date();
									for (const file of unseenChanges) {
										if (fs.existsSync(file)) fs.utimesSync(file, now, now);
									}
									retouchUnseenChanges(compilers, retries - 1);
								}, RETOUCH_DELAY);
							};

							const startCompiler = () => {
								try {
									if (!deprecationTracker) {
										deprecationTracker = deprecationTracking.start();
									}

									const webpack = require("../..");

									const compiler = webpack(options);
									watchedCompiler = compiler;
									const compare = compareWatchCompilation(
										compiler,
										createFreshOptions,
										freshOutputDirectory,
										testConfig
									);
									const compilers =
										compiler instanceof webpack.MultiCompiler
											? compiler.compilers
											: [compiler];
									for (const child of compilers) {
										// Count changes consumed by builds invalidated before their callback.
										child.hooks.watchRun.tap("WatchTestCasesTest", () => {
											// a watched directory reports itself, not the file inside it
											const reported = [
												...(child.modifiedFiles || []),
												...(child.removedFiles || [])
											];
											for (const file of unseenChanges) {
												if (
													isWithin(file, reported) ||
													reported.some((item) => isWithin(item, [file]))
												) {
													unseenChanges.delete(file);
												}
											}
										});
										child.hooks.finishMake.tap(
											{ name: "WatchTestCasesTest", stage: Infinity },
											assertModuleGraph
										);
									}
									/**
									 * @param {Error} error watch or comparison failure
									 * @returns {Promise<void>} error handling and optional recovery
									 */
									const handleWatchError = async (error) => {
										try {
											if (!testConfig.watchError) throw error;
											await testConfig.watchError(error, compiler);
										} catch (error) {
											await fail(/** @type {Error} */ (error));
										}
									};
									compiler.hooks.invalid.tap(
										"WatchTestCasesTest",
										(filename, _mtime) => {
											triggeringFilename = filename;
										}
									);
									compiler.watch(
										{
											aggregateTimeout: AGGREGATE_TIMEOUT
										},
										async (err, stats) => {
											try {
												if (failed) return;
												if (err) return handleWatchError(err);
												if (!stats) {
													throw new Error("No stats reported from Compiler");
												}
												if (waitMode) return;
												lastFileDependencies = new Set();
												lastContextDependencies = [];
												lastMissingDependencies = new Set();
												for (const { compilation } of /** @type {import("../../").Stats[]} */ (
													"stats" in stats ? stats.stats : [stats]
												)) {
													// a missing directory is watched for existence, not content
													for (const file of compilation.fileDependencies) {
														lastFileDependencies.add(file);
													}
													for (const file of compilation.missingDependencies) {
														lastFileDependencies.add(file);
														lastMissingDependencies.add(file);
													}
													lastContextDependencies.push(
														...compilation.contextDependencies
													);
												}
												// A rebuild can stop watching an orphan before its removal is reported.
												for (const file of unseenChanges) {
													if (
														!lastFileDependencies.has(file) &&
														!isWithin(file, lastContextDependencies)
													) {
														unseenChanges.delete(file);
													}
												}
												if (unseenChanges.size > 0) return;
												clearTimeout(retouchTimer);
												if (run.done && stats.hash === lastHash) return;
												if (run.done && lastHash !== stats.hash) {
													throw new Error(
														`Compilation changed but no change was issued ${lastHash} != ${stats.hash} (run ${runIdx})\n` +
															`Triggering change: ${triggeringFilename}`
													);
												}
												lastHash = stats.hash;
												run.done = true;
												try {
													await compare(stats);
												} catch (error) {
													run.done = false;
													return handleWatchError(/** @type {Error} */ (error));
												}
												if (failed) return;
												run.stats = stats;
												const statOptions = {
													preset: "verbose",
													cached: true,
													cachedAssets: true,
													cachedModules: true,
													colors: false
												};
												fs.mkdirSync(outputDirectory, { recursive: true });
												// verbose stats cost as much as the build; WEBPACK_TEST_STATS=1 writes them
												if (process.env.WEBPACK_TEST_STATS) {
													fs.writeFileSync(
														path.join(
															outputDirectory,
															`stats.${runs[runIdx] && runs[runIdx].name}.txt`
														),
														stats.toString(statOptions),
														"utf8"
													);
												}
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
														fail
													)
												) {
													return;
												}
												if (
													checkArrayExpectation(
														path.join(testDirectory, run.name),
														jsonStats,
														"warning",
														"Warning",
														options,
														fail
													)
												) {
													return;
												}

												if (testConfig.noTests) {
													return process.nextTick(finish);
												}
												const { results } = TestRunner.runBundles({
													optionsArr: Array.isArray(options)
														? options
														: [options],
													outputDirectory,
													testConfig: {
														...testConfig,
														evaluateScriptOnAttached: true
													},
													category,
													testName,
													setupRunner: ({ runner, index }) => {
														runner.mergeModuleScope({
															it: run.it,
															beforeEach: _beforeEach,
															afterEach: _afterEach,
															STATS_JSON: jsonStats,
															FRESH_OUTPUT_DIRECTORY: path.join(
																freshOutputDirectory,
																String(index)
															),
															STATE: state,
															WATCH_STEP: run.name
														});
													},
													getBundlePaths: (i, options) =>
														/** @type {NonNullable<WatchTestConfig["findBundle"]>} */ (
															testConfig.findBundle
														)(i, options)
												});
												await Promise.all(results);
												if (failed) return;

												if (
													/** @type {() => number} */ (run.getNumberOfTests)() <
													1
												) {
													throw new Error("No tests exported by test case");
												}

												/** @type {EXPECTED_ANY} */ (run.it)(
													"should compile the next step",
													(
														/** @type {(err?: Error | null) => void} */ done
													) => {
														if (failed) return done();
														compilationFinished = done;
														runIdx++;
														if (runIdx < runs.length) {
															run = runs[runIdx];
															waitMode = true;
															timer = setTimeout(async () => {
																try {
																	if (restartCompiler) {
																		// closing stores the pack, so the next compiler
																		// restores every unchanged module from disk
																		const error = await closeCompiler();
																		if (error) throw error;
																		closing = undefined;
																	}
																	waitMode = false;
																	/** @type {{ step: string | undefined }} */ (
																		currentWatchStepModule
																	).step = run.name;
																	/** @type {Set<string>} */
																	const changed = new Set();
																	copyDiff(
																		path.join(testDirectory, run.name),
																		tempDirectory,
																		false,
																		changed
																	);
																	unseenChanges.clear();
																	if (!restartCompiler && watchedCompiler) {
																		// only a file the last build watched reports its change
																		for (const file of changed) {
																			if (
																				lastFileDependencies.has(file) ||
																				isWithin(file, lastContextDependencies)
																			) {
																				unseenChanges.add(file);
																				continue;
																			}
																			// a file created in a missing directory reports that directory
																			let directory = path.dirname(file);
																			while (
																				!lastMissingDependencies.has(directory) &&
																				path.dirname(directory) !== directory
																			) {
																				directory = path.dirname(directory);
																			}
																			if (lastMissingDependencies.has(directory)) {
																				unseenChanges.add(directory);
																			}
																		}
																		// WatchIgnorePlugin marks what no build will report, and a managed
																		// or immutable path reports its package, not the file changed in it
																		const children =
																			"compilers" in watchedCompiler
																				? watchedCompiler.compilers
																				: [watchedCompiler];
																		for (const child of children) {
																			for (const file of unseenChanges) {
																				// even a managed path reports a directory appearing
																				if (lastMissingDependencies.has(file)) continue;
																				for (const item of [
																					...child.managedPaths,
																					...child.immutablePaths
																				]) {
																					if (
																						typeof item === "string"
																							? isWithin(file, [path.resolve(item)])
																							: item.test(file)
																					) {
																						unseenChanges.delete(file);
																					}
																				}
																			}
																			const watcher =
																				child.watching && child.watching.watcher;
																			if (!watcher || !watcher.getInfo) continue;
																			const info = watcher.getInfo();
																			/** @type {string[]} */
																			const ignored = [];
																			for (const [item, entry] of [
																				...info.fileTimeInfoEntries,
																				...info.contextTimeInfoEntries
																			]) {
																				if (entry === "ignore") ignored.push(item);
																			}
																			for (const file of unseenChanges) {
																				if (isWithin(file, ignored)) unseenChanges.delete(file);
																			}
																		}
																		if (unseenChanges.size > 0) {
																			retouchUnseenChanges(children, RETOUCH_LIMIT);
																		}
																	}
																	if (restartCompiler) startCompiler();
																} catch (error) {
																	fail(/** @type {Error} */ (error));
																}
															}, STEP_DELAY);
														} else {
															const deprecations =
																/** @type {NonNullable<typeof deprecationTracker>} */ (
																	deprecationTracker
																)();
															if (
																checkArrayExpectation(
																	testDirectory,
																	{ deprecations },
																	"deprecation",
																	"Deprecation",
																	options,
																	fail
																)
															) {
																return;
															}
															closeCompiler().then(finish);
														}
													},
													45000
												);

												finish();
											} catch (error) {
												await fail(/** @type {Error} */ (error));
											}
										}
									);
								} catch (error) {
									fail(/** @type {Error} */ (error));
								}
							};
							timer = setTimeout(startCompiler, 300);
						}, 45000);

						for (const run of runs) {
							const { it: _it, getNumberOfTests } = createLazyTestEnv(
								10000,
								run.name
							);
							run.it = _it;
							run.getNumberOfTests = getNumberOfTests;

							it(`${run.name} should allow to read stats`, (done) => {
								if (run.stats) {
									run.stats.toString({ all: true });
									run.stats = undefined;
								}
								done();
							});
						}

						// eslint-disable-next-line jest/prefer-hooks-on-top
						afterAll(async () => {
							const error = await closeCompiler();
							watchedCompiler = undefined;
							if (deprecationTracker) deprecationTracker();
							remove(tempDirectory);
							if (error && !failed) throw error;
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
