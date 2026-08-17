/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Natsu @xiaoxiaojx
*/

"use strict";

/** @typedef {import("./Compiler")} Compiler */
/** @typedef {import("./ModuleGraph")} ModuleGraph */
/** @typedef {import("./ModuleGraphConnection")} ModuleGraphConnection */
/** @typedef {import("./Module")} Module */
/** @typedef {import("./Module").BuildInfo} BuildInfo */

const PLUGIN_NAME = "CircularModulesPlugin";

/**
 * The module a connection makes its origin evaluate before it can run, or
 * `null` when it does not: a weak reference never loads its target, and an
 * async edge lives in an `AsyncDependenciesBlock`, so a synchronous
 * dependency's parent block is the module itself. A self-reference is
 * returned — how CommonJS reads its own `module.exports` — and is the
 * caller's to interpret.
 * @param {ModuleGraphConnection} connection an outgoing connection
 * @param {Module} module the module the connection starts at
 * @param {ModuleGraph} moduleGraph the module graph
 * @returns {Module | null} the module evaluated first, or `null`
 */
const getSynchronousTarget = (connection, module, moduleGraph) => {
	const dependency = connection.dependency;

	if (!dependency) return null;

	const target = connection.module;

	if (!target || connection.weak) return null;

	if (moduleGraph.getParentBlock(dependency) !== module) return null;

	return target;
};

/**
 * Detects circular dependencies among synchronous module imports.
 *
 * Builds an adjacency layout from each module's synchronous outgoing
 * connections (skipping weak and async-block edges), then runs an iterative
 * SCC algorithm to find circular modules.
 *
 * Use the static `build()` method to create an instance. All intermediate data
 * (adjacency layout, index mappings) is local to `build()` and released on
 * return. The instance only holds the result.
 */
class CycleGraph {
	/**
	 * @param {Set<Module>} circularModules modules involved in circular dependencies
	 * @param {Module[][]} components groups of at least two modules that can all reach each other
	 */
	constructor(circularModules, components) {
		/** @type {Set<Module>} */
		this.circularModules = circularModules;
		/** @type {Module[][]} */
		this.components = components;
	}

	/**
	 * Builds a CycleGraph by constructing the synchronous outgoing-connection
	 * adjacency list and running iterative SCC to detect circular modules.
	 * @param {Iterable<Module>} modules the set of modules
	 * @param {ModuleGraph} moduleGraph the module graph
	 * @returns {CycleGraph} the result
	 */
	static build(modules, moduleGraph) {
		/** @type {Module[]} */
		const moduleList = [];
		/** @type {Map<Module, number>} */
		const moduleToIndex = new Map();
		for (const module of modules) {
			moduleToIndex.set(module, moduleList.length);
			moduleList.push(module);
		}

		const size = moduleList.length;
		if (size === 0) return new CycleGraph(new Set(), []);

		/** @type {number[][]} */
		const edges = Array.from({ length: size });
		/** @type {boolean[]} */
		const selfLoops = Array.from({ length: size }, () => false);

		for (let i = 0; i < size; i++) {
			const module = moduleList[i];
			/** @type {number[]} */
			const deps = [];
			for (const connection of moduleGraph.getOutgoingConnections(module)) {
				const target = getSynchronousTarget(connection, module, moduleGraph);
				if (target === null) continue;
				if (target === module) {
					selfLoops[i] = true;
					continue;
				}
				const targetIdx = moduleToIndex.get(target);
				if (targetIdx !== undefined) {
					deps.push(targetIdx);
				}
			}
			edges[i] = deps;
		}

		// Iterative SCC algorithm
		/** @type {Set<Module>} */
		const circular = new Set();
		/** @type {Module[][]} */
		const components = [];
		let nextIndex = 0;
		const nodeIndex = new Int32Array(size).fill(-1);
		const nodeLowLink = new Int32Array(size);
		const nodeOnStack = new Uint8Array(size);
		/** @type {number[]} */
		const sccStack = [];

		/**
		 * @typedef {object} Frame
		 * @property {number} node
		 * @property {number} edgeIdx
		 * @property {number} parent
		 */

		for (let root = 0; root < size; root++) {
			if (nodeIndex[root] !== -1) continue;

			nodeIndex[root] = nextIndex;
			nodeLowLink[root] = nextIndex;
			nextIndex++;
			nodeOnStack[root] = 1;
			sccStack.push(root);

			/** @type {Frame[]} */
			const callStack = [{ node: root, edgeIdx: 0, parent: -1 }];

			while (callStack.length > 0) {
				const frame = /** @type {Frame} */ (callStack[callStack.length - 1]);
				const v = frame.node;
				const vEdges = edges[v];

				if (frame.edgeIdx < vEdges.length) {
					const w = vEdges[frame.edgeIdx++];
					if (nodeIndex[w] === -1) {
						nodeIndex[w] = nextIndex;
						nodeLowLink[w] = nextIndex;
						nextIndex++;
						nodeOnStack[w] = 1;
						sccStack.push(w);
						callStack.push({ node: w, edgeIdx: 0, parent: v });
					} else if (nodeOnStack[w] && nodeIndex[w] < nodeLowLink[v]) {
						nodeLowLink[v] = nodeIndex[w];
					}
				} else {
					if (nodeLowLink[v] === nodeIndex[v]) {
						/** @type {number[]} */
						const component = [];
						let w;
						do {
							w = /** @type {number} */ (sccStack.pop());
							nodeOnStack[w] = 0;
							component.push(w);
						} while (w !== v);

						if (component.length > 1 || selfLoops[v]) {
							for (const idx of component) {
								circular.add(moduleList[idx]);
							}
						}

						// A module that only references itself is no cycle, so it is
						// circular for inlining but never a group to report.
						if (component.length > 1) {
							components.push(component.map((idx) => moduleList[idx]));
						}
					}

					callStack.pop();
					if (
						frame.parent !== -1 &&
						nodeLowLink[v] < nodeLowLink[frame.parent]
					) {
						nodeLowLink[frame.parent] = nodeLowLink[v];
					}
				}
			}
		}

		return new CycleGraph(circular, components);
	}
}

/**
 * Detects circular dependencies and marks each circular module
 * via buildInfo.isCircular for downstream consumers.
 */
class CircularModulesPlugin {
	/**
	 * @param {Compiler} compiler the compiler instance
	 * @returns {void}
	 */
	apply(compiler) {
		compiler.hooks.compilation.tap(PLUGIN_NAME, (compilation) => {
			compilation.hooks.optimizeModules.tap(PLUGIN_NAME, (modules) => {
				const { circularModules } = CycleGraph.build(
					modules,
					compilation.moduleGraph
				);
				for (const m of modules) {
					/** @type {BuildInfo} */
					(m.buildInfo).isCircular = circularModules.has(m);
				}
			});
		});
	}
}

module.exports = CircularModulesPlugin;
module.exports.CycleGraph = CycleGraph;
module.exports.getSynchronousTarget = getSynchronousTarget;
