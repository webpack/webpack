/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Alexander Akait @alexander-akait
*/

"use strict";

const {
	CycleGraph,
	getSynchronousTarget
} = require("../CircularModulesPlugin");
const CircularDependenciesWarning = require("../errors/CircularDependenciesWarning");

/** @typedef {import("../../declarations/WebpackOptions").PerformanceOptions} PerformanceOptions */
/** @typedef {import("../Compiler")} Compiler */
/** @typedef {import("../Module")} Module */
/** @typedef {import("../ModuleGraph")} ModuleGraph */
/** @typedef {import("../RequestShortener")} RequestShortener */
/** @typedef {import("../errors/CircularDependenciesWarning").CircularDependencyDetails} CircularDependencyDetails */

const PLUGIN_NAME = "CircularDependenciesPlugin";

// Enough to name the worst tangles without printing the module graph.
const MAX_REPORTED_CYCLES = 5;

/**
 * The shortest cycle through the first module of a group, as a readable path
 * ending back where it started.
 * @param {Module[]} members one group of modules that can all reach each other
 * @param {ModuleGraph} moduleGraph the module graph
 * @param {RequestShortener} requestShortener the request shortener
 * @returns {string} the cycle path
 */
const formatShortestCycle = (members, moduleGraph, requestShortener) => {
	const group = new Set(members);
	const start = members[0];
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

class CircularDependenciesPlugin {
	/**
	 * Creates an instance of CircularDependenciesPlugin.
	 * @param {PerformanceOptions} options the plugin options
	 */
	constructor(options) {
		/** @type {PerformanceOptions["hints"]} */
		this.hints = options.hints;
	}

	/**
	 * Applies the plugin by registering its hooks on the compiler.
	 * @param {Compiler} compiler the compiler instance
	 * @returns {void}
	 */
	apply(compiler) {
		const hints = this.hints;

		if (!hints) return;

		compiler.hooks.compilation.tap(PLUGIN_NAME, (compilation) => {
			// A cycle is a property of the source, so it is read off the graph as
			// built, before any optimization reshapes it.
			compilation.hooks.finishModules.tap(PLUGIN_NAME, () => {
				const { moduleGraph, requestShortener } = compilation;
				const { components } = CycleGraph.build(
					compilation.modules,
					moduleGraph
				);

				if (components.length === 0) return;

				// Largest tangle first — it is the one worth untangling.
				components.sort((a, b) => b.length - a.length);

				// The shortest cycle of a large group names two of its modules, so the
				// size travels with it — otherwise the group reads as a pair.
				const groups = components
					.slice(0, MAX_REPORTED_CYCLES)
					.map((members) => ({
						size: members.length,
						cycle: formatShortestCycle(members, moduleGraph, requestShortener)
					}));
				const warning = new CircularDependenciesWarning(
					groups,
					components.length
				);

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

module.exports = CircularDependenciesPlugin;
