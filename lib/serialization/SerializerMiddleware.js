/*
	MIT License http://www.opensource.org/licenses/mit-license.php
*/

"use strict";

const memorize = require("../util/memorize");

const LAZY_TARGET = Symbol("lazy serialization target");
const LAZY_SERIALIZED_VALUE = Symbol("lazy serialization data");

/**
 * @template DeserializedType
 * @template SerializedType
 */
class SerializerMiddleware {
	/* istanbul ignore next */
	/**
	 * @abstract
	 * @param {DeserializedType} data data
	 * @param {Object} context context object
	 * @returns {SerializedType|Promise<SerializedType>} serialized data
	 */
	serialize(data, context) {
		const AbstractMethodError = require("../AbstractMethodError");
		throw new AbstractMethodError();
	}

	/* istanbul ignore next */
	/**
	 * @abstract
	 * @param {SerializedType} data data
	 * @param {Object} context context object
	 * @returns {DeserializedType|Promise<DeserializedType>} deserialized data
	 */
	deserialize(data, context) {
		const AbstractMethodError = require("../AbstractMethodError");
		throw new AbstractMethodError();
	}

	/**
	 * @param {any | function(): Promise<any> | any} value contained value or function to value
	 * @param {SerializerMiddleware<any, any>} target target middleware
	 * @param {object=} options lazy options
	 * @param {any=} serializedValue serialized value
	 * @returns {function(): Promise<any> | any} lazy function
	 */
	static createLazy(value, target, options = {}, serializedValue) {
		if (SerializerMiddleware.isLazy(value, target)) return value;
		const fn = typeof value === "function" ? value : () => value;
		fn[LAZY_TARGET] = target;
		/** @type {any} */ (fn).options = options;
		fn[LAZY_SERIALIZED_VALUE] = serializedValue;
		return fn;
	}

	/**
	 * @param {function(): Promise<any> | any} fn lazy function
	 * @param {SerializerMiddleware<any, any>=} target target middleware
	 * @returns {boolean} true, when fn is a lazy function (optionally of that target)
	 */
	static isLazy(fn, target) {
		if (typeof fn !== "function") return false;
		const t = fn[LAZY_TARGET];
		return target ? t === target : !!t;
	}

	/**
	 * @param {function(): Promise<any> | any} fn lazy function
	 * @returns {object} options
	 */
	static getLazyOptions(fn) {
		if (typeof fn !== "function") return undefined;
		return /** @type {any} */ (fn).options;
	}

	/**
	 * @param {function(): Promise<any> | any} fn lazy function
	 * @returns {any} serialized value
	 */
	static getLazySerializedValue(fn) {
		if (typeof fn !== "function") return undefined;
		return fn[LAZY_SERIALIZED_VALUE];
	}

	/**
	 * @param {function(): Promise<any> | any} fn lazy function
	 * @param {any} value serialized value
	 * @returns {void}
	 */
	static setLazySerializedValue(fn, value) {
		fn[LAZY_SERIALIZED_VALUE] = value;
	}

	/**
	 * @param {function(): Promise<any> | any} lazy lazy function
	 * @param {function(any): Promise<any> | any} serialize serialize function
	 * @returns {function(): Promise<any> | any} new lazy
	 */
	static serializeLazy(lazy, serialize) {
		const fn = memorize(() => {
			const r = lazy();
			if (r instanceof Promise) return r.then(data => data && serialize(data));
			if (r) return serialize(r);
			return null;
		});
		fn[LAZY_TARGET] = lazy[LAZY_TARGET];
		/** @type {any} */ (fn).options = /** @type {any} */ (lazy).options;
		lazy[LAZY_SERIALIZED_VALUE] = fn;
		return fn;
	}

	/**
	 * @param {function(): Promise<any> | any} lazy lazy function
	 * @param {function(any): Promise<any> | any} deserialize deserialize function
	 * @returns {function(): Promise<any> | any} new lazy
	 */
	static deserializeLazy(lazy, deserialize) {
		const fn = memorize(() => {
			const r = lazy();
			if (r instanceof Promise) return r.then(data => deserialize(data));
			return deserialize(r);
		});
		fn[LAZY_TARGET] = lazy[LAZY_TARGET];
		/** @type {any} */ (fn).options = /** @type {any} */ (lazy).options;
		fn[LAZY_SERIALIZED_VALUE] = lazy;
		return fn;
	}
}

module.exports = SerializerMiddleware;
