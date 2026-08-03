/*
	MIT License http://www.opensource.org/licenses/mit-license.php
*/

"use strict";

const querystring = require("querystring");
// eslint-disable-next-line n/no-unsupported-features/node-builtins
const { parentPort } = require("worker_threads");
const createHash = require("../util/createHash");
const { absolutify, contextify } = require("../util/identifier");
const memoize = require("../util/memoize");
const parseJson = require("../util/parseJson");
const { runLoaders } = require("./LoaderRunner");

/** @typedef {import("./LoaderRunner").RunLoaderResult} RunLoaderResult */

const LOGGER_METHODS = [
	"error",
	"warn",
	"info",
	"log",
	"debug",
	"trace",
	"group",
	"groupCollapsed",
	"groupEnd",
	"status",
	"clear",
	"profile",
	"profileEnd",
	"time",
	"assert"
];

const getValidate = memoize(() => require("schema-utils").validate);

const MOVE_HINT =
	"Move the loader in front of the parallel loader in the chain, or drop the parallel loader from this rule.";

/**
 * Loader-context members that hold live compilation objects and so cannot cross
 * the thread boundary. They throw on access rather than reading as `undefined`,
 * so a loader that needs them fails loudly instead of silently producing a
 * different build than it would on the main thread.
 */
const UNAVAILABLE = {
	_compiler: `_compiler is not available in a parallel loader worker. ${MOVE_HINT}`,
	_compilation: `_compilation is not available in a parallel loader worker. ${MOVE_HINT}`,
	_module: `_module is not available in a parallel loader worker. ${MOVE_HINT}`,
	fs: 'fs is not available in a parallel loader worker. Require "fs" directly, or move the loader in front of the parallel loader in the chain.'
};

let nextQuestionId = 0;

/** @type {Map<number, (err: Error | null, result?: EXPECTED_ANY[]) => void>} */
const pendingQuestions = new Map();

/**
 * Values the main thread sends once and then refers to by id (loader options,
 * the per-compilation constants).
 * @type {Map<number, EXPECTED_ANY>}
 */
const shared = new Map();

/**
 * @param {EXPECTED_ANY[]} loaders wire descriptors, options possibly by id
 * @returns {EXPECTED_ANY[]} descriptors the loader runner can consume
 */
const resolveLoaders = (loaders) => {
	for (let i = 0; i < loaders.length; i++) {
		const loader = loaders[i];
		if (loader.optionsId === undefined) continue;
		loaders[i] = {
			loader: loader.loader,
			options: shared.get(loader.optionsId),
			ident: loader.ident,
			type: loader.type
		};
	}
	return loaders;
};

/**
 * @param {EXPECTED_ANY} data serialized error
 * @returns {Error} rebuilt error
 */
const deserializeError = (data) => {
	const error = new Error(data.message);
	error.name = data.name;
	if (data.stack) error.stack = data.stack;
	return error;
};

/**
 * @param {Error} error error to serialize
 * @returns {EXPECTED_ANY} plain, structured-cloneable error data
 */
const serializeError = (error) => {
	if (!(error instanceof Error)) {
		return { name: "Error", message: String(error) };
	}
	return { name: error.name, message: error.message, stack: error.stack };
};

/**
 * Asks the main thread to perform a loader-context call that needs the
 * compilation, and waits for its answer.
 * @param {number} id job id
 * @param {string} method loader-context method
 * @param {EXPECTED_ANY[]} args arguments
 * @param {(err: Error | null, result?: EXPECTED_ANY[]) => void} callback callback
 * @returns {void}
 */
const ask = (id, method, args, callback) => {
	const questionId = nextQuestionId++;
	pendingQuestions.set(questionId, callback);
	/** @type {import("worker_threads").MessagePort} */
	(parentPort).postMessage({ type: "rpc", id, questionId, method, args });
};

/**
 * @param {number} id job id
 * @param {EXPECTED_ANY} data job payload
 * @returns {EXPECTED_ANY} the loader context to hand to the loader runner
 */
