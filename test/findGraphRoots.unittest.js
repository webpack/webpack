"use strict";

const findGraphRoots = require("../lib/util/findGraphRoots");

const args = (g) => [Object.keys(g), (m) => g[m]];

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
});
