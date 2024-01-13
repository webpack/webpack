/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

"use strict";

const { ConcatSource, PrefixSource } = require("webpack-sources");
const CssModule = require("../CssModule");
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
const { compareModulesByIdentifier } = require("../util/comparators");
const createSchemaValidation = require("../util/create-schema-validation");
const createHash = require("../util/createHash");
const memoize = require("../util/memoize");
const nonNumericOnlyHash = require("../util/nonNumericOnlyHash");
const CssExportsGenerator = require("./CssExportsGenerator");
const CssGenerator = require("./CssGenerator");
const CssParser = require("./CssParser");

/** @typedef {import("webpack-sources").Source} Source */
/** @typedef {import("../../declarations/WebpackOptions").Output} OutputOptions */
/** @typedef {import("../Chunk")} Chunk */
/** @typedef {import("../ChunkGraph")} ChunkGraph */
/** @typedef {import("../CodeGenerationResults")} CodeGenerationResults */
/** @typedef {import("../Compilation")} Compilation */
/** @typedef {import("../Compiler")} Compiler */
/** @typedef {import("../Module")} Module */
/** @typedef {import("../util/memoize")} Memoize */

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

/**
 * @param {string} str string
 * @param {boolean=} omitOptionalUnderscore if true, optional underscore is not added
 * @returns {string} escaped string
 */
const escapeCss = (str, omitOptionalUnderscore) => {
	const escaped = `${str}`.replace(
		// cspell:word uffff
		/[^a-zA-Z0-9_\u0081-\uffff-]/g,
		s => `\\${s}`
	);
	return !omitOptionalUnderscore && /^(?!--)[0-9_-]/.test(escaped)
		? `_${escaped}`
		: escaped;
};

const plugin = "CssModulesPlugin";

