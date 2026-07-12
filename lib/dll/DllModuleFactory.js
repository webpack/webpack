/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

import ModuleFactory from "../ModuleFactory.js";
import DllModule from "./DllModule.js";
/** @typedef {import("../ModuleFactory.js").ModuleFactoryCallback} ModuleFactoryCallback */
/** @typedef {import("../ModuleFactory.js").ModuleFactoryCreateData} ModuleFactoryCreateData */
/** @typedef {import("../dependencies/DllEntryDependency.js").default} DllEntryDependency */

class DllModuleFactory extends ModuleFactory {
	constructor() {
		super();
		this.hooks = Object.freeze({});
	}

	/**
	 * Processes the provided data.
	 * @param {ModuleFactoryCreateData} data data object
	 * @param {ModuleFactoryCallback} callback callback
	 * @returns {void}
	 */
	create(data, callback) {
		const dependency = /** @type {DllEntryDependency} */ (data.dependencies[0]);
		callback(null, {
			module: new DllModule(
				data.context,
				dependency.dependencies,
				dependency.name
			)
		});
	}
}

export default DllModuleFactory;

export { DllModuleFactory as "module.exports" };
