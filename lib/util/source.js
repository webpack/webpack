/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

"use strict";

/** @typedef {import("webpack-sources").Source} Source */
/** @typedef {import("./Hash")} Hash */

/** @type {WeakMap<Source, WeakMap<Source, boolean>>} */
const equalityCache = new WeakMap();

/**
 * Checks whether source equal true, when both sources are equal.
 * @param {Source} a a source
 * @param {Source} b another source
 * @returns {boolean} true, when both sources are equal
 */
const _isSourceEqual = (a, b) => {
	// prefer .buffer(), it's called anyway during emit
	/** @type {Buffer | string} */
	let aSource = typeof a.buffer === "function" ? a.buffer() : a.source();
	/** @type {Buffer | string} */
	let bSource = typeof b.buffer === "function" ? b.buffer() : b.source();
	if (aSource === bSource) return true;
	if (typeof aSource === "string" && typeof bSource === "string") return false;
	if (!Buffer.isBuffer(aSource)) aSource = Buffer.from(aSource, "utf8");
	if (!Buffer.isBuffer(bSource)) bSource = Buffer.from(bSource, "utf8");
	return aSource.equals(bSource);
};

/**
 * Checks whether this object is source equal.
 * @param {Source} a a source
 * @param {Source} b another source
 * @returns {boolean} true, when both sources are equal
 */
const isSourceEqual = (a, b) => {
	if (a === b) return true;
	const cache1 = equalityCache.get(a);
	if (cache1 !== undefined) {
		const result = cache1.get(b);
		if (result !== undefined) return result;
	}
	const result = _isSourceEqual(a, b);
	if (cache1 !== undefined) {
		cache1.set(b, result);
	} else {
		const map = new WeakMap();
		map.set(b, result);
		equalityCache.set(a, map);
	}
	const cache2 = equalityCache.get(b);
	if (cache2 !== undefined) {
		cache2.set(a, result);
	} else {
		const map = new WeakMap();
		map.set(a, result);
		equalityCache.set(b, map);
	}
	return result;
};

// TODO remove in webpack 6, this is protection against authors who directly use `webpack-sources` outdated version
/**
 * Feeds the Source's content into a Hash without forcing a single
 * concatenated Buffer. Uses webpack-sources >= 3.4.0 `buffers()` when
 * available so `ConcatSource` can stream its children directly.
 * @param {Hash} hash hash to update
 * @param {Source} source source whose bytes are appended
 * @returns {void}
 */
const updateHashFromSource = (hash, source) => {
	// TODO webpack 6: drop the `buffers` check, require webpack-sources >= 3.4
	// and call `source.buffers()` unconditionally.
	if (typeof source.buffers === "function") {
		for (const buf of source.buffers()) hash.update(buf);
	} else {
		hash.update(source.buffer());
	}
};

module.exports.isSourceEqual = isSourceEqual;
module.exports.updateHashFromSource = updateHashFromSource;
