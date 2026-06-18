/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Natsu @xiaoxiaojx
*/

"use strict";

const { SyncBailHook } = require("tapable");
const AsyncDependenciesBlock = require("../AsyncDependenciesBlock");
const RuntimeGlobals = require("../RuntimeGlobals");
const URLDependency = require("../dependencies/URLDependency");
const createHooksRegistry = require("../util/createHooksRegistry");

/** @typedef {import("../Compiler")} Compiler */
/** @typedef {import("../Entrypoint").EntryOptions} EntryOptions */

/**
 * @typedef {object} URLEntryPromotion
 * @property {EntryOptions} entryOptions
 * @property {string=} chunkFilenameGlobal
 */

/**
 * @typedef {object} URLEntryPluginHooks
 * @property {SyncBailHook<[import("../Module"), URLDependency], URLEntryPromotion | void>} promote
 */

const PLUGIN_NAME = "URLEntryPlugin";

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
					const deps = module.dependencies;
					for (let i = deps.length - 1; i >= 0; i--) {
						const dep = deps[i];
						if (!(dep instanceof URLDependency)) continue;

						const resolvedModule = moduleGraph.getModule(dep);
						if (!resolvedModule) continue;

						const promotion =
							/** @type {URLEntryPromotion | undefined} */
							(hooks.promote.call(resolvedModule, dep));
						if (!promotion) continue;

						dep.entryChunkFilenameGlobal =
							promotion.chunkFilenameGlobal ||
							RuntimeGlobals.getChunkScriptFilename;

						deps.splice(i, 1);
						const block = new AsyncDependenciesBlock({
							name: promotion.entryOptions.name || undefined,
							circular: false,
							entryOptions: promotion.entryOptions
						});
						block.loc = dep.loc;
						block.addDependency(dep);
						module.addBlock(block);
						moduleGraph.setParents(dep, block, module);
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
