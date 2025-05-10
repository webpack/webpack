"use strict";

require("./helpers/warmup-webpack");

const path = require("path");
const fs = require("graceful-fs");
const vm = require("vm");
const rimraf = require("rimraf");
const checkArrayExpectation = require("./checkArrayExpectation");
const createLazyTestEnv = require("./helpers/createLazyTestEnv");
const FakeDocument = require("./helpers/FakeDocument");
const { pathToFileURL, fileURLToPath } = require("url");
const asModule = require("./helpers/asModule");

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

								const baseModuleScope = {
									console,
									it: _it,
									beforeEach: _beforeEach,
									afterEach: _afterEach,
									expect,
									jest,
									__STATS__: jsonStats,
									nsObj: m => {
										Object.defineProperty(m, Symbol.toStringTag, {
											value: "Module"
										});
										return m;
									},
									window
								};

								if (testConfig.moduleScope) {
									testConfig.moduleScope(baseModuleScope, options);
								}

								const esmCache = new Map();
								const esmIdentifier = `${category.name}-${testName}`;
								const esmContext = vm.createContext(baseModuleScope, {
									name: "context for esm"
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

								/**
								 * @private
								 * @param {string} module module
								 * @param {string} esmMode "evaluated" | "unlinked"
								 * @returns {EXPECTED_ANY} required module
								 */
								function _require(module, esmMode) {
									if (module.startsWith("./")) {
										const p = path.join(outputDirectory, module);
										const content = fs.readFileSync(p, "utf-8");

										// ESM
										const isModule =
											p.endsWith(".mjs") &&
											options.experiments &&
											options.experiments.outputModule;

										if (isModule) {
											if (!vm.SourceTextModule)
												throw new Error(
													"Running this test requires '--experimental-vm-modules'.\nRun with 'node --experimental-vm-modules node_modules/jest-cli/bin/jest'."
												);
											let esm = esmCache.get(p);
											if (!esm) {
												esm = new vm.SourceTextModule(content, {
													identifier: `${esmIdentifier}-${p}`,
													url: `${pathToFileURL(p).href}?${esmIdentifier}`,
													context: esmContext,
													initializeImportMeta: (meta, module) => {
														meta.url = pathToFileURL(p).href;
													},
													importModuleDynamically: async (
														specifier,
														module
													) => {
														const normalizedSpecifier = specifier.startsWith(
															"file:"
														)
															? `./${path.relative(
																	path.dirname(p),
																	fileURLToPath(specifier)
																)}`
															: specifier.replace(
																	/https:\/\/test.cases\/path\//,
																	"./"
																);
														const result = await _require(
															normalizedSpecifier,
															"evaluated"
														);
														return await asModule(result, module.context);
													}
												});
												esmCache.set(p, esm);
											}
											if (esmMode === "unlinked") return esm;
											return (async () => {
												if (esmMode === "unlinked") return esm;
												await esm.link(
													async (specifier, referencingModule) =>
														await asModule(
															await _require(specifier, "unlinked"),
															referencingModule.context,
															true
														)
												);
												// node.js 10 needs instantiate
												if (esm.instantiate) esm.instantiate();
												await esm.evaluate();
												if (esmMode === "evaluated") return esm;
												const ns = esm.namespace;
												return ns.default && ns.default instanceof Promise
													? ns.default
													: ns;
											})();
										}

										// CSS
										if (module.endsWith(".css")) {
											return content;
										}

										// JSON
										if (module.endsWith(".json")) {
											return JSON.parse(content);
										}

										// CommonJS
										const fn = vm.runInThisContext(
											"(function(require, module, exports, __dirname, __filename, it, beforeEach, afterEach, expect, jest, self, window, fetch, document, importScripts, Worker, EventSource, NEXT, STATS) {" +
												"global.expect = expect;" +
												"global.it = it;" +
												`function nsObj(m) { Object.defineProperty(m, Symbol.toStringTag, { value: "Module" }); return m; }${content}\n})`,
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
								const promises = [];
								const info = stats.toJson({ all: false, entrypoints: true });
								if (config.target === "web") {
									for (const file of info.entrypoints.main.assets) {
										if (file.name.endsWith(".css")) {
											const link = window.document.createElement("link");
											link.href = path.join(outputDirectory, file.name);
											window.document.head.appendChild(link);
										} else {
											promises.push(_require(`./${file.name}`));
										}
									}
								} else {
									const assets = info.entrypoints.main.assets;
									const result = _require(
										`./${assets[assets.length - 1].name}`
									);
									if (typeof result === "object" && "then" in result)
										promises.push(result);
								}
								Promise.all(promises).then(
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
