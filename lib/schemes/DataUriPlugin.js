/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

"use strict";

const NormalModule = require("../NormalModule");

/** @typedef {import("../Compiler")} Compiler */

// data URL scheme: "data:text/javascript;charset=utf-8;base64,some-string"
// http://www.ietf.org/rfc/rfc2397.txt
const URIRegEx = /^data:(?:[^;,]+)?(?:(?:;[^;,]+)*?)(;base64)?,(.*)$/i;
const URIMetaRegEx = /^data:([^;,]+)?(?:(?:;[^;,]+)*?)(?:;(base64))?,/i;

const decodeDataURI = uri => {
	const match = URIRegEx.exec(uri);
	if (!match) return null;

	const isBase64 = match[1];
	const body = match[2];
	return isBase64
		? Buffer.from(body, "base64")
		: Buffer.from(decodeURIComponent(body), "ascii");
};

class DataUriPlugin {
	/**
	 * Apply the plugin
	 * @param {Compiler} compiler the compiler instance
	 * @returns {void}
	 */
	apply(compiler) {
		compiler.hooks.compilation.tap(
			"DataUriPlugin",
			(compilation, { normalModuleFactory }) => {
				normalModuleFactory.hooks.resolveForScheme
					.for("data")
					.tap("DataUriPlugin", resourceData => {
						const match = URIMetaRegEx.exec(resourceData.resource);
						if (match) {
							resourceData.data.mimetype = match[1] || "";
							resourceData.data.encoding = match[2] || false;
						}
					});
				NormalModule.getCompilationHooks(compilation)
					.readResourceForScheme.for("data")
					.tap("DataUriPlugin", resource => decodeDataURI(resource));
			}
		);
	}
}

module.exports = DataUriPlugin;
