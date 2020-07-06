/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

"use strict";

const NormalModule = require("../NormalModule");
const { getMimetype, decodeDataURI } = require("../util/DataURI");

/** @typedef {import("../Compiler")} Compiler */

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
						resourceData.data.mimetype = getMimetype(resourceData.resource);
					});
				NormalModule.getCompilationHooks(compilation)
					.readResourceForScheme.for("data")
					.tap("DataUriPlugin", resource => decodeDataURI(resource));
			}
		);
	}
}

module.exports = DataUriPlugin;
