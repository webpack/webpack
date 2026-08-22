/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Ivan Kopeykin @vankop
*/

"use strict";

const RuntimeGlobals = require("../RuntimeGlobals");
const RuntimeModule = require("../RuntimeModule");
const { renderBaseUri } = require("./baseUri");

/**
 * @import {
 * 	EntryDescriptionNormalized as EntryDescription
 * } from "../../declarations/WebpackOptions"
 */
/** @import Chunk from "../Chunk" */
/** @import Compilation from "../Compilation" */

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
		if (options.baseUri === undefined) {
			return `${RuntimeGlobals.baseURI} = undefined;`;
		}
		const { runtimeTemplate, outputOptions } =
			/** @type {Compilation} */
			(this.compilation);
		// Chunk loading is off here, so no loader has named a base for a relative one to be
		// read against. Module output carries its own url; anything else has none to offer.
		if (!runtimeTemplate.isModule()) {
			return `${RuntimeGlobals.baseURI} = ${JSON.stringify(options.baseUri)};`;
		}
		return renderBaseUri(
			options.baseUri,
			`${outputOptions.importMetaName}.url`
		);
	}
}

module.exports = BaseUriRuntimeModule;
