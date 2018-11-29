/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

"use strict";

/**
 * @template T
 * @template U
 * @typedef {import("./StackedSetMap")<T,U>} StackedSetMap<T,U>
 */

/**
 * @template T
 * @template U
 */
class TrackingSet {
	/**
	 * @param {StackedSetMap<T,U>} set the set to track
	 */
	constructor(set) {
		/** @type {StackedSetMap<T,U>} */
		this.set = set;
		/** @type {Set<T>} */
		this.set2 = new Set();
		this.stack = set.stack;
	}

	/**
	 * @param {T} item the item to add
	 * @returns {void}
	 */
	add(item) {
		this.set2.add(item);
		this.set.add(item);
	}

	/**
	 * @param {T} item the item to delete
	 * @returns {void}
	 */
	delete(item) {
		this.set2.delete(item);
		this.set.delete(item);
	}

	/**
	 * @param {T} item the item to test
	 * @returns {boolean} true if the item exists in this set
	 */
	has(item) {
		return this.set.has(item);
	}

	createChild() {
		return this.set.createChild();
	}

	getAddedItems() {
		return this.set2;
	}
}

module.exports = TrackingSet;
