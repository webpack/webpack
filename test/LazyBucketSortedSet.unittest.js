"use strict";

const LazyBucketSortedSet = require("../lib/util/LazyBucketSortedSet");

/** @typedef {{ v: number }} Box */

/** @type {(a: number, b: number) => number} */
const num = (a, b) => a - b;

/** @type {(a: Box, b: Box) => number} */
const byV = (a, b) => a.v - b.v;

/**
 * A single-layer set of numbers bucketed by the tens digit, leaf-sorted
 * numerically.
 * @returns {LazyBucketSortedSet<number, number>} the set
 */
const numberSet = () =>
	new LazyBucketSortedSet(
		/** @type {(n: number) => number} */ ((n) => Math.floor(n / 10)),
		num,
		num
	);

/**
 * A single-layer set of `{ v }` boxes bucketed by the tens digit of `v`.
 * @returns {LazyBucketSortedSet<Box, number>} the set
 */
const boxSet = () =>
	new LazyBucketSortedSet(
		/** @type {(o: Box) => number} */ ((o) => Math.floor(o.v / 10)),
		num,
		byV
	);

/**
 * A two-layer set of numbers bucketed by hundreds then tens.
 * @returns {LazyBucketSortedSet<number, number>} the set
 */
const numberTwoLayer = () =>
	new LazyBucketSortedSet(
		/** @type {(n: number) => number} */ ((n) => Math.floor(n / 100)),
		num,
		/** @type {(n: number) => number} */ ((n) => Math.floor(n / 10) % 10),
		num,
		num
	);

/**
 * A two-layer set of `{ v }` boxes bucketed by hundreds then tens of `v`.
 * @returns {LazyBucketSortedSet<Box, number>} the set
 */
const boxTwoLayer = () =>
	new LazyBucketSortedSet(
		/** @type {(o: Box) => number} */ ((o) => Math.floor(o.v / 100)),
		num,
		/** @type {(o: Box) => number} */ ((o) => Math.floor(o.v / 10) % 10),
		num,
		byV
	);

