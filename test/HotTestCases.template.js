"use strict";

require("./helpers/warmup-webpack");

const path = require("path");
const fs = require("graceful-fs");
const rimraf = require("rimraf");
const checkArrayExpectation = require("./checkArrayExpectation");
const createLazyTestEnv = require("./helpers/createLazyTestEnv");
const { TestRunner } = require("./runner");

const casesPath = path.join(__dirname, "hotCases");
let categories = fs
	.readdirSync(casesPath)
	.filter(dir => fs.statSync(path.join(casesPath, dir)).isDirectory());
categories = categories.map(cat => ({
	name: cat,
	tests: fs
		.readdirSync(path.join(casesPath, cat))
		.filter(folder => !folder.includes("_"))
}));

const describeCases = config => {
	describe(config.name, () => {
		for (const category of categories) {
			describe(category.name, () => {
				for (const testName of category.tests) {
					const testDirectory = path.join(casesPath, category.name, testName);
					const filterPath = path.join(testDirectory, "test.filter.js");
					if (fs.existsSync(filterPath) && !require(filterPath)(config)) {
						// eslint-disable-next-line jest/no-disabled-tests
						describe.skip(testName, () => {
							it("filtered", () => {});
						});
						continue;
					}
					describe(testName, () => {
						let compiler;
						afterAll(callback => {
							compiler.close(callback);
							compiler = undefined;
						});

						it(`${testName} should compile`, done => {
							const webpack = require("..");
							const outputDirectory = path.join(
								__dirname,
								"js",
								`hot-cases-${config.name}`,
								category.name,
								testName
							);
							rimraf.sync(outputDirectory);
							const recordsPath = path.join(outputDirectory, "records.json");
							const fakeUpdateLoaderOptions = {
								updateIndex: 0
							};
							const configPath = path.join(testDirectory, "webpack.config.js");
							let options = {};
							if (fs.existsSync(configPath)) options = require(configPath);
							if (typeof options === "function") {
								options = options({ config });
							}
							if (!options.mode) options.mode = "development";
							if (!options.devtool) options.devtool = false;
							if (!options.context) options.context = testDirectory;
							if (!options.entry) options.entry = "./index.js";
							if (!options.output) options.output = {};
							if (!options.output.path) options.output.path = outputDirectory;
							if (!options.output.filename)
								options.output.filename = `bundle${
									options.experiments && options.experiments.outputModule
										? ".mjs"
										: ".js"
								}`;
							if (!options.output.chunkFilename)
								options.output.chunkFilename = "[name].chunk.[fullhash].js";
							if (options.output.pathinfo === undefined)
								options.output.pathinfo = true;
							if (options.output.publicPath === undefined)
								options.output.publicPath = "https://test.cases/path/";
							if (options.output.library === undefined)
								options.output.library = { type: "commonjs2" };
							if (!options.optimization) options.optimization = {};
							if (!options.optimization.moduleIds)
								options.optimization.moduleIds = "named";
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
							if (!options.target) options.target = config.target;
							if (!options.plugins) options.plugins = [];
							options.plugins.push(
								new webpack.HotModuleReplacementPlugin(),
								new webpack.LoaderOptionsPlugin(fakeUpdateLoaderOptions)
							);
							if (!options.recordsPath) options.recordsPath = recordsPath;
							let testConfig = {};
							try {
								// try to load a test file
								testConfig = Object.assign(
									testConfig,
									require(path.join(testDirectory, "test.config.js"))
								);
							} catch (_err) {
								// ignored
							}

							const onCompiled = (err, stats) => {
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

								const runner = new TestRunner({
									target: options.target,
									outputDirectory,
									testMeta: {
										category: category.name,
										name: testName,
										env: "jsdom"
									},
									testConfig: {
										...testConfig,
										evaluateScriptOnAttached: true
									},
									webpackOptions: options
								});

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
												`errors${fakeUpdateLoaderOptions.updateIndex}`,
												"Error",
												options,
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
												`warnings${fakeUpdateLoaderOptions.updateIndex}`,
												"Warning",
												options,
												callback
											)
										) {
											return;
										}
										callback(null, jsonStats);
									});
								}

								runner.mergeModuleScope({
									it: _it,
									beforeEach: _beforeEach,
									afterEach: _afterEach,
									STATE: jsonStats,
									NEXT: _next
								});

								let promise = Promise.resolve();
								const info = stats.toJson({ all: false, entrypoints: true });
								if (config.target === "web") {
									for (const file of info.entrypoints.main.assets) {
										if (file.name.endsWith(".css")) {
											const link =
												runner._moduleScope.document.createElement("link");
											link.href = file.name;
											runner._moduleScope.document.head.appendChild(link);
										} else {
											const result = runner.require(
												outputDirectory,
												`./${file.name}`
											);
											if (typeof result === "object" && "then" in result)
												promise = promise.then(() => result);
										}
									}
								} else {
									const assets = info.entrypoints.main.assets;
									const result = runner.require(
										outputDirectory,
										`./${assets[assets.length - 1].name}`
									);
									if (typeof result === "object" && "then" in result)
										promise = promise.then(() => result);
								}
								promise.then(
									() => {
										if (getNumberOfTests() < 1)
											return done(new Error("No tests exported by test case"));

										done();
									},
									err => {
										console.log(err);
										done(err);
									}
								);
							};
							compiler = webpack(options);
							compiler.run(onCompiled);
						}, 20000);

						const {
							it: _it,
							beforeEach: _beforeEach,
							afterEach: _afterEach,
							getNumberOfTests
						} = createLazyTestEnv(20000);
					});
				}
			});
		}
	});
};

// eslint-disable-next-line jest/no-export
module.exports.describeCases = describeCases;
