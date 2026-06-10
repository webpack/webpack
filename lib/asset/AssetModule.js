/*
	MIT License http://www.opensource.org/licenses/mit-license.php
*/

"use strict";

const NormalModule = require("../NormalModule");
const makeSerializable = require("../util/makeSerializable");

/** @typedef {import("../NormalModule").NormalModuleCreateData} NormalModuleCreateData */

/**
 * Module class for all `asset/*` modules. Asset-specific properties should live here instead of `NormalModule`.
 */
class AssetModule extends NormalModule {
	/**
	 * @param {NormalModuleCreateData} options options object
	 * @param {boolean=} sideEffectFree whether asset modules are side-effect-free (`AssetModulesPluginOptions`)
	 */
	constructor(options, sideEffectFree) {
		super(options);
		if (sideEffectFree) {
			this.factoryMeta = { sideEffectFree: true };
		}
	}
}

makeSerializable(AssetModule, "webpack/lib/asset/AssetModule");

module.exports = AssetModule;
