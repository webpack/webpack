/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

"use strict";

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
 * scopes. Layers form a linked parent chain, so `createChild` is O(1) instead
 * of copying a layer array per scope. A layer's `Map` is only allocated on its
 * first own write, and lookup results are memoized into the nearest
 * `Map`-bearing layer of the walk — read-only layers (most block scopes) stay
 * allocation-free and share their parent's memoized entries.
 * @template K
 * @template V
 */
class StackedMap {
	/**
	 * Creates a new map layer on top of an optional parent.
	 * @param {StackedMap<K, V>=} parent an optional parent map
	 */
	constructor(parent) {
		/** @type {Map<K, InternalCell<V>> | undefined} */
		this.map = undefined;
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
		(this.map || (this.map = new Map())).set(
			item,
			value === undefined ? UNDEFINED_MARKER : value
		);
	}

	/**
	 * Deletes a key from the current view, either by removing it outright in the
	 * root layer or by recording a tombstone in child layers.
	 * @param {K} item the item to delete
	 * @returns {void}
	 */
	delete(item) {
		if (this.parent !== undefined) {
			(this.map || (this.map = new Map())).set(item, TOMBSTONE);
		} else if (this.map !== undefined) {
			this.map.delete(item);
		}
	}

	/**
	 * Checks whether a key exists in the current scope chain, caching any parent
	 * lookup result in the nearest `Map`-bearing layer.
	 * @param {K} item the item to test
	 * @returns {boolean} true if the item exists in this set
	 */
	has(item) {
		const own = this.map;
		if (own !== undefined) {
			const topValue = own.get(item);
			if (topValue !== undefined) {
				return topValue !== TOMBSTONE;
			}
		}
		/** @type {StackedMap<K, V> | undefined} */
		let memoTarget = own !== undefined ? this : undefined;
		/** @type {StackedMap<K, V> | undefined} */
		let current = this.parent;
		while (current !== undefined) {
			const map = current.map;
			if (map !== undefined) {
				const value = map.get(item);
				if (value !== undefined) {
					if (memoTarget !== undefined) {
						/** @type {Map<K, InternalCell<V>>} */ (memoTarget.map).set(
							item,
							value
						);
					}
					return value !== TOMBSTONE;
				}
				if (memoTarget === undefined) memoTarget = current;
			}
			current = current.parent;
		}
		if (memoTarget !== undefined) {
			/** @type {Map<K, InternalCell<V>>} */ (memoTarget.map).set(
				item,
				TOMBSTONE
			);
		}
		return false;
	}

	/**
	 * Returns the visible value for a key, caching parent hits and misses in the
	 * nearest `Map`-bearing layer so repeated lookups (from this layer or any
	 * sibling below that layer) answer with a single probe.
	 * @param {K} item the key of the element to return
	 * @returns {Cell<V>} the value of the element
	 */
	get(item) {
		const own = this.map;
		if (own !== undefined) {
			const topValue = own.get(item);
			if (topValue !== undefined) {
				return topValue === TOMBSTONE || topValue === UNDEFINED_MARKER
					? undefined
					: topValue;
			}
		}
		/** @type {StackedMap<K, V> | undefined} */
		let memoTarget = own !== undefined ? this : undefined;
		/** @type {StackedMap<K, V> | undefined} */
		let current = this.parent;
		while (current !== undefined) {
			const map = current.map;
			if (map !== undefined) {
				const value = map.get(item);
				if (value !== undefined) {
					if (memoTarget !== undefined) {
						/** @type {Map<K, InternalCell<V>>} */ (memoTarget.map).set(
							item,
							value
						);
					}
					return value === TOMBSTONE || value === UNDEFINED_MARKER
						? undefined
						: value;
				}
				if (memoTarget === undefined) memoTarget = current;
			}
			current = current.parent;
		}
		if (memoTarget !== undefined) {
			/** @type {Map<K, InternalCell<V>>} */ (memoTarget.map).set(
				item,
				TOMBSTONE
			);
		}
	}

	/**
	 * Collapses the parent chain into a single concrete map.
	 */
	_compress() {
		if (this.parent === undefined) {
			const map = this.map;
			if (map === undefined) {
				this.map = new Map();
				return;
			}
			// a parent-less layer holds tombstones only as memoized misses
			// (deletes remove outright) — drop them from the visible view
			for (const pair of map) {
				if (pair[1] === TOMBSTONE) map.delete(pair[0]);
			}
			return;
		}
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
			const layerMap = layers[i].map;
			if (layerMap !== undefined) {
				for (const pair of layerMap) {
					if (pair[1] === TOMBSTONE) {
						map.delete(pair[0]);
					} else {
						map.set(pair[0], pair[1]);
					}
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
		return [.../** @type {Map<K, InternalCell<V>>} */ (this.map).keys()];
	}

	/**
	 * Returns the visible keys as a `Set` after collapsing the stack.
	 * @returns {Set<K>} set of keys
	 */
	asSet() {
		this._compress();
		return new Set(/** @type {Map<K, InternalCell<V>>} */ (this.map).keys());
	}

	/**
	 * Returns visible key/value pairs using the external representation.
	 * @returns {[K, Cell<V>][]} array of key/value pairs
	 */
	asPairArray() {
		this._compress();
		return Array.from(
			/** @type {Map<K, InternalCell<V>>} */ (this.map).entries(),
			extractPair
		);
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
		return /** @type {Map<K, InternalCell<V>>} */ (this.map).size;
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

module.exports = StackedMap;
