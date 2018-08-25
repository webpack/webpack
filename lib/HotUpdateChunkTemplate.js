/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

"use strict";

const { SyncWaterfallHook, SyncHook } = require("tapable");
const Template = require("./Template");

/** @typedef {import("webpack-sources").Source} Source */
/** @typedef {import("./ModuleTemplate")} ModuleTemplate */
/** @typedef {import("./ModuleTemplate").RenderContext} RenderContext */
/** @typedef {import("./util/createHash").Hash} Hash */

module.exports = class HotUpdateChunkTemplate {
	constructor(outputOptions) {
		this.outputOptions = outputOptions || {};
		this.hooks = Object.freeze({
			/** @type {SyncWaterfallHook<[Source, ModuleTemplate, RenderContext]>} */
			modules: new SyncWaterfallHook([
				"source",
				"moduleTemplate",
				"renderContext"
			]),
			/** @type {SyncWaterfallHook<[Source, ModuleTemplate, RenderContext, string]>} */
			render: new SyncWaterfallHook([
				"source",
				"moduleTemplate",
				"renderContext",
				"hash"
			]),
			/** @type {SyncHook<[Hash]>} */
			hash: new SyncHook(["hash"])
		});
	}

	/**
	 *
	 * @param {RenderContext} renderContext the render context
	 * @param {ModuleTemplate} moduleTemplate the module template
	 * @param {string} hash hash of the compilation
	 * @returns {Source} rendered source
	 */
	render(renderContext, moduleTemplate, hash) {
		const modulesSource = Template.renderChunkModules(
			renderContext,
			m => typeof m.source === "function",
			moduleTemplate
		);
		const core = this.hooks.modules.call(
			modulesSource,
			moduleTemplate,
			renderContext
		);
		const source = this.hooks.render.call(
			core,
			moduleTemplate,
			renderContext,
			hash
		);
		return source;
	}

	/**
	 * Updates hash with information from this template
	 * @param {Hash} hash the hash to update
	 * @returns {void}
	 */
	updateHash(hash) {
		hash.update("HotUpdateChunkTemplate");
		hash.update("1");
		this.hooks.hash.call(hash);
	}
};
