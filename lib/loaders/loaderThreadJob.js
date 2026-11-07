/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Natsu @xiaoxiaojx
*/

"use strict";

const { toError } = require("../errors/ErrorHelpers");
const UnhandledSchemeError = require("../errors/UnhandledSchemeError");
const WorkerJobCloneError = require("../errors/WorkerJobCloneError");
const { getScheme } = require("../util/URLAbsoluteSpecifier");
const { parseResource } = require("../util/identifier");
const memoize = require("../util/memoize");
const WorkerPool = require("../worker/WorkerPool");
const { decodeError } = require("../worker/protocol");

/** @import Compilation from "../Compilation" */
/** @import { ImportModuleOptions } from "./LoaderPlugin" */
/** @import { InputFileSystem } from "../fs/fs" */
/**
 * @import NormalModule, {
 * AnyLoaderContext,
 * LoaderError,
 * LoaderResult,
 * NormalModuleCompilationHooks
 * } from "../module/NormalModule"
 */
/** @import { LoaderResultArgs } from "./LoaderRunner" */
/** @import { RawSourceMap } from "webpack-sources" */
/** @import { ResolveOptionsWithDependencyType } from "../resolve/ResolverFactory" */
/** @import { EncodedError } from "../worker/protocol" */
/** @import { Logger } from "../logging/Logger" */
/**
 * The Logger methods a worker may forward; loader.worker.js's LOGGER_METHODS
 * must match.
 * @typedef {"error" | "debug" | "warn" | "info" | "log" | "assert" | "trace" | "clear" | "status" | "group" | "groupCollapsed" | "groupEnd" | "profile" | "profileEnd" | "time" | "timeLog" | "timeEnd" | "timeAggregate" | "timeAggregateEnd"} LoggerMethod
 */
/**
 * @import {
 * 	WebpackOptionsNormalizedWithDefaults as WebpackOptions
 * } from "../config/defaults"
 */

const getLoaderWorkerPath = memoize(() => require.resolve("./loader.worker"));
const getModuleWarning = memoize(() => require("../errors/ModuleWarning"));
const getModuleError = memoize(() => require("../errors/ModuleError"));

/**
 * What `_doBuild` holds that the thread job needs.
 * @typedef {object} LoaderThreadJobArgs
 * @property {Compilation} compilation the compilation
 * @property {WebpackOptions} options webpack options
 * @property {InputFileSystem} fs the file system the build reads through
 * @property {NormalModuleCompilationHooks} hooks NormalModule's compilation hooks
 * @property {AnyLoaderContext} loaderContext the main-thread loader context
 * @property {() => void} runLocal runs the loader chain on the main thread
 * @property {(err: Error | LoaderError | null | undefined, result: LoaderResult | null | undefined) => void} finishLoaders finishes the build
 */

/**
 * Runs the module's loader chain on a worker thread, or reports that the
 * caller must run it locally.
 * @param {NormalModule} module the module being built
 * @param {LoaderThreadJobArgs} args the context `_doBuild` holds
 * @returns {boolean} true when the job was dispatched or will finish asynchronously; false when the chain must run locally
 */
