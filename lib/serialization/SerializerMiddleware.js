/*
	MIT License http://www.opensource.org/licenses/mit-license.php
*/

"use strict";

const memoize = require("../util/memoize");

const LAZY_TARGET = Symbol("lazy serialization target");
const LAZY_SERIALIZED_VALUE = Symbol("lazy serialization data");

/** @typedef {TODO} Context */

/**
 * @template LazyResult
 * @typedef {() => LazyResult | Promise<LazyResult>} InternalLazyFunction
 */

/** @typedef {Record<string, any>} LazyOptions */

/**
 * @template LazyResult
 * @typedef {InternalLazyFunction<LazyResult> & { [LAZY_TARGET]: TODO, [LAZY_SERIALIZED_VALUE]?: TODO, options: LazyOptions }} LazyFunction
 */

/**
 * @template DeserializedType
 * @template SerializedType
 */
class SerializerMiddleware {
	/* istanbul ignore next */
	/**
	 * @abstract
	 * @param {DeserializedType} data data
	 * @param {Context} context context object
	 * @returns {SerializedType | Promise<SerializedType> | null} serialized data
	 */
	serialize(data, context) {
		const AbstractMethodError = require("../AbstractMethodError");
		throw new AbstractMethodError();
	}

	/* istanbul ignore next */
	/**
	 * @abstract
	 * @param {SerializedType} data data
	 * @param {Context} context context object
	 * @returns {DeserializedType | Promise<DeserializedType>} deserialized data
	 */
	deserialize(data, context) {
		const AbstractMethodError = require("../AbstractMethodError");
		throw new AbstractMethodError();
	}

	/**
	 * @template LazyResult
	 * @param {LazyFunction<LazyResult> | EXPECTED_ANY} value contained value or function to value
	 * @param {SerializerMiddleware<any, any>} target target middleware
	 * @param {LazyOptions=} options lazy options
	 * @param {any=} serializedValue serialized value
	 * @returns {LazyFunction<LazyResult>} lazy function
	 */
	static createLazy(value, target, options = {}, serializedValue = undefined) {
		if (SerializerMiddleware.isLazy(value, target)) return value;
		const fn =
			/** @type {LazyFunction<LazyResult>} */
			(typeof value === "function" ? value : () => value);
		fn[LAZY_TARGET] = target;
		fn.options = options;
		fn[LAZY_SERIALIZED_VALUE] = serializedValue;
		return fn;
	}

	/**
	 * @param {EXPECTED_ANY} fn lazy function
	 * @param {SerializerMiddleware<any, any>=} target target middleware
	 * @returns {boolean} true, when fn is a lazy function (optionally of that target)
	 */
	static isLazy(fn, target) {
		if (typeof fn !== "function") return false;
		const t = fn[LAZY_TARGET];
		return target ? t === target : Boolean(t);
	}

	/**
	 * @template LazyResult
	 * @param {LazyFunction<LazyResult>} fn lazy function
	 * @returns {LazyOptions | undefined} options
	 */
	static getLazyOptions(fn) {
		if (typeof fn !== "function") return;
		return /** @type {any} */ (fn).options;
	}

	/**
	 * @template LazyResult
	 * @param {LazyFunction<LazyResult> | EXPECTED_ANY} fn lazy function
	 * @returns {any | undefined} serialized value
	 */
	static getLazySerializedValue(fn) {
		if (typeof fn !== "function") return;
		return fn[LAZY_SERIALIZED_VALUE];
	}

	/**
	 * @template LazyResult
	 * @param {LazyFunction<LazyResult>} fn lazy function
	 * @param {TODO} value serialized value
	 * @returns {void}
	 */
	static setLazySerializedValue(fn, value) {
		fn[LAZY_SERIALIZED_VALUE] = value;
	}

	/**
	 * @template LazyResult, R
	 * @param {LazyFunction<LazyResult>} lazy lazy function
	 * @param {(lazyResult: LazyResult) => Promise<R> | R} serialize serialize function
	 * @returns {LazyFunction<R>} new lazy
	 */
	static serializeLazy(lazy, serialize) {
		const fn = /** @type {LazyFunction<R>} */ (
			memoize(() => {
				const r = lazy();
				if (
					r &&
					typeof (/** @type {Promise<LazyResult>} */ (r).then) === "function"
				) {
					return (
						/** @type {Promise<LazyResult>} */
						(r).then(data => data && serialize(data))
					);
				}
				return serialize(/** @type {LazyResult} */ (r));
			})
		);
		fn[LAZY_TARGET] = lazy[LAZY_TARGET];
		fn.options = lazy.options;
		lazy[LAZY_SERIALIZED_VALUE] = fn;
		return fn;
	}

	/**
	 * @template LazyResult, R
	 * @param {LazyFunction<LazyResult>} lazy lazy function
	 * @param {(lazyResult: LazyResult) => Promise<R> | R} deserialize deserialize function
	 * @returns {LazyFunction<R>} new lazy
	 */
	static deserializeLazy(lazy, deserialize) {
		const fn = /** @type {LazyFunction<R>} */ (
			memoize(() => {
				const r = lazy();
				if (
					r &&
					typeof (/** @type {Promise<LazyResult>} */ (r).then) === "function"
				) {
					return (
						/** @type {Promise<LazyResult>} */
						(r).then(data => deserialize(data))
					);
				}
				return deserialize(/** @type {LazyResult} */ (r));
			})
		);
		fn[LAZY_TARGET] = lazy[LAZY_TARGET];
		fn.options = lazy.options;
		fn[LAZY_SERIALIZED_VALUE] = lazy;
		return fn;
	}

	/**
	 * @template LazyResult
	 * @param {LazyFunction<LazyResult> | EXPECTED_ANY} lazy lazy function
	 * @returns {LazyFunction<LazyResult> | EXPECTED_ANY} new lazy
	 */
	static unMemoizeLazy(lazy) {
		if (!SerializerMiddleware.isLazy(lazy)) return lazy;
		/** @type {LazyFunction<LazyResult>} */
		const fn = () => {
			throw new Error(
				"A lazy value that has been unmemorized can't be called again"
			);
		};
		fn[LAZY_SERIALIZED_VALUE] = SerializerMiddleware.unMemoizeLazy(
			lazy[LAZY_SERIALIZED_VALUE]
		);
		fn[LAZY_TARGET] = lazy[LAZY_TARGET];
		fn.options = lazy.options;
		return fn;
	}
}

module.exports = SerializerMiddleware;
