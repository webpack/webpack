/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

"use strict";

const createHash = require("../util/createHash");

/** @typedef {import("../util/Hash")} Hash */

/**
 * @typedef {Object} HashableObject
 * @property {function(Hash): void} updateHash
 */

class LazyHashedEtag {
	/**
	 * @param {HashableObject} obj object with updateHash method
	 */
	constructor(obj) {
		this._obj = obj;
		this._hash = undefined;
	}

	/**
	 * @returns {string} hash of object
	 */
	toString() {
		if (this._hash === undefined) {
			const hash = createHash("md4");
			this._obj.updateHash(hash);
			this._hash = /** @type {string} */ (hash.digest("base64"));
		}
		return this._hash;
	}
}

/** @type {WeakMap<HashableObject, LazyHashedEtag>} */
const map = new WeakMap();

/**
 * @param {HashableObject} obj object with updateHash method
 * @returns {LazyHashedEtag} etag
 */
const getter = obj => {
	const hash = map.get(obj);
	if (hash !== undefined) return hash;
	const newHash = new LazyHashedEtag(obj);
	map.set(obj, newHash);
	return newHash;
};

module.exports = getter;
