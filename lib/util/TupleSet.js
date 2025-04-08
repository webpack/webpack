/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

"use strict";

/**
 * @template K
 * @template V
 * @typedef {Map<K, InnerMap<K, V> | Set<V>>} InnerMap
 */

/**
 * @template T
 * @template V
 */
class TupleSet {
	/**
	 * @param {Iterable<[T, V, ...EXPECTED_ANY]>=} init init
	 */
	constructor(init) {
		/** @type {InnerMap<T, V>} */
		this._map = new Map();
		this.size = 0;
		if (init) {
			for (const tuple of init) {
				this.add(...tuple);
			}
		}
	}

	/**
	 * @param {[T, V, ...EXPECTED_ANY]} args tuple
	 * @returns {void}
	 */
	add(...args) {
		let map = this._map;
		for (let i = 0; i < args.length - 2; i++) {
			const arg = args[i];
			const innerMap = map.get(arg);
			if (innerMap === undefined) {
				map.set(arg, (map = new Map()));
			} else {
				map = /** @type {InnerMap<T, V>} */ (innerMap);
			}
		}

		const beforeLast = args[args.length - 2];
		let set = /** @type {Set<V>} */ (map.get(beforeLast));
		if (set === undefined) {
			map.set(beforeLast, (set = new Set()));
		}

		const last = args[args.length - 1];
		this.size -= set.size;
		set.add(last);
		this.size += set.size;
	}

	/**
	 * @param {[T, V, ...EXPECTED_ANY]} args tuple
	 * @returns {boolean} true, if the tuple is in the Set
	 */
	has(...args) {
		let map = this._map;
		for (let i = 0; i < args.length - 2; i++) {
			const arg = args[i];
			map = /** @type {InnerMap<T, V>} */ (map.get(arg));
			if (map === undefined) {
				return false;
			}
		}

		const beforeLast = args[args.length - 2];
		const set = map.get(beforeLast);
		if (set === undefined) {
			return false;
		}

		const last = args[args.length - 1];
		return set.has(last);
	}

	/**
	 * @param {[T, V, ...EXPECTED_ANY]} args tuple
	 * @returns {void}
	 */
	delete(...args) {
		let map = this._map;
		for (let i = 0; i < args.length - 2; i++) {
			const arg = args[i];
			map = /** @type {InnerMap<T, V>} */ (map.get(arg));
			if (map === undefined) {
				return;
			}
		}

		const beforeLast = args[args.length - 2];
		const set = map.get(beforeLast);
		if (set === undefined) {
			return;
		}

		const last = args[args.length - 1];
		this.size -= set.size;
		set.delete(last);
		this.size += set.size;
	}

	/**
	 * @returns {Iterator<[T, V, ...EXPECTED_ANY]>} iterator
	 */
	[Symbol.iterator]() {
		// This is difficult to type because we can have a map inside a map inside a map, etc. where the end is a set (each key is an argument)
		// But in basic use we only have 2 arguments in our methods, so we have `Map<K, Set<V>>`
		/** @type {MapIterator<[T, InnerMap<T, V> | Set<V>]>[]} */
		const iteratorStack = [];
		/** @type {[T?, V?, ...EXPECTED_ANY]} */
		const tuple = [];
		/** @type {SetIterator<V> | undefined} */
		let currentSetIterator;

		/**
		 * @param {MapIterator<[T, InnerMap<T, V> | Set<V>]>} it iterator
		 * @returns {boolean} result
		 */
		const next = it => {
			const result = it.next();
			if (result.done) {
				if (iteratorStack.length === 0) return false;
				tuple.pop();
				return next(
					/** @type {MapIterator<[T, InnerMap<T, V> | Set<V>]>} */
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
								/** @type {MapIterator<[T, InnerMap<T, V> | Set<V>]>} */
								(iteratorStack.pop())
							)
						) {
							currentSetIterator = undefined;
						}
					} else {
						return {
							done: false,
							value:
								/** @type {[T, V, ...EXPECTED_ANY]} */
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
