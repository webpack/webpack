/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Ivan Kopeykin @vankop
*/

"use strict";

const RuntimeGlobals = require("../RuntimeGlobals");
const RuntimeModule = require("../RuntimeModule");

/** @typedef {import("../../declarations/WebpackOptions").EntryDescriptionNormalized} EntryDescription */
/** @typedef {import("../Chunk")} Chunk */

class BaseUriRuntimeModule extends RuntimeModule {
	constructor() {
		super("base uri", RuntimeModule.STAGE_ATTACH);
	}

	/**
	 * Returns true, if the runtime module should get it's own scope.
	 * When false, `generate()` must emit complete statements ending with `;`
	 * so a following runtime IIFE is not parsed as a call (ASI).
	 * @returns {boolean} true, if the runtime module should get it's own scope
	 */
	shouldIsolate() {
		return false;
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

module.exports = BaseUriRuntimeModule;
