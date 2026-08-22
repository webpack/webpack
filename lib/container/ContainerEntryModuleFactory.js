/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra, Zackary Jackson @ScriptedAlchemy, Marais Rossouw @maraisr
*/

"use strict";

const ModuleFactory = require("../ModuleFactory");
const ContainerEntryModule = require("./ContainerEntryModule");

/**
 * @import {
 * 	ModuleFactoryCallback,
 * 	ModuleFactoryCreateData
 * } from "../ModuleFactory"
 */
/** @import ContainerEntryDependency from "./ContainerEntryDependency" */

module.exports = class ContainerEntryModuleFactory extends ModuleFactory {
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
};
