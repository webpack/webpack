/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Haijie Xie @hai-x
*/

"use strict";

const fs = require("fs");
const NativeModule = require("module");
const querystring = require("querystring");
const { toError } = require("../../errors/ErrorHelpers");
const { runLoaders } = require("../../loaders/LoaderRunner");
const createHash = require("../createHash");
const parseJson = require("../parseJson");
const { encodeError } = require("./protocol");

/** @typedef {import("../worker/WorkerChild").LoaderContext} LoaderContext */
/** @typedef {import("../../module/NormalModule").LoaderItem} LoaderItem */

/** @typedef {import("../../loaders/LoaderRunner").LoaderResultArgs} LoaderResultArgs */

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
 * @property {EXPECTED_ANY=} environment environment
 * @property {boolean=} hot hot
 * @property {{ fsStartTime?: number, options: { plugins: EXPECTED_ANY[] } }} compiler compiler snapshot
 * @property {{ outputOptions: EXPECTED_ANY, options: EXPECTED_ANY }} compilation compilation snapshot
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
 * @param {LoaderWorkerData} data the job
 * @returns {Promise<{ source: string | Buffer, map: EXPECTED_ANY }>} the resource
 */
const readResource = async (data) => {
	const source = await new Promise((resolve, reject) => {
		fs.readFile(data.resourcePath, (error, result) =>
			error ? reject(error) : resolve(result)
		);
	});
	if (!data.extractSourceMap) return { source, map: undefined };

	const extractSourceMap = require("../../module/extractSourceMap");

	if (!data.useSourceMap && !data.useSimpleSourceMap) {
		return {
			source: extractSourceMap.removeSourceMappingURL(source),
			map: undefined
		};
	}
	const result = await extractSourceMap(
		source,
		data.resourcePath,
		(resourcePath) =>
			new Promise((resolve, reject) => {
				fs.readFile(resourcePath, (error, content) =>
					error ? reject(error) : resolve(content)
				);
			})
	);
	return { source: result.source, map: result.sourceMap };
};

/**
 * The context thread-side loaders receive. It mirrors the subset thread-loader supports.
 * @param {LoaderContext} context the RPC context
 * @param {LoaderWorkerData} data the job
 * @param {{ source: string | Buffer, map: EXPECTED_ANY }} resource the resource
 * @returns {EXPECTED_ANY} the loader context
 */
const createLoaderContext = (context, data, resource) => {
	/** @type {string[]} */
	const buildDependencies = [];
	let cacheable = true;
	/** @type {Map<string, EXPECTED_ANY>} */
	const loggers = new Map();
	/** @type {EXPECTED_ANY} */
	const loaderContext = {
		version: 2,
		getOptions: (
			/** @type {EXPECTED_ANY=} */ schema,
			/** @type {EXPECTED_ANY=} */ configuration,
			/** @type {EXPECTED_ANY=} */ check
		) => {
			const loader = loaderContext.loaders[loaderContext.loaderIndex];
			let { options } = /** @type {LoaderItem} */ (loader);
			if (typeof options === "string") {
				if (options.startsWith("{") && options.endsWith("}")) {
					try {
						options = /** @type {EXPECTED_ANY} */ (parseJson(options));
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
			context.callMainNoWait("emitWarning", [encodeError(toError(warning))]);
		},
		emitError: (/** @type {Error | string} */ error) => {
			context.callMainNoWait("emitError", [encodeError(toError(error))]);
		},
		getLogger: (name = "webpack") => {
			const loggerName = name;
			context.callMainNoWait("getLogger", [loggerName]);
			let logger = loggers.get(loggerName);
			if (logger === undefined) {
				logger = {};
				for (const method of LOGGER_METHODS) {
					logger[method] = /** @type {(...args: unknown[]) => void} */ (
						(...args) => {
							context.callMainNoWait("logger", [loggerName, method, args]);
						}
					);
				}
				loggers.set(loggerName, logger);
			}
			return logger;
		},
		resolve: (
			/** @type {string} */ resolveContext,
			/** @type {string} */ request,
			/** @type {EXPECTED_ANY} */ callback
		) => {
			context.callMain("resolve", [resolveContext, request]).then(
				(result) => callback(null, result),
				(error) => callback(toError(error))
			);
		},
		getResolve:
			(/** @type {EXPECTED_ANY} */ options) =>
			(
				/** @type {string} */ resolveContext,
				/** @type {string} */ request,
				/** @type {EXPECTED_ANY} */ callback
			) => {
				const promise = context.callMain("getResolve", [
					options,
					resolveContext,
					request
				]);
				if (callback) {
					promise.then(
						(result) => callback(null, result),
						(error) => callback(toError(error))
					);
					return;
				}
				return promise;
			},
		loadModule: (
			/** @type {string} */ request,
			/** @type {EXPECTED_ANY} */ callback
		) => {
			context.callMain("loadModule", [request]).then(
				(result) => callback(null, .../** @type {EXPECTED_ANY[]} */ (result)),
				(error) => callback(toError(error))
			);
		},
		importModule: (
			/** @type {string} */ request,
			/** @type {EXPECTED_ANY} */ options,
			/** @type {EXPECTED_ANY} */ callback
		) => {
			const promise = context.callMain("importModule", [request, options]);
			if (callback) {
				promise.then(
					(result) => callback(null, result),
					(error) => callback(toError(error))
				);
				return;
			}
			return promise;
		},
		exec: (/** @type {string} */ code, /** @type {string} */ filename) => {
			const NodeModule = /** @type {EXPECTED_ANY} */ (NativeModule);
			const module = new NodeModule(filename, loaderContext);
			module.paths = NodeModule._nodeModulePaths(
				/** @type {string} */ (loaderContext.context)
			);
			module.filename = filename;
			module._compile(code, filename);
			return module.exports;
		},
		addBuildDependency: (/** @type {string} */ filename) => {
			buildDependencies.push(filename);
		},
		cacheable: (value = true) => {
			cacheable = value;
		},
		fs,
		options: { context: data.rootContext },
		utils: {
			createHash: (/** @type {EXPECTED_ANY} */ type) =>
				createHash(
					type ||
						/** @type {EXPECTED_ANY} */ (data.compilation.outputOptions)
							.hashFunction
				)
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
		_compilation: data.compilation,
		_compiler: data.compiler,
		_module: undefined,
		emitFile: () => {
			throw new Error(
				"emitFile is not supported by worker loaders; run this loader on the main thread"
			);
		}
	};
	loaderContext.sourceMap = data.sourceMap;
	loaderContext.loaders = data.loaders;
	loaderContext.readResource = () => Promise.resolve(resource);
	return { loaderContext, buildDependencies, isCacheable: () => cacheable };
};

/**
 * Runs a loader chain in a worker.
 * @param {LoaderContext} context the RPC context
 * @param {LoaderWorkerData} data the job
 * @returns {Promise<EXPECTED_ANY>} the loader result
 */
const runLoadersInWorker = async (context, data) => {
	const resource = await readResource(data);
	const { loaderContext, buildDependencies, isCacheable } = createLoaderContext(
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
					const loaderError = toError(error);
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
					cacheable:
						isCacheable() && (cacheable === undefined ? true : cacheable),
					fileDependencies: [...fileDependencies],
					contextDependencies: [...contextDependencies],
					missingDependencies: [...missingDependencies],
					buildDependencies
				});
			}
		);
	});
};

module.exports.runLoaders = runLoadersInWorker;
