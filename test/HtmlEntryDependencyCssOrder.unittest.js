"use strict";

// The tie paths need equal post-order indices (e.g. two chunks whose CSS
// modules the entrypoint's walk never reaches, both `Infinity`) — a collision
// integration builds can't produce deterministically.
const {
	compareCssChunkOrder
} = require("../lib/dependencies/HtmlEntryDependency");

describe("compareCssChunkOrder", () => {
	it("orders by post-order index first", () => {
		expect(
			compareCssChunkOrder({ index: 1, key: "b" }, { index: 2, key: "a" })
		).toBe(-1);
		expect(
			compareCssChunkOrder({ index: 2, key: "a" }, { index: 1, key: "b" })
		).toBe(1);
	});

	it("breaks index ties (including Infinity) by chunk key", () => {
		const inf = Number.POSITIVE_INFINITY;
		expect(
			compareCssChunkOrder({ index: inf, key: "a" }, { index: inf, key: "b" })
		).toBe(-1);
		expect(
			compareCssChunkOrder({ index: inf, key: "b" }, { index: inf, key: "a" })
		).toBe(1);
	});

	it("returns 0 for fully equal entries", () => {
		expect(
			compareCssChunkOrder({ index: 3, key: "a" }, { index: 3, key: "a" })
		).toBe(0);
	});

	it("sorts a mixed array deterministically", () => {
		const inf = Number.POSITIVE_INFINITY;
		const input = [
			{ index: inf, key: "z" },
			{ index: 2, key: "a" },
			{ index: inf, key: "a" },
			{ index: 1, key: "c" }
		];
		expect(
			input.sort(compareCssChunkOrder).map((e) => `${e.index}|${e.key}`)
		).toEqual(["1|c", "2|a", "Infinity|a", "Infinity|z"]);
	});
});
