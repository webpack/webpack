/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Natsu @xiaoxiaojx
*/

"use strict";

const fs = require("fs");
const NativeModule = require("module");
const querystring = require("querystring");
const { toError } = require("../errors/ErrorHelpers");
const createHash = require("../util/createHash");
const { absolutify, contextify } = require("../util/identifier");
const parseJson = require("../util/parseJson");
const { encodeError } = require("../worker/protocol");
const { runLoaders } = require("./LoaderRunner");

/** @typedef {import("../worker/WorkerChild").LoaderContext} LoaderContext */
/** @typedef {import("../module/NormalModule").LoaderItem} LoaderItem */
/** @typedef {import("../module/NormalModule").LoaderResult} LoaderResult */
/** @import { ImportModuleOptions } from "./LoaderPlugin" */
/** @import { ValidatedValue } from "../util/validateSchema" */
/** @typedef {import("./LoaderRunner").LoaderResultArgs} LoaderResultArgs */
/** @typedef {import("../../declarations/WebpackOptions").Environment} Environment */
/** @typedef {import("../../declarations/WebpackOptions").HashFunction} HashFunction */
/** @typedef {import("../../declarations/WebpackOptions").Plugins} Plugins */
/** @typedef {(value: unknown) => boolean} PrecompiledCheck */
/** @typedef {import("schema-utils").Schema} Schema */
/** @typedef {import("webpack-sources").RawSourceMap} RawSourceMap */
/** @typedef {import("schema-utils").ValidationErrorConfiguration} ValidationErrorConfiguration */
/** @typedef {import("../util/Hash")} Hash */
/** @typedef {typeof import("module") & { _nodeModulePaths: (context: string) => string[] }} NodeModuleConstructor */
/** @typedef {import("module") & { paths: string[], filename: string, _compile: (code: string, filename: string) => void }} NodeModuleInstance */

/**
 * @typedef {object} WorkerLoaderContext
 * @property {number} version
 * @property {(schema?: Schema, configuration?: ValidationErrorConfiguration, check?: PrecompiledCheck) => Record<string, unknown>} getOptions
 * @property {(warning: Error | string) => void} emitWarning
 * @property {(error: Error | string) => void} emitError
 * @property {(name?: string) => import("../logging/Logger").Logger} getLogger
 * @property {(context: string, request: string, callback: (error: Error | null, result?: string) => void) => void} resolve
 * @property {(options?: import("../../declarations/WebpackOptions").ResolveOptions) => (context: string, request: string, callback?: (error: Error | null, result?: string) => void) => Promise<string> | void} getResolve
 * @property {(request: string, callback: (error: Error | null, source?: string | Buffer, sourceMap?: string | RawSourceMap | null) => void) => void} loadModule
 * @property {(request: string, options: ImportModuleOptions | undefined, callback?: (error: Error | null | undefined, result?: unknown) => void) => Promise<unknown> | void} importModule
 * @property {(code: string, filename: string) => unknown} exec
 * @property {(filename: string) => void} addBuildDependency
 * @property {typeof import("fs")} fs
 * @property {{ context: string }} options
 * @property {{ absolutify: (context: string, request: string) => string, contextify: (context: string, request: string) => string, createHash: (type?: HashFunction) => Hash }} utils
 * @property {true} webpack
 * @property {string=} mode
 * @property {boolean} sourceMap
 * @property {string=} target
 * @property {boolean=} minimize
 * @property {string} resourceQuery
 * @property {string} resourceFragment
 * @property {string} resourcePath
 * @property {Environment=} environment
 * @property {string} rootContext
 * @property {boolean=} hot
 * @property {string} context
 * @property {HashFunction} hashFunction
 * @property {string=} hashDigest
 * @property {number=} hashDigestLength
 * @property {string=} hashSalt
 * @property {WorkerCompilation} _compilation
 * @property {{ fsStartTime?: number, options: { plugins: Plugins } }} _compiler
 * @property {undefined} _module
 * @property {(...args: unknown[]) => never} emitFile
 * @property {LoaderItem[]} loaders
 * @property {number} loaderIndex
 */

/**
 * @typedef {object} WorkerOutputOptions
 * @property {HashFunction} hashFunction
 * @property {string=} hashDigest
 * @property {number=} hashDigestLength
 * @property {string=} hashSalt
 * @property {string=} uniqueName
 */

/**
 * @typedef {object} WorkerCompilation
 * @property {WorkerOutputOptions} outputOptions
 * @property {{ devtool?: string | false }} options
 * @property {string=} hash
 * @property {string=} fullHash
 * @property {(filename: string | ((data: PathData) => string), data?: PathData) => string} getPath
 */

