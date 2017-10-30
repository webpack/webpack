/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/
"use strict";

const ConcatSource = require("webpack-sources").ConcatSource;
const Template = require("./Template");

module.exports = class ChunkTemplate extends Template {
	constructor(outputOptions) {
		super(outputOptions);
	}

	getRenderManifest(options) {
		const chunk = options.chunk;
		const outputOptions = options.outputOptions;
		const moduleTemplates = options.moduleTemplates;
		const dependencyTemplates = options.dependencyTemplates;

		const result = [];

		let filenameTemplate;
		if(chunk.isInitial()) {
			if(chunk.filenameTemplate)
				filenameTemplate = chunk.filenameTemplate;
			else
				filenameTemplate = outputOptions.filename;
		} else {
			filenameTemplate = outputOptions.chunkFilename;
		}

		result.push({
			render: () => this.renderJavascript(chunk, moduleTemplates.javascript, dependencyTemplates),
			filenameTemplate,
			pathOptions: {
				chunk
			},
			identifier: `chunk${chunk.id}`,
			hash: chunk.hash
		});

		for(const module of chunk.modules.filter(m => m.type && m.type.startsWith("webassembly"))) {
			const filenameTemplate = outputOptions.webassemblyModuleFilename;

			result.push({
				render: () => this.renderWebAssembly(module, moduleTemplates.webassembly, dependencyTemplates),
				filenameTemplate,
				pathOptions: {
					module
				},
				identifier: `webassemblyModule${module.id}`,
				hash: module.hash
			});
		}

		return result;
	}

	renderJavascript(chunk, moduleTemplate, dependencyTemplates) {
		const moduleSources = this.renderChunkModules(chunk, m => true, moduleTemplate, dependencyTemplates);
		const core = this.applyPluginsWaterfall("modules", moduleSources, chunk, moduleTemplate, dependencyTemplates);
		let source = this.applyPluginsWaterfall("render", core, chunk, moduleTemplate, dependencyTemplates);
		if(chunk.hasEntryModule()) {
			source = this.applyPluginsWaterfall("render-with-entry", source, chunk);
		}
		chunk.rendered = true;
		return new ConcatSource(source, ";");
	}

	renderWebAssembly(module, moduleTemplate, dependencyTemplates) {
		return moduleTemplate.render(module, dependencyTemplates);
	}

	updateHash(hash) {
		hash.update("ChunkTemplate");
		hash.update("2");
		this.applyPlugins("hash", hash);
	}

	updateHashForChunk(hash, chunk) {
		this.updateHash(hash);
		this.applyPlugins("hash-for-chunk", hash, chunk);
	}
};
