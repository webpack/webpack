/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Alexander Akait @alexander-akait
*/

"use strict";

const HarmonyAcceptDependency = require("../dependencies/HarmonyAcceptDependency");
const { findModulesInCycles } = require("./InlineExports");
const { enableLocalImportBindings } = require("./LocalImportBindings");

/** @import Compiler from "../Compiler" */
/** @import Module from "../Module" */
/** @import ModuleGraph from "../ModuleGraph" */

const PLUGIN_NAME = "LocalImportBindingsPlugin";

/**
 * Collects, per module, the modules it accepts a hot update from. Their exports
 * are re-read by the accept handler rather than by re-running the module body,
 * so a local variable would keep the value the update replaced.
 * @param {ModuleGraph} moduleGraph module graph
 * @param {Iterable<Module>} modules all modules of the compilation
 * @returns {Map<Module, Set<Module>>} accepted modules, only for modules that accept one
 */
const findAcceptedModules = (moduleGraph, modules) => {
	/** @type {Map<Module, Set<Module>>} */
	const acceptedModules = new Map();
	for (const module of modules) {
		for (const dependency of module.dependencies) {
			if (!(dependency instanceof HarmonyAcceptDependency)) continue;
			for (const accepted of dependency.dependencies) {
				const acceptedModule = moduleGraph.getModule(accepted);
				if (!acceptedModule) continue;
				let set = acceptedModules.get(module);
				if (set === undefined) acceptedModules.set(module, (set = new Set()));
				set.add(acceptedModule);
			}
		}
	}
	return acceptedModules;
};

/**
 * Lets an imported binding keep its own name in the generated code wherever a
 * local variable is observationally equal to the live binding, so a debugger
 * resolves it under the name the source uses.
 */
class LocalImportBindingsPlugin {
	/**
	 * @param {Compiler} compiler the compiler instance
	 * @returns {void}
	 */
	apply(compiler) {
		compiler.hooks.compilation.tap(PLUGIN_NAME, (compilation) => {
			const { moduleGraph } = compilation;
			compilation.hooks.optimizeDependencies.tap(PLUGIN_NAME, (modules) => {
				enableLocalImportBindings(moduleGraph, {
					cyclicModules: findModulesInCycles(moduleGraph, modules),
					acceptedModules: findAcceptedModules(moduleGraph, modules)
				});
			});
		});
	}
}

module.exports = LocalImportBindingsPlugin;
