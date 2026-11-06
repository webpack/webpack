/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Natsu @xiaoxiaojx
*/

"use strict";

const fs = require("fs");
const NativeModule = require("module");
const path = require("path");
const querystring = require("querystring");
const { toError } = require("../../errors/ErrorHelpers");
const { runLoaders } = require("../../loaders/LoaderRunner");
const createHash = require("../createHash");
const { absolutify, contextify, parseResource } = require("../identifier");
const parseJson = require("../parseJson");
const { encodeError } = require("./protocol");

/** @typedef {import("./WorkerChild").LoaderContext} LoaderContext */
/** @typedef {import("../../module/NormalModule").LoaderItem} LoaderItem */
/** @typedef {import("../../loaders/LoaderRunner").LoaderResultArgs} LoaderResultArgs */
/** @typedef {import("../../../declarations/WebpackOptions").Environment} Environment */
/** @typedef {import("../../../declarations/WebpackOptions").HashFunction} HashFunction */
/** @typedef {import("../../../declarations/WebpackOptions").OutputNormalized} OutputNormalized */
/** @typedef {import("../../../declarations/WebpackOptions").Plugins} Plugins */
/** @typedef {(value: unknown) => boolean} PrecompiledCheck */
/** @typedef {import("schema-utils").Schema} Schema */
/** @typedef {import("webpack-sources").RawSourceMap} RawSourceMap */
/** @typedef {import("schema-utils").ValidationErrorConfiguration} ValidationErrorConfiguration */
/** @typedef {import("../Hash")} Hash */
/** @typedef {typeof import("module") & { _nodeModulePaths: (context: string) => string[] }} NodeModuleConstructor */
/** @typedef {import("module") & { paths: string[], filename: string, _compile: (code: string, filename: string) => void }} NodeModuleInstance */

/**
 * @typedef {object} WorkerLoaderContext
 * @property {number} version
 * @property {(schema?: Schema, configuration?: ValidationErrorConfiguration, check?: PrecompiledCheck) => Record<string, unknown>} getOptions
 * @property {(warning: Error | string) => void} emitWarning
 * @property {(error: Error | string) => void} emitError
 * @property {(name?: string) => import("../../logging/Logger").Logger} getLogger
 * @property {(context: string, request: string, callback: (error: Error | null, result?: string) => void) => void} resolve
 * @property {(options?: import("../../../declarations/WebpackOptions").ResolveOptions) => (context: string, request: string, callback?: (error: Error | null, result?: string) => void) => Promise<string> | void} getResolve
 * @property {(request: string, callback: (error: Error | null, source?: string | Buffer, sourceMap?: string | RawSourceMap | null) => void) => void} loadModule
 * @property {(request: string, options: Record<string, unknown> | undefined, callback?: (error: Error | null, result?: unknown) => void) => Promise<unknown> | void} importModule
 * @property {(code: string, filename: string) => unknown} exec
 * @property {(filename: string) => void} addBuildDependency
 * @property {unknown} fs
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
 * @property {() => Promise<{ source: string | Buffer, map: RawSourceMap | string | undefined }>} readResource
 */

/**
 * @typedef {object} WorkerOutputOptions
 * @property {HashFunction} hashFunction
 * @property {string=} hashDigest
 * @property {number=} hashDigestLength
 * @property {string=} hashSalt
 */

/**
 * @typedef {object} WorkerCompilation
 * @property {WorkerOutputOptions} outputOptions
 * @property {{ devtool?: string | false }} options
 * @property {string=} hash
 * @property {string=} fullHash
 * @property {(filename: string | ((data: WorkerPathData) => string), data?: WorkerPathData) => string} getPath
 */

/**
 * @typedef {object} WorkerPathData
 * @property {string=} filename
 * @property {string=} contentHash
 * @property {string=} contentHashType
 * @property {string=} hash
 * @property {string=} fullHash
 * @property {{ name?: string, id?: string | number, hash?: string, contentHash?: string | Record<string, string> }=} chunk
 */

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

	const extractSourceMap = require("../../module/extractSourceMap");

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
					context.callMain("readResource", [resourcePath]).then((result) => {
						const value = /** @type {string | Buffer} */ (result);
						return value instanceof Uint8Array && !Buffer.isBuffer(value)
							? Buffer.from(value)
							: value;
					})
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
 * @param {{ source: string | Buffer, map: RawSourceMap | string | undefined }} resource the resource
 * @returns {{ loaderContext: WorkerLoaderContext, buildDependencies: string[] }} the loader context
 */
