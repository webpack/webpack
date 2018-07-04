/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/
"use strict";

const util = require("util");

const TOMBSTONE = {};
const UNDEFINED_MARKER = {};

/**
 * @template T
 */
class StackedSetMap {
	/**
	 * Create a new StackedSetMap
	 * @param {Array<Map<T, any>>=} parentStack parent stack
	 */
	constructor(parentStack) {
		/**
		 * @private
		 * @type {Array<Map<T, any>>}
		 */
		this.stack = parentStack === undefined ? [] : parentStack.slice();
		/**
		 * @private
		 * @type {Map<T, any>}
		 */
		this.map = new Map();
		this.stack.push(this.map);
	}

	/**
	 * Add a new item
	 * @param {T} item item to add
	 * @returns {void} map of values
	 */
	add(item) {
		this.map.set(item, true);
	}

	/**
	 * Set a new item with value
	 * @param {T} item item to set
	 * @param {any=} value value associated with the item
	 * @returns {void} map of values
	 */
	set(item, value) {
		this.map.set(item, value === undefined ? UNDEFINED_MARKER : value);
	}

	/**
	 * Delete an item
	 * @param {T} item item to delete
	 * @returns {void} true if item existed, false otherwise
	 */
	delete(item) {
		if (this.stack.length > 1) {
			this.map.set(item, TOMBSTONE);
		} else {
			this.map.delete(item);
		}
	}

	/**
	 * Check if an item exist
	 * @param {T} item the item to check
	 * @returns {boolean} true if item exist, false otherwise
	 */
	has(item) {
		const topValue = this.map.get(item);
		if (topValue !== undefined) return topValue !== TOMBSTONE;
		if (this.stack.length > 1) {
			for (var i = this.stack.length - 2; i >= 0; i--) {
				const value = this.stack[i].get(item);
				if (value !== undefined) {
					this.map.set(item, value);
					return value !== TOMBSTONE;
				}
			}
			this.map.set(item, TOMBSTONE);
		}
		return false;
	}

	/**
	 * Get an item
	 * @param {T} item item to get
	 * @returns {any | undefined} the item or undefined if item does not exist
	 */
	get(item) {
		const topValue = this.map.get(item);
		if (topValue !== undefined) {
			return topValue === TOMBSTONE || topValue === UNDEFINED_MARKER
				? undefined
				: topValue;
		}
		if (this.stack.length > 1) {
			for (var i = this.stack.length - 2; i >= 0; i--) {
				const value = this.stack[i].get(item);
				if (value !== undefined) {
					this.map.set(item, value);
					return value === TOMBSTONE || value === UNDEFINED_MARKER
						? undefined
						: value;
				}
			}
			this.map.set(item, TOMBSTONE);
		}
		return undefined;
	}

	/**
	 * @private
	 * @returns {void} no return
	 */
	_compress() {
		if (this.stack.length === 1) return;
		this.map = new Map();
		for (const data of this.stack) {
			for (const pair of data) {
				if (pair[1] === TOMBSTONE) {
					this.map.delete(pair[0]);
				} else {
					this.map.set(pair[0], pair[1]);
				}
			}
		}
		this.stack = [this.map];
	}

	/**
	 * Get the map-set as an array
	 * @returns {Array<T>} as an array of keys
	 */
	asArray() {
		this._compress();
		return Array.from(this.map.entries(), pair => pair[0]);
	}

	/**
	 * Get the map-set as a set
	 * @returns {Set<T>} as a set
	 */
	asSet() {
		return new Set(this.asArray());
	}

	/**
	 * Get the map-set as an array of key,value pairs
	 * @returns {Array<[T, any]>} as an array of pairs
	 */
	asPairArray() {
		this._compress();
		const entries = this.map.entries();
		return Array.from(
			entries,
			/**
			 * @param {[T, any]} pair Pair
			 * @returns {[T, any]} Pair
			 */
			pair => (pair[1] === UNDEFINED_MARKER ? [pair[0], undefined] : pair)
		);
	}

	/**
	 * Get the map-set as a map
	 * @returns {Map<T, any>} as a map
	 */
	asMap() {
		return new Map(this.asPairArray());
	}

	/**
	 * Get size of the map-set
	 * @returns {number} size of set
	 */
	get size() {
		this._compress();
		return this.map.size;
	}

	/**
	 * Create a child
	 * @returns {StackedSetMap<T>} new instance of StackedSetMap
	 */
	createChild() {
		return new StackedSetMap(this.stack);
	}

	/**
	 * @returns {never} throws
	 */
	get length() {
		throw new Error("This is no longer an Array");
	}

	/**
	 * @param {never} value Value
	 * @returns {never} throws
	 */
	set length(value) {
		throw new Error("This is no longer an Array");
	}
}

// TODO remove in webpack 5
StackedSetMap.prototype.push = util.deprecate(function(item) {
	this.add(item);
}, "This is no longer an Array: Use add instead.");

module.exports = StackedSetMap;
