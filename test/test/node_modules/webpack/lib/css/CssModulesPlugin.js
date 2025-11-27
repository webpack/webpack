/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

"use strict";

const { SyncHook, SyncWaterfallHook } = require("tapable");
const {
	CachedSource,
	ConcatSource,
	PrefixSource,
	RawSource,
	ReplaceSource
} = require("webpack-sources");
const Compilation = require("../Compilation");
const CssModule = require("../CssModule");
const { tryRunOrWebpackError } = require("../HookWebpackError");
const HotUpdateChunk = require("../HotUpdateChunk");
const {
	CSS_MODULE_TYPE,
	CSS_MODULE_TYPE_AUTO,
	CSS_MODULE_TYPE_GLOBAL,
	CSS_MODULE_TYPE_MODULE
} = require("../ModuleTypeConstants");
const NormalModule = require("../NormalModule");
const RuntimeGlobals = require("../RuntimeGlobals");
const SelfModuleFactory = require("../SelfModuleFactory");
const Template = require("../Template");
const WebpackError = require("../WebpackError");
const CssIcssExportDependency = require("../dependencies/CssIcssExportDependency");
const CssIcssFromIdentifierDependency = require("../dependencies/CssIcssFromIdentifierDependency");
const CssIcssGlobalIdentifierDependency = require("../dependencies/CssIcssGlobalIdentifierDependency");
const CssIcssImportDependency = require("../dependencies/CssIcssImportDependency");
const CssIcssLocalIdentifierDependency = require("../dependencies/CssIcssLocalIdentifierDependency");
const CssIcssSelfLocalIdentifierDependency = require("../dependencies/CssIcssSelfLocalIdentifierDependency");
const CssIcssSymbolDependency = require("../dependencies/CssIcssSymbolDependency");
const CssImportDependency = require("../dependencies/CssImportDependency");
const CssUrlDependency = require("../dependencies/CssUrlDependency");
const StaticExportsDependency = require("../dependencies/StaticExportsDependency");
const JavascriptModulesPlugin = require("../javascript/JavascriptModulesPlugin");
const { compareModulesByIdOrIdentifier } = require("../util/comparators");
const createSchemaValidation = require("../util/create-schema-validation");
const createHash = require("../util/createHash");
const { getUndoPath } = require("../util/identifier");
const memoize = require("../util/memoize");
const nonNumericOnlyHash = require("../util/nonNumericOnlyHash");
const removeBOM = require("../util/removeBOM");
const CssGenerator = require("./CssGenerator");
const CssMergeStyleSheetsRuntimeModule = require("./CssMergeStyleSheetsRuntimeModule");
const CssParser = require("./CssParser");

/** @typedef {import("webpack-sources").Source} Source */
/** @typedef {import("../config/defaults").OutputNormalizedWithDefaults} OutputOptions */
/** @typedef {import("../Chunk")} Chunk */
/** @typedef {import("../ChunkGraph")} ChunkGraph */
/** @typedef {import("../CodeGenerationResults")} CodeGenerationResults */
/** @typedef {import("../Compilation").ChunkHashContext} ChunkHashContext */
/** @typedef {import("../Compiler")} Compiler */
/** @typedef {import("../CssModule").Inheritance} Inheritance */
/** @typedef {import("../CssModule").CSSModuleCreateData} CSSModuleCreateData */
/** @typedef {import("../Module")} Module */
/** @typedef {import("../Module").BuildInfo} BuildInfo */
/** @typedef {import("../Module").RuntimeRequirements} RuntimeRequirements */
/** @typedef {import("../Template").RuntimeTemplate} RuntimeTemplate */
/** @typedef {import("../TemplatedPathPlugin").TemplatePath} TemplatePath */
/** @typedef {import("../util/Hash")} Hash */
/** @typedef {import("../Module").BuildMeta} BuildMeta */

