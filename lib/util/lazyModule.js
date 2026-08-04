/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Alexander Akait @alexander-akait
*/

"use strict";

const memoize = require("./memoize");

/**
 * Declares a module that loads on first use instead of at require time.
 *
 * Deferred module loading goes through here rather than `memoize` directly, so
 * that every site the move to ecma modules turns into `import()` is the set of
 * callers of this function. The loader stays a thunk over a literal request,
 * which keeps that switch to the `require` keyword plus, for a consumer that
 * cannot await, an earlier seam that resolves the thunk.
 * @template T
 * @param {() => T} load loads the module
 * @returns {() => T} the module, loaded once on first call
 */
const lazyModule = (load) => memoize(load);

module.exports = lazyModule;
