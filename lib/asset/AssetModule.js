/*
	MIT License http://www.opensource.org/licenses/mit-license.php
*/

"use strict";

const NormalModule = require("../NormalModule");
const makeSerializable = require("../util/makeSerializable");

/** @import { AssetInfo } from "../Compilation" */
/**
 * @import {
 * 	NormalModuleBuildInfo,
 * 	NormalModuleCreateData
 * } from "../NormalModule"
 */

/**
 * Defines the build info properties specific to asset modules.
 * @typedef {object} KnownAssetModuleBuildInfo
 * @property {boolean=} dataUrl whether the asset is inlined as a data url
 * @property {string=} filename
 * @property {AssetInfo=} assetInfo
 * @property {string=} fullContentHash
 * @property {string=} assetResource the resource this asset is named after, when
 * something re-encoded it. Unlike `matchResource` this is serialized, so a
 * rename set while building survives the persistent cache
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
