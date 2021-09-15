"use strict";

require("./helpers/warmup-webpack");
const path = require("path");
const fs = require("graceful-fs");
const vm = require("vm");
const { pathToFileURL, URL } = require("url");
const rimraf = require("rimraf");
const checkArrayExpectation = require("./checkArrayExpectation");
const createLazyTestEnv = require("./helpers/createLazyTestEnv");
const deprecationTracking = require("./helpers/deprecationTracking");
const captureStdio = require("./helpers/captureStdio");
const asModule = require("./helpers/asModule");

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
		let stderr;
		beforeEach(() => {
			stderr = captureStdio(process.stderr, true);
		});
		afterEach(() => {
			stderr.restore();
		});
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
							let testConfig = {};
							const testConfigPath = path.join(testDirectory, "test.config.js");
							if (fs.existsSync(testConfigPath)) {
								testConfig = require(testConfigPath);
							}
							const TerserPlugin = require("terser-webpack-plugin");
							const terserForTesting = new TerserPlugin({
								parallel: false
							});
							let options = {
								context: casesPath,
								entry: "./" + category.name + "/" + testName + "/",
								target: config.target || "async-node",
								devtool: config.devtool,
								mode: config.mode || "none",
								optimization: config.mode
									? {
											emitOnErrors: true,
											minimizer: [terserForTesting],
											...config.optimization
									  }
									: {
											removeAvailableModules: true,
											removeEmptyChunks: true,
											mergeDuplicateChunks: true,
											flagIncludedChunks: true,
											sideEffects: true,
											providedExports: true,
											usedExports: true,
											mangleExports: true,
											emitOnErrors: true,
											concatenateModules: false,
											moduleIds: "size",
											chunkIds: "size",
											minimizer: [terserForTesting],
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
									pathinfo: "verbose",
									path: outputDirectory,
									filename: config.module ? "bundle.mjs" : "bundle.js"
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
									extensions: [".webpack.js", ".web.js", ".js", ".json"]
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
									asyncWebAssembly: true,
									topLevelAwait: true,
									...(config.module ? { outputModule: true } : {})
								}
							};
							const cleanups = [];
							afterAll(() => {
								options = undefined;
								testConfig = undefined;
								for (const fn of cleanups) fn();
							});
							beforeAll(done => {
								rimraf(cacheDirectory, done);
							});
							if (config.cache) {
								it(
									`${testName} should pre-compile to fill disk cache (1st)`,
									done => {
										const oldPath = options.output.path;
										options.output.path = path.join(
											options.output.path,
											"cache1"
										);
										const deprecationTracker = deprecationTracking.start();
										const webpack = require("..");
										webpack(options, err => {
											deprecationTracker();
											options.output.path = oldPath;
											if (err) return done(err);
											done();
										});
									},
									testConfig.timeout || 60000
								);
								it(
									`${testName} should pre-compile to fill disk cache (2nd)`,
									done => {
										const oldPath = options.output.path;
										options.output.path = path.join(
											options.output.path,
											"cache2"
										);
										const deprecationTracker = deprecationTracking.start();
										const webpack = require("..");
										webpack(options, err => {
											deprecationTracker();
											options.output.path = oldPath;
											if (err) return done(err);
											done();
										});
									},
									testConfig.cachedTimeout || testConfig.timeout || 10000
								);
							}
							it(
								testName + " should compile",
								done => {
									const webpack = require("..");
									const compiler = webpack(options);
									const run = () => {
										const deprecationTracker = deprecationTracking.start();
										compiler.run((err, stats) => {
											const deprecations = deprecationTracker();
											if (err) return done(err);
											compiler.close(err => {
												if (err) return done(err);
												const statOptions = {
													preset: "verbose",
													colors: false,
													modules: true,
													reasonsSpace: 1000
												};
												fs.mkdirSync(outputDirectory, { recursive: true });
												fs.writeFileSync(
													path.join(outputDirectory, "stats.txt"),
													stats.toString(statOptions),
													"utf-8"
												);
												const jsonStats = stats.toJson({
													errorDetails: true,
													modules: false,
													assets: false,
													chunks: false
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
												const infrastructureLogging = stderr.toString();
												if (infrastructureLogging) {
													done(
														new Error(
															"Errors/Warnings during build:\n" +
																infrastructureLogging
														)
													);
												}

												expect(deprecations).toEqual(config.deprecations || []);

												Promise.resolve().then(done);
											});
										});
									};
									if (config.cache) {
										// pre-compile to fill memory cache
										const deprecationTracker = deprecationTracking.start();
										compiler.run(err => {
											deprecationTracker();
											if (err) return done(err);
											run();
										});
									} else {
										run();
									}
								},
								testConfig.cachedTimeout ||
									testConfig.timeout ||
									(config.cache ? 20000 : 60000)
							);

							it(
								testName + " should load the compiled tests",
								done => {
									const esmContext = vm.createContext({
										it: _it,
										expect,
										process,
										global,
										URL,
										Buffer,
										setTimeout,
										setImmediate,
										nsObj: function (m) {
											Object.defineProperty(m, Symbol.toStringTag, {
												value: "Module"
											});
											return m;
										}
									});
									cleanups.push(() => (esmContext.it = undefined));
									function _require(module, esmMode) {
										if (module.substr(0, 2) === "./") {
											const p = path.join(outputDirectory, module);
											const content = fs.readFileSync(p, "utf-8");
											if (p.endsWith(".mjs")) {
												let esm;
												try {
													esm = new vm.SourceTextModule(content, {
														identifier: p,
														context: esmContext,
														initializeImportMeta: (meta, module) => {
															meta.url = pathToFileURL(p).href;
														},
														importModuleDynamically: async (
															specifier,
															module
														) => {
															const result = await _require(
																specifier,
																"evaluated"
															);
															return await asModule(result, module.context);
														}
													});
													cleanups.push(() => (esmContext.it = undefined));
												} catch (e) {
													console.log(e);
													e.message += `\nwhile parsing ${p}`;
													throw e;
												}
												if (esmMode === "unlinked") return esm;
												return (async () => {
													await esm.link(async (specifier, module) => {
														return await asModule(
															await _require(specifier, "unlinked"),
															module.context,
															true
														);
													});
													// node.js 10 needs instantiate
													if (esm.instantiate) esm.instantiate();
													await esm.evaluate();
													if (esmMode === "evaluated") return esm;
													const ns = esm.namespace;
													return ns.default && ns.default instanceof Promise
														? ns.default
														: ns;
												})();
											} else {
												const fn = vm.runInThisContext(
													"(function(require, module, exports, __dirname, __filename, it, expect) {" +
														"global.expect = expect;" +
														'function nsObj(m) { Object.defineProperty(m, Symbol.toStringTag, { value: "Module" }); return m; }' +
														content +
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
													p,
													_it,
													expect
												);
												return m.exports;
											}
										} else return require(module);
									}
									_require.webpackTestSuiteRequire = true;
									Promise.resolve()
										.then(() => _require("./" + options.output.filename))
										.then(() => {
											if (getNumberOfTests() === 0)
												return done(
													new Error("No tests exported by test case")
												);
											done();
										}, done);
								},
								10000
							);

							const { it: _it, getNumberOfTests } = createLazyTestEnv(
								testConfig.timeout || 10000
							);
						});
					});
			});
		});
	});
};

exports.describeCases = describeCases;
