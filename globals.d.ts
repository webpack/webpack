/**
 * Webpack Global Variables Type Definitions
 *
 * This file defines the types for webpack's internal global variables that are
 * injected into bundles at runtime. These globals are used internally by webpack's
 * runtime to manage module loading, code splitting, hot module replacement,
 * and other runtime operations.
 *
 * @example
 * import { publicPath, require as webpackRequire } from "webpack/globals";
 */

/**
 * the AMD define function
 */
export const amdDefine: string;

/**
 * the AMD options
 */
export const amdOptions: string;

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
export const asyncModule: string;

/**
 * The internal symbol that asyncModule is using.
 */
export const asyncModuleDoneSymbol: string;

/**
 * The internal symbol that asyncModule is using.
 */
export const asyncModuleExportSymbol: string;

/**
 * the baseURI of current document
 */
export const baseURI: string;

/**
 * global callback functions for installing chunks
 */
export const chunkCallback: string;

/**
 * the chunk name of the chunk with the runtime
 */
export const chunkName: string;

/**
 * compatibility get default export
 */
export const compatGetDefaultExport: string;

/**
 * create a fake namespace object
 */
export const createFakeNamespaceObject: string;

/**
 * function to promote a string to a TrustedScript using webpack's Trusted
 * Types policy
 * Arguments: (script: string) => TrustedScript
 */
export const createScript: string;

/**
 * function to promote a string to a TrustedScriptURL using webpack's Trusted
 * Types policy
 * Arguments: (url: string) => TrustedScriptURL
 */
export const createScriptUrl: string;

/**
 * merge multiple CSS stylesheets (CSSStyleSheet or string) into one CSS text string
 * Arguments: (sheets: Array<CSSStyleSheet | string> | CSSStyleSheet | string) => string
 */
export const cssMergeStyleSheets: string;

/**
 * The current scope when getting a module from a remote
 */
export const currentRemoteGetScope: string;

/**
 * resolve async transitive dependencies for deferred module
 */
export const deferredModuleAsyncTransitiveDependencies: string;

/**
 * the internal symbol for getting the async transitive dependencies for deferred module
 */
export const deferredModuleAsyncTransitiveDependenciesSymbol: string;

/**
 * the exported property define getters function
 */
export const definePropertyGetters: string;

/**
 * the chunk ensure function
 */
export const ensureChunk: string;

/**
 * an object with handlers to ensure a chunk
 */
export const ensureChunkHandlers: string;

/**
 * a runtime requirement if ensureChunkHandlers should include loading of chunk needed for entries
 */
export const ensureChunkIncludeEntries: string;

/**
 * the module id of the entry point
 */
export const entryModuleId: string;

/**
 * esm module id
 */
export const esmId: string;

/**
 * esm module ids
 */
export const esmIds: string;

/**
 * esm modules
 */
export const esmModules: string;

/**
 * esm runtime
 */
export const esmRuntime: string;

/**
 * the internal exports object
 */
export const exports: string;

/**
 * method to install a chunk that was loaded somehow
 * Signature: ({ id, ids, modules, runtime }) => void
 */
export const externalInstallChunk: string;

/**
 * the filename of the css part of the chunk
 */
export const getChunkCssFilename: string;

/**
 * the filename of the script part of the chunk
 */
export const getChunkScriptFilename: string;

/**
 * the filename of the css part of the hot update chunk
 */
export const getChunkUpdateCssFilename: string;

/**
 * the filename of the script part of the hot update chunk
 */
export const getChunkUpdateScriptFilename: string;

/**
 * the webpack hash
 */
export const getFullHash: string;

/**
 * function to return webpack's Trusted Types policy
 * Arguments: () => TrustedTypePolicy
 */
export const getTrustedTypesPolicy: string;

/**
 * the filename of the HMR manifest
 */
export const getUpdateManifestFilename: string;

/**
 * the global object
 */
export const global: string;

/**
 * harmony module decorator
 */
export const harmonyModuleDecorator: string;

/**
 * a flag when a module/chunk/tree has css modules
 */
export const hasCssModules: string;

/**
 * a flag when a chunk has a fetch priority
 */
export const hasFetchPriority: string;

/**
 * the shorthand for Object.prototype.hasOwnProperty
 * using of it decreases the compiled bundle size
 */
export const hasOwnProperty: string;

/**
 * function downloading the update manifest
 */
export const hmrDownloadManifest: string;