describe("LazyBucketSortedSet", () => {
	it("should pop items in bucket then leaf order", () => {
		const set = numberSet();
		for (const n of [23, 5, 21, 8, 12]) set.add(n);
		expect(set.size).toBe(5);
		const popped = [];
		let item;
		while ((item = set.popFirst()) !== undefined) popped.push(item);
		expect(popped).toEqual([5, 8, 12, 21, 23]);
		expect(set.size).toBe(0);
	});

	it("should return undefined when popping an empty set", () => {
		expect(numberSet().popFirst()).toBeUndefined();
	});

	it("should iterate every item without imposing order", () => {
		const set = numberSet();
		for (const n of [3, 1, 2, 15, 11]) set.add(n);
		expect([...set].sort(num)).toEqual([1, 2, 3, 11, 15]);
		set.popFirst();
		expect([...set].sort(num)).toEqual([2, 3, 11, 15]);
		expect(set.size).toBe(4);
	});

	it("should delete an item still in the unsorted staging area", () => {
		const set = numberSet();
		for (const n of [3, 1, 25]) set.add(n);
		set.delete(1);
		expect(set.size).toBe(2);
		expect([...set].sort(num)).toEqual([3, 25]);
	});

	it("should delete an item from a resolved bucket and prune it when empty", () => {
		const set = numberSet();
		for (const n of [3, 25, 27]) set.add(n);
		// pop resolves the unsorted items into buckets
		set.popFirst();
		set.delete(25);
		expect(set.size).toBe(1);
		expect([...set]).toEqual([27]);
		set.delete(27);
		expect(set.size).toBe(0);
	});

	describe("startUpdate on an unsorted item", () => {
		it("should remove it when asked", () => {
			const set = numberSet();
			set.add(7);
			set.startUpdate(7)(true);
			expect(set.size).toBe(0);
		});

		it("should be a no-op otherwise", () => {
			const set = numberSet();
			set.add(7);
			set.startUpdate(7)();
			expect(set.size).toBe(1);
		});
	});

	describe("startUpdate on a resolved leaf item", () => {
		it("should move an item when its key changes", () => {
			const set = boxSet();
			const a = { v: 5 };
			const b = { v: 6 };
			for (const o of [a, b]) set.add(o);
			set.popFirst();
			const finish = set.startUpdate(b);
			b.v = 26;
			finish();
			expect([...set].map((o) => o.v)).toEqual([26]);
		});

		it("should keep an item in place when its key is unchanged", () => {
			const set = boxSet();
			const a = { v: 5 };
			const b = { v: 6 };
			for (const o of [a, b]) set.add(o);
			set.popFirst();
			const finish = set.startUpdate(b);
			b.v = 8;
			finish();
			expect([...set].map((o) => o.v)).toEqual([8]);
			expect(set.size).toBe(1);
		});

		it("should remove an item when asked", () => {
			const set = boxSet();
			const a = { v: 5 };
			const b = { v: 25 };
			for (const o of [a, b]) set.add(o);
			set.popFirst();
			set.startUpdate(b)(true);
			expect(set.size).toBe(0);
		});

		it("should keep the bucket when removing one of several siblings", () => {
			const set = boxSet();
			const a = { v: 5 };
			const b = { v: 20 };
			const c = { v: 25 };
			for (const o of [a, b, c]) set.add(o);
			// pop `a`, leaving b and c together in the tens bucket
			set.popFirst();
			set.startUpdate(c)(true);
			expect(set.size).toBe(1);
			expect([...set].map((o) => o.v)).toEqual([20]);
		});

		it("should keep the source bucket when moving one of several siblings", () => {
			const set = boxSet();
			const a = { v: 5 };
			const b = { v: 20 };
			const c = { v: 25 };
			for (const o of [a, b, c]) set.add(o);
			set.popFirst();
			// move b to another bucket while c stays behind
			const finish = set.startUpdate(b);
			b.v = 35;
			finish();
			expect([...set].map((o) => o.v).sort(num)).toEqual([25, 35]);
		});
	});

	describe("two-layer buckets", () => {
		it("should pop across nested bucket layers in order", () => {
			const set = numberTwoLayer();
			for (const n of [105, 101, 203, 5]) set.add(n);
			const popped = [];
			let item;
			while ((item = set.popFirst()) !== undefined) popped.push(item);
			expect(popped).toEqual([5, 101, 105, 203]);
		});

		it("should move an item across nested layers on update", () => {
			const set = boxTwoLayer();
			const a = { v: 105 };
			set.add(a);
			set.add({ v: 101 });
			set.popFirst();
			const finish = set.startUpdate(a);
			a.v = 205;
			finish();
			expect([...set].map((o) => o.v).sort(num)).toEqual([205]);
		});

		it("should keep a nested item under the same outer key on update", () => {
			const set = boxTwoLayer();
			const a = { v: 105 };
			set.add(a);
			set.add({ v: 101 });
			set.popFirst();
			const finish = set.startUpdate(a);
			// stays in the same hundreds bucket, so the outer key is unchanged
			a.v = 108;
			finish();
			expect([...set].map((o) => o.v).sort(num)).toEqual([108]);
		});

		it("should remove a nested item when asked", () => {
			const set = boxTwoLayer();
			const a = { v: 105 };
			set.add(a);
			set.add({ v: 101 });
			set.popFirst();
			set.startUpdate(a)(true);
			expect(set.size).toBe(0);
		});

		it("should keep the outer bucket when removing one of its nested siblings", () => {
			const set = boxTwoLayer();
			const a = { v: 5 };
			const b = { v: 105 };
			const c = { v: 115 };
			for (const o of [a, b, c]) set.add(o);
			// pop `a`, leaving b and c in the same hundreds bucket
			set.popFirst();
			set.startUpdate(c)(true);
			expect([...set].map((o) => o.v).sort(num)).toEqual([105]);
		});

		it("should keep the outer bucket when a nested sibling moves out", () => {
			const set = boxTwoLayer();
			const a = { v: 5 };
			const b = { v: 105 };
			const c = { v: 115 };
			for (const o of [a, b, c]) set.add(o);
			set.popFirst();
			// move c to a different hundreds bucket while b stays behind
			const finish = set.startUpdate(c);
			c.v = 215;
			finish();
			expect([...set].map((o) => o.v).sort(num)).toEqual([105, 215]);
		});
	});
});
