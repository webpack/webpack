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
 * access to properties of the internal require function/object
 */
exports.requireScope = "__webpack_require__.*";

/**
 * the internal exports object
 */
exports.exports = "__webpack_exports__";

/**
 * top-level this need to be the exports object
 */
exports.thisAsExports = "top-level-this-exports";

/**
 * runtime need to return the exports of the last entry module
 */
exports.returnExportsFromRuntime = "return-exports-from-runtime";

/**
 * the internal module object
 */
exports.module = "module";

/**
 * the internal module object
 */
exports.moduleId = "module.id";

/**
 * the internal module object
 */
exports.moduleLoaded = "module.loaded";

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
 * the module functions, with only write access
 */
exports.moduleFactoriesAddOnly = "__webpack_require__.m (add only)";

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
 * the chunk prefetch function
 */
exports.prefetchChunk = "__webpack_require__.E";

/**
 * an object with handlers to prefetch a chunk
 */
exports.prefetchChunkHandlers = "__webpack_require__.F";

/**
 * the chunk preload function
 */
exports.preloadChunk = "__webpack_require__.G";

/**
 * an object with handlers to preload a chunk
 */
exports.preloadChunkHandlers = "__webpack_require__.H";

/**
 * the exported property define getters function
 */
exports.definePropertyGetters = "__webpack_require__.d";

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
 * instantiate a wasm instance from module exports object, id, hash and importsObject
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
 * function to load a script tag.
 * Arguments: (url: string, done: (event) => void), key?: string | number) => void
 * done function is called when loading has finished or timeout occurred.
 * It will attach to existing script tags with data-webpack == key or src == url.
 */
exports.loadScript = "__webpack_require__.l";

/**
 * the chunk name of the chunk with the runtime
 */
exports.chunkName = "__webpack_require__.cn";

/**
 * the runtime id of the current runtime
 */
exports.runtimeId = "__webpack_require__.j";

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
 * creating a default startup function with the entry modules
 */
exports.startupNoDefault = "__webpack_require__.x (no default handler)";

/**
 * startup signal from runtime but only used to add logic after the startup
 */
exports.startupOnlyAfter = "__webpack_require__.x (only after)";

/**
 * startup signal from runtime but only used to add sync logic before the startup
 */
exports.startupOnlyBefore = "__webpack_require__.x (only before)";

/**
 * method to startup an entrypoint with needed chunks.
 * Signature: (moduleId: Id, chunkIds: Id[]) => any.
 * Returns the exports of the module or a Promise
 */
exports.startupEntrypoint = "__webpack_require__.X";

/**
 * method to install a chunk that was loaded somehow
 * Signature depends on the chunk loading method
 */
exports.externalInstallChunk = "__webpack_require__.C";

/**
 * interceptor for module executions
 */
exports.interceptModuleExecution = "__webpack_require__.i";

/**
 * the global object
 */
exports.global = "__webpack_require__.g";

/**
 * an object with all share scopes
 */
exports.shareScopeMap = "__webpack_require__.S";

/**
 * The sharing init sequence function (only runs once per share scope).
 * Has one argument, the name of the share scope.
 * Creates a share scope if not existing
 */
exports.initializeSharing = "__webpack_require__.I";

/**
 * The current scope when getting a module from a remote
 */
exports.currentRemoteGetScope = "__webpack_require__.R";

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
 * array with handler functions when a module should be invalidated
 */
exports.hmrInvalidateModuleHandlers = "__webpack_require__.hmrI";

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

/**
 * the shorthand for Object.prototype.hasOwnProperty
 * using of it decreases the compiled bundle size
 */
exports.hasOwnProperty = "__webpack_require__.o";

/**
 * the System.register context object
 */
exports.systemContext = "__webpack_require__.y";

/**
 * the baseURI of current document
 */
exports.baseURI = "__webpack_require__.b";
