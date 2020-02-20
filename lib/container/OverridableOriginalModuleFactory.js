/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

"use strict";

const ModuleFactory = require("../ModuleFactory");

/** @typedef {import("../ModuleFactory").ModuleFactoryCreateData} ModuleFactoryCreateData */
/** @typedef {import("../ModuleFactory").ModuleFactoryResult} ModuleFactoryResult */
/** @typedef {import("./OverridableOriginalDependency")} OverridableOriginalDependency */

class OverridableOriginalModuleFactory extends ModuleFactory {
	/**
	 * @param {ModuleFactoryCreateData} data data object
	 * @param {function(Error=, ModuleFactoryResult=): void} callback callback
	 * @returns {void}
	 */
	create(data, callback) {
		const dep =
			/** @type {OverridableOriginalDependency} */ (data.dependencies[0]);
		callback(null, {
			module: dep.originalModule
		});
	}
}

module.exports = OverridableOriginalModuleFactory;
