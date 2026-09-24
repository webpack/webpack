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
/** @typedef {import("../graph/ModuleGraph")} ModuleGraph */

/**
 * @typedef {object} URLEntryPluginHooks
 * @property {SyncBailHook<[import("../module/Module"), URLDependency], BlockPromotion | void>} promote
 */

const PLUGIN_NAME = "URLEntryPlugin";

/**
 * Recomputes URL entry identity for this compilation from the resolved module.
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
		if (promotion) block.promote(promotion);
		else block.demote();
		return;
	}
	block.demote();
};

class URLEntryPlugin {
	/**
	 * @param {Compiler} compiler the compiler instance
	 * @returns {void}
	 */
	apply(compiler) {
		compiler.hooks.compilation.tap(PLUGIN_NAME, (compilation) => {
			const hooks = URLEntryPlugin.getCompilationHooks(compilation);

			compilation.hooks.finishModules.tap(PLUGIN_NAME, () => {
				const moduleGraph = compilation.moduleGraph;
				// Cached issuer modules may not be present in the hook argument. Reconcile
				// the complete graph so promotion remains compilation-local and watch-safe.
				for (const module of compilation.modules) {
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
