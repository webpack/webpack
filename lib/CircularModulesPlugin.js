/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Natsu @xiaoxiaojx
*/

"use strict";

const HarmonyImportDependency = require("./dependencies/HarmonyImportDependency");
const HarmonyImportSideEffectDependency = require("./dependencies/HarmonyImportSideEffectDependency");
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

// After SideEffectsFlagPlugin / FlagDependencyUsagePlugin (stage 0).
const STAGE_DETECT = 1;

/**
 * Bit flags for why a module is treated as circular.
 * A module may carry both bits when it sits in a sync SCC and is a binding-read target.
 * @enum {number}
 */
const CircularKind = {
	None: 0,
	/** ESM binding-observable target; blocks const export inlining (TDZ). */
	Binding: 1 << 0,
	/** Any synchronous SCC member; blocks value binding. */
	Synchronous: 1 << 1
};

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
 * Whether a sync connection may observe the target's live export binding.
 * Bare side-effect imports do not, so their cycles stay Binding-free.
 * @param {ModuleGraphConnection} connection an outgoing connection
 * @returns {boolean} true when the dependency can read a named/default binding
 */
const isBindingRead = (connection) => {
	const dependency = connection.dependency;
	return (
		dependency instanceof HarmonyImportDependency &&
		!(dependency instanceof HarmonyImportSideEffectDependency)
	);
};

/**
 * Detects circular dependencies among synchronous module imports.
 *
 * One sync-edge SCC pass yields Synchronous members; Binding is derived from
 * the same components for targets of binding-reads that share a component
 * (or self-import), without a second Tarjan.
 *
 * Use the static `build()` method to create an instance. All intermediate data
 * (adjacency layout, index mappings) is local to `build()` and released on
 * return. The instance only holds the result.
 */
class CycleGraph {
	/**
	 * @param {Set<Module>} synchronousModules sync SCC members / self-loops
	 * @param {Set<Module>} bindingModules binding-read targets sharing a sync SCC
	 * @param {Module[][]} circularGroups multi-module SCC groups only (for reporting; self-loops omitted)
	 */
	constructor(synchronousModules, bindingModules, circularGroups) {
		/** @type {Set<Module>} */
		this.synchronousModules = synchronousModules;
		/** @type {Set<Module>} */
		this.bindingModules = bindingModules;
		/** @type {Module[][]} */
		this.circularGroups = circularGroups;
	}

	/**
	 * Builds a CycleGraph by constructing the synchronous outgoing-connection
	 * adjacency list and running iterative SCC to detect circular modules.
	 * @param {Iterable<Module>} modules the set of modules
	 * @param {ModuleGraph} moduleGraph the module graph
	 * @param {boolean=} collectGroups also group the modules of each cycle, which
	 * only the hint reads — marking kinds needs the sets alone
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
		if (size === 0) {
			return new CycleGraph(new Set(), new Set(), []);
		}

		/** @type {number[][]} */
		const edges = Array.from({ length: size });
		/** @type {boolean[]} */
		const selfLoops = Array.from({ length: size }, () => false);
		/** @type {[number, number][]} */
		const bindingReads = [];

		for (let i = 0; i < size; i++) {
			const module = moduleList[i];
			/** @type {number[]} */
			const deps = [];
			for (const connection of moduleGraph.getOutgoingConnections(module)) {
				const target = getSynchronousTarget(connection, module, moduleGraph);
				if (target === null) continue;
				const binding = isBindingRead(connection);
				if (target === module) {
					selfLoops[i] = true;
					if (binding) bindingReads.push([i, i]);
					continue;
				}
				const targetIdx = moduleToIndex.get(target);
				if (targetIdx !== undefined) {
					deps.push(targetIdx);
					if (binding) bindingReads.push([i, targetIdx]);
				}
			}
			edges[i] = deps;
		}

		// Iterative SCC algorithm
		/** @type {Set<Module>} */
		const synchronousModules = new Set();
		/** @type {Module[][]} */
		const circularGroups = [];
		/** @type {Int32Array} */
		const componentOf = new Int32Array(size).fill(-1);
		let nextComponent = 0;
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
							componentOf[w] = nextComponent;
						} while (w !== v);
						nextComponent++;

						if (group.length > 1 || selfLoops[v]) {
							for (const idx of group) {
								synchronousModules.add(moduleList[idx]);
							}
						}

						// A self-loop is synchronous-circular but not a group to report.
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

		/** @type {Set<Module>} */
		const bindingModules = new Set();
		for (const [originIdx, targetIdx] of bindingReads) {
			if (
				originIdx === targetIdx ||
				componentOf[originIdx] === componentOf[targetIdx]
			) {
				bindingModules.add(moduleList[targetIdx]);
			}
		}

		return new CycleGraph(synchronousModules, bindingModules, circularGroups);
	}
}

/**
 * @typedef {object} CircularModulesPluginOptions
 * @property {PerformanceOptions["hints"]=} hints when set, report SCC groups
 */

/**
 * One sync SCC scan: marks Synchronous and Binding kinds, reports groups when hints are set.
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
	 * The circular kind recorded on `module.buildInfo`, or `undefined` when this
	 * plugin did not run for the compilation.
	 * @param {Module} module the module
	 * @returns {number | undefined} bit flags from CircularKind
	 */
	static getCircularKind(module) {
		const buildInfo = /** @type {BuildInfo | undefined} */ (module.buildInfo);
		if (!buildInfo || buildInfo.circularKind === undefined) return undefined;
		return buildInfo.circularKind;
	}

	/**
	 * Whether the module is circular. With `kind`, requires that bit to be set.
	 * Without `kind`, any non-None kind counts. Missing kind (plugin off) is false.
	 * @param {Module} module the module
	 * @param {number=} kind CircularKind bit to test (e.g. CircularKind.Binding)
	 * @returns {boolean} true when the module matches
	 */
	static isCircular(module, kind) {
		const value = CircularModulesPlugin.getCircularKind(module);
		if (value === undefined) return false;
		if (kind === undefined) return value !== CircularKind.None;
		return (value & kind) === kind;
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

			compilation.hooks.optimizeDependencies.tap(
				{
					name: PLUGIN_NAME,
					stage: STAGE_DETECT
				},
				(modules) => {
					const { synchronousModules, bindingModules, circularGroups } =
						CycleGraph.build(modules, compilation.moduleGraph, Boolean(hints));

					for (const m of modules) {
						let kind = CircularKind.None;
						if (synchronousModules.has(m)) {
							kind |= CircularKind.Synchronous;
						}
						if (bindingModules.has(m)) {
							kind |= CircularKind.Binding;
						}
						const buildInfo = /** @type {BuildInfo} */ (m.buildInfo);
						buildInfo.circularKind = kind;
						// Kept for existing tests / readers that still check the boolean.
						buildInfo.isCircular = (kind & CircularKind.Synchronous) !== 0;
					}

					if (!hints) return;
					if (circularGroups.length === 0) {
						warning = undefined;
						return;
					}

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
				}
			);

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

/** @type {typeof CircularKind} */
CircularModulesPlugin.CircularKind = CircularKind;
/** @type {number} */
CircularModulesPlugin.STAGE_DETECT = STAGE_DETECT;

module.exports = CircularModulesPlugin;
