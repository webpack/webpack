/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

"use strict";

const { SyncBailHook } = require("tapable");
const { RawSource } = require("webpack-sources");
const ChunkGraph = require("./ChunkGraph");
const Compilation = require("./Compilation");
const HotUpdateChunk = require("./HotUpdateChunk");
const NormalModule = require("./NormalModule");
const RuntimeGlobals = require("./RuntimeGlobals");
const WebpackError = require("./WebpackError");
const ConstDependency = require("./dependencies/ConstDependency");
const ImportMetaHotAcceptDependency = require("./dependencies/ImportMetaHotAcceptDependency");
const ImportMetaHotDeclineDependency = require("./dependencies/ImportMetaHotDeclineDependency");
const ModuleHotAcceptDependency = require("./dependencies/ModuleHotAcceptDependency");
const ModuleHotDeclineDependency = require("./dependencies/ModuleHotDeclineDependency");
const HotModuleReplacementRuntimeModule = require("./hmr/HotModuleReplacementRuntimeModule");
const JavascriptParser = require("./javascript/JavascriptParser");
const {
	evaluateToIdentifier
} = require("./javascript/JavascriptParserHelpers");
const { find, isSubset } = require("./util/SetHelpers");
const TupleSet = require("./util/TupleSet");
const { compareModulesById } = require("./util/comparators");
const {
	getRuntimeKey,
	keyToRuntime,
	forEachRuntime,
	mergeRuntimeOwned,
	subtractRuntime
} = require("./util/runtime");

/** @typedef {import("./Chunk")} Chunk */
/** @typedef {import("./Compilation").AssetInfo} AssetInfo */
/** @typedef {import("./Compiler")} Compiler */
/** @typedef {import("./Module")} Module */
/** @typedef {import("./RuntimeModule")} RuntimeModule */
/** @typedef {import("./util/runtime").RuntimeSpec} RuntimeSpec */

/**
 * @typedef {Object} HMRJavascriptParserHooks
 * @property {SyncBailHook<[TODO, string[]], void>} hotAcceptCallback
 * @property {SyncBailHook<[TODO, string[]], void>} hotAcceptWithoutCallback
 */

/** @type {WeakMap<JavascriptParser, HMRJavascriptParserHooks>} */
const parserHooksMap = new WeakMap();

class HotModuleReplacementPlugin {
	/**
	 * @param {JavascriptParser} parser the parser
	 * @returns {HMRJavascriptParserHooks} the attached hooks
	 */
	static getParserHooks(parser) {
		if (!(parser instanceof JavascriptParser)) {
			throw new TypeError(
				"The 'parser' argument must be an instance of JavascriptParser"
			);
		}
		let hooks = parserHooksMap.get(parser);
		if (hooks === undefined) {
			hooks = {
				hotAcceptCallback: new SyncBailHook(["expression", "requests"]),
				hotAcceptWithoutCallback: new SyncBailHook(["expression", "requests"])
			};
			parserHooksMap.set(parser, hooks);
		}
		return hooks;
	}

	constructor(options) {
		this.options = options || {};
	}

