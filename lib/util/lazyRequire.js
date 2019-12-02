/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Ivan Kopeykin @vankop
*/

"use strict";

/* Fork from https://github.com/sindresorhus/import-lazy */

const lazy = (importedModule, requireFn, moduleId) =>
	importedModule === undefined ? requireFn(moduleId) : importedModule;

/**
 * @template T
 * @callback LazyRequire
 * @param {string} moduleId path to module
 * @param {boolean} [isFunction] flag for Proxy type,
 * if true returns function, object otherwise.
 * True by default since webpack modules are mostly functions or classes
 * @returns {T} module export
 */

/**
 * @template T
 * @param {Function} requireFn require function relative to parent module
 * @returns {LazyRequire<T>} require function
 */
module.exports = requireFn => (moduleId, isFunction = true) => {
	let importedModule;

	const handler = {
		get: (target, property) => {
			importedModule = lazy(importedModule, requireFn, moduleId);
			return Reflect.get(importedModule, property);
		},
		apply: (target, thisArgument, argumentsList) => {
			importedModule = lazy(importedModule, requireFn, moduleId);
			return Reflect.apply(importedModule, thisArgument, argumentsList);
		},
		construct: (target, argumentsList) => {
			importedModule = lazy(importedModule, requireFn, moduleId);
			return Reflect.construct(importedModule, argumentsList);
		}
	};

	return new Proxy(isFunction ? function() {} : {}, handler);
};
