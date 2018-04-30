/* global describe it beforeAll expect */
"use strict";

const path = require("path");
const fs = require("fs");
const vm = require("vm");
const mkdirp = require("mkdirp");
const UglifyJsPlugin = require("uglifyjs-webpack-plugin");
const checkArrayExpectation = require("./checkArrayExpectation");

const Stats = require("../lib/Stats");
const webpack = require("../lib/webpack");

const uglifyJsForTesting = new UglifyJsPlugin({
	cache: false,
	parallel: false,
	sourceMap: true
});

const DEFAULT_OPTIMIZATIONS = {
	removeAvailableModules: true,
	removeEmptyChunks: true,
	mergeDuplicateChunks: true,
	flagIncludedChunks: true,
	occurrenceOrder: true,
	sideEffects: true,
	providedExports: true,
	usedExports: true,
	noEmitOnErrors: false,
	concatenateModules: false,
	namedModules: false,
	minimizer: [uglifyJsForTesting]
};

const NO_EMIT_ON_ERRORS_OPTIMIZATIONS = {
	noEmitOnErrors: false,
	minimizer: [uglifyJsForTesting]
};

const casesPath = path.join(__dirname, "cases");
let categories = fs.readdirSync(casesPath);
categories = categories.map(cat => {
	return {
		name: cat,
		tests: fs
			.readdirSync(path.join(casesPath, cat))
			.filter(folder => folder.indexOf("_") < 0)
	};
});

const describeCases = config => {
	describe(config.name, () => {
		categories.forEach(category => {
			describe(category.name, function() {
				category.tests
					.filter(test => {
						const testDirectory = path.join(casesPath, category.name, test);
						const filterPath = path.join(testDirectory, "test.filter.js");
						if (fs.existsSync(filterPath) && !require(filterPath)(config)) {
							describe.skip(test, () => it("filtered"));
							return false;
						}
						return true;
					})
					.forEach(testName => {
						describe(testName, () => {
							const testDirectory = path.join(
								casesPath,
								category.name,
								testName
							);
							const outputDirectory = path.join(
								__dirname,
								"js",
								config.name,
								category.name,
								testName
							);
							const options = {
								context: casesPath,
								entry: "./" + category.name + "/" + testName + "/index",
								target: "async-node",
								devtool: config.devtool,
								mode: config.mode || "none",
								optimization: config.mode
									? NO_EMIT_ON_ERRORS_OPTIMIZATIONS
									: Object.assign(
											{},
											config.optimization,
											DEFAULT_OPTIMIZATIONS
									  ),
								performance: {
									hints: false
								},
								output: {
									pathinfo: true,
									path: outputDirectory,
									filename: "bundle.js"
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
									extensions: [
										".mjs",
										".webpack.js",
										".web.js",
										".js",
										".json"
									],
									concord: true
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
											test: /\.jade$/,
											loader: "jade-loader"
										}
									]
								},
								plugins: (config.plugins || []).concat(function() {
									this.hooks.compilation.tap("TestCasesTest", compilation => {
										[
											"optimize",
											"optimizeModulesBasic",
											"optimizeChunksBasic",
											"afterOptimizeTree",
											"afterOptimizeAssets"
										].forEach(hook => {
											compilation.hooks[hook].tap("TestCasesTest", () =>
												compilation.checkConstraints()
											);
										});
									});
								})
							};
							let exportedTests = [];
							it(
								testName + " should compile",
								done => {
									webpack(options, (err, stats) => {
										if (err) done(err);
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
											exportedTests.push({ title, fn, timeout: 10000 });
										}

										function _require(module) {
											if (module.substr(0, 2) === "./") {
												const p = path.join(outputDirectory, module);
												const fn = vm.runInThisContext(
													"(function(require, module, exports, __dirname, it, expect) {" +
														"global.expect = expect;" +
														fs.readFileSync(p, "utf-8") +
														"\n})",
													p
												);
												const m = {
													exports: {},
													webpackTestSuiteModule: true
												};
												fn.call(
													m.exports,
													_require,
													m,
													m.exports,
													outputDirectory,
													_it,
													expect
												);
												return m.exports;
											} else return require(module);
										}
										_require.webpackTestSuiteRequire = true;
										_require("./bundle.js");
										if (exportedTests.length === 0)
											return done(new Error("No tests exported by test case"));

										const asyncSuite = describe("exported tests", () => {
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
								},
								60000
							);
						});
					});
			});
		});
	});
};

module.exports.describeCases = describeCases;
