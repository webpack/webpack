/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Ivan Kopeykin @vankop
*/

"use strict";

/**
 * @template T
 */
class AppendOnlyStackedSet {
	/**
	 * @param {Set<T>[]} sets an optional array of sets
	 */
	constructor(sets = []) {
		/** @type {Set<T>[]} */
		this._sets = sets;
		/** @type {Set<T> | undefined} */
		this._current = undefined;
	}

	/**
	 * @param {T} el element
	 */
	add(el) {
		if (!this._current) {
			this._current = new Set();
			this._sets.push(this._current);
		}
		this._current.add(el);
	}

	/**
	 * @param {T} el element
	 * @returns {boolean} result
	 */
	has(el) {
		for (const set of this._sets) {
			if (set.has(el)) return true;
		}
		return false;
	}

	clear() {
		this._sets = [];
		if (this._current) this._current.clear();
	}

	/**
	 * @returns {AppendOnlyStackedSet<T>} child
	 */
	createChild() {
		return new AppendOnlyStackedSet(this._sets.length ? [...this._sets] : []);
	}
}

module.exports = AppendOnlyStackedSet;
