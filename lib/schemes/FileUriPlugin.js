/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

"use strict";

const { URL, fileURLToPath } = require("url");

/** @typedef {import("../Compiler")} Compiler */

class FileUriPlugin {
	/**
	 * Apply the plugin
	 * @param {Compiler} compiler the compiler instance
	 * @returns {void}
	 */
	apply(compiler) {
		compiler.hooks.compilation.tap(
			"FileUriPlugin",
			(compilation, { normalModuleFactory }) => {
				normalModuleFactory.hooks.resolveForScheme
					.for("file")
					.tap("FileUriPlugin", resourceData => {
						const url = new URL(resourceData.resource);
						const path = fileURLToPath(url);
						const query = url.search;
						const fragment = url.hash;
						resourceData.path = path;
						resourceData.query = query;
						resourceData.fragment = fragment;
						resourceData.resource = path + query + fragment;
						return true;
					});
			}
		);
	}
}

module.exports = FileUriPlugin;
