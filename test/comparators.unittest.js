"use strict";

const {
	compareIds,
	compareIterables,
	compareModulesByFullName,
	compareNumbers,
	compareSelect,
	concatComparators,
	keepOriginalOrder
} = require("../lib/util/comparators");

describe("comparators", () => {
	describe("compareIds", () => {
		it("should order values of the same type", () => {
			expect(compareIds(1, 2)).toBe(-1);
			expect(compareIds(2, 1)).toBe(1);
			expect(compareIds(1, 1)).toBe(0);
			expect(compareIds("a", "b")).toBe(-1);
		});

		it("should order by type name when the types differ", () => {
			// typeof "number" < typeof "string"
			expect(compareIds(1, "1")).toBe(-1);
			expect(compareIds("1", 1)).toBe(1);
		});
	});

	describe("compareNumbers", () => {
		it("should order numbers", () => {
			expect(compareNumbers(1, 2)).toBe(-1);
			expect(compareNumbers(2, 1)).toBe(1);
			expect(compareNumbers(1, 1)).toBe(0);
		});

		it("should order by type name when the types differ", () => {
			expect(compareNumbers(1, /** @type {any} */ (undefined))).toBe(-1);
		});
	});

	describe("compareIterables", () => {
		it("should compare element by element and by length", () => {
			const compare = compareIterables(compareNumbers);
			expect(compare([1, 2], [1, 2])).toBe(0);
			expect(compare([1], [1, 2])).toBe(-1);
			expect(compare([1, 2], [1])).toBe(1);
			expect(compare([1, 3], [1, 2])).toBe(1);
		});

		it("should cache the comparator per element comparator", () => {
			expect(compareIterables(compareNumbers)).toBe(
				compareIterables(compareNumbers)
			);
		});
	});

	describe("compareSelect", () => {
		const byKey = compareSelect(
			/** @type {(o: { k: number | null }) => number | null} */ ((o) => o.k),
			compareNumbers
		);

		it("should compare by the selected value", () => {
			expect(byKey({ k: 1 }, { k: 2 })).toBe(-1);
			expect(byKey({ k: 2 }, { k: 1 })).toBe(1);
			expect(byKey({ k: 1 }, { k: 1 })).toBe(0);
		});

		it("should sort a missing selected value last", () => {
			expect(byKey({ k: null }, { k: 1 })).toBe(1);
			expect(byKey({ k: 1 }, { k: null })).toBe(-1);
			expect(byKey({ k: null }, { k: null })).toBe(0);
		});

		it("should cache the comparator per getter/comparator pair", () => {
			/** @type {(n: number) => number} */
			const identity = (n) => n;
			expect(compareSelect(identity, compareNumbers)).toBe(
				compareSelect(identity, compareNumbers)
			);
		});
	});

	describe("concatComparators", () => {
		it("should fall through to the next comparator on ties", () => {
			/** @typedef {{ a: number, b: number }} Pair */
			const compare = concatComparators(
				compareSelect(
					/** @type {(o: Pair) => number} */ ((o) => o.a),
					compareNumbers
				),
				compareSelect(
					/** @type {(o: Pair) => number} */ ((o) => o.b),
					compareNumbers
				)
			);
			expect(compare({ a: 1, b: 2 }, { a: 1, b: 3 })).toBe(-1);
			expect(compare({ a: 2, b: 1 }, { a: 1, b: 9 })).toBe(1);
			expect(compare({ a: 1, b: 1 }, { a: 1, b: 1 })).toBe(0);
		});
	});

	describe("keepOriginalOrder", () => {
		it("should order items by their position in the original iterable", () => {
			const compare = keepOriginalOrder(["x", "y", "z"]);
			expect(compare("x", "y")).toBe(-1);
			expect(compare("z", "x")).toBe(1);
			expect(compare("y", "y")).toBe(0);
		});
	});

	describe("createCachedParameterizedComparator", () => {
		it("should cache the produced comparator per argument", () => {
			const arg = {};
			const comparator = compareModulesByFullName(/** @type {any} */ (arg));
			expect(compareModulesByFullName(/** @type {any} */ (arg))).toBe(
				comparator
			);
			expect(compareModulesByFullName(/** @type {any} */ ({}))).not.toBe(
				comparator
			);
		});
	});
});
