/* global describe, it*/
"use strict";

require("should");
const path = require("path");
const fs = require("fs");
const vm = require("vm");
const mkdirp = require("mkdirp");
const Test = require("mocha/lib/test");
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

describe("TestCases", () => {
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
	[
		{
			name: "normal"
		},
		{
			name: "production",
			mode: "production"
		},
		{
			name: "development",
			mode: "development",
			devtool: "none"
		},
		{
			name: "hot",
			plugins: [new webpack.HotModuleReplacementPlugin()]
		},
		{
			name: "hot-multi-step",
			plugins: [
				new webpack.HotModuleReplacementPlugin({
					multiStep: true
				})
			]
		},
		{
			name: "devtool-eval",
			devtool: "eval"
		},
		{
			name: "devtool-eval-named-modules",
			devtool: "eval",
			plugins: [new webpack.NamedModulesPlugin()]
		},
		{
			name: "devtool-eval-source-map",
			devtool: "#eval-source-map"
		},
		{
			name: "devtool-inline-source-map",
			devtool: "inline-source-map"
		},
		{
			name: "devtool-source-map",
			devtool: "#@source-map"
		},
		{
			name: "devtool-cheap-inline-source-map",
			devtool: "cheap-inline-source-map"
		},
		{
			name: "devtool-cheap-eval-source-map",
			devtool: "cheap-eval-source-map"
		},
		{
			name: "devtool-cheap-eval-module-source-map",
			devtool: "cheap-eval-module-source-map"
		},
		{
			name: "devtool-cheap-source-map",
			devtool: "cheap-source-map"
		},
		{
			name: "minimized-source-map",
			mode: "production",
			devtool: "eval-cheap-module-source-map",
			minimize: true
		},
		{
			name: "minimized-hashed-modules",
			mode: "production",
			minimize: true,
			plugins: [new webpack.HashedModuleIdsPlugin()]
		},
		{
			name: "all-combined",
			mode: "production",
			devtool: "#@source-map",
			minimize: true,
			plugins: [
				new webpack.HotModuleReplacementPlugin(),
				new webpack.NamedModulesPlugin(),
				new webpack.NamedChunksPlugin()
			]
		}
	].forEach(config => {
		describe(config.name, () => {
			categories.forEach(category => {
				describe(category.name, function() {
					this.timeout(30000);
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
							const suite = describe(testName, () => {});
							it(testName + " should compile", done => {
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
										mainFields: [
											"webpackLoader",
											"webLoader",
											"loader",
											"main"
										],
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
								webpack(options, (err, stats) => {
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
									let exportedTest = 0;

									function _it(title, fn) {
										const test = new Test(title, fn);
										suite.addTest(test);
										exportedTest++;
										// WORKAROUND for a v8 bug
										// Error objects retrain all scopes in the stacktrace
										test._trace = test._trace.message;

										return test;
									}

									function _require(module) {
										if (module.substr(0, 2) === "./") {
											const p = path.join(outputDirectory, module);
											const fn = vm.runInThisContext(
												"(function(require, module, exports, __dirname, it) {" +
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
												_it
											);
											return m.exports;
										} else return require(module);
									}
									_require.webpackTestSuiteRequire = true;
									_require("./bundle.js");
									if (exportedTest === 0)
										return done(new Error("No tests exported by test case"));
									done();
								});
							});
						});
				});
			});
		});
	});
});
