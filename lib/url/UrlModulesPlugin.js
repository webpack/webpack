/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

"use strict";

const Generator = require("../Generator");
const { compareModulesById } = require("../util/comparators");

const JavascriptModulesPlugin = require("../JavascriptModulesPlugin");

const UrlAssetGenerator = require("./UrlAssetGenerator");
const UrlJavascriptGenerator = require("./UrlJavascriptGenerator");
const UrlParser = require("./UrlParser");

/** @typedef {import("webpack-sources").Source} Source */
/** @typedef {import("../Chunk")} Chunk */
/** @typedef {import("../ChunkTemplate")} ChunkTemplate */
/** @typedef {import("../Compiler")} Compiler */
/** @typedef {import("../MainTemplate")} MainTemplate */
/** @typedef {import("../Module")} Module */
/** @typedef {import("../ModuleTemplate")} ModuleTemplate */
/** @typedef {import("../ModuleTemplate").RenderContext} RenderContext */

const plugin = "UrlModulesPlugin";

class UrlModulesPlugin {
	/**
	 * @param {Compiler} compiler webpack compiler
	 *
	 * @returns {void}
	 */
	apply(compiler) {
		const { compilation } = compiler.hooks;

		compilation.tap(plugin, (compilation, { normalModuleFactory }) => {
			const { createParser, createGenerator } = normalModuleFactory.hooks;

			createParser.for("url/experimental").tap(plugin, () => {
				return new UrlParser();
			});

			createGenerator.for("url/experimental").tap(plugin, () => {
				return Generator.byType({
					url: new UrlAssetGenerator(),
					javascript: new UrlJavascriptGenerator()
				});
			});

			const js = JavascriptModulesPlugin.getHooks(compilation);

			js.shouldRender.tap(plugin, module => {
				if (module.type === "url/experimental") return true;
			});

			const { chunkTemplate } = compilation;

			chunkTemplate.hooks.renderManifest.tap(plugin, (result, options) => {
				const chunk = options.chunk;

				const outputOptions = options.outputOptions;

				const { mainTemplate } = compilation;
				const { moduleTemplates, dependencyTemplates } = options;

				const { chunkGraph, moduleGraph } = compilation;

				for (const module of chunkGraph.getOrderedChunkModulesIterable(
					chunk,
					compareModulesById(chunkGraph)
				)) {
					if (module.type && module.type === "url/experimental") {
						// @ts-ignore
						const filename = module.resource;
						const filenameTemplate = outputOptions.urlModuleFilename;

						result.push({
							render: () =>
								this.renderModule(module, moduleTemplates.url, {
									chunk,
									chunkGraph,
									moduleGraph,
									mainTemplate,
									dependencyTemplates,
									outputOptions
								}),
							filenameTemplate,
							pathOptions: {
								module,
								filename,
								chunkGraph
							},
							identifier: `urlModule${chunkGraph.getModuleId(module)}`,
							hash: chunkGraph.getModuleHash(module)
						});
					}
				}

				return result;
			});
		});
	}

	/**
	 * @param {Module} module the module to render
	 * @param {ModuleTemplate} moduleTemplate the module template
	 * @param {RenderContext} renderContext the render context
	 *
	 * @returns {Source} the rendered source
	 */
	renderModule(module, moduleTemplate, renderContext) {
		return moduleTemplate.render(module, renderContext);
	}
}

module.exports = UrlModulesPlugin;
