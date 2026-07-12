/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra, Zackary Jackson @ScriptedAlchemy, Marais Rossouw @maraisr
*/

import ModuleFactory from "../ModuleFactory.js";
import FallbackModule from "./FallbackModule.js";
/** @typedef {import("../ModuleFactory.js").ModuleFactoryCallback} ModuleFactoryCallback */
/** @typedef {import("../ModuleFactory.js").ModuleFactoryCreateData} ModuleFactoryCreateData */
/** @typedef {import("./FallbackDependency.js").default} FallbackDependency */

export default class FallbackModuleFactory extends ModuleFactory {
	/**
	 * Processes the provided data.
	 * @param {ModuleFactoryCreateData} data data object
	 * @param {ModuleFactoryCallback} callback callback
	 * @returns {void}
	 */
	create({ dependencies: [dependency] }, callback) {
		const dep = /** @type {FallbackDependency} */ (dependency);
		callback(null, {
			module: new FallbackModule(dep.requests)
		});
	}
}

export { FallbackModuleFactory as "module.exports" };
