/*
	MIT License http://www.opensource.org/licenses/mit-license.php
*/

"use strict";

const RuntimeGlobals = require("../RuntimeGlobals");
const RuntimeModule = require("../RuntimeModule");

/** @typedef {import("../../declarations/WebpackOptions").PublicPath} PublicPath */
/** @typedef {import("../Compilation")} Compilation */

/**
 * Runtime module that publishes the resolved `output.publicPath` value to the
 * bootstrap so chunk and asset loading helpers can build absolute request URLs.
 */
class PublicPathRuntimeModule extends RuntimeModule {
	/**
	 * Stores the configured public path expression that should be resolved for
	 * the current compilation hash.
	 * @param {PublicPath} publicPath public path
	 */
	constructor(publicPath) {
		super("publicPath", RuntimeModule.STAGE_BASIC);
		/** @type {PublicPath} */
		this.publicPath = publicPath;
	}

	/**
	 * Generates the bootstrap assignment that exposes the final public path on
	 * `RuntimeGlobals.publicPath`.
	 * @returns {string | null} runtime code
	 */
	generate() {
		const { publicPath } = this;
		const compilation = /** @type {Compilation} */ (this.compilation);

		return `${RuntimeGlobals.publicPath} = ${JSON.stringify(
			compilation.getPath(publicPath || "", {
				hash: compilation.hash || "XXXX"
			})
		)};`;
	}
}

module.exports = PublicPathRuntimeModule;
