/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Ivan Kopeykin @vankop
*/

import * as RuntimeGlobals from "../RuntimeGlobals.js";
import RuntimeModule from "../RuntimeModule.js";
/** @typedef {import("../../declarations/WebpackOptions.js").EntryDescriptionNormalized} EntryDescription */
/** @typedef {import("../Chunk.js").default} Chunk */

class BaseUriRuntimeModule extends RuntimeModule {
	constructor() {
		super("base uri", RuntimeModule.STAGE_ATTACH);
	}

	/**
	 * Generates runtime code for this runtime module.
	 * @returns {string | null} runtime code
	 */
	generate() {
		const chunk = /** @type {Chunk} */ (this.chunk);
		const options =
			/** @type {EntryDescription} */
			(chunk.getEntryOptions());
		return `${RuntimeGlobals.baseURI} = ${
			options.baseUri === undefined
				? "undefined"
				: JSON.stringify(options.baseUri)
		};`;
	}
}

export default BaseUriRuntimeModule;

export { BaseUriRuntimeModule as "module.exports" };
