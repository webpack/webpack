/*
	MIT License http://www.opensource.org/licenses/mit-license.php
*/

import NormalModule from "../NormalModule.js";
import makeSerializable from "../util/makeSerializable.js";
/** @typedef {import("../Module.js").BuildMeta} BuildMeta */
/** @typedef {import("../NormalModule.js").NormalModuleCreateData} NormalModuleCreateData */

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

export default SyncWasmModule;

export { SyncWasmModule as "module.exports" };
