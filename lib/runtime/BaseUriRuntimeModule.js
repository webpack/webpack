/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Ivan Kopeykin @vankop
*/

"use strict";

const RuntimeGlobals = require("../RuntimeGlobals");
const RuntimeModule = require("../RuntimeModule");

/** @typedef {import("../../declarations/WebpackOptions").EntryDescriptionNormalized} EntryDescription */
/** @typedef {import("../Chunk")} Chunk */

/**
 * Runtime module that exposes the entry's configured base URI through
 * `__webpack_require__.b`.
 */
class BaseUriRuntimeModule extends RuntimeModule {
	/**
	 * Creates the runtime module that assigns the entry base URI.
	 */
	constructor() {
		super("base uri", RuntimeModule.STAGE_ATTACH);
	}

	/**
	 * Generates the assignment that publishes the entry's `baseUri` value to
	 * the runtime.
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
