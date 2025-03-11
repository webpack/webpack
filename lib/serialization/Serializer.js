/*
	MIT License http://www.opensource.org/licenses/mit-license.php
*/

"use strict";

/** @typedef {import("./SerializerMiddleware").Context} Context */

/**
 * @template T, K
 * @typedef {import("./SerializerMiddleware")<T, K>} SerializerMiddleware
 */

class Serializer {
	/**
	 * @param {SerializerMiddleware<any, any>[]} middlewares serializer middlewares
	 * @param {Context} [context] context
	 */
	constructor(middlewares, context) {
		this.serializeMiddlewares = middlewares.slice();
		this.deserializeMiddlewares = middlewares.slice().reverse();
		this.context = context;
	}

	/**
	 * @param {TODO | Promise<TODO>} obj object
	 * @param {Context} context context object
	 * @returns {Promise<TODO>} result
	 */
	serialize(obj, context) {
		const ctx = { ...context, ...this.context };
		let current = obj;
		for (const middleware of this.serializeMiddlewares) {
			if (current && typeof current.then === "function") {
				current =
					/** @type {Promise<TODO>} */
					(current).then(data => data && middleware.serialize(data, ctx));
			} else if (current) {
				try {
					current = middleware.serialize(current, ctx);
				} catch (err) {
					current = Promise.reject(err);
				}
			} else break;
		}
		return current;
	}

	/**
	 * @param {TODO | Promise<TODO>} value value
	 * @param {Context} context object
	 * @returns {Promise<TODO>} result
	 */
	deserialize(value, context) {
		const ctx = { ...context, ...this.context };
		let current = value;
		for (const middleware of this.deserializeMiddlewares) {
			current =
				current && typeof current.then === "function"
					? /** @type {Promise<TODO>} */ (current).then(data =>
							middleware.deserialize(data, ctx)
						)
					: middleware.deserialize(current, ctx);
		}
		return current;
	}
}

module.exports = Serializer;
