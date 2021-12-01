/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

"use strict";

const { ConcatSource } = require("webpack-sources");
const HotUpdateChunk = require("../HotUpdateChunk");
const RuntimeGlobals = require("../RuntimeGlobals");
const CssUrlDependency = require("../dependencies/CssUrlDependency");
const StaticExportsDependency = require("../dependencies/StaticExportsDependency");
const {
	compareModulesByPostOrderIndexOrIdentifier
} = require("../util/comparators");
const createSchemaValidation = require("../util/create-schema-validation");
const createHash = require("../util/createHash");
const CssGenerator = require("./CssGenerator");
const CssLoadingRuntimeModule = require("./CssLoadingRuntimeModule");
const CssParser = require("./CssParser");
const CssImportDependency = require("../dependencies/CssImportDependency");

/** @typedef {import("webpack-sources").Source} Source */
/** @typedef {import("../Chunk")} Chunk */
/** @typedef {import("../Compiler")} Compiler */
/** @typedef {import("../Module")} Module */

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

const escapeCssIdentifierPart = str => {
	// cspell:word uffff
	return `${str}`.replace(/[^a-zA-Z0-9_\u0081-\uffff-]/g, s => `\\${s}`);
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
				compilation.dependencyFactories.set(
					CssUrlDependency,
					normalModuleFactory
				);
				compilation.dependencyTemplates.set(
					CssUrlDependency,
					new CssUrlDependency.Template()
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
				normalModuleFactory.hooks.createParser
					.for("css")
					.tap(plugin, parserOptions => {
						validateParserOptions(parserOptions);
						return new CssParser();
					});
				normalModuleFactory.hooks.createGenerator
					.for("css")
					.tap(plugin, generatorOptions => {
						validateGeneratorOptions(generatorOptions);
						return new CssGenerator();
					});
				compilation.hooks.contentHash.tap("JavascriptModulesPlugin", chunk => {
					const {
						chunkGraph,
						outputOptions: {
							hashSalt,
							hashDigest,
							hashDigestLength,
							hashFunction
						}
					} = compilation;
					if (!CssModulesPlugin.chunkHasCss(chunk, chunkGraph)) return;
					const hash = createHash(hashFunction);
					if (hashSalt) hash.update(hashSalt);
					const modules = this.getOrderedChunkCssModules(chunk, chunkGraph);
					for (const module of modules) {
						hash.update(chunkGraph.getModuleHash(module, chunk.runtime));
					}
					const digest = /** @type {string} */ (hash.digest(hashDigest));
					chunk.contentHash.css = digest.substr(0, hashDigestLength);
				});
				compilation.hooks.renderManifest.tap(plugin, (result, options) => {
					const { chunkGraph } = compilation;
					const { hash, chunk, codeGenerationResults } = options;

					if (chunk instanceof HotUpdateChunk) return result;

					if (CssModulesPlugin.chunkHasCss(chunk, chunkGraph)) {
						result.push({
							render: () =>
								this.renderChunk({
									chunk,
									chunkGraph,
									codeGenerationResults
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

					compilation.addRuntimeModule(chunk, new CssLoadingRuntimeModule(set));
				};
				compilation.hooks.runtimeRequirementInTree
					.for(RuntimeGlobals.ensureChunkHandlers)
					.tap(plugin, handler);
				compilation.hooks.runtimeRequirementInTree
					.for(RuntimeGlobals.hmrDownloadUpdateHandlers)
					.tap(plugin, handler);
			}
		);
	}

	getOrderedChunkCssModules(chunk, chunkGraph) {
		return chunkGraph.getOrderedChunkModulesIterableBySourceType(
			chunk,
			"css",
			// TODO improve order function
			compareModulesByPostOrderIndexOrIdentifier(chunkGraph.moduleGraph)
		);
	}

	renderChunk({ chunk, chunkGraph, codeGenerationResults }) {
		const modules = this.getOrderedChunkCssModules(chunk, chunkGraph);
		const source = new ConcatSource();
		for (const module of modules) {
			try {
				const s = codeGenerationResults.getSource(module, chunk.runtime, "css");
				if (s) {
					source.add(s);
					source.add("\n");
				}
			} catch (e) {
				e.message += `\nduring rendering of css ${module.identifier()}`;
				throw e;
			}
		}
		source.add(
			`head{--webpack-${escapeCssIdentifierPart(chunk.id)}:${Array.from(
				modules,
				m => `_${escapeCssIdentifierPart(chunkGraph.getModuleId(m))}`
			).join(" ")};}`
		);
		return source;
	}

	static getChunkFilenameTemplate(chunk, outputOptions) {
		if (chunk.cssFilenameTemplate) {
			return chunk.cssFilenameTemplate;
		} else {
			return outputOptions.cssFilename;
		}
	}

	static chunkHasCss(chunk, chunkGraph) {
		return !!chunkGraph.getChunkModulesIterableBySourceType(chunk, "css");
	}
}

module.exports = CssModulesPlugin;
