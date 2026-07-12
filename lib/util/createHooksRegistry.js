/*
	MIT License http://www.opensource.org/licenses/mit-license.php
*/

import { createRequire } from "node:module";

import memoize from "./memoize.js";

const require = createRequire(import.meta.url);
const getCompilation = memoize(() => require("../Compilation.js"));

/**
 * @template T
 * @param {() => T} createHooks factory that returns a fresh hooks object
 * @returns {(compilation: import("../Compilation.js").default) => T} getter that returns (or creates) hooks for the compilation
 */
const createHooksRegistry = (createHooks) => {
	/** @type {WeakMap<import("../Compilation.js").default, T>} */
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

export default createHooksRegistry;

export { createHooksRegistry as "module.exports" };
