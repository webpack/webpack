/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Ivan Kopeykin @vankop
*/

"use strict";

const ModuleFactory = require("./ModuleFactory");

/** @typedef {import("./ModuleFactory").ModuleFactoryCreateData} ModuleFactoryCreateData */
/** @typedef {import("./ModuleFactory").ModuleFactoryResult} ModuleFactoryResult */
/** @typedef {import("./NormalModuleFactory")} NormalModuleFactory */

/**
 * Ignores error when module is unresolved
 */
class IgnoreErrorModuleFactory extends ModuleFactory {
	/**
	 * @param {NormalModuleFactory} normalModuleFactory normalModuleFactory instance
	 */
	constructor(normalModuleFactory) {
		super();

		this.normalModuleFactory = normalModuleFactory;
	}

	/**
	 * @param {ModuleFactoryCreateData} data data object
	 * @param {function(Error=, ModuleFactoryResult=): void} callback callback
	 * @returns {void}
	 */
	create(data, callback) {
		this.normalModuleFactory.create(data, (err, result) => {
			return callback(null, result);
		});
	}
}

module.exports = IgnoreErrorModuleFactory;
