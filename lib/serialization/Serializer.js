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
		return new Promise((resolve, reject) =>
			resolve(
				this.middlewares.reduce((last, middleware) => {
					if (last instanceof Promise) {
						return last.then(
							data => data && middleware.serialize(data, context)
						);
					} else if (last) {
						try {
							return middleware.serialize(last, ctx);
						} catch (err) {
							return Promise.reject(err);
						}
					}
				}, obj)
			)
		);
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
