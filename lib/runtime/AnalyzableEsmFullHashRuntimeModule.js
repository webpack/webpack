/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author sheo13666q
*/

"use strict";

const RuntimeModule = require("../RuntimeModule");

/** @typedef {import("../RuntimeModule").UpdateHashContext} UpdateHashContext */
/** @typedef {import("../util/Hash")} Hash */

/**
 * Emits no code. It exists only as a `fullHash` runtime module so a chunk whose
 * analyzable ESM literal bakes the full hash (a `[fullhash]` publicPath) is re-hashed
 * after the full hash is known — making its content hash (the asset cache key and
 * `[contenthash]` value) track the full hash so the substituted literal is refreshed.
 */
class AnalyzableEsmFullHashRuntimeModule extends RuntimeModule {
	constructor() {
		super("analyzable esm full hash");
		/** @type {boolean} */
		this.fullHash = true;
	}

	/**
	 * Generates runtime code for this runtime module.
	 * @returns {string | null} runtime code
	 */
	generate() {
		return null;
	}

	/**
	 * Updates the hash with the data contributed by this instance.
	 * @param {Hash} hash the hash used to track dependencies
	 * @param {UpdateHashContext} context context
	 * @returns {void}
	 */
	updateHash(hash, context) {
		// Mix the full hash in (empty on the pre-full-hash pass) so the re-hash pass
		// makes the containing chunk's content hash depend on it.
		hash.update(this.compilation ? this.compilation.hash || "" : "");
		super.updateHash(hash, context);
	}
}

module.exports = AnalyzableEsmFullHashRuntimeModule;
