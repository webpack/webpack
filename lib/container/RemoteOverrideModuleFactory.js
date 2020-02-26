/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra and Zackary Jackson @ScriptedAlchemy
*/

"use strict";

const ModuleFactory = require("../ModuleFactory");
const RemoteOverrideModule = require("./RemoteOverrideModule");

/** @typedef {import("../ModuleFactory").ModuleFactoryCreateData} ModuleFactoryCreateData */
/** @typedef {import("../ModuleFactory").ModuleFactoryResult} ModuleFactoryResult */
/** @typedef {import("./RemoteToOverrideDependency")} RemoteToOverrideDependency */

class RemoteOverrideModuleFactory extends ModuleFactory {
	/**
	 * @param {ModuleFactoryCreateData} data data object
	 * @param {function(Error=, ModuleFactoryResult=): void} callback callback
	 * @returns {void}
	 */
	create(data, callback) {
		const dep =
			/** @type {RemoteToOverrideDependency} */ (data.dependencies[0]);
		callback(null, {
			module: new RemoteOverrideModule(dep.request, dep.overrides)
		});
	}
}

module.exports = RemoteOverrideModuleFactory;
