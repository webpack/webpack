/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

import { createRequire } from "node:module";

const require = createRequire(import.meta.url);

/** @typedef {import("../declarations/WebpackOptions.js").ResolveOptions} ResolveOptions */
/** @typedef {import("./Dependency.js").default} Dependency */
/** @typedef {import("./Module.js").default} Module */

/**
 * Defines the module factory result type used by this module.
 * @typedef {object} ModuleFactoryResult
 * @property {Module=} module the created module or unset if no module was created
 * @property {Set<string>=} fileDependencies
 * @property {Set<string>=} contextDependencies
 * @property {Set<string>=} missingDependencies
 * @property {boolean=} cacheable allow to use the unsafe cache
 */

/** @typedef {string | null} IssuerLayer */

/**
 * Defines the module factory create data context info type used by this module.
 * @typedef {object} ModuleFactoryCreateDataContextInfo
 * @property {string} issuer
 * @property {IssuerLayer} issuerLayer
 * @property {string=} compiler
 */

/**
 * Defines the module factory create data type used by this module.
 * @typedef {object} ModuleFactoryCreateData
 * @property {ModuleFactoryCreateDataContextInfo} contextInfo
 * @property {ResolveOptions=} resolveOptions
 * @property {string} context
 * @property {Dependency[]} dependencies
 */

/**
 * Represents the module factory runtime component.
 * @typedef {(err?: Error | null, result?: ModuleFactoryResult) => void} ModuleFactoryCallback
 */

class ModuleFactory {
	/* istanbul ignore next */
	/**
	 * Processes the provided data.
	 * @abstract
	 * @param {ModuleFactoryCreateData} data data object
	 * @param {ModuleFactoryCallback} callback callback
	 * @returns {void}
	 */
	create(data, callback) {
		const AbstractMethodError =
			/** @type {typeof import("./errors/AbstractMethodError.js").default} */ (
				require("./errors/AbstractMethodError.js")
			);

		throw new AbstractMethodError();
	}
}

export default ModuleFactory;

export { ModuleFactory as "module.exports" };
