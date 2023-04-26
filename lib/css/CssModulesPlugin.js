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
	CSS_MODULE_TYPE_MODULE
} = require("../ModuleTypeConstants");
const RuntimeGlobals = require("../RuntimeGlobals");
const SelfModuleFactory = require("../SelfModuleFactory");
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
/** @typedef {import("../../declarations/WebpackOptions").CssExperimentOptions} CssExperimentOptions */
/** @typedef {import("../Chunk")} Chunk */
/** @typedef {import("../Compiler")} Compiler */
/** @typedef {import("../Module")} Module */

const getCssLoadingRuntimeModule = memoize(() =>
	require("./CssLoadingRuntimeModule")
);

const getSchema = name => {
	const { definitions } = require("../../schemas/WebpackOptions.json");
	return {
		definitions,
		oneOf: [{ $ref: `#/definitions/${name}` }]
	};
};

const validateGeneratorOptions = createSchemaValidation(
	require("../../schemas/plugins/css/CssGeneratorOptions.check.js"),
	() => getSchema("CssGeneratorOptions"),
	{
		name: "Css Modules Plugin",
		baseDataPath: "parser"
	}
);
const validateParserOptions = createSchemaValidation(
	require("../../schemas/plugins/css/CssParserOptions.check.js"),
	() => getSchema("CssParserOptions"),
	{
		name: "Css Modules Plugin",
		baseDataPath: "parser"
	}
);

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
	 * @param {CssExperimentOptions} options options
	 */
	constructor({ exportsOnly = false }) {
		this._exportsOnly = exportsOnly;
	}
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
					CSS_MODULE_TYPE_MODULE
				]) {
					normalModuleFactory.hooks.createParser
						.for(type)
						.tap(plugin, parserOptions => {
							validateParserOptions(parserOptions);

							switch (type) {
								case CSS_MODULE_TYPE:
									return new CssParser();
								case CSS_MODULE_TYPE_GLOBAL:
									return new CssParser({
										allowPseudoBlocks: false,
										allowModeSwitch: false
									});
								case CSS_MODULE_TYPE_MODULE:
									return new CssParser({
										defaultMode: "local"
									});
							}
						});
					normalModuleFactory.hooks.createGenerator
						.for(type)
						.tap(plugin, generatorOptions => {
							validateGeneratorOptions(generatorOptions);
							return this._exportsOnly
								? new CssExportsGenerator()
								: new CssGenerator();
						});
					normalModuleFactory.hooks.createModuleClass
						.for(type)
						.tap(plugin, (createData, resolveData) => {
							if (resolveData.dependencies.length > 0) {
								// When CSS is imported from CSS there is only one dependency
								const dependency = resolveData.dependencies[0];

								return new CssModule({
									...createData,
									cssLayer: dependency.layer,
									supports: dependency.supports,
									media: dependency.media
								});
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
				const enabledChunks = new WeakSet();
				const handler = (chunk, set) => {
					if (enabledChunks.has(chunk)) {
						return;
					}
					enabledChunks.add(chunk);

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

	getModulesInOrder(chunk, modules, compilation) {
		if (!modules) return [];

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
				.sort((a, b) => b.index - a.index)
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

		const finalModules = [];

		for (;;) {
			const failedModules = new Set();
			const list = modulesByChunkGroup[0].list;
			if (list.length === 0) {
				// done, everything empty
				break;
			}
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
						new Error(
							`chunk ${
								chunk.name || chunk.id
							}\nConflicting order between ${hasFailed.readableIdentifier(
								compilation.requestShortener
							)} and ${selectedModule.readableIdentifier(
								compilation.requestShortener
							)}`
						)
					);
				}
				selectedModule = hasFailed;
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

	getOrderedChunkCssModules(chunk, chunkGraph, compilation) {
		return [
			...this.getModulesInOrder(
				chunk,
				chunkGraph.getOrderedChunkModulesIterableBySourceType(
					chunk,
					"css-import",
					compareModulesByIdentifier
				),
				compilation
			),
			...this.getModulesInOrder(
				chunk,
				chunkGraph.getOrderedChunkModulesIterableBySourceType(
					chunk,
					"css",
					compareModulesByIdentifier
				),
				compilation
			)
		];
	}

	renderChunk({
		uniqueName,
		chunk,
		chunkGraph,
		codeGenerationResults,
		modules
	}) {
		const source = new ConcatSource();
		const metaData = [];
		for (const module of modules) {
			try {
				const codeGenResult = codeGenerationResults.get(module, chunk.runtime);

				let moduleSource =
					codeGenResult.sources.get("css") ||
					codeGenResult.sources.get("css-import");

				if (module.media) {
					moduleSource = new ConcatSource(
						`@media ${module.media} {\n`,
						new PrefixSource("\t", moduleSource),
						"}"
					);
				}

				if (module.supports) {
					moduleSource = new ConcatSource(
						`@supports (${module.supports}) {\n`,
						new PrefixSource("\t", moduleSource),
						"}"
					);
				}

				// Layer can be anonymous
				if (module.cssLayer !== undefined && module.cssLayer !== null) {
					moduleSource = new ConcatSource(
						`@layer${module.cssLayer ? ` (${module.cssLayer})` : ""} {\n`,
						new PrefixSource("\t", moduleSource),
						"}"
					);
				}

				if (moduleSource) {
					source.add(moduleSource);
					source.add("\n");
				}
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
				e.message += `\nduring rendering of css ${module.identifier()}`;
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

	static getChunkFilenameTemplate(chunk, outputOptions) {
		if (chunk.cssFilenameTemplate) {
			return chunk.cssFilenameTemplate;
		} else if (chunk.canBeInitial()) {
			return outputOptions.cssFilename;
		} else {
			return outputOptions.cssChunkFilename;
		}
	}

	static chunkHasCss(chunk, chunkGraph) {
		return (
			!!chunkGraph.getChunkModulesIterableBySourceType(chunk, "css") ||
			!!chunkGraph.getChunkModulesIterableBySourceType(chunk, "css-import")
		);
	}
}

module.exports = CssModulesPlugin;
