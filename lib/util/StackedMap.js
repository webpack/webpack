/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

const TOMBSTONE = Symbol("tombstone");
const UNDEFINED_MARKER = Symbol("undefined");

/**
 * Public cell value exposed by `StackedMap`, where `undefined` is preserved as
 * a valid stored result.
 * @template T
 * @typedef {T | undefined} Cell<T>
 */

/**
 * Internal cell value used to distinguish deleted entries and explicit
 * `undefined` assignments while traversing stacked scopes.
 * @template T
 * @typedef {T | typeof TOMBSTONE | typeof UNDEFINED_MARKER} InternalCell<T>
 */

/**
 * Converts an internal key/value pair into the external representation returned
 * by iteration helpers.
 * @template K
 * @template V
 * @param {[K, InternalCell<V>]} pair the internal cell
 * @returns {[K, Cell<V>]} its “safe” representation
 */
const extractPair = (pair) => {
	const key = pair[0];
	const val = pair[1];
	if (val === UNDEFINED_MARKER || val === TOMBSTONE) {
		return [key, undefined];
	}
	return /** @type {[K, Cell<V>]} */ (pair);
};

/**
 * Layered map that supports child scopes while memoizing lookups from parent
 * scopes into the current layer. Layers form a linked parent chain, so
 * `createChild` is O(1) instead of copying a layer array per scope.
 * @template K
 * @template V
 */
class StackedMap {
	/**
	 * Creates a new map layer on top of an optional parent.
	 * @param {StackedMap<K, V>=} parent an optional parent map
	 */
	constructor(parent) {
		/** @type {Map<K, InternalCell<V>>} */
		this.map = new Map();
		/** @type {StackedMap<K, V> | undefined} */
		this.parent = parent;
	}

	/**
	 * Stores a value in the current layer, preserving explicit `undefined`
	 * values with an internal marker.
	 * @param {K} item the key of the element to add
	 * @param {V} value the value of the element to add
	 * @returns {void}
	 */
	set(item, value) {
		this.map.set(item, value === undefined ? UNDEFINED_MARKER : value);
	}

	/**
	 * Deletes a key from the current view, either by removing it outright in the
	 * root layer or by recording a tombstone in child layers.
	 * @param {K} item the item to delete
	 * @returns {void}
	 */
	delete(item) {
		if (this.parent !== undefined) {
			this.map.set(item, TOMBSTONE);
		} else {
			this.map.delete(item);
		}
	}

	/**
	 * Checks whether a key exists in the current scope chain, caching any parent
	 * lookup result in the current layer.
	 * @param {K} item the item to test
	 * @returns {boolean} true if the item exists in this set
	 */
	has(item) {
		const topValue = this.map.get(item);
		if (topValue !== undefined) {
			return topValue !== TOMBSTONE;
		}
		if (this.parent !== undefined) {
			/** @type {StackedMap<K, V> | undefined} */
			let current = this.parent;
			while (current !== undefined) {
				const value = current.map.get(item);
				if (value !== undefined) {
					this.map.set(item, value);
					return value !== TOMBSTONE;
				}
				current = current.parent;
			}
			this.map.set(item, TOMBSTONE);
		}
		return false;
	}

	/**
	 * Returns the visible value for a key, caching parent hits and misses in the
	 * current layer.
	 * @param {K} item the key of the element to return
	 * @returns {Cell<V>} the value of the element
	 */
	get(item) {
		const topValue = this.map.get(item);
		if (topValue !== undefined) {
			return topValue === TOMBSTONE || topValue === UNDEFINED_MARKER
				? undefined
				: topValue;
		}
		if (this.parent !== undefined) {
			/** @type {StackedMap<K, V> | undefined} */
			let current = this.parent;
			while (current !== undefined) {
				const value = current.map.get(item);
				if (value !== undefined) {
					this.map.set(item, value);
					return value === TOMBSTONE || value === UNDEFINED_MARKER
						? undefined
						: value;
				}
				current = current.parent;
			}
			this.map.set(item, TOMBSTONE);
		}
	}

	/**
	 * Collapses the parent chain into a single concrete map.
	 */
	_compress() {
		if (this.parent === undefined) return;
		/** @type {StackedMap<K, V>[]} */
		const layers = [];
		/** @type {StackedMap<K, V> | undefined} */
		let current = this;
		do {
			layers.push(current);
			current = current.parent;
		} while (current !== undefined);
		const map = new Map();
		for (let i = layers.length - 1; i >= 0; i--) {
			for (const pair of layers[i].map) {
				if (pair[1] === TOMBSTONE) {
					map.delete(pair[0]);
				} else {
					map.set(pair[0], pair[1]);
				}
			}
		}
		this.map = map;
		this.parent = undefined;
	}

	/**
	 * Returns the visible keys as an array after collapsing the stack.
	 * @returns {K[]} array of keys
	 */
	asArray() {
		this._compress();
		return [...this.map.keys()];
	}

	/**
	 * Returns the visible keys as a `Set` after collapsing the stack.
	 * @returns {Set<K>} set of keys
	 */
	asSet() {
		this._compress();
		return new Set(this.map.keys());
	}

	/**
	 * Returns visible key/value pairs using the external representation.
	 * @returns {[K, Cell<V>][]} array of key/value pairs
	 */
	asPairArray() {
		this._compress();
		return Array.from(this.map.entries(), extractPair);
	}

	/**
	 * Returns the visible contents as a plain `Map`.
	 * @returns {Map<K, Cell<V>>} materialized map
	 */
	asMap() {
		return new Map(this.asPairArray());
	}

	/**
	 * Returns the number of visible keys after collapsing the stack.
	 * @returns {number} number of keys
	 */
	get size() {
		this._compress();
		return this.map.size;
	}

	/**
	 * Creates a child `StackedMap` that sees the current layers as its parent
	 * scope.
	 * @returns {StackedMap<K, V>} child map
	 */
	createChild() {
		return new StackedMap(this);
	}
}

export default StackedMap;

export { StackedMap as "module.exports" };
