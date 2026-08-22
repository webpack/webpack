/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author sheo13666q @sheo13666q
*/

"use strict";

const RuntimeGlobals = require("../RuntimeGlobals");
const {
	getPresentKinds,
	reEncodeDigest,
	usesFullHashDigest
} = require("../TemplatedPathPlugin");

/** @import Compilation from "../Compilation" */

/**
 * Whether the runtime needs `getFullHash` to build a binary's name. A `[hash]` next to
 * a module resolves to that module's hash, not the compilation's, so only the explicit
 * `[fullhash]` spelling asks for it — and a digest is inlined rather than read.
 * @param {string} filename `output.webassemblyModuleFilename`
 * @returns {boolean} true when the runtime reads the compilation hash
 */
const needsRuntimeFullHash = (filename) =>
	getPresentKinds(filename).has("fullhash") && !usesFullHashDigest(filename);

/**
 * The compilation-hash half of the `getPath` data for interpolating
 * `output.webassemblyModuleFilename` into runtime code.
 * @param {Compilation} compilation the compilation
 * @returns {{ hash: string, hashWithLength: (length: number) => string, hashWithDigest: (digest: string, length?: number) => string }} the fields
 */
const fullHashPathData = (compilation) => ({
	hash: `" + ${RuntimeGlobals.getFullHash}() + "`,
	hashWithLength: (length) =>
		`" + ${RuntimeGlobals.getFullHash}().slice(0, ${length}) + "`,
	// A digest re-encodes the hash, which the runtime expression above cannot carry, so
	// the settled value is inlined instead — byte-identical to the emitted filename.
	hashWithDigest: (digest, length) => {
		const { fullHash, outputOptions } = compilation;
		// Pre-hash pass: a stand-in, replaced on the post-hash re-render that
		// `needsInlinedFullHash` asks for. Matches `GetFullHashRuntimeModule`.
		if (!fullHash) return length ? "x".repeat(length) : "x";
		const hash = reEncodeDigest(
			fullHash,
			outputOptions.hashDigest || "hex",
			digest
		);
		return length ? hash.slice(0, length) : hash;
	}
});

module.exports.fullHashPathData = fullHashPathData;
module.exports.needsRuntimeFullHash = needsRuntimeFullHash;
