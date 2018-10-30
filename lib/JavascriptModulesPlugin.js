/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

"use strict";

const { SyncBailHook } = require("tapable");
const { ConcatSource } = require("webpack-sources");
const Compilation = require("./Compilation");
const JavascriptGenerator = require("./JavascriptGenerator");
const JavascriptParser = require("./JavascriptParser");
const Template = require("./Template");
const { compareModulesById } = require("./util/comparators");
const createHash = require("./util/createHash");

/** @typedef {import("webpack-sources").Source} Source */
/** @typedef {import("./Chunk")} Chunk */
/** @typedef {import("./ChunkTemplate")} ChunkTemplate */
/** @typedef {import("./Compiler")} Compiler */
/** @typedef {import("./Module")} Module */
/** @typedef {import("./ModuleTemplate")} ModuleTemplate */
/** @typedef {import("./ModuleTemplate").RenderContext} RenderContext */
/** @typedef {import("./RuntimeTemplate")} RuntimeTemplate */

/**
 * @typedef {Object} JavascriptModulesPluginHooks
 * @property {SyncBailHook<Module, Chunk>} shouldRender
 */

/** @type {WeakMap<Compilation, JavascriptModulesPluginHooks>} */
const compilationHooksMap = new WeakMap();

class JavascriptModulesPlugin {
	/**
	 * @param {Compilation} compilation the compilation
	 * @returns {JavascriptModulesPluginHooks} hooks
	 */
	static getHooks(compilation) {
		if (!(compilation instanceof Compilation)) {
			throw new TypeError(
				"The 'compilation' argument must be an instance of Compilation"
			);
		}

		let hooks = compilationHooksMap.get(compilation);

		if (hooks === undefined) {
			hooks = {
				shouldRender: new SyncBailHook(["module", "chunk"])
			};

			compilationHooksMap.set(compilation, hooks);
		}

		return hooks;
	}

	/**
	 * @param {Compiler} compiler webpack compiler
	 * @returns {void}
	 */
	apply(compiler) {
		const { compilation } = compiler.hooks;

		compilation.tap(
			"JavascriptModulesPlugin",
			(compilation, { normalModuleFactory }) => {
				const hooks = JavascriptModulesPlugin.getHooks(compilation);

				hooks.shouldRender.tap("JavascriptModulesPlugin", module => {
					if (module.type === "javascript/auto") return true;
					if (module.type === "javascript/dynamic") return true;
					if (module.type === "javascript/esm") return true;
				});

				const { createParser, createGenerator } = normalModuleFactory.hooks;

				createParser
					.for("javascript/auto")
					.tap("JavascriptModulesPlugin", options => {
						return new JavascriptParser(options, "auto");
					});
				createParser
					.for("javascript/dynamic")
					.tap("JavascriptModulesPlugin", options => {
						return new JavascriptParser(options, "script");
					});
				createParser
					.for("javascript/esm")
					.tap("JavascriptModulesPlugin", options => {
						return new JavascriptParser(options, "module");
					});

				createGenerator
					.for("javascript/auto")
					.tap("JavascriptModulesPlugin", () => {
						return new JavascriptGenerator();
					});
				createGenerator
					.for("javascript/dynamic")
					.tap("JavascriptModulesPlugin", () => {
						return new JavascriptGenerator();
					});
				createGenerator
					.for("javascript/esm")
					.tap("JavascriptModulesPlugin", () => {
						return new JavascriptGenerator();
					});

				const { moduleGraph } = compilation;
				const { contentHash } = compilation.hooks;
				const { mainTemplate, chunkTemplate } = compilation;

				mainTemplate.hooks.renderManifest.tap(
					"JavascriptModulesPlugin",
					(result, options) => {
						const chunk = options.chunk;
						const { filename } = options.outputOptions;
						const { hash } = options;
						const { moduleGraph, chunkGraph } = options;

						const mainTemplate = compilation.mainTemplate;

						const filenameTemplate = chunk.filenameTemplate || filename;

						const runtimeTemplate = options.runtimeTemplate;
						const moduleTemplates = options.moduleTemplates;
						const dependencyTemplates = options.dependencyTemplates;

						result.push({
							render: () =>
								mainTemplate.render(moduleTemplates.javascript, {
									hash,
									chunk,
									chunkGraph,
									moduleGraph,
									runtimeTemplate,
									dependencyTemplates
								}),
							filenameTemplate,
							pathOptions: {
								contentHashType: "javascript",
								chunk
							},
							identifier: `chunk${chunk.id}`,
							hash: chunk.hash
						});
						return result;
					}
				);

				mainTemplate.hooks.modules.tap(
					"JavascriptModulesPlugin",
					(source, moduleTemplate, renderContext) => {
						const chunk = renderContext.chunk;
						return Template.renderChunkModules(
							renderContext,
							m => hooks.shouldRender.call(m, chunk),
							moduleTemplate,
							"/******/ "
						);
					}
				);

				chunkTemplate.hooks.renderManifest.tap(
					"JavascriptModulesPlugin",
					(result, options) => {
						const chunk = options.chunk;
						const { filename, chunkFilename } = options.outputOptions;

						let filenameTemplate;

						if (chunk.filenameTemplate) {
							filenameTemplate = chunk.filenameTemplate;
						} else if (chunk.isOnlyInitial()) {
							filenameTemplate = filename;
						} else {
							filenameTemplate = chunkFilename;
						}

						const { chunkTemplate, runtimeTemplate } = compilation;
						const { moduleTemplates, dependencyTemplates } = options;

						const { chunkGraph } = compilation;

						const hasRenderedModules =
							chunkGraph
								.getChunkModules(chunk)
								.filter(module => hooks.shouldRender.call(module, chunk))
								.length > 0;

						const hasEntryModules =
							chunkGraph.getNumberOfEntryModules(chunk) > 0;

						if (hasEntryModules || hasRenderedModules) {
							result.push({
								render: () =>
									this.renderJavascript(
										compilation,
										chunkTemplate,
										moduleTemplates.javascript,
										{
											chunk,
											chunkGraph,
											moduleGraph,
											runtimeTemplate,
											dependencyTemplates
										}
									),
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
					}
				);

				contentHash.tap("JavascriptModulesPlugin", chunk => {
					const {
						chunkGraph,
						moduleGraph,
						mainTemplate,
						chunkTemplate,
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

					const template = chunk.hasRuntime() ? mainTemplate : chunkTemplate;

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
						if (hooks.shouldRender.call(m, chunk)) {
							hash.update(chunkGraph.getModuleHash(m));
						}
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
		const hooks = JavascriptModulesPlugin.getHooks(compilation);

		const chunk = renderContext.chunk;

		const moduleSources = Template.renderChunkModules(
			renderContext,
			module => hooks.shouldRender.call(module, chunk),
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
