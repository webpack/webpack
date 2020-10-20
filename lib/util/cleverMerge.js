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
 * Merges two given objects and caches the result to avoid computation if same objects passed as arguments again.
 * @template T
 * @template O
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
	const newMerge = cleverMerge(first, second, true);
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
 * @typedef {Object} ObjectParsedPropertyEntry
 * @property {any | undefined} base base value
 * @property {string | undefined} byProperty the name of the selector property
 * @property {Map<string, any>} byValues value depending on selector property, merged with base
 */

/** @type {WeakMap<object, Map<string, ObjectParsedPropertyEntry>>} */
const parseCache = new WeakMap();

/**
 * @param {object} obj the object
 * @returns {Map<string, ObjectParsedPropertyEntry>} parsed properties
 */
const cachedParseObject = obj => {
	const entry = parseCache.get(obj);
	if (entry !== undefined) return entry;
	const result = parseObject(obj);
	parseCache.set(obj, result);
	return result;
};

/**
 * @param {object} obj the object
 * @returns {Map<string, ObjectParsedPropertyEntry>} parsed properties
 */
const parseObject = obj => {
	const info = new Map();
	const getInfo = p => {
		const entry = info.get(p);
		if (entry !== undefined) return entry;
		const newEntry = {
			base: undefined,
			byProperty: undefined,
			byValues: undefined
		};
		info.set(p, newEntry);
		return newEntry;
	};
	for (const key of Object.keys(obj)) {
		if (key.startsWith("by")) {
			const byProperty = key;
			const byObj = obj[byProperty];
			for (const byValue of Object.keys(byObj)) {
				const obj = byObj[byValue];
				for (const key of Object.keys(obj)) {
					const entry = getInfo(key);
					if (entry.byProperty === undefined) {
						entry.byProperty = byProperty;
						entry.byValues = new Map();
					} else if (entry.byProperty !== byProperty) {
						throw new Error(
							`${byProperty} and ${entry.byProperty} for a single property is not supported`
						);
					}
					entry.byValues.set(byValue, obj[key]);
					if (byValue === "default") {
						for (const otherByValue of Object.keys(byObj)) {
							if (!entry.byValues.has(otherByValue))
								entry.byValues.set(otherByValue, undefined);
						}
					}
				}
			}
		} else {
			const entry = getInfo(key);
			entry.base = obj[key];
		}
	}
	return info;
};

/**
 * @param {Map<string, ObjectParsedPropertyEntry>} info property entries
 * @returns {object} the object
 */
const serializeObject = info => {
	const obj = {};
	// Setup byProperty structure
	for (const entry of info.values()) {
		if (entry.byProperty !== undefined) {
			const byObj = (obj[entry.byProperty] = obj[entry.byProperty] || {});
			for (const byValue of entry.byValues.keys()) {
				byObj[byValue] = byObj[byValue] || {};
			}
		}
	}
	for (const [key, entry] of info) {
		if (entry.base !== undefined) {
			obj[key] = entry.base;
		}
		// Fill byProperty structure
		if (entry.byProperty !== undefined) {
			const byObj = (obj[entry.byProperty] = obj[entry.byProperty] || {});
			for (const byValue of Object.keys(byObj)) {
				const value = getFromByValues(entry.byValues, byValue);
				if (value !== undefined) byObj[byValue][key] = value;
			}
		}
	}
	return obj;
};

const VALUE_TYPE_UNDEFINED = 0;
const VALUE_TYPE_ATOM = 1;
const VALUE_TYPE_ARRAY_EXTEND = 2;
const VALUE_TYPE_OBJECT = 3;
const VALUE_TYPE_DELETE = 4;

/**
 * @param {any} value a single value
 * @returns {VALUE_TYPE_UNDEFINED | VALUE_TYPE_ATOM | VALUE_TYPE_ARRAY_EXTEND | VALUE_TYPE_OBJECT | VALUE_TYPE_DELETE} value type
 */
