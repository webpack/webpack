/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Sean Larkin @TheLarkInn
*/

"use strict";

/**
 * @type {Readonly<"javascript/auto">}
 */
const JAVASCRIPT_MODULE_TYPE_AUTO = "javascript/auto";

/**
 * @type {Readonly<"javascript/dynamic">}
 */
const JAVASCRIPT_MODULE_TYPE_DYNAMIC = "javascript/dynamic";

/**
 * @type {Readonly<"javascript/esm">}
 * This is the module type used for _strict_ ES Module syntax. This means that all legacy formats
 * that webpack supports (CommonJS, AMD, SystemJS) are not supported.
 */
const JAVASCRIPT_MODULE_TYPE_ESM = "javascript/esm";

/**
 * @type {Readonly<"json">}
 * This is the module type used for JSON files. JSON files are always parsed as ES Module.
 */
const JSON_MODULE_TYPE = "json";

/**
 * @type {Readonly<"webassembly/async">}
 * This is the module type used for WebAssembly modules. In webpack 5 they are always treated as async modules.
 *
 */
const WEBASSEMBLY_MODULE_TYPE_ASYNC = "webassembly/async";

/**
 * @type {Readonly<"webassembly/sync">}
 * This is the module type used for WebAssembly modules. In webpack 4 they are always treated as sync modules.
 * There is a legacy option to support this usage in webpack 5 and up.
 */
const WEBASSEMBLY_MODULE_TYPE_SYNC = "webassembly/sync";

/**
 * @type {Readonly<"css">}
 * This is the module type used for CSS files.
 */
const CSS_MODULE_TYPE = "css";

/**
 * @type {Readonly<"css/global">}
 * This is the module type used for CSS modules files where you need to use `:local` in selector list to hash classes.
 */
const CSS_MODULE_TYPE_GLOBAL = "css/global";

/**
 * @type {Readonly<"css/module">}
 * This is the module type used for CSS modules files, by default all classes are hashed.
 */
const CSS_MODULE_TYPE_MODULE = "css/module";

exports.JAVASCRIPT_MODULE_TYPE_AUTO = JAVASCRIPT_MODULE_TYPE_AUTO;
exports.JAVASCRIPT_MODULE_TYPE_DYNAMIC = JAVASCRIPT_MODULE_TYPE_DYNAMIC;
exports.JAVASCRIPT_MODULE_TYPE_ESM = JAVASCRIPT_MODULE_TYPE_ESM;
exports.JSON_MODULE_TYPE = JSON_MODULE_TYPE;
exports.WEBASSEMBLY_MODULE_TYPE_ASYNC = WEBASSEMBLY_MODULE_TYPE_ASYNC;
exports.WEBASSEMBLY_MODULE_TYPE_SYNC = WEBASSEMBLY_MODULE_TYPE_SYNC;
exports.CSS_MODULE_TYPE = CSS_MODULE_TYPE;
exports.CSS_MODULE_TYPE_GLOBAL = CSS_MODULE_TYPE_GLOBAL;
exports.CSS_MODULE_TYPE_MODULE = CSS_MODULE_TYPE_MODULE;