/** @typedef {import("../Compilation").PathData} PathData */

/**
 * @typedef {object} WorkerLoaderResult
 * @property {LoaderResultArgs | undefined} result
 * @property {boolean} cacheable
 * @property {string[]} notCacheableReasons
 * @property {string[]} fileDependencies
 * @property {string[]} contextDependencies
 * @property {string[]} missingDependencies
 * @property {string[]} buildDependencies
 * @property {number=} loaderIndex
 */

/**
 * @typedef {object} LoaderWorkerData
 * @property {string} resource path + query of the resource
 * @property {string} resourcePath path of the resource
 * @property {string} resourceQuery query of the resource
 * @property {string} resourceFragment fragment of the resource
 * @property {string} context context directory for resolving
 * @property {LoaderItem[]} loaders loaders to run
 * @property {boolean} sourceMap whether source maps are enabled
 * @property {boolean} extractSourceMap whether to extract a source map from the resource
 * @property {boolean} useSourceMap whether the module uses source maps
 * @property {boolean} useSimpleSourceMap whether the module uses simple source maps
 * @property {boolean} validate whether loader options are validated
 * @property {import("../../declarations/WebpackOptions").Loader=} loader custom values available in the loader context
 * @property {string=} mode mode
 * @property {string=} target target
 * @property {boolean=} minimize minimize
 * @property {string} rootContext root context
 * @property {Environment=} environment environment
 * @property {boolean=} hot hot
 * @property {{ fsStartTime?: number, options: { plugins: Plugins } }} compiler compiler snapshot
 * @property {WorkerCompilation} compilation compilation snapshot
 */

const LOGGER_METHODS = [
	"error",
	"warn",
	"info",
	"log",
	"debug",
	"assert",
	"trace",
	"clear",
	"status",
	"group",
	"groupCollapsed",
	"groupEnd",
	"profile",
	"profileEnd",
	"time",
	"timeLog",
	"timeEnd",
	"timeAggregate",
	"timeAggregateEnd"
];

/**
 * Reads a resource and extracts its source map when asked.
 * @param {LoaderContext} context the RPC context
 * @param {LoaderWorkerData} data the job
 * @returns {Promise<{ source: string | Buffer, map: RawSourceMap | string | undefined }>} the resource
 */
const readResource = async (context, data) => {
	const source = await /** @type {Promise<Buffer>} */ (
		new Promise((resolve, reject) => {
			fs.readFile(data.resourcePath, (error, result) =>
				error ? reject(error) : resolve(result)
			);
		})
	);
	if (!data.extractSourceMap) return { source, map: undefined };

	const extractSourceMap = require("../module/extractSourceMap");

	if (!data.useSourceMap && !data.useSimpleSourceMap) {
		return {
			source: extractSourceMap.removeSourceMappingURL(source),
			map: undefined
		};
	}
	try {
		const result = await extractSourceMap(
			source,
			data.resourcePath,
			(resourcePath) =>
				/** @type {Promise<string | Buffer>} */ (
					context.callMain("readResource", [resourcePath]).then(
						(result) => {
							const value = /** @type {string | Buffer} */ (result);
							return value instanceof Uint8Array && !Buffer.isBuffer(value)
								? Buffer.from(value)
								: value;
						},
						(/** @type {ThrownValue} */ error) => {
							throw new Error(
								`Failed to parse source map. ${toError(error).message}`
							);
						}
					)
				)
		);
		return { source: result.source, map: result.sourceMap };
	} catch (error) {
		context.callMainNoWait("emitWarning", [encodeError(toError(error))]);
		return { source, map: undefined };
	}
};

/**
 * The context thread-side loaders receive. It mirrors the subset thread-loader supports.
 * @param {LoaderContext} context the RPC context
 * @param {LoaderWorkerData} data the job
 * @returns {{ loaderContext: WorkerLoaderContext, buildDependencies: string[] }} the loader context
 */
