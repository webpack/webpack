/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

"use strict";

/**
 * the internal require function
 */
exports.require = "__webpack_require__";

/**
 * the internal exports object
 */
exports.exports = "__webpack_exports__";

/**
 * the internal module object
 */
exports.module = "module";

/**
 * the bundle public path
 */
exports.publicPath = "__webpack_require__.p";

/**
 * the module id of the entry point
 */
exports.entryModuleId = "__webpack_require__.s";

/**
 * the module cache
 */
exports.moduleCache = "__webpack_require__.c";

/**
 * the module functions
 */
exports.moduleFactories = "__webpack_require__.m";

/**
 * the chunk ensure function
 */
exports.ensureChunk = "__webpack_require__.e";

/**
 * an object with handlers to ensure a chunk
 */
exports.ensureChunkHandlers = "__webpack_require__.f";

/**
 * a runtime requirement if ensureChunkHandlers should include loading of chunk needed for entries
 */
exports.ensureChunkIncludeEntries = "__webpack_require__.f (include entries)";

/**
 * the exported property define getter function
 */
exports.definePropertyGetter = "__webpack_require__.d";

/**
 * define compatibility on export
 */
exports.makeNamespaceObject = "__webpack_require__.r";

/**
 * create a fake namespace object
 */
exports.createFakeNamespaceObject = "__webpack_require__.t";

/**
 * compatibility get default export
 */
exports.compatGetDefaultExport = "__webpack_require__.n";

/**
 * harmony module decorator
 */
exports.harmonyModuleDecorator = "__webpack_require__.hmd";

/**
 * node.js module decorator
 */
exports.nodeModuleDecorator = "__webpack_require__.nmd";

/**
 * the webpack hash
 */
exports.getFullHash = "__webpack_require__.h";

/**
 * an object containing all installed WebAssembly.Instance export objects keyed by module id
 */
exports.wasmInstances = "__webpack_require__.w";

/**
 * instantiate a wasm instance from url/filename and importsObject
 */
exports.instantiateWasm = "__webpack_require__.v";

/**
 * the uncaught error handler for the webpack runtime
 */
exports.uncaughtErrorHandler = "__webpack_require__.oe";

/**
 * the script nonce
 */
exports.scriptNonce = "__webpack_require__.nc";

/**
 * the chunk name of the chunk with the runtime
 */
exports.chunkName = "__webpack_require__.cn";

/**
 * the filename of the script part of the chunk
 */
exports.getChunkScriptFilename = "__webpack_require__.u";

/**
 * the filename of the script part of the hot update chunk
 */
exports.getChunkUpdateScriptFilename = "__webpack_require__.hu";

/**
 * startup signal from runtime
 */
exports.startup = "__webpack_require__.x";

/**
 * startup signal from runtime
 */
exports.startupNoDefault = "__webpack_require__.x (no default handler)";

/**
 * interceptor for module exections
 */
exports.interceptModuleExecution = "__webpack_require__.i";

/**
 * the global object
 */
exports.global = "__webpack_require__.g";

/**
 * the filename of the HMR manifest
 */
exports.getUpdateManifestFilename = "__webpack_require__.hmrF";

/**
 * function downloading the update manifest
 */
exports.hmrDownloadManifest = "__webpack_require__.hmrM";

/**
 * array with handler functions to download chunk updates
 */
exports.hmrDownloadUpdateHandlers = "__webpack_require__.hmrC";

/**
 * object with all hmr module data for all modules
 */
exports.hmrModuleData = "__webpack_require__.hmrD";

/**
 * the AMD define function
 */
exports.amdDefine = "__webpack_require__.amdD";

/**
 * the AMD options
 */
exports.amdOptions = "__webpack_require__.amdO";

/**
 * the System polyfill object
 */
exports.system = "__webpack_require__.System";
