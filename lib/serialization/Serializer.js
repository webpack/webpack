/*
	MIT License http://www.opensource.org/licenses/mit-license.php
*/

"use strict";

class Serializer {
	constructor(middlewares, context) {
		this.middlewares = middlewares;
		this.context = context;
	}

	serialize(obj, context) {
		const ctx = { ...context, ...this.context };
		return new Promise((resolve, reject) => {
			let current = obj;
			for (const middleware of this.middlewares) {
				if (current instanceof Promise) {
					current = current.then(
						data => data && middleware.serialize(data, context)
					);
				} else if (current) {
					try {
						current = middleware.serialize(current, ctx);
					} catch (err) {
						current = Promise.reject(err);
					}
				} else break;
			}
			resolve(current);
		});
	}

	deserialize(context) {
		const ctx = { ...context, ...this.context };
		return Promise.resolve().then(() =>
			this.middlewares.reduceRight((last, middleware) => {
				if (last instanceof Promise)
					return last.then(data => middleware.deserialize(data, context));
				else return middleware.deserialize(last, ctx);
			}, [])
		);
	}
}

module.exports = Serializer;
