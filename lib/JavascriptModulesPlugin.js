/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

"use strict";

const { ConcatSource } = require("webpack-sources");
const HotUpdateChunk = require("./HotUpdateChunk");
const JavascriptGenerator = require("./JavascriptGenerator");
const JavascriptParser = require("./JavascriptParser");
const Template = require("./Template");
const { compareModulesById } = require("./util/comparators");
const createHash = require("./util/createHash");

/** @typedef {import("webpack-sources").Source} Source */
/** @typedef {import("./Chunk")} Chunk */
/** @typedef {import("./ChunkTemplate")} ChunkTemplate */
/** @typedef {import("./Compilation")} Compilation */
/** @typedef {import("./Compiler")} Compiler */
/** @typedef {import("./Module")} Module */
/** @typedef {import("./ModuleTemplate")} ModuleTemplate */
/** @typedef {import("./ModuleTemplate").RenderContext} RenderContext */
/** @typedef {import("./RuntimeTemplate")} RuntimeTemplate */

class JavascriptModulesPlugin {
	/**
	 * @param {Compiler} compiler webpack compiler
	 * @returns {void}
	 */
	apply(compiler) {
		compiler.hooks.compilation.tap(
			"JavascriptModulesPlugin",
			(compilation, { normalModuleFactory }) => {
				const moduleGraph = compilation.moduleGraph;
				normalModuleFactory.hooks.createParser
					.for("javascript/auto")
					.tap("JavascriptModulesPlugin", options => {
						return new JavascriptParser(options, "auto");
					});
				normalModuleFactory.hooks.createParser
					.for("javascript/dynamic")
					.tap("JavascriptModulesPlugin", options => {
						return new JavascriptParser(options, "script");
					});
				normalModuleFactory.hooks.createParser
					.for("javascript/esm")
					.tap("JavascriptModulesPlugin", options => {
						return new JavascriptParser(options, "module");
					});
				normalModuleFactory.hooks.createGenerator
					.for("javascript/auto")
					.tap("JavascriptModulesPlugin", () => {
						return new JavascriptGenerator();
					});
				normalModuleFactory.hooks.createGenerator
					.for("javascript/dynamic")
					.tap("JavascriptModulesPlugin", () => {
						return new JavascriptGenerator();
					});
				normalModuleFactory.hooks.createGenerator
					.for("javascript/esm")
					.tap("JavascriptModulesPlugin", () => {
						return new JavascriptGenerator();
					});
				compilation.mainTemplate.hooks.renderManifest.tap(
					"JavascriptModulesPlugin",
					(result, options) => {
						const chunk = options.chunk;
						const hash = options.hash;
						const outputOptions = options.outputOptions;
						const moduleTemplates = options.moduleTemplates;
						const dependencyTemplates = options.dependencyTemplates;

						const filenameTemplate =
							chunk.filenameTemplate || outputOptions.filename;

						result.push({
							render: () =>
								compilation.mainTemplate.render(moduleTemplates.javascript, {
									hash,
									chunk,
									dependencyTemplates,
									runtimeTemplate: options.runtimeTemplate,
									moduleGraph: options.moduleGraph,
									chunkGraph: options.chunkGraph
								}),
							filenameTemplate,
							pathOptions: {
								chunk,
								contentHashType: "javascript"
							},
							identifier: `chunk${chunk.id}`,
							hash: chunk.hash
						});
						return result;
					}
				);
				compilation.mainTemplate.hooks.modules.tap(
					"JavascriptModulesPlugin",
					(source, moduleTemplate, renderContext) => {
						return Template.renderChunkModules(
							renderContext,
							m => m.getSourceTypes().has("javascript"),
							moduleTemplate,
							"/******/ "
						);
					}
				);
				compilation.chunkTemplate.hooks.renderManifest.tap(
					"JavascriptModulesPlugin",
					(result, options) => {
						const chunk = options.chunk;
						const hotUpdateChunk =
							chunk instanceof HotUpdateChunk ? chunk : null;
						const outputOptions = options.outputOptions;
						const moduleTemplates = options.moduleTemplates;
						const dependencyTemplates = options.dependencyTemplates;

						let filenameTemplate;
						if (hotUpdateChunk) {
							filenameTemplate = outputOptions.hotUpdateChunkFilename;
						} else if (chunk.filenameTemplate) {
							filenameTemplate = chunk.filenameTemplate;
						} else if (chunk.isOnlyInitial()) {
							filenameTemplate = outputOptions.filename;
						} else {
							filenameTemplate = outputOptions.chunkFilename;
						}

						result.push({
							render: () =>
								this.renderJavascript(
									compilation,
									compilation.chunkTemplate,
									moduleTemplates.javascript,
									{
										chunk,
										dependencyTemplates,
										runtimeTemplate: compilation.runtimeTemplate,
										moduleGraph,
										chunkGraph: compilation.chunkGraph
									}
								),
							filenameTemplate,
							pathOptions: {
								hash: options.hash,
								chunk,
								contentHashType: "javascript"
							},
							identifier: `chunk${chunk.id}`,
							hash: chunk.hash
						});

						return result;
					}
				);
				compilation.hooks.contentHash.tap("JavascriptModulesPlugin", chunk => {
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
					const hotUpdateChunk = chunk instanceof HotUpdateChunk ? chunk : null;
					const hash = createHash(hashFunction);
					if (hashSalt) hash.update(hashSalt);
					const template = chunk.hasRuntime()
						? compilation.mainTemplate
						: compilation.chunkTemplate;
					hash.update(`${chunk.id} `);
					hash.update(chunk.ids ? chunk.ids.join(",") : "");
					template.updateHashForChunk(hash, chunk, {
						chunkGraph,
						moduleGraph,
						runtimeTemplate
					});
					for (const m of chunkGraph.getOrderedChunkModulesIterable(
						chunk,
						compareModulesById(chunkGraph)
					)) {
						if (m.getSourceTypes().has("javascript")) {
							hash.update(chunkGraph.getModuleHash(m));
						}
					}
					if (hotUpdateChunk) {
						hash.update(JSON.stringify(hotUpdateChunk.removedModules));
					}
					chunk.contentHash.javascript = hash
						.digest(hashDigest)
						.substr(0, hashDigestLength);
				});
			}
		);
	}

	/**
	 * @param {Compilation} compilation the compilation
	 * @param {ChunkTemplate} chunkTemplate the chunk template
	 * @param {ModuleTemplate} moduleTemplate the module template
	 * @param {RenderContext} renderContext the render context
	 * @returns {Source} the rendered source
	 */
	renderJavascript(compilation, chunkTemplate, moduleTemplate, renderContext) {
		const chunk = renderContext.chunk;
		const moduleSources = Template.renderChunkModules(
			renderContext,
			m => m.getSourceTypes().has("javascript"),
			moduleTemplate
		);
		const core = chunkTemplate.hooks.modules.call(
			moduleSources,
			moduleTemplate,
			renderContext
		);
		let source = chunkTemplate.hooks.render.call(
			core,
			moduleTemplate,
			renderContext
		);
		if (renderContext.chunkGraph.getNumberOfEntryModules(chunk) > 0) {
			source = chunkTemplate.hooks.renderWithEntry.call(source, chunk);
		}
		chunk.rendered = true;
		return new ConcatSource(source, ";");
	}
}

module.exports = JavascriptModulesPlugin;
