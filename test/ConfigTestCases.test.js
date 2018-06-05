"use strict";

/* globals describe expect it beforeAll */
const path = require("path");
const fs = require("fs");
const vm = require("vm");
const mkdirp = require("mkdirp");
const rimraf = require("rimraf");
const checkArrayExpectation = require("./checkArrayExpectation");
const FakeDocument = require("./helpers/FakeDocument");

const Stats = require("../lib/Stats");
const webpack = require("../lib/webpack");
const prepareOptions = require("./helpers/prepareOptions");

describe("ConfigTestCases", () => {
	const casesPath = path.join(__dirname, "configCases");
	let categories = fs.readdirSync(casesPath);

	jest.setTimeout(10000);

	categories = categories.map(cat => {
		return {
			name: cat,
			tests: fs
				.readdirSync(path.join(casesPath, cat))
				.filter(folder => {
					return folder.indexOf("_") < 0;
				})
				.sort()
				.filter(testName => {
					const testDirectory = path.join(casesPath, cat, testName);
					const filterPath = path.join(testDirectory, "test.filter.js");
					if (fs.existsSync(filterPath) && !require(filterPath)()) {
						describe.skip(testName, () => it("filtered"));
						return false;
					}
					return true;
				})
		};
	});
	categories.forEach(category => {
		describe(category.name, () => {
			category.tests.forEach(testName => {
				describe(testName, function() {
					const testDirectory = path.join(casesPath, category.name, testName);
					const outputDirectory = path.join(
						__dirname,
						"js",
						"config",
						category.name,
						testName
					);
					const exportedTests = [];
					const exportedBeforeEach = [];
					const exportedAfterEach = [];
					it(
						testName + " should compile",
						() =>
							new Promise((resolve, reject) => {
								const done = err => {
									if (err) return reject(err);
									resolve();
								};
								rimraf.sync(outputDirectory);
								mkdirp.sync(outputDirectory);
								const options = prepareOptions(
									require(path.join(testDirectory, "webpack.config.js")),
									{ testPath: outputDirectory }
								);
								const optionsArr = [].concat(options);
								optionsArr.forEach((options, idx) => {
									if (!options.context) options.context = testDirectory;
									if (!options.mode) options.mode = "production";
									if (!options.optimization) options.optimization = {};
									if (options.optimization.minimize === undefined)
										options.optimization.minimize = false;
									if (!options.entry) options.entry = "./index.js";
									if (!options.target) options.target = "async-node";
									if (!options.output) options.output = {};
									if (!options.output.path)
										options.output.path = outputDirectory;
									if (typeof options.output.pathinfo === "undefined")
										options.output.pathinfo = true;
									if (!options.output.filename)
										options.output.filename = "bundle" + idx + ".js";
								});
								let testConfig = {
									findBundle: function(i, options) {
										if (
											fs.existsSync(
												path.join(options.output.path, "bundle" + i + ".js")
											)
										) {
											return "./bundle" + i + ".js";
										}
									},
									timeout: 30000
								};
								try {
									// try to load a test file
									testConfig = Object.assign(
										testConfig,
										require(path.join(testDirectory, "test.config.js"))
									);
								} catch (e) {
									// ignored
								}

								webpack(options, (err, stats) => {
									if (err) {
										const fakeStats = {
											errors: [err.stack]
										};
										if (
											checkArrayExpectation(
												testDirectory,
												fakeStats,
												"error",
												"Error",
												done
											)
										)
											return;
										// Wait for uncaught errors to occur
										return setTimeout(done, 200);
									}
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
											testDirectory,
											jsonStats,
											"error",
											"Error",
											done
										)
									)
										return;
									if (
										checkArrayExpectation(
											testDirectory,
											jsonStats,
											"warning",
											"Warning",
											done
										)
									)
										return;

									function _it(title, fn) {
										exportedTests.push({
											title,
											fn,
											timeout: testConfig.timeout
										});
									}

									function _beforeEach(fn) {
										return exportedBeforeEach.push(fn);
									}

									function _afterEach(fn) {
										return exportedAfterEach.push(fn);
									}

									const globalContext = {
										console: console,
										expect: expect,
										setTimeout: setTimeout,
										clearTimeout: clearTimeout,
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
													"(function(require, module, exports, __dirname, __filename, it, beforeEach, afterEach, expect, jest, window) {" +
														content +
														"\n})",
													globalContext,
													p
												);
											} else {
												fn = vm.runInThisContext(
													"(function(require, module, exports, __dirname, __filename, it, beforeEach, afterEach, expect, jest) {" +
														"global.expect = expect; " +
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
												_beforeEach,
												_afterEach,
												expect,
												jest,
												globalContext
											);
											return m.exports;
										} else if (
											testConfig.modules &&
											module in testConfig.modules
										) {
											return testConfig.modules[module];
										} else return require(module);
									}
									let filesCount = 0;

									if (testConfig.noTests) return process.nextTick(done);
									for (let i = 0; i < optionsArr.length; i++) {
										const bundlePath = testConfig.findBundle(i, optionsArr[i]);
										if (bundlePath) {
											filesCount++;
											_require(outputDirectory, bundlePath);
										}
									}
									// give a free pass to compilation that generated an error
									if (
										!jsonStats.errors.length &&
										filesCount !== optionsArr.length
									)
										return done(
											new Error(
												"Should have found at least one bundle file per webpack config"
											)
										);
									if (exportedTests.length < filesCount)
										return done(new Error("No tests exported by test case"));
									if (testConfig.afterExecute) testConfig.afterExecute();
									const asyncSuite = describe(`ConfigTestCases ${
										category.name
									} ${testName} exported tests`, () => {
										exportedBeforeEach.forEach(beforeEach);
										exportedAfterEach.forEach(afterEach);
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
										.then(done, done);
								});
							})
					);
				});
			});
		});
	});
});
