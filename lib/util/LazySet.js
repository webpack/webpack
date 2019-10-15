/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

"use strict";

/**
 * @template T
 * @param {Set<T>} targetSet set where items should be added
 * @param {Set<Iterable<T> | LazySet<T>>} toMerge iterables or lazy set to be merged
 */
const merge = (targetSet, toMerge) => {
	for (const set of toMerge) {
		if (set instanceof LazySet) {
			for (const item of set._set) {
				targetSet.add(item);
			}
			if (set._needMerge) {
				merge(targetSet, set._toMerge);
			}
		} else {
			for (const item of set) {
				targetSet.add(item);
			}
		}
	}
};

/**
 * Like Set but with an addAll method to eventually add items from another iterable.
 * Access methods make sure that all delayed operations are executed.
 * Iteration methods deopts to normal Set performance until clear is called again (because of the chance of modifications during iteration).
 * @template T
 */
class LazySet {
	/**
	 * @param {Iterable<T>=} iterable init interable
	 */
	constructor(iterable) {
		/** @type {Set<T>} */
		this._set = new Set(iterable);
		/** @type {Set<Iterable<T> | LazySet<T>>} */
		this._toMerge = new Set();
		this._needMerge = false;
		this._deopt = false;
	}

	_merge() {
		merge(this._set, this._toMerge);
		this._toMerge.clear();
		this._needMerge = false;
	}

	get size() {
		if (this._needMerge) this._merge();
		return this._set.size;
	}

	/**
	 * @param {T} item an item
	 * @returns {this} itself
	 */
	add(item) {
		this._set.add(item);
		return this;
	}

	/**
	 * @param {Iterable<T> | LazySet<T>} iterable a immutable iterable or another immutable LazySet which will eventually be merged into the Set
	 * @returns {this} itself
	 */
	addAll(iterable) {
		if (this._deopt) {
			const _set = this._set;
			for (const item of iterable) {
				_set.add(item);
			}
		} else {
			this._toMerge.add(iterable);
			this._needMerge = true;
			// Avoid a memory leak
			if (this._toMerge.size > 100000) this._merge();
		}
		return this;
	}

	clear() {
		this._set.clear();
		this._toMerge.clear();
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

	entries() {
		this._deopt = true;
		if (this._needMerge) this._merge();
		return this._set.entries();
	}

	/**
	 * @param {function(T, T, Set<T>): void} callbackFn function called for each entry
	 * @param {any} thisArg this argument for the callbackFn
	 * @returns {void}
	 */
	forEach(callbackFn, thisArg) {
		this._deopt = true;
		if (this._needMerge) this._merge();
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

	keys() {
		this._deopt = true;
		if (this._needMerge) this._merge();
		return this._set.keys();
	}

	values() {
		this._deopt = true;
		if (this._needMerge) this._merge();
		return this._set.values();
	}

	[Symbol.iterator]() {
		this._deopt = true;
		if (this._needMerge) this._merge();
		return this._set[Symbol.iterator]();
	}

	get [Symbol.toStringTag]() {
		return "LazySet";
	}
}

module.exports = LazySet;
