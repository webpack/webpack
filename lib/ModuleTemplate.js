/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

"use strict";

const { SyncWaterfallHook, SyncHook } = require("tapable");

/** @typedef {import("webpack-sources").Source} Source */
/** @typedef {import("./Chunk")} Chunk */
/** @typedef {import("./ChunkGraph")} ChunkGraph */
/** @typedef {import("./DependencyTemplates")} DependencyTemplates */
/** @typedef {import("./Module")} Module */
/** @typedef {import("./ModuleGraph")} ModuleGraph */
/** @typedef {import("./RuntimeTemplate")} RuntimeTemplate */
/** @typedef {import("./util/createHash").Hash} Hash */

/**
 * @typedef {Object} RenderContext
 * @property {Chunk} chunk the chunk
 * @property {DependencyTemplates} dependencyTemplates the dependency templates
 * @property {RuntimeTemplate} runtimeTemplate the runtime template
 * @property {ModuleGraph} moduleGraph the module graph
 * @property {ChunkGraph} chunkGraph the chunk graph
 */

module.exports = class ModuleTemplate {
	/**
	 * @param {RuntimeTemplate} runtimeTemplate the runtime template
	 * @param {string} type the module template type
	 */
	constructor(runtimeTemplate, type) {
		this.runtimeTemplate = runtimeTemplate;
		this.type = type;
		this.hooks = Object.freeze({
			/** @type {SyncWaterfallHook<Source, Module, RenderContext>} */
			content: new SyncWaterfallHook(["source", "module", "context"]),
			/** @type {SyncWaterfallHook<Source, Module, RenderContext>} */
			module: new SyncWaterfallHook(["source", "module", "context"]),
			/** @type {SyncWaterfallHook<Source, Module, RenderContext>} */
			render: new SyncWaterfallHook(["source", "module", "context"]),
			/** @type {SyncWaterfallHook<Source, Module, RenderContext>} */
			package: new SyncWaterfallHook(["source", "module", "context"]),
			/** @type {SyncHook<Hash>} */
			hash: new SyncHook(["hash"])
		});
	}

	/**
	 * @param {Module} module the module
	 * @param {RenderContext} ctx render ctx
	 * @returns {Source} the source
	 */
	render(module, ctx) {
		try {
			const {
				runtimeTemplate,
				dependencyTemplates,
				moduleGraph,
				chunkGraph
			} = ctx;
			const moduleSource = module.source({
				dependencyTemplates,
				runtimeTemplate,
				moduleGraph,
				chunkGraph,
				type: this.type
			});
			const moduleSourcePostContent = this.hooks.content.call(
				moduleSource,
				module,
				ctx
			);
			const moduleSourcePostModule = this.hooks.module.call(
				moduleSourcePostContent,
				module,
				ctx
			);
			const moduleSourcePostRender = this.hooks.render.call(
				moduleSourcePostModule,
				module,
				ctx
			);
			return this.hooks.package.call(moduleSourcePostRender, module, ctx);
		} catch (e) {
			e.message = `${module.identifier()}\n${e.message}`;
			throw e;
		}
	}

	/**
	 * Updates hash with information from this template
	 * @param {Hash} hash the hash to update
	 * @returns {void}
	 */
	updateHash(hash) {
		hash.update("1");
		this.hooks.hash.call(hash);
	}
};
