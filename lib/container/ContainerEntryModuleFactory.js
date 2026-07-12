/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra, Zackary Jackson @ScriptedAlchemy, Marais Rossouw @maraisr
*/

import ModuleFactory from "../ModuleFactory.js";
import ContainerEntryModule from "./ContainerEntryModule.js";
/** @typedef {import("../ModuleFactory.js").ModuleFactoryCallback} ModuleFactoryCallback */
/** @typedef {import("../ModuleFactory.js").ModuleFactoryCreateData} ModuleFactoryCreateData */
/** @typedef {import("./ContainerEntryDependency.js").default} ContainerEntryDependency */

export default class ContainerEntryModuleFactory extends ModuleFactory {
	/**
	 * Processes the provided data.
	 * @param {ModuleFactoryCreateData} data data object
	 * @param {ModuleFactoryCallback} callback callback
	 * @returns {void}
	 */
	create({ dependencies: [dependency] }, callback) {
		const dep = /** @type {ContainerEntryDependency} */ (dependency);
		callback(null, {
			module: new ContainerEntryModule(dep.name, dep.exposes, dep.shareScope)
		});
	}
}

export { ContainerEntryModuleFactory as "module.exports" };
