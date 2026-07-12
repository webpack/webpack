/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

/** @typedef {import("./ModuleFactory.js").ModuleFactoryCallback} ModuleFactoryCallback */
/** @typedef {import("./ModuleFactory.js").ModuleFactoryCreateData} ModuleFactoryCreateData */
/** @typedef {import("./ModuleGraph.js").default} ModuleGraph */

class SelfModuleFactory {
	/**
	 * Creates an instance of SelfModuleFactory.
	 * @param {ModuleGraph} moduleGraph module graph
	 */
	constructor(moduleGraph) {
		/** @type {ModuleGraph} */
		this.moduleGraph = moduleGraph;
	}

	/**
	 * Processes the provided data.
	 * @param {ModuleFactoryCreateData} data data object
	 * @param {ModuleFactoryCallback} callback callback
	 * @returns {void}
	 */
	create(data, callback) {
		const module = this.moduleGraph.getParentModule(data.dependencies[0]);
		callback(null, {
			module
		});
	}
}

export default SelfModuleFactory;

export { SelfModuleFactory as "module.exports" };
