/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Alexander Akait @alexander-akait
*/

"use strict";

const RuntimeGlobals = require("../RuntimeGlobals");

/**
 * Whether `new URL(path, baseUri)` can resolve against it. Only an absolute URL is a
 * base of its own; a relative one has to be read against something first.
 * @param {string} baseUri an entry's base uri
 * @returns {boolean} true when it is absolute
 */
const isAbsoluteBaseUri = (baseUri) => {
	try {
		// eslint-disable-next-line no-new
		new URL(baseUri);
		return true;
	} catch (_error) {
		return false;
	}
};

/**
 * Whether a base names a place relative to the chunk, so a literal can spell it. A
 * protocol-relative one takes its scheme from wherever the chunk was loaded, which no
 * literal can state, so it stays with the runtime that reads it.
 * @param {string} baseUri an entry's base uri
 * @returns {boolean} true when it can be baked beside the chunk
 */
const isChunkRelativeBaseUri = (baseUri) =>
	!isAbsoluteBaseUri(baseUri) && !baseUri.startsWith("//");

/**
 * Assignment of `__webpack_require__.b` for a chunk. An entry `baseUri` replaces the
 * base an asset url resolves against, but only an absolute one is a base by itself —
 * a relative one is read against the base this target would use without it, so it
 * lands beside the chunk rather than throwing wherever the runtime reads it.
 * @param {string | undefined} baseUri the entry's base uri, if it set one
 * @param {string} fallback expression for the base this target uses without one
 * @returns {string} the assignment, ending with `;`
 */
const renderBaseUri = (baseUri, fallback) => {
	// An empty one names no base of its own, so it leaves the target's alone.
	if (!baseUri) return `${RuntimeGlobals.baseURI} = ${fallback};`;
	if (isAbsoluteBaseUri(baseUri)) {
		return `${RuntimeGlobals.baseURI} = ${JSON.stringify(baseUri)};`;
	}
	return `${RuntimeGlobals.baseURI} = new URL(${JSON.stringify(
		baseUri
	)}, ${fallback}).href;`;
};

module.exports.isAbsoluteBaseUri = isAbsoluteBaseUri;
module.exports.isChunkRelativeBaseUri = isChunkRelativeBaseUri;
module.exports.renderBaseUri = renderBaseUri;
