"use strict";

const {
	combine,
	find,
	first,
	intersect,
	isSubset
} = require("../lib/util/SetHelpers");

describe("SetHelpers", () => {
	describe("intersect", () => {
		it("should return an empty set for no inputs", () => {
			expect([...intersect([])]).toEqual([]);
		});

		it("should copy the single input set", () => {
			const only = new Set([1, 2]);
			const result = intersect([only]);
			expect([...result]).toEqual([1, 2]);
			expect(result).not.toBe(only);
		});

		it("should keep only the elements shared by every set", () => {
			expect([
				...intersect([new Set([1, 2, 3]), new Set([2, 3, 4]), new Set([3, 2])])
			]).toEqual([3, 2]);
		});

		it("should return an empty set when there is no overlap", () => {
			expect([...intersect([new Set([1]), new Set([2])])]).toEqual([]);
		});
	});

	describe("isSubset", () => {
		it("should be true when the big set contains every small element", () => {
			expect(isSubset(new Set([1, 2, 3]), new Set([2, 3]))).toBe(true);
		});

		it("should be false when the small set is larger", () => {
			expect(isSubset(new Set([1]), new Set([1, 2]))).toBe(false);
		});

		it("should be false when an element is missing", () => {
			expect(isSubset(new Set([1, 2]), new Set([1, 9]))).toBe(false);
		});
	});

	describe("find", () => {
		it("should return the first matching item", () => {
			expect(find(new Set([1, 2, 3]), (x) => x > 1)).toBe(2);
		});

		it("should return undefined when nothing matches", () => {
			expect(find(new Set([1]), (x) => x > 5)).toBeUndefined();
		});
	});

	describe("first", () => {
		it("should return the first inserted item", () => {
			expect(first(new Set([7, 8]))).toBe(7);
		});

		it("should return undefined for an empty set", () => {
			expect(first(new Set())).toBeUndefined();
		});
	});

	describe("combine", () => {
		it("should return a new set with the union of both", () => {
			expect([...combine(new Set([1]), new Set([2]))]).toEqual([1, 2]);
		});

		it("should return the other set untouched when one is empty", () => {
			const a = new Set([1]);
			const b = new Set([2]);
			expect(combine(a, new Set())).toBe(a);
			expect(combine(new Set(), b)).toBe(b);
		});
	});
});
