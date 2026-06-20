"use strict";

const findGraphRoots = require("../lib/util/findGraphRoots");

const args = (/** @type {Record<string, string[]>} */ g) =>
	/** @type {[string[], (m: string) => string[]]} */ ([
		Object.keys(g),
		(/** @type {string} */ m) => g[m]
	]);

// seeded PRNG keeps the permutation fuzzing deterministic across runs
const mulberry32 = (/** @type {number} */ seed) => () => {
	seed = (seed + 0x6d2b79f5) | 0;
	let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
	t ^= t + Math.imul(t ^ (t >>> 7), 61 | t);
	return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};

/**
 * @param {string[]} arr array to copy and shuffle
 * @param {() => number} rnd random source in [0, 1)
 * @returns {string[]} shuffled copy
 */
const shuffle = (arr, rnd) => {
	const a = [...arr];
	for (let i = a.length - 1; i > 0; i--) {
		const j = Math.floor(rnd() * (i + 1));
		[a[i], a[j]] = [a[j], a[i]];
	}
	return a;
};

/**
 * Permutes node order and each node's edge order without changing the graph.
 * @param {Record<string, string[]>} graph adjacency list
 * @param {() => number} rnd random source in [0, 1)
 * @returns {Record<string, string[]>} permuted adjacency list
 */
const permute = (graph, rnd) => {
	/** @type {Record<string, string[]>} */
	const g = {};
	for (const k of shuffle(Object.keys(graph), rnd)) {
		g[k] = shuffle(graph[k], rnd);
	}
	return g;
};

const rootsOf = (/** @type {Record<string, string[]>} */ g) =>
	new Set(findGraphRoots(...args(g)));

describe("findGraphRoots", () => {
	it("simple case", () => {
		const g = { A: ["B"], B: ["C"], C: ["D"], D: ["B"] };

		expect(findGraphRoots(...args(g))).toEqual(new Set(["A"]));
	});

	it("handles multiple root SCCs in a complex multi-cycle graph", () => {
		const g = {
			A: ["B"],
			B: ["C"],
			C: ["A", "D"],
			D: ["E"],
			E: ["D"],
			F: ["G", "H"],
			G: ["F"],
			H: ["I"],
			I: ["H"]
		};

		// Root SCCs are {A,B,C} and {F,G}
		expect(findGraphRoots(...args(g))).toEqual(
			new Set(["A", "B", "C", "F", "G"])
		);
	});

	it("removes a previously completed SCC from root candidates when a later incoming edge is found", () => {
		const g = {
			B: ["C"],
			C: ["B"],
			A: ["D", "B"],
			D: ["A"]
		};

		// {B,C} is discovered first, then removed by A -> B
		// {A,D} remains the only root SCC
		expect(findGraphRoots(...args(g))).toEqual(new Set(["A", "D"]));
	});

	it("selects only node(s) with the highest internal incoming count within a root SCC", () => {
		const g = {
			A: ["B", "D"],
			B: ["C", "D"],
			C: ["A", "D"],
			D: ["A"]
		};

		expect(findGraphRoots(...args(g))).toEqual(new Set(["D"]));
	});

	it("is stable across dependency iteration orders in overlapping cycles", () => {
		const g1 = {
			A: ["B", "C"],
			B: ["C"],
			C: ["A"]
		};
		const g2 = {
			A: ["C", "B"],
			B: ["C"],
			C: ["A"]
		};
		expect(findGraphRoots(...args(g1))).toEqual(findGraphRoots(...args(g2)));
	});

	// Regression for #17757: chunk root selection feeds build-order-dependent
	// edges (e.g. via thread-loader) into findGraphRoots, so the selected roots
	// must not depend on node/edge ordering — fixed in #20452.
	it("is deterministic across node and edge orderings in a complex multi-cycle graph", () => {
		const g = {
			// root SCC {A,B,C}: dense 3-cycle with chords
			A: ["B", "C", "D"],
			B: ["C", "A"],
			C: ["A", "B", "E"],
			// downstream SCC {D,E}: reachable from {A,B,C}, not a root
			D: ["E"],
			E: ["D"],
			// root SCC {F,G,H}: cycle with an overlapping inner cycle {G,H}
			F: ["G", "H"],
			G: ["H", "F"],
			H: ["F", "G", "I"],
			// downstream SCC {I,J,K}: reachable from {F,G,H}, not a root
			I: ["J"],
			J: ["I", "K"],
			K: ["J"],
			// root SCC {L,M,N}: the overlapping-cycle motif from #20445
			L: ["N", "M"],
			M: ["N"],
			N: ["L"]
		};

		// one representative node per root SCC, by highest internal incoming count
		const expected = new Set(["A", "B", "C", "F", "G", "H", "N"]);
		expect(rootsOf(g)).toEqual(expected);

		const rnd = mulberry32(0x1f2e3d4c);
		for (let i = 0; i < 1000; i++) {
			expect(rootsOf(permute(g, rnd))).toEqual(expected);
		}
	});
});