/**
 * @typedef {object} RenderContext
 * @property {Chunk} chunk the chunk
 * @property {ChunkGraph} chunkGraph the chunk graph
 * @property {CodeGenerationResults} codeGenerationResults results of code generation
 * @property {RuntimeTemplate} runtimeTemplate the runtime template
 * @property {string} uniqueName the unique name
 * @property {string} undoPath undo path to css file
 * @property {CssModule[]} modules modules
 */

/**
 * @typedef {object} ChunkRenderContext
 * @property {Chunk=} chunk the chunk
 * @property {ChunkGraph=} chunkGraph the chunk graph
 * @property {CodeGenerationResults=} codeGenerationResults results of code generation
 * @property {RuntimeTemplate} runtimeTemplate the runtime template
 * @property {string} undoPath undo path to css file
 * @property {WeakMap<Source, ModuleFactoryCacheEntry>} moduleFactoryCache moduleFactoryCache
 * @property {Source} moduleSourceContent content
 */

/**
 * @typedef {object} CompilationHooks
 * @property {SyncWaterfallHook<[Source, Module, ChunkRenderContext]>} renderModulePackage
 * @property {SyncHook<[Chunk, Hash, ChunkHashContext]>} chunkHash
 */

/**
 * @typedef {object} ModuleFactoryCacheEntry
 * @property {string} undoPath - The undo path to the CSS file
 * @property {Inheritance} inheritance - The inheritance chain
 * @property {CachedSource} source - The cached source
 */

const getCssLoadingRuntimeModule = memoize(() =>
	require("./CssLoadingRuntimeModule")
);

/**
 * @param {string} name name
 * @returns {{ oneOf: [{ $ref: string }], definitions: import("../../schemas/WebpackOptions.json")["definitions"] }} schema
 */
const getSchema = (name) => {
	const { definitions } = require("../../schemas/WebpackOptions.json");

	return {
		definitions,
		oneOf: [{ $ref: `#/definitions/${name}` }]
	};
};

const generatorValidationOptions = {
	name: "Css Modules Plugin",
	baseDataPath: "generator"
};
const validateGeneratorOptions = {
	css: createSchemaValidation(
		require("../../schemas/plugins/css/CssGeneratorOptions.check"),
		() => getSchema("CssGeneratorOptions"),
		generatorValidationOptions
	),
	"css/auto": createSchemaValidation(
		require("../../schemas/plugins/css/CssAutoGeneratorOptions.check"),
		() => getSchema("CssAutoGeneratorOptions"),
		generatorValidationOptions
	),
	"css/module": createSchemaValidation(
		require("../../schemas/plugins/css/CssModuleGeneratorOptions.check"),
		() => getSchema("CssModuleGeneratorOptions"),
		generatorValidationOptions
	),
	"css/global": createSchemaValidation(
		require("../../schemas/plugins/css/CssGlobalGeneratorOptions.check"),
		() => getSchema("CssGlobalGeneratorOptions"),
		generatorValidationOptions
	)
};

const parserValidationOptions = {
	name: "Css Modules Plugin",
	baseDataPath: "parser"
};
const validateParserOptions = {
	css: createSchemaValidation(
		require("../../schemas/plugins/css/CssParserOptions.check"),
		() => getSchema("CssParserOptions"),
		parserValidationOptions
	),
	"css/auto": createSchemaValidation(
		require("../../schemas/plugins/css/CssAutoParserOptions.check"),
		() => getSchema("CssAutoParserOptions"),
		parserValidationOptions
	),
	"css/module": createSchemaValidation(
		require("../../schemas/plugins/css/CssModuleParserOptions.check"),
		() => getSchema("CssModuleParserOptions"),
		parserValidationOptions
	),
	"css/global": createSchemaValidation(
		require("../../schemas/plugins/css/CssGlobalParserOptions.check"),
		() => getSchema("CssGlobalParserOptions"),
		parserValidationOptions
	)
};

/** @type {WeakMap<Compilation, CompilationHooks>} */
const compilationHooksMap = new WeakMap();

const PLUGIN_NAME = "CssModulesPlugin";

