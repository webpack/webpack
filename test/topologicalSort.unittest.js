"use strict";

const topologicalSort = require("../lib/util/topologicalSort");

/**
 * @template T
 * @param {Map<T, Set<T>>} graph adjacency list
 * @param {T[]} nodes nodes in source order
 * @returns {[T, number][]} visited nodes with their order index
 */
const collect = (graph, nodes) => {
	/** @type {[T, number][]} */
	const visited = [];
	topologicalSort(graph, nodes, (node, index) => visited.push([node, index]));
	return visited;
};

describe("topologicalSort", () => {
	it("should order a simple dependency chain", () => {
		expect(
			collect(
				new Map([
					["a", new Set(["b"])],
					["b", new Set(["c"])]
				]),
				["a", "b", "c"]
			)
		).toEqual([
			["a", 0],
			["b", 1],
			["c", 2]
		]);
	});

	it("should break ties by source order", () => {
		expect(
			collect(
				new Map([
					["a", new Set(["c"])],
					["b", new Set(["c"])]
				]),
				["a", "b", "c"]
			)
		).toEqual([
			["a", 0],
			["b", 1],
			["c", 2]
		]);
	});

	it("should resolve a diamond graph", () => {
		expect(
			collect(
				new Map([
					["a", new Set(["b", "c"])],
					["b", new Set(["d"])],
					["c", new Set(["d"])]
				]),
				["a", "b", "c", "d"]
			)
		).toEqual([
			["a", 0],
			["b", 1],
			["c", 2],
			["d", 3]
		]);
	});

	it("should skip nodes that participate in a cycle", () => {
		expect(
			collect(
				new Map([
					["a", new Set(["b"])],
					["b", new Set(["a"])]
				]),
				["a", "b"]
			)
		).toEqual([]);
	});

	it("should visit isolated nodes with no edges", () => {
		expect(collect(new Map(), ["a", "b"])).toEqual([
			["a", 0],
			["b", 1]
		]);
	});

	it("should prefer a later-ready node with a smaller source index", () => {
		// `c` is ready from the start, but `b` becomes ready after `a` and has a
		// smaller source index, so it must win the tie against `c`
		expect(collect(new Map([["a", new Set(["b"])]]), ["a", "b", "c"])).toEqual([
			["a", 0],
			["b", 1],
			["c", 2]
		]);
	});
});
