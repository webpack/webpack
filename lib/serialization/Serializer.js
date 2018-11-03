/*
	MIT License http://www.opensource.org/licenses/mit-license.php
*/

"use strict";

class Serializer {
	constructor(middlewares, options = {}) {
		this.middlewares = middlewares;
		this.options = options;
	}

	serializeToFile(obj, filename) {
		const context = {
			filename
		};
		return new Promise((resolve, reject) =>
			resolve(
				this.middlewares.reduce((last, middleware) => {
					if (last instanceof Promise) {
						return last.then(
							data => data && middleware.serialize(data, context)
						);
					} else if (last) {
						try {
							return middleware.serialize(last, context);
						} catch (err) {
							return Promise.reject(err);
						}
					}
				}, this.options.singleItem ? [obj] : obj)
			)
		);
	}

	deserializeFromFile(filename) {
		const context = {
			filename
		};
		return Promise.resolve()
			.then(() =>
				this.middlewares.reduceRight((last, middleware) => {
					if (last instanceof Promise)
						return last.then(data => middleware.deserialize(data, context));
					else return middleware.deserialize(last, context);
				}, [])
			)
			.then(array => {
				return this.options.singleItem ? array[0] : array;
			});
	}
}

module.exports = Serializer;
