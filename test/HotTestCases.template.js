"use strict";

require("./helpers/warmup-webpack");

const path = require("path");
const fs = require("graceful-fs");
const vm = require("vm");
const rimraf = require("rimraf");
const checkArrayExpectation = require("./checkArrayExpectation");
const createLazyTestEnv = require("./helpers/createLazyTestEnv");
const FakeDocument = require("./helpers/FakeDocument");

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
								options.output.filename = "bundle.js";
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

								const urlToPath = url => {
									if (url.startsWith("https://test.cases/path/"))
										url = url.slice(24);
									return path.resolve(outputDirectory, `./${url}`);
								};
								const urlToRelativePath = url => {
									if (url.startsWith("https://test.cases/path/"))
										url = url.slice(24);
									return `./${url}`;
								};
								const window = {
									_elements: [],
									fetch: async url => {
										try {
											const buffer = await new Promise((resolve, reject) => {
												fs.readFile(urlToPath(url), (err, b) =>
													err ? reject(err) : resolve(b)
												);
											});
											return {
												status: 200,
												ok: true,
												json: async () => JSON.parse(buffer.toString("utf-8"))
											};
										} catch (err) {
											if (err.code === "ENOENT") {
												return {
													status: 404,
													ok: false
												};
											}
											throw err;
										}
									},
									importScripts: url => {
										expect(url).toMatch(/^https:\/\/test\.cases\/path\//);
										_require(urlToRelativePath(url));
									},
									document: {
										createElement(type) {
											const ele = {
												_type: type,
												getAttribute(name) {
													return this[name];
												},
												setAttribute(name, value) {
													this[name] = value;
												},
												removeAttribute(name) {
													delete this[name];
												},
												parentNode: {
													removeChild(node) {
														window._elements = window._elements.filter(
															item => item !== node
														);
													}
												}
											};
											ele.sheet =
												type === "link"
													? new FakeDocument.FakeSheet(ele, outputDirectory)
													: {};
											return ele;
										},
										head: {
											appendChild(element) {
												window._elements.push(element);

												if (element._type === "script") {
													// run it
													Promise.resolve().then(() => {
														_require(urlToRelativePath(element.src));
													});
												} else if (element._type === "link") {
													Promise.resolve().then(() => {
														if (element.onload) {
															// run it
															element.onload({ type: "load" });
														}
													});
												}
											},
											insertBefore(element, before) {
												window._elements.push(element);

												if (element._type === "script") {
													// run it
													Promise.resolve().then(() => {
														_require(urlToRelativePath(element.src));
													});
												} else if (element._type === "link") {
													// run it
													Promise.resolve().then(() => {
														element.onload({ type: "load" });
													});
												}
											}
										},
										getElementsByTagName(name) {
											if (name === "head") return [this.head];
											if (name === "script" || name === "link") {
												return window._elements.filter(
													item => item._type === name
												);
											}

											throw new Error("Not supported");
										}
									},
									Worker: require("./helpers/createFakeWorker")({
										outputDirectory
									}),
									EventSource: require("./helpers/EventSourceForNode"),
									location: {
										href: "https://test.cases/path/index.html",
										origin: "https://test.cases",
										toString() {
											return "https://test.cases/path/index.html";
										}
									}
								};

								const moduleScope = {
									window
								};

								if (testConfig.moduleScope) {
									testConfig.moduleScope(moduleScope, options);
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

								/**
								 * @private
								 * @param {string} module module
								 * @returns {EXPECTED_ANY} required module
								 */
								function _require(module) {
									if (module.startsWith("./")) {
										const p = path.join(outputDirectory, module);
										if (module.endsWith(".css")) {
											return fs.readFileSync(p, "utf-8");
										}
										if (module.endsWith(".json")) {
											return JSON.parse(fs.readFileSync(p, "utf-8"));
										}
										const fn = vm.runInThisContext(
											"(function(require, module, exports, __dirname, __filename, it, beforeEach, afterEach, expect, jest, self, window, fetch, document, importScripts, Worker, EventSource, NEXT, STATS) {" +
												"global.expect = expect;" +
												`function nsObj(m) { Object.defineProperty(m, Symbol.toStringTag, { value: "Module" }); return m; }${fs.readFileSync(
													p,
													"utf-8"
												)}\n})`,
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
											_beforeEach,
											_afterEach,
											expect,
											jest,
											window,
											window,
											window.fetch,
											window.document,
											window.importScripts,
											window.Worker,
											window.EventSource,
											_next,
											jsonStats
										);
										return m.exports;
									}
									return require(module);
								}
								let promise = Promise.resolve();
								const info = stats.toJson({ all: false, entrypoints: true });
								if (config.target === "web") {
									for (const file of info.entrypoints.main.assets) {
										if (file.name.endsWith(".css")) {
											const link = window.document.createElement("link");
											link.href = path.join(outputDirectory, file.name);
											window.document.head.appendChild(link);
										} else {
											_require(`./${file.name}`);
										}
									}
								} else {
									const assets = info.entrypoints.main.assets;
									const result = _require(
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