const createLoaderContext = (context, data) => {
	/** @type {string[]} */
	const buildDependencies = [];
	/** @type {Map<string, import("../logging/Logger").Logger>} */
	const loggers = new Map();
	/** @type {WorkerLoaderContext} */
	const loaderContext = {
		version: 2,
		getOptions: (schema, configuration, check) => {
			const loader =
				/** @type {{ options?: string | Record<string, unknown> | null }} */ (
					loaderContext.loaders[loaderContext.loaderIndex]
				);
			let { options } = loader;
			if (typeof options === "string") {
				if (options.startsWith("{") && options.endsWith("}")) {
					try {
						options = /** @type {Record<string, unknown>} */ (
							parseJson(options)
						);
					} catch (error) {
						throw new Error(
							`Cannot parse string options: ${toError(error).message}`,
							{ cause: error }
						);
					}
				} else {
					options = querystring.parse(options, "&", "=", { maxKeys: 0 });
				}
			}
			if (options === null || options === undefined) options = {};
			if (schema && data.validate) {
				const validateSchema = require("../util/validateSchema");

				validateSchema(
					schema,
					/** @type {ValidatedValue} */ (options),
					configuration,
					check,
					{
						name: "Loader",
						baseDataPath: "options"
					}
				);
			}
			return options;
		},
		emitWarning: (/** @type {Error | string} */ warning) => {
			context.callMainNoWait("emitWarning", [
				encodeError(toError(warning)),
				loaderContext.loaderIndex
			]);
		},
		emitError: (/** @type {Error | string} */ error) => {
			context.callMainNoWait("emitError", [
				encodeError(toError(error)),
				loaderContext.loaderIndex
			]);
		},
		getLogger: (name = "webpack") => {
			const loggerIndex = loaderContext.loaderIndex;
			/**
			 * @param {string} loggerName logger name
			 * @returns {import("../logging/Logger").Logger} the facade
			 */
			const create = (loggerName) => {
				const loggerKey = `${loggerIndex}|${loggerName}`;
				const cached = loggers.get(loggerKey);
				if (cached !== undefined) return cached;
				context.callMainNoWait("getLogger", [loggerName, loggerIndex]);
				/** @type {Record<string, (...args: unknown[]) => void>} */
				const methods = {};
				for (const method of LOGGER_METHODS) {
					methods[method] = (...args) => {
						context.callMainNoWait("logger", [
							loggerName,
							method,
							args,
							loggerIndex
						]);
					};
				}
				const created = /** @type {import("../logging/Logger").Logger} */ (
					/** @type {unknown} */ (methods)
				);
				created.getChildLogger = (childName) =>
					create(
						`${loggerName}/${
							typeof childName === "function" ? childName() : childName
						}`
					);
				loggers.set(loggerKey, created);
				return created;
			};
			return create(name);
		},
		resolve: (resolveContext, request, callback) => {
			context.callMain("resolve", [resolveContext, request]).then(
				(result) => callback(null, /** @type {string} */ (result)),
				(/** @type {ThrownValue} */ error) => callback(toError(error))
			);
		},
		getResolve: (options) => (resolveContext, request, callback) => {
			const promise = context.callMain("getResolve", [
				options,
				resolveContext,
				request
			]);
			if (callback) {
				promise.then(
					(result) => callback(null, /** @type {string} */ (result)),
					(/** @type {ThrownValue} */ error) => callback(toError(error))
				);
				return;
			}
			return /** @type {Promise<string>} */ (promise);
		},
		loadModule: (request, callback) => {
			context.callMain("loadModule", [request]).then(
				(result) => {
					const values =
						/** @type {[string | Buffer | undefined, string | RawSourceMap | undefined]} */ (
							result
						);
					const source = values[0];
					callback(
						null,
						source instanceof Uint8Array && !Buffer.isBuffer(source)
							? Buffer.from(source)
							: source,
						values[1]
					);
				},
				(/** @type {ThrownValue} */ error) => callback(toError(error))
			);
		},
		importModule: (request, options, callback) => {
			const promise = context.callMain("importModule", [request, options]);
			if (callback) {
				promise.then(
					(result) => callback(null, result),
					(/** @type {ThrownValue} */ error) => callback(toError(error))
				);
				return;
			}
			return promise;
		},
		exec: (/** @type {string} */ code, /** @type {string} */ filename) => {
			const NodeModule = /** @type {NodeModuleConstructor} */ (NativeModule);
			const module = /** @type {NodeModuleInstance} */ (
				new NodeModule(
					filename,
					/** @type {import("module")} */ (
						/** @type {unknown} */ (loaderContext)
					)
				)
			);
			module.paths = NodeModule._nodeModulePaths(loaderContext.context);
			module.filename = filename;
			module._compile(code, filename);
			return module.exports;
		},
		addBuildDependency: (/** @type {string} */ filename) => {
			buildDependencies.push(filename);
		},
		fs,
		options: { context: data.rootContext },
		utils: {
			absolutify: (
				/** @type {string} */ context,
				/** @type {string} */ request
			) => absolutify(context, request),
			contextify: (
				/** @type {string} */ context,
				/** @type {string} */ request
			) => contextify(context, request),
			createHash: (type) =>
				createHash(type || data.compilation.outputOptions.hashFunction)
		},
		webpack: true,
		mode: data.mode,
		sourceMap: data.sourceMap,
		target: data.target,
		minimize: data.minimize,
		resourceQuery: data.resourceQuery,
		resourceFragment: data.resourceFragment,
		resourcePath: data.resourcePath,
		environment: data.environment,
		rootContext: data.rootContext,
		hot: data.hot,
		context: data.context,
		hashFunction: data.compilation.outputOptions.hashFunction,
		hashDigest: data.compilation.outputOptions.hashDigest,
		hashDigestLength: data.compilation.outputOptions.hashDigestLength,
		hashSalt: data.compilation.outputOptions.hashSalt,
		_compilation: {
			...data.compilation,
			getPath: (
				/** @type {string | ((data: PathData) => string)} */ filename,
				/** @type {PathData=} */ extraData = {}
			) => {
				const { hash, fullHash, ...rest } = extraData;
				/** @type {PathData} */
				const pathData = {
					...rest,
					hash: hash === undefined ? data.compilation.hash : hash,
					hashDigest:
						extraData.hashDigest === undefined
							? data.compilation.outputOptions.hashDigest
							: extraData.hashDigest,
					uniqueName:
						extraData.uniqueName === undefined
							? data.compilation.outputOptions.uniqueName
							: extraData.uniqueName
				};
				if (fullHash !== undefined || pathData.hash === data.compilation.hash) {
					pathData.fullHash =
						fullHash === undefined ? data.compilation.fullHash : fullHash;
				}

				const { interpolate } = require("../template/TemplatedPathPlugin");

				return interpolate(filename, pathData);
			}
		},
		loaders: data.loaders,
		loaderIndex: 0,
		_compiler: data.compiler,
		_module: undefined,
		emitFile: () => {
			throw new Error(
				"emitFile is not supported by worker loaders; run this loader on the main thread"
			);
		}
	};
	Object.assign(loaderContext, data.loader);
	loaderContext.target = data.target;
	loaderContext.environment = data.environment;
	return { loaderContext, buildDependencies };
};

