/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Alexander Akait @alexander-akait
*/

"use strict";

/**
 * Declares a module that loads on first use, in the shape a dynamic `import()`
 * has: the accessor resolves to the module and the caller awaits it, so a
 * consumer only fits when it has somewhere to await. The thunk is a `require`
 * until `lib/` moves to ecma modules, which changes that keyword and nothing
 * else — `Promise.resolve` already passes an `import()` promise through.
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

module.exports = lazyModule;
