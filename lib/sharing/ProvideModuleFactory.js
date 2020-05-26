/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra and Zackary Jackson @ScriptedAlchemy
*/

"use strict";

const ModuleFactory = require("../ModuleFactory");
const ProvideModule = require("./ProvideModule");

/** @typedef {import("../ModuleFactory").ModuleFactoryCreateData} ModuleFactoryCreateData */
/** @typedef {import("../ModuleFactory").ModuleFactoryResult} ModuleFactoryResult */
/** @typedef {import("./ProvideDependency")} ProvideDependency */

class ProvideModuleFactory extends ModuleFactory {
	/**
	 * @param {ModuleFactoryCreateData} data data object
	 * @param {function(Error=, ModuleFactoryResult=): void} callback callback
	 * @returns {void}
	 */
	create(data, callback) {
		const dep = /** @type {ProvideDependency} */ (data.dependencies[0]);
		callback(null, {
			module: new ProvideModule(
				dep.shareScope,
				dep.name,
				dep.version,
				dep.request,
				dep.eager
			)
		});
	}
}

module.exports = ProvideModuleFactory;
