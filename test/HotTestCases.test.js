"use strict";

/* globals expect */
const path = require("path");
const fs = require("fs");
const vm = require("vm");
const checkArrayExpectation = require("./checkArrayExpectation");
const createLazyTestEnv = require("./helpers/createLazyTestEnv");

const webpack = require("../lib/webpack");

describe("HotTestCases", () => {
	const casesPath = path.join(__dirname, "hotCases");
	let categories = fs
		.readdirSync(casesPath)
		.filter(dir => fs.statSync(path.join(casesPath, dir)).isDirectory());
	categories = categories.map(cat => {
		return {
			name: cat,
			tests: fs
				.readdirSync(path.join(casesPath, cat))
				.filter(folder => folder.indexOf("_") < 0)
		};
	});
	categories.forEach(category => {
		describe(category.name, () => {
			category.tests.forEach(testName => {
				describe(testName, () => {
					it(
						testName + " should compile",
						done => {
							const testDirectory = path.join(
								casesPath,
								category.name,
								testName
							);
							const outputDirectory = path.join(
								__dirname,
								"js",
								"hot-cases",
								category.name,
								testName
							);
							const recordsPath = path.join(outputDirectory, "records.json");
							if (fs.existsSync(recordsPath)) fs.unlinkSync(recordsPath);
							const fakeUpdateLoaderOptions = {
								updateIndex: 0
							};
							const configPath = path.join(testDirectory, "webpack.config.js");
							let options = {};
							if (fs.existsSync(configPath)) options = require(configPath);
							if (!options.mode) options.mode = "development";
							if (!options.devtool) options.devtool = false;
							if (!options.context) options.context = testDirectory;
							if (!options.entry) options.entry = "./index.js";
							if (!options.output) options.output = {};
							if (!options.output.path) options.output.path = outputDirectory;
							if (!options.output.filename)
								options.output.filename = "bundle.js";
							if (options.output.pathinfo === undefined)
								options.output.pathinfo = true;
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
							if (!options.target) options.target = "async-node";
							if (!options.plugins) options.plugins = [];
							options.plugins.push(
								new webpack.HotModuleReplacementPlugin(),
								new webpack.NamedModulesPlugin(),
								new webpack.LoaderOptionsPlugin(fakeUpdateLoaderOptions)
							);
							if (!options.recordsPath) options.recordsPath = recordsPath;
							const compiler = webpack(options);
							compiler.run((err, stats) => {
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
										done
									)
								) {
									return;
								}

								function _next(callback) {
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
												"errors" + fakeUpdateLoaderOptions.updateIndex,
												"Error",
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
												"warnings" + fakeUpdateLoaderOptions.updateIndex,
												"Warning",
												callback
											)
										) {
											return;
										}
										callback(null, jsonStats);
									});
								}

								function _require(module) {
									if (module.substr(0, 2) === "./") {
										const p = path.join(outputDirectory, module);
										const fn = vm.runInThisContext(
											"(function(require, module, exports, __dirname, __filename, it, expect, NEXT, STATS) {" +
												"global.expect = expect;" +
												'function nsObj(m) { Object.defineProperty(m, Symbol.toStringTag, { value: "Module" }); return m; }' +
												fs.readFileSync(p, "utf-8") +
												"\n})",
											p
										);
										const m = {
											exports: {}
										};
										fn.call(
											m.exports,
											_require,
											m,
											m.exports,
											outputDirectory,
											p,
											_it,
											expect,
											_next,
											jsonStats
										);
										return m.exports;
									} else return require(module);
								}
								_require("./bundle.js");
								if (getNumberOfTests() < 1)
									return done(new Error("No tests exported by test case"));

								done();
							});
						},
						10000
					);

					const { it: _it, getNumberOfTests } = createLazyTestEnv(
						jasmine.getEnv(),
						10000
					);
				});
			});
		});
	});
});
