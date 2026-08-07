/*
	MIT License http://www.opensource.org/licenses/mit-license.php
*/

"use strict";

/**
 * @template T
 * @param {() => T} createHooks factory that returns a fresh hooks object
 * @returns {(compilation: import("../Compilation")) => T} getter that returns (or creates) hooks for the compilation
 */
const createHooksRegistry = (createHooks) => {
	/** @type {WeakMap<import("../Compilation"), T>} */
	const map = new WeakMap();
	return (compilation) => {
		let hooks = map.get(compilation);
		if (hooks === undefined) {
			// validated once per compilation — this runs on every render and
			// codegen. Matched by class name, not `instanceof`: a compilation from
			// another webpack copy has to pass too, and importing `Compilation`
			// here cycles.
			const candidate =
				/** @type {{ constructor?: { name: string } } | null} */
				(compilation);
			if (
				!candidate ||
				!candidate.constructor ||
				candidate.constructor.name !== "Compilation"
			) {
				throw new TypeError(
					"The 'compilation' argument must be an instance of Compilation"
				);
			}
			hooks = createHooks();
			map.set(compilation, hooks);
		}
		return hooks;
	};
};

module.exports = createHooksRegistry;
