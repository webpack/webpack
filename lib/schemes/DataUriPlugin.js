/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

"use strict";

const NormalModule = require("../NormalModule");
const { URIRegEx, decodeDataURI } = require("../util/dataURL");

/** @typedef {import("../Compiler")} Compiler */

const PLUGIN_NAME = "DataUriPlugin";

class DataUriPlugin {
	/**
	 * Applies the plugin by registering its hooks on the compiler.
	 * @param {Compiler} compiler the compiler instance
	 * @returns {void}
	 */
	apply(compiler) {
		compiler.hooks.compilation.tap(
			PLUGIN_NAME,
			(compilation, { normalModuleFactory }) => {
				normalModuleFactory.hooks.resolveForScheme
					.for("data")
					.tap(PLUGIN_NAME, (resourceData, resolveData) => {
						const match = URIRegEx.exec(resourceData.resource);
						if (match) {
							resourceData.data.mimetype = match[1] || "";
							resourceData.data.parameters = match[2] || "";
							resourceData.data.encoding = /** @type {"base64" | false} */ (
								match[3] || false
							);
							resourceData.data.encodedContent = match[4] || "";
						}
						// Inherit the issuer's resolution context so any nested
						// dependencies discovered while parsing the data URI's body
						// (e.g. `url(...)` / `@import` inside an inline CSS data
						// URI) resolve relative to where the URI was referenced
						// from, instead of against the synthetic `data:.../` path
						// that `getContext("data:…")` would otherwise infer.
						if (
							resourceData.context === undefined &&
							resolveData.context !== undefined
						) {
							resourceData.context = resolveData.context;
						}
					});

				NormalModule.getCompilationHooks(compilation)
					.readResourceForScheme.for("data")
					.tap(PLUGIN_NAME, (resource) => decodeDataURI(resource));
			}
		);
	}
}

module.exports = DataUriPlugin;
