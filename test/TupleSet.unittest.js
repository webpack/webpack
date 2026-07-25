"use strict";

const TupleSet = require("../lib/util/TupleSet");

describe("TupleSet", () => {
	it("should seed from an iterable and track size", () => {
		const set = new TupleSet([
			["a", 1],
			["a", 2],
			["b", 3]
		]);
		expect(set.size).toBe(3);
		expect(set.has("a", 1)).toBe(true);
		expect(set.has("a", 3)).toBe(false);
		expect(set.has("z", 1)).toBe(false);
	});

	it("should not double-count a duplicate tuple", () => {
		const set = new TupleSet([["a", 1]]);
		set.add("a", 1);
		expect(set.size).toBe(1);
	});

	it("should delete a tuple and update size", () => {
		const set = new TupleSet([
			["a", 1],
			["a", 2]
		]);
		set.delete("a", 1);
		expect(set.size).toBe(1);
		expect(set.has("a", 1)).toBe(false);
		expect(set.has("a", 2)).toBe(true);
	});

	it("should be a no-op when deleting an absent tuple", () => {
		const set = new TupleSet([["a", 1]]);
		set.delete("z", 9);
		set.delete("a", 9);
		expect(set.size).toBe(1);
	});

	it("should store and index tuples longer than two elements", () => {
		const set = new TupleSet();
		set.add("x", "y", 1);
		set.add("x", "y", 2);
		set.add("x", "z", 3);
		expect(set.size).toBe(3);
		expect(set.has("x", "y", 1)).toBe(true);
		expect(set.has("x", "y", 9)).toBe(false);
		expect(set.has("x", "q", 1)).toBe(false);
	});

	it("should return false from has when a prefix map is missing", () => {
		const set = new TupleSet();
		set.add("x", "y", 1);
		expect(set.has("missing", "y", 1)).toBe(false);
	});

	it("should be a no-op when deleting through a missing prefix", () => {
		const set = new TupleSet();
		set.add("x", "y", 1);
		set.delete("missing", "y", 1);
		expect(set.size).toBe(1);
	});

	it("should delete a nested tuple through existing prefix maps", () => {
		const set = new TupleSet();
		set.add("x", "y", 1);
		set.add("x", "y", 2);
		set.delete("x", "y", 1);
		expect(set.size).toBe(1);
		expect(set.has("x", "y", 1)).toBe(false);
		expect(set.has("x", "y", 2)).toBe(true);
	});

	it("should iterate every stored two-element tuple", () => {
		const set = new TupleSet([
			["a", 1],
			["a", 2],
			["b", 3]
		]);
		expect([...set]).toEqual([
			["a", 1],
			["a", 2],
			["b", 3]
		]);
	});

	it("should iterate nested tuples by descending into prefix maps", () => {
		const set = new TupleSet();
		set.add("x", "y", 1);
		set.add("x", "y", 2);
		set.add("x", "z", 3);
		expect([...set]).toEqual([
			["x", "y", 1],
			["x", "y", 2],
			["x", "z", 3]
		]);
	});

	it("should iterate an empty set as no tuples", () => {
		expect([...new TupleSet()]).toEqual([]);
	});
});
