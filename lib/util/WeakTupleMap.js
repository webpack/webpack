/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

"use strict";

/**
 * @template {EXPECTED_ANY[]} T
 * @template V
 * @typedef {Map<EXPECTED_ANY, WeakTupleMap<T, V>>} M
 */

/**
 * @template {EXPECTED_ANY[]} T
 * @template V
 * @typedef {WeakMap<EXPECTED_OBJECT, WeakTupleMap<T, V>>} W
 */

/**
 * @param {EXPECTED_ANY} thing thing
 * @returns {boolean} true if is weak
 */
const isWeakKey = thing => typeof thing === "object" && thing !== null;

/**
 * @template {unknown[]} T
 * @typedef {T extends readonly (infer ElementType)[] ? ElementType : never} ArrayElement
 */

/**
 * @template {EXPECTED_ANY[]} K
 * @template V
 */
class WeakTupleMap {
	constructor() {
		/** @private */
		this.f = 0;
		/**
		 * @private
		 * @type {V | undefined}
		 */
		this.v = undefined;
		/**
		 * @private
		 * @type {M<K, V> | undefined}
		 */
		this.m = undefined;
		/**
		 * @private
		 * @type {W<K, V> | undefined}
		 */
		this.w = undefined;
	}

	/**
	 * @param {[...K, V]} args tuple
	 * @returns {void}
	 */
	set(...args) {
		/** @type {WeakTupleMap<K, V>} */
		let node = this;
		for (let i = 0; i < args.length - 1; i++) {
			node = node._get(/** @type {ArrayElement<K>} */ (args[i]));
		}
		node._setValue(/** @type {V} */ (args[args.length - 1]));
	}

	/**
	 * @param {K} args tuple
	 * @returns {boolean} true, if the tuple is in the Set
	 */
	has(...args) {
		/** @type {WeakTupleMap<K, V> | undefined} */
		let node = this;
		for (let i = 0; i < args.length; i++) {
			node = node._peek(/** @type {ArrayElement<K>} */ (args[i]));
			if (node === undefined) return false;
		}
		return node._hasValue();
	}

	/**
	 * @param {K} args tuple
	 * @returns {V | undefined} the value
	 */
	get(...args) {
		/** @type {WeakTupleMap<K, V> | undefined} */
		let node = this;
		for (let i = 0; i < args.length; i++) {
			node = node._peek(/** @type {ArrayElement<K>} */ (args[i]));
			if (node === undefined) return;
		}
		return node._getValue();
	}

	/**
	 * @param {[...K, (...args: K) => V]} args tuple
	 * @returns {V} the value
	 */
	provide(...args) {
		/** @type {WeakTupleMap<K, V>} */
		let node = this;
		for (let i = 0; i < args.length - 1; i++) {
			node = node._get(/** @type {ArrayElement<K>} */ (args[i]));
		}
		if (node._hasValue()) return /** @type {V} */ (node._getValue());
		const fn = /** @type {(...args: K) => V} */ (args[args.length - 1]);
		const newValue = fn(.../** @type {K} */ (args.slice(0, -1)));
		node._setValue(newValue);
		return newValue;
	}

	/**
	 * @param {K} args tuple
	 * @returns {void}
	 */
	delete(...args) {
		/** @type {WeakTupleMap<K, V> | undefined} */
		let node = this;
		for (let i = 0; i < args.length; i++) {
			node = node._peek(/** @type {ArrayElement<K>} */ (args[i]));
			if (node === undefined) return;
		}
		node._deleteValue();
	}

	/**
	 * @returns {void}
	 */
	clear() {
		this.f = 0;
		this.v = undefined;
		this.w = undefined;
		this.m = undefined;
	}

	_getValue() {
		return this.v;
	}

	_hasValue() {
		return (this.f & 1) === 1;
	}

	/**
	 * @param {V} v value
	 * @private
	 */
	_setValue(v) {
		this.f |= 1;
		this.v = v;
	}

	_deleteValue() {
		this.f &= 6;
		this.v = undefined;
	}

	/**
	 * @param {ArrayElement<K>} thing thing
	 * @returns {WeakTupleMap<K, V> | undefined} thing
	 * @private
	 */
	_peek(thing) {
		if (isWeakKey(thing)) {
			if ((this.f & 4) !== 4) return;
			return /** @type {WeakMap<ArrayElement<K>, WeakTupleMap<K, V>>} */ (
				this.w
			).get(thing);
		}
		if ((this.f & 2) !== 2) return;
		return /** @type {Map<ArrayElement<K>, WeakTupleMap<K, V>>} */ (this.m).get(
			thing
		);
	}

	/**
	 * @private
	 * @param {ArrayElement<K>} thing thing
	 * @returns {WeakTupleMap<K, V>} value
	 */
	_get(thing) {
		if (isWeakKey(thing)) {
			if ((this.f & 4) !== 4) {
				/** @type {W<K, V>} */
				const newMap = new WeakMap();
				this.f |= 4;
				/** @type {WeakTupleMap<K, V>} */
				const newNode = new WeakTupleMap();
				(this.w = newMap).set(thing, newNode);
				return newNode;
			}
			const entry = /** @type {W<K, V>} */ (this.w).get(thing);
			if (entry !== undefined) {
				return entry;
			}
			/** @type {WeakTupleMap<K, V>} */
			const newNode = new WeakTupleMap();
			/** @type {W<K, V>} */
			(this.w).set(thing, newNode);
			return newNode;
		}
		if ((this.f & 2) !== 2) {
			/** @type {M<K, V>} */
			const newMap = new Map();
			this.f |= 2;
			/** @type {WeakTupleMap<K, V>} */
			const newNode = new WeakTupleMap();
			(this.m = newMap).set(thing, newNode);
			return newNode;
		}
		const entry =
			/** @type {M<K, V>} */
			(this.m).get(thing);
		if (entry !== undefined) {
			return entry;
		}
		/** @type {WeakTupleMap<K, V>} */
		const newNode = new WeakTupleMap();
		/** @type {M<K, V>} */
		(this.m).set(thing, newNode);
		return newNode;
	}
}

module.exports = WeakTupleMap;
