/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Ivan Kopeykin @vankop
*/

"use strict";

const RuntimeGlobals = require("../RuntimeGlobals");
const RuntimeModule = require("../RuntimeModule");
const { renderBaseUri } = require("./baseUri");

/** @typedef {import("../../declarations/WebpackOptions").EntryDescriptionNormalized} EntryDescription */
/** @typedef {import("../Chunk")} Chunk */
/** @typedef {import("../Compilation")} Compilation */

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
		if (!options.baseUri) {
			return `${RuntimeGlobals.baseURI} = undefined;`;
		}
		// Chunk loading is off wherever this module is used, so no loader has named the
		// base a relative one is read against — the module's own url is that base.
		const { runtimeTemplate, outputOptions } =
			/** @type {Compilation} */
			(this.compilation);
		return renderBaseUri(
			options.baseUri,
			runtimeTemplate.isModule()
				? `${outputOptions.importMetaName}.url`
				: "(typeof document !== 'undefined' && document.baseURI) || self.location.href"
		);
	}
}

module.exports = BaseUriRuntimeModule;
