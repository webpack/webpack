/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

"use strict";

/**
 * @template K
 * @template V
 */
class StackedCacheMap {
	constructor() {
		/** @type {Map<K, V>} */
		this.map = new Map();
		/** @type {ReadonlyMap<K, V>[]} */
		this.stack = [];
	}

	/**
	 * @param {ReadonlyMap<K, V>} map map to add
	 * @param {boolean=} immutable if 'map' is immutable and StackedCacheMap can keep referencing it
	 */
	addAll(map, immutable) {
		if (immutable) {
			this.stack.push(map);

			// largest map should go first
			for (let i = this.stack.length - 1; i > 0; i--) {
				const beforeLast = this.stack[i - 1];
				if (beforeLast.size >= map.size) break;
				this.stack[i] = beforeLast;
				this.stack[i - 1] = map;
			}
		} else {
			for (const [key, value] of map) {
				this.map.set(key, value);
			}
		}
	}

	/**
	 * @param {K} item the key of the element to add
	 * @param {V} value the value of the element to add
	 * @returns {void}
	 */
	set(item, value) {
		this.map.set(item, value);
	}

	/**
	 * @param {K} item the item to delete
	 * @returns {void}
	 */
	delete(item) {
		throw new Error("Items can't be deleted from a StackedCacheMap");
	}

	/**
	 * @param {K} item the item to test
	 * @returns {boolean} true if the item exists in this set
	 */
	has(item) {
		throw new Error(
			"Checking StackedCacheMap.has before reading is inefficient, use StackedCacheMap.get and check for undefined"
		);
	}

	/**
	 * @param {K} item the key of the element to return
	 * @returns {V} the value of the element
	 */
	get(item) {
		for (const map of this.stack) {
			const value = map.get(item);
			if (value !== undefined) return value;
		}
		return this.map.get(item);
	}

	clear() {
		this.stack.length = 0;
		this.map.clear();
	}

	/**
	 * @returns {number} size of the map
	 */
	get size() {
		let size = this.map.size;
		for (const map of this.stack) {
			size += map.size;
		}
		return size;
	}

	/**
	 * @returns {Iterator<[K, V]>} iterator
	 */
	[Symbol.iterator]() {
		const iterators = this.stack.map(map => map[Symbol.iterator]());
		let current = this.map[Symbol.iterator]();
		return {
			next() {
				let result = current.next();
				while (result.done && iterators.length > 0) {
					current = iterators.pop();
					result = current.next();
				}
				return result;
			}
		};
	}
}

module.exports = StackedCacheMap;