	/**
	 * Apply the plugin
	 * @param {Compiler} compiler the compiler instance
	 * @returns {void}
	 */
	apply(compiler) {
		const runtimeRequirements = [RuntimeGlobals.module];

		const createAcceptHandler = (parser, ParamDependency) => {
			const {
				hotAcceptCallback,
				hotAcceptWithoutCallback
			} = HotModuleReplacementPlugin.getParserHooks(parser);

			return expr => {
				const module = parser.state.module;
				const dep = new ConstDependency(
					`${module.moduleArgument}.hot.accept`,
					expr.callee.range,
					runtimeRequirements
				);
				dep.loc = expr.loc;
				module.addPresentationalDependency(dep);
				module.buildInfo.moduleConcatenationBailout = "Hot Module Replacement";
				if (expr.arguments.length >= 1) {
					const arg = parser.evaluateExpression(expr.arguments[0]);
					let params = [];
					let requests = [];
					if (arg.isString()) {
						params = [arg];
					} else if (arg.isArray()) {
						params = arg.items.filter(param => param.isString());
					}
					if (params.length > 0) {
						params.forEach((param, idx) => {
							const request = param.string;
							const dep = new ParamDependency(request, param.range);
							dep.optional = true;
							dep.loc = Object.create(expr.loc);
							dep.loc.index = idx;
							module.addDependency(dep);
							requests.push(request);
						});
						if (expr.arguments.length > 1) {
							hotAcceptCallback.call(expr.arguments[1], requests);
							parser.walkExpression(expr.arguments[1]); // other args are ignored
							return true;
						} else {
							hotAcceptWithoutCallback.call(expr, requests);
							return true;
						}
					}
				}
				parser.walkExpressions(expr.arguments);
				return true;
			};
		};

		const createDeclineHandler = (parser, ParamDependency) => expr => {
			const module = parser.state.module;
			const dep = new ConstDependency(
				`${module.moduleArgument}.hot.decline`,
				expr.callee.range,
				runtimeRequirements
			);
			dep.loc = expr.loc;
			module.addPresentationalDependency(dep);
			module.buildInfo.moduleConcatenationBailout = "Hot Module Replacement";
			if (expr.arguments.length === 1) {
				const arg = parser.evaluateExpression(expr.arguments[0]);
				let params = [];
				if (arg.isString()) {
					params = [arg];
				} else if (arg.isArray()) {
					params = arg.items.filter(param => param.isString());
				}
				params.forEach((param, idx) => {
					const dep = new ParamDependency(param.string, param.range);
					dep.optional = true;
					dep.loc = Object.create(expr.loc);
					dep.loc.index = idx;
					module.addDependency(dep);
				});
			}
			return true;
		};

		const createHMRExpressionHandler = parser => expr => {
			const module = parser.state.module;
			const dep = new ConstDependency(
				`${module.moduleArgument}.hot`,
				expr.range,
				runtimeRequirements
			);
			dep.loc = expr.loc;
			module.addPresentationalDependency(dep);
			module.buildInfo.moduleConcatenationBailout = "Hot Module Replacement";
			return true;
		};

		const applyModuleHot = parser => {
			parser.hooks.evaluateIdentifier.for("module.hot").tap(
				{
					name: "HotModuleReplacementPlugin",
					before: "NodeStuffPlugin"
				},
				expr => {
					return evaluateToIdentifier(
						"module.hot",
						"module",
						() => ["hot"],
						true
					)(expr);
				}
			);
			parser.hooks.call
				.for("module.hot.accept")
				.tap(
					"HotModuleReplacementPlugin",
					createAcceptHandler(parser, ModuleHotAcceptDependency)
				);
			parser.hooks.call
				.for("module.hot.decline")
				.tap(
					"HotModuleReplacementPlugin",
					createDeclineHandler(parser, ModuleHotDeclineDependency)
				);
			parser.hooks.expression
				.for("module.hot")
				.tap("HotModuleReplacementPlugin", createHMRExpressionHandler(parser));
		};

		const applyImportMetaHot = parser => {
			parser.hooks.evaluateIdentifier
				.for("import.meta.webpackHot")
				.tap("HotModuleReplacementPlugin", expr => {
					return evaluateToIdentifier(
						"import.meta.webpackHot",
						"import.meta",
						() => ["webpackHot"],
						true
					)(expr);
				});
			parser.hooks.call
				.for("import.meta.webpackHot.accept")
				.tap(
					"HotModuleReplacementPlugin",
					createAcceptHandler(parser, ImportMetaHotAcceptDependency)
				);
			parser.hooks.call
				.for("import.meta.webpackHot.decline")
				.tap(
					"HotModuleReplacementPlugin",
					createDeclineHandler(parser, ImportMetaHotDeclineDependency)
				);
			parser.hooks.expression
				.for("import.meta.webpackHot")
				.tap("HotModuleReplacementPlugin", createHMRExpressionHandler(parser));
		};

		compiler.hooks.compilation.tap(
			"HotModuleReplacementPlugin",
			(compilation, { normalModuleFactory }) => {
				// This applies the HMR plugin only to the targeted compiler
				// It should not affect child compilations
				if (compilation.compiler !== compiler) return;

				//#region module.hot.* API
				compilation.dependencyFactories.set(
					ModuleHotAcceptDependency,
					normalModuleFactory
				);
				compilation.dependencyTemplates.set(
					ModuleHotAcceptDependency,
					new ModuleHotAcceptDependency.Template()
				);
				compilation.dependencyFactories.set(
					ModuleHotDeclineDependency,
					normalModuleFactory
				);
				compilation.dependencyTemplates.set(
					ModuleHotDeclineDependency,
					new ModuleHotDeclineDependency.Template()
				);
				//#endregion

				//#region import.meta.webpackHot.* API
				compilation.dependencyFactories.set(
					ImportMetaHotAcceptDependency,
					normalModuleFactory
				);
				compilation.dependencyTemplates.set(
					ImportMetaHotAcceptDependency,
					new ImportMetaHotAcceptDependency.Template()
				);
				compilation.dependencyFactories.set(
					ImportMetaHotDeclineDependency,
					normalModuleFactory
				);
				compilation.dependencyTemplates.set(
					ImportMetaHotDeclineDependency,
					new ImportMetaHotDeclineDependency.Template()
				);
				//#endregion

				let hotIndex = 0;
				const fullHashChunkModuleHashes = {};
				const chunkModuleHashes = {};

				compilation.hooks.record.tap(
					"HotModuleReplacementPlugin",
					(compilation, records) => {
						if (records.hash === compilation.hash) return;
						const chunkGraph = compilation.chunkGraph;
						records.hash = compilation.hash;
						records.hotIndex = hotIndex;
						records.fullHashChunkModuleHashes = fullHashChunkModuleHashes;
						records.chunkModuleHashes = chunkModuleHashes;
						records.chunkHashs = {};
						records.chunkRuntime = {};
						for (const chunk of compilation.chunks) {
							records.chunkHashs[chunk.id] = chunk.hash;
							records.chunkRuntime[chunk.id] = getRuntimeKey(chunk.runtime);
						}
						records.chunkModuleIds = {};
						for (const chunk of compilation.chunks) {
							records.chunkModuleIds[
								chunk.id
							] = Array.from(
								chunkGraph.getOrderedChunkModulesIterable(
									chunk,
									compareModulesById(chunkGraph)
								),
								m => chunkGraph.getModuleId(m)
							);
						}
					}
				);
				/** @type {TupleSet<[Module, Chunk]>} */
				const updatedModules = new TupleSet();
				/** @type {TupleSet<[Module, Chunk]>} */
				const fullHashModules = new TupleSet();
				/** @type {TupleSet<[Module, RuntimeSpec]>} */
				const nonCodeGeneratedModules = new TupleSet();
				compilation.hooks.fullHash.tap("HotModuleReplacementPlugin", hash => {
					const chunkGraph = compilation.chunkGraph;
					const records = compilation.records;
					for (const chunk of compilation.chunks) {
						const getModuleHash = module => {
							if (
								compilation.codeGenerationResults.has(module, chunk.runtime)
							) {
								return compilation.codeGenerationResults.getHash(
									module,
									chunk.runtime
								);
							} else {
								nonCodeGeneratedModules.add(module, chunk.runtime);
								return chunkGraph.getModuleHash(module, chunk.runtime);
							}
						};
						const fullHashModulesInThisChunk = chunkGraph.getChunkFullHashModulesSet(
							chunk
						);
						if (fullHashModulesInThisChunk !== undefined) {
							for (const module of fullHashModulesInThisChunk) {
								fullHashModules.add(module, chunk);
							}
						}
						const modules = chunkGraph.getChunkModulesIterable(chunk);
						if (modules !== undefined) {
							if (records.chunkModuleHashes) {
								if (fullHashModulesInThisChunk !== undefined) {
									for (const module of modules) {
										const key = `${chunk.id}|${module.identifier()}`;
										const hash = getModuleHash(module);
										if (
											fullHashModulesInThisChunk.has(
												/** @type {RuntimeModule} */ (module)
											)
										) {
											if (records.fullHashChunkModuleHashes[key] !== hash) {
												updatedModules.add(module, chunk);
											}
											fullHashChunkModuleHashes[key] = hash;
										} else {
											if (records.chunkModuleHashes[key] !== hash) {
												updatedModules.add(module, chunk);
											}
											chunkModuleHashes[key] = hash;
										}
									}
								} else {
									for (const module of modules) {
										const key = `${chunk.id}|${module.identifier()}`;
										const hash = getModuleHash(module);
										if (records.chunkModuleHashes[key] !== hash) {
											updatedModules.add(module, chunk);
										}
										chunkModuleHashes[key] = hash;
									}
								}
							} else {
								if (fullHashModulesInThisChunk !== undefined) {
									for (const module of modules) {
										const key = `${chunk.id}|${module.identifier()}`;
										const hash = getModuleHash(module);
										if (
											fullHashModulesInThisChunk.has(
												/** @type {RuntimeModule} */ (module)
											)
										) {
											fullHashChunkModuleHashes[key] = hash;
										} else {
											chunkModuleHashes[key] = hash;
										}
									}
								} else {
									for (const module of modules) {
										const key = `${chunk.id}|${module.identifier()}`;
										const hash = getModuleHash(module);
										chunkModuleHashes[key] = hash;
									}
								}
							}
						}
					}

					hotIndex = records.hotIndex || 0;
					if (updatedModules.size > 0) hotIndex++;

					hash.update(`${hotIndex}`);
				});
				compilation.hooks.processAssets.tap(
					{
						name: "HotModuleReplacementPlugin",
						stage: Compilation.PROCESS_ASSETS_STAGE_ADDITIONAL
					},
					() => {
						const chunkGraph = compilation.chunkGraph;
						const records = compilation.records;
						if (records.hash === compilation.hash) return;
						if (
							!records.chunkModuleHashes ||
							!records.chunkHashs ||
							!records.chunkModuleIds
						) {
							return;
						}
						for (const [module, chunk] of fullHashModules) {
							const key = `${chunk.id}|${module.identifier()}`;
							const hash = nonCodeGeneratedModules.has(module, chunk.runtime)
								? chunkGraph.getModuleHash(module, chunk.runtime)
								: compilation.codeGenerationResults.getHash(
										module,
										chunk.runtime
								  );
							if (records.chunkModuleHashes[key] !== hash) {
								updatedModules.add(module, chunk);
							}
							chunkModuleHashes[key] = hash;
						}

						/** @type {Map<string, { updatedChunkIds: Set<string|number>, removedChunkIds: Set<string|number>, removedModules: Set<Module>, filename: string, assetInfo: AssetInfo }>} */
						const hotUpdateMainContentByRuntime = new Map();
						let allOldRuntime;
						for (const key of Object.keys(records.chunkRuntime)) {
							const runtime = keyToRuntime(records.chunkRuntime[key]);
							allOldRuntime = mergeRuntimeOwned(allOldRuntime, runtime);
						}
						forEachRuntime(allOldRuntime, runtime => {
							const {
								path: filename,
								info: assetInfo
							} = compilation.getPathWithInfo(
								compilation.outputOptions.hotUpdateMainFilename,
								{
									hash: records.hash,
									runtime
								}
							);
							hotUpdateMainContentByRuntime.set(runtime, {
								updatedChunkIds: new Set(),
								removedChunkIds: new Set(),
								removedModules: new Set(),
								filename,
								assetInfo
							});
						});
						if (hotUpdateMainContentByRuntime.size === 0) return;

						// Create a list of all active modules to verify which modules are removed completely
						/** @type {Map<number|string, Module>} */
						const allModules = new Map();
						for (const module of compilation.modules) {
							const id = chunkGraph.getModuleId(module);
							allModules.set(id, module);
						}

						// List of completely removed modules
						/** @type {Set<string | number>} */
						const completelyRemovedModules = new Set();

						for (const key of Object.keys(records.chunkHashs)) {
							const oldRuntime = keyToRuntime(records.chunkRuntime[key]);
							/** @type {Module[]} */
							const remainingModules = [];
							// Check which modules are removed
							for (const id of records.chunkModuleIds[key]) {
								const module = allModules.get(id);
								if (module === undefined) {
									completelyRemovedModules.add(id);
								} else {
									remainingModules.push(module);
								}
							}

							let chunkId;
							let newModules;
							let newRuntimeModules;
							let newFullHashModules;
							let newRuntime;
							let removedFromRuntime;
							const currentChunk = find(
								compilation.chunks,
								chunk => `${chunk.id}` === key
							);
							if (currentChunk) {
								chunkId = currentChunk.id;
								newRuntime = currentChunk.runtime;
								newModules = chunkGraph
									.getChunkModules(currentChunk)
									.filter(module => updatedModules.has(module, currentChunk));
								newRuntimeModules = Array.from(
									chunkGraph.getChunkRuntimeModulesIterable(currentChunk)
								).filter(module => updatedModules.has(module, currentChunk));
								const fullHashModules = chunkGraph.getChunkFullHashModulesIterable(
									currentChunk
								);
								newFullHashModules =
									fullHashModules &&
									Array.from(fullHashModules).filter(module =>
										updatedModules.has(module, currentChunk)
									);
								removedFromRuntime = subtractRuntime(oldRuntime, newRuntime);
							} else {
								// chunk has completely removed
								chunkId = `${+key}` === key ? +key : key;
								removedFromRuntime = oldRuntime;
								newRuntime = oldRuntime;
							}
							if (removedFromRuntime) {
								// chunk was removed from some runtimes
								forEachRuntime(removedFromRuntime, runtime => {
									hotUpdateMainContentByRuntime
										.get(runtime)
										.removedChunkIds.add(chunkId);
								});
								// dispose modules from the chunk in these runtimes
								// where they are no longer in this runtime
								for (const module of remainingModules) {
									const moduleKey = `${key}|${module.identifier()}`;
									const oldHash = records.chunkModuleHashes[moduleKey];
									const runtimes = chunkGraph.getModuleRuntimes(module);
									if (oldRuntime === newRuntime && runtimes.has(newRuntime)) {
										// Module is still in the same runtime combination
										const hash = nonCodeGeneratedModules.has(module, newRuntime)
											? chunkGraph.getModuleHash(module, newRuntime)
											: compilation.codeGenerationResults.getHash(
													module,
													newRuntime
											  );
										if (hash !== oldHash) {
											if (module.type === "runtime") {
												newRuntimeModules = newRuntimeModules || [];
												newRuntimeModules.push(
													/** @type {RuntimeModule} */ (module)
												);
											} else {
												newModules = newModules || [];
												newModules.push(module);
											}
										}
									} else {
										// module is no longer in this runtime combination
										// We (incorrectly) assume that it's not in an overlapping runtime combination
										// and dispose it from the main runtimes the chunk was removed from
										forEachRuntime(removedFromRuntime, runtime => {
											// If the module is still used in this runtime, do not dispose it
											// This could create a bad runtime state where the module is still loaded,
											// but no chunk which contains it. This means we don't receive further HMR updates
											// to this module and that's bad.
											// TODO force load one of the chunks which contains the module
											for (const moduleRuntime of runtimes) {
												if (typeof moduleRuntime === "string") {
													if (moduleRuntime === runtime) return;
												} else if (moduleRuntime !== undefined) {
													if (moduleRuntime.has(runtime)) return;
												}
											}
											hotUpdateMainContentByRuntime
												.get(runtime)
												.removedModules.add(module);
										});
									}
								}
							}
							if (
								(newModules && newModules.length > 0) ||
								(newRuntimeModules && newRuntimeModules.length > 0)
							) {
								const hotUpdateChunk = new HotUpdateChunk();
								ChunkGraph.setChunkGraphForChunk(hotUpdateChunk, chunkGraph);
								hotUpdateChunk.id = chunkId;
								hotUpdateChunk.runtime = newRuntime;
								if (currentChunk) {
									for (const group of currentChunk.groupsIterable)
										hotUpdateChunk.addGroup(group);
								}
								chunkGraph.attachModules(hotUpdateChunk, newModules || []);
								chunkGraph.attachRuntimeModules(
									hotUpdateChunk,
									newRuntimeModules || []
								);
								if (newFullHashModules) {
									chunkGraph.attachFullHashModules(
										hotUpdateChunk,
										newFullHashModules
									);
								}
								const renderManifest = compilation.getRenderManifest({
									chunk: hotUpdateChunk,
									hash: records.hash,
									fullHash: records.hash,
									outputOptions: compilation.outputOptions,
									moduleTemplates: compilation.moduleTemplates,
									dependencyTemplates: compilation.dependencyTemplates,
									codeGenerationResults: compilation.codeGenerationResults,
									runtimeTemplate: compilation.runtimeTemplate,
									moduleGraph: compilation.moduleGraph,
									chunkGraph
								});
								for (const entry of renderManifest) {
									/** @type {string} */
									let filename;
									/** @type {AssetInfo} */
									let assetInfo;
									if ("filename" in entry) {
										filename = entry.filename;
										assetInfo = entry.info;
									} else {
										({
											path: filename,
											info: assetInfo
										} = compilation.getPathWithInfo(
											entry.filenameTemplate,
											entry.pathOptions
										));
									}
									const source = entry.render();
									compilation.additionalChunkAssets.push(filename);
									compilation.emitAsset(filename, source, {
										hotModuleReplacement: true,
										...assetInfo
									});
									if (currentChunk) {
										currentChunk.files.add(filename);
										compilation.hooks.chunkAsset.call(currentChunk, filename);
									}
								}
								forEachRuntime(newRuntime, runtime => {
									hotUpdateMainContentByRuntime
										.get(runtime)
										.updatedChunkIds.add(chunkId);
								});
							}
						}
						const completelyRemovedModulesArray = Array.from(
							completelyRemovedModules
						);
						const hotUpdateMainContentByFilename = new Map();
						for (const {
							removedChunkIds,
							removedModules,
							updatedChunkIds,
							filename,
							assetInfo
						} of hotUpdateMainContentByRuntime.values()) {
							const old = hotUpdateMainContentByFilename.get(filename);
							if (
								old &&
								(!isSubset(old.removedChunkIds, removedChunkIds) ||
									!isSubset(old.removedModules, removedModules) ||
									!isSubset(old.updatedChunkIds, updatedChunkIds))
							) {
								compilation.warnings.push(
									new WebpackError(`HotModuleReplacementPlugin
The configured output.hotUpdateMainFilename doesn't lead to unique filenames per runtime and HMR update differs between runtimes.
This might lead to incorrect runtime behavior of the applied update.
To fix this, make sure to include [runtime] in the output.hotUpdateMainFilename option, or use the default config.`)
								);
								for (const chunkId of removedChunkIds)
									old.removedChunkIds.add(chunkId);
								for (const chunkId of removedModules)
									old.removedModules.add(chunkId);
								for (const chunkId of updatedChunkIds)
									old.updatedChunkIds.add(chunkId);
								continue;
							}
							hotUpdateMainContentByFilename.set(filename, {
								removedChunkIds,
								removedModules,
								updatedChunkIds,
								assetInfo
							});
						}
						for (const [
							filename,
							{ removedChunkIds, removedModules, updatedChunkIds, assetInfo }
						] of hotUpdateMainContentByFilename) {
							const hotUpdateMainJson = {
								c: Array.from(updatedChunkIds),
								r: Array.from(removedChunkIds),
								m:
									removedModules.size === 0
										? completelyRemovedModulesArray
										: completelyRemovedModulesArray.concat(
												Array.from(removedModules, m =>
													chunkGraph.getModuleId(m)
												)
										  )
							};

							const source = new RawSource(JSON.stringify(hotUpdateMainJson));
							compilation.emitAsset(filename, source, {
								hotModuleReplacement: true,
								...assetInfo
							});
						}
					}
				);

				compilation.hooks.additionalTreeRuntimeRequirements.tap(
					"HotModuleReplacementPlugin",
					(chunk, runtimeRequirements) => {
						runtimeRequirements.add(RuntimeGlobals.hmrDownloadManifest);
						runtimeRequirements.add(RuntimeGlobals.hmrDownloadUpdateHandlers);
						runtimeRequirements.add(RuntimeGlobals.interceptModuleExecution);
						runtimeRequirements.add(RuntimeGlobals.moduleCache);
						compilation.addRuntimeModule(
							chunk,
							new HotModuleReplacementRuntimeModule()
						);
					}
				);

				normalModuleFactory.hooks.parser
					.for("javascript/auto")
					.tap("HotModuleReplacementPlugin", parser => {
						applyModuleHot(parser);
						applyImportMetaHot(parser);
					});
				normalModuleFactory.hooks.parser
					.for("javascript/dynamic")
					.tap("HotModuleReplacementPlugin", parser => {
						applyModuleHot(parser);
					});
				normalModuleFactory.hooks.parser
					.for("javascript/esm")
					.tap("HotModuleReplacementPlugin", parser => {
						applyImportMetaHot(parser);
					});

				NormalModule.getCompilationHooks(compilation).loader.tap(
					"HotModuleReplacementPlugin",
					context => {
						context.hot = true;
					}
				);
			}
		);
	}
}

module.exports = HotModuleReplacementPlugin;
