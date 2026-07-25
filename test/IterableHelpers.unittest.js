"use strict";

const {
	countIterable,
	last,
	someInIterable
} = require("../lib/util/IterableHelpers");

describe("IterableHelpers", () => {
	describe("last", () => {
		it("should return the final item", () => {
			expect(last([1, 2, 3])).toBe(3);
			expect(last(new Set(["a", "b"]))).toBe("b");
		});

		it("should return undefined for an empty iterable", () => {
			expect(last([])).toBeUndefined();
		});
	});

	describe("someInIterable", () => {
		it("should return true when an item matches", () => {
			expect(someInIterable([1, 2, 3], (x) => x === 2)).toBe(true);
		});

		it("should return false when nothing matches", () => {
			expect(someInIterable([1, 2, 3], (x) => x > 5)).toBe(false);
			expect(someInIterable([], () => true)).toBe(false);
		});
	});

	describe("countIterable", () => {
		it("should count the items", () => {
			expect(countIterable([1, 2, 3])).toBe(3);
			expect(countIterable(new Set([1, 1, 2]))).toBe(2);
			expect(countIterable([])).toBe(0);
		});
	});
});
