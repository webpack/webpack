/*
	MIT License http://www.opensource.org/licenses/mit-license.php
*/

import * as RuntimeGlobals from "../RuntimeGlobals.js";
import RuntimeModule from "../RuntimeModule.js";
/** @typedef {import("../Compilation.js").default} Compilation */

class GetFullHashRuntimeModule extends RuntimeModule {
	constructor() {
		super("getFullHash");
		/** @type {boolean} */
		this.fullHash = true;
	}

	/**
	 * Generates runtime code for this runtime module.
	 * @returns {string | null} runtime code
	 */
	generate() {
		const compilation = /** @type {Compilation} */ (this.compilation);
		const { runtimeTemplate } = compilation;
		return `${RuntimeGlobals.getFullHash} = ${runtimeTemplate.returningFunction(
			JSON.stringify(compilation.hash || "XXXX")
		)}`;
	}
}

export default GetFullHashRuntimeModule;

export { GetFullHashRuntimeModule as "module.exports" };
