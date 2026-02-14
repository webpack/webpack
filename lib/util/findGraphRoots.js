/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

"use strict";

const NO_MARKER = 0;
const IN_PROGRESS_MARKER = 1;
const DONE_MARKER = 2;
const DONE_MAYBE_ROOT_CYCLE_MARKER = 3;

/**
 * @template T
 * @typedef {Set<Node<T>>} Nodes
 */

/**
 * @template T
 * @typedef {Set<Cycle<T>>} Cycles
 */

/**
 * @template T
 */
class Node {
	/**
	 * @param {T} item the value of the node
	 */
	constructor(item) {
		this.item = item;
		/** @type {Nodes<T>} */
		this.dependencies = new Set();
		/** @type {Cycle<T>} */
		this.cycle = new Cycle();
		this.cycle.nodes.add(this);
		this.incoming = 0;
	}
}

/**
 * @template T
 */
class Cycle {
	constructor() {
		/** @type {Nodes<T>} */
		this.nodes = new Set();
		this.marker = NO_MARKER;
	}
}

/**
 * @template T
 * @typedef {object} StackEntry
 * @property {Node<T>} node
 * @property {Node<T>[]} openEdges
 */

/**
 * @template T
 * @param {Iterable<T>} items list of items
 * @param {(item: T) => Iterable<T>} getDependencies function to get dependencies of an item (items that are not in list are ignored)
 * @returns {Iterable<T>} graph roots of the items
 */
module.exports = (items, getDependencies) => {
	/** @type {Map<T, Node<T>>} */
	const itemToNode = new Map();
	for (const item of items) {
		const node = new Node(item);
		itemToNode.set(item, node);
	}

	// early exit when there is only a single item
	if (itemToNode.size <= 1) return items;

	// grab all the dependencies
	for (const node of itemToNode.values()) {
		for (const dep of getDependencies(node.item)) {
			const depNode = itemToNode.get(dep);
			if (depNode !== undefined) {
				node.dependencies.add(depNode);
			}
		}
	}

	// Set of current cycles without references to it
	// cycles will be removed if a new reference to it has been found
	// that is not part of the cycle
	/** @type {Cycles<T>} */
	const rootCycles = new Set();

	// For all non-marked nodes
	for (const selectedNode of itemToNode.values()) {
		if (selectedNode.cycle.marker === NO_MARKER) {
			// deep-walk all referenced modules
			// in a non-recursive way

			// start by entering the selected node
			selectedNode.cycle.marker = IN_PROGRESS_MARKER;

			// keep a stack to avoid recursive walk
			/** @type {StackEntry<T>[]} */
			const stack = [
				{
					node: selectedNode,
					openEdges: [...selectedNode.dependencies]
				}
			];

			// process the top item until stack is empty
			while (stack.length > 0) {
				const topOfStack = stack[stack.length - 1];

				// Are there still edges unprocessed in the current node?
				if (topOfStack.openEdges.length > 0) {
					// Process one dependency
					const dependency =
						/** @type {Node<T>} */
						(topOfStack.openEdges.pop());
					const cycle = dependency.cycle;
					switch (cycle.marker) {
						case NO_MARKER:
							// dependency has not be visited yet
							// mark it as in-progress and recurse
							stack.push({
								node: dependency,
								openEdges: [...dependency.dependencies]
							});
							cycle.marker = IN_PROGRESS_MARKER;
							break;
						case IN_PROGRESS_MARKER: {
							// It's a in-progress cycle
							// set cycle property for each node in the cycle
							// if nodes are already part of a cycle
							// we merge the cycles to a shared cycle
							/** @type {Set<Cycle<T>>} */
							const toMerge = new Set();
							for (
								let i = stack.length - 1;
								stack[i].node.cycle !== cycle;
								i--
							) {
								toMerge.add(stack[i].node.cycle);
							}
							for (const cycleToMerge of toMerge) {
								// merge cycles
								for (const cycleNode of cycleToMerge.nodes) {
									cycleNode.cycle = cycle;
									cycle.nodes.add(cycleNode);
								}
							}
							// don't recurse into dependencies
							// these are already on the stack
							break;
						}
						case DONE_MAYBE_ROOT_CYCLE_MARKER:
							// This node has be visited yet and
							// is maybe currently part of a completed root cycle
							// we found a new reference to the cycle
							// so it's not really a root cycle
							// remove the cycle from the root cycles
							// and convert it to a normal node
							rootCycles.delete(/** @type {Cycle<T>} */ (cycle));
							cycle.marker = DONE_MARKER;
							break;
						// DONE_MARKER: nothing to do, don't recurse into dependencies
					}
				} else {
					// All dependencies of the current node has been visited
					// we leave the node
					stack.pop();
					// Only mark the cycle as done when we leave the outermost
					// node of the cycle on the stack
					if (
						stack.length === 0 ||
						topOfStack.node.cycle !== stack[stack.length - 1].node.cycle
					) {
						topOfStack.node.cycle.marker = DONE_MARKER;
					}
				}
			}
			const cycle = selectedNode.cycle;
			cycle.marker = DONE_MAYBE_ROOT_CYCLE_MARKER;
			rootCycles.add(cycle);
		}
	}

	// Set of root modules
	/** @type {T[]} */
	const roots = [];

	// Extract roots from root cycles
	// We take the nodes with most incoming edges
	// inside of the cycle
	for (const cycle of rootCycles) {
		let max = 0;
		/** @type {Nodes<T>} */
		const cycleRoots = new Set(cycle.nodes);
		const nodes = cycle.nodes;
		for (const node of nodes) {
			for (const dep of node.dependencies) {
				if (nodes.has(dep)) {
					dep.incoming++;
					if (dep.incoming < max) continue;
					if (dep.incoming > max) {
						cycleRoots.clear();
						max = dep.incoming;
					}
					cycleRoots.add(dep);
				}
			}
		}
		for (const cycleRoot of cycleRoots) {
			roots.push(cycleRoot.item);
		}
	}

	// When roots were found, return them
	if (roots.length > 0) return roots;

	throw new Error("Implementation of findGraphRoots is broken");
};
