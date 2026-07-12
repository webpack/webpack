/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Sean Larkin @TheLarkInn
*/

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

/**
 * @type {Readonly<"css/auto">}
 * This is the module type used for CSS files, the module will be parsed as CSS modules if it's filename contains `.module.` or `.modules.`.
 */
const CSS_MODULE_TYPE_AUTO = "css/auto";

/**
 * @type {Readonly<"html">}
 * This is the module type used for HTML files when `experiments.html` is enabled.
 * HTML modules are emitted as HTML assets and can be used as entry points.
 */
const HTML_MODULE_TYPE = "html";

/**
 * @type {Readonly<"asset">}
 * This is the module type used for automatically choosing between `asset/inline`, `asset/resource` based on asset size limit (8096).
 */
const ASSET_MODULE_TYPE = "asset";

/**
 * @type {Readonly<"asset/inline">}
 * This is the module type used for assets that are inlined as a data URI. This is the equivalent of `url-loader`.
 */
const ASSET_MODULE_TYPE_INLINE = "asset/inline";

/**
 * @type {Readonly<"asset/resource">}
 * This is the module type used for assets that are copied to the output directory. This is the equivalent of `file-loader`.
 */
const ASSET_MODULE_TYPE_RESOURCE = "asset/resource";

/**
 * @type {Readonly<"asset/source">}
 * This is the module type used for assets that are imported as source code. This is the equivalent of `raw-loader`.
 */
const ASSET_MODULE_TYPE_SOURCE = "asset/source";

/**
 * @type {Readonly<"asset/bytes">}
 * This is the module type used for assets that are imported as Uint8Array.
 */
const ASSET_MODULE_TYPE_BYTES = "asset/bytes";

/**
 * @type {Readonly<"asset/raw-data-url">}
 * This is the module type used for the ignored asset module.
 */
const ASSET_MODULE_TYPE_RAW_DATA_URL = "asset/raw-data-url";

/**
 * @type {Readonly<"asset/webmanifest">}
 * This is the module type used for a Web App Manifest whose icon URLs are bundled as assets.
 */
const ASSET_MODULE_TYPE_WEBMANIFEST = "asset/webmanifest";

/**
 * @type {Readonly<"runtime">}
 * This is the module type used for the webpack runtime abstractions.
 */
const WEBPACK_MODULE_TYPE_RUNTIME = "runtime";

/**
 * @type {Readonly<"fallback-module">}
 * This is the module type used for the ModuleFederation feature's FallbackModule class.
 */
const WEBPACK_MODULE_TYPE_FALLBACK = "fallback-module";

/**
 * @type {Readonly<"remote-module">}
 * This is the module type used for the ModuleFederation feature's RemoteModule class.
 */
const WEBPACK_MODULE_TYPE_REMOTE = "remote-module";

/**
 * @type {Readonly<"provide-module">}
 * This is the module type used for the ModuleFederation feature's ProvideModule class.
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

/** @typedef {"javascript/auto" | "javascript/dynamic" | "javascript/esm"} JavaScriptModuleTypes */
/** @typedef {"json"} JSONModuleType */
/** @typedef {"webassembly/async" | "webassembly/sync"} WebAssemblyModuleTypes */
/** @typedef {"css" | "css/global" | "css/module" | "css/auto"} CssModuleTypes */
/** @typedef {"html"} HTMLModuleType */
/** @typedef {"asset" | "asset/inline" | "asset/resource" | "asset/source" | "asset/raw-data-url" | "asset/webmanifest"} AssetModuleTypes */
/** @typedef {"runtime" | "fallback-module" | "remote-module" | "provide-module" | "consume-shared-module" | "lazy-compilation-proxy"} WebpackModuleTypes */
/** @typedef {string} UnknownModuleTypes */
/** @typedef {JavaScriptModuleTypes | JSONModuleType | WebAssemblyModuleTypes | CssModuleTypes | HTMLModuleType | AssetModuleTypes | WebpackModuleTypes | UnknownModuleTypes} ModuleTypes */

export { ASSET_MODULE_TYPE };
export { ASSET_MODULE_TYPE_BYTES };
export { ASSET_MODULE_TYPE_INLINE };
export { ASSET_MODULE_TYPE_RAW_DATA_URL };
export { ASSET_MODULE_TYPE_RESOURCE };
export { ASSET_MODULE_TYPE_SOURCE };
export { ASSET_MODULE_TYPE_WEBMANIFEST };
/** @type {CssModuleTypes[]} */
export const CSS_MODULES = [
	CSS_MODULE_TYPE,
	CSS_MODULE_TYPE_GLOBAL,
	CSS_MODULE_TYPE_MODULE,
	CSS_MODULE_TYPE_AUTO
];
export { CSS_MODULE_TYPE };
export { CSS_MODULE_TYPE_AUTO };
export { CSS_MODULE_TYPE_GLOBAL };
export { CSS_MODULE_TYPE_MODULE };
export { HTML_MODULE_TYPE };
/** @type {JavaScriptModuleTypes[]} */
export const JAVASCRIPT_MODULES = [
	JAVASCRIPT_MODULE_TYPE_AUTO,
	JAVASCRIPT_MODULE_TYPE_DYNAMIC,
	JAVASCRIPT_MODULE_TYPE_ESM
];
export { JAVASCRIPT_MODULE_TYPE_AUTO };
export { JAVASCRIPT_MODULE_TYPE_DYNAMIC };
export { JAVASCRIPT_MODULE_TYPE_ESM };
export { JSON_MODULE_TYPE };
/** @type {WebAssemblyModuleTypes[]} */
export const WEBASSEMBLY_MODULES = [
	WEBASSEMBLY_MODULE_TYPE_ASYNC,
	WEBASSEMBLY_MODULE_TYPE_SYNC
];
export { WEBASSEMBLY_MODULE_TYPE_ASYNC };
export { WEBASSEMBLY_MODULE_TYPE_SYNC };
export { WEBPACK_MODULE_TYPE_CONSUME_SHARED_MODULE };
export { WEBPACK_MODULE_TYPE_FALLBACK };
export { WEBPACK_MODULE_TYPE_LAZY_COMPILATION_PROXY };
export { WEBPACK_MODULE_TYPE_PROVIDE };
export { WEBPACK_MODULE_TYPE_REMOTE };
export { WEBPACK_MODULE_TYPE_RUNTIME };
