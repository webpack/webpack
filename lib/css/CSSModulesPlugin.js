/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

"use strict";

const CSSGenerator = require("./CSSGenerator");
const CSSParser = require("./CSSParser");
const CSSTemplate = require("./CSSTemplate");

const {
	CSSURLDependency,
	CSSImportDependency,
	CSSExportDependency
} = require("./dependencies");

const { ConcatSource } = require("webpack-sources");

class CSSModulesPlugin {
	constructor() {
		this.plugin = {
			name: "CSSModulesPlugin"
		};
	}

	apply(compiler) {
		const { plugin } = this;
		const { compilation } = compiler.hooks;

		compilation.tap(plugin, (compilation, { normalModuleFactory }) => {
			const { createParser, createGenerator } = normalModuleFactory.hooks;

			createParser.for("css").tap(plugin, options => {
				return new CSSParser(options);
			});

			createGenerator.for("css").tap(plugin, options => {
				return new CSSGenerator(options);
			});

			const { dependencyFactories, dependencyTemplates } = compilation;

			dependencyFactories.set(CSSURLDependency, normalModuleFactory);
			dependencyFactories.set(CSSImportDependency, normalModuleFactory);
			dependencyFactories.set(CSSExportDependency, normalModuleFactory);

			dependencyTemplates.set(
				CSSURLDependency,
				new CSSURLDependency.Template()
			);

			dependencyTemplates.set(
				CSSImportDependency,
				new CSSImportDependency.Template()
			);

			dependencyTemplates.set(
				CSSExportDependency,
				new CSSExportDependency.Template()
			);

			const { moduleGraph } = compilation;
			const { mainTemplate, chunkTemplate, runtimeTemplate } = compilation;

			chunkTemplate.hooks.renderManifest.tap(plugin, (result, options) => {
				const chunk = options.chunk;
				// TODO(michael-ciniawsky)
				// Uncomment when it's clear how to support CSS Assets
				// const output = options.outputOptions;
				const moduleTemplates = options.moduleTemplates;
				const dependencyTemplates = options.dependencyTemplates;

				let filenameTemplate = "";

				if (chunk.fileNameTemplate) {
					filenameTemplate = chunk.filenameTemplate;
				} else {
					// TODO(michael-ciniawsky)
					// Use outputOptions here
					filenameTemplate = "[name].css";
				}

				const { chunkGraph } = compilation;

				result.push({
					render: () =>
						this.renderChunk(chunkTemplate, moduleTemplates.css, {
							chunk,
							dependencyTemplates,
							runtimeTemplate,
							moduleGraph,
							chunkGraph
						}),
					filenameTemplate,
					pathOptions: {
						chunk,
						chunkGraph
					},
					identifier: `CSS Chunk (${chunk.id})`,
					// TODO(michael-ciniawsky)
					hash: null
				});

				return result;
			});

			mainTemplate.hooks.renderManifest.tap(plugin, (result, options) => {
				const chunk = options.chunk;
				// TODO(michael-ciniawsky)
				// Uncomment when it's clear how to support CSS Assets
				// const output = options.outputOptions;
				// TODO(michael-ciniawsky)
				// Use outputOptions here
				const filenameTemplate = "[name].css";
				const moduleTemplates = options.moduleTemplates;
				const dependencyTemplates = options.dependencyTemplates;

				const { chunkGraph } = compilation;

				result.push({
					render: () =>
						this.renderChunk(mainTemplate, moduleTemplates.css, {
							chunk,
							dependencyTemplates,
							runtimeTemplate,
							moduleGraph,
							chunkGraph
						}),
					filenameTemplate,
					pathOptions: {
						chunkGraph,
						chunk
					},
					identifier: `CSS Chunk (${chunk.id})`,
					// TODO(michael-ciniawsky)
					hash: null
				});

				return result;
			});
		});
	}

	renderChunk(chunkTemplate, moduleTemplate, renderContext) {
		const sources = CSSTemplate.render(
			renderContext,
			module => module.type.startsWith("css"),
			moduleTemplate
		);

		return new ConcatSource(sources);
	}
}

module.exports = CSSModulesPlugin;
