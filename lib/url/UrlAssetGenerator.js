/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

"use strict";

/** @typedef {import("webpack-sources").Source} Source */
/** @typedef {import("../NormalModule")} NormalModule */

class UrlAssetGenerator {
	/**
	 * @param {NormalModule} module module for which the code should be generated
	 *
	 * @returns {Source} generated code
	 */
	generate(module) {
		return module.originalSource();
	}
}

module.exports = UrlAssetGenerator;
