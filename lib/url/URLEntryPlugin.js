/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Natsu @xiaoxiaojx
*/

"use strict";

const { SyncBailHook } = require("tapable");
const AsyncDependenciesBlock = require("../AsyncDependenciesBlock");
const Compilation = require("../Compilation");
const URLDependency = require("../dependencies/URLDependency");

/** @typedef {import("../Chunk")} Chunk */
/** @typedef {import("../Compiler")} Compiler */
/** @typedef {import("../Dependency")} Dependency */
/** @typedef {import("../Entrypoint").EntryOptions} EntryOptions */
/** @typedef {import("../Module")} Module */

/**
 * @typedef {object} URLEntryPluginHooks
 * @property {SyncBailHook<[Module, URLDependency], EntryOptions | void>} entryOptions
 * @property {SyncBailHook<[Chunk, URLDependency], string | void>} getChunkFilename
 */

const PLUGIN_NAME = "URLEntryPlugin";

/** @type {WeakMap<Compilation, URLEntryPluginHooks>} */
const compilationHooksMap = new WeakMap();

class URLEntryPlugin {
	/**
	 * @param {Compilation} compilation the compilation
	 * @returns {URLEntryPluginHooks} hooks
	 */
	static getCompilationHooks(compilation) {
		if (!(compilation instanceof Compilation)) {
			throw new TypeError(
				"The 'compilation' argument must be an instance of Compilation"
			);
		}
		let hooks = compilationHooksMap.get(compilation);
		if (hooks === undefined) {
			hooks = {
				entryOptions: new SyncBailHook(["module", "dependency"]),
				getChunkFilename: new SyncBailHook(["chunk", "dependency"])
			};
			compilationHooksMap.set(compilation, hooks);
		}
		return hooks;
	}

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

						const entryOptions =
							/** @type {EntryOptions | undefined} */
							(hooks.entryOptions.call(resolvedModule, dep));

						if (!entryOptions) continue;

						module.dependencies.splice(i, 1);
						const block = new AsyncDependenciesBlock({
							name: entryOptions.name || undefined,
							circular: false,
							entryOptions
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

module.exports = URLEntryPlugin;
