/*
	MIT License http://www.opensource.org/licenses/mit-license.php
*/

"use strict";

const NormalModule = require("../module/NormalModule");
const makeSerializable = require("../util/makeSerializable");

/**
 * @import {
 * 	NormalModuleBuildInfo,
 * 	NormalModuleCreateData
 * } from "../module/NormalModule"
 */
/** @import JsonData from "./JsonData" */
/** @import { BuildMeta } from "../module/Module" */

/**
 * Defines the build info properties specific to json modules.
 * @typedef {object} KnownJsonModuleBuildInfo
 * @property {JsonData=} jsonData
 */

/** @typedef {NormalModuleBuildInfo & KnownJsonModuleBuildInfo} JsonModuleBuildInfo */

/**
 * A json module before or after its build, typed with its build info.
 * @typedef {NormalModule & { buildInfo?: JsonModuleBuildInfo }} JsonNormalModule
 */

/**
 * A built json module, typed with its build info and build meta.
 * @typedef {NormalModule & { buildInfo: JsonModuleBuildInfo, buildMeta: BuildMeta }} BuiltJsonModule
 */

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
