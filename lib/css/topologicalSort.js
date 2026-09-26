/*
	MIT License http://www.opensource.org/licenses/mit-license.php
*/

"use strict";

/**
 * Topologically sort `nodes` using Kahn's algorithm with source-order
 * tie-breaking. Nodes that participate in a cycle remain unvisited —
 * `visit` is never called for them — so the caller can naturally keep
 * them in their original position by treating "no visit" as "keep
 * source order".
 *
 * Precondition: every node appearing in `graph` (as a key OR inside any
 * successor set) must also appear in `nodes`. The caller owns this
 * invariant; the function does not validate it.
 *
 * Complexity: O(V·(V + E)). Each outer iteration scans the ready set
 * linearly to find the smallest source-index node. CSS composes graphs
 * are small (a handful of files per module) so this is fine; if a much
 * larger graph ever needs sorting here, swap in a min-heap.
 * @template T
 * @param {Map<T, Set<T>>} graph adjacency list (`a -> b` means `a` must come before `b`)
 * @param {T[]} nodes nodes in source first-appearance order
 * @param {(node: T, index: number) => void} visit called once per non-cyclic node in topological order
 * @returns {void}
 */
module.exports = (graph, nodes, visit) => {
	/** @type {Map<T, number>} */
	const inDegree = new Map();
	/** @type {Map<T, number>} */
	const sourceIndex = new Map();
	for (let i = 0; i < nodes.length; i++) {
		inDegree.set(nodes[i], 0);
		sourceIndex.set(nodes[i], i);
	}
	for (const successors of graph.values()) {
		for (const to of successors) {
			inDegree.set(to, /** @type {number} */ (inDegree.get(to)) + 1);
		}
	}

	const ready = nodes.filter((n) => inDegree.get(n) === 0);
	let index = 0;
	while (ready.length > 0) {
		// Smallest-source-index wins ties. Linear scan + swap-with-last
		// + pop avoids re-sorting the ready set on every iteration.
		let minIdx = 0;
		for (let i = 1; i < ready.length; i++) {
			if (
				/** @type {number} */ (sourceIndex.get(ready[i])) <
				/** @type {number} */ (sourceIndex.get(ready[minIdx]))
			) {
				minIdx = i;
			}
		}
		const node = ready[minIdx];
		ready[minIdx] = ready[ready.length - 1];
		ready.pop();
		visit(node, index++);
		const successors = graph.get(node);
		if (!successors) continue;
		for (const to of successors) {
			const newDeg = /** @type {number} */ (inDegree.get(to)) - 1;
			inDegree.set(to, newDeg);
			if (newDeg === 0) ready.push(to);
		}
	}
};
