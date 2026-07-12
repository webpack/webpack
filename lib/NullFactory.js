/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

import ModuleFactory from "./ModuleFactory.js";
/** @typedef {import("./ModuleFactory.js").ModuleFactoryCallback} ModuleFactoryCallback */
/** @typedef {import("./ModuleFactory.js").ModuleFactoryCreateData} ModuleFactoryCreateData */

class NullFactory extends ModuleFactory {
	/**
	 * Processes the provided data.
	 * @param {ModuleFactoryCreateData} data data object
	 * @param {ModuleFactoryCallback} callback callback
	 * @returns {void}
	 */
	create(data, callback) {
		return callback();
	}
}

export default NullFactory;

export { NullFactory as "module.exports" };
