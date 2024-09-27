/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

"use strict";

const { SyncWaterfallHook, SyncHook } = require("tapable");
const {
	ConcatSource,
	PrefixSource,
	ReplaceSource,
	CachedSource
} = require("webpack-sources");
const Compilation = require("../Compilation");
const CssModule = require("../CssModule");
const ExternalModule = require("../ExternalModule");
const { tryRunOrWebpackError } = require("../HookWebpackError");
const HotUpdateChunk = require("../HotUpdateChunk");
const {
	CSS_MODULE_TYPE,
	CSS_MODULE_TYPE_GLOBAL,
	CSS_MODULE_TYPE_MODULE,
	CSS_MODULE_TYPE_AUTO
} = require("../ModuleTypeConstants");
const RuntimeGlobals = require("../RuntimeGlobals");
const SelfModuleFactory = require("../SelfModuleFactory");
const WebpackError = require("../WebpackError");
const CssExportDependency = require("../dependencies/CssExportDependency");
const CssImportDependency = require("../dependencies/CssImportDependency");
const CssLocalIdentifierDependency = require("../dependencies/CssLocalIdentifierDependency");
const CssSelfLocalIdentifierDependency = require("../dependencies/CssSelfLocalIdentifierDependency");
const CssUrlDependency = require("../dependencies/CssUrlDependency");
const StaticExportsDependency = require("../dependencies/StaticExportsDependency");
const URLDependency = require("../dependencies/URLDependency");
const { compareModulesByIdentifier } = require("../util/comparators");
const createSchemaValidation = require("../util/create-schema-validation");
const createHash = require("../util/createHash");
const { getUndoPath } = require("../util/identifier");
const memoize = require("../util/memoize");
const nonNumericOnlyHash = require("../util/nonNumericOnlyHash");
const CssExportsGenerator = require("./CssExportsGenerator");
const CssGenerator = require("./CssGenerator");
const CssParser = require("./CssParser");

/** @typedef {import("webpack-sources").Source} Source */
/** @typedef {import("../../declarations/WebpackOptions").OutputNormalized} OutputOptions */
/** @typedef {import("../Chunk")} Chunk */
/** @typedef {import("../ChunkGraph")} ChunkGraph */
/** @typedef {import("../CodeGenerationResults")} CodeGenerationResults */
/** @typedef {import("../Compilation").ChunkHashContext} ChunkHashContext */
/** @typedef {import("../Compiler")} Compiler */
/** @typedef {import("../CssModule").Inheritance} Inheritance */
/** @typedef {import("../DependencyTemplate").CssExportsData} CssExportsData */
/** @typedef {import("../ExternalModule").CssImportDependencyMeta} CssImportDependencyMeta */
/** @typedef {import("../Module")} Module */
/** @typedef {import("../Template").RuntimeTemplate} RuntimeTemplate */
/** @typedef {import("../TemplatedPathPlugin").TemplatePath} TemplatePath */
/** @typedef {import("../util/Hash")} Hash */
/** @typedef {import("../util/memoize")} Memoize */

/**
 * @typedef {object} ChunkRenderContext
 * @property {RuntimeTemplate} runtimeTemplate runtime template
 */

/**
 * @typedef {object} CompilationHooks
 * @property {SyncWaterfallHook<[Source, Module, ChunkRenderContext]>} renderModulePackage
 * @property {SyncHook<[Chunk, Hash, ChunkHashContext]>} chunkHash
 */

const getCssLoadingRuntimeModule = memoize(() =>
	require("./CssLoadingRuntimeModule")
);

/**
 * @param {string} name name
 * @returns {{oneOf: [{$ref: string}], definitions: *}} schema
 */
