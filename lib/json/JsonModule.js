/*
	MIT License http://www.opensource.org/licenses/mit-license.php
*/

"use strict";

const NormalModule = require("../NormalModule");
const makeSerializable = require("../util/makeSerializable");

/** @typedef {import("../NormalModule").NormalModuleBuildInfo} NormalModuleBuildInfo */
/** @typedef {import("../NormalModule").NormalModuleCreateData} NormalModuleCreateData */
/** @typedef {import("./JsonData")} JsonData */

/**
 * Defines the build info properties specific to json modules.
 * @typedef {object} KnownJsonModuleBuildInfo
 * @property {JsonData=} jsonData
 */

/** @typedef {NormalModuleBuildInfo & KnownJsonModuleBuildInfo} JsonModuleBuildInfo */

/**
 * Module class for `json` modules. JSON-specific properties should live here instead of `NormalModule`.
 */
class JsonModule extends NormalModule {
	/**
	 * @param {NormalModuleCreateData} options options object
	 */
	constructor(options) {
		super(options);

		// Redeclared with the json specific shape
		/** @type {JsonModuleBuildInfo | undefined} */
		this.buildInfo = undefined;
	}
}

makeSerializable(JsonModule, "webpack/lib/json/JsonModule");

module.exports = JsonModule;
