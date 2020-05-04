/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra and Zackary Jackson @ScriptedAlchemy
*/

"use strict";

const ModuleFactory = require("../ModuleFactory");
const RemoteOverridesModule = require("./RemoteOverridesModule");

/** @typedef {import("../ModuleFactory").ModuleFactoryCreateData} ModuleFactoryCreateData */
/** @typedef {import("../ModuleFactory").ModuleFactoryResult} ModuleFactoryResult */
/** @typedef {import("./RemoteOverridesDependency")} RemoteOverridesDependency */

class RemoteOverridesModuleFactory extends ModuleFactory {
	/**
	 * @param {ModuleFactoryCreateData} data data object
	 * @param {function(Error=, ModuleFactoryResult=): void} callback callback
	 * @returns {void}
	 */
	create(data, callback) {
		const dep = /** @type {RemoteOverridesDependency} */ (data.dependencies[0]);
		callback(null, {
			module: new RemoteOverridesModule(dep.overrides)
		});
	}
}

module.exports = RemoteOverridesModuleFactory;
