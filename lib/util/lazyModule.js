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
		if (promise === undefined) {
			promise = Promise.resolve(load());
			// release the loader and everything it holds
			/** @type {(() => T | Promise<T>) | undefined} */
			(load) = undefined;
		}
		return promise;
	};
};

/**
 * Same declaration for a consumer with nowhere to await — a property getter, a
 * dependency template, a generator. `preload` is the await seam those sites
 * need: warm the module at the nearest async boundary and the synchronous read
 * downstream stops doing the loading, which is what `import()` will require.
 * @template T
 * @param {() => T} load loads the module
 * @returns {LazyModuleSyncAccessor<T>} returns the module, loading it once on first call
 */
const lazyModuleSync = (load) => {
	let cached = false;
	/** @type {T | undefined} */
	let result;
	const get = () => {
		if (!cached) {
			result = load();
			cached = true;
			// release the loader and everything it holds
			/** @type {(() => T) | undefined} */
			(load) = undefined;
		}
		return /** @type {T} */ (result);
	};
	get.preload = () =>
		cached
			? Promise.resolve(/** @type {T} */ (result))
			: Promise.resolve().then(get);
	return get;
};

/**
 * @template T
 * @typedef {(() => T) & { preload: () => Promise<T> }} LazyModuleSyncAccessor
 */

/** @typedef {(<T>(load: () => T | Promise<T>) => () => Promise<T>) & { sync: <T>(load: () => T) => LazyModuleSyncAccessor<T> }} LazyModule */

module.exports = /** @type {LazyModule} */ (lazyModule);
module.exports.sync = lazyModuleSync;
