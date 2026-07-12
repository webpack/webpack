/*
	MIT License http://www.opensource.org/licenses/mit-license.php
*/

import * as RuntimeGlobals from "../RuntimeGlobals.js";
import RuntimeModule from "../RuntimeModule.js";
/** @typedef {import("../../declarations/WebpackOptions.js").PublicPath} PublicPath */
/** @typedef {import("../Compilation.js").default} Compilation */

class PublicPathRuntimeModule extends RuntimeModule {
	/**
	 * @param {PublicPath} publicPath public path
	 */
	constructor(publicPath) {
		super("publicPath", RuntimeModule.STAGE_BASIC);
		/** @type {PublicPath} */
		this.publicPath = publicPath;
	}

	/**
	 * Generates runtime code for this runtime module.
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

export default PublicPathRuntimeModule;

export { PublicPathRuntimeModule as "module.exports" };
