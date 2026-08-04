/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Alexander Akait @alexander-akait
*/

"use strict";

/**
 * Declares a module that loads on first use, in the shape a dynamic `import()`
 * has: the accessor resolves to the module and the caller awaits it. The thunk
 * is a `require` until `lib/` moves to ecma modules, which changes that keyword
 * and nothing else — `Promise.resolve` already passes an `import()` promise
 * through.
 * @template T
 * @param {() => T | Promise<T>} load loads the module
 * @returns {() => Promise<T>} resolves the module, loading it once
 */
const lazyModule = (load) => {
	/** @type {Promise<T> | undefined} */
	let promise;
	return () => {
		if (promise === undefined) promise = Promise.resolve(load());
		return promise;
	};
};

/**
 * Same declaration for a consumer with nowhere to await — a property getter, a
 * dependency template, a generator. These are the sites that still need an
 * await seam (or a static import) before `load` can become `import()`; nothing
 * else in `lib/` defers a module load.
 * @template T
 * @param {() => T} load loads the module
 * @returns {() => T} returns the module, loading it once on first call
 */
const lazyModuleSync = (load) => {
	let cached = false;
	/** @type {T | undefined} */
	let result;
	return () => {
		if (cached) return /** @type {T} */ (result);
		result = load();
		cached = true;
		// release the loader and everything it holds
		/** @type {(() => T) | undefined} */
		(load) = undefined;
		return /** @type {T} */ (result);
	};
};

/** @typedef {(<T>(load: () => T | Promise<T>) => () => Promise<T>) & { sync: <T>(load: () => T) => () => T }} LazyModule */

module.exports = /** @type {LazyModule} */ (lazyModule);
module.exports.sync = lazyModuleSync;
