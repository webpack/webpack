"use strict";

const StackedCacheMap = require("../lib/util/StackedCacheMap");

describe("StackedCacheMap", () => {
	it("should read values from immutable layers and the mutable fallback", () => {
		const map = new StackedCacheMap();
		map.addAll(
			new Map([
				["a", 1],
				["b", 2]
			]),
			true
		);
		map.addAll(new Map([["c", 3]]), false);
		map.set("d", 4);
		expect(map.get("a")).toBe(1);
		expect(map.get("c")).toBe(3);
		expect(map.get("d")).toBe(4);
		expect(map.get("missing")).toBeUndefined();
	});

	it("should order immutable layers largest-first", () => {
		const map = new StackedCacheMap();
		map.addAll(
			new Map([
				["a", 1],
				["b", 2]
			]),
			true
		);
		map.addAll(
			new Map([
				["c", 3],
				["d", 4],
				["e", 5]
			]),
			true
		);
		expect(map.stack.map((layer) => layer.size)).toEqual([3, 2]);
	});

	it("should keep a smaller layer added after a larger one at the end", () => {
		const map = new StackedCacheMap();
		map.addAll(
			new Map([
				["a", 1],
				["b", 2],
				["c", 3]
			]),
			true
		);
		map.addAll(new Map([["d", 4]]), true);
		expect(map.stack.map((layer) => layer.size)).toEqual([3, 1]);
	});

	it("should report the total size across fallback and layers", () => {
		const map = new StackedCacheMap();
		map.addAll(
			new Map([
				["a", 1],
				["b", 2]
			]),
			true
		);
		map.set("c", 3);
		expect(map.size).toBe(3);
	});

	it("should iterate the fallback map first, then each layer", () => {
		const map = new StackedCacheMap();
		map.addAll(
			new Map([
				["a", 1],
				["b", 2]
			]),
			true
		);
		map.set("c", 3);
		expect([...map]).toEqual([
			["c", 3],
			["a", 1],
			["b", 2]
		]);
	});

	it("should clear every layer and the fallback", () => {
		const map = new StackedCacheMap();
		map.addAll(new Map([["a", 1]]), true);
		map.set("b", 2);
		map.clear();
		expect(map.size).toBe(0);
		expect([...map]).toEqual([]);
	});

	it("should refuse has and delete", () => {
		const map = new StackedCacheMap();
		expect(() => map.has("a")).toThrow(/inefficient/);
		expect(() => map.delete("a")).toThrow(/can't be deleted/);
	});
});