class CssModulesPlugin {
	/**
	 * @param {Compilation} compilation the compilation
	 * @returns {CompilationHooks} the attached hooks
	 */
	static getCompilationHooks(compilation) {
		if (!(compilation instanceof Compilation)) {
			throw new TypeError(
				"The 'compilation' argument must be an instance of Compilation"
			);
		}
		let hooks = compilationHooksMap.get(compilation);
		if (hooks === undefined) {
			hooks = {
				renderModulePackage: new SyncWaterfallHook([
					"source",
					"module",
					"renderContext"
				]),
				chunkHash: new SyncHook(["chunk", "hash", "context"])
			};
			compilationHooksMap.set(compilation, hooks);
		}
		return hooks;
	}

	constructor() {
		/** @type {WeakMap<Source, ModuleFactoryCacheEntry>} */
		this._moduleFactoryCache = new WeakMap();
	}

	/**
	 * Apply the plugin
	 * @param {Compiler} compiler the compiler instance
	 * @returns {void}
	 */
	apply(compiler) {
		compiler.hooks.compilation.tap(
			PLUGIN_NAME,
			(compilation, { normalModuleFactory }) => {
				const hooks = CssModulesPlugin.getCompilationHooks(compilation);
				const selfFactory = new SelfModuleFactory(compilation.moduleGraph);
				compilation.dependencyFactories.set(
					CssImportDependency,
					normalModuleFactory
				);
				compilation.dependencyTemplates.set(
					CssImportDependency,
					new CssImportDependency.Template()
				);
				compilation.dependencyFactories.set(
					CssUrlDependency,
					normalModuleFactory
				);
				compilation.dependencyTemplates.set(
					CssUrlDependency,
					new CssUrlDependency.Template()
				);
				compilation.dependencyTemplates.set(
					CssIcssLocalIdentifierDependency,
					new CssIcssLocalIdentifierDependency.Template()
				);
				compilation.dependencyFactories.set(
					CssIcssSelfLocalIdentifierDependency,
					selfFactory
				);
				compilation.dependencyTemplates.set(
					CssIcssSelfLocalIdentifierDependency,
					new CssIcssSelfLocalIdentifierDependency.Template()
				);
				compilation.dependencyFactories.set(
					CssIcssImportDependency,
					normalModuleFactory
				);
				compilation.dependencyTemplates.set(
					CssIcssImportDependency,
					new CssIcssImportDependency.Template()
				);
				compilation.dependencyFactories.set(
					CssIcssFromIdentifierDependency,
					normalModuleFactory
				);
				compilation.dependencyTemplates.set(
					CssIcssFromIdentifierDependency,
					new CssIcssFromIdentifierDependency.Template()
				);
				compilation.dependencyFactories.set(
					CssIcssGlobalIdentifierDependency,
					normalModuleFactory
				);
				compilation.dependencyTemplates.set(
					CssIcssGlobalIdentifierDependency,
					new CssIcssGlobalIdentifierDependency.Template()
				);
				compilation.dependencyTemplates.set(
					CssIcssExportDependency,
					new CssIcssExportDependency.Template()
				);
				compilation.dependencyTemplates.set(
					CssIcssSymbolDependency,
					new CssIcssSymbolDependency.Template()
				);
				compilation.dependencyTemplates.set(
					StaticExportsDependency,
					new StaticExportsDependency.Template()
				);
				for (const type of [
					CSS_MODULE_TYPE,
					CSS_MODULE_TYPE_GLOBAL,
					CSS_MODULE_TYPE_MODULE,
					CSS_MODULE_TYPE_AUTO
				]) {
					normalModuleFactory.hooks.createParser
						.for(type)
						.tap(PLUGIN_NAME, (parserOptions) => {
							validateParserOptions[type](parserOptions);
							const {
								url,
								import: importOption,
								namedExports,
								exportType
							} = parserOptions;

							switch (type) {
								case CSS_MODULE_TYPE:
									return new CssParser({
										importOption,
										url,
										namedExports,
										exportType
									});
								case CSS_MODULE_TYPE_GLOBAL:
									return new CssParser({
										defaultMode: "global",
										importOption,
										url,
										namedExports,
										exportType
									});
								case CSS_MODULE_TYPE_MODULE:
									return new CssParser({
										defaultMode: "local",
										importOption,
										url,
										namedExports,
										exportType
									});
								case CSS_MODULE_TYPE_AUTO:
									return new CssParser({
										defaultMode: "auto",
										importOption,
										url,
										namedExports,
										exportType
									});
							}
						});
					normalModuleFactory.hooks.createGenerator
						.for(type)
						.tap(PLUGIN_NAME, (generatorOptions) => {
							validateGeneratorOptions[type](generatorOptions);

							return new CssGenerator(
								generatorOptions,
								compilation.moduleGraph
							);
						});
					normalModuleFactory.hooks.createModuleClass
						.for(type)
						.tap(PLUGIN_NAME, (createData, resolveData) => {
							if (resolveData.dependencies.length > 0) {
								// When CSS is imported from CSS there is only one dependency
								const dependency = resolveData.dependencies[0];

								if (dependency instanceof CssImportDependency) {
									const parent =
										/** @type {CssModule} */
										(compilation.moduleGraph.getParentModule(dependency));

									if (parent instanceof CssModule) {
										/** @type {import("../CssModule").Inheritance | undefined} */
										let inheritance;

										if (
											parent.cssLayer !== undefined ||
											parent.supports ||
											parent.media
										) {
											if (!inheritance) {
												inheritance = [];
											}

											inheritance.push([
												parent.cssLayer,
												parent.supports,
												parent.media
											]);
										}

										if (parent.inheritance) {
											if (!inheritance) {
												inheritance = [];
											}

											inheritance.push(...parent.inheritance);
										}

										return new CssModule(
											/** @type {CSSModuleCreateData} */
											({
												...createData,
												cssLayer: dependency.layer,
												supports: dependency.supports,
												media: dependency.media,
												inheritance
											})
										);
									}

									return new CssModule(
										/** @type {CSSModuleCreateData} */
										({
											...createData,
											cssLayer: dependency.layer,
											supports: dependency.supports,
											media: dependency.media
										})
									);
								}
							}

							return new CssModule(
								/** @type {CSSModuleCreateData} */
								(createData)
							);
						});

					NormalModule.getCompilationHooks(compilation).processResult.tap(
						PLUGIN_NAME,
						(result, module) => {
							if (module.type === type) {
								const [source, ...rest] = result;

								return [removeBOM(source), ...rest];
							}

							return result;
						}
					);
				}

				JavascriptModulesPlugin.getCompilationHooks(
					compilation
				).renderModuleContent.tap(PLUGIN_NAME, (source, module) => {
					if (module instanceof CssModule && module.hot) {
						const cssData = /** @type {BuildInfo} */ (module.buildInfo).cssData;
						if (!cssData) {
							return source;
						}
						const exports = cssData.exports;
						const stringifiedExports = JSON.stringify(
							JSON.stringify(
								[...exports].reduce((obj, [key, value]) => {
									obj[key] = value;
									return obj;
								}, /** @type {Record<string, string>} */ ({}))
							)
						);

						const hmrCode = Template.asString([
							"",
							`var __webpack_css_exports__ = ${stringifiedExports};`,
							"// only invalidate when locals change",
							"if (module.hot.data && module.hot.data.__webpack_css_exports__ && module.hot.data.__webpack_css_exports__ != __webpack_css_exports__) {",
							Template.indent("module.hot.invalidate();"),
							"} else {",
							Template.indent("module.hot.accept();"),
							"}",
							"module.hot.dispose(function(data) { data.__webpack_css_exports__ = __webpack_css_exports__; });"
						]);

						return new ConcatSource(source, "\n", new RawSource(hmrCode));
					}

					return source;
				});
				const orderedCssModulesPerChunk = new WeakMap();
				compilation.hooks.afterCodeGeneration.tap(PLUGIN_NAME, () => {
					const { chunkGraph } = compilation;
					for (const chunk of compilation.chunks) {
						if (CssModulesPlugin.chunkHasCss(chunk, chunkGraph)) {
							orderedCssModulesPerChunk.set(
								chunk,
								this.getOrderedChunkCssModules(chunk, chunkGraph, compilation)
							);
						}
					}
				});
				compilation.hooks.chunkHash.tap(PLUGIN_NAME, (chunk, hash, context) => {
					hooks.chunkHash.call(chunk, hash, context);
				});
				compilation.hooks.contentHash.tap(PLUGIN_NAME, (chunk) => {
					const {
						chunkGraph,
						moduleGraph,
						runtimeTemplate,
						outputOptions: {
							hashSalt,
							hashDigest,
							hashDigestLength,
							hashFunction
						}
					} = compilation;
					const hash = createHash(hashFunction);
					if (hashSalt) hash.update(hashSalt);
					const codeGenerationResults =
						/** @type {CodeGenerationResults} */
						(compilation.codeGenerationResults);
					hooks.chunkHash.call(chunk, hash, {
						chunkGraph,
						codeGenerationResults,
						moduleGraph,
						runtimeTemplate
					});
					const modules = orderedCssModulesPerChunk.get(chunk);
					if (modules) {
						for (const module of modules) {
							hash.update(chunkGraph.getModuleHash(module, chunk.runtime));
						}
					}
					const digest = hash.digest(hashDigest);
					chunk.contentHash.css = nonNumericOnlyHash(digest, hashDigestLength);
				});
				compilation.hooks.renderManifest.tap(PLUGIN_NAME, (result, options) => {
					const { chunkGraph } = compilation;
					const { hash, chunk, codeGenerationResults, runtimeTemplate } =
						options;

					if (chunk instanceof HotUpdateChunk) return result;

					/** @type {CssModule[] | undefined} */
					const modules = orderedCssModulesPerChunk.get(chunk);
					if (modules !== undefined) {
						const { path: filename, info } = compilation.getPathWithInfo(
							CssModulesPlugin.getChunkFilenameTemplate(
								chunk,
								compilation.outputOptions
							),
							{
								hash,
								runtime: chunk.runtime,
								chunk,
								contentHashType: "css"
							}
						);
						const undoPath = getUndoPath(
							filename,
							compilation.outputOptions.path,
							false
						);
						result.push({
							render: () =>
								this.renderChunk(
									{
										chunk,
										chunkGraph,
										codeGenerationResults,
										uniqueName: compilation.outputOptions.uniqueName,
										undoPath,
										modules,
										runtimeTemplate
									},
									hooks
								),
							filename,
							info,
							identifier: `css${chunk.id}`,
							hash: chunk.contentHash.css
						});
					}
					return result;
				});
				const globalChunkLoading = compilation.outputOptions.chunkLoading;
				/**
				 * @param {Chunk} chunk the chunk
				 * @returns {boolean} true, when enabled
				 */
				const isEnabledForChunk = (chunk) => {
					const options = chunk.getEntryOptions();
					const chunkLoading =
						options && options.chunkLoading !== undefined
							? options.chunkLoading
							: globalChunkLoading;
					return chunkLoading === "jsonp" || chunkLoading === "import";
				};
				const onceForChunkSet = new WeakSet();
				/**
				 * @param {Chunk} chunk chunk to check
				 * @param {RuntimeRequirements} set runtime requirements
				 */
				const handler = (chunk, set) => {
					if (onceForChunkSet.has(chunk)) return;
					onceForChunkSet.add(chunk);
					if (!isEnabledForChunk(chunk)) return;

					const CssLoadingRuntimeModule = getCssLoadingRuntimeModule();
					compilation.addRuntimeModule(chunk, new CssLoadingRuntimeModule(set));
				};
				compilation.hooks.runtimeRequirementInTree
					.for(RuntimeGlobals.hasCssModules)
					.tap(PLUGIN_NAME, handler);
				compilation.hooks.runtimeRequirementInTree
					.for(RuntimeGlobals.ensureChunkHandlers)
					.tap(PLUGIN_NAME, (chunk, set, { chunkGraph }) => {
						if (!isEnabledForChunk(chunk)) return;
						if (
							!chunkGraph.hasModuleInGraph(
								chunk,
								(m) =>
									m.type === CSS_MODULE_TYPE ||
									m.type === CSS_MODULE_TYPE_GLOBAL ||
									m.type === CSS_MODULE_TYPE_MODULE ||
									m.type === CSS_MODULE_TYPE_AUTO
							)
						) {
							return;
						}

						set.add(RuntimeGlobals.hasOwnProperty);
						set.add(RuntimeGlobals.publicPath);
						set.add(RuntimeGlobals.getChunkCssFilename);
					});
				compilation.hooks.runtimeRequirementInTree
					.for(RuntimeGlobals.hmrDownloadUpdateHandlers)
					.tap(PLUGIN_NAME, (chunk, set, { chunkGraph }) => {
						if (!isEnabledForChunk(chunk)) return;
						if (
							!chunkGraph.hasModuleInGraph(
								chunk,
								(m) =>
									m.type === CSS_MODULE_TYPE ||
									m.type === CSS_MODULE_TYPE_GLOBAL ||
									m.type === CSS_MODULE_TYPE_MODULE ||
									m.type === CSS_MODULE_TYPE_AUTO
							)
						) {
							return;
						}
						set.add(RuntimeGlobals.publicPath);
						set.add(RuntimeGlobals.getChunkCssFilename);
					});

				compilation.hooks.runtimeRequirementInTree
					.for(RuntimeGlobals.cssMergeStyleSheets)
					.tap(PLUGIN_NAME, (chunk) => {
						compilation.addRuntimeModule(
							chunk,
							new CssMergeStyleSheetsRuntimeModule()
						);
					});
			}
		);
	}

