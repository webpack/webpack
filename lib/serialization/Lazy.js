/*
	MIT License http://www.opensource.org/licenses/mit-license.php
*/

"use strict";

const memoize = require("../util/memoize");

const LAZY_TARGET = Symbol("lazy serialization target");
const LAZY_SERIALIZED_VALUE = Symbol("lazy serialized value");

/**
 * @typedef {((...args: EXPECTED_ANY[]) => EXPECTED_ANY) & { options?: EXPECTED_ANY }} LazyFunction
 */

/**
 * @param {EXPECTED_ANY | ((...args: EXPECTED_ANY[]) => EXPECTED_ANY)} value value
 * @param {EXPECTED_ANY} target target
 * @param {EXPECTED_OBJECT=} options options
 * @param {EXPECTED_ANY=} serializedValue serialized value
 * @returns {LazyFunction} lazy function
 */
const createLazy = (value, target, options, serializedValue) => {
	if (options === undefined) options = {};
	if (isLazy(value, target)) return value;
	const fn = typeof value === "function" ? value : () => value;
	const lazy = /** @type {EXPECTED_ANY} */ (fn);
	lazy[LAZY_TARGET] = target;
	lazy.options = options;
	lazy[LAZY_SERIALIZED_VALUE] = serializedValue;
	return fn;
};

/**
 * @param {EXPECTED_ANY} fn function
 * @param {EXPECTED_ANY=} target target
 * @returns {boolean} true, when lazy
 */
const isLazy = (fn, target) => {
	if (typeof fn !== "function") return false;
	const t = /** @type {EXPECTED_ANY} */ (fn)[LAZY_TARGET];
	return target ? t === target : Boolean(t);
};

/**
 * @param {EXPECTED_ANY} fn function
 * @returns {EXPECTED_ANY} options
 */
const getLazyOptions = (fn) =>
	typeof fn !== "function"
		? undefined
		: /** @type {LazyFunction} */ (fn).options;
/**
 * @param {EXPECTED_ANY} fn function
 * @returns {EXPECTED_ANY} serialized value
 */
const getLazySerializedValue = (fn) =>
	typeof fn !== "function"
		? undefined
		: /** @type {EXPECTED_ANY} */ (fn)[LAZY_SERIALIZED_VALUE];

/**
 * @param {LazyFunction} fn function
 * @param {EXPECTED_ANY} value value
 * @returns {void}
 */
const setLazySerializedValue = (fn, value) => {
	/** @type {EXPECTED_ANY} */ (fn)[LAZY_SERIALIZED_VALUE] = value;
};

/**
 * @param {LazyFunction} lazy lazy function
 * @param {(value: EXPECTED_ANY) => EXPECTED_ANY} serialize serialize
 * @returns {LazyFunction} serialized lazy function
 */
const serializeLazy = (lazy, serialize) => {
	const fn = memoize(() => {
		const r = lazy();
		if (r && typeof r.then === "function") {
			return r.then(
				/**
				 * @param {EXPECTED_ANY} data data
				 * @returns {EXPECTED_ANY} serialized data
				 */
				(data) => data && serialize(data)
			);
		}
		return serialize(r);
	});
	const typedFn = /** @type {EXPECTED_ANY} */ (fn);
	typedFn[LAZY_TARGET] = /** @type {EXPECTED_ANY} */ (lazy)[LAZY_TARGET];
	typedFn.options = lazy.options;
	/** @type {EXPECTED_ANY} */ (lazy)[LAZY_SERIALIZED_VALUE] = fn;
	return fn;
};

/**
 * @param {LazyFunction} lazy lazy function
 * @param {(value: EXPECTED_ANY) => EXPECTED_ANY} deserialize deserialize
 * @returns {LazyFunction} deserialized lazy function
 */
const deserializeLazy = (lazy, deserialize) => {
	const fn = memoize(() => {
		const r = lazy();
		if (r && typeof r.then === "function") {
			return r.then(
				/**
				 * @param {EXPECTED_ANY} data data
				 * @returns {EXPECTED_ANY} deserialized data
				 */
				(data) => deserialize(data)
			);
		}
		return deserialize(r);
	});
	const typedFn = /** @type {EXPECTED_ANY} */ (fn);
	typedFn[LAZY_TARGET] = /** @type {EXPECTED_ANY} */ (lazy)[LAZY_TARGET];
	typedFn.options = lazy.options;
	typedFn[LAZY_SERIALIZED_VALUE] = lazy;
	return fn;
};

/**
 * @param {EXPECTED_ANY} lazy lazy function
 * @returns {EXPECTED_ANY} unmemoized lazy function
 */
const unMemoizeLazy = (lazy) => {
	if (!isLazy(lazy)) return lazy;
	const fn = () => {
		throw new Error("A lazy value that has been unmemoized can't be called");
	};
	const typedFn = /** @type {EXPECTED_ANY} */ (fn);
	const typedLazy = /** @type {EXPECTED_ANY} */ (lazy);
	typedFn[LAZY_SERIALIZED_VALUE] = unMemoizeLazy(
		typedLazy[LAZY_SERIALIZED_VALUE]
	);
	typedFn[LAZY_TARGET] = typedLazy[LAZY_TARGET];
	typedFn.options = typedLazy.options;
	return fn;
};

module.exports = {
	LAZY_SERIALIZED_VALUE,
	LAZY_TARGET,
	createLazy,
	deserializeLazy,
	getLazyOptions,
	getLazySerializedValue,
	isLazy,
	serializeLazy,
	setLazySerializedValue,
	unMemoizeLazy
};