const getValueType = value => {
	if (value === undefined) {
		return VALUE_TYPE_UNDEFINED;
	} else if (value === DELETE) {
		return VALUE_TYPE_DELETE;
	} else if (Array.isArray(value)) {
		if (value.lastIndexOf("...") !== -1) return VALUE_TYPE_ARRAY_EXTEND;
		return VALUE_TYPE_ATOM;
	} else if (
		typeof value === "object" &&
		value !== null &&
		(!value.constructor || value.constructor === Object)
	) {
		return VALUE_TYPE_OBJECT;
	}
	return VALUE_TYPE_ATOM;
};

/**
 * Merges two objects. Objects are deeply clever merged.
 * Arrays might reference the old value with "..."
 * @param {object} first first object
 * @param {object} second second object
 * @param {boolean} internalCaching should parsing of objects and nested merges be cached
 * @returns {object} merged object of first and second object
 */
const cleverMerge = (first, second, internalCaching = false) => {
	if (second === undefined) return first;
	if (first === undefined) return second;
	const firstInfo = internalCaching
		? cachedParseObject(first)
		: parseObject(first);
	const secondInfo = internalCaching
		? cachedParseObject(second)
		: parseObject(second);
	/** @type {Map<string, ObjectParsedPropertyEntry>} */
	const result = new Map();
	for (const [key, firstEntry] of firstInfo) {
		const secondEntry = secondInfo.get(key);
		const entry =
			secondEntry !== undefined
				? mergeEntries(firstEntry, secondEntry, internalCaching)
				: firstEntry;
		result.set(key, entry);
	}
	for (const [key, secondEntry] of secondInfo) {
		if (!firstInfo.has(key)) {
			result.set(key, secondEntry);
		}
	}
	return serializeObject(result);
};

/**
 * @param {ObjectParsedPropertyEntry} firstEntry a
 * @param {ObjectParsedPropertyEntry} secondEntry b
 * @param {boolean} internalCaching should parsing of objects and nested merges be cached
 * @returns {ObjectParsedPropertyEntry} new entry
 */
const mergeEntries = (firstEntry, secondEntry, internalCaching) => {
	switch (getValueType(secondEntry.base)) {
		case VALUE_TYPE_ATOM:
		case VALUE_TYPE_DELETE:
			// No need to consider firstEntry at all
			// second value override everything
			// = second.base + second.byProperty
			return secondEntry;
		case VALUE_TYPE_UNDEFINED:
			if (!firstEntry.byProperty) {
				// = first.base + second.byProperty
				return {
					base: firstEntry.base,
					byProperty: secondEntry.byProperty,
					byValues: secondEntry.byValues
				};
			} else if (firstEntry.byProperty !== secondEntry.byProperty) {
				throw new Error(
					`${firstEntry.byProperty} and ${secondEntry.byProperty} for a single property is not supported`
				);
			} else {
				// = first.base + (first.byProperty + second.byProperty)
				// need to merge first and second byValues
				const newByValues = new Map(firstEntry.byValues);
				for (const [key, value] of secondEntry.byValues) {
					const firstValue = getFromByValues(firstEntry.byValues, key);
					newByValues.set(
						key,
						mergeSingleValue(firstValue, value, internalCaching)
					);
				}
				return {
					base: firstEntry.base,
					byProperty: firstEntry.byProperty,
					byValues: newByValues
				};
			}
		default: {
			if (!firstEntry.byProperty) {
				// The simple case
				// = (first.base + second.base) + second.byProperty
				return {
					base: mergeSingleValue(
						firstEntry.base,
						secondEntry.base,
						internalCaching
					),
					byProperty: secondEntry.byProperty,
					byValues: secondEntry.byValues
				};
			}
			let newBase;
			const intermediateByValues = new Map(firstEntry.byValues);
			for (const [key, value] of intermediateByValues) {
				intermediateByValues.set(
					key,
					mergeSingleValue(value, secondEntry.base, internalCaching)
				);
			}
			if (
				Array.from(firstEntry.byValues.values()).every(value => {
					const type = getValueType(value);
					return type === VALUE_TYPE_ATOM || type === VALUE_TYPE_DELETE;
				})
			) {
				// = (first.base + second.base) + ((first.byProperty + second.base) + second.byProperty)
				newBase = mergeSingleValue(
					firstEntry.base,
					secondEntry.base,
					internalCaching
				);
			} else {
				// = first.base + ((first.byProperty (+default) + second.base) + second.byProperty)
				newBase = firstEntry.base;
				if (!intermediateByValues.has("default"))
					intermediateByValues.set("default", secondEntry.base);
			}
			if (!secondEntry.byProperty) {
				// = first.base + (first.byProperty + second.base)
				return {
					base: newBase,
					byProperty: firstEntry.byProperty,
					byValues: intermediateByValues
				};
			} else if (firstEntry.byProperty !== secondEntry.byProperty) {
				throw new Error(
					`${firstEntry.byProperty} and ${secondEntry.byProperty} for a single property is not supported`
				);
			}
			const newByValues = new Map(intermediateByValues);
			for (const [key, value] of secondEntry.byValues) {
				const firstValue = getFromByValues(intermediateByValues, key);
				newByValues.set(
					key,
					mergeSingleValue(firstValue, value, internalCaching)
				);
			}
			return {
				base: newBase,
				byProperty: firstEntry.byProperty,
				byValues: newByValues
			};
		}
	}
};

