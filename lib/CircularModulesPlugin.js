/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Natsu @xiaoxiaojx
*/

"use strict";

const CircularDependenciesWarning = require("./errors/CircularDependenciesWarning");
const { compareModulesByIdentifier } = require("./util/comparators");

/** @import { PerformanceOptions } from "../declarations/WebpackOptions" */
/** @import Compiler from "./Compiler" */
/** @import ModuleGraph from "./ModuleGraph" */
/** @import ModuleGraphConnection from "./ModuleGraphConnection" */
/** @import Module, { BuildInfo } from "./Module" */
/** @import RequestShortener from "./RequestShortener" */

const PLUGIN_NAME = "CircularModulesPlugin";

// Enough to name the worst tangles without printing the module graph.
const MAX_REPORTED_CYCLES = 5;

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
 * The member a group is reported from. Traversal order is not stable across
 * runs, so the lowest identifier is picked rather than the one found first.
 * @param {Module[]} members one group of modules that can all reach each other
 * @returns {Module} the module the report starts at
 */
const getCanonicalMember = (members) => {
	let canonical = members[0];

	for (const member of members) {
		if (compareModulesByIdentifier(member, canonical) < 0) {
			canonical = member;
		}
	}

	return canonical;
};

/**
 * The shortest cycle through the canonical module of a group, as a readable
 * path ending back where it started.
 * @param {Module[]} members one group of modules that can all reach each other
 * @param {ModuleGraph} moduleGraph the module graph
 * @param {RequestShortener} requestShortener the request shortener
 * @returns {string} the cycle path
 */
const formatShortestCycle = (members, moduleGraph, requestShortener) => {
	const group = new Set(members);
	const start = getCanonicalMember(members);
	/** @type {Map<Module, Module>} */
	const previous = new Map();
	const queue = [start];
	/** @type {Module | undefined} */
	let last;

	for (let i = 0; i < queue.length && last === undefined; i++) {
		const module = queue[i];

		for (const connection of moduleGraph.getOutgoingConnections(module)) {
			const target = getSynchronousTarget(connection, module, moduleGraph);

			// A module reading its own exports would otherwise collapse the path.
			if (target === null || target === module || !group.has(target)) continue;

			if (target === start) {
				last = module;
				break;
			}

			if (previous.has(target)) continue;

			previous.set(target, module);
			queue.push(target);
		}
	}

	const path = [start];

	for (
		let module = last;
		module !== undefined && module !== start;
		module = previous.get(module)
	) {
		path.push(module);
	}

	path.push(start);

	return path
		.reverse()
		.map((module) => module.readableIdentifier(requestShortener))
		.join(" -> ");
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
	 * @param {Set<Module>} circularModules modules in a multi-module SCC or with a self-loop (for isCircular)
	 * @param {Module[][]} circularGroups multi-module SCC groups only (for reporting; self-loops omitted)
	 */
	constructor(circularModules, circularGroups) {
		/** @type {Set<Module>} */
		this.circularModules = circularModules;
		/** @type {Module[][]} */
		this.circularGroups = circularGroups;
	}

	/**
	 * Builds a CycleGraph by constructing the synchronous outgoing-connection
	 * adjacency list and running iterative SCC to detect circular modules.
	 * @param {Iterable<Module>} modules the set of modules
	 * @param {ModuleGraph} moduleGraph the module graph
	 * @param {boolean=} collectGroups also group the modules of each cycle, which
	 * only the hint reads — marking `isCircular` needs the set alone
	 * @returns {CycleGraph} the result
	 */
	static build(modules, moduleGraph, collectGroups = false) {
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
		const circularModules = new Set();
		/** @type {Module[][]} */
		const circularGroups = [];
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
						const group = [];
						let w;
						do {
							w = /** @type {number} */ (sccStack.pop());
							nodeOnStack[w] = 0;
							group.push(w);
						} while (w !== v);

						if (group.length > 1 || selfLoops[v]) {
							for (const idx of group) {
								circularModules.add(moduleList[idx]);
							}
						}

						// A module that only references itself is no cycle, so it is
						// circular for inlining but never a group to report.
						if (collectGroups && group.length > 1) {
							circularGroups.push(group.map((idx) => moduleList[idx]));
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

		return new CycleGraph(circularModules, circularGroups);
	}
}

/**
 * @typedef {object} CircularModulesPluginOptions
 * @property {PerformanceOptions["hints"]=} hints when set, report SCC groups
 */

/**
 * One SCC scan: marks isCircular on every module, and reports groups when hints are set.
 */
class CircularModulesPlugin {
	/**
	 * @param {CircularModulesPluginOptions=} options options
	 */
	constructor(options) {
		/** @type {PerformanceOptions["hints"] | undefined} */
		this.hints = options && options.hints;
	}

	/**
	 * @param {Compiler} compiler the compiler instance
	 * @returns {void}
	 */
	apply(compiler) {
		const hints = this.hints;

		compiler.hooks.compilation.tap(PLUGIN_NAME, (compilation) => {
			/** @type {CircularDependenciesWarning | undefined} */
			let warning;

			compilation.hooks.optimizeModules.tap(PLUGIN_NAME, (modules) => {
				const { circularModules, circularGroups } = CycleGraph.build(
					modules,
					compilation.moduleGraph,
					Boolean(hints)
				);

				// Must be an explicit boolean: ConstExportsPlugin checks `=== false`.
				for (const m of modules) {
					/** @type {BuildInfo} */
					(m.buildInfo).isCircular = circularModules.has(m);
				}

				if (!hints) return;
				if (circularGroups.length === 0) return;

				const { moduleGraph, requestShortener } = compilation;

				// Largest tangle first; ties break by name, as the order groups are
				// discovered in is not stable.
				circularGroups.sort(
					(a, b) =>
						b.length - a.length ||
						compareModulesByIdentifier(
							getCanonicalMember(a),
							getCanonicalMember(b)
						)
				);

				// The shortest cycle of a large group names two of its modules, so the
				// size travels with it — otherwise the group reads as a pair.
				const groups = circularGroups
					.slice(0, MAX_REPORTED_CYCLES)
					.map((members) => ({
						size: members.length,
						cycle: formatShortestCycle(members, moduleGraph, requestShortener)
					}));
				warning = new CircularDependenciesWarning(
					groups,
					circularGroups.length
				);
			});

			// Reported past the hash: `createHash` folds every message into it, so
			// a hint pushed earlier would change the build's identity.
			compilation.hooks.afterSeal.tap(PLUGIN_NAME, () => {
				if (warning === undefined) return;

				if (hints === "error") {
					compilation.errors.push(warning);
				} else if (hints === "stats") {
					compilation.hints.push(warning);
				} else {
					compilation.warnings.push(warning);
				}
			});
		});
	}
}

module.exports = CircularModulesPlugin;
