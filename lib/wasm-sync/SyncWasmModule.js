/*
	MIT License http://www.opensource.org/licenses/mit-license.php
*/

"use strict";

const NormalModule = require("../NormalModule");
const makeSerializable = require("../util/makeSerializable");

/** @typedef {import("../Module").BuildMeta} BuildMeta */
/** @typedef {import("../NormalModule").NormalModuleCreateData} NormalModuleCreateData */

/**
 * Defines the build meta properties specific to sync wasm modules.
 * @typedef {object} KnownSyncWasmModuleBuildMeta
 * @property {Record<string, string>=} jsIncompatibleExports
 */

/** @typedef {BuildMeta & KnownSyncWasmModuleBuildMeta} SyncWasmModuleBuildMeta */

/**
 * Module class for `webassembly/sync` modules. Wasm-specific properties should live here instead of `NormalModule`.
 */
class SyncWasmModule extends NormalModule {
	/**
	 * @param {NormalModuleCreateData} options options object
	 */
	constructor(options) {
		super(options);

		// Redeclared with the sync wasm specific shape
		/** @type {SyncWasmModuleBuildMeta | undefined} */
		this.buildMeta = undefined;
	}
}

makeSerializable(SyncWasmModule, "webpack/lib/wasm-sync/SyncWasmModule");

module.exports = SyncWasmModule;
