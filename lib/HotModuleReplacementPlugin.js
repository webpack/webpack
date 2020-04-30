/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

"use strict";

const { SyncBailHook } = require("tapable");
const { RawSource } = require("webpack-sources");
const ChunkGraph = require("./ChunkGraph");
const HotUpdateChunk = require("./HotUpdateChunk");
const NormalModule = require("./NormalModule");
const RuntimeGlobals = require("./RuntimeGlobals");
const ModuleHotAcceptDependency = require("./dependencies/ModuleHotAcceptDependency");
const ModuleHotDeclineDependency = require("./dependencies/ModuleHotDeclineDependency");
const ModuleHotDependency = require("./dependencies/ModuleHotDependency");
const HotModuleReplacementRuntimeModule = require("./hmr/HotModuleReplacementRuntimeModule");
const JavascriptParser = require("./javascript/JavascriptParser");
const {
	evaluateToIdentifier,
	evaluateToString,
	toConstantDependency
} = require("./javascript/JavascriptParserHelpers");
const { find } = require("./util/SetHelpers");
const { compareModulesById } = require("./util/comparators");

/** @typedef {import("./Chunk")} Chunk */
/** @typedef {import("./Compiler")} Compiler */
/** @typedef {import("./Module")} Module */

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
		this.multiStep = this.options.multiStep;
		this.fullBuildTimeout = this.options.fullBuildTimeout || 200;
	}

	/**
	 * Apply the plugin
	 * @param {Compiler} compiler the compiler instance
	 * @returns {void}
	 */
	apply(compiler) {
		const multiStep = this.multiStep;
		const fullBuildTimeout = this.fullBuildTimeout;
		compiler.hooks.additionalPass.tapAsync(
			"HotModuleReplacementPlugin",
			callback => {
				if (multiStep) return setTimeout(callback, fullBuildTimeout);
				return callback();
			}
		);

		const addParserPlugins = (parser, parserOptions) => {
			const {
				hotAcceptCallback,
				hotAcceptWithoutCallback
			} = HotModuleReplacementPlugin.getParserHooks(parser);

			parser.hooks.expression
				.for("__webpack_hash__")
				.tap(
					"HotModuleReplacementPlugin",
					toConstantDependency(parser, `${RuntimeGlobals.getFullHash}()`, [
						RuntimeGlobals.getFullHash
					])
				);
			parser.hooks.evaluateTypeof
				.for("__webpack_hash__")
				.tap("HotModuleReplacementPlugin", evaluateToString("string"));
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
				.tap("HotModuleReplacementPlugin", expr => {
					const dep = new ModuleHotDependency(expr.callee.range, "accept");
					dep.loc = expr.loc;
					parser.state.module.addDependency(dep);
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
								const dep = new ModuleHotAcceptDependency(request, param.range);
								dep.optional = true;
								dep.loc = Object.create(expr.loc);
								dep.loc.index = idx;
								parser.state.module.addDependency(dep);
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
					return true;
				});
			parser.hooks.call
				.for("module.hot.decline")
				.tap("HotModuleReplacementPlugin", expr => {
					const dep = new ModuleHotDependency(expr.callee.range, "decline");
					dep.loc = expr.loc;
					parser.state.module.addDependency(dep);
					if (expr.arguments.length === 1) {
						const arg = parser.evaluateExpression(expr.arguments[0]);
						let params = [];
						if (arg.isString()) {
							params = [arg];
						} else if (arg.isArray()) {
							params = arg.items.filter(param => param.isString());
						}
						params.forEach((param, idx) => {
							const dep = new ModuleHotDeclineDependency(
								param.string,
								param.range
							);
							dep.optional = true;
							dep.loc = Object.create(expr.loc);
							dep.loc.index = idx;
							parser.state.module.addDependency(dep);
						});
					}
					return true;
				});
			parser.hooks.expression
				.for("module.hot")
				.tap("HotModuleReplacementPlugin", expr => {
					const dep = new ModuleHotDependency(expr.range);
					dep.loc = expr.loc;
					parser.state.module.addDependency(dep);
					return true;
				});
		};

		compiler.hooks.compilation.tap(
			"HotModuleReplacementPlugin",
			(compilation, { normalModuleFactory }) => {
				// This applies the HMR plugin only to the targeted compiler
				// It should not affect child compilations
				if (compilation.compiler !== compiler) return;

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

				compilation.dependencyTemplates.set(
					ModuleHotDependency,
					new ModuleHotDependency.Template()
				);

				compilation.hooks.record.tap(
					"HotModuleReplacementPlugin",
					(compilation, records) => {
						if (records.hash === compilation.hash) return;
						const chunkGraph = compilation.chunkGraph;
						records.hash = compilation.hash;
						records.moduleHashs = {};
						for (const module of compilation.modules) {
							const identifier = module.identifier();
							records.moduleHashs[identifier] = chunkGraph.getModuleHash(
								module
							);
						}
						records.chunkHashs = {};
						for (const chunk of compilation.chunks) {
							records.chunkHashs[chunk.id] = chunk.hash;
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
				let initialPass = false;
				let recompilation = false;
				compilation.hooks.afterHash.tap("HotModuleReplacementPlugin", () => {
					let records = compilation.records;
					if (!records) {
						initialPass = true;
						return;
					}
					if (!records.hash) initialPass = true;
					const preHash = records.preHash || "x";
					const prePreHash = records.prePreHash || "x";
					if (preHash === compilation.hash) {
						recompilation = true;
						compilation.modifyHash(prePreHash);
						return;
					}
					records.prePreHash = records.hash || "x";
					records.preHash = compilation.hash;
					compilation.modifyHash(records.prePreHash);
				});
				compilation.hooks.shouldGenerateChunkAssets.tap(
					"HotModuleReplacementPlugin",
					() => {
						if (multiStep && !recompilation && !initialPass) return false;
					}
				);
				compilation.hooks.needAdditionalPass.tap(
					"HotModuleReplacementPlugin",
					() => {
						if (multiStep && !recompilation && !initialPass) return true;
					}
				);
				compilation.hooks.additionalChunkAssets.tap(
					"HotModuleReplacementPlugin",
					() => {
						const chunkGraph = compilation.chunkGraph;
						const records = compilation.records;
						if (records.hash === compilation.hash) return;
						if (
							!records.moduleHashs ||
							!records.chunkHashs ||
							!records.chunkModuleIds
						)
							return;
						/** @type {Set<Module>} */
						const updatedModules = new Set();
						for (const module of compilation.modules) {
							const identifier = module.identifier();
							const hash = chunkGraph.getModuleHash(module);
							if (records.moduleHashs[identifier] !== hash) {
								updatedModules.add(module);
							}
						}
						const hotUpdateMainContent = {
							c: [],
							r: [],
							m: undefined
						};
						const allRemovedModules = new Set();
						for (const key of Object.keys(records.chunkHashs)) {
							const currentChunk = find(
								compilation.chunks,
								chunk => `${chunk.id}` === key
							);
							if (currentChunk) {
								const chunkId = currentChunk.id;
								const newModules = chunkGraph
									.getChunkModules(currentChunk)
									.filter(module => updatedModules.has(module));
								const newRuntimeModules = Array.from(
									chunkGraph.getChunkRuntimeModulesIterable(currentChunk)
								).filter(module => updatedModules.has(module));
								const fullHashModules = chunkGraph.getChunkFullHashModulesIterable(
									currentChunk
								);
								const newFullHashModules =
									fullHashModules &&
									Array.from(fullHashModules).filter(module =>
										updatedModules.has(module)
									);
								/** @type {Set<number|string>} */
								const allModules = new Set();
								for (const module of chunkGraph.getChunkModulesIterable(
									currentChunk
								)) {
									allModules.add(chunkGraph.getModuleId(module));
								}
								const removedModules = records.chunkModuleIds[chunkId].filter(
									id => !allModules.has(id)
								);
								if (newModules.length > 0 || removedModules.length > 0) {
									const hotUpdateChunk = new HotUpdateChunk();
									ChunkGraph.setChunkGraphForChunk(hotUpdateChunk, chunkGraph);
									hotUpdateChunk.id = chunkId;
									chunkGraph.attachModules(hotUpdateChunk, newModules);
									chunkGraph.attachRuntimeModules(
										hotUpdateChunk,
										newRuntimeModules
									);
									if (newFullHashModules) {
										chunkGraph.attachFullHashModules(
											hotUpdateChunk,
											newRuntimeModules
										);
									}
									hotUpdateChunk.removedModules = removedModules;
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
										const {
											path: filename,
											info: assetInfo
										} = compilation.getPathWithInfo(
											entry.filenameTemplate,
											entry.pathOptions
										);
										const source = entry.render();
										compilation.additionalChunkAssets.push(filename);
										compilation.emitAsset(filename, source, {
											hotModuleReplacement: true,
											...assetInfo
										});
										currentChunk.files.add(filename);
										compilation.hooks.chunkAsset.call(currentChunk, filename);
									}
									hotUpdateMainContent.c.push(chunkId);
								}
							} else {
								const chunkId = `${+key}` === key ? +key : key;
								hotUpdateMainContent.r.push(chunkId);
								for (const id of records.chunkModuleIds[chunkId])
									allRemovedModules.add(id);
							}
						}
						hotUpdateMainContent.m = Array.from(allRemovedModules);
						const source = new RawSource(JSON.stringify(hotUpdateMainContent));
						const {
							path: filename,
							info: assetInfo
						} = compilation.getPathWithInfo(
							compilation.outputOptions.hotUpdateMainFilename,
							{
								hash: records.hash
							}
						);
						compilation.emitAsset(filename, source, {
							hotModuleReplacement: true,
							...assetInfo
						});
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

				// TODO add HMR support for javascript/esm
				normalModuleFactory.hooks.parser
					.for("javascript/auto")
					.tap("HotModuleReplacementPlugin", addParserPlugins);
				normalModuleFactory.hooks.parser
					.for("javascript/dynamic")
					.tap("HotModuleReplacementPlugin", addParserPlugins);

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
