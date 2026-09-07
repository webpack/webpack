/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Haijie Xie @hai-x
*/

"use strict";

const HarmonyImportDependency = require("../dependencies/HarmonyImportDependency");
const HarmonyImportSideEffectDependency = require("../dependencies/HarmonyImportSideEffectDependency");

/** @import ModuleGraph from "../ModuleGraph" */
/** @import Module from "../Module" */

/**
 * Collects, by an iterative Tarjan pass, the modules a cycle peer may read in
 * their dead zone. A cycle of bare side-effect imports still inlines.
 * @param {ModuleGraph} moduleGraph module graph
 * @param {Iterable<Module>} modules all modules of the compilation
 * @returns {Set<Module>} modules whose exports must not be inlined
 */
const findModulesInCycles = (moduleGraph, modules) => {
	/** @type {Set<Module>} */
	const inCycle = new Set();
	/** @type {[Module, Module][]} */
	const bindingReads = [];
	/** @type {Map<Module, number>} */
	const componentOf = new Map();
	let nextComponent = 0;
	/** @type {Map<Module, number>} */
	const index = new Map();
	/** @type {Map<Module, number>} */
	const low = new Map();
	/** @type {Set<Module>} */
	const onStack = new Set();
	/** @type {Module[]} */
	const componentStack = [];
	let counter = 0;
	/**
	 * @param {Module} module the module
	 * @returns {Module[]} modules it imports, self included when self-importing
	 */
	const targetsOf = (module) => {
		const connections = moduleGraph.getOutgoingConnectionsByModule(module);
		if (!connections) return [];
		/** @type {Module[]} */
		const targets = [];
		for (const [target, moduleConnections] of connections) {
			if (
				!target ||
				!moduleConnections.some(
					(c) => c.dependency instanceof HarmonyImportDependency
				)
			) {
				continue;
			}
			// Anything but a bare side-effect import may observe the binding.
			if (
				moduleConnections.some(
					(c) =>
						c.dependency instanceof HarmonyImportDependency &&
						!(c.dependency instanceof HarmonyImportSideEffectDependency)
				)
			) {
				bindingReads.push([module, target]);
			}
			targets.push(target);
		}
		return targets;
	};
	/** @type {{ node: Module, targets: Module[], i: number }[]} */
	const work = [];
	/**
	 * @param {Module} node node to open
	 */
	const open = (node) => {
		index.set(node, counter);
		low.set(node, counter);
		counter++;
		componentStack.push(node);
		onStack.add(node);
		work.push({ node, targets: targetsOf(node), i: 0 });
	};
	for (const seed of modules) {
		if (index.has(seed)) continue;
		open(seed);
		while (work.length > 0) {
			const frame = work[work.length - 1];
			if (frame.i < frame.targets.length) {
				const next = frame.targets[frame.i++];
				if (!index.has(next)) {
					open(next);
				} else if (onStack.has(next)) {
					const nodeLow = /** @type {number} */ (low.get(frame.node));
					const nextIndex = /** @type {number} */ (index.get(next));
					if (nextIndex < nodeLow) low.set(frame.node, nextIndex);
				}
				continue;
			}
			work.pop();
			const node = frame.node;
			const nodeLow = /** @type {number} */ (low.get(node));
			if (work.length > 0) {
				const parent = work[work.length - 1].node;
				if (nodeLow < /** @type {number} */ (low.get(parent))) {
					low.set(parent, nodeLow);
				}
			}
			if (nodeLow === index.get(node)) {
				const id = nextComponent++;
				let member;
				do {
					member = /** @type {Module} */ (componentStack.pop());
					onStack.delete(member);
					componentOf.set(member, id);
				} while (member !== node);
			}
		}
	}
	// Reader and target evaluate together exactly when they share a component.
	for (const [origin, target] of bindingReads) {
		if (
			origin === target ||
			componentOf.get(origin) === componentOf.get(target)
		) {
			inCycle.add(target);
		}
	}
	return inCycle;
};

module.exports = findModulesInCycles;
