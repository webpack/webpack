"use strict";

const path = require("path");

/** @import { AsyncDependenciesBlock, Compilation, Compiler, Configuration, Dependency, Module, NormalModule } from "../../../../" */

/**
 * Collects the dependencies of a block and its nested blocks.
 * @param {Module | AsyncDependenciesBlock} block the block
 * @param {Dependency[]} dependencies collected dependencies
 * @returns {Dependency[]} collected dependencies
 */
const collectDependencies = (block, dependencies) => {
	for (const dependency of block.dependencies) dependencies.push(dependency);
	for (const child of block.blocks) collectDependencies(child, dependencies);
	return dependencies;
};

/**
 * Groups the module dependencies of a module by request, in source order.
 * @param {Module} module the module
 * @returns {Map<string, Dependency[]>} request -> dependencies
 */
const groupByRequest = (module) => {
	/** @type {Map<string, Dependency[]>} */
	const groups = new Map();
	for (const dependency of collectDependencies(module, [])) {
		const request = /** @type {{ request?: string }} */ (dependency).request;
		if (typeof request !== "string") continue;
		const group = groups.get(request);
		if (group === undefined) {
			groups.set(request, [dependency]);
		} else {
			group.push(dependency);
		}
	}
	return groups;
};

/**
 * Returns the sorted export names the dependencies of one edge forward, `*` for all.
 * @param {Dependency[]} dependencies dependencies of the edge
 * @returns {string} edge label, empty when nothing is forwarded
 */
const getForwardIds = (dependencies) => {
	/** @type {Set<string>} */
	const ids = new Set();
	for (const dependency of dependencies) {
		const id = dependency.getForwardId();
		if (id === true) return "*";
		if (id !== null) ids.add(id);
	}
	return [...ids].sort().join(", ");
};

/**
 * Prints the module graph from the entries, each edge labeled with its forwarded ids. A side-effect-free module with edges is tagged `[barrel]`; an unresolved edge prints its request tagged `[raw]`, plus `[lazy]` when lazy barrel left it unbuilt.
 * @param {Compilation} compilation the compilation, read before seal
 * @returns {string} the printed graph
 */
const printLazyBarrelGraph = (compilation) => {
	const { moduleGraph, requestShortener } = compilation;
	/** @type {string[]} */
	const lines = [];
	/** @type {Set<Module>} */
	const seen = new Set();

	/**
	 * Prints a module, tagged `[barrel]` when side-effect-free with edges lazy barrel may defer.
	 * @param {Module} module the module
	 * @returns {string} the printed module
	 */
	const printModule = (module) => {
		const name = module.readableIdentifier(requestShortener);
		const { factoryMeta } = module;
		return factoryMeta !== undefined &&
			factoryMeta.sideEffectFree &&
			groupByRequest(module).size > 0
			? `${name} [barrel]`
			: name;
	};

	/**
	 * Prints the outgoing edges of a module below it.
	 * @param {Module} module the module
	 * @param {string} prefix tree prefix of the edge lines
	 */
	const walk = (module, prefix) => {
		const groups = [...groupByRequest(module)];
		for (let i = 0; i < groups.length; i++) {
			const [request, dependencies] = groups[i];
			const last = i === groups.length - 1;
			/** @type {Module | null} */
			let target = null;
			for (const dependency of dependencies) {
				target = moduleGraph.getModule(dependency);
				if (target !== null) break;
			}
			const ids = getForwardIds(dependencies);
			let line = `${prefix}${last ? "└─" : "├─"}${ids ? ` (${ids})` : ""} `;
			if (target === null) {
				line += `${request} [raw]`;
				if (dependencies.every((dependency) => dependency.isLazy())) {
					line += " [lazy]";
				}
				lines.push(line);
				continue;
			}
			line += printModule(target);
			if (seen.has(target)) {
				lines.push(`${line} (deduped)`);
				continue;
			}
			seen.add(target);
			lines.push(line);
			walk(target, `${prefix}${last ? "   " : "│  "}`);
		}
	};

	for (const { dependencies } of compilation.entries.values()) {
		for (const dependency of dependencies) {
			const module = moduleGraph.getModule(dependency);
			if (module === null || seen.has(module)) continue;
			seen.add(module);
			lines.push(printModule(module));
			walk(module, "");
		}
	}
	return lines.join("\n");
};

/**
 * Creates the plugin asserting `lazyModules` stay unbuilt and snapshotting the module graph.
 * @param {string[]} lazyModules files, relative to the compiler context, that must never be built
 * @param {string=} hint snapshot hint, to tell configurations of one case apart
 * @returns {(compiler: Compiler) => void} plugin
 */
const createLazyBarrelPlugin = (lazyModules, hint) => (compiler) => {
	const lazyResources = lazyModules.map((file) =>
		path.resolve(compiler.context, file)
	);
	/** @type {Set<string>} */
	const built = new Set();
	compiler.hooks.thisCompilation.tap("createLazyBarrelTest", (compilation) => {
		compilation.hooks.buildModule.tap("createLazyBarrelTest", (module) => {
			built.add(/** @type {NormalModule} */ (module).resource);
		});
		// before seal: concatenation re-points connections
		compilation.hooks.finishModules.tap("createLazyBarrelTest", () => {
			const graph = printLazyBarrelGraph(compilation);
			if (hint === undefined) {
				expect(graph).toMatchSnapshot();
			} else {
				expect(graph).toMatchSnapshot(hint);
			}
		});
	});
	compiler.hooks.done.tap("createLazyBarrelTest", () => {
		for (const resource of lazyResources) {
			expect(built.has(resource)).toBe(false);
		}
	});
};

/**
 * Applies the lazy barrel test plugin to a configuration.
 * @param {Configuration} options the configuration
 * @param {string[]} lazyModules files, relative to the case, that must never be built
 * @param {string=} hint snapshot hint
 * @returns {Configuration} the configuration with the plugin applied
 */
const applyLazyBarrelPlugin = (options, lazyModules, hint) => ({
	...options,
	plugins: [
		...(options.plugins || []),
		createLazyBarrelPlugin(lazyModules, hint)
	]
});

/**
 * Creates the lazy barrel test configuration; an array builds each configuration, its snapshot named by `name` or index.
 * @template {Configuration | Configuration[]} T
 * @param {string[]} lazyModules files, relative to the case, that must never be built in any configuration
 * @param {T=} options extra configuration, or one per build
 * @returns {T} the configuration(s)
 */
const createLazyBarrelTest = (lazyModules, options) =>
	/** @type {T} */ (
		Array.isArray(options)
			? options.map((config, index) =>
					applyLazyBarrelPlugin(
						config,
						lazyModules,
						config.name === undefined ? String(index) : config.name
					)
				)
			: applyLazyBarrelPlugin(options || {}, lazyModules)
	);

module.exports = createLazyBarrelTest;
module.exports.printLazyBarrelGraph = printLazyBarrelGraph;
