/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

import { DEFAULTS } from "./config/defaults.js";
import createHash from "./util/createHash.js";
/** @typedef {import("./Compilation.js").DependencyConstructor} DependencyConstructor */
/** @typedef {import("./DependencyTemplate.js").default} DependencyTemplate */
/** @typedef {import("./util/Hash.js").HashFunction} HashFunction */

class DependencyTemplates {
	/**
	 * Creates an instance of DependencyTemplates.
	 * @param {HashFunction} hashFunction the hash function to use
	 */
	constructor(hashFunction = DEFAULTS.HASH_FUNCTION) {
		/** @type {Map<DependencyConstructor, DependencyTemplate>} */
		this._map = new Map();
		/** @type {string} */
		this._hash = "31d6cfe0d16ae931b73c59d7e0c089c0";
		/** @type {HashFunction} */
		this._hashFunction = hashFunction;
	}

	/**
	 * Returns template for this dependency.
	 * @param {DependencyConstructor} dependency Constructor of Dependency
	 * @returns {DependencyTemplate | undefined} template for this dependency
	 */
	get(dependency) {
		return this._map.get(dependency);
	}

	/**
	 * Updates value using the provided dependency.
	 * @param {DependencyConstructor} dependency Constructor of Dependency
	 * @param {DependencyTemplate} dependencyTemplate template for this dependency
	 * @returns {void}
	 */
	set(dependency, dependencyTemplate) {
		this._map.set(dependency, dependencyTemplate);
	}

	/**
	 * Updates the hash with the data contributed by this instance.
	 * @param {string} part additional hash contributor
	 * @returns {void}
	 */
	updateHash(part) {
		const hash = createHash(this._hashFunction);
		hash.update(`${this._hash}${part}`);
		this._hash = hash.digest("hex");
	}

	getHash() {
		return this._hash;
	}

	clone() {
		const newInstance = new DependencyTemplates(this._hashFunction);
		newInstance._map = new Map(this._map);
		newInstance._hash = this._hash;
		return newInstance;
	}
}

export default DependencyTemplates;

export { DependencyTemplates as "module.exports" };
