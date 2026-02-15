"use strict";

const findGraphRoots = require("../lib/util/findGraphRoots");

/**
 * Helper to run findGraphRoots with a simple adjacency list
 * @param {Record<string, string[]>} graph adjacency list
 * @returns {string[]} sorted roots
 */
const roots = (graph) =>
	[...findGraphRoots(Object.keys(graph), (m) => graph[m])].sort();

describe("findGraphRoots", () => {
	it("should find root in a simple chain", () => {
		// A -> B -> C: A is the root (no incoming)
		expect(roots({ A: ["B"], B: ["C"], C: [] })).toEqual(["A"]);
	});

	it("should find root in a diamond graph", () => {
		// A -> B, A -> C, B -> D, C -> D
		expect(roots({ A: ["B", "C"], B: ["D"], C: ["D"], D: [] })).toEqual(["A"]);
	});

	it("should handle a self-referencing node", () => {
		expect(roots({ A: ["A"] })).toEqual(["A"]);
	});

	it("should return deterministic roots for cycles regardless of edge ordering", () => {
		// This is the exact reproduction from issue #20445
		// A -> [C, B], B -> C, C -> A (and a reordered version)
		// Both should produce the same set of roots
		const g1 = { A: ["C", "B"], B: ["C"], C: ["A"] };
		const g2 = { A: ["B", "C"], B: ["C"], C: ["A"] };

		expect(roots(g1)).toEqual(roots(g2));
	});

	it("should pick the node with most incoming edges in a cycle", () => {
		// A -> C, A -> B, B -> C, C -> A
		// C has 2 incoming edges within the cycle (from A and B)
		const g = { A: ["C", "B"], B: ["C"], C: ["A"] };
		expect(roots(g)).toEqual(["C"]);
	});

	it("should handle two separate cycles", () => {
		const g = { A: ["B"], B: ["A"], C: ["D"], D: ["C"] };
		const r = roots(g);
		// Each cycle should contribute at least one root
		expect(r.length).toBeGreaterThanOrEqual(2);
	});

	it("should handle a cycle with an external reference", () => {
		// D -> A -> B -> A (cycle), so D is external, A-B is a cycle
		// The cycle A-B is not a root cycle because D references it
		// D should be the root
		const g = { A: ["B"], B: ["A"], D: ["A"] };
		expect(roots(g)).toEqual(["D"]);
	});

	it("should handle complex cycles with consistent results", () => {
		// Larger cycle with multiple orderings
		const g1 = { A: ["B"], B: ["C"], C: ["D"], D: ["A", "B"] };
		const g2 = { A: ["B"], B: ["C"], C: ["D"], D: ["B", "A"] };
		expect(roots(g1)).toEqual(roots(g2));
	});
});