/**
 * array with handler functions to download chunk updates
 */
export const hmrDownloadUpdateHandlers: string;

/**
 * array with handler functions when a module should be invalidated
 */
export const hmrInvalidateModuleHandlers: string;

/**
 * object with all hmr module data for all modules
 */
export const hmrModuleData: string;

/**
 * the prefix for storing state of runtime modules when hmr is enabled
 */
export const hmrRuntimeStatePrefix: string;

/**
 * The sharing init sequence function (only runs once per share scope).
 * Has one argument, the name of the share scope.
 * Creates a share scope if not existing
 */
export const initializeSharing: string;

/**
 * instantiate a wasm instance from module exports object, id, hash and importsObject
 */
export const instantiateWasm: string;

/**
 * interceptor for module executions
 */
export const interceptModuleExecution: string;

/**
 * function to load a script tag.
 * Arguments: (url: string, done: (event) => void), key?: string | number, chunkId?: string | number) => void
 * done function is called when loading has finished or timeout occurred.
 * It will attach to existing script tags with data-webpack == uniqueName + ":" + key or src == url.
 */
export const loadScript: string;

/**
 * make a deferred namespace object
 */
export const makeDeferredNamespaceObject: string;

/**
 * define compatibility on export
 */
export const makeNamespaceObject: string;

/**
 * make a optimized deferred namespace object
 */
export const makeOptimizedDeferredNamespaceObject: string;

/**
 * the internal module object
 */
export const module: string;

/**
 * the module cache
 */
export const moduleCache: string;

/**
 * the module functions
 */
export const moduleFactories: string;

/**
 * the module functions, with only write access
 */
export const moduleFactoriesAddOnly: string;

/**
 * the internal module object
 */
export const moduleId: string;

/**
 * the internal module object
 */
export const moduleLoaded: string;

/**
 * node.js module decorator
 */
export const nodeModuleDecorator: string;

/**
 * register deferred code, which will run when certain
 * chunks are loaded.
 * Signature: (chunkIds: Id[], fn: () => any, priority: int >= 0 = 0) => any
 * Returned value will be returned directly when all chunks are already loaded
 * When (priority & 1) it will wait for all other handlers with lower priority to
 * be executed before itself is executed
 */
export const onChunksLoaded: string;

/**
 * the chunk prefetch function
 */
export const prefetchChunk: string;

/**
 * an object with handlers to prefetch a chunk
 */
export const prefetchChunkHandlers: string;

/**
 * the chunk preload function
 */
export const preloadChunk: string;

/**
 * an object with handlers to preload a chunk
 */
export const preloadChunkHandlers: string;

/**
 * the bundle public path
 */
export const publicPath: string;

/**
 * a RelativeURL class when relative URLs are used
 */
export const relativeUrl: string;

/**
 * the internal require function
 */
export const require: string;

/**
 * access to properties of the internal require function/object
 */
export const requireScope: string;

/**
 * runtime need to return the exports of the last entry module
 */
export const returnExportsFromRuntime: string;

/**
 * the runtime id of the current runtime
 */
export const runtimeId: string;

/**
 * the script nonce
 */
export const scriptNonce: string;

/**
 * an object with all share scopes
 */
export const shareScopeMap: string;

/**
 * startup signal from runtime
 * This will be called when the runtime chunk has been loaded.
 */
export const startup: string;

/**
 * method to startup an entrypoint with needed chunks.
 * Signature: (moduleId: Id, chunkIds: Id[]) => any.
 * Returns the exports of the module or a Promise
 */
export const startupEntrypoint: string;

/**
 * @deprecated
 * creating a default startup function with the entry modules
 */
export const startupNoDefault: string;

/**
 * startup signal from runtime but only used to add logic after the startup
 */
export const startupOnlyAfter: string;

/**
 * startup signal from runtime but only used to add sync logic before the startup
 */
export const startupOnlyBefore: string;

/**
 * the System polyfill object
 */
export const system: string;

/**
 * the System.register context object
 */
export const systemContext: string;

/**
 * top-level this need to be the exports object
 */
export const thisAsExports: string;

/**
 * to binary helper, convert base64 to Uint8Array
 */
export const toBinary: string;

/**
 * the uncaught error handler for the webpack runtime
 */
export const uncaughtErrorHandler: string;

/**
 * an object containing all installed WebAssembly.Instance export objects keyed by module id
 */
export const wasmInstances: string;
