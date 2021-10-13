/*
	MIT License http://www.opensource.org/licenses/mit-license.php
*/

"use strict";

class Serializer {
	constructor(middlewares, context) {
		this.serializeMiddlewares = middlewares.slice();
		this.deserializeMiddlewares = middlewares.slice().reverse();
		this.context = context;
	}

	serialize(obj, context) {
		const ctx = { ...context, ...this.context };
		let current = obj;
		for (const middleware of this.serializeMiddlewares) {
			if (current && typeof current.then === "function") {
				current = current.then(data => data && middleware.serialize(data, ctx));
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

	deserialize(value, context) {
		const ctx = { ...context, ...this.context };
		/** @type {any} */
		let current = value;
		for (const middleware of this.deserializeMiddlewares) {
			if (current && typeof current.then === "function") {
				current = current.then(data => middleware.deserialize(data, ctx));
			} else {
				current = middleware.deserialize(current, ctx);
			}
		}
		return current;
	}
}

module.exports = Serializer;
