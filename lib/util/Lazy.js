/*
    MIT License http://www.opensource.org/licenses/mit-license.php
    Author Tobias Koppers @sokra
*/

"use strict";

const { first } = require("./SetHelpers");
const SortableSet = require("./SortableSet");
const makeSerializable = require("./makeSerializable");

/**
 * @template T
 * @template K
 * @typedef {(item: T) => K} GetKey
 */

/**
 * @template T
 * @typedef {(a: T, n: T) => number} Comparator
 */

/**
 * @template T
 * @template K
 * @typedef {LazyBucketSortedSet<T, K> | SortableSet<T>} Entry
 */

/**
 * @template T
 * @template K
 * @typedef {GetKey<T, K> | Comparator<K> | Comparator<T>} Arg
 */

/**
 * Multi layer bucket sorted set:
 * Supports adding non-existing items (DO NOT ADD ITEM TWICE),
 * Supports removing exiting items (DO NOT REMOVE ITEM NOT IN SET),
 * Supports popping the first items according to defined order,
 * Supports iterating all items without order,
 * Supports updating an item in an efficient way,
 * Supports size property, which is the number of items,
 * Items are lazy partially sorted when needed
 * @template T
 * @template K
 */
class LazyBucketSortedSet {
	/**
	 * @param {GetKey<T, K>} getKey function to get key from item
	 * @param {Comparator<K>=} comparator comparator to sort keys
	 * @param {...Arg<T, K>} args more pairs of getKey and comparator plus optional final comparator for the last layer
	 */
	constructor(getKey, comparator, ...args) {
		this._getKey = getKey;
		this._innerArgs = args;
		this._leaf = args.length <= 1;
		this._keys = new SortableSet(undefined, comparator);
		/** @type {Map<K, Entry<T, K>>} */
		this._map = new Map();
		/** @type {Set<T>} */
		this._unsortedItems = new Set();
		this.size = 0;
	}

	/**
	 * @param {T} item an item
	 * @returns {void}
	 */
	add(item) {
		this.size++;
		this._unsortedItems.add(item);
	}

	/**
	 * @param {K} key key of item
	 * @param {T} item the item
	 * @returns {void}
	 */
	_addInternal(key, item) {
		let entry = this._map.get(key);
		if (entry === undefined) {
			entry = this._leaf
				? new SortableSet(
						undefined,
						/** @type {Comparator<T>} */
						(this._innerArgs[0])
					)
				: new LazyBucketSortedSet(
						.../** @type {[GetKey<T, K>, Comparator<K>]} */
						(this._innerArgs)
					);
			this._keys.add(key);
			this._map.set(key, entry);
		}
		entry.add(item);
	}

	/**
	 * @param {T} item an item
	 * @returns {void}
	 */
	delete(item) {
		this.size--;
		if (this._unsortedItems.has(item)) {
			this._unsortedItems.delete(item);
			return;
		}
		const key = this._getKey(item);
		const entry = /** @type {Entry<T, K>} */ (this._map.get(key));
		entry.delete(item);
		if (entry.size === 0) {
			this._deleteKey(key);
		}
	}

	/**
	 * @param {K} key key to be removed
	 * @returns {void}
	 */
	_deleteKey(key) {
		this._keys.delete(key);
		this._map.delete(key);
	}

	/**
	 * @returns {T | undefined} an item
	 */
	popFirst() {
		if (this.size === 0) return;
		this.size--;
		if (this._unsortedItems.size > 0) {
			for (const item of this._unsortedItems) {
				const key = this._getKey(item);
				this._addInternal(key, item);
			}
			this._unsortedItems.clear();
		}
		this._keys.sort();
		const key = /** @type {K} */ (first(this._keys));
		const entry = this._map.get(key);
		if (this._leaf) {
			const leafEntry = /** @type {SortableSet<T>} */ (entry);
			leafEntry.sort();
			const item = /** @type {T} */ (first(leafEntry));
			leafEntry.delete(item);
			if (leafEntry.size === 0) {
				this._deleteKey(key);
			}
			return item;
		}
		const nodeEntry =
			/** @type {LazyBucketSortedSet<T, K>} */
			(entry);
		const item = nodeEntry.popFirst();
		if (nodeEntry.size === 0) {
			this._deleteKey(key);
		}
		return item;
	}