	/**
	 * @param {Chunk} chunk chunk
	 * @param {Iterable<Module>} modules unordered modules
	 * @param {Compilation} compilation compilation
	 * @returns {Module[]} ordered modules
	 */
	getModulesInOrder(chunk, modules, compilation) {
		if (!modules) return [];

		/** @type {Module[]} */
		const modulesList = [...modules];

		// Get ordered list of modules per chunk group
		// Lists are in reverse order to allow to use Array.pop()
		const modulesByChunkGroup = Array.from(
			chunk.groupsIterable,
			(chunkGroup) => {
				const sortedModules = modulesList
					.map((module) => ({
						module,
						index: chunkGroup.getModulePostOrderIndex(module)
					}))
					.filter((item) => item.index !== undefined)
					.sort(
						(a, b) =>
							/** @type {number} */ (b.index) - /** @type {number} */ (a.index)
					)
					.map((item) => item.module);

				return { list: sortedModules, set: new Set(sortedModules) };
			}
		);

		if (modulesByChunkGroup.length === 1) {
			return modulesByChunkGroup[0].list.reverse();
		}

		const boundCompareModulesByIdOrIdentifier = compareModulesByIdOrIdentifier(
			compilation.chunkGraph
		);

		/**
		 * @param {{ list: Module[] }} a a
		 * @param {{ list: Module[] }} b b
		 * @returns {-1 | 0 | 1} result
		 */
		const compareModuleLists = ({ list: a }, { list: b }) => {
			if (a.length === 0) {
				return b.length === 0 ? 0 : 1;
			}
			if (b.length === 0) return -1;
			return boundCompareModulesByIdOrIdentifier(
				a[a.length - 1],
				b[b.length - 1]
			);
		};

		modulesByChunkGroup.sort(compareModuleLists);

		/** @type {Module[]} */
		const finalModules = [];

		for (;;) {
			const failedModules = new Set();
			const list = modulesByChunkGroup[0].list;
			if (list.length === 0) {
				// done, everything empty
				break;
			}
			/** @type {Module} */
			let selectedModule = list[list.length - 1];
			let hasFailed;
			outer: for (;;) {
				for (const { list, set } of modulesByChunkGroup) {
					if (list.length === 0) continue;
					const lastModule = list[list.length - 1];
					if (lastModule === selectedModule) continue;
					if (!set.has(selectedModule)) continue;
					failedModules.add(selectedModule);
					if (failedModules.has(lastModule)) {
						// There is a conflict, try other alternatives
						hasFailed = lastModule;
						continue;
					}
					selectedModule = lastModule;
					hasFailed = false;
					continue outer; // restart
				}
				break;
			}
			if (hasFailed) {
				// There is a not resolve-able conflict with the selectedModule
				// TODO print better warning
				compilation.warnings.push(
					new WebpackError(
						`chunk ${chunk.name || chunk.id}\nConflicting order between ${
							/** @type {Module} */
							(hasFailed).readableIdentifier(compilation.requestShortener)
						} and ${selectedModule.readableIdentifier(
							compilation.requestShortener
						)}`
					)
				);
				selectedModule = /** @type {Module} */ (hasFailed);
			}
			// Insert the selected module into the final modules list
			finalModules.push(selectedModule);
			// Remove the selected module from all lists
			for (const { list, set } of modulesByChunkGroup) {
				const lastModule = list[list.length - 1];
				if (lastModule === selectedModule) {
					list.pop();
				} else if (hasFailed && set.has(selectedModule)) {
					const idx = list.indexOf(selectedModule);
					if (idx >= 0) list.splice(idx, 1);
				}
			}
			modulesByChunkGroup.sort(compareModuleLists);
		}
		return finalModules;
	}

