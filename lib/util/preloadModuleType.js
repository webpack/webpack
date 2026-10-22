/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Alexander Akait @alexander-akait
*/

"use strict";

/** @import Generator from "../module/Generator" */
/** @import Module from "../module/Module" */
/** @import NormalModuleFactory from "../module/NormalModuleFactory" */
/** @import Parser from "../module/Parser" */
/** @typedef {import("./lazyModule").LazyModuleAccessor<new (...args: never[]) => Parser | Generator | Module>} AnyLazyModuleAccessor */

/**
 * Warms the modules a type's `createParser`/`createGenerator`/`createModuleClass`
 * taps read, at the factory's async boundary — those hooks are synchronous, so
 * they cannot await the load themselves.
 * @param {NormalModuleFactory} normalModuleFactory the normal module factory
 * @param {string} pluginName name of the tapping plugin
 * @param {Iterable<[string, AnyLazyModuleAccessor[]]>} table module type to the accessors its taps read
 * @returns {void}
 */
const preloadModuleType = (normalModuleFactory, pluginName, table) => {
	for (const [type, accessors] of table) {
		normalModuleFactory.hooks.prepareModuleType
			.for(type)
			.tapPromise(pluginName, () =>
				Promise.all(accessors.map((accessor) => accessor())).then(
					() => undefined
				)
			);
	}
};

module.exports = preloadModuleType;