	/**
	 * @param {T} item to be updated item
	 * @returns {(remove?: true) => void} finish update
	 */
	startUpdate(item) {
		if (this._unsortedItems.has(item)) {
			return (remove) => {
				if (remove) {
					this._unsortedItems.delete(item);
					this.size--;
				}
			};
		}
		const key = this._getKey(item);
		if (this._leaf) {
			const oldEntry = /** @type {SortableSet<T>} */ (this._map.get(key));
			return (remove) => {
				if (remove) {
					this.size--;
					oldEntry.delete(item);
					if (oldEntry.size === 0) {
						this._deleteKey(key);
					}
					return;
				}
				const newKey = this._getKey(item);
				if (key === newKey) {
					// This flags the sortable set as unordered
					oldEntry.add(item);
				} else {
					oldEntry.delete(item);
					if (oldEntry.size === 0) {
						this._deleteKey(key);
					}
					this._addInternal(newKey, item);
				}
			};
		}
		const oldEntry =
			/** @type {LazyBucketSortedSet<T, K>} */
			(this._map.get(key));
		const finishUpdate = oldEntry.startUpdate(item);
		return (remove) => {
			if (remove) {
				this.size--;
				finishUpdate(true);
				if (oldEntry.size === 0) {
					this._deleteKey(key);
				}
				return;
			}
			const newKey = this._getKey(item);
			if (key === newKey) {
				finishUpdate();
			} else {
				finishUpdate(true);
				if (oldEntry.size === 0) {
					this._deleteKey(key);
				}
				this._addInternal(newKey, item);
			}
		};
	}

	/**
	 * @param {Iterator<T>[]} iterators list of iterators to append to
	 * @returns {void}
	 */
	_appendIterators(iterators) {
		if (this._unsortedItems.size > 0) {
			iterators.push(this._unsortedItems[Symbol.iterator]());
		}
		for (const key of this._keys) {
			const entry = this._map.get(key);
			if (this._leaf) {
				const leafEntry = /** @type {SortableSet<T>} */ (entry);
				const iterator = leafEntry[Symbol.iterator]();
				iterators.push(iterator);
			} else {
				const nodeEntry =
					/** @type {LazyBucketSortedSet<T, K>} */
					(entry);
				nodeEntry._appendIterators(iterators);
			}
		}
	}

	/**
	 * @returns {Iterator<T>} the iterator
	 */
	[Symbol.iterator]() {
		/** @type {Iterator<T>[]} */
		const iterators = [];
		this._appendIterators(iterators);
		iterators.reverse();
		let currentIterator =
			/** @type {Iterator<T>} */
			(iterators.pop());
		return {
			next: () => {
				const res = currentIterator.next();
				if (res.done) {
					if (iterators.length === 0) return res;
					currentIterator = /** @type {Iterator<T>} */ (iterators.pop());
					return currentIterator.next();
				}
				return res;
			}
		};
	}
}

/**
 * @template T
 * @param {Set<T>} targetSet set where items should be added
 * @param {Set<Iterable<T>>} toMerge iterables to be merged
 * @returns {void}
 */
const merge = (targetSet, toMerge) => {
	for (const set of toMerge) {
		for (const item of set) {
			targetSet.add(item);
		}
	}
};

/**
 * @template T
 * @param {Set<Iterable<T>>} targetSet set where iterables should be added
 * @param {LazySet<T>[]} toDeepMerge lazy sets to be flattened
 * @returns {void}
 */
const flatten = (targetSet, toDeepMerge) => {
	for (const set of toDeepMerge) {
		if (set._set.size > 0) targetSet.add(set._set);
		if (set._needMerge) {
			for (const mergedSet of set._toMerge) {
				targetSet.add(mergedSet);
			}
			flatten(targetSet, set._toDeepMerge);
		}
	}
};

/**
 * @template T
 * @typedef {import("typescript-iterable").SetIterator<T>} SetIterator
 */

/**
 * Like Set but with an addAll method to eventually add items from another iterable.
 * Access methods make sure that all delayed operations are executed.
 * Iteration methods deopts to normal Set performance until clear is called again (because of the chance of modifications during iteration).
 * @template T
 */
class LazySet {
	/**
	 * @param {Iterable<T>=} iterable init iterable
	 */
	constructor(iterable) {
		/** @type {Set<T>} */
		this._set = new Set(iterable);
		/** @type {Set<Iterable<T>>} */
		this._toMerge = new Set();
		/** @type {LazySet<T>[]} */
		this._toDeepMerge = [];
		this._needMerge = false;
		this._deopt = false;
	}

