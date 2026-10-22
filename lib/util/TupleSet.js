/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

"use strict";

/**
 * Nested map structure used to index tuple prefixes until the final tuple
 * element can be stored in a `Set`.
 * @template K
 * @template V
 * @typedef {Map<K, InnerMap<K, V> | Set<V>>} InnerMap
 */

/**
 * Stores tuples of arbitrary length while preserving efficient prefix lookups
 * through a tree of maps that ends in a set of final values.
 * @template {EXPECTED_ANY[]} K
 * @template V
 */
class TupleSet {
	/**
	 * Seeds the tuple set with an optional iterable of tuples.
	 * @param {Iterable<[...K, V]>=} init init
	 */
	constructor(init) {
		/** @type {InnerMap<K[number], V>} */
		this._map = new Map();
		/** @type {number} */
		this.size = 0;
		if (init) {
			for (const tuple of init) {
				this.add(...tuple);
			}
		}
	}

	/**
	 * Adds a tuple to the set, creating any missing prefix maps along the way.
	 * @param {[...K, V]} args tuple
	 * @returns {void}
	 */
	add(...args) {
		let map = this._map;
		for (let i = 0; i < args.length - 2; i++) {
			const arg = /** @type {K[number]} */ (args[i]);
			const innerMap = map.get(arg);
			if (innerMap === undefined) {
				map.set(arg, (map = new Map()));
			} else {
				map = /** @type {InnerMap<K[number], V>} */ (innerMap);
			}
		}

		const beforeLast = /** @type {K[number]} */ (args[args.length - 2]);
		let set = /** @type {Set<V>} */ (map.get(beforeLast));
		if (set === undefined) {
			map.set(beforeLast, (set = new Set()));
		}

		const last = /** @type {V} */ (args[args.length - 1]);
		this.size -= set.size;
		set.add(last);
		this.size += set.size;
	}

	/**
	 * Checks whether the exact tuple is already present in the set.
	 * @param {[...K, V]} args tuple
	 * @returns {boolean} true, if the tuple is in the Set
	 */
	has(...args) {
		let map = this._map;
		for (let i = 0; i < args.length - 2; i++) {
			const arg = /** @type {K[number]} */ (args[i]);
			map = /** @type {InnerMap<K[number], V>} */ (map.get(arg));
			if (map === undefined) {
				return false;
			}
		}

		const beforeLast = /** @type {K[number]} */ (args[args.length - 2]);
		const set = /** @type {Set<V> | undefined} */ (map.get(beforeLast));
		if (set === undefined) {
			return false;
		}

		const last = /** @type {V} */ (args[args.length - 1]);
		return set.has(last);
	}

	/**
	 * Removes a tuple from the set when it is present.
	 * @param {[...K, V]} args tuple
	 * @returns {void}
	 */
	delete(...args) {
		let map = this._map;
		for (let i = 0; i < args.length - 2; i++) {
			const arg = /** @type {K[number]} */ (args[i]);
			map = /** @type {InnerMap<K[number], V>} */ (map.get(arg));
			if (map === undefined) {
				return;
			}
		}

		const beforeLast = /** @type {K[number]} */ (args[args.length - 2]);
		const set = /** @type {Set<V> | undefined} */ (map.get(beforeLast));
		if (set === undefined) {
			return;
		}

		const last = /** @type {V} */ (args[args.length - 1]);
		this.size -= set.size;
		set.delete(last);
		this.size += set.size;
	}

	/**
	 * Iterates over every stored tuple by walking the nested map structure and
	 * yielding each complete prefix plus its terminal set value.
	 * @returns {Iterator<[...K, V]>} iterator
	 */
	[Symbol.iterator]() {
		/**
		 * Iterator type used while traversing nested tuple-prefix maps.
		 * @template T, V
		 * @typedef {MapIterator<[T, InnerMap<T, V> | Set<V>]>} IteratorStack
		 */

		// This is difficult to type because we can have a map inside a map inside a map, etc. where the end is a set (each key is an argument)
		// But in basic use we only have 2 arguments in our methods, so we have `Map<K, Set<V>>`
		/** @type {IteratorStack<K[number], V>[]} */
		const iteratorStack = [];
		/** @type {(K[number] | V)[]} */
		const tuple = [];
		/** @type {SetIterator<V> | undefined} */
		let currentSetIterator;

		/**
		 * Advances through nested maps until a terminal value set is reached or
		 * every remaining branch has been exhausted.
		 * @param {IteratorStack<K[number], V>} it iterator
		 * @returns {boolean} result
		 */
		const next = (it) => {
			const result = it.next();
			if (result.done) {
				if (iteratorStack.length === 0) return false;
				tuple.pop();
				return next(
					/** @type {IteratorStack<K[number], V>} */
					(iteratorStack.pop())
				);
			}
			const [key, value] = result.value;
			iteratorStack.push(it);
			tuple.push(key);
			if (value instanceof Set) {
				currentSetIterator = value[Symbol.iterator]();
				return true;
			}
			return next(value[Symbol.iterator]());
		};

		next(this._map[Symbol.iterator]());

		return {
			next() {
				while (currentSetIterator) {
					const result = currentSetIterator.next();
					if (result.done) {
						tuple.pop();
						if (
							!next(
								/** @type {IteratorStack<K[number], V>} */
								(iteratorStack.pop())
							)
						) {
							currentSetIterator = undefined;
						}
					} else {
						return {
							done: false,
							value:
								/* eslint-disable unicorn/prefer-spread */
								/** @type {[...K, V]} */
								(tuple.concat(result.value))
						};
					}
				}
				return { done: true, value: undefined };
			}
		};
	}
}

module.exports = TupleSet;