const getSchema = name => {
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
		require("../../schemas/plugins/css/CssGeneratorOptions.check.js"),
		() => getSchema("CssGeneratorOptions"),
		generatorValidationOptions
	),
	"css/auto": createSchemaValidation(
		require("../../schemas/plugins/css/CssAutoGeneratorOptions.check.js"),
		() => getSchema("CssAutoGeneratorOptions"),
		generatorValidationOptions
	),
	"css/module": createSchemaValidation(
		require("../../schemas/plugins/css/CssModuleGeneratorOptions.check.js"),
		() => getSchema("CssModuleGeneratorOptions"),
		generatorValidationOptions
	),
	"css/global": createSchemaValidation(
		require("../../schemas/plugins/css/CssGlobalGeneratorOptions.check.js"),
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
		require("../../schemas/plugins/css/CssParserOptions.check.js"),
		() => getSchema("CssParserOptions"),
		parserValidationOptions
	),
	"css/auto": createSchemaValidation(
		require("../../schemas/plugins/css/CssAutoParserOptions.check.js"),
		() => getSchema("CssAutoParserOptions"),
		parserValidationOptions
	),
	"css/module": createSchemaValidation(
		require("../../schemas/plugins/css/CssModuleParserOptions.check.js"),
		() => getSchema("CssModuleParserOptions"),
		parserValidationOptions
	),
	"css/global": createSchemaValidation(
		require("../../schemas/plugins/css/CssGlobalParserOptions.check.js"),
		() => getSchema("CssGlobalParserOptions"),
		parserValidationOptions
	)
};

/** @type {WeakMap<Compilation, CompilationHooks>} */
const compilationHooksMap = new WeakMap();

/**
 * @param {string} str string
 * @param {boolean=} omitOptionalUnderscore if true, optional underscore is not added
 * @returns {string} escaped string
 */
const escapeCss = (str, omitOptionalUnderscore) => {
	const escaped = `${str}`.replace(
		// cspell:word uffff
		/[^a-zA-Z0-9_\u0081-\uFFFF-]/g,
		s => `\\${s}`
	);
	return !omitOptionalUnderscore && /^(?!--)[0-9_-]/.test(escaped)
		? `_${escaped}`
		: escaped;
};

/**
 * @param {string} str string
 * @returns {string} encoded string
 */
