/*
	MIT License http://www.opensource.org/licenses/mit-license.php
*/

"use strict";

const memoize = require("./memoize");

const getCompilation = memoize(() => require("../Compilation"));

/**
 * @template T
 * @param {() => T} createHooks factory that returns a fresh hooks object
 * @returns {(compilation: import("../Compilation")) => T} getter that returns (or creates) hooks for the compilation
 */
const createHooksRegistry = (createHooks) => {
	/** @type {WeakMap<import("../Compilation"), T>} */
	const map = new WeakMap();
	return (compilation) => {
		const Compilation = getCompilation();
		if (!(compilation instanceof Compilation)) {
			throw new TypeError(
				"The 'compilation' argument must be an instance of Compilation"
			);
		}
		let hooks = map.get(compilation);
		if (hooks === undefined) {
			hooks = createHooks();
			map.set(compilation, hooks);
		}
		return hooks;
	};
};

module.exports = createHooksRegistry;
