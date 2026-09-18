"use strict";

const {
	associateIntersections,
	combine,
	find,
	findIntersections,
	first,
	intersect,
	isSubset
} = require("../../lib/util/SetHelpers");

/**
 * Finds intersections in number sets.
 * @param {Iterable<number>[]} sets input sets
 * @param {Partial<{ minimumSize: number, dedupDepth: number }>} limits discovery limits
 * @returns {{ key: bigint, set: Set<number> }[]} intersections
 */
const findNumberIntersections = (sets, limits = {}) =>
	findIntersections(
		new Map(
			sets.map((set) => {
				const values = [...set].sort((a, b) => a - b);
				const key = values.reduce(
					(mask, value) => mask | (BigInt("1") << BigInt(value)),
					BigInt("0")
				);
				return [key, new Set(values)];
			})
		),
		{
			minimumSize: 2,
			dedupDepth: 2,
			...limits
		}
	);

/**
 * Serializes number sets for assertions.
 * @param {Set<number>[]} sets number sets
 * @returns {string[]} sorted values in each set
 */
const serializeSets = (sets) =>
	sets.map((set) => [...set].sort((a, b) => a - b).join(","));

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

	describe("findIntersections", () => {
		it("finds a shared set across many inputs", () => {
			const result = findNumberIntersections(
				Array.from({ length: 20 }, (_, i) => [1, 2, i + 3])
			);
			expect(serializeSets(result.map(({ set }) => set))).toEqual(["1,2"]);
		});

		it("finds intersections that require more than two inputs", () => {
			const result = findNumberIntersections([
				[1, 2, 3, 4],
				[1, 2, 3, 5],
				[1, 2, 4, 5]
			]);
			expect(serializeSets(result.map(({ set }) => set))).toContain("1,2");
		});

		it("does not repeat an existing set or keep unrelated items", () => {
			const result = findNumberIntersections([
				[1, 2],
				[1, 2, 3],
				[1, 2, 4],
				[5, 6, 7]
			]);
			expect(result).toEqual([]);
		});

		it("freezes each round and stops when no new intersections exist", () => {
			const sets = [
				[1, 2, 3, 4],
				[1, 2, 3, 5],
				[1, 2, 4, 5]
			];
			const collect = (/** @type {number} */ dedupDepth) =>
				serializeSets(
					findNumberIntersections(sets, { dedupDepth }).map(({ set }) => set)
				);
			expect(collect(0)).toEqual([]);
			expect(collect(1)).not.toContain("1,2");
			expect(collect(2)).toContain("1,2");
			expect(collect(0xffffffff)).toEqual(collect(2));
		});

		it("discovers singleton intersections without keeping empty ones", () => {
			const result = findNumberIntersections(
				[
					[1, 2],
					[1, 3],
					[4, 5]
				],
				{ minimumSize: 1 }
			);
			expect(serializeSets(result.map(({ set }) => set))).toEqual(["1"]);
		});
	});

	describe("associateIntersections", () => {
		it("includes every containing original, including non-generating inputs", () => {
			const originals = new Map([
				[BigInt("1"), new Set([1, 2, 3])],
				[BigInt("2"), new Set([1, 2, 4])],
				[BigInt("3"), new Set([1, 2, 5])],
				[BigInt("4"), new Set([1, 9])]
			]);
			const subset = new Set([1, 2]);
			const result = associateIntersections(originals, [
				{ key: BigInt("3"), set: subset }
			]);
			expect([...result.keys()]).toEqual([
				BigInt("1"),
				BigInt("2"),
				BigInt("3")
			]);
			for (const subsets of result.values()) expect(subsets).toEqual([subset]);
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