/**
 * Runs a loader chain in a worker.
 * @param {LoaderContext} context the RPC context
 * @param {LoaderWorkerData} data the job
 * @returns {Promise<LoaderResult>} the loader result
 */
const runLoadersInWorker = async (context, data) => {
	const resource = await readResource(context, data);
	const { loaderContext, buildDependencies } = createLoaderContext(
		context,
		data
	);
	return new Promise((resolve, reject) => {
		runLoaders(
			{
				resource: data.resource,
				resourceContext: data.context,
				loaders: data.loaders,
				context: loaderContext,
				processResource: (ctx, resourcePath, callback) => {
					callback(null, resource.source, resource.map);
				}
			},
			(error, result) => {
				if (error) {
					const loaderError =
						/** @type {Error & { loaderIndex?: number, buildDependencies?: string[] }} */ (
							toError(error)
						);
					if (result) {
						Object.assign(loaderError, {
							cacheable: result.cacheable,
							notCacheableReasons: result.notCacheableReasons || [],
							fileDependencies: result.fileDependencies || [],
							contextDependencies: result.contextDependencies || [],
							missingDependencies: result.missingDependencies || [],
							buildDependencies
						});
					} else {
						loaderError.buildDependencies = buildDependencies;
					}
					loaderError.loaderIndex = loaderContext.loaderIndex;
					loaderError.message = `Loader thread (worker ${context.workerId}): ${loaderError.message}`;
					reject(loaderError);
					return;
				}
				if (!result) {
					reject(new Error("Loader runner returned no result"));
					return;
				}
				const {
					result: loaderResult,
					cacheable,
					fileDependencies,
					contextDependencies,
					missingDependencies
				} = result;
				resolve({
					result: loaderResult,
					cacheable: cacheable === undefined ? true : cacheable,
					notCacheableReasons: [...(result.notCacheableReasons || [])],
					fileDependencies: [
						...new Set([data.resourcePath, ...fileDependencies])
					],
					contextDependencies: [...contextDependencies],
					missingDependencies: [...missingDependencies],
					buildDependencies
				});
			}
		);
	});
};

module.exports.runLoaders = runLoadersInWorker;
