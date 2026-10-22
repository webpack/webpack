/*
	MIT License http://www.opensource.org/licenses/mit-license.php
*/

"use strict";

const Template = require("../template/Template");
const RuntimeGlobals = require("./RuntimeGlobals");
const RuntimeModule = require("./RuntimeModule");

/** @import Chunk from "../graph/Chunk" */
/** @import Compilation from "../Compilation" */

class GetMainFilenameRuntimeModule extends RuntimeModule {
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
	 * @param {string} name readable name
	 * @param {string} global global object binding
	 * @param {string} filename main file name
	 */
	constructor(name, global, filename) {
		super(`get ${name} filename`);
		/** @type {string} */
		this.global = global;
		/** @type {string} */
		this.filename = filename;
	}

	/**
	 * The `[handlerMap, key]` pairs this module installs onto a chunk handler map
	 * such as `__webpack_require__.f`, or `null` where it cannot name them.
	 * @returns {[string, string][] | null} installed chunk handlers (do not mutate)
	 */
	getInstalledChunkHandlers() {
		return RuntimeModule.NO_CHUNK_HANDLERS;
	}

	/**
	 * Generates runtime code for this runtime module.
	 * @returns {string | null} runtime code
	 */
	generate() {
		const { global, filename } = this;
		const compilation = /** @type {Compilation} */ (this.compilation);
		const chunk = /** @type {Chunk} */ (this.chunk);
		const { runtimeTemplate } = compilation;
		const url = compilation.getPath(JSON.stringify(filename), {
			hash: `" + ${RuntimeGlobals.getFullHash}() + "`,
			hashWithLength: (length) =>
				`" + ${RuntimeGlobals.getFullHash}().slice(0, ${length}) + "`,
			chunk,
			runtime: chunk.runtime
		});
		return Template.asString([
			`${global} = ${runtimeTemplate.returningFunction(url)};`
		]);
	}
}

module.exports = GetMainFilenameRuntimeModule;
