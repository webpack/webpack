/*
	MIT License http://www.opensource.org/licenses/mit-license.php
*/

"use strict";

/** @typedef {EXPECTED_FUNCTION} CacheAssoc */

/**
 * Defines the shared type used by this module.
 * @template T
 * @typedef {WeakMap<CacheAssoc, ObjectStructure<T>>}
 */
const cache = new WeakMap();

/**
 * Represents ObjectStructure.
 * @template T
 */
class ObjectStructure {
	constructor() {
		/** @type {undefined | keyof T[]} */
		this.keys = undefined;
		/** @type {undefined | Map<keyof T, ObjectStructure<T>>} */
		this.children = undefined;
	}

	/**
	 * Returns keys.
	 * @param {keyof T[]} keys keys
	 * @returns {keyof T[]} keys
	 */
	getKeys(keys) {
		if (this.keys === undefined) this.keys = keys;
		return this.keys;
	}

	/**
	 * Returns object structure.
	 * @param {keyof T} key key
	 * @returns {ObjectStructure<T>} object structure
	 */
	key(key) {
		if (this.children === undefined) this.children = new Map();
		const child = this.children.get(key);
		if (child !== undefined) return child;
		const newChild = new ObjectStructure();
		this.children.set(key, newChild);
		return newChild;
	}
}

/**
 * Returns keys.
 * @template T
 * @param {(keyof T)[]} keys keys
 * @param {CacheAssoc} cacheAssoc cache assoc fn
 * @returns {(keyof T)[]} keys
 */
const getCachedKeys = (keys, cacheAssoc) => {
	let root = cache.get(cacheAssoc);
	if (root === undefined) {
		root = new ObjectStructure();
		cache.set(cacheAssoc, root);
	}
	let current = root;
	for (const key of keys) {
		current = current.key(key);
	}
	return current.getKeys(keys);
};

class PlainObjectSerializer {
	/**
	 * Serializes this instance into the provided serializer context.
	 * @template {object} T
	 * @param {T} obj plain object
	 * @param {import("./ObjectMiddleware").ObjectSerializerContext<((keyof T)[] | keyof T | null | T[keyof T])[]>} context context
	 */
	serialize(obj, context) {
		const keys = /** @type {(keyof T)[]} */ (Object.keys(obj));
		if (keys.length > 128) {
			// Objects with so many keys are unlikely to share structure
			// with other objects
			context.write(keys);
			for (const key of keys) {
				context.write(obj[key]);
			}
		} else if (keys.length > 1) {
			context.write(getCachedKeys(keys, context.write));
			for (const key of keys) {
				context.write(obj[key]);
			}
		} else if (keys.length === 1) {
			const key = keys[0];
			context.write(key);
			context.write(obj[key]);
		} else {
			context.write(null);
		}
	}

	/**
	 * Restores this instance from the provided deserializer context.
	 * @template {object} T
	 * @param {import("./ObjectMiddleware").ObjectDeserializerContext<((keyof T)[] | keyof T | null | T[keyof T])[]>} context context
	 * @returns {T} plain object
	 */
	deserialize(context) {
		const keys = /** @type {(keyof T)[] | keyof T | null} */ (context.read());
		const obj = /** @type {T} */ ({});
		if (Array.isArray(keys)) {
			for (const key of keys) {
				obj[/** @type {keyof T} */ (key)] = /** @type {T[keyof T]} */ (
					context.read()
				);
			}
		} else if (keys !== null) {
			obj[/** @type {keyof T} */ (keys)] = /** @type {T[keyof T]} */ (
				context.read()
			);
		}
		return obj;
	}
}

module.exports = PlainObjectSerializer;