class CssModulesPlugin {
	/**
	 * Apply the plugin
	 * @param {Compiler} compiler the compiler instance
	 * @returns {void}
	 */
	apply(compiler) {
		compiler.hooks.compilation.tap(
			plugin,
			(compilation, { normalModuleFactory }) => {
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
						.tap(plugin, parserOptions => {
							validateParserOptions[type](parserOptions);
							const { namedExports } = parserOptions;

							switch (type) {
								case CSS_MODULE_TYPE:
								case CSS_MODULE_TYPE_AUTO:
									return new CssParser({
										namedExports
									});
								case CSS_MODULE_TYPE_GLOBAL:
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
						.tap(plugin, generatorOptions => {
							validateGeneratorOptions[type](generatorOptions);

							return generatorOptions.exportsOnly
								? new CssExportsGenerator()
								: new CssGenerator();
						});
					normalModuleFactory.hooks.createModuleClass
						.for(type)
						.tap(plugin, (createData, resolveData) => {
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

										return new CssModule({
											...createData,
											cssLayer: dependency.layer,
											supports: dependency.supports,
											media: dependency.media,
											inheritance
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
				compilation.hooks.contentHash.tap("CssModulesPlugin", chunk => {
					const {
						chunkGraph,
						outputOptions: {
							hashSalt,
							hashDigest,
							hashDigestLength,
							hashFunction
						}
					} = compilation;
					const modules = orderedCssModulesPerChunk.get(chunk);
					if (modules === undefined) return;
					const hash = createHash(hashFunction);
					if (hashSalt) hash.update(hashSalt);
					for (const module of modules) {
						hash.update(chunkGraph.getModuleHash(module, chunk.runtime));
					}
					const digest = /** @type {string} */ (hash.digest(hashDigest));
					chunk.contentHash.css = nonNumericOnlyHash(digest, hashDigestLength);
				});
				compilation.hooks.renderManifest.tap(plugin, (result, options) => {
					const { chunkGraph } = compilation;
					const { hash, chunk, codeGenerationResults } = options;

					if (chunk instanceof HotUpdateChunk) return result;

					/** @type {CssModule[] | undefined} */
					const modules = orderedCssModulesPerChunk.get(chunk);
					if (modules !== undefined) {
						result.push({
							render: () =>
								this.renderChunk({
									chunk,
									chunkGraph,
									codeGenerationResults,
									uniqueName: compilation.outputOptions.uniqueName,
									modules
								}),
							filenameTemplate: CssModulesPlugin.getChunkFilenameTemplate(
								chunk,
								compilation.outputOptions
							),
							pathOptions: {
								hash,
								runtime: chunk.runtime,
								chunk,
								contentHashType: "css"
							},
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
				const isEnabledForChunk = chunk => {
					const options = chunk.getEntryOptions();
					const chunkLoading =
						options && options.chunkLoading !== undefined
							? options.chunkLoading
							: globalChunkLoading;
					return chunkLoading === "jsonp";
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
					.tap(plugin, handler);
				compilation.hooks.runtimeRequirementInTree
					.for(RuntimeGlobals.ensureChunkHandlers)
					.tap(plugin, handler);
				compilation.hooks.runtimeRequirementInTree
					.for(RuntimeGlobals.hmrDownloadUpdateHandlers)
					.tap(plugin, handler);
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
				.map(module => {
					return {
						module,
						index: chunkGroup.getModulePostOrderIndex(module)
					};
				})
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
			} else {
				if (b.length === 0) return -1;
				return compareModulesByIdentifier(a[a.length - 1], b[b.length - 1]);
			}
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
			let hasFailed = undefined;
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
				if (compilation) {
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
				}
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
	 * @param {Object} options options
	 * @param {string | undefined} options.uniqueName unique name
	 * @param {Chunk} options.chunk chunk
	 * @param {ChunkGraph} options.chunkGraph chunk graph
	 * @param {CodeGenerationResults} options.codeGenerationResults code generation results
	 * @param {CssModule[]} options.modules ordered css modules
	 * @returns {Source} generated source
	 */
	renderChunk({
		uniqueName,
		chunk,
		chunkGraph,
		codeGenerationResults,
		modules
	}) {
		const source = new ConcatSource();
		/** @type {string[]} */
		const metaData = [];
		for (const module of modules) {
			try {
				const codeGenResult = codeGenerationResults.get(module, chunk.runtime);

				let moduleSource =
					/** @type {Source} */
					(
						codeGenResult.sources.get("css") ||
							codeGenResult.sources.get("css-import")
					);

				let inheritance = [[module.cssLayer, module.supports, module.media]];

				if (module.inheritance) {
					inheritance.push(...module.inheritance);
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
					source.add(moduleSource);
					source.add("\n");
				}
				/** @type {Map<string, string> | undefined} */
				const exports =
					codeGenResult.data && codeGenResult.data.get("css-exports");
				let moduleId = chunkGraph.getModuleId(module) + "";

				// When `optimization.moduleIds` is `named` the module id is a path, so we need to normalize it between platforms
				if (typeof moduleId === "string") {
					moduleId = moduleId.replace(/\\/g, "/");
				}

				metaData.push(
					`${
						exports
							? Array.from(exports, ([n, v]) => {
									const shortcutValue = `${
										uniqueName ? uniqueName + "-" : ""
									}${moduleId}-${n}`;
									return v === shortcutValue
										? `${escapeCss(n)}/`
										: v === "--" + shortcutValue
											? `${escapeCss(n)}%`
											: `${escapeCss(n)}(${escapeCss(v)})`;
								}).join("")
							: ""
					}${escapeCss(moduleId)}`
				);
			} catch (e) {
				/** @type {Error} */
				(e).message += `\nduring rendering of css ${module.identifier()}`;
				throw e;
			}
		}
		source.add(
			`head{--webpack-${escapeCss(
				(uniqueName ? uniqueName + "-" : "") + chunk.id,
				true
			)}:${metaData.join(",")};}`
		);
		return source;
	}

	/**
	 * @param {Chunk} chunk chunk
	 * @param {OutputOptions} outputOptions output options
	 * @returns {Chunk["cssFilenameTemplate"] | OutputOptions["cssFilename"] | OutputOptions["cssChunkFilename"]} used filename template
	 */
	static getChunkFilenameTemplate(chunk, outputOptions) {
		if (chunk.cssFilenameTemplate) {
			return chunk.cssFilenameTemplate;
		} else if (chunk.canBeInitial()) {
			return outputOptions.cssFilename;
		} else {
			return outputOptions.cssChunkFilename;
		}
	}

	/**
	 * @param {Chunk} chunk chunk
	 * @param {ChunkGraph} chunkGraph chunk graph
	 * @returns {boolean} true, when the chunk has css
	 */
	static chunkHasCss(chunk, chunkGraph) {
		return (
			!!chunkGraph.getChunkModulesIterableBySourceType(chunk, "css") ||
			!!chunkGraph.getChunkModulesIterableBySourceType(chunk, "css-import")
		);
	}
}

module.exports = CssModulesPlugin;
