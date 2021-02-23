"use strict";

const path = require("path");
const fs = require("graceful-fs");
const vm = require("vm");
const { URL } = require("url");
const rimraf = require("rimraf");
const TerserPlugin = require("terser-webpack-plugin");
const checkArrayExpectation = require("./checkArrayExpectation");
const createLazyTestEnv = require("./helpers/createLazyTestEnv");
const deprecationTracking = require("./helpers/deprecationTracking");
const FakeDocument = require("./helpers/FakeDocument");
const CurrentScript = require("./helpers/CurrentScript");

const prepareOptions = require("./helpers/prepareOptions");
const { parseResource } = require("../lib/util/identifier");
const captureStdio = require("./helpers/captureStdio");

let webpack;

const casesPath = path.join(__dirname, "configCases");
const categories = fs.readdirSync(casesPath).map(cat => {
	return {
		name: cat,
		tests: fs
			.readdirSync(path.join(casesPath, cat))
			.filter(folder => !folder.startsWith("_"))
			.sort()
	};
});

const describeCases = config => {
	describe(config.name, () => {
		let stderr;
		beforeEach(() => {
			stderr = captureStdio(process.stderr, true);
			webpack = require("..");
		});
		afterEach(() => {
			stderr.restore();
		});
		jest.setTimeout(20000);

		for (const category of categories) {
			// eslint-disable-next-line no-loop-func
			describe(category.name, () => {
				for (const testName of category.tests) {
					// eslint-disable-next-line no-loop-func
					describe(testName, function () {
						const testDirectory = path.join(casesPath, category.name, testName);
						const filterPath = path.join(testDirectory, "test.filter.js");
						if (fs.existsSync(filterPath) && !require(filterPath)()) {
							describe.skip(testName, () => {
								it("filtered", () => {});
							});
							return;
						}
						const outBaseDir = path.join(__dirname, "js");
						const testSubPath = path.join(config.name, category.name, testName);
						const outputDirectory = path.join(outBaseDir, testSubPath);
						const cacheDirectory = path.join(outBaseDir, ".cache", testSubPath);
						let options, optionsArr, testConfig;
						beforeAll(() => {
							options = prepareOptions(
								require(path.join(testDirectory, "webpack.config.js")),
								{ testPath: outputDirectory }
							);
							optionsArr = [].concat(options);
							optionsArr.forEach((options, idx) => {
								if (!options.context) options.context = testDirectory;
								if (!options.mode) options.mode = "production";
								if (!options.optimization) options.optimization = {};
								if (options.optimization.minimize === undefined)
									options.optimization.minimize = false;
								if (options.optimization.minimizer === undefined) {
									options.optimization.minimizer = [
										new TerserPlugin({
											parallel: false
										})
									];
								}
								if (!options.entry) options.entry = "./index.js";
								if (!options.target) options.target = "async-node";
								if (!options.output) options.output = {};
								if (!options.output.path) options.output.path = outputDirectory;
								if (typeof options.output.pathinfo === "undefined")
									options.output.pathinfo = true;
								if (!options.output.filename)
									options.output.filename = "bundle" + idx + ".js";
								if (config.cache) {
									options.cache = {
										cacheDirectory,
										name: `config-${idx}`,
										...config.cache
									};
								}
								if (config.snapshot) {
									options.snapshot = {
										...config.snapshot
									};
								}
							});
							testConfig = {
								findBundle: function (i, options) {
									const ext = path.extname(
										parseResource(options.output.filename).path
									);
									if (
										fs.existsSync(
											path.join(options.output.path, "bundle" + i + ext)
										)
									) {
										return "./bundle" + i + ext;
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
							if (testConfig.timeout) setDefaultTimeout(testConfig.timeout);
						});
						beforeAll(() => {
							rimraf.sync(cacheDirectory);
						});
						const handleFatalError = (err, done) => {
							const fakeStats = {
								errors: [
									{
										message: err.message,
										stack: err.stack
									}
								]
							};
							if (
								checkArrayExpectation(
									testDirectory,
									fakeStats,
									"error",
									"Error",
									done
								)
							) {
								return;
							}
							// Wait for uncaught errors to occur
							setTimeout(done, 200);
							return;
						};
						if (config.cache) {
							it(`${testName} should pre-compile to fill disk cache (1st)`, done => {
								rimraf.sync(outputDirectory);
								fs.mkdirSync(outputDirectory, { recursive: true });
								const deprecationTracker = deprecationTracking.start();
								webpack(options, err => {
									deprecationTracker();
									if (err) return handleFatalError(err, done);
									done();
								});
							}, 60000);
							it(`${testName} should pre-compile to fill disk cache (2nd)`, done => {
								rimraf.sync(outputDirectory);
								fs.mkdirSync(outputDirectory, { recursive: true });
								const deprecationTracker = deprecationTracking.start();
								webpack(options, (err, stats) => {
									deprecationTracker();
									if (err) return handleFatalError(err, done);
									const { modules, children, errorsCount } = stats.toJson({
										all: false,
										modules: true,
										errorsCount: true
									});
									if (errorsCount === 0) {
										const allModules = children
											? children.reduce(
													(all, { modules }) => all.concat(modules),
													modules || []
											  )
											: modules;
										if (
											allModules.some(
												m => m.type !== "cached modules" && !m.cached
											)
										) {
											return done(
												new Error(
													`Some modules were not cached:\n${stats.toString({
														all: false,
														modules: true,
														modulesSpace: 100
													})}`
												)
											);
										}
									}
									done();
								});
							}, 20000);
						}
						it(`${testName} should compile`, done => {
							rimraf.sync(outputDirectory);
							fs.mkdirSync(outputDirectory, { recursive: true });
							const deprecationTracker = deprecationTracking.start();
							webpack(options, (err, stats) => {
								const deprecations = deprecationTracker();
								if (err) return handleFatalError(err, done);
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
								fs.writeFileSync(
									path.join(outputDirectory, "stats.json"),
									JSON.stringify(jsonStats, null, 2),
									"utf-8"
								);
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
											"Errors/Warnings during build:\n" + infrastructureLogging
										)
									);
								}
								if (
									checkArrayExpectation(
										testDirectory,
										{ deprecations },
										"deprecation",
										"Deprecation",
										done
									)
								) {
									return;
								}

								let filesCount = 0;

								if (testConfig.noTests) return process.nextTick(done);
								if (testConfig.beforeExecute) testConfig.beforeExecute();
								const results = [];
								for (let i = 0; i < optionsArr.length; i++) {
									const bundlePath = testConfig.findBundle(i, optionsArr[i]);
									if (bundlePath) {
										filesCount++;
										const document = new FakeDocument();
										const globalContext = {
											console: console,
											expect: expect,
											setTimeout: setTimeout,
											clearTimeout: clearTimeout,
											document,
											location: {
												href: "https://test.cases/path/index.html",
												origin: "https://test.cases",
												toString() {
													return "https://test.cases/path/index.html";
												}
											}
										};

										const requireCache = Object.create(null);
										// eslint-disable-next-line no-loop-func
										const _require = (currentDirectory, options, module) => {
											if (Array.isArray(module) || /^\.\.?\//.test(module)) {
												let content;
												let p;
												let subPath = "";
												if (Array.isArray(module)) {
													p = path.join(currentDirectory, ".array-require.js");
													content = `module.exports = (${module
														.map(arg => {
															return `require(${JSON.stringify(`./${arg}`)})`;
														})
														.join(", ")});`;
												} else {
													p = path.join(currentDirectory, module);
													content = fs.readFileSync(p, "utf-8");
													const lastSlash = module.lastIndexOf("/");
													let firstSlash = module.indexOf("/");

													if (lastSlash !== -1 && firstSlash !== lastSlash) {
														if (firstSlash !== -1) {
															let next = module.indexOf("/", firstSlash + 1);
															let dir = module.slice(firstSlash + 1, next);

															while (dir === ".") {
																firstSlash = next;
																next = module.indexOf("/", firstSlash + 1);
																dir = module.slice(firstSlash + 1, next);
															}
														}

														subPath = module.slice(
															firstSlash + 1,
															lastSlash + 1
														);
													}
												}
												if (p in requireCache) {
													return requireCache[p].exports;
												}
												const m = {
													exports: {}
												};
												requireCache[p] = m;
												let runInNewContext = false;
												let oldCurrentScript = document.currentScript;
												document.currentScript = new CurrentScript(subPath);

												const moduleScope = {
													require: _require.bind(
														null,
														path.dirname(p),
														options
													),
													importScripts: url => {
														_require(path.dirname(p), options, `./${url}`);
													},
													module: m,
													exports: m.exports,
													__dirname: path.dirname(p),
													__filename: p,
													it: _it,
													beforeEach: _beforeEach,
													afterEach: _afterEach,
													expect,
													jest,
													_globalAssign: { expect },
													__STATS__: jsonStats,
													nsObj: m => {
														Object.defineProperty(m, Symbol.toStringTag, {
															value: "Module"
														});
														return m;
													}
												};
												if (
													options.target === "web" ||
													options.target === "webworker"
												) {
													moduleScope.window = globalContext;
													moduleScope.self = globalContext;
													moduleScope.URL = URL;
													moduleScope.Worker = require("./helpers/createFakeWorker")(
														{ outputDirectory }
													);
													runInNewContext = true;
												}
												if (testConfig.moduleScope) {
													testConfig.moduleScope(moduleScope);
												}
												const args = Object.keys(moduleScope);
												const argValues = args.map(arg => moduleScope[arg]);
												if (!runInNewContext)
													content = `Object.assign(global, _globalAssign); ${content}`;
												const code = `(function(${args.join(
													", "
												)}) {${content}\n})`;
												const fn = runInNewContext
													? vm.runInNewContext(code, globalContext, p)
													: vm.runInThisContext(code, p);
												fn.call(m.exports, ...argValues);

												//restore state
												document.currentScript = oldCurrentScript;

												return m.exports;
											} else if (
												testConfig.modules &&
												module in testConfig.modules
											) {
												return testConfig.modules[module];
											} else return require(module);
										};

										results.push(
											_require(outputDirectory, optionsArr[i], bundlePath)
										);
									}
								}
								// give a free pass to compilation that generated an error
								if (
									!jsonStats.errors.length &&
									filesCount !== optionsArr.length
								) {
									return done(
										new Error(
											"Should have found at least one bundle file per webpack config"
										)
									);
								}
								Promise.all(results)
									.then(() => {
										if (testConfig.afterExecute) testConfig.afterExecute();
										if (getNumberOfTests() < filesCount) {
											return done(new Error("No tests exported by test case"));
										}
										done();
									})
									.catch(done);
							});
						});

						const {
							it: _it,
							beforeEach: _beforeEach,
							afterEach: _afterEach,
							setDefaultTimeout,
							getNumberOfTests
						} = createLazyTestEnv(jasmine.getEnv(), 10000);
					});
				}
			});
		}
	});
};

exports.describeCases = describeCases;
