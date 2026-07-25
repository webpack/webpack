"use strict";

const WeakTupleMap = require("../lib/util/WeakTupleMap");

describe("WeakTupleMap", () => {
	it("should store and read values keyed by primitive tuples", () => {
		const map = new WeakTupleMap();
		map.set("a", "b", 1);
		expect(map.get("a", "b")).toBe(1);
		expect(map.has("a", "b")).toBe(true);
		// a shorter prefix is a distinct key with no value of its own
		expect(map.has("a")).toBe(false);
		expect(map.get("a")).toBeUndefined();
	});

	it("should store and read values keyed by object (weak) tuples", () => {
		const map = new WeakTupleMap();
		const keyA = {};
		const keyB = { id: "b" };
		map.set(keyA, keyB, "value");
		expect(map.get(keyA, keyB)).toBe("value");
		expect(map.has(keyA, keyB)).toBe(true);
		expect(map.get(keyA, {})).toBeUndefined();
	});

	it("should mix weak and strong key elements in one tuple", () => {
		const map = new WeakTupleMap();
		const obj = {};
		map.set(obj, "x", 42);
		map.set("x", obj, 43);
		expect(map.get(obj, "x")).toBe(42);
		expect(map.get("x", obj)).toBe(43);
	});

	it("should store a value at the empty tuple", () => {
		const map = new WeakTupleMap();
		map.set(7);
		expect(map.has()).toBe(true);
		expect(map.get()).toBe(7);
	});

	it("should overwrite an existing value", () => {
		const map = new WeakTupleMap();
		map.set("k", 1);
		map.set("k", 2);
		expect(map.get("k")).toBe(2);
	});

	it("should report misses without creating trie nodes", () => {
		const map = new WeakTupleMap();
		expect(map.has("missing")).toBe(false);
		expect(map.get("missing")).toBeUndefined();
		expect(map.has({}, "x")).toBe(false);
		expect(map.get({}, "x")).toBeUndefined();
	});

	describe("provide", () => {
		it("should compute and cache a value on a miss", () => {
			const map = new WeakTupleMap();
			const factory = jest.fn((a, b) => a + b);
			expect(map.provide(2, 3, factory)).toBe(5);
			expect(map.provide(2, 3, factory)).toBe(5);
			// second call is served from the cache
			expect(factory).toHaveBeenCalledTimes(1);
			expect(factory).toHaveBeenCalledWith(2, 3);
		});

		it("should provide a value at the empty tuple", () => {
			const map = new WeakTupleMap();
			expect(map.provide(() => "only")).toBe("only");
		});
	});

	describe("cachedProvide", () => {
		it("should call compute with thisArg and the key args on a miss", () => {
			const map = new WeakTupleMap();
			const compute = jest.fn((thisArg, a, b) => `${thisArg}:${a}:${b}`);
			const args = ["a", "b"];
			expect(map.cachedProvide(compute, "T", args)).toBe("T:a:b");
			expect(map.cachedProvide(compute, "T", args)).toBe("T:a:b");
			expect(compute).toHaveBeenCalledTimes(1);
			expect(compute).toHaveBeenCalledWith("T", "a", "b");
		});

		it("should key on the compute function so different computers do not collide", () => {
			const map = new WeakTupleMap();
			const first = () => 1;
			const second = () => 2;
			expect(map.cachedProvide(first, null, [])).toBe(1);
			expect(map.cachedProvide(second, null, [])).toBe(2);
		});
	});

	describe("delete", () => {
		it("should remove a stored value while leaving deeper keys intact", () => {
			const map = new WeakTupleMap();
			map.set("a", "b", 1);
			map.set("a", "b", "c", 2);
			map.delete("a", "b");
			expect(map.has("a", "b")).toBe(false);
			expect(map.get("a", "b")).toBeUndefined();
			expect(map.get("a", "b", "c")).toBe(2);
		});

		it("should be a no-op when the tuple path does not exist", () => {
			const map = new WeakTupleMap();
			map.set("a", 1);
			expect(() => map.delete("a", "missing", "deeper")).not.toThrow();
			expect(map.get("a")).toBe(1);
		});
	});

	it("should drop every entry on clear", () => {
		const map = new WeakTupleMap();
		const obj = {};
		map.set("a", 1);
		map.set(obj, 2);
		map.set(3);
		map.clear();
		expect(map.has("a")).toBe(false);
		expect(map.has(obj)).toBe(false);
		expect(map.has()).toBe(false);
		// the cleared map is reusable
		map.set("a", 9);
		expect(map.get("a")).toBe(9);
	});

	it("should reuse existing child nodes for repeated key prefixes", () => {
		const map = new WeakTupleMap();
		const shared = {};
		map.set(shared, "one", 1);
		map.set(shared, "two", 2);
		map.set("s", "one", 3);
		map.set("s", "two", 4);
		expect(map.get(shared, "one")).toBe(1);
		expect(map.get(shared, "two")).toBe(2);
		expect(map.get("s", "one")).toBe(3);
		expect(map.get("s", "two")).toBe(4);
	});

	it("should add distinct object keys into an existing weak child map", () => {
		const map = new WeakTupleMap();
		const objA = {};
		const objB = {};
		// the first object key creates the weak child map, the second reuses it
		map.set(objA, 1);
		map.set(objB, 2);
		expect(map.get(objA)).toBe(1);
		expect(map.get(objB)).toBe(2);
	});
});
