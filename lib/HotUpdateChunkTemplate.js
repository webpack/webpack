/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/
"use strict";

const Template = require("./Template");
const Chunk = require("./Chunk");
const Tapable = require("tapable").Tapable;
const SyncWaterfallHook = require("tapable").SyncWaterfallHook;
const SyncHook = require("tapable").SyncHook;

module.exports = class HotUpdateChunkTemplate extends Tapable {
	constructor(outputOptions) {
		super();
		this.outputOptions = outputOptions || {};
		this.hooks = {
			modules: new SyncWaterfallHook([
				"source",
				"modules",
				"removedModules",
				"moduleTemplate",
				"dependencyTemplates"
			]),
			render: new SyncWaterfallHook([
				"source",
				"modules",
				"removedModules",
				"hash",
				"id",
				"moduleTemplate",
				"dependencyTemplates"
			]),
			hash: new SyncHook(["hash"])
		};
	}

	render(
		id,
		modules,
		removedModules,
		hash,
		moduleTemplate,
		dependencyTemplates
	) {
		const hotUpdateChunk = new Chunk();
		hotUpdateChunk.id = id;
		hotUpdateChunk.setModules(modules);
		hotUpdateChunk.removedModules = removedModules;
		const modulesSource = Template.renderChunkModules(
			hotUpdateChunk,
			() => true,
			moduleTemplate,
			dependencyTemplates
		);
		const core = this.hooks.modules.call(
			modulesSource,
			modules,
			removedModules,
			moduleTemplate,
			dependencyTemplates
		);
		const source = this.hooks.render.call(
			core,
			modules,
			removedModules,
			hash,
			id,
			moduleTemplate,
			dependencyTemplates
		);
		return source;
	}

	updateHash(hash) {
		hash.update("HotUpdateChunkTemplate");
		hash.update("1");
		this.hooks.hash.call(hash);
	}
};
