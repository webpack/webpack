"use strict";

const path = require("path");
const fs = require("graceful-fs");
const vm = require("vm");
const rimraf = require("rimraf");
const checkArrayExpectation = require("./checkArrayExpectation");
const createLazyTestEnv = require("./helpers/createLazyTestEnv");
const { remove } = require("./helpers/remove");
const prepareOptions = require("./helpers/prepareOptions");
const deprecationTracking = require("./helpers/deprecationTracking");
const FakeDocument = require("./helpers/FakeDocument");

const webpack = require("..");

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

							rimraf.sync(outputDirectory);

							let options = {};
							const configPath = path.join(testDirectory, "webpack.config.js");
							if (fs.existsSync(configPath)) {
								options = prepareOptions(require(configPath), {
									testPath: outputDirectory,
									srcPath: tempDirectory
								});
							}
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
							let compilationFinished = done;
							currentWatchStepModule.step = run.name;
							copyDiff(path.join(testDirectory, run.name), tempDirectory, true);

							setTimeout(() => {
								const deprecationTracker = deprecationTracking.start();
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
										if (err) return compilationFinished(err);
										if (!stats)
											return compilationFinished(
												new Error("No stats reported from Compiler")
											);
										if (stats.hash === lastHash) return;
										lastHash = stats.hash;
										if (run.done && lastHash !== stats.hash) {
											return compilationFinished(
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
												compilationFinished
											)
										)
											return;

										const globalContext = {
											console: console,
											expect: expect,
											setTimeout,
											clearTimeout,
											document: new FakeDocument()
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
														"(function(require, module, exports, __dirname, __filename, it, WATCH_STEP, STATS_JSON, STATE, expect, window, self) {" +
															'function nsObj(m) { Object.defineProperty(m, Symbol.toStringTag, { value: "Module" }); return m; }' +
															content +
															"\n})",
														globalContext,
														p
													);
												} else {
													fn = vm.runInThisContext(
														"(function(require, module, exports, __dirname, __filename, it, WATCH_STEP, STATS_JSON, STATE, expect) {" +
															"global.expect = expect;" +
															'function nsObj(m) { Object.defineProperty(m, Symbol.toStringTag, { value: "Module" }); return m; }' +
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
											} else return jest.requireActual(module);
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

										if (testConfig.noTests)
											return process.nextTick(compilationFinished);
										_require(
											outputDirectory,
											testConfig.bundlePath || "./bundle.js"
										);

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
															done
														)
													) {
														watching.close();
														return;
													}
													watching.close(done);
												}
											},
											45000
										);

										compilationFinished();
									}
								);
							}, 300);
						},
						45000
					);

					for (const run of runs) {
						const { it: _it, getNumberOfTests } = createLazyTestEnv(
							jasmine.getEnv(),
							10000,
							run.name
						);
						run.it = _it;
						run.getNumberOfTests = getNumberOfTests;
					}

					afterAll(() => {
						remove(tempDirectory);
					});
				});
			});
		});
	});
});
