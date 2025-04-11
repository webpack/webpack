/*
	MIT License http://www.opensource.org/licenses/mit-license.php
*/

"use strict";

/**
 * @template T, K, C
 * @typedef {import("./SerializerMiddleware")<T, K, C>} SerializerMiddleware
 */

/**
 * @template DeserializedValue
 * @template SerializedValue
 * @template Context
 */
class Serializer {
	/**
	 * @param {SerializerMiddleware<EXPECTED_ANY, EXPECTED_ANY, EXPECTED_ANY>[]} middlewares serializer middlewares
	 * @param {Context=} context context
	 */
	constructor(middlewares, context) {
		this.serializeMiddlewares = middlewares.slice();
		this.deserializeMiddlewares = middlewares.slice().reverse();
		this.context = context;
	}

	/**
	 * @template ExtendedContext
	 * @param {DeserializedValue | Promise<DeserializedValue>} obj object
	 * @param {Context & ExtendedContext} context context object
	 * @returns {Promise<SerializedValue>} result
	 */
	serialize(obj, context) {
		const ctx = { ...context, ...this.context };
		let current = obj;
		for (const middleware of this.serializeMiddlewares) {
			if (
				current &&
				typeof (/** @type {Promise<DeserializedValue>} */ (current).then) ===
					"function"
			) {
				current =
					/** @type {Promise<DeserializedValue>} */
					(current).then(data => data && middleware.serialize(data, ctx));
			} else if (current) {
				try {
					current = middleware.serialize(current, ctx);
				} catch (err) {
					current = Promise.reject(err);
				}
			} else break;
		}
		return /** @type {Promise<SerializedValue>} */ (current);
	}

	/**
	 * @template ExtendedContext
	 * @param {SerializedValue | Promise<SerializedValue>} value value
	 * @param {Context & ExtendedContext} context object
	 * @returns {Promise<DeserializedValue>} result
	 */
	deserialize(value, context) {
		const ctx = { ...context, ...this.context };
		let current = value;
		for (const middleware of this.deserializeMiddlewares) {
			current =
				current &&
				typeof (/** @type {Promise<SerializedValue>} */ (current).then) ===
					"function"
					? /** @type {Promise<SerializedValue>} */ (current).then(data =>
							middleware.deserialize(data, ctx)
						)
					: middleware.deserialize(current, ctx);
		}
		return /** @type {Promise<DeserializedValue>} */ (current);
	}
}

module.exports = Serializer;
