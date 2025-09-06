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
	 * Apply the plugin
	 * @param {Compiler} compiler the compiler instance
	 * @returns {void}
	 */
	apply(compiler) {
		compiler.hooks.compilation.tap(
			PLUGIN_NAME,
			(compilation, { normalModuleFactory }) => {
				normalModuleFactory.hooks.resolveForScheme
					.for("data")
					.tap(PLUGIN_NAME, (resourceData) => {
						const match = URIRegEx.exec(resourceData.resource);
						if (match) {
							resourceData.data.mimetype = match[1] || "";
							resourceData.data.parameters = match[2] || "";
							resourceData.data.encoding = /** @type {"base64" | false} */ (
								match[3] || false
							);
							resourceData.data.encodedContent = match[4] || "";
						}
					});
				/**
				 * @param {string} resourcePath the resource path
				 * @returns {Buffer<ArrayBufferLike> | null} the decoded data URI
				 */
				const readResource = (resourcePath) => decodeDataURI(resourcePath);

				NormalModule.getCompilationHooks(compilation)
					.readResourceForScheme.for("data")
					.tap(PLUGIN_NAME, (resource) => readResource(resource));

				NormalModule.getCompilationHooks(compilation)
					.readResourceFromURL.for("data")
					.tap(PLUGIN_NAME, (resource) => readResource(resource));
			}
		);
	}
}

module.exports = DataUriPlugin;