const runLoaderThreadJob = (module, args) => {
	const {
		compilation,
		options,
		fs,
		hooks,
		loaderContext,
		runLocal,
		finishLoaders
	} = args;

	const pool = WorkerPool.getWorkerPool(compilation.compiler);
	if (
		pool === undefined ||
		pool.options.max === 0 ||
		!WorkerPool.isThreadingAvailable() ||
		compilation._workerLoaderNested > 0 ||
		getScheme(module.resource)
	) {
		return false;
	}
	if (module.loaders.some((loader) => loader.sourceTest !== undefined)) {
		return false;
	}

	const { CachedInputFileSystem } = require("enhanced-resolve");

	// An exact prototype, not `instanceof`: a subclass may override reads and
	// would silently be bypassed by the worker's own fs.
	if (
		Object.getPrototypeOf(fs) !== CachedInputFileSystem.prototype ||
		/** @type {{ fileSystem?: typeof import("graceful-fs") }} */ (fs)
			.fileSystem !== require("graceful-fs")
	) {
		return false;
	}
	if (
		hooks.readResource
			.for(getScheme(module.resource))
			.taps.some((tap) => tap.name !== "FileUriPlugin")
	) {
		return false;
	}
	/** @type {Map<string, Logger>} */
	const loggers = new Map();
	/**
	 * @template T
	 * @param {number} index loader index
	 * @param {() => T} fn call to attribute
	 * @returns {T} the call's result
	 */
	const withLoaderIndex = (index, fn) => {
		const previous = loaderContext.loaderIndex;
		loaderContext.loaderIndex = index;
		try {
			return fn();
		} finally {
			loaderContext.loaderIndex = previous;
		}
	};
	/**
	 * @param {string} method handler name
	 * @param {unknown[]} args arguments
	 * @returns {unknown | Promise<unknown>} the handler result
	 */
	const rpc = (method, args) => {
		switch (method) {
			case "resolve":
				return new Promise((resolve, reject) => {
					loaderContext.resolve(
						/** @type {string} */ (args[0]),
						/** @type {string} */ (args[1]),
						(err, result) => (err ? reject(err) : resolve(result))
					);
				});
			case "getResolve":
				return new Promise((resolve, reject) => {
					loaderContext.getResolve(
						/** @type {ResolveOptionsWithDependencyType} */ (args[0])
					)(
						/** @type {string} */ (args[1]),
						/** @type {string} */ (args[2]),
						(err, result) => (err ? reject(err) : resolve(result))
					);
				});
			case "loadModule":
				return new Promise((resolve, reject) => {
					compilation._workerLoaderNested++;
					try {
						loaderContext.loadModule(
							/** @type {string} */ (args[0]),
							(
								/** @type {Error | null} */ err,
								/** @type {string | Buffer | undefined} */ source,
								/** @type {RawSourceMap | null | undefined} */ sourceMap
							) => {
								compilation._workerLoaderNested--;
								if (err) reject(err);
								else resolve([source, sourceMap]);
							}
						);
					} catch (error) {
						compilation._workerLoaderNested--;
						reject(error);
					}
				});
			case "importModule":
				compilation._workerLoaderNested++;
				return new Promise((resolve, reject) => {
					try {
						loaderContext.importModule(
							/** @type {string} */ (args[0]),
							/** @type {ImportModuleOptions | undefined} */ (args[1]),
							(
								/** @type {Error | null | undefined} */ err,
								/** @type {unknown} */ result
							) => {
								compilation._workerLoaderNested--;
								if (err) reject(err);
								else resolve(result);
							}
						);
					} catch (error) {
						compilation._workerLoaderNested--;
						reject(error);
					}
				});
			case "readResource": {
				const resourcePath = /** @type {string} */ (args[0]);
				const scheme = getScheme(resourcePath);
				const resourceContext = /** @type {AnyLoaderContext} */ ({
					addDependency: (dependency) => {
						loaderContext.addDependency(dependency);
					},
					fs: loaderContext.fs,
					_module: undefined,
					resourcePath,
					resource: resourcePath
				});
				return new Promise((resolve, reject) => {
					hooks.readResource
						.for(scheme)
						.callAsync(resourceContext, (err, result) => {
							if (err) {
								reject(err);
							} else if (typeof result !== "string" && !result) {
								reject(
									new UnhandledSchemeError(
										/** @type {string} */ (scheme),
										resourcePath
									)
								);
							} else {
								resolve(result);
							}
						});
				});
			}
			case "emitWarning": {
				const index = /** @type {number | undefined} */ (args[1]);
				const warning = decodeError(/** @type {EncodedError} */ (args[0]));
				if (index === undefined) {
					// The main thread adds its source-map warning module-level,
					// without a loader, so keep the same attribution here.
					module.addWarning(new (getModuleWarning())(warning));
				} else {
					withLoaderIndex(index, () => loaderContext.emitWarning(warning));
				}
				return undefined;
			}
			case "emitError": {
				const index = /** @type {number | undefined} */ (args[1]);
				const error = decodeError(/** @type {EncodedError} */ (args[0]));
				if (index === undefined) {
					module.addError(new (getModuleError())(error));
				} else {
					withLoaderIndex(index, () => loaderContext.emitError(error));
				}
				return undefined;
			}
			case "getLogger": {
				const name = /** @type {string} */ (args[0]);
				const index = /** @type {number} */ (args[1]);
				const key = `${index}|${name}`;
				loggers.set(
					key,
					withLoaderIndex(index, () => loaderContext.getLogger(name))
				);
				return undefined;
			}
			case "logger": {
				const name = /** @type {string} */ (args[0]);
				const index = /** @type {number} */ (args[3]);
				const key = `${index}|${name}`;
				const logger = loggers.get(key);
				if (logger !== undefined) {
					const log = /** @type {(...args: unknown[]) => void} */ (
						logger[/** @type {LoggerMethod} */ (args[1])]
					);
					log.call(logger, .../** @type {unknown[]} */ (args[2]));
				}
				return undefined;
			}
		}
		throw new Error(`Unknown loader worker call: ${method}`);
	};
	const resource = parseResource(module.resource);
	const data = {
		resource: module.resource,
		resourcePath: resource.path,
		resourceQuery: resource.query,
		resourceFragment: resource.fragment,
		context: module.context,
		loaders: module.loaders,
		sourceMap: loaderContext.sourceMap,
		extractSourceMap: module.extractSourceMap,
		useSourceMap: module.useSourceMap,
		useSimpleSourceMap: module.useSimpleSourceMap,
		validate: options.validate,
		loader: options.loader,
		mode: options.mode,
		target: loaderContext.target,
		minimize: options.optimization.minimize,
		rootContext: options.context,
		environment: loaderContext.environment,
		hot: module.hot,
		compiler: {
			fsStartTime: compilation.compiler.fsStartTime,
			options: { plugins: [] }
		},
		compilation: {
			outputOptions: {
				hashFunction: compilation.outputOptions.hashFunction,
				hashDigest: compilation.outputOptions.hashDigest,
				hashDigestLength: compilation.outputOptions.hashDigestLength,
				hashSalt: compilation.outputOptions.hashSalt,
				uniqueName: compilation.outputOptions.uniqueName
			},
			options: { devtool: options.devtool },
			hash: compilation.hash,
			fullHash: compilation.fullHash
		}
	};
	pool.runJob(getLoaderWorkerPath(), "runLoaders", [data], { rpc }).then(
		(result) => {
			const workerResult = /** @type {LoaderResult} */ (result);
			const loaderResult = Array.isArray(workerResult.result)
				? /** @type {LoaderResultArgs} */ (
						/** @type {(string | Uint8Array)[]} */ (workerResult.result).map(
							(value) =>
								value instanceof Uint8Array && !Buffer.isBuffer(value)
									? Buffer.from(value)
									: value
						)
					)
				: workerResult.result;
			finishLoaders(null, {
				result: loaderResult,
				cacheable: workerResult.cacheable,
				fileDependencies: workerResult.fileDependencies,
				contextDependencies: workerResult.contextDependencies,
				missingDependencies: workerResult.missingDependencies,
				buildDependencies: workerResult.buildDependencies,
				notCacheableReasons: workerResult.notCacheableReasons || []
			});
		},
		(/** @type {ThrownValue} */ error) => {
			if (error instanceof WorkerJobCloneError) {
				runLocal();
				return;
			}
			finishLoaders(toError(error), null);
		}
	);
	return true;
};

module.exports = runLoaderThreadJob;
