/*
	MIT License https://www.opensource.org/licenses/mit-license.php
	Author Alexander Akait @alexander-akait
*/

"use strict";

/** @import { ResolveOptionsWithDependencyType } from "./ResolverFactory" */

/**
 * A value inside resolve options: plain data, a regular expression, a function,
 * or an object, either plain or one keyed by identity, such as a plugin or `unsafeCache`.
 * @typedef {string | number | boolean | null | undefined | RegExp | ((...args: never[]) => void) | ResolveOptionsObject | ResolveOptionsArray} ResolveOptionsValue
 */

/** @typedef {ResolveOptionsValue[]} ResolveOptionsArray */

/**
 * An object inside resolve options, the replacer reads each property of.
 * @typedef {{ [key: string]: ResolveOptionsValue }} ResolveOptionsObject
 */

/** @type {WeakMap<WeakKey, number>} */
const identities = new WeakMap();
let nextIdentity = 0;

/**
 * Serializes resolve options into a cache key. Plain JSON values and regular expressions are keyed by content; functions, class instances and `unsafeCache` objects by identity, which holds only within this process.
 * @param {ResolveOptionsWithDependencyType} options resolve options
 * @returns {{ key: string, persistent: boolean }} the key, and whether it means the same in another process
 */
const getResolveOptionsKey = (options) => {
	let persistent = true;
	const key = JSON.stringify(
		options,
		/**
		 * @this {ResolveOptionsObject}
		 * @param {string} name property name
		 * @param {ResolveOptionsValue} value value, after any `toJSON()`
		 * @returns {ResolveOptionsValue | { regexp: string } | { identity: number }} value to serialize
		 */
		function replacer(name, value) {
			// `toJSON()` already ran, so a plugin could pass for plain data
			value = this[name];
			if (
				value === null ||
				(typeof value !== "object" && typeof value !== "function") ||
				Array.isArray(value)
			) {
				return value;
			}
			if (value instanceof RegExp) return { regexp: value.toString() };
			const prototype = Reflect.getPrototypeOf(value);
			if (
				name !== "unsafeCache" &&
				(prototype === Object.prototype || prototype === null)
			) {
				return value;
			}
			let identity = identities.get(value);
			if (identity === undefined) {
				identity = nextIdentity++;
				identities.set(value, identity);
			}
			persistent = false;
			return { identity };
		}
	);
	return { key, persistent };
};

module.exports = getResolveOptionsKey;
