"use strict";

const path = require("path");
const fs = require("graceful-fs");
const vm = require("vm");
const rimraf = require("rimraf");
const TerserPlugin = require("terser-webpack-plugin");
const checkArrayExpectation = require("./checkArrayExpectation");
const createLazyTestEnv = require("./helpers/createLazyTestEnv");

const webpack = require("..");

const terserForTesting = new TerserPlugin({
	cache: false,
	parallel: false,
	sourceMap: true
});

const DEFAULT_OPTIMIZATIONS = {
	removeAvailableModules: true,
	removeEmptyChunks: true,
	mergeDuplicateChunks: true,
	flagIncludedChunks: true,
	sideEffects: true,
	providedExports: true,
	usedExports: true,
	mangleExports: true,
	noEmitOnErrors: false,
	concatenateModules: false,
	moduleIds: "size",
	chunkIds: "size",
	minimizer: [terserForTesting]
};

const NO_EMIT_ON_ERRORS_OPTIMIZATIONS = {
	noEmitOnErrors: false,
	minimizer: [terserForTesting]
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
			describe(category.name, function () {
				jest.setTimeout(20000);

				category.tests
					.filter(test => {
						const testDirectory = path.join(casesPath, category.name, test);
						const filterPath = path.join(testDirectory, "test.filter.js");
						if (fs.existsSync(filterPath) && !require(filterPath)(config)) {
							describe.skip(test, () => {
								it("filtered", () => {});
							});
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
							const cacheDirectory = path.join(
								__dirname,
								"js/.cache",
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
									: {
											...DEFAULT_OPTIMIZATIONS,
											...config.optimization
									  },
								performance: {
									hints: false
								},
								node: {
									__dirname: "mock",
									__filename: "mock"
								},
								cache: config.cache && {
									cacheDirectory,
									...config.cache
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
									extensions: [".mjs", ".webpack.js", ".web.js", ".js", ".json"]
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
											test: /\.pug/,
											loader: "pug-loader"
										},
										{
											test: /\.wat$/i,
											loader: "wast-loader",
											type: "webassembly/async"
										}
									]
								},
								plugins: (config.plugins || []).concat(function () {
									this.hooks.compilation.tap("TestCasesTest", compilation => {
										[
											"optimize",
											"optimizeModules",
											"optimizeChunks",
											"afterOptimizeTree",
											"afterOptimizeAssets"
										].forEach(hook => {
											compilation.hooks[hook].tap("TestCasesTest", () =>
												compilation.checkConstraints()
											);
										});
									});
								}),
								experiments: {
									mjs: true,
									asyncWebAssembly: true,
									topLevelAwait: true,
									importAwait: true,
									importAsync: true
								}
							};
							beforeAll(done => {
								rimraf(cacheDirectory, done);
							});
							if (config.cache) {
								it(`${testName} should pre-compile to fill disk cache (1st)`, done => {
									const oldPath = options.output.path;
									options.output.path = path.join(
										options.output.path,
										"cache1"
									);
									webpack(options, err => {
										options.output.path = oldPath;
										if (err) return done(err);
										done();
									});
								}, 60000);
								it(`${testName} should pre-compile to fill disk cache (2nd)`, done => {
									const oldPath = options.output.path;
									options.output.path = path.join(
										options.output.path,
										"cache2"
									);
									webpack(options, err => {
										options.output.path = oldPath;
										if (err) return done(err);
										done();
									});
								}, 10000);
							}
							it(
								testName + " should compile",
								done => {
									const compiler = webpack(options);
									const run = () => {
										compiler.run((err, stats) => {
											if (err) return done(err);
											compiler.close(err => {
												if (err) return done(err);
												const statOptions = {
													preset: "verbose",
													colors: false
												};
												fs.mkdirSync(outputDirectory, { recursive: true });
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

												Promise.resolve().then(done);
											});
										});
									};
									if (config.cache) {
										// pre-compile to fill memory cache
										compiler.run(err => {
											if (err) return done(err);
											run();
										});
									} else {
										run();
									}
								},
								config.cache ? 10000 : 60000
							);

							it(
								testName + " should load the compiled tests",
								done => {
									function _require(module) {
										if (module.substr(0, 2) === "./") {
											const p = path.join(outputDirectory, module);
											const fn = vm.runInThisContext(
												"(function(require, module, exports, __dirname, it, expect) {" +
													"global.expect = expect;" +
													'function nsObj(m) { Object.defineProperty(m, Symbol.toStringTag, { value: "Module" }); return m; }' +
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
									if (getNumberOfTests() === 0)
										return done(new Error("No tests exported by test case"));
									done();
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
};

module.exports.describeCases = describeCases;
