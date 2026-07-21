/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author sheo13666q
*/

"use strict";

/** @typedef {import("../Chunk").ChunkId} ChunkId */

// Post-hash placeholders: dependency templates bake these tokens into analyzable
// string literals during code generation (when hashes are still unknown), and
// AnalyzableEsmPlaceholderPlugin rewrites them to real paths once hashed assets
// exist. The charset is string-literal-safe and survives minification.
const PLACEHOLDER_PREFIX = "___WEBPACK_ANALYZABLE_";
const PUBLIC_PATH_PLACEHOLDER = `${PLACEHOLDER_PREFIX}PUBLIC_PATH___`;
// The chunk payload charset excludes `_`, keeping the `___` delimiters unambiguous.
const PLACEHOLDER_REGEXP =
	/___WEBPACK_ANALYZABLE_(?:PUBLIC_PATH|CHUNK_[A-Za-z0-9.-]+)___/g;

// Any `[hash]`/`[fullhash]`/`[chunkhash]`/`[contenthash]` token, incl. a `:<length>`
// or `:<digest>[:<length>]` suffix (e.g. `[contenthash:base64:8]`). Its value is only
// resolved after code generation.
const HASH_IN_FILENAME = /\[(?:full|chunk|content)?hash(?::[^\]]+)?\]/;
const HASH_IN_FILENAME_GLOBAL = /\[(?:full|chunk|content)?hash(?::[^\]]+)?\]/g;
// `[hash]` is the legacy alias of `[fullhash]`, so it belongs to the fullhash family.
const FULLHASH_IN_FILENAME = /\[(?:full)?hash(?::[^\]]+)?\]/;
const CHUNKHASH_IN_FILENAME = /\[chunkhash(?::[^\]]+)?\]/;
const CONTENTHASH_IN_FILENAME = /\[contenthash(?::[^\]]+)?\]/;

const TEMPLATE_TOKEN_REGEXP = /\[([^\]]+)\]/g;
const FULLHASH_TOKEN_REGEXP = /^(?:full)?hash(?::[^\]]+)?$/;

/**
 * Placeholder for a chunk's final (post-hash) filename. Unique per chunk id, so
 * the substitution pass maps tokens back by re-encoding each chunk's id (`.` and `-`
 * replace the base64 chars that would collide with the delimiter or regex).
 * @param {ChunkId} chunkId the referenced chunk's id
 * @returns {string} placeholder token
 */
const chunkFilenamePlaceholder = (chunkId) =>
	`${PLACEHOLDER_PREFIX}CHUNK_${Buffer.from(JSON.stringify(chunkId))
		.toString("base64")
		.replace(/\+/g, "-")
		.replace(/\//g, ".")
		.replace(/[=]+$/, "")}___`;

/**
 * Whether every template token in `str` is resolvable from the compilation hash alone
 * (`[fullhash]` / legacy `[hash]`): such a value can be baked after hashing even
 * though it is unknown during code generation.
 * @param {string} str a filename or publicPath template
 * @returns {boolean} true when only fullhash-family tokens are used
 */
const isFullHashOnlyTemplate = (str) => {
	TEMPLATE_TOKEN_REGEXP.lastIndex = 0;
	let match;
	while ((match = TEMPLATE_TOKEN_REGEXP.exec(str)) !== null) {
		if (!FULLHASH_TOKEN_REGEXP.test(match[1])) return false;
	}
	return true;
};

module.exports.CHUNKHASH_IN_FILENAME = CHUNKHASH_IN_FILENAME;
module.exports.CONTENTHASH_IN_FILENAME = CONTENTHASH_IN_FILENAME;
module.exports.FULLHASH_IN_FILENAME = FULLHASH_IN_FILENAME;
module.exports.HASH_IN_FILENAME = HASH_IN_FILENAME;
module.exports.HASH_IN_FILENAME_GLOBAL = HASH_IN_FILENAME_GLOBAL;
module.exports.PLACEHOLDER_PREFIX = PLACEHOLDER_PREFIX;
module.exports.PLACEHOLDER_REGEXP = PLACEHOLDER_REGEXP;
module.exports.PUBLIC_PATH_PLACEHOLDER = PUBLIC_PATH_PLACEHOLDER;
module.exports.chunkFilenamePlaceholder = chunkFilenamePlaceholder;
module.exports.isFullHashOnlyTemplate = isFullHashOnlyTemplate;