	_flatten() {
		flatten(this._toMerge, this._toDeepMerge);
		this._toDeepMerge.length = 0;
	}

	_merge() {
		this._flatten();
		merge(this._set, this._toMerge);
		this._toMerge.clear();
		this._needMerge = false;
	}

	_isEmpty() {
		return (
			this._set.size === 0 &&
			this._toMerge.size === 0 &&
			this._toDeepMerge.length === 0
		);
	}

	get size() {
		if (this._needMerge) this._merge();
		return this._set.size;
	}

	/**
	 * @param {T} item an item
	 * @returns {LazySet<T>} itself
	 */
	add(item) {
		this._set.add(item);
		return this;
	}

	/**
	 * @param {Iterable<T> | LazySet<T>} iterable a immutable iterable or another immutable LazySet which will eventually be merged into the Set
	 * @returns {LazySet<T>} itself
	 */
	addAll(iterable) {
		if (this._deopt) {
			const _set = this._set;
			for (const item of iterable) {
				_set.add(item);
			}
		} else {
			if (iterable instanceof LazySet) {
				if (iterable._isEmpty()) return this;
				this._toDeepMerge.push(iterable);
				this._needMerge = true;
				if (this._toDeepMerge.length > 100000) {
					this._flatten();
				}
			} else {
				this._toMerge.add(iterable);
				this._needMerge = true;
			}
			if (this._toMerge.size > 100000) this._merge();
		}
		return this;
	}

	clear() {
		this._set.clear();
		this._toMerge.clear();
		this._toDeepMerge.length = 0;
		this._needMerge = false;
		this._deopt = false;
	}

	/**
	 * @param {T} value an item
	 * @returns {boolean} true, if the value was in the Set before
	 */
	delete(value) {
		if (this._needMerge) this._merge();
		return this._set.delete(value);
	}

	/**
	 * @returns {SetIterator<[T, T]>} entries
	 */
	entries() {
		this._deopt = true;
		if (this._needMerge) this._merge();
		return this._set.entries();
	}

	/**
	 * @template K
	 * @param {(value: T, value2: T, set: Set<T>) => void} callbackFn function called for each entry
	 * @param {K} thisArg this argument for the callbackFn
	 * @returns {void}
	 */
	forEach(callbackFn, thisArg) {
		this._deopt = true;
		if (this._needMerge) this._merge();
		// eslint-disable-next-line unicorn/no-array-for-each, unicorn/no-array-method-this-argument
		this._set.forEach(callbackFn, thisArg);
	}

	/**
	 * @param {T} item an item
	 * @returns {boolean} true, when the item is in the Set
	 */
	has(item) {
		if (this._needMerge) this._merge();
		return this._set.has(item);
	}

	/**
	 * @returns {SetIterator<T>} keys
	 */
	keys() {
		this._deopt = true;
		if (this._needMerge) this._merge();
		return this._set.keys();
	}

	/**
	 * @returns {SetIterator<T>} values
	 */
	values() {
		this._deopt = true;
		if (this._needMerge) this._merge();
		return this._set.values();
	}

	/**
	 * @returns {SetIterator<T>} iterable iterator
	 */
	[Symbol.iterator]() {
		this._deopt = true;
		if (this._needMerge) this._merge();
		return this._set[Symbol.iterator]();
	}

	/* istanbul ignore next */
	get [Symbol.toStringTag]() {
		return "LazySet";
	}

	/**
	 * @param {import("../serialization/ObjectMiddleware").ObjectSerializerContext} context context
	 */
	serialize({ write }) {
		if (this._needMerge) this._merge();
		write(this._set.size);
		for (const item of this._set) write(item);
	}

	/**
	 * @template T
	 * @param {import("../serialization/ObjectMiddleware").ObjectDeserializerContext} context context
	 * @returns {LazySet<T>} lazy set
	 */
	static deserialize({ read }) {
		const count = read();
		/** @type {T[]} */
		const items = [];
		for (let i = 0; i < count; i++) {
			items.push(read());
		}
		return new LazySet(items);
	}
}
makeSerializable(LazySet, "webpack/lib/util/LazySet");

module.exports = { LazyBucketSortedSet, LazySet };