	/**
	 * @param {Chunk} chunk chunk
	 * @param {ChunkGraph} chunkGraph chunk graph
	 * @param {Compilation} compilation compilation
	 * @returns {Module[]} ordered css modules
	 */
	getOrderedChunkCssModules(chunk, chunkGraph, compilation) {
		return [
			...this.getModulesInOrder(
				chunk,
				/** @type {Iterable<Module>} */
				(
					chunkGraph.getOrderedChunkModulesIterableBySourceType(
						chunk,
						"css-import",
						compareModulesByIdOrIdentifier(chunkGraph)
					)
				),
				compilation
			),
			...this.getModulesInOrder(
				chunk,
				/** @type {Iterable<Module>} */
				(
					chunkGraph.getOrderedChunkModulesIterableBySourceType(
						chunk,
						"css",
						compareModulesByIdOrIdentifier(chunkGraph)
					)
				),
				compilation
			)
		];
	}

	/**
	 * @param {CssModule} module css module
	 * @param {ChunkRenderContext} renderContext options object
	 * @param {CompilationHooks} hooks hooks
	 * @returns {Source | null} css module source
	 */
	static renderModule(module, renderContext, hooks) {
		const { undoPath, moduleFactoryCache, moduleSourceContent } = renderContext;
		const cacheEntry = moduleFactoryCache.get(moduleSourceContent);

		/** @type {Inheritance} */
		const inheritance = [[module.cssLayer, module.supports, module.media]];
		if (module.inheritance) {
			inheritance.push(...module.inheritance);
		}

		let source;
		if (
			cacheEntry &&
			cacheEntry.undoPath === undoPath &&
			cacheEntry.inheritance.every(([layer, supports, media], i) => {
				const item = inheritance[i];
				if (Array.isArray(item)) {
					return layer === item[0] && supports === item[1] && media === item[2];
				}
				return false;
			})
		) {
			source = cacheEntry.source;
		} else {
			if (!moduleSourceContent) return null;
			const moduleSourceCode =
				/** @type {string} */
				(moduleSourceContent.source());
			const publicPathAutoRegex = new RegExp(
				CssUrlDependency.PUBLIC_PATH_AUTO,
				"g"
			);
			/** @type {Source} */
			let moduleSource = new ReplaceSource(moduleSourceContent);
			let match;
			while ((match = publicPathAutoRegex.exec(moduleSourceCode))) {
				/** @type {ReplaceSource} */ (moduleSource).replace(
					match.index,
					(match.index += match[0].length - 1),
					undoPath
				);
			}

			for (let i = 0; i < inheritance.length; i++) {
				const layer = inheritance[i][0];
				const supports = inheritance[i][1];
				const media = inheritance[i][2];

				if (media) {
					moduleSource = new ConcatSource(
						`@media ${media} {\n`,
						new PrefixSource("\t", moduleSource),
						"}\n"
					);
				}

				if (supports) {
					moduleSource = new ConcatSource(
						`@supports (${supports}) {\n`,
						new PrefixSource("\t", moduleSource),
						"}\n"
					);
				}

				// Layer can be anonymous
				if (layer !== undefined && layer !== null) {
					moduleSource = new ConcatSource(
						`@layer${layer ? ` ${layer}` : ""} {\n`,
						new PrefixSource("\t", moduleSource),
						"}\n"
					);
				}
			}

			if (moduleSource) {
				moduleSource = new ConcatSource(moduleSource, "\n");
			}

			source = new CachedSource(moduleSource);
			moduleFactoryCache.set(moduleSourceContent, {
				inheritance,
				undoPath,
				source
			});
		}

		return tryRunOrWebpackError(
			() => hooks.renderModulePackage.call(source, module, renderContext),
			"CssModulesPlugin.getCompilationHooks().renderModulePackage"
		);
	}

