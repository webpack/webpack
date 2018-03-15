/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/
"use strict";

const Parser = require("./Parser");
const Template = require("./Template");
const ConcatSource = require("webpack-sources").ConcatSource;
const JavascriptGenerator = require("./JavascriptGenerator");

class JavascriptModulesPlugin {
	apply(compiler) {
		compiler.hooks.compilation.tap(
			"JavascriptModulesPlugin",
			(compilation, { normalModuleFactory }) => {
				normalModuleFactory.hooks.createParser
					.for("javascript/auto")
					.tap("JavascriptModulesPlugin", options => {
						return new Parser(options, "auto");
					});
				normalModuleFactory.hooks.createParser
					.for("javascript/dynamic")
					.tap("JavascriptModulesPlugin", options => {
						return new Parser(options, "script");
					});
				normalModuleFactory.hooks.createParser
					.for("javascript/esm")
					.tap("JavascriptModulesPlugin", options => {
						return new Parser(options, "module");
					});
				normalModuleFactory.hooks.createGenerator
					.for("javascript/auto")
					.tap("JavascriptModulesPlugin", options => {
						return new JavascriptGenerator(options);
					});
				normalModuleFactory.hooks.createGenerator
					.for("javascript/dynamic")
					.tap("JavascriptModulesPlugin", options => {
						return new JavascriptGenerator(options);
					});
				normalModuleFactory.hooks.createGenerator
					.for("javascript/esm")
					.tap("JavascriptModulesPlugin", options => {
						return new JavascriptGenerator(options);
					});
				compilation.mainTemplate.hooks.renderManifest.tap(
					"JavascriptModulesPlugin",
					(result, options) => {
						const chunk = options.chunk;
						const hash = options.hash;
						const fullHash = options.fullHash;
						const outputOptions = options.outputOptions;
						const moduleTemplates = options.moduleTemplates;
						const dependencyTemplates = options.dependencyTemplates;

						let filenameTemplate;
						if (chunk.filenameTemplate)
							filenameTemplate = chunk.filenameTemplate;
						else filenameTemplate = outputOptions.filename;

						const useChunkHash = compilation.mainTemplate.useChunkHash(chunk);

						result.push({
							render: () =>
								compilation.mainTemplate.render(
									hash,
									chunk,
									moduleTemplates.javascript,
									dependencyTemplates
								),
							filenameTemplate,
							pathOptions: {
								noChunkHash: !useChunkHash,
								chunk
							},
							identifier: `chunk${chunk.id}`,
							hash: useChunkHash ? chunk.hash : fullHash
						});
						return result;
					}
				);
				compilation.mainTemplate.hooks.modules.tap(
					"JavascriptModulesPlugin",
					(source, chunk, hash, moduleTemplate, dependencyTemplates) => {
						return Template.renderChunkModules(
							chunk,
							m => typeof m.source === "function",
							moduleTemplate,
							dependencyTemplates,
							"/******/ "
						);
					}
				);
				compilation.chunkTemplate.hooks.renderManifest.tap(
					"JavascriptModulesPlugin",
					(result, options) => {
						const chunk = options.chunk;
						const outputOptions = options.outputOptions;
						const moduleTemplates = options.moduleTemplates;
						const dependencyTemplates = options.dependencyTemplates;

						let filenameTemplate;
						if (chunk.filenameTemplate)
							filenameTemplate = chunk.filenameTemplate;
						else filenameTemplate = outputOptions.chunkFilename;

						result.push({
							render: () =>
								this.renderJavascript(
									compilation.chunkTemplate,
									chunk,
									moduleTemplates.javascript,
									dependencyTemplates
								),
							filenameTemplate,
							pathOptions: {
								chunk
							},
							identifier: `chunk${chunk.id}`,
							hash: chunk.hash
						});

						return result;
					}
				);
			}
		);
	}

	renderJavascript(chunkTemplate, chunk, moduleTemplate, dependencyTemplates) {
		const moduleSources = Template.renderChunkModules(
			chunk,
			m => typeof m.source === "function",
			moduleTemplate,
			dependencyTemplates
		);
		const core = chunkTemplate.hooks.modules.call(
			moduleSources,
			chunk,
			moduleTemplate,
			dependencyTemplates
		);
		let source = chunkTemplate.hooks.render.call(
			core,
			chunk,
			moduleTemplate,
			dependencyTemplates
		);
		if (chunk.hasEntryModule()) {
			source = chunkTemplate.hooks.renderWithEntry.call(source, chunk);
		}
		chunk.rendered = true;
		return new ConcatSource(source, ";");
	}
}

module.exports = JavascriptModulesPlugin;
