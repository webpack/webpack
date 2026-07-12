/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

/**
 * the AMD define function
 */
export const amdDefine = "__webpack_require__.amdD";

/**
 * the AMD options
 */
export const amdOptions = "__webpack_require__.amdO";

/**
 * Creates an async module. The body function must be a async function.
 * "module.exports" will be decorated with an AsyncModulePromise.
 * The body function will be called.
 * To handle async dependencies correctly do this: "([a, b, c] = await handleDependencies([a, b, c]));".
 * If "hasAwaitAfterDependencies" is truthy, "handleDependencies()" must be called at the end of the body function.
 * Signature: function(
 * module: Module,
 * body: (handleDependencies: (deps: AsyncModulePromise[]) => Promise<any[]> & () => void,
 * hasAwaitAfterDependencies?: boolean
 * ) => void
 */
export const asyncModule = "__webpack_require__.a";

/**
 * The internal symbol that asyncModule is using.
 */
export const asyncModuleDoneSymbol = "__webpack_require__.aD";

/**
 * The internal symbol that asyncModule is using.
 */
export const asyncModuleExportSymbol = "__webpack_require__.aE";

/**
 * the baseURI of current document
 */
export const baseURI = "__webpack_require__.b";

/**
 * global callback functions for installing chunks
 */
export const chunkCallback = "webpackChunk";

/**
 * the chunk name of the chunk with the runtime
 */
export const chunkName = "__webpack_require__.cn";

/**
 * compatibility get default export
 */
export const compatGetDefaultExport = "__webpack_require__.n";

/**
 * compile a wasm module from id and hash, returning WebAssembly.Module
 */
export const compileWasm = "__webpack_require__.vs";

/**
 * create a fake namespace object
 */
export const createFakeNamespaceObject = "__webpack_require__.t";

/**
 * function to promote a string to a TrustedScript using webpack's Trusted
 * Types policy
 * Arguments: (script: string) => TrustedScript
 */
export const createScript = "__webpack_require__.ts";

/**
 * function to promote a string to a TrustedScriptURL using webpack's Trusted
 * Types policy
 * Arguments: (url: string) => TrustedScriptURL
 */
export const createScriptUrl = "__webpack_require__.tu";

export const cssInjectStyle = "__webpack_require__.is";

/**
 * The current scope when getting a module from a remote
 */
export const currentRemoteGetScope = "__webpack_require__.R";

/**
 * resolve async transitive dependencies for deferred module
 */
export const deferredModuleAsyncTransitiveDependencies =
	"__webpack_require__.zT";

/**
 * the internal symbol for getting the async transitive dependencies for deferred module
 */
export const deferredModuleAsyncTransitiveDependenciesSymbol =
	"__webpack_require__.zS";

/**
 * the exported property define getters function
 */
export const definePropertyGetters = "__webpack_require__.d";

/**
 * the chunk ensure function
 */
export const ensureChunk = "__webpack_require__.e";

/**
 * an object with handlers to ensure a chunk
 */
export const ensureChunkHandlers = "__webpack_require__.f";

/**
 * a runtime requirement if ensureChunkHandlers should include loading of chunk needed for entries
 */
export const ensureChunkIncludeEntries =
	"__webpack_require__.f (include entries)";

/**
 * the module id of the entry point
 */
export const entryModuleId = "__webpack_require__.s";

/**
 * esm module id
 */
export const esmId = "__webpack_esm_id__";

/**
 * esm module ids
 */
export const esmIds = "__webpack_esm_ids__";

/**
 * esm modules
 */
export const esmModules = "__webpack_esm_modules__";

/**
 * esm runtime
 */
export const esmRuntime = "__webpack_esm_runtime__";

/**
 * the internal exports object
 */
export const exports = "__webpack_exports__";

/**
 * method to install a chunk that was loaded somehow
 * Signature: ({ id, ids, modules, runtime }) => void
 */
export const externalInstallChunk = "__webpack_require__.C";

/**
 * the filename of the css part of the chunk
 */
export const getChunkCssFilename = "__webpack_require__.k";

/**
 * the filename of the script part of the chunk
 */
export const getChunkScriptFilename = "__webpack_require__.u";

/**
 * the filename of the css part of the hot update chunk
 */
export const getChunkUpdateCssFilename = "__webpack_require__.hk";

/**
 * the filename of the script part of the hot update chunk
 */
export const getChunkUpdateScriptFilename = "__webpack_require__.hu";

/**
 * the webpack hash
 */
export const getFullHash = "__webpack_require__.h";

/**
 * function to return webpack's Trusted Types policy
 * Arguments: () => TrustedTypePolicy
 */
export const getTrustedTypesPolicy = "__webpack_require__.tt";

/**
 * the filename of the HMR manifest
 */
export const getUpdateManifestFilename = "__webpack_require__.hmrF";

/**
 * the global object
 */
export const global = "__webpack_require__.g";

/**
 * harmony module decorator
 */
export const harmonyModuleDecorator = "__webpack_require__.hmd";

/**
 * a flag when a module/chunk/tree has css modules
 */
export const hasCssModules = "has css modules";

/**
 * a flag when a chunk has a fetch priority
 */
export const hasFetchPriority = "has fetch priority";

/**
 * the shorthand for Object.prototype.hasOwnProperty
 * using of it decreases the compiled bundle size
 */
export const hasOwnProperty = "__webpack_require__.o";

/**
 * function downloading the update manifest
 */
export const hmrDownloadManifest = "__webpack_require__.hmrM";

/**
 * array with handler functions to download chunk updates
 */