const createWorkerLoaderContext = (id, data) => {
	const constants = data.constants;
	/** @type {EXPECTED_ANY} */
	const loaderContext = {
		version: 2,
		webpack: true,
		sourceMap: data.sourceMap,
		hot: data.hot,
		mode: constants.mode,
		target: constants.target,
		rootContext: constants.rootContext,
		hashFunction: constants.hashFunction,
		hashDigest: constants.hashDigest,
		hashDigestLength: constants.hashDigestLength,
		hashSalt: constants.hashSalt,
		environment: constants.environment,
		/** @type {string[]} */
		__buildDependencies: [],
		/**
		 * @param {EXPECTED_ANY=} schema options schema to validate against
		 * @returns {EXPECTED_ANY} the current loader's options
		 */
		getOptions: (schema) => {
			const currentLoader = loaderContext.loaders[loaderContext.loaderIndex];
			let options = currentLoader && currentLoader.options;

			if (typeof options === "string") {
				if (options.startsWith("{") && options.endsWith("}")) {
					try {
						options = parseJson(options);
					} catch (err) {
						throw new Error(
							`Cannot parse string options: ${/** @type {Error} */ (err).message}`,
							{ cause: err }
						);
					}
				} else {
					options = querystring.parse(options, "&", "=", { maxKeys: 0 });
				}
			}

			if (options === null || options === undefined) options = {};

			if (schema && constants.validate) {
				let name = "Loader";
				let baseDataPath = "options";
				/** @type {RegExpExecArray | null} */
				let match;
				if (schema.title && (match = /^(.+) (.+)$/.exec(schema.title))) {
					[, name, baseDataPath] = match;
				}
				getValidate()(schema, options, { name, baseDataPath });
			}

			return options;
		},
		/**
		 * @returns {never} always throws
		 */
		emitFile: () => {
			// a function (not a throwing getter) so `typeof this.emitFile` probes
			// still work and only actual use fails
			throw new Error(
				`emitFile() is not available in a parallel loader worker. ${MOVE_HINT}`
			);
		},
		utils: {
			/**
			 * @param {string} context context
			 * @param {string} request request
			 * @returns {string} result
			 */
			absolutify: (context, request) => absolutify(context, request),
			/**
			 * @param {string} context context
			 * @param {string} request request
			 * @returns {string} result
			 */
			contextify: (context, request) => contextify(context, request),
			/**
			 * @param {string=} type hash type
			 * @returns {EXPECTED_ANY} hash
			 */
			createHash: (type) => createHash(type || constants.hashFunction)
		},
		/**
		 * @param {string} dependency build dependency
		 * @returns {void}
		 */
		addBuildDependency: (dependency) => {
			loaderContext.__buildDependencies.push(dependency);
		},
		/**
		 * @param {string} context context
		 * @param {string} request request
		 * @param {(err: Error | null, result?: string | false) => void} callback callback
		 * @returns {void}
		 */
		resolve: (context, request, callback) => {
			ask(id, "resolve", [context, request, null], (err, result) => {
				if (err) return callback(err);
				callback(null, /** @type {EXPECTED_ANY[]} */ (result)[0]);
			});
		},
		/**
		 * @param {EXPECTED_ANY=} options resolve options
		 * @returns {EXPECTED_ANY} a resolve function
		 */
		getResolve:
			(options) =>
			(
				/** @type {string} */ context,
				/** @type {string} */ request,
				/** @type {((err: Error | null, result?: string | false) => void)=} */ callback
			) => {
				if (callback) {
					ask(
						id,
						"resolve",
						[context, request, options || null],
						(err, result) => {
							if (err) return callback(err);
							callback(null, /** @type {EXPECTED_ANY[]} */ (result)[0]);
						}
					);
					return;
				}
				return new Promise((resolve, reject) => {
					ask(
						id,
						"resolve",
						[context, request, options || null],
						(err, result) => {
							if (err) reject(err);
							else resolve(/** @type {EXPECTED_ANY[]} */ (result)[0]);
						}
					);
				});
			},
		/**
		 * @param {Error | string} warning warning
		 * @returns {void}
		 */
		emitWarning: (warning) => {
			ask(
				id,
				"emitWarning",
				[serializeError(/** @type {Error} */ (warning))],
				() => {
					// fire and forget: warnings never fail the loader run
				}
			);
		},
		/**
		 * @param {Error | string} error error
		 * @returns {void}
		 */
		emitError: (error) => {
			ask(
				id,
				"emitError",
				[serializeError(/** @type {Error} */ (error))],
				() => {
					// fire and forget: emitError does not abort the loader run
				}
			);
		},
		/**
		 * @param {string} name logger name
		 * @returns {EXPECTED_ANY} a logger forwarding to the compilation logger
		 */
		getLogger: (name) => {
			/** @type {EXPECTED_ANY} */
			const logger = {};
			for (const method of LOGGER_METHODS) {
				logger[method] = (/** @type {EXPECTED_ANY[]} */ ...args) => {
					ask(id, "log", [name, method, args], () => {
						// fire and forget
					});
				};
			}
			return logger;
		},
		/**
		 * @param {string} request request
		 * @param {(err: Error | null, source?: string, sourceMap?: EXPECTED_ANY, module?: EXPECTED_ANY) => void} callback callback
		 * @returns {void}
		 */
		loadModule: (request, callback) => {
			ask(id, "loadModule", [request], (err, result) => {
				if (err) return callback(err);
				const values = /** @type {EXPECTED_ANY[]} */ (result);
				// the Module instance cannot cross the thread boundary
				callback(null, values[0], values[1], undefined);
			});
		},
		/**
		 * @param {string} request request
		 * @param {EXPECTED_ANY=} options options
		 * @param {((err: Error | null, exports?: EXPECTED_ANY) => void)=} callback callback
		 * @returns {EXPECTED_ANY} exports or a promise of them
		 */
		importModule: (request, options, callback) => {
			if (callback) {
				ask(id, "importModule", [request, options || {}], (err, result) => {
					if (err) return callback(err);
					callback(null, /** @type {EXPECTED_ANY[]} */ (result)[0]);
				});
				return;
			}
			return new Promise((resolve, reject) => {
				ask(id, "importModule", [request, options || {}], (err, result) => {
					if (err) reject(err);
					else resolve(/** @type {EXPECTED_ANY[]} */ (result)[0]);
				});
			});
		}
	};

	for (const name of Object.keys(UNAVAILABLE)) {
		const message = /** @type {EXPECTED_ANY} */ (UNAVAILABLE)[name];
		Object.defineProperty(loaderContext, name, {
			enumerable: false,
			configurable: true,
			get() {
				throw new Error(message);
			}
		});
	}

	return loaderContext;
};

