/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Ivan Kopeykin @vankop
*/

"use strict";

/** @typedef {import("./Hash")} Hash */

const A_CODE = "a".charCodeAt(0);

/**
 * Returns hash that has at least one non numeric char.
 * @param {string} hash hash
 * @param {number} hashLength hash length
 * @returns {string} returns hash that has at least one non numeric char
 */
const nonNumericOnlyHash = (hash, hashLength) => {
	if (hashLength < 1) return "";
	const slice = hash.slice(0, hashLength);
	if (/[^\d]/.test(slice)) return slice;
	return `${String.fromCharCode(
		A_CODE + (Number.parseInt(hash[0], 10) % 6)
	)}${slice.slice(1)}`;
};

/**
 * Digests a hash and truncates it to a content-hash string (non-numeric first char).
 * @param {Hash} hash hash
 * @param {string} hashDigest digest encoding
 * @param {number} hashDigestLength hash length
 * @returns {string} content hash string
 */
const digestNonNumericOnly = (hash, hashDigest, hashDigestLength) =>
	nonNumericOnlyHash(hash.digest(hashDigest), hashDigestLength);

/**
 * Digests a hash, returning both the truncated content-hash string and the full
 * (untruncated) digest, so `[contenthash:<digest>]` can re-encode from full entropy.
 * @param {Hash} hash hash
 * @param {string} hashDigest digest encoding
 * @param {number} hashDigestLength hash length
 * @returns {[string, string]} content hash string and full digest
 */
const digestNonNumericOnlyWithFull = (hash, hashDigest, hashDigestLength) => {
	const full = /** @type {string} */ (hash.digest(hashDigest));
	return [nonNumericOnlyHash(full, hashDigestLength), full];
};

module.exports = nonNumericOnlyHash;
module.exports.digestNonNumericOnly = digestNonNumericOnly;
module.exports.digestNonNumericOnlyWithFull = digestNonNumericOnlyWithFull;
