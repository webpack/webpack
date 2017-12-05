/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/
"use strict";

const ConcatSource = require("webpack-sources").ConcatSource;
const Template = require("./Template");
const SyncWaterfallHook = require("tapable").SyncWaterfallHook;
const SyncHook = require("tapable").SyncHook;

module.exports = class ChunkTemplate extends Template {
	constructor(outputOptions) {
		super(outputOptions);
		this.hooks = {
			modules: new SyncWaterfallHook(["source", "chunk", "moduleTemplate", "dependencyTemplates"]),
			render: new SyncWaterfallHook(["source", "chunk", "moduleTemplate", "dependencyTemplates"]),
			renderWithEntry: new SyncWaterfallHook(["source", "chunk"]),
			hash: new SyncHook(["hash"]),
			hashForChunk: new SyncHook(["hash", "chunk"]),
		};
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

		for(const module of chunk.getModules().filter(m => m.type && m.type.startsWith("webassembly"))) {
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
		const core = this.hooks.modules.call(moduleSources, chunk, moduleTemplate, dependencyTemplates);
		let source = this.hooks.render.call(core, chunk, moduleTemplate, dependencyTemplates);
		if(chunk.hasEntryModule()) {
			source = this.hooks.renderWithEntry.call(source, chunk);
		}
		chunk.rendered = true;
		return new ConcatSource(source, ";");
	}

	renderWebAssembly(module, moduleTemplate, dependencyTemplates) {
		return moduleTemplate.render(module, dependencyTemplates, {});
	}

	updateHash(hash) {
		hash.update("ChunkTemplate");
		hash.update("2");
		this.hooks.hash.call(hash);
	}

	updateHashForChunk(hash, chunk) {
		this.updateHash(hash);
		this.hooks.hashForChunk.call(hash, chunk);
	}
};