/**
 * @param {Map<string, any>} byValues all values
 * @param {string} key value of the selector
 * @returns {any | undefined} value
 */
const getFromByValues = (byValues, key) => {
	if (key !== "default" && byValues.has(key)) {
		return byValues.get(key);
	}
	return byValues.get("default");
};

/**
 * @param {any} a value
 * @param {any} b value
 * @param {boolean} internalCaching should parsing of objects and nested merges be cached
 * @returns {any} value
 */
const mergeSingleValue = (a, b, internalCaching) => {
	const bType = getValueType(b);
	const aType = getValueType(a);
	switch (bType) {
		case VALUE_TYPE_DELETE:
		case VALUE_TYPE_ATOM:
			return b;
		case VALUE_TYPE_OBJECT: {
			return aType !== VALUE_TYPE_OBJECT
				? b
				: internalCaching
				? cachedCleverMerge(a, b)
				: cleverMerge(a, b);
		}
		case VALUE_TYPE_UNDEFINED:
			return a;
		case VALUE_TYPE_ARRAY_EXTEND:
			switch (
				aType !== VALUE_TYPE_ATOM
					? aType
					: Array.isArray(a)
					? VALUE_TYPE_ARRAY_EXTEND
					: VALUE_TYPE_OBJECT
			) {
				case VALUE_TYPE_UNDEFINED:
					return b;
				case VALUE_TYPE_DELETE:
					return b.filter(item => item !== "...");
				case VALUE_TYPE_ARRAY_EXTEND: {
					const newArray = [];
					for (const item of b) {
						if (item === "...") {
							for (const item of a) {
								newArray.push(item);
							}
						} else {
							newArray.push(item);
						}
					}
					return newArray;
				}
				case VALUE_TYPE_OBJECT:
					return b.map(item => (item === "..." ? a : item));
				default:
					throw new Error("Not implemented");
			}
		default:
			throw new Error("Not implemented");
	}
};

/**
 * @param {any} obj the object
 * @returns {any} the object without operations like "..." or DELETE
 */
const removeOperations = obj => {
	const newObj = {};
	for (const key of Object.keys(obj)) {
		const value = obj[key];
		const type = getValueType(value);
		switch (type) {
			case VALUE_TYPE_UNDEFINED:
			case VALUE_TYPE_DELETE:
				break;
			case VALUE_TYPE_OBJECT:
				newObj[key] = removeOperations(value);
				break;
			case VALUE_TYPE_ARRAY_EXTEND:
				newObj[key] = value.filter(i => i !== "...");
				break;
			default:
				newObj[key] = value;
				break;
		}
	}
	return newObj;
};

exports.cachedSetProperty = cachedSetProperty;
exports.cachedCleverMerge = cachedCleverMerge;
exports.cleverMerge = cleverMerge;
exports.removeOperations = removeOperations;
exports.DELETE = DELETE;