const createLoaderContext = (context, data, resource) => {
	/** @type {string[]} */
	const buildDependencies = [];
	/** @type {Map<string, import("../../logging/Logger").Logger>} */
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
				const validateSchema = require("../../util/validateSchema");

				validateSchema(
					schema,
					/** @type {EXPECTED_ANY} */ (options),
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
			const loggerName = name;
			context.callMainNoWait("getLogger", [
				loggerName,
				loaderContext.loaderIndex
			]);
			let logger = loggers.get(loggerName);
			if (logger === undefined) {
				const created = /** @type {import("../../logging/Logger").Logger} */ (
					/** @type {unknown} */ ({})
				);
				const methods =
					/** @type {Record<string, (...args: unknown[]) => void>} */ (
						/** @type {unknown} */ (created)
					);
				for (const method of LOGGER_METHODS) {
					methods[method] = (...args) => {
						context.callMainNoWait("logger", [loggerName, method, args]);
					};
				}
				loggers.set(loggerName, created);
				logger = created;
			}
			return logger;
		},
		resolve: (resolveContext, request, callback) => {
			context.callMain("resolve", [resolveContext, request]).then(
				(result) => callback(null, /** @type {string} */ (result)),
				(/** @type {unknown} */ error) => callback(toError(error))
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
					(/** @type {unknown} */ error) => callback(toError(error))
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
				(/** @type {unknown} */ error) => callback(toError(error))
			);
		},
		importModule: (request, options, callback) => {
			const promise = context.callMain("importModule", [request, options]);
			if (callback) {
				promise.then(
					(result) => callback(null, result),
					(/** @type {unknown} */ error) => callback(toError(error))
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
				/** @type {string | ((data: EXPECTED_ANY) => string)} */ filename,
				/** @type {Record<string, EXPECTED_ANY>=} */ extraData = {}
			) => {
				const chunk = extraData.chunk;
				const parsed = parseResource(
					typeof extraData.filename === "string"
						? extraData.filename
						: data.resourcePath
				);
				const ext = path.extname(parsed.path);
				const base = path.basename(parsed.path);
				const name =
					chunk && chunk.name
						? String(chunk.name)
						: base.slice(0, base.length - ext.length);
				const directory = parsed.path.slice(
					0,
					parsed.path.length - base.length
				);
				const hash = String(extraData.hash || data.compilation.hash || "");
				const fullHash = String(
					extraData.fullHash || data.compilation.fullHash || hash
				);
				const chunkContentHash = chunk && chunk.contentHash;
				const contentHash = String(
					extraData.contentHash ||
						(extraData.contentHashType &&
							typeof chunkContentHash === "object" &&
							chunkContentHash[extraData.contentHashType]) ||
						(typeof chunkContentHash === "string"
							? chunkContentHash
							: undefined) ||
						(typeof chunkContentHash === "object"
							? Object.values(chunkContentHash)[0]
							: undefined) ||
						hash
				);
				const chunkHash = String((chunk && chunk.hash) || hash);
				const id = String(
					(chunk && chunk.id !== undefined && chunk.id !== null && chunk.id) ||
						name
				);
				const template =
					typeof filename === "function" ? filename(extraData) : filename;
				return template.replace(
					/\[([a-z]+)(?::([a-z]+\d*))?(?::(\d+))?\]/gi,
					(
						/** @type {string} */ match,
						/** @type {string} */ key,
						/** @type {string=} */ arg,
						/** @type {string=} */ length
					) => {
						const needsDigest =
							key === "hash" ||
							key === "fullhash" ||
							key === "contenthash" ||
							key === "chunkhash";
						/** @type {string} */
						let value;
						switch (key) {
							case "name":
								value = name;
								break;
							case "id":
							case "moduleid":
								value = id;
								break;
							case "ext":
								value = ext;
								break;
							case "base":
								value = base;
								break;
							case "path":
								value = directory;
								break;
							case "query":
								value = parsed.query;
								break;
							case "fragment":
								value = parsed.fragment;
								break;
							case "hash":
								value = hash;
								break;
							case "fullhash":
								value = fullHash;
								break;
							case "contenthash":
								value = contentHash;
								break;
							case "chunkhash":
								value = chunkHash;
								break;
							default:
								return match;
						}
						if (needsDigest && arg !== undefined) {
							const {
								reEncodeDigest
							} = require("../../template/TemplatedPathPlugin");

							value = reEncodeDigest(
								value,
								data.compilation.outputOptions.hashDigest || "hex",
								arg
							);
						}
						return length ? value.slice(0, Number(length)) : value;
					}
				);
			}
		},
		loaders: data.loaders,
		loaderIndex: 0,
		readResource: () => Promise.resolve(resource),
		_compiler: data.compiler,
		_module: undefined,
		emitFile: () => {
			throw new Error(
				"emitFile is not supported by worker loaders; run this loader on the main thread"
			);
		}
	};
	return { loaderContext, buildDependencies };
};

/**
 * Runs a loader chain in a worker.
 * @param {LoaderContext} context the RPC context
 * @param {LoaderWorkerData} data the job
 * @returns {Promise<EXPECTED_ANY>} the loader result
 */
const runLoadersInWorker = async (context, data) => {
	const resource = await readResource(context, data);
	const { loaderContext, buildDependencies } = createLoaderContext(
		context,
		data,
		resource
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
					const loaderError = /** @type {Error & { loaderIndex?: number }} */ (
						toError(error)
					);
					if (result) {
						Object.assign(loaderError, {
							cacheable: result.cacheable,
							notCacheableReasons: result.notCacheableReasons || [],
							fileDependencies: result.fileDependencies || [],
							contextDependencies: result.contextDependencies || [],
							missingDependencies: result.missingDependencies || []
						});
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