export const hmrDownloadUpdateHandlers = "__webpack_require__.hmrC";

/**
 * array with handler functions when a module should be invalidated
 */
export const hmrInvalidateModuleHandlers = "__webpack_require__.hmrI";

/**
 * object with all hmr module data for all modules
 */
export const hmrModuleData = "__webpack_require__.hmrD";

/**
 * the prefix for storing state of runtime modules when hmr is enabled
 */
export const hmrRuntimeStatePrefix = "__webpack_require__.hmrS";

/**
 * The sharing init sequence function (only runs once per share scope).
 * Has one argument, the name of the share scope.
 * Creates a share scope if not existing
 */
export const initializeSharing = "__webpack_require__.I";

/**
 * instantiate a wasm instance from module exports object, id, hash and importsObject
 */
export const instantiateWasm = "__webpack_require__.v";

/**
 * interceptor for module executions
 */
export const interceptModuleExecution = "__webpack_require__.i";

/**
 * function to load a script tag.
 * Arguments: (url: string, done: (event) => void), key?: string | number, chunkId?: string | number) => void
 * done function is called when loading has finished or timeout occurred.
 * It will attach to existing script tags with data-webpack == uniqueName + ":" + key or src == url.
 */
export const loadScript = "__webpack_require__.l";

/**
 * make a deferred namespace object
 */
export const makeDeferredNamespaceObject = "__webpack_require__.z";

/**
 * define compatibility on export
 */
export const makeNamespaceObject = "__webpack_require__.r";

/**
 * make a optimized deferred namespace object
 */
export const makeOptimizedDeferredNamespaceObject = "__webpack_require__.zO";

/**
 * the internal module object
 */
export const module = "module";

/**
 * the module cache
 */
export const moduleCache = "__webpack_require__.c";

/**
 * the module functions
 */
export const moduleFactories = "__webpack_require__.m";

/**
 * the module functions, with only write access
 */
export const moduleFactoriesAddOnly = "__webpack_require__.m (add only)";

/**
 * the internal module object
 */
export const moduleId = "module.id";

/**
 * the internal module object
 */
export const moduleLoaded = "module.loaded";

/**
 * node.js module decorator
 */
export const nodeModuleDecorator = "__webpack_require__.nmd";

/**
 * register deferred code, which will run when certain
 * chunks are loaded.
 * Signature: (chunkIds: Id[], fn: () => any, priority: int >= 0 = 0) => any
 * Returned value will be returned directly when all chunks are already loaded
 * When (priority & 1) it will wait for all other handlers with lower priority to
 * be executed before itself is executed
 */
export const onChunksLoaded = "__webpack_require__.O";

/**
 * the chunk prefetch function
 */
export const prefetchChunk = "__webpack_require__.E";

/**
 * an object with handlers to prefetch a chunk
 */
export const prefetchChunkHandlers = "__webpack_require__.F";

/**
 * the chunk preload function
 */
export const preloadChunk = "__webpack_require__.G";

/**
 * an object with handlers to preload a chunk
 */
export const preloadChunkHandlers = "__webpack_require__.H";

/**
 * the bundle public path
 */
export const publicPath = "__webpack_require__.p";

/**
 * a RelativeURL class when relative URLs are used
 */
export const relativeUrl = "__webpack_require__.U";

/**
 * the internal require function
 */
export const require = "__webpack_require__";

/**
 * access to properties of the internal require function/object
 */
export const requireScope = "__webpack_require__.*";

/**
 * runtime need to return the exports of the last entry module
 */
export const returnExportsFromRuntime = "return-exports-from-runtime";

/**
 * the runtime id of the current runtime
 */
export const runtimeId = "__webpack_require__.j";

/**
 * the script nonce
 */
export const scriptNonce = "__webpack_require__.nc";

/**
 * set .name to "default" for anonymous default exports per ES spec
 */
export const setAnonymousDefaultName = "__webpack_require__.dn";

/**
 * an object with all share scopes
 */
export const shareScopeMap = "__webpack_require__.S";

/**
 * startup signal from runtime
 * This will be called when the runtime chunk has been loaded.
 */
export const startup = "__webpack_require__.x";

/**
 * method to startup an entrypoint with needed chunks.
 * Signature: (moduleId: Id, chunkIds: Id[]) => any.
 * Returns the exports of the module or a Promise
 */
export const startupEntrypoint = "__webpack_require__.X";

/**
 * Describes how this item operation behaves.
 * @deprecated
 * creating a default startup function with the entry modules
 */
export const startupNoDefault = "__webpack_require__.x (no default handler)";

/**
 * startup signal from runtime but only used to add logic after the startup
 */
export const startupOnlyAfter = "__webpack_require__.x (only after)";

/**
 * startup signal from runtime but only used to add sync logic before the startup
 */
export const startupOnlyBefore = "__webpack_require__.x (only before)";

/**
 * the System polyfill object
 */
export const system = "__webpack_require__.System";

/**
 * the System.register context object
 */
export const systemContext = "__webpack_require__.y";

/**
 * top-level this need to be the exports object
 */
export const thisAsExports = "top-level-this-exports";

/**
 * to binary helper, convert base64 to Uint8Array
 */
export const toBinary = "__webpack_require__.tb";

/**
 * the uncaught error handler for the webpack runtime
 */
export const uncaughtErrorHandler = "__webpack_require__.oe";

/**
 * an object containing all installed WebAssembly.Instance export objects keyed by module id
 */
export const wasmInstances = "__webpack_require__.w";

/**
 * the Worker constructor for universal targets (global Worker or worker_threads)
 */
export const worker = "__webpack_require__.wc";
