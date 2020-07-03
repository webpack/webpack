/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

"use strict";

const { URL } = require("url");
const NormalModule = require("../NormalModule");
const memorize = require("../util/memorize");

/** @typedef {import("../Compiler")} Compiler */

class HttpUriPlugin {
	/**
	 * Apply the plugin
	 * @param {Compiler} compiler the compiler instance
	 * @returns {void}
	 */
	apply(compiler) {
		compiler.hooks.compilation.tap(
			"HttpUriPlugin",
			(compilation, { normalModuleFactory }) => {
				const resolveHandler = resourceData => {
					const url = new URL(resourceData.resource);
					resourceData.path = url.origin + url.pathname;
					resourceData.query = url.search;
					resourceData.fragment = url.hash;
					return /** @type {true} */ (true);
				};
				const readHandler = (scheme, getBuiltin) => (
					resource,
					module,
					callback
				) => {
					return getBuiltin().get(new URL(resource), res => {
						if (res.statusCode !== 200) {
							res.destroy();
							return callback(
								new Error(`${scheme} request status code = ${res.statusCode}`)
							);
						}

						const bufferArr = [];

						res.on("data", chunk => {
							bufferArr.push(chunk);
						});

						res.on("end", () => {
							if (!res.complete) {
								return callback(new Error(`${scheme} request was terminated`));
							}

							callback(null, Buffer.concat(bufferArr));
						});
					});
				};

				normalModuleFactory.hooks.resolveForScheme
					.for("http")
					.tap("HttpUriPlugin", resolveHandler);
				normalModuleFactory.hooks.resolveForScheme
					.for("https")
					.tap("HttpUriPlugin", resolveHandler);
				NormalModule.getCompilationHooks(compilation)
					.readResourceForScheme.for("http")
					.tapAsync(
						"HttpUriPlugin",
						readHandler(
							"http",
							memorize(() => require("http"))
						)
					);
				NormalModule.getCompilationHooks(compilation)
					.readResourceForScheme.for("https")
					.tapAsync(
						"HttpUriPlugin",
						readHandler(
							"https",
							memorize(() => require("https"))
						)
					);
			}
		);
	}
}

module.exports = HttpUriPlugin;
