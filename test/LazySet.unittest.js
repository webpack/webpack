"use strict";

const LazySet = require("../lib/util/LazySet");

describe("LazySet", () => {
	it("addAll", () => {
		const a = new Set(["a"]);
		const sut = new LazySet(a);
		const empty = new LazySet([]);
		expect(sut.size).toBe(1);
		sut.addAll(empty);
		expect(sut._toDeepMerge).toStrictEqual([]);
		expect(sut.size).toBe(1);
		const b = new Set(["b"]);
		sut.addAll(b);
		expect(sut._toMerge).toContain(b);
		expect(sut.size).toBe(2);
		const c = new LazySet(["c"]);
		sut.addAll(c);
		expect(sut._toDeepMerge).toContain(c);
		expect(sut.size).toBe(3);
		expect(sut._toDeepMerge).toStrictEqual([]);
	});

	it("supports the ES2025 set operation methods", () => {
		// addAll before each call so the pending lazy merge path is exercised
		const create = () => new LazySet(["a"]).addAll(["b"]);
		expect(create().union(new Set(["c"]))).toStrictEqual(
			new Set(["a", "b", "c"])
		);
		expect(create().intersection(new Set(["b", "c"]))).toStrictEqual(
			new Set(["b"])
		);
		expect(create().difference(new Set(["b"]))).toStrictEqual(new Set(["a"]));
		expect(create().symmetricDifference(new Set(["b", "c"]))).toStrictEqual(
			new Set(["a", "c"])
		);
		expect(create().isSubsetOf(new Set(["a", "b", "c"]))).toBe(true);
		expect(create().isSupersetOf(new Set(["a"]))).toBe(true);
		expect(create().isDisjointFrom(new Set(["c"]))).toBe(true);
		expect(create().isDisjointFrom(new Set(["a"]))).toBe(false);
	});
});