	/**
	 * @param {RenderContext} renderContext the render context
	 * @param {CompilationHooks} hooks hooks
	 * @returns {Source} generated source
	 */
	renderChunk(
		{
			undoPath,
			chunk,
			codeGenerationResults,
			modules,
			runtimeTemplate,
			chunkGraph
		},
		hooks
	) {
		const source = new ConcatSource();
		for (const module of modules) {
			try {
				const codeGenResult = codeGenerationResults.get(module, chunk.runtime);
				const moduleSourceContent =
					/** @type {Source} */
					(
						codeGenResult.sources.get("css") ||
							codeGenResult.sources.get("css-import")
					);
				const moduleSource = CssModulesPlugin.renderModule(
					module,
					{
						undoPath,
						chunk,
						chunkGraph,
						codeGenerationResults,
						moduleSourceContent,
						moduleFactoryCache: this._moduleFactoryCache,
						runtimeTemplate
					},
					hooks
				);
				if (moduleSource) {
					source.add(moduleSource);
				}
			} catch (err) {
				/** @type {Error} */
				(err).message += `\nduring rendering of css ${module.identifier()}`;
				throw err;
			}
		}
		chunk.rendered = true;
		return source;
	}

	/**
	 * @param {Chunk} chunk chunk
	 * @param {OutputOptions} outputOptions output options
	 * @returns {TemplatePath} used filename template
	 */
	static getChunkFilenameTemplate(chunk, outputOptions) {
		if (chunk.cssFilenameTemplate) {
			return chunk.cssFilenameTemplate;
		} else if (chunk.canBeInitial()) {
			return outputOptions.cssFilename;
		}
		return outputOptions.cssChunkFilename;
	}

	/**
	 * @param {Chunk} chunk chunk
	 * @param {ChunkGraph} chunkGraph chunk graph
	 * @returns {boolean} true, when the chunk has css
	 */
	static chunkHasCss(chunk, chunkGraph) {
		return (
			Boolean(chunkGraph.getChunkModulesIterableBySourceType(chunk, "css")) ||
			Boolean(
				chunkGraph.getChunkModulesIterableBySourceType(chunk, "css-import")
			)
		);
	}
}

module.exports = CssModulesPlugin;
