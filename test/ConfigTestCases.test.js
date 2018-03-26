"use strict";

/* globals describe it */
require("should");
const path = require("path");
const fs = require("fs");
const vm = require("vm");
const mkdirp = require("mkdirp");
const Test = require("mocha/lib/test");
const checkArrayExpectation = require("./checkArrayExpectation");

const Stats = require("../lib/Stats");
const webpack = require("../lib/webpack");
const prepareOptions = require("../lib/prepareOptions");

describe("ConfigTestCases", () => {
	const casesPath = path.join(__dirname, "configCases");
	let categories = fs.readdirSync(casesPath);

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
				const suite = describe(testName, () => {});
				it(testName + " should compile", function(done) {
					const testDirectory = path.join(casesPath, category.name, testName);
					const outputDirectory = path.join(
						__dirname,
						"js",
						"config",
						category.name,
						testName
					);
					const options = prepareOptions(
						require(path.join(testDirectory, "webpack.config.js"))
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
						if (!options.output.path) options.output.path = outputDirectory;
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
					} catch (e) {} // eslint-disable-line no-empty

					this.timeout(testConfig.timeout);

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
						let exportedTests = 0;

						function _it(title, fn) {
							const test = new Test(title, fn);
							suite.addTest(test);
							exportedTests++;
							return test;
						}

						const globalContext = {
							console: console
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
										"(function(require, module, exports, __dirname, __filename, it, window) {" +
											content +
											"\n})",
										globalContext,
										p
									);
								} else {
									fn = vm.runInThisContext(
										"(function(require, module, exports, __dirname, __filename, it) {" +
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
									globalContext
								);
								return m.exports;
							} else if (testConfig.modules && module in testConfig.modules) {
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
						if (!jsonStats.errors.length && filesCount !== optionsArr.length)
							return done(
								new Error(
									"Should have found at least one bundle file per webpack config"
								)
							);
						if (exportedTests < filesCount)
							return done(new Error("No tests exported by test case"));
						if (testConfig.afterExecute) testConfig.afterExecute();
						process.nextTick(done);
					});
				});
			});
		});
	});
});
