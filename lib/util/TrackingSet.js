/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/
"use strict";

/** @typedef {typeof import("./StackedSetMap.js")} StackedSetMap */
/**
 * @template {T}
 */
module.exports = class TrackingSet {
	/**
	 *
	 * @param {TrackingSet<T>=} set initial set
	 */
	constructor(set) {
		/**
		 * @private
		 * @type {TrackingSet<T>}
		 */
		this.set = set;
		/**
		 * @private
		 * @type {Set<T>}
		 */
		this.set2 = new Set();
		/**
		 * @private
		 * @type {string}
		 */
		this.stack = set.stack;
	}

	/**
	 * Add an item
	 * @param {T} item item to add
	 * @returns {Set<T>} the set
	 */
	add(item) {
		this.set2.add(item);
		return this.set.add(item);
	}

	/**
	 * Delete an item
	 * @param {T} item Item
	 * @returns {boolean} true if item existed, false otherwise
	 */
	delete(item) {
		this.set2.delete(item);
		return this.set.delete(item);
	}

	/**
	 * Check if item exist in the set
	 * @param {T} item Item to check
	 * @returns {boolean} true if exists, false otherwise
	 */
	has(item) {
		return this.set.has(item);
	}

	/**
	 * Create a child
	 * @returns {TrackingSet} the set
	 */
	createChild() {
		return this.set.createChild();
	}

	/**
	 * Get added items
	 * @returns {Set<T>} list of added items
	 */
	getAddedItems() {
		return this.set2;
	}
};
