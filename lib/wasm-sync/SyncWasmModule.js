/*
	MIT License http://www.opensource.org/licenses/mit-license.php
*/

"use strict";

const NormalModule = require("../NormalModule");
const makeSerializable = require("../util/makeSerializable");

/**
 * Module class for `webassembly/sync` modules. Wasm-specific properties should live here instead of `NormalModule`.
 */
class SyncWasmModule extends NormalModule {}

makeSerializable(SyncWasmModule, "webpack/lib/wasm-sync/SyncWasmModule");

module.exports = SyncWasmModule;
