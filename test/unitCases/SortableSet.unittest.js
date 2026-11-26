"use strict";

const SortableSet = require("../../lib/util/SortableSet");

describe("util/SortableSet", () => {
	it("can be constructed like a normal Set", () => {
		const sortableSet = new SortableSet(
			[1, 1, 1, 1, 1, 4, 5, 2],
			(a, b) => a - b
		);
		expect([...sortableSet]).toEqual([1, 4, 5, 2]);
	});

	it("can sort its content", () => {
		const sortableSet = new SortableSet(
			[1, 1, 1, 6, 6, 1, 1, 4, 5, 2, 3, 8, 5, 7, 9, 0, 3, 1],
			(a, b) => a - b
		);
		sortableSet.sort();
		expect([...sortableSet]).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8, 9]);
	});

	it("can sort by a specified function", () => {
		const sortableSet = new SortableSet(
			[1, 1, 1, 6, 6, 1, 1, 4, 5, 2, 3, 8, 5, 7, 9, 0, 3, 1],
			(a, b) => a - b
		);
		sortableSet.sortWith((a, b) => b - a);
		expect([...sortableSet]).toEqual([9, 8, 7, 6, 5, 4, 3, 2, 1, 0]);
	});

	it("can sort by a specified function and convert to JSON", () => {
		const sortableSet = new SortableSet(
			[1, 1, 1, 6, 6, 1, 1, 4, 5, 2, 3, 8, 5, 7, 9, 0, 3, 1],
			(a, b) => a - b
		);
		sortableSet.sortWith((a, b) => b - a);
		expect(sortableSet.toJSON()).toEqual([9, 8, 7, 6, 5, 4, 3, 2, 1, 0]);
	});

	describe("caching", () => {
		/**
		 * @param {SortableSet<number>} set the set asked
		 * @returns {number} how many items it holds
		 */
		const size = (set) => set.size;

		it("answers a repeated question from the cache", () => {
			const sortableSet = new SortableSet([1, 2, 3]);
			let calls = 0;
			/**
			 * @param {SortableSet<number>} set the set asked
			 * @returns {number} how many items it holds
			 */
			const counted = (set) => {
				calls++;
				return set.size;
			};
			expect(sortableSet.getFromUnorderedCache(counted)).toBe(3);
			expect(sortableSet.getFromUnorderedCache(counted)).toBe(3);
			expect(calls).toBe(1);
			expect(sortableSet.getFromCache(counted)).toBe(3);
			expect(sortableSet.getFromCache(counted)).toBe(3);
			expect(calls).toBe(2);
		});

		it("holds one function's answer without a map", () => {
			const sortableSet = new SortableSet([1, 2, 3]);
			sortableSet.getFromUnorderedCache(size);
			// The point of the pair of slots: a set asked by one function, which is
			// the common case, must not pay for a Map.
			const asAny = /** @type {EXPECTED_ANY} */ (sortableSet);
			expect(asAny._cacheOrderIndependentFn).toBe(size);
			expect(asAny._cacheOrderIndependentValue).toBe(3);
		});

		it("keeps every answer once a second function asks", () => {
			/**
			 * @param {SortableSet<number>} set the set asked
			 * @param {(set: SortableSet<number>) => number} fn what to ask it
			 * @returns {number} the answer
			 */
			const ordered = (set, fn) => set.getFromCache(fn);
			/**
			 * @param {SortableSet<number>} set the set asked
			 * @param {(set: SortableSet<number>) => number} fn what to ask it
			 * @returns {number} the answer
			 */
			const unordered = (set, fn) => set.getFromUnorderedCache(fn);

			for (const get of [ordered, unordered]) {
				const calls = { size: 0, first: 0, last: 0 };
				/**
				 * @param {SortableSet<number>} set the set asked
				 * @returns {number} how many items it holds
				 */
				const countedSize = (set) => {
					calls.size++;
					return set.size;
				};
				/**
				 * @param {SortableSet<number>} set the set asked
				 * @returns {number} its first item
				 */
				const first = (set) => {
					calls.first++;
					return [...set][0];
				};
				/**
				 * @param {SortableSet<number>} set the set asked
				 * @returns {number} its last item
				 */
				const last = (set) => {
					calls.last++;
					return [...set][set.size - 1];
				};
				const sortableSet = new SortableSet([1, 2, 3]);
				expect(get(sortableSet, countedSize)).toBe(3);
				expect(get(sortableSet, first)).toBe(1);
				// Both answers survive the move into the map, and a third function
				// joins the ones already there.
				expect(get(sortableSet, countedSize)).toBe(3);
				expect(get(sortableSet, first)).toBe(1);
				expect(get(sortableSet, last)).toBe(3);
				expect(get(sortableSet, last)).toBe(3);
				expect(calls).toEqual({ size: 1, first: 1, last: 1 });
			}
		});

		it("recomputes an answer of undefined, as a map lookup did", () => {
			const sortableSet = new SortableSet([1, 2, 3]);
			let calls = 0;
			/**
			 * @returns {undefined} nothing, which the cache cannot tell from a miss
			 */
			const nothing = () => {
				calls++;
				return undefined;
			};
			expect(sortableSet.getFromUnorderedCache(nothing)).toBe(undefined);
			expect(sortableSet.getFromUnorderedCache(nothing)).toBe(undefined);
			expect(calls).toBe(2);
			sortableSet.getFromUnorderedCache(size);
			expect(sortableSet.getFromUnorderedCache(nothing)).toBe(undefined);
			expect(calls).toBe(3);
		});

		it("forgets both caches when its membership changes", () => {
			/** @type {((set: SortableSet<number>) => void)[]} */
			const changes = [
				(set) => {
					set.add(4);
				},
				(set) => {
					set.delete(1);
				},
				(set) => {
					set.clear();
				}
			];
			for (const change of changes) {
				const sortableSet = new SortableSet([1, 2, 3]);
				let calls = 0;
				/**
				 * @param {SortableSet<number>} set the set asked
				 * @returns {number} how many items it holds
				 */
				const counted = (set) => {
					calls++;
					return set.size;
				};
				sortableSet.getFromCache(counted);
				sortableSet.getFromUnorderedCache(counted);
				expect(calls).toBe(2);
				change(sortableSet);
				sortableSet.getFromCache(counted);
				sortableSet.getFromUnorderedCache(counted);
				expect(calls).toBe(4);
			}
		});

		it("forgets a map of answers too when its membership changes", () => {
			const sortableSet = new SortableSet([1, 2, 3]);
			const calls = { size: 0, first: 0 };
			/**
			 * @param {SortableSet<number>} set the set asked
			 * @returns {number} how many items it holds
			 */
			const countedSize = (set) => {
				calls.size++;
				return set.size;
			};
			/**
			 * @param {SortableSet<number>} set the set asked
			 * @returns {number} its first item
			 */
			const first = (set) => {
				calls.first++;
				return [...set][0];
			};
			sortableSet.getFromUnorderedCache(countedSize);
			sortableSet.getFromUnorderedCache(first);
			sortableSet.add(4);
			expect(sortableSet.getFromUnorderedCache(countedSize)).toBe(4);
			expect(sortableSet.getFromUnorderedCache(first)).toBe(1);
			expect(calls).toEqual({ size: 2, first: 2 });
		});

		it("forgets only the order-dependent cache when sorted", () => {
			const sortableSet = new SortableSet([3, 1, 2]);
			const calls = { ordered: 0, unordered: 0 };
			/**
			 * @param {SortableSet<number>} set the set asked
			 * @returns {number} its first item, which sorting moves
			 */
			const firstOrdered = (set) => {
				calls.ordered++;
				return [...set][0];
			};
			/**
			 * @param {SortableSet<number>} set the set asked
			 * @returns {number} how many items it holds, which sorting does not move
			 */
			const sizeUnordered = (set) => {
				calls.unordered++;
				return set.size;
			};
			expect(sortableSet.getFromCache(firstOrdered)).toBe(3);
			expect(sortableSet.getFromUnorderedCache(sizeUnordered)).toBe(3);
			sortableSet.sortWith((a, b) => a - b);
			expect(sortableSet.getFromCache(firstOrdered)).toBe(1);
			expect(sortableSet.getFromUnorderedCache(sizeUnordered)).toBe(3);
			expect(calls).toEqual({ ordered: 2, unordered: 1 });
		});

		it("keeps what it cached across an add or a delete that changes nothing", () => {
			const sortableSet = new SortableSet([3, 1, 2]);
			let calls = 0;
			/**
			 * @param {SortableSet<number>} set the set asked
			 * @returns {number[]} its items
			 */
			const items = (set) => {
				calls++;
				return [...set];
			};
			expect(sortableSet.getFromCache(items)).toEqual([3, 1, 2]);
			expect(sortableSet.getFromUnorderedCache(items)).toEqual([3, 1, 2]);
			sortableSet.add(1);
			sortableSet.delete(4);
			expect(sortableSet.getFromCache(items)).toEqual([3, 1, 2]);
			expect(sortableSet.getFromUnorderedCache(items)).toEqual([3, 1, 2]);
			expect(calls).toBe(2);
			sortableSet.add(4);
			expect(sortableSet.getFromCache(items)).toEqual([3, 1, 2, 4]);
			sortableSet.delete(4);
			expect(sortableSet.getFromUnorderedCache(items)).toEqual([3, 1, 2]);
			expect(calls).toBe(4);
		});
	});

	it("stays sorted across an add of an item it holds", () => {
		let compared = 0;
		const sortableSet = new SortableSet(
			[3, 1, 2],
			/**
			 * @param {number} a an item
			 * @param {number} b another item
			 * @returns {number} their order
			 */
			(a, b) => {
				compared++;
				return a - b;
			}
		);
		sortableSet.sort();
		const sorted = compared;
		sortableSet.add(2);
		sortableSet.sort();
		expect(compared).toBe(sorted);
		sortableSet.add(0);
		sortableSet.sort();
		expect(compared).toBeGreaterThan(sorted);
		expect([...sortableSet]).toEqual([0, 1, 2, 3]);
	});

	it("adds the items it is constructed with through `add`, as a Set does", () => {
		/** @type {number[]} */
		const added = [];
		/**
		 * @extends {SortableSet<number>}
		 */
		class Recording extends SortableSet {
			/**
			 * @param {number} value value to add
			 * @returns {this} itself
			 */
			add(value) {
				added.push(value);
				return super.add(value);
			}
		}
		const recording = new Recording([1, 2, 2]);
		expect(added).toEqual([1, 2, 2]);
		expect([...recording]).toEqual([1, 2]);
	});

	// These run as tests and are type-checked by `yarn lint:types-test`: each
	// `@ts-expect-error` fails that check once the line it marks compiles.
	describe("cache types", () => {
		/**
		 * The set as an array, as webpack's own `getArray` helpers take a set.
		 * @template T
		 * @param {SortableSet<T>} set the set
		 * @returns {T[]} its items
		 */
		const getArray = (set) => [...set];

		/**
		 * How many items a set holds, for any set.
		 * @param {SortableSet<number>} set the set
		 * @returns {number} its size
		 */
		const countOf = (set) => set.size;

		it("passes a set typed by what it caches to a helper taking any set", () => {
			// WHY: a typedef at the top of SortableSet.js made `require` give a
			// second SortableSet type, which tsc failed to relate to this one.
			/** @type {SortableSet<number, number[] | number>} */
			const set = new SortableSet([3, 1, 2]);
			/** @type {number[]} */
			const items = set.getFromCache(getArray);
			/** @type {number} */
			const count = set.getFromUnorderedCache(countOf);
			expect(items).toEqual([3, 1, 2]);
			expect(count).toBe(3);
			/** @type {SortableSet<number>} */
			const plain = set;
			expect(plain.size).toBe(3);
		});

		it("caches only what a set says it caches", () => {
			/** @type {SortableSet<number, number[]>} */
			const set = new SortableSet([1, 2]);
			// @ts-expect-error a set caching arrays caches no string
			const label = set.getFromCache(() => "two");
			expect(label).toBe("two");
		});

		it("caches any value on a set that names nothing it caches", () => {
			/** @type {SortableSet<number>} */
			const set = new SortableSet([1, 2]);
			/** @type {string} */
			const label = set.getFromCache(() => "two");
			/** @type {number[]} */
			const items = set.getFromCache(getArray);
			expect(label).toBe("two");
			expect(items).toEqual([1, 2]);
		});

		it("answers each function with that function's own type", () => {
			/** @type {SortableSet<number, number[] | number>} */
			const set = new SortableSet([1, 2]);
			const items = set.getFromCache(getArray);
			// @ts-expect-error an array answer is no number
			/** @type {number} */ const wrong = items;
			expect(wrong).toEqual([1, 2]);
		});
	});
});
