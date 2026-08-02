"use strict";

const LazySet = require("../lib/util/LazySet");

describe("LazySet", () => {
	it("addAll", () => {
		const a = new Set(["a"]);
		const sut = new LazySet(a);
		const empty = new LazySet([]);
		expect(sut.size).toBe(1);
		sut.addAll(empty);
		// An empty lazy set is dropped, so the queue is never even allocated
		expect(sut._toDeepMerge).toBeUndefined();
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

	it("should not allocate merge queues until something is queued", () => {
		const sut = new LazySet(["a"]);
		expect(sut._toMerge).toBeUndefined();
		expect(sut._toDeepMerge).toBeUndefined();
		sut.add("b");
		expect(sut._toMerge).toBeUndefined();
		expect(sut._toDeepMerge).toBeUndefined();
		expect(sut.size).toBe(2);
		expect([...sut].sort()).toStrictEqual(["a", "b"]);
	});

	it("should clear a set that never queued anything", () => {
		const sut = new LazySet(["a"]);
		sut.clear();
		expect(sut.size).toBe(0);
		expect(sut._toMerge).toBeUndefined();
		expect(sut._toDeepMerge).toBeUndefined();
	});

	it("should clear both queues once they exist", () => {
		const sut = new LazySet(["a"]);
		sut.addAll(new Set(["b"]));
		sut.addAll(new LazySet(["c"]));
		sut.clear();
		expect(sut.size).toBe(0);
		expect(/** @type {Set<Iterable<string>>} */ (sut._toMerge).size).toBe(0);
		expect(sut._toDeepMerge).toStrictEqual([]);
	});

	it("should merge a set that only ever queued plain iterables", () => {
		const sut = new LazySet();
		sut.addAll(new Set(["a", "b"]));
		expect(sut._toDeepMerge).toBeUndefined();
		expect(sut.size).toBe(2);
	});

	it("should merge a set that only ever queued lazy sets", () => {
		const sut = new LazySet();
		sut.addAll(new LazySet(["a", "b"]));
		expect(sut._toMerge).toBeUndefined();
		expect(sut.size).toBe(2);
		expect([...sut].sort()).toStrictEqual(["a", "b"]);
	});

	// flatten() walks a queued lazy set's own queues, and either of them may be
	// missing on a nested set.
	it("should flatten a nested set holding only plain iterables", () => {
		const inner = new LazySet(["a"]);
		inner.addAll(new Set(["b"]));
		const sut = new LazySet(["c"]);
		sut.addAll(inner);
		expect([...sut].sort()).toStrictEqual(["a", "b", "c"]);
	});

	it("should flatten a nested set holding only lazy sets", () => {
		const inner = new LazySet(["a"]);
		inner.addAll(new LazySet(["b"]));
		const sut = new LazySet(["c"]);
		sut.addAll(inner);
		expect([...sut].sort()).toStrictEqual(["a", "b", "c"]);
	});

	it("should flatten a nested set holding both queue kinds", () => {
		const inner = new LazySet(["a"]);
		inner.addAll(new Set(["b"]));
		inner.addAll(new LazySet(["c"]));
		const sut = new LazySet(["d"]);
		sut.addAll(inner);
		expect([...sut].sort()).toStrictEqual(["a", "b", "c", "d"]);
	});

	it("should report emptiness across both queues", () => {
		expect(new LazySet()._isEmpty()).toBe(true);
		expect(new LazySet(["a"])._isEmpty()).toBe(false);
		const queued = new LazySet();
		queued.addAll(new Set(["a"]));
		expect(queued._isEmpty()).toBe(false);
		const deepQueued = new LazySet();
		deepQueued.addAll(new LazySet(["a"]));
		expect(deepQueued._isEmpty()).toBe(false);
	});

	it("should materialize both queues before reporting size", () => {
		const sut = new LazySet(["a"]);
		sut.addAll(new Set(["b"]));
		sut.addAll(new LazySet(["c"]));
		expect(sut.size).toBe(3);
		expect([...sut].sort()).toStrictEqual(["a", "b", "c"]);
	});
});
