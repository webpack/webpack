/*
	MIT License http://www.opensource.org/licenses/mit-license.php
*/

"use strict";

const NormalModule = require("../NormalModule");
const makeSerializable = require("../util/makeSerializable");

/** @typedef {import("../Compilation").AssetInfo} AssetInfo */
/** @typedef {import("../NormalModule").NormalModuleBuildInfo} NormalModuleBuildInfo */
/** @typedef {import("../NormalModule").NormalModuleCreateData} NormalModuleCreateData */

/**
 * Defines the build info properties specific to asset modules.
 * @typedef {object} KnownAssetModuleBuildInfo
 * @property {boolean=} dataUrl whether the asset is inlined as a data url
 * @property {string=} filename
 * @property {AssetInfo=} assetInfo
 * @property {string=} fullContentHash
 */

/** @typedef {NormalModuleBuildInfo & KnownAssetModuleBuildInfo} AssetModuleBuildInfo */

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

		// Redeclared with the asset specific shape
		/** @type {AssetModuleBuildInfo | undefined} */
		this.buildInfo = undefined;
		if (sideEffectFree) {
			this.factoryMeta = { sideEffectFree: true };
		}
	}
}

makeSerializable(AssetModule, "webpack/lib/asset/AssetModule");

module.exports = AssetModule;
