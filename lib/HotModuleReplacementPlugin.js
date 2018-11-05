/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

"use strict";

const { SyncBailHook, SyncWaterfallHook } = require("tapable");
const { RawSource } = require("webpack-sources");
const HotUpdateChunk = require("./HotUpdateChunk");
const JavascriptParser = require("./JavascriptParser");
const {
	evaluateToIdentifier,
	evaluateToString,
	skipTraversal,
	toConstantDependency
} = require("./JavascriptParserHelpers");
const MainTemplate = require("./MainTemplate");
const NormalModule = require("./NormalModule");
const NullFactory = require("./NullFactory");
const RuntimeGlobals = require("./RuntimeGlobals");
const Template = require("./Template");
const ConstDependency = require("./dependencies/ConstDependency");
const ModuleHotAcceptDependency = require("./dependencies/ModuleHotAcceptDependency");
const ModuleHotDeclineDependency = require("./dependencies/ModuleHotDeclineDependency");
const { find } = require("./util/SetHelpers");
const { compareModulesById } = require("./util/comparators");

/** @typedef {import("./Chunk")} Chunk */
/** @typedef {import("./Compiler")} Compiler */
/** @typedef {import("./Module")} Module */

/**
 * @typedef {Object} HMRMainTemplateHooks
 * @property {SyncWaterfallHook<string, Chunk, string>} hotBootstrap
 */

/**
 * @typedef {Object} HMRJavascriptParserHooks
 * @property {SyncBailHook<TODO, string[]>} hotAcceptCallback
 * @property {SyncBailHook<TODO, string[]>} hotAcceptWithoutCallback
 */

const hotInitCode = Template.getFunctionContent(
	require("./HotModuleReplacement.runtime")
);

/** @type {WeakMap<MainTemplate, HMRMainTemplateHooks>} */
const mainTemplateHooksMap = new WeakMap();

/** @type {WeakMap<JavascriptParser, HMRJavascriptParserHooks>} */
const parserHooksMap = new WeakMap();

