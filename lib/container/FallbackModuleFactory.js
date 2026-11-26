/*
	MIT License https://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra, Zackary Jackson @ScriptedAlchemy, Marais Rossouw @maraisr
*/

"use strict";

const ModuleFactory = require("../module/ModuleFactory");
const FallbackModule = require("./FallbackModule");

/**
 * @import {
 * 	ModuleFactoryCallback,
 * 	ModuleFactoryCreateData
 * } from "../module/ModuleFactory.js"
 */
/** @import FallbackDependency from "./FallbackDependency.js" */

module.exports = class FallbackModuleFactory extends ModuleFactory {
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
};
