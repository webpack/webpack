"use strict";

const StackedMap = require("../lib/util/StackedMap");

describe("StackedMap", () => {
	it("should behave like a map in a single layer", () => {
		const map = new StackedMap();
		map.set("a", 1);
		map.set("b", 2);
		expect(map.get("a")).toBe(1);
		expect(map.has("a")).toBe(true);
		expect(map.get("missing")).toBeUndefined();
		expect(map.has("missing")).toBe(false);
		map.delete("a");
		expect(map.get("a")).toBeUndefined();
		expect(map.has("a")).toBe(false);
		expect(map.size).toBe(1);
	});

	it("should preserve explicit undefined values", () => {
		const map = new StackedMap();
		map.set("u", undefined);
		expect(map.get("u")).toBeUndefined();
		expect(map.has("u")).toBe(true);
		const child = map.createChild();
		expect(child.get("u")).toBeUndefined();
		expect(child.has("u")).toBe(true);
	});

	it("should see parent values from child layers", () => {
		const parent = new StackedMap();
		parent.set("a", 1);
		const child = parent.createChild();
		expect(child.get("a")).toBe(1);
		expect(child.has("a")).toBe(true);
		child.set("a", 2);
		expect(child.get("a")).toBe(2);
		expect(parent.get("a")).toBe(1);
	});

	it("should shadow deletions in child layers only", () => {
		const parent = new StackedMap();
		parent.set("a", 1);
		const child = parent.createChild();
		child.delete("a");
		expect(child.get("a")).toBeUndefined();
		expect(child.has("a")).toBe(false);
		expect(parent.get("a")).toBe(1);
		expect(parent.has("a")).toBe(true);
	});

	it("should answer repeated lookups after memoization consistently", () => {
		const parent = new StackedMap();
		parent.set("a", 1);
		const child = parent.createChild();
		expect(child.get("a")).toBe(1);
		expect(child.get("a")).toBe(1);
		expect(child.get("missing")).toBeUndefined();
		expect(child.get("missing")).toBeUndefined();
		expect(child.has("missing")).toBe(false);
	});

	it("should support grandchildren with intermediate shadowing", () => {
		const root = new StackedMap();
		root.set("x", "root");
		root.set("y", "root");
		const mid = root.createChild();
		mid.set("x", "mid");
		mid.delete("y");
		const leaf = mid.createChild();
		expect(leaf.get("x")).toBe("mid");
		expect(leaf.get("y")).toBeUndefined();
		expect(leaf.has("y")).toBe(false);
		leaf.set("y", "leaf");
		expect(leaf.get("y")).toBe("leaf");
		expect(mid.get("y")).toBeUndefined();
		expect(root.get("y")).toBe("root");
	});

	it("should enumerate visible entries via asArray/asSet/asPairArray/asMap", () => {
		const root = new StackedMap();
		root.set("a", 1);
		root.set("b", 2);
		root.set("u", undefined);
		const child = root.createChild();
		child.set("c", 3);
		child.delete("b");
		expect(child.asArray().sort()).toEqual(["a", "c", "u"]);
		expect([...child.asSet()].sort()).toEqual(["a", "c", "u"]);
		const pairs = child.asPairArray().sort((x, y) => (x[0] < y[0] ? -1 : 1));
		expect(pairs).toEqual([
			["a", 1],
			["c", 3],
			["u", undefined]
		]);
		expect(child.asMap().get("c")).toBe(3);
		expect(child.size).toBe(3);
	});

	it("should keep answering correctly after size/compression", () => {
		const root = new StackedMap();
		root.set("a", 1);
		const child = root.createChild();
		child.set("b", 2);
		child.delete("a");
		expect(child.size).toBe(1);
		expect(child.get("a")).toBeUndefined();
		expect(child.get("b")).toBe(2);
		child.set("a", 5);
		expect(child.get("a")).toBe(5);
		expect(child.size).toBe(2);
	});

	it("should answer has() through the parent chain and memoize misses", () => {
		const root = new StackedMap();
		root.set("a", 1);
		root.set("u", undefined);
		const mid = root.createChild();
		const leaf = mid.createChild();
		// walk hit two layers up
		expect(leaf.has("a")).toBe(true);
		// explicit undefined counts as present
		expect(leaf.has("u")).toBe(true);
		// walk miss writes a tombstone, the second lookup answers from it
		expect(leaf.has("missing")).toBe(false);
		expect(leaf.has("missing")).toBe(false);
		expect(leaf.get("missing")).toBeUndefined();
	});

	it("should let children observe later parent writes of new keys", () => {
		// both the historical array design (shared Map objects) and a linked
		// design expose parent writes made after child creation
		const parent = new StackedMap();
		const child = parent.createChild();
		parent.set("late", 42);
		expect(child.get("late")).toBe(42);
	});
});
