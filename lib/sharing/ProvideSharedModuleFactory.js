/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra and Zackary Jackson @ScriptedAlchemy
*/

import ModuleFactory from "../ModuleFactory.js";
import ProvideSharedModule from "./ProvideSharedModule.js";
/** @typedef {import("../ModuleFactory.js").ModuleFactoryCallback} ModuleFactoryCallback */
/** @typedef {import("../ModuleFactory.js").ModuleFactoryCreateData} ModuleFactoryCreateData */
/** @typedef {import("./ProvideSharedDependency.js").default} ProvideSharedDependency */

class ProvideSharedModuleFactory extends ModuleFactory {
	/**
	 * Processes the provided data.
	 * @param {ModuleFactoryCreateData} data data object
	 * @param {ModuleFactoryCallback} callback callback
	 * @returns {void}
	 */
	create(data, callback) {
		const dep =
			/** @type {ProvideSharedDependency} */
			(data.dependencies[0]);
		callback(null, {
			module: new ProvideSharedModule(
				dep.shareScope,
				dep.name,
				dep.version,
				dep.request,
				dep.eager
			)
		});
	}
}

export default ProvideSharedModuleFactory;

export { ProvideSharedModuleFactory as "module.exports" };
