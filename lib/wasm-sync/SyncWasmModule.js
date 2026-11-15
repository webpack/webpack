/*
	MIT License http://www.opensource.org/licenses/mit-license.php
*/

"use strict";

const NormalModule = require("../module/NormalModule");
const makeSerializable = require("../util/makeSerializable");

/** @import { BuildMeta } from "../module/Module" */
/**
 * @import {
 * 	NormalModuleBuildInfo,
 * 	NormalModuleCreateData
 * } from "../module/NormalModule"
 */

/**
 * Defines the build meta properties specific to sync wasm modules.
 * @typedef {object} KnownSyncWasmModuleBuildMeta
 * @property {Record<string, string>=} jsIncompatibleExports
 */

/** @typedef {BuildMeta & KnownSyncWasmModuleBuildMeta} SyncWasmModuleBuildMeta */

/**
 * A sync wasm module before or after its build, typed with its build meta.
 * @typedef {NormalModule & { buildMeta?: SyncWasmModuleBuildMeta }} SyncWasmNormalModule
 */

/**
 * A built sync wasm module, typed with its build info and build meta.
 * @typedef {NormalModule & { buildInfo: NormalModuleBuildInfo, buildMeta: SyncWasmModuleBuildMeta }} BuiltSyncWasmModule
 */

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
