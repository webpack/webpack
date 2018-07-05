/* global beforeAll expect fit */
"use strict";

const path = require("path");
const fs = require("fs");
const vm = require("vm");
const mkdirp = require("mkdirp");
const rimraf = require("rimraf");
const checkArrayExpectation = require("./checkArrayExpectation");
const { remove } = require("./helpers/remove");

const Stats = require("../lib/Stats");
const webpack = require("../lib/webpack");

function copyDiff(src, dest, initial) {
	if (!fs.existsSync(dest)) fs.mkdirSync(dest);
	const files = fs.readdirSync(src);
	files.forEach(filename => {
		const srcFile = path.join(src, filename);
		const destFile = path.join(dest, filename);
		const directory = fs.statSync(srcFile).isDirectory();
		if (directory) {
			copyDiff(srcFile, destFile, initial);
		} else {
			var content = fs.readFileSync(srcFile);
			if (/^DELETE\s*$/.test(content.toString("utf-8"))) {
				fs.unlinkSync(destFile);
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
	});
}

describe("WatchTestCases", () => {
	if (process.env.NO_WATCH_TESTS) {
		it.skip("long running tests excluded", () => {});
		return;
	}

	const casesPath = path.join(__dirname, "watchCases");
	let categories = fs.readdirSync(casesPath);

	categories = categories.map(cat => {
		return {
			name: cat,
			tests: fs
				.readdirSync(path.join(casesPath, cat))
				.filter(folder => folder.indexOf("_") < 0)
				.filter(testName => {
					const testDirectory = path.join(casesPath, cat, testName);
					const filterPath = path.join(testDirectory, "test.filter.js");
					if (fs.existsSync(filterPath) && !require(filterPath)()) {
						describe.skip(testName, () => it("filtered"));
						return false;
					}
					return true;
				})
				.sort()
		};
	});
	beforeAll(() => {
		let dest = path.join(__dirname, "js");
		if (!fs.existsSync(dest)) fs.mkdirSync(dest);
		dest = path.join(__dirname, "js", "watch-src");
		if (!fs.existsSync(dest)) fs.mkdirSync(dest);
	});
	categories.forEach(category => {
		beforeAll(() => {
			const dest = path.join(__dirname, "js", "watch-src", category.name);
			if (!fs.existsSync(dest)) fs.mkdirSync(dest);
		});
		describe(category.name, () => {
			category.tests.forEach(testName => {
				describe(testName, () => {
					const tempDirectory = path.join(
						__dirname,
						"js",
						"watch-src",
						category.name,
						testName
					);
					const testDirectory = path.join(casesPath, category.name, testName);
					const runs = fs
						.readdirSync(testDirectory)
						.sort()
						.filter(name => {
							return fs.statSync(path.join(testDirectory, name)).isDirectory();
						})
						.map(name => ({ name }));

					beforeAll(done => {
						rimraf(tempDirectory, done);
					});

					it(
						testName + " should compile",
						done => {
							const outputDirectory = path.join(
								__dirname,
								"js",
								"watch",
								category.name,
								testName
							);

							let options = {};
							const configPath = path.join(testDirectory, "webpack.config.js");
							if (fs.existsSync(configPath)) options = require(configPath);
							const applyConfig = options => {
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
							};
							if (Array.isArray(options)) {
								options.forEach(applyConfig);
							} else {
								applyConfig(options);
							}

							const state = {};
							let runIdx = 0;
							let waitMode = false;
							let run = runs[runIdx];
							let triggeringFilename;
							let lastHash = "";
							const currentWatchStepModule = require("./helpers/currentWatchStep");
							currentWatchStepModule.step = run.name;
							copyDiff(path.join(testDirectory, run.name), tempDirectory, true);

							setTimeout(() => {
								const compiler = webpack(options);
								compiler.hooks.invalid.tap(
									"WatchTestCasesTest",
									(filename, mtime) => {
										triggeringFilename = filename;
									}
								);
								const watching = compiler.watch(
									{
										aggregateTimeout: 1000
									},
									(err, stats) => {
										if (err) return done(err);
										if (!stats)
											return done(new Error("No stats reported from Compiler"));
										if (stats.hash === lastHash) return;
										lastHash = stats.hash;
										if (run.done && lastHash !== stats.hash) {
											return done(
												new Error(
													"Compilation changed but no change was issued " +
														lastHash +
														" != " +
														stats.hash +
														" (run " +
														runIdx +
														")\n" +
														"Triggering change: " +
														triggeringFilename
												)
											);
										}
										if (waitMode) return;
										run.done = true;
										if (err) return done(err);
										const statOptions = Stats.presetToOptions("verbose");
										statOptions.colors = false;
										mkdirp.sync(outputDirectory);
										fs.writeFileSync(
											path.join(outputDirectory, "stats.txt"),
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
												done
											)
										)
											return;
										if (
											checkArrayExpectation(
												path.join(testDirectory, run.name),
												jsonStats,
												"warning",
												"Warning",
												done
											)
										)
											return;

										const exportedTests = [];

										function _it(title, fn) {
											exportedTests.push({ title, fn, timeout: 45000 });
										}

										const globalContext = {
											console: console,
											expect: expect
										};

										function _require(currentDirectory, module) {
											if (Array.isArray(module) || /^\.\.?\//.test(module)) {
												let fn;
												let content;
												let p;
												if (Array.isArray(module)) {
													p = path.join(currentDirectory, module[0]);
													content = module
														.map(arg => {
															p = path.join(currentDirectory, arg);
															return fs.readFileSync(p, "utf-8");
														})
														.join("\n");
												} else {
													p = path.join(currentDirectory, module);
													content = fs.readFileSync(p, "utf-8");
												}
												if (
													options.target === "web" ||
													options.target === "webworker"
												) {
													fn = vm.runInNewContext(
														"(function(require, module, exports, __dirname, __filename, it, WATCH_STEP, STATS_JSON, STATE, expect, window) {" +
															content +
															"\n})",
														globalContext,
														p
													);
												} else {
													fn = vm.runInThisContext(
														"(function(require, module, exports, __dirname, __filename, it, WATCH_STEP, STATS_JSON, STATE, expect) {" +
															"global.expect = expect;" +
															content +
															"\n})",
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
													_it,
													run.name,
													jsonStats,
													state,
													expect,
													globalContext
												);
												return module.exports;
											} else if (
												testConfig.modules &&
												module in testConfig.modules
											) {
												return testConfig.modules[module];
											} else return require.requireActual(module);
										}

										let testConfig = {};
										try {
											// try to load a test file
											testConfig = require(path.join(
												testDirectory,
												"test.config.js"
											));
										} catch (e) {
											// empty
										}

										if (testConfig.noTests) return process.nextTick(done);
										_require(
											outputDirectory,
											testConfig.bundlePath || "./bundle.js"
										);

										if (exportedTests.length < 1)
											return done(new Error("No tests exported by test case"));

										const continueStep = () => {
											runIdx++;
											if (runIdx < runs.length) {
												run = runs[runIdx];
												waitMode = true;
												setTimeout(() => {
													waitMode = false;
													currentWatchStepModule.step = run.name;
													copyDiff(
														path.join(testDirectory, run.name),
														tempDirectory,
														false
													);
												}, 1500);
											} else {
												watching.close();

												done();
											}
										};

										// Run the tests
										const asyncSuite = describe(`WatchTestCases ${
											category.name
										} ${testName} step ${run.name}`, () => {
											exportedTests.forEach(
												({ title, fn, timeout }) =>
													fn
														? fit(title, fn, timeout)
														: fit(title, () => {}).pend("Skipped")
											);
										});
										// workaround for jest running clearSpies on the wrong suite (invoked by clearResourcesForRunnable)
										asyncSuite.disabled = true;

										jasmine
											.getEnv()
											.execute([asyncSuite.id], asyncSuite)
											.then(continueStep, done);
									}
								);
							}, 300);
						},
						45000
					);

					afterAll(() => {
						remove(tempDirectory);
					});
				});
			});
		});
	});
});
