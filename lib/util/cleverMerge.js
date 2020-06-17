/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

"use strict";

/** @type {WeakMap<object, WeakMap<object, object>>} */
const mergeCache = new WeakMap();
/** @type {WeakMap<object, Map<string, Map<string|number|boolean, object>>>} */
const setPropertyCache = new WeakMap();
const DELETE = Symbol("DELETE");

/**
 * @template T
 * @template O
 * Merges two given objects and caches the result to avoid computation if same objects passed as arguments again.
 * @example
 * // performs cleverMerge(first, second), stores the result in WeakMap and returns result
 * cachedCleverMerge({a: 1}, {a: 2})
 * {a: 2}
 *  // when same arguments passed, gets the result from WeakMap and returns it.
 * cachedCleverMerge({a: 1}, {a: 2})
 * {a: 2}
 * @param {T} first first object
 * @param {O} second second object
 * @returns {T & O} merged object of first and second object
 */
const cachedCleverMerge = (first, second) => {
	let innerCache = mergeCache.get(first);
	if (innerCache === undefined) {
		innerCache = new WeakMap();
		mergeCache.set(first, innerCache);
	}
	const prevMerge = innerCache.get(second);
	if (prevMerge !== undefined) return prevMerge;
	const newMerge = cleverMerge(first, second);
	innerCache.set(second, newMerge);
	return newMerge;
};

/**
 * @template T
 * @param {Partial<T>} obj object
 * @param {string} property property
 * @param {string|number|boolean} value assignment value
 * @returns {T} new object
 */
const cachedSetProperty = (obj, property, value) => {
	let mapByProperty = setPropertyCache.get(obj);

	if (mapByProperty === undefined) {
		mapByProperty = new Map();
		setPropertyCache.set(obj, mapByProperty);
	}

	let mapByValue = mapByProperty.get(property);

	if (mapByValue === undefined) {
		mapByValue = new Map();
		mapByProperty.set(property, mapByValue);
	}

	let result = mapByValue.get(value);

	if (result) return result;

	result = {
		...obj,
		[property]: value
	};
	mapByValue.set(value, result);

	return result;
};

/**
 * Merges two objects. Objects are deeply clever merged.
 * Arrays might reference the old value with "..."
 * @param {object} first first object
 * @param {object} second second object
 * @returns {object} merged object of first and second object
 */
const cleverMerge = (first, second) => {
	let newObject = { ...first };
	for (const key of Object.keys(second)) {
		if (!(key in newObject)) {
			newObject[key] = second[key];
			continue;
		}
		const secondValue = second[key];
		if (secondValue === DELETE) {
			const { [key]: _, ...newNewObject } = newObject;
			newObject = newNewObject;
			continue;
		}
		if (typeof secondValue !== "object" || secondValue === null) {
			newObject[key] = secondValue;
			continue;
		}
		if (Array.isArray(secondValue)) {
			const firstValue = newObject[key];
			if (Array.isArray(firstValue)) {
				const newArray = [];
				for (const item of secondValue) {
					if (item === "...") {
						for (const item of firstValue) {
							newArray.push(item);
						}
					} else {
						newArray.push(item);
					}
				}
				newObject[key] = newArray;
			} else {
				newObject[key] = secondValue;
			}
		} else {
			const firstValue = newObject[key];
			if (
				typeof firstValue === "object" &&
				firstValue !== null &&
				!Array.isArray(firstValue)
			) {
				newObject[key] = cleverMerge(firstValue, secondValue);
			} else {
				newObject[key] = secondValue;
			}
		}
	}
	return newObject;
};

exports.cachedSetProperty = cachedSetProperty;
exports.cachedCleverMerge = cachedCleverMerge;
exports.cleverMerge = cleverMerge;
exports.DELETE = DELETE;