/**
 * @param {EXPECTED_ANY} message the job message
 * @returns {void}
 */
const runJob = (message) => {
	const id = message.id;
	const data = {
		resource: message.resource,
		sourceMap: message.sourceMap,
		hot: message.hot,
		constants: shared.get(message.constantsId)
	};
	const loaderContext = createWorkerLoaderContext(id, data);

	runLoaders(
		{
			resource: data.resource,
			loaders: resolveLoaders(message.loaders),
			context: loaderContext
		},
		(err, result) => {
			if (err) {
				/** @type {import("worker_threads").MessagePort} */
				(parentPort).postMessage({
					type: "job-result",
					id,
					error: serializeError(err)
				});
				return;
			}
			/** @type {import("worker_threads").MessagePort} */
			const port = /** @type {EXPECTED_ANY} */ (parentPort);
			try {
				port.postMessage({
					type: "job-result",
					id,
					result: {
						result: result.result,
						cacheable: result.cacheable,
						notCacheableReasons: result.notCacheableReasons,
						fileDependencies: result.fileDependencies,
						contextDependencies: result.contextDependencies,
						missingDependencies: result.missingDependencies,
						buildDependencies: loaderContext.__buildDependencies
					}
				});
			} catch (err_) {
				// a loader returned something structured clone cannot carry, e.g. a
				// prebuilt `webpackAST` in the third result slot
				port.postMessage({
					type: "job-result",
					id,
					error: serializeError(
						new Error(
							`Parallel loader result cannot be transferred from the worker: ${/** @type {Error} */ (err_).message}`
						)
					)
				});
			}
		}
	);
};

/** @type {import("worker_threads").MessagePort} */
(parentPort).on("message", (message) => {
	switch (message.type) {
		case "job":
			// values the main thread is sending for the first time must land in the
			// registry before any id in this same message is resolved
			if (message.newShared !== undefined) {
				for (const [sharedId, value] of message.newShared) {
					shared.set(sharedId, value);
				}
			}
			runJob(message);
			break;
		case "rpc-result": {
			const callback = pendingQuestions.get(message.questionId);
			if (callback === undefined) return;
			pendingQuestions.delete(message.questionId);
			callback(
				message.error ? deserializeError(message.error) : null,
				message.result
			);
			break;
		}
	}
});
