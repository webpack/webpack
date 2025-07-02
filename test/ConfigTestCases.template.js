"use strict";

require("./helpers/warmup-webpack");

/** @typedef {Record<string, EXPECTED_ANY>} Env */
/** @typedef {{ testPath: string } TestOptions */

const path = require("path");
const fs = require("graceful-fs");
const rimraf = require("rimraf");
const checkArrayExpectation = require("./checkArrayExpectation");
const createLazyTestEnv = require("./helpers/createLazyTestEnv");
const deprecationTracking = require("./helpers/deprecationTracking");
const prepareOptions = require("./helpers/prepareOptions");
const { parseResource } = require("../lib/util/identifier");
const captureStdio = require("./helpers/captureStdio");
const filterInfraStructureErrors = require("./helpers/infrastructureLogErrors");
const { TestRunner } = require("./runner");

const casesPath = path.join(__dirname, "configCases");
const categories = fs.readdirSync(casesPath).map(cat => ({
	name: cat,
	tests: fs
		.readdirSync(path.join(casesPath, cat))
		.filter(folder => !folder.startsWith("_"))
		.sort()
}));

const createLogger = appendTarget => ({
	log: l => appendTarget.push(l),
	debug: l => appendTarget.push(l),
	trace: l => appendTarget.push(l),
	info: l => appendTarget.push(l),
	warn: console.warn.bind(console),
	error: console.error.bind(console),
	logTime: () => {},
	group: () => {},
	groupCollapsed: () => {},
	groupEnd: () => {},
	profile: () => {},
	profileEnd: () => {},
	clear: () => {},
	status: () => {}
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

		jest.setTimeout(20000);

		for (const category of categories) {
			// eslint-disable-next-line no-loop-func
			describe(category.name, () => {
				for (const testName of category.tests) {
					// eslint-disable-next-line no-loop-func
					describe(testName, () => {
						const testDirectory = path.join(casesPath, category.name, testName);
						const filterPath = path.join(testDirectory, "test.filter.js");
						if (fs.existsSync(filterPath) && !require(filterPath)(config)) {
							// eslint-disable-next-line jest/no-disabled-tests
							describe.skip(testName, () => {
								it("filtered", () => {});
							});

							return;
						}
						const infraStructureLog = [];
						const outBaseDir = path.join(__dirname, "js");
						const testSubPath = path.join(config.name, category.name, testName);
						const outputDirectory = path.join(outBaseDir, testSubPath);
						const cacheDirectory = path.join(outBaseDir, ".cache", testSubPath);
						let options;
						let optionsArr;
						let testConfig;

						beforeAll(() => {
							options = prepareOptions(
								require(path.join(testDirectory, "webpack.config.js")),
								{ testPath: outputDirectory }
							);
							optionsArr = [].concat(options);
							for (const [idx, options] of optionsArr.entries()) {
								if (!options.context) options.context = testDirectory;
								if (!options.mode) options.mode = "production";
								if (!options.optimization) options.optimization = {};
								if (options.optimization.minimize === undefined) {
									options.optimization.minimize = false;
								}
								if (options.optimization.minimizer === undefined) {
									options.optimization.minimizer = [
										new (require("terser-webpack-plugin"))({
											parallel: false
										})
									];
								}
								if (!options.entry) options.entry = "./index.js";
								if (!options.target) options.target = "async-node";
								if (!options.output) options.output = {};
								if (!options.output.path) options.output.path = outputDirectory;
								if (typeof options.output.pathinfo === "undefined") {
									options.output.pathinfo = true;
								}
								if (!options.output.filename) {
									options.output.filename = `bundle${idx}${
										options.experiments && options.experiments.outputModule
											? ".mjs"
											: ".js"
									}`;
								}
								if (config.cache) {
									options.cache = {
										cacheDirectory,
										name:
											options.cache && options.cache !== true
												? options.cache.name
												: `config-${idx}`,
										...config.cache
									};
								}
								if (config.cache) {
									options.infrastructureLogging = {
										debug: true,
										console: createLogger(infraStructureLog)
									};
								}
								if (!options.snapshot) options.snapshot = {};
								if (!options.snapshot.managedPaths) {
									options.snapshot.managedPaths = [
										path.resolve(__dirname, "../node_modules")
									];
								}
							}
							testConfig = {
								findBundle(i, options) {
									const ext = path.extname(
										parseResource(options.output.filename).path
									);
									if (
										fs.existsSync(
											path.join(options.output.path, `bundle${i}${ext}`)
										)
									) {
										return `./bundle${i}${ext}`;
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
							} catch (_err) {
								// ignored
							}
							if (testConfig.timeout) setDefaultTimeout(testConfig.timeout);
						});

						// eslint-disable-next-line jest/no-duplicate-hooks
						beforeAll(() => {
							rimraf.sync(cacheDirectory);
						});

						afterAll(() => {
							// cleanup
							options = undefined;
							optionsArr = undefined;
							testConfig = undefined;
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
									options,
									done
								)
							) {
								return;
							}
							// Wait for uncaught errors to occur
							setTimeout(done, 200);
						};
						if (config.cache) {
							it(`${testName} should pre-compile to fill disk cache (1st)`, done => {
								rimraf.sync(outputDirectory);
								fs.mkdirSync(outputDirectory, { recursive: true });
								infraStructureLog.length = 0;
								const deprecationTracker = deprecationTracking.start();

								const compiler = require("..")(options);

								compiler.run(err => {
									deprecationTracker();
									if (err) return handleFatalError(err, done);
									const infrastructureLogging = stderr.toString();
									if (infrastructureLogging) {
										return done(
											new Error(
												`Errors/Warnings during build:\n${
													infrastructureLogging
												}`
											)
										);
									}
									const infrastructureLogErrors = filterInfraStructureErrors(
										infraStructureLog,
										{
											run: 1,
											options
										}
									);
									if (
										infrastructureLogErrors.length &&
										checkArrayExpectation(
											testDirectory,
											{ infrastructureLogs: infrastructureLogErrors },
											"infrastructureLog",
											"infrastructure-log",
											"InfrastructureLog",
											options,
											done
										)
									) {
										return;
									}
									compiler.close(closeErr => {
										if (closeErr) return handleFatalError(closeErr, done);
										done();
									});
								});
							}, 60000);

							it(`${testName} should pre-compile to fill disk cache (2nd)`, done => {
								rimraf.sync(outputDirectory);
								fs.mkdirSync(outputDirectory, { recursive: true });
								infraStructureLog.length = 0;
								const deprecationTracker = deprecationTracking.start();

								const compiler = require("..")(options);

								compiler.run((err, stats) => {
									deprecationTracker();
									if (err) return handleFatalError(err, done);
									const { modules, children, errorsCount } = stats.toJson({
										all: false,
										modules: true,
										errorsCount: true
									});
									if (errorsCount === 0) {
										const infrastructureLogging = stderr.toString();
										if (infrastructureLogging) {
											return done(
												new Error(
													`Errors/Warnings during build:\n${
														infrastructureLogging
													}`
												)
											);
										}
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
									const infrastructureLogErrors = filterInfraStructureErrors(
										infraStructureLog,
										{
											run: 2,
											options
										}
									);
									if (
										infrastructureLogErrors.length &&
										checkArrayExpectation(
											testDirectory,
											{ infrastructureLogs: infrastructureLogErrors },
											"infrastructureLog",
											"infrastructure-log",
											"InfrastructureLog",
											options,
											done
										)
									) {
										return;
									}
									compiler.close(closeErr => {
										if (closeErr) return handleFatalError(closeErr, done);
										done();
									});
								});
							}, 40000);
						}

						it(`${testName} should compile`, done => {
							rimraf.sync(outputDirectory);
							fs.mkdirSync(outputDirectory, { recursive: true });
							infraStructureLog.length = 0;
							const deprecationTracker = deprecationTracking.start();
							const onCompiled = (err, stats) => {
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
									"utf8"
								);
								const jsonStats = stats.toJson({
									errorDetails: true
								});
								fs.writeFileSync(
									path.join(outputDirectory, "stats.json"),
									JSON.stringify(jsonStats, null, 2),
									"utf8"
								);
								if (
									checkArrayExpectation(
										testDirectory,
										jsonStats,
										"error",
										"Error",
										options,
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
										options,
										done
									)
								) {
									return;
								}
								const infrastructureLogging = stderr.toString();
								if (infrastructureLogging) {
									return done(
										new Error(
											`Errors/Warnings during build:\n${infrastructureLogging}`
										)
									);
								}
								if (
									checkArrayExpectation(
										testDirectory,
										{ deprecations },
										"deprecation",
										"Deprecation",
										options,
										done
									)
								) {
									return;
								}
								const infrastructureLogErrors = filterInfraStructureErrors(
									infraStructureLog,
									{
										run: 3,
										options
									}
								);
								if (
									infrastructureLogErrors.length &&
									checkArrayExpectation(
										testDirectory,
										{ infrastructureLogs: infrastructureLogErrors },
										"infrastructureLog",
										"infrastructure-log",
										"InfrastructureLog",
										options,
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
									const options = optionsArr[i];
									const bundlePath = testConfig.findBundle(i, optionsArr[i]);
									if (bundlePath) {
										filesCount++;
										const runner = new TestRunner({
											target: options.target,
											outputDirectory,
											testMeta: {
												category: category.name,
												name: testName,
												round: i
											},
											testConfig,
											webpackOptions: options
										});
										runner.mergeModuleScope({
											it: _it,
											beforeEach: _beforeEach,
											afterEach: _afterEach,
											__STATS__: jsonStats,
											__STATS_I__: i
										});
										if (testConfig.moduleScope) {
											testConfig.moduleScope(runner._moduleScope, options);
										}
										if (Array.isArray(bundlePath)) {
											for (const bundlePathItem of bundlePath) {
												results.push(
													runner.require(outputDirectory, `./${bundlePathItem}`)
												);
											}
										} else {
											results.push(runner.require(outputDirectory, bundlePath));
										}
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
										if (testConfig.afterExecute) {
											testConfig.afterExecute(options);
										}
										for (const key of Object.keys(global)) {
											if (key.includes("webpack")) delete global[key];
										}
										if (getNumberOfTests() < filesCount) {
											return done(new Error("No tests exported by test case"));
										}
										done();
									})
									.catch(done);
							};
							if (config.cache) {
								try {
									const compiler = require("..")(options);

									compiler.run(err => {
										if (err) return handleFatalError(err, done);
										compiler.run((error, stats) => {
											compiler.close(err => {
												if (err) return handleFatalError(err, done);
												onCompiled(error, stats);
											});
										});
									});
								} catch (err) {
									handleFatalError(err, done);
								}
							} else {
								require("..")(options, onCompiled);
							}
						}, 30000);

						const {
							it: _it,
							beforeEach: _beforeEach,
							afterEach: _afterEach,
							setDefaultTimeout,
							getNumberOfTests
						} = createLazyTestEnv(10000);
					});
				}
			});
		}
	});
};

// eslint-disable-next-line jest/no-export
module.exports.describeCases = describeCases;
