/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Natsu @xiaoxiaojx
*/

"use strict";

const { SyncBailHook } = require("tapable");
const URLDependency = require("../dependencies/URLDependency");
const createHooksRegistry = require("../util/createHooksRegistry");
const URLDependenciesBlock = require("./URLDependenciesBlock");

/** @typedef {import("./URLDependenciesBlock").BlockPromotion} BlockPromotion */
/** @typedef {import("../Compiler")} Compiler */
/** @typedef {import("../ModuleGraph")} ModuleGraph */

/**
 * @typedef {object} URLEntryPluginHooks
 * @property {SyncBailHook<[import("../Module"), URLDependency], BlockPromotion | void>} promote
 */

const PLUGIN_NAME = "URLEntryPlugin";

/**
 * Records whether a top-level URL async block is an entry for this compilation.
 * @param {URLDependenciesBlock} block the URL async block
 * @param {ModuleGraph} moduleGraph module graph
 * @param {URLEntryPluginHooks} hooks compilation hooks
 * @returns {void}
 */
const reconcileUrlBlock = (block, moduleGraph, hooks) => {
	for (const dep of block.dependencies) {
		if (!(dep instanceof URLDependency)) continue;
		const resolvedModule = moduleGraph.getModule(dep);
		const promotion =
			resolvedModule &&
			/** @type {BlockPromotion | undefined} */
			(hooks.promote.call(resolvedModule, dep));
		block.promotion = promotion || undefined;
		return;
	}
};

class URLEntryPlugin {
	/**
	 * @param {Compiler} compiler the compiler instance
	 * @returns {void}
	 */
	apply(compiler) {
		compiler.hooks.compilation.tap(PLUGIN_NAME, (compilation) => {
			const hooks = URLEntryPlugin.getCompilationHooks(compilation);

			compilation.hooks.finishModules.tap(PLUGIN_NAME, (modules) => {
				const moduleGraph = compilation.moduleGraph;
				for (const module of modules) {
					// Parser always `module.addBlock`s URL blocks; one level is enough.
					for (const block of module.blocks) {
						if (!(block instanceof URLDependenciesBlock)) continue;
						reconcileUrlBlock(block, moduleGraph, hooks);
					}
				}
			});
		});
	}
}

URLEntryPlugin.getCompilationHooks = createHooksRegistry(
	() =>
		/** @type {URLEntryPluginHooks} */ ({
			promote: new SyncBailHook(["module", "dependency"])
		})
);

module.exports = URLEntryPlugin;