const lzwEncode = str => {
	/** @type {Map<string, string>} */
	const map = new Map();
	let encoded = "";
	let phrase = str[0];
	let code = 256;
	const maxCode = "\uFFFF".charCodeAt(0);
	for (let i = 1; i < str.length; i++) {
		const c = str[i];
		if (map.has(phrase + c)) {
			phrase += c;
		} else {
			encoded += phrase.length > 1 ? map.get(phrase) : phrase;
			map.set(phrase + c, String.fromCharCode(code));
			phrase = c;
			if (++code > maxCode) {
				code = 256;
				map.clear();
			}
		}
	}
	encoded += phrase.length > 1 ? map.get(phrase) : phrase;
	return encoded;
};

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
		/** @type {WeakMap<Source, { undoPath: string, inheritance: Inheritance, source: CachedSource }>} */
		this._moduleCache = new WeakMap();
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
					CssUrlDependency,
					normalModuleFactory
				);
				compilation.dependencyTemplates.set(
					CssUrlDependency,
					new CssUrlDependency.Template()
				);
				compilation.dependencyTemplates.set(
					CssLocalIdentifierDependency,
					new CssLocalIdentifierDependency.Template()
				);
				compilation.dependencyFactories.set(
					CssSelfLocalIdentifierDependency,
					selfFactory
				);
				compilation.dependencyTemplates.set(
					CssSelfLocalIdentifierDependency,
					new CssSelfLocalIdentifierDependency.Template()
				);
				compilation.dependencyTemplates.set(
					CssExportDependency,
					new CssExportDependency.Template()
				);
				compilation.dependencyFactories.set(
					CssImportDependency,
					normalModuleFactory
				);
				compilation.dependencyTemplates.set(
					CssImportDependency,
					new CssImportDependency.Template()
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
						.tap(PLUGIN_NAME, parserOptions => {
							validateParserOptions[type](parserOptions);
							const { namedExports } = parserOptions;

							switch (type) {
								case CSS_MODULE_TYPE_GLOBAL:
								case CSS_MODULE_TYPE_AUTO:
									return new CssParser({
										namedExports
									});
								case CSS_MODULE_TYPE:
									return new CssParser({
										allowModeSwitch: false,
										namedExports
									});
								case CSS_MODULE_TYPE_MODULE:
									return new CssParser({
										defaultMode: "local",
										namedExports
									});
							}
						});
					normalModuleFactory.hooks.createGenerator
						.for(type)
						.tap(PLUGIN_NAME, generatorOptions => {
							validateGeneratorOptions[type](generatorOptions);

							return generatorOptions.exportsOnly
								? new CssExportsGenerator(
										generatorOptions.exportsConvention,
										generatorOptions.localIdentName,
										generatorOptions.esModule
									)
								: new CssGenerator(
										generatorOptions.exportsConvention,
										generatorOptions.localIdentName,
										generatorOptions.esModule
									);
						});
					normalModuleFactory.hooks.createModuleClass
						.for(type)
						.tap(PLUGIN_NAME, (createData, resolveData) => {
							if (resolveData.dependencies.length > 0) {
								// When CSS is imported from CSS there is only one dependency
								const dependency = resolveData.dependencies[0];

								if (dependency instanceof URLDependency) {
									return new CssModule({
										...createData,
										URLRequest: createData.request,
										isURLEntry: true
									});
								}
								if (dependency instanceof CssImportDependency) {
									const parent =
										/** @type {CssModule} */
										(compilation.moduleGraph.getParentModule(dependency));

									if (parent instanceof CssModule) {
										/** @type {import("../CssModule").Inheritance | undefined} */
										let inheritance;
										let URLRequest;

										if (
											(parent.cssLayer !== null &&
												parent.cssLayer !== undefined) ||
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

										if (parent.URLRequest) {
											URLRequest = parent.URLRequest;
										}
										return new CssModule({
											...createData,
											cssLayer: dependency.layer,
											supports: dependency.supports,
											media: dependency.media,
											inheritance,
											URLRequest
										});
									}

									return new CssModule({
										...createData,
										cssLayer: dependency.layer,
										supports: dependency.supports,
										media: dependency.media
									});
								}
							}

							return new CssModule(createData);
						});
				}
				const orderedCssModulesPerChunk = new WeakMap();
				compilation.hooks.afterCodeGeneration.tap("CssModulesPlugin", () => {
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
				compilation.hooks.chunkHash.tap(
					"CssModulesPlugin",
					(chunk, hash, context) => {
						hooks.chunkHash.call(chunk, hash, context);
					}
				);
				compilation.hooks.contentHash.tap("CssModulesPlugin", chunk => {
					const {
						chunkGraph,
						codeGenerationResults,
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
					const digest = /** @type {string} */ (hash.digest(hashDigest));
					chunk.contentHash.css = nonNumericOnlyHash(digest, hashDigestLength);
				});
				compilation.hooks.renderManifest.tap(PLUGIN_NAME, (result, options) => {
					const { chunkGraph } = compilation;
					const { hash, chunk, codeGenerationResults, runtimeTemplate } =
						options;

					if (chunk instanceof HotUpdateChunk) return result;

					/** @type {CssModule[] | ExternalModule[] | undefined} */
					const modules = orderedCssModulesPerChunk.get(chunk);
					if (modules !== undefined) {
						// modules not imported by 'new URL'
						const modulesExcludeFromURL = [];
						// entry module is the module created by URLDependency
						// modules are all the modules that are imported by the entry module through cssImportDependency.
						/** @type {Map<string, {modules: (CssModule|ExternalModule)[], entry?: CssModule}>} */
						const URLRequestModulesMap = new Map();
						// Group modules by 'new URL'
						for (const module of modules) {
							const URLRequest =
								(module instanceof CssModule && module.URLRequest) ||
								(module instanceof ExternalModule &&
									/** @type {CssImportDependencyMeta} */ (module.dependencyMeta)
										.URLRequest);
							if (URLRequest) {
								const URLRequestModules = URLRequestModulesMap.get(URLRequest);
								if (!URLRequestModules)
									URLRequestModulesMap.set(URLRequest, {
										modules: [module]
									});
								else URLRequestModules.modules.push(module);
								if (module instanceof CssModule && module.isURLEntry) {
									const URLRequestModules = URLRequestModulesMap.get(
										module.URLRequest
									);
									URLRequestModules.entry = module;
								}
							} else modulesExcludeFromURL.push(module);
						}

						// avoid duplicate css files
						/** @type {Set<string>} */
						const fullContentHashSet = new Set();
						// Generate CSS files for each 'new URL'
						for (const [_, URLRequestModules] of URLRequestModulesMap) {
							const data = codeGenerationResults.get(
								URLRequestModules.entry,
								chunk.runtime
							).data;
							const filename =
								URLRequestModules.entry.buildInfo.filename ||
								data.get("filename");
							const info =
								URLRequestModules.entry.buildInfo.assetInfo ||
								data.get("assetInfo");
							const fullContentHash =
								URLRequestModules.entry.buildInfo.fullContentHash ||
								data.get("fullContentHash");
							if (fullContentHashSet.has(fullContentHash)) continue;
							const undoPath = getUndoPath(
								filename,
								compilation.outputOptions.path,
								false
							);
							result.push({
								render: () =>
									this.renderChunk({
										chunk,
										chunkGraph,
										codeGenerationResults,
										uniqueName: compilation.outputOptions.uniqueName,
										cssHeadDataCompression:
											compilation.outputOptions.cssHeadDataCompression,
										undoPath,
										modules: URLRequestModules.modules,
										hooks,
										runtimeTemplate
									}),
								filename,
								info,
								identifier: `css${chunkGraph.getModuleId(URLRequestModules.entry)}`,
								hash: fullContentHash
							});
							fullContentHashSet.add(fullContentHash);
						}
						if (modulesExcludeFromURL.length) {
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
									this.renderChunk({
										chunk,
										chunkGraph,
										codeGenerationResults,
										uniqueName: compilation.outputOptions.uniqueName,
										cssHeadDataCompression:
											compilation.outputOptions.cssHeadDataCompression,
										undoPath,
										modules: modulesExcludeFromURL,
										runtimeTemplate,
										hooks
									}),
								filename,
								info,
								identifier: `css${chunk.id}`,
								hash: chunk.contentHash.css
							});
						}
					}
					return result;
				});
				const globalChunkLoading = compilation.outputOptions.chunkLoading;
				/**
				 * @param {Chunk} chunk the chunk
				 * @returns {boolean} true, when enabled
				 */
				const isEnabledForChunk = chunk => {
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
				 * @param {Set<string>} set runtime requirements
				 */
				const handler = (chunk, set) => {
					if (onceForChunkSet.has(chunk)) return;
					onceForChunkSet.add(chunk);
					if (!isEnabledForChunk(chunk)) return;

					set.add(RuntimeGlobals.publicPath);
					set.add(RuntimeGlobals.getChunkCssFilename);
					set.add(RuntimeGlobals.hasOwnProperty);
					set.add(RuntimeGlobals.moduleFactoriesAddOnly);
					set.add(RuntimeGlobals.makeNamespaceObject);

					const CssLoadingRuntimeModule = getCssLoadingRuntimeModule();
					compilation.addRuntimeModule(chunk, new CssLoadingRuntimeModule(set));
				};
				compilation.hooks.runtimeRequirementInTree
					.for(RuntimeGlobals.hasCssModules)
					.tap(PLUGIN_NAME, handler);
				compilation.hooks.runtimeRequirementInTree
					.for(RuntimeGlobals.ensureChunkHandlers)
					.tap(PLUGIN_NAME, handler);
				compilation.hooks.runtimeRequirementInTree
					.for(RuntimeGlobals.hmrDownloadUpdateHandlers)
					.tap(PLUGIN_NAME, handler);
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
		const modulesByChunkGroup = Array.from(chunk.groupsIterable, chunkGroup => {
			const sortedModules = modulesList
				.map(module => ({
					module,
					index: chunkGroup.getModulePostOrderIndex(module)
				}))
				.filter(item => item.index !== undefined)
				.sort(
					(a, b) =>
						/** @type {number} */ (b.index) - /** @type {number} */ (a.index)
				)
				.map(item => item.module);

			return { list: sortedModules, set: new Set(sortedModules) };
		});

		if (modulesByChunkGroup.length === 1)
			return modulesByChunkGroup[0].list.reverse();

		const compareModuleLists = ({ list: a }, { list: b }) => {
			if (a.length === 0) {
				return b.length === 0 ? 0 : 1;
			}
			if (b.length === 0) return -1;
			return compareModulesByIdentifier(a[a.length - 1], b[b.length - 1]);
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
				if (lastModule === selectedModule) list.pop();
				else if (hasFailed && set.has(selectedModule)) {
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
						compareModulesByIdentifier
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
						compareModulesByIdentifier
					)
				),
				compilation
			)
		];
	}

	/**
	 * @param {object} options options
	 * @param {string[]} options.metaData meta data
	 * @param {string} options.undoPath undo path for public path auto
	 * @param {Chunk} options.chunk chunk
	 * @param {ChunkGraph} options.chunkGraph chunk graph
	 * @param {CodeGenerationResults} options.codeGenerationResults code generation results
	 * @param {CssModule | ExternalModule} options.module css module
	 * @param {RuntimeTemplate} options.runtimeTemplate runtime template
	 * @param {CompilationHooks} options.hooks hooks
	 * @returns {Source} css module source
	 */
	renderModule({
		metaData,
		undoPath,
		chunk,
		chunkGraph,
		codeGenerationResults,
		module,
		hooks,
		runtimeTemplate
	}) {
		const codeGenResult = codeGenerationResults.get(module, chunk.runtime);
		const moduleSourceContent =
			/** @type {Source} */
			(
				codeGenResult.sources.get("css") ||
					codeGenResult.sources.get("css-import")
			);

		const cacheEntry = this._moduleCache.get(moduleSourceContent);

		/** @type {Inheritance} */
		const inheritance =
			module instanceof CssModule
				? [[module.cssLayer, module.supports, module.media]]
				: [];
		if (module instanceof CssModule && module.inheritance) {
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
			const moduleSourceCode = /** @type {string} */ (
				moduleSourceContent.source()
			);
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
			this._moduleCache.set(moduleSourceContent, {
				inheritance,
				undoPath,
				source
			});
		}
		/** @type {CssExportsData | undefined} */
		const cssExportsData =
			codeGenResult.data && codeGenResult.data.get("css-exports");
		const exports = cssExportsData && cssExportsData.exports;
		const esModule = cssExportsData && cssExportsData.esModule;
		let moduleId = String(chunkGraph.getModuleId(module));

		// When `optimization.moduleIds` is `named` the module id is a path, so we need to normalize it between platforms
		if (typeof moduleId === "string") {
			moduleId = moduleId.replace(/\\/g, "/");
		}

		metaData.push(
			`${
				exports
					? Array.from(
							exports,
							([n, v]) => `${escapeCss(n)}:${escapeCss(v)}/`
						).join("")
					: ""
			}${esModule ? "&" : ""}${escapeCss(moduleId)}`
		);
		return tryRunOrWebpackError(
			() =>
				hooks.renderModulePackage.call(source, module, {
					runtimeTemplate
				}),
			"CssModulesPlugin.getCompilationHooks().renderModulePackage"
		);
	}

	/**
	 * @param {object} options options
	 * @param {string | undefined} options.uniqueName unique name
	 * @param {boolean | undefined} options.cssHeadDataCompression compress css head data
	 * @param {string} options.undoPath undo path for public path auto
	 * @param {Chunk} options.chunk chunk
	 * @param {ChunkGraph} options.chunkGraph chunk graph
	 * @param {CodeGenerationResults} options.codeGenerationResults code generation results
	 * @param {(CssModule | ExternalModule)[]} options.modules ordered css modules
	 * @param {RuntimeTemplate} options.runtimeTemplate runtime template
	 * @param {CompilationHooks} options.hooks hooks
	 * @returns {Source} generated source
	 */
	renderChunk({
		uniqueName,
		cssHeadDataCompression,
		undoPath,
		chunk,
		chunkGraph,
		codeGenerationResults,
		modules,
		runtimeTemplate,
		hooks
	}) {
		const source = new ConcatSource();
		/** @type {string[]} */
		const metaData = [];
		for (const module of modules) {
			try {
				const moduleSource = this.renderModule({
					metaData,
					undoPath,
					chunk,
					chunkGraph,
					codeGenerationResults,
					module,
					runtimeTemplate,
					hooks
				});
				source.add(moduleSource);
			} catch (err) {
				/** @type {Error} */
				(err).message += `\nduring rendering of css ${module.identifier()}`;
				throw err;
			}
		}
		const metaDataStr = metaData.join(",");
		source.add(
			`head{--webpack-${escapeCss(
				(uniqueName ? `${uniqueName}-` : "") + chunk.id,
				true
			)}:${cssHeadDataCompression ? lzwEncode(metaDataStr) : metaDataStr};}`
		);
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
			return /** @type {TemplatePath} */ (outputOptions.cssFilename);
		}
		return /** @type {TemplatePath} */ (outputOptions.cssChunkFilename);
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
