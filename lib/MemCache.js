/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

"use strict";

const WeakTupleMap = require("./util/WeakTupleMap");

class MemCache {
	constructor() {
		this._cache = new WeakTupleMap();
	}

	/**
	 * @template {any[]} T
	 * @template V
	 * @param {T} args arguments
	 * @returns {V | undefined} cached value
	 */
	get(...args) {
		return this._cache.get(...args);
	}

	/**
	 * @template {[...any[], any]} T
	 * @param {T} args arguments
	 * @returns {void}
	 */
	set(...args) {
		this._cache.set(...args);
	}

	/**
	 * @template {[...any[], (...args: any[]) => V]} T
	 * @template V
	 * @param {T} args arguments
	 * @returns {V} computed value or cached
	 */
	provide(...args) {
		return this._cache.provide(...args);
	}
}

module.exports = MemCache;
