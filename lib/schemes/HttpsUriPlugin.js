/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

"use strict";

const { URL } = require("url");
const NormalModule = require("../NormalModule");

/** @typedef {import("../Compiler")} Compiler */

class HttpsUriPlugin {
	/**
	 * Apply the plugin
	 * @param {Compiler} compiler the compiler instance
	 * @returns {void}
	 */
	apply(compiler) {
		compiler.hooks.compilation.tap(
			"HttpsUriPlugin",
			(compilation, { normalModuleFactory }) => {
				normalModuleFactory.hooks.resolveForScheme
					.for("https")
					.tap("HttpsUriPlugin", resourceData => {
						const url = new URL(resourceData.resource);
						resourceData.path = url.origin + url.pathname;
						resourceData.query = url.search;
						resourceData.fragment = url.hash;
						return /** @type {true} */ (true);
					});
				NormalModule.getCompilationHooks(compilation)
					.readResourceForScheme.for("https")
					.tapAsync("HttpsUriPlugin", (resource, module, callback) => {
						return require("https").get(new URL(resource), res => {
							if (res.statusCode !== 200) {
								res.destroy();
								return callback(
									new Error(`https request status code = ${res.statusCode}`)
								);
							}

							const bufferArr = [];

							res.on("data", chunk => {
								bufferArr.push(chunk);
							});

							res.on("end", () => {
								if (!res.complete) {
									return callback(new Error("https request was terminated"));
								}

								callback(null, Buffer.concat(bufferArr));
							});
						});
					});
			}
		);
	}
}

module.exports = HttpsUriPlugin;
