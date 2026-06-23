/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Natsu @xiaoxiaojx
*/

"use strict";

/** @typedef {import("./Compiler")} Compiler */
/** @typedef {import("./ModuleGraph")} ModuleGraph */
/** @typedef {import("./Module")} Module */
/** @typedef {import("./Module").BuildInfo} BuildInfo */

const PLUGIN_NAME = "CircularModulesPlugin";

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
	 */
	constructor(circularModules) {
		/** @type {Set<Module>} */
		this.circularModules = circularModules;
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
		if (size === 0) return new CycleGraph(new Set());

		/** @type {number[][]} */
		const edges = Array.from({ length: size });
		/** @type {boolean[]} */
		const selfLoops = Array.from({ length: size }, () => false);

		for (let i = 0; i < size; i++) {
			const module = moduleList[i];
			/** @type {number[]} */
			const deps = [];
			for (const connection of moduleGraph.getOutgoingConnections(module)) {
				const dep = connection.dependency;
				if (!dep) continue;
				const target = connection.module;
				if (!target) continue;
				// Weak references don't synchronously evaluate the target.
				if (connection.weak) continue;
				// Async edges (dynamic import & friends) live in AsyncDependenciesBlock,
				// so a synchronous dep's parent block is the module itself.
				if (moduleGraph.getParentBlock(dep) !== module) continue;
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

		return new CycleGraph(circular);
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
