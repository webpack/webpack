/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

"use strict";

const isWeakKey = thing => typeof thing === "object" && thing !== null;

class WeakTupleNode {
	constructor() {
		this.f = 0;
		/** @type {any} */
		this.v = undefined;
		/** @type {Map<object, WeakTupleNode> | undefined} */
		this.m = undefined;
		/** @type {WeakMap<object, WeakTupleNode> | undefined} */
		this.w = undefined;
	}

	getValue() {
		return this.v;
	}

	hasValue() {
		return (this.f & 1) === 1;
	}

	setValue(v) {
		this.f |= 1;
		this.v = v;
	}

	deleteValue() {
		this.f &= 6;
		this.v = undefined;
	}

	peek(thing) {
		if (isWeakKey(thing)) {
			if ((this.f & 4) !== 4) return undefined;
			return this.w.get(thing);
		} else {
			if ((this.f & 2) !== 2) return undefined;
			return this.m.get(thing);
		}
	}

	get(thing) {
		if (isWeakKey(thing)) {
			if ((this.f & 4) !== 4) {
				const newMap = new WeakMap();
				this.f |= 4;
				const newNode = new WeakTupleNode();
				(this.w = newMap).set(thing, newNode);
				return newNode;
			}
			const entry = this.w.get(thing);
			if (entry !== undefined) {
				return entry;
			}
			const newNode = new WeakTupleNode();
			this.w.set(thing, newNode);
			return newNode;
		} else {
			if ((this.f & 2) !== 2) {
				const newMap = new Map();
				this.f |= 2;
				const newNode = new WeakTupleNode();
				(this.m = newMap).set(thing, newNode);
				return newNode;
			}
			const entry = this.m.get(thing);
			if (entry !== undefined) {
				return entry;
			}
			const newNode = new WeakTupleNode();
			this.m.set(thing, newNode);
			return newNode;
		}
	}
}

/**
 * @template {any[]} T
 * @template V
 */
class WeakTupleMap {
	constructor() {
		this._node = new WeakTupleNode();
	}

	/**
	 * @param {[...T, V]} args tuple
	 * @returns {void}
	 */
	set(...args) {
		let node = this._node;
		for (let i = 0; i < args.length - 1; i++) {
			node = node.get(args[i]);
		}
		node.setValue(args[args.length - 1]);
	}

	/**
	 * @param {T} args tuple
	 * @returns {boolean} true, if the tuple is in the Set
	 */
	has(...args) {
		let node = this._node;
		for (let i = 0; i < args.length; i++) {
			node = node.peek(args[i]);
			if (node === undefined) return false;
		}
		return node.hasValue();
	}

	/**
	 * @param {T} args tuple
	 * @returns {V} the value
	 */
	get(...args) {
		let node = this._node;
		for (let i = 0; i < args.length; i++) {
			node = node.peek(args[i]);
			if (node === undefined) return undefined;
		}
		return node.getValue();
	}

	/**
	 * @param {[...T, function(): V]} args tuple
	 * @returns {V} the value
	 */
	provide(...args) {
		let node = this._node;
		for (let i = 0; i < args.length - 1; i++) {
			node = node.get(args[i]);
		}
		if (node.hasValue()) return node.getValue();
		const fn = args[args.length - 1];
		const newValue = fn(...args.slice(0, -1));
		node.setValue(newValue);
		return newValue;
	}

	/**
	 * @param {T} args tuple
	 * @returns {void}
	 */
	delete(...args) {
		let node = this._node;
		for (let i = 0; i < args.length; i++) {
			node = node.peek(args[i]);
			if (node === undefined) return;
		}
		node.deleteValue();
	}

	/**
	 * @returns {void}
	 */
	clear() {
		this._node = new WeakTupleNode();
	}
}

module.exports = WeakTupleMap;
