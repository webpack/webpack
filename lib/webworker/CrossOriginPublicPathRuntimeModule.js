/*
	MIT License http://www.opensource.org/licenses/mit-license.php
*/

"use strict";

const RuntimeGlobals = require("../RuntimeGlobals");
const RuntimeModule = require("../RuntimeModule");

/**
 * Used for cross origin workers support. Relies on global variables.
 */
class CrossOriginPublicPathRuntimeModule extends RuntimeModule {
	constructor(publicPath) {
		super("publicPath", RuntimeModule.STAGE_BASIC);
		this.publicPath = publicPath;
	}

	/**
	 * @returns {string} runtime code
	 */
	generate() {
		const { compilation, publicPath } = this;
		const normalizedPublicPath = publicPath === "auto" ? "" : publicPath || "";

		return `${RuntimeGlobals.publicPath} = new URL(${JSON.stringify(
			compilation.getPath(normalizedPublicPath, {
				hash: compilation.hash || "XXXX"
			})
		)}, __webpack_base_uri__) + "";`;
	}
}

module.exports = CrossOriginPublicPathRuntimeModule;