class HotModuleReplacementPlugin {
	/**
	 * @param {MainTemplate} mainTemplate the main template
	 * @returns {HMRMainTemplateHooks} the attached hooks
	 */
	static getMainTemplateHooks(mainTemplate) {
		if (!(mainTemplate instanceof MainTemplate)) {
			throw new TypeError(
				"The 'mainTemplate' argument must be an instance of MainTemplate"
			);
		}
		let hooks = mainTemplateHooksMap.get(mainTemplate);
		if (hooks === undefined) {
			hooks = {
				hotBootstrap: new SyncWaterfallHook(["source", "chunk", "hash"])
			};
			mainTemplateHooksMap.set(mainTemplate, hooks);
		}
		return hooks;
	}

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
		this.requestTimeout = this.options.requestTimeout || 10000;
	}

	/**
	 * @param {Compiler} compiler webpack compiler
	 * @returns {void}
	 */
	apply(compiler) {
		const multiStep = this.multiStep;
		const fullBuildTimeout = this.fullBuildTimeout;
		const requestTimeout = this.requestTimeout;
		const hotUpdateChunkFilename =
			compiler.options.output.hotUpdateChunkFilename;
		const hotUpdateMainFilename = compiler.options.output.hotUpdateMainFilename;
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
						!!parser.state.compilation.hotUpdateChunkTemplate
					)(expr);
				}
			);
			parser.hooks.call
				.for("module.hot.accept")
				.tap("HotModuleReplacementPlugin", expr => {
					if (!parser.state.compilation.hotUpdateChunkTemplate) {
						return false;
					}
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
				});
			parser.hooks.call
				.for("module.hot.decline")
				.tap("HotModuleReplacementPlugin", expr => {
					if (!parser.state.compilation.hotUpdateChunkTemplate) {
						return false;
					}
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
				});
			parser.hooks.expression
				.for("module.hot")
				.tap("HotModuleReplacementPlugin", skipTraversal);
		};

		compiler.hooks.compilation.tap(
			"HotModuleReplacementPlugin",
			(compilation, { normalModuleFactory }) => {
				const moduleGraph = compilation.moduleGraph;
				const hotUpdateChunkTemplate = compilation.hotUpdateChunkTemplate;
				if (!hotUpdateChunkTemplate) return;

				compilation.dependencyFactories.set(ConstDependency, new NullFactory());
				compilation.dependencyTemplates.set(
					ConstDependency,
					new ConstDependency.Template()
				);

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
							records.chunkModuleIds[chunk.id] = Array.from(
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
					const prepreHash = records.prepreHash || "x";
					if (preHash === compilation.hash) {
						recompilation = true;
						compilation.modifyHash(prepreHash);
						return;
					}
					records.prepreHash = records.hash || "x";
					records.preHash = compilation.hash;
					compilation.modifyHash(records.prepreHash);
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
							h: compilation.hash,
							c: {}
						};
						for (const key of Object.keys(records.chunkHashs)) {
							const chunkId = key;
							const currentChunk = find(
								compilation.chunks,
								chunk => `${chunk.id}` === key
							);
							if (currentChunk) {
								const newModules = chunkGraph
									.getChunkModules(currentChunk)
									.filter(module => updatedModules.has(module));
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
									hotUpdateChunk.id = chunkId;
									chunkGraph.attachModules(hotUpdateChunk, newModules);
									hotUpdateChunk.removedModules = removedModules;
									const source = hotUpdateChunkTemplate.render(
										{
											chunk: hotUpdateChunk,
											dependencyTemplates: compilation.dependencyTemplates,
											runtimeTemplate: compilation.runtimeTemplate,
											moduleGraph,
											chunkGraph: compilation.chunkGraph
										},
										compilation.moduleTemplates.javascript,
										compilation.hash
									);
									const filename = compilation.getPath(hotUpdateChunkFilename, {
										hash: records.hash,
										chunk: currentChunk
									});
									compilation.additionalChunkAssets.push(filename);
									compilation.assets[filename] = source;
									hotUpdateMainContent.c[chunkId] = true;
									currentChunk.files.push(filename);
									compilation.hooks.chunkAsset.call(currentChunk, filename);
								}
							} else {
								hotUpdateMainContent.c[chunkId] = false;
							}
						}
						const source = new RawSource(JSON.stringify(hotUpdateMainContent));
						const filename = compilation.getPath(hotUpdateMainFilename, {
							hash: records.hash
						});
						compilation.assets[filename] = source;
					}
				);

				const mainTemplate = compilation.mainTemplate;
				const {
					hotBootstrap
				} = HotModuleReplacementPlugin.getMainTemplateHooks(mainTemplate);

				mainTemplate.hooks.hash.tap("HotModuleReplacementPlugin", hash => {
					hash.update("HotMainTemplateDecorator");
				});

				mainTemplate.hooks.moduleRequire.tap(
					"HotModuleReplacementPlugin",
					(_, chunk, hash, varModuleId) => {
						return `hotCreateRequire(${varModuleId})`;
					}
				);

				mainTemplate.hooks.requireExtensions.tap(
					"HotModuleReplacementPlugin",
					source => {
						const buf = [source];
						buf.push("");
						buf.push("// __webpack_hash__");
						buf.push(
							`${
								RuntimeGlobals.getFullHash
							} = function() { return hotCurrentHash; };`
						);
						return Template.asString(buf);
					}
				);

				const needChunkLoadingCode = chunk => {
					for (const chunkGroup of chunk.groupsIterable) {
						if (chunkGroup.chunks.length > 1) return true;
						if (chunkGroup.getNumberOfChildren() > 0) return true;
					}
					return false;
				};

				mainTemplate.hooks.bootstrap.tap(
					"HotModuleReplacementPlugin",
					(source, { chunk, hash }) => {
						const hotSource = hotBootstrap.call(source, chunk, hash);
						return Template.asString([
							hotSource,
							"",
							hotInitCode
								.replace(/\$hash\$/g, JSON.stringify(hash))
								.replace(/\$requestTimeout\$/g, requestTimeout)
								.replace(
									/\$createFakeNamespaceObject\$/g,
									RuntimeGlobals.createFakeNamespaceObject
								)
								.replace(
									/\/\*foreachInstalledChunks\*\//g,
									needChunkLoadingCode(chunk)
										? "for(var chunkId in installedChunks)"
										: `var chunkId = ${JSON.stringify(chunk.id)};`
								)
						]);
					}
				);

				mainTemplate.hooks.currentHash.tap(
					"HotModuleReplacementPlugin",
					(_, length) => {
						if (isFinite(length)) {
							return `hotCurrentHash.substr(0, ${length})`;
						} else {
							return "hotCurrentHash";
						}
					}
				);

				mainTemplate.hooks.moduleObj.tap(
					"HotModuleReplacementPlugin",
					(source, varModuleId) => {
						return Template.asString([
							`${source},`,
							`hot: hotCreateModule(${varModuleId}),`,
							"parents: (hotCurrentParentsTemp = hotCurrentParents, hotCurrentParents = [], hotCurrentParentsTemp),",
							"children: []"
						]);
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
