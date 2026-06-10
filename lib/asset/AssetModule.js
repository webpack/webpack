/*
	MIT License http://www.opensource.org/licenses/mit-license.php
*/

"use strict";

const NormalModule = require("../NormalModule");
const makeSerializable = require("../util/makeSerializable");

/** @typedef {import("../NormalModule").NormalModuleCreateData} NormalModuleCreateData */

/** @typedef {NormalModuleCreateData & { sideEffectFree?: boolean }} AssetModuleCreateData */

/**
 * Module class for all `asset/*` modules. Asset-specific properties should live here instead of `NormalModule`.
 */
class AssetModule extends NormalModule {
	/**
	 * @param {AssetModuleCreateData} options options object
	 */
	constructor(options) {
		super(options);
		if (options.sideEffectFree) {
			this.factoryMeta = { sideEffectFree: true };
		}
	}
}

makeSerializable(AssetModule, "webpack/lib/asset/AssetModule");

module.exports = AssetModule;
