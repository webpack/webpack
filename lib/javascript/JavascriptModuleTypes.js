/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Haijie Xie @hai-x
*/

"use strict";

/** @typedef {"javascript/auto" | "javascript/dynamic" | "javascript/esm"} JavaScriptModuleTypes */
/** @typedef {"runtime" | "fallback-module" | "remote-module" | "provide-module" | "consume-shared-module" | "lazy-compilation-proxy"} WebpackModuleTypes */

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
 * @type {Readonly<"runtime">}
 * This is the module type used for the webpack runtime abstractions.
 */
const WEBPACK_MODULE_TYPE_RUNTIME = "runtime";

/**
 * @type {Readonly<"fallback-module">}
 * This is the module type used for the ModuleFederation feature's FallbackModule class.
 * TODO: Document this better.
 */
const WEBPACK_MODULE_TYPE_FALLBACK = "fallback-module";

/**
 * @type {Readonly<"remote-module">}
 * This is the module type used for the ModuleFederation feature's RemoteModule class.
 * TODO: Document this better.
 */
const WEBPACK_MODULE_TYPE_REMOTE = "remote-module";

/**
 * @type {Readonly<"provide-module">}
 * This is the module type used for the ModuleFederation feature's ProvideModule class.
 * TODO: Document this better.
 */
const WEBPACK_MODULE_TYPE_PROVIDE = "provide-module";

/**
 * @type {Readonly<"consume-shared-module">}
 * This is the module type used for the ModuleFederation feature's ConsumeSharedModule class.
 */
const WEBPACK_MODULE_TYPE_CONSUME_SHARED_MODULE = "consume-shared-module";

/**
 * @type {Readonly<"lazy-compilation-proxy">}
 * Module type used for `experiments.lazyCompilation` feature. See `LazyCompilationPlugin` for more information.
 */
const WEBPACK_MODULE_TYPE_LAZY_COMPILATION_PROXY = "lazy-compilation-proxy";

module.exports.JAVASCRIPT_MODULE_TYPE_AUTO = JAVASCRIPT_MODULE_TYPE_AUTO;
module.exports.JAVASCRIPT_MODULE_TYPE_DYNAMIC = JAVASCRIPT_MODULE_TYPE_DYNAMIC;
module.exports.JAVASCRIPT_MODULE_TYPE_ESM = JAVASCRIPT_MODULE_TYPE_ESM;
module.exports.WEBPACK_MODULE_TYPE_RUNTIME = WEBPACK_MODULE_TYPE_RUNTIME;
module.exports.WEBPACK_MODULE_TYPE_FALLBACK = WEBPACK_MODULE_TYPE_FALLBACK;
module.exports.WEBPACK_MODULE_TYPE_REMOTE = WEBPACK_MODULE_TYPE_REMOTE;
module.exports.WEBPACK_MODULE_TYPE_PROVIDE = WEBPACK_MODULE_TYPE_PROVIDE;
module.exports.WEBPACK_MODULE_TYPE_CONSUME_SHARED_MODULE =
	WEBPACK_MODULE_TYPE_CONSUME_SHARED_MODULE;
module.exports.WEBPACK_MODULE_TYPE_LAZY_COMPILATION_PROXY =
	WEBPACK_MODULE_TYPE_LAZY_COMPILATION_PROXY;
