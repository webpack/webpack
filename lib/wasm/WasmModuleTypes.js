/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Haijie Xie @hai-x
*/

"use strict";

/** @typedef {"webassembly/async" | "webassembly/sync"} WebAssemblyModuleTypes */

/**
 * @type {Readonly<"webassembly/async">}
 * This is the module type used for WebAssembly modules. In webpack 5 they are always treated as async modules.
 */
const WEBASSEMBLY_MODULE_TYPE_ASYNC = "webassembly/async";

/**
 * @type {Readonly<"webassembly/sync">}
 * This is the module type used for WebAssembly modules. In webpack 4 they are always treated as sync modules.
 * There is a legacy option to support this usage in webpack 5 and up.
 */
const WEBASSEMBLY_MODULE_TYPE_SYNC = "webassembly/sync";

module.exports.WEBASSEMBLY_MODULE_TYPE_ASYNC = WEBASSEMBLY_MODULE_TYPE_ASYNC;
module.exports.WEBASSEMBLY_MODULE_TYPE_SYNC = WEBASSEMBLY_MODULE_TYPE_SYNC;
module.exports.WEBASSEMBLY_MODULES = [
	WEBASSEMBLY_MODULE_TYPE_SYNC,
	WEBASSEMBLY_MODULE_TYPE_SYNC
];
