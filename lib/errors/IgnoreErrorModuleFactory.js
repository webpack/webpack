/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Ivan Kopeykin @vankop
*/

import ModuleFactory from "../ModuleFactory.js";
/** @typedef {import("../ModuleFactory.js").ModuleFactoryCallback} ModuleFactoryCallback */
/** @typedef {import("../ModuleFactory.js").ModuleFactoryCreateData} ModuleFactoryCreateData */
/** @typedef {import("../NormalModuleFactory.js").default} NormalModuleFactory */

/**
 * Ignores error when module is unresolved
 */
class IgnoreErrorModuleFactory extends ModuleFactory {
	/**
	 * Creates an instance of IgnoreErrorModuleFactory.
	 * @param {NormalModuleFactory} normalModuleFactory normalModuleFactory instance
	 */
	constructor(normalModuleFactory) {
		super();

		/** @type {NormalModuleFactory} */
		this.normalModuleFactory = normalModuleFactory;
	}

	/**
	 * Processes the provided data.
	 * @param {ModuleFactoryCreateData} data data object
	 * @param {ModuleFactoryCallback} callback callback
	 * @returns {void}
	 */
	create(data, callback) {
		this.normalModuleFactory.create(data, (err, result) =>
			callback(null, result)
		);
	}
}

export default IgnoreErrorModuleFactory;

export { IgnoreErrorModuleFactory as "module.exports" };
