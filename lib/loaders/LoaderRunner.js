/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

"use strict";

const { readFile } = require("fs");
const loadLoader = require("./loadLoader");

/**
 * @typedef {object} LoaderObject
 * @property {string} path loader path
 * @property {string} query loader query (including leading `?`)
 * @property {string} fragment loader fragment (including leading `#`)
 * @property {string | { [key: string]: EXPECTED_ANY } | null=} options loader options
 * @property {string | null=} ident options ident
 * @property {string=} type loader type (`"module"` for ESM loaders)
 * @property {EXPECTED_FUNCTION | null=} normal normal function
 * @property {EXPECTED_FUNCTION | null=} pitch pitch function
 * @property {boolean | null=} raw whether the loader wants a Buffer
 * @property {EXPECTED_OBJECT | null=} data per-loader data shared between pitch and normal
 * @property {boolean} pitchExecuted whether the pitch function ran
 * @property {boolean} normalExecuted whether the normal function ran
 * @property {EXPECTED_ANY} request string out / `string | object` in (accessor)
 */

/** @typedef {string | ({ loader: string } & Record<string, EXPECTED_ANY>)} LoaderItemInput */

/**
 * @typedef {object} ProcessOptions
 * @property {Buffer | null} resourceBuffer the raw resource buffer
 * @property {(loaderContext: EXPECTED_ANY, resource: string, callback: (err: Error | null, ...args: EXPECTED_ANY[]) => void) => void} processResource read and process the resource
 */

/**
 * @typedef {object} RunLoaderOptions
 * @property {string=} resource the resource (with query and fragment)
 * @property {LoaderItemInput[]=} loaders the loaders to run
 * @property {EXPECTED_ANY=} context the loader context to augment and pass to loaders
 * @property {ProcessOptions["processResource"]=} processResource custom resource reader/processor
 * @property {((path: string, callback: (err: Error | null, result?: Buffer) => void) => void)=} readResource custom file reader
 */

/**
 * @typedef {object} RunLoaderResult
 * @property {EXPECTED_ANY=} result the loader pipeline result
 * @property {Buffer | null=} resourceBuffer the raw resource buffer
 * @property {boolean} cacheable whether the request is cacheable
 * @property {string[]} fileDependencies file dependencies
 * @property {string[]} contextDependencies context (directory) dependencies
 * @property {string[]} missingDependencies missing dependencies
 */

const HASH_ESCAPE_REGEXP = /#/g;

// UTF-8 encoding of the BOM: EF BB BF
const UTF8_BOM_0 = 0xef;
const UTF8_BOM_1 = 0xbb;
const UTF8_BOM_2 = 0xbf;

/**
 * @param {Buffer} buf buffer
 * @returns {string} string, with a leading UTF-8 BOM skipped at the buffer level
 */
function utf8BufferToString(buf) {
	if (
		buf.length >= 3 &&
		buf[0] === UTF8_BOM_0 &&
		buf[1] === UTF8_BOM_1 &&
		buf[2] === UTF8_BOM_2
	) {
		return buf.toString("utf8", 3);
	}
	return buf.toString("utf8");
}

/**
 * Escape `#` with a preceding `\0` byte; short-circuits when there is no `#`.
 * @param {string} str input string
 * @returns {string} escaped string
 */
function escapeHash(str) {
	return str.includes("#") ? str.replace(HASH_ESCAPE_REGEXP, "\0#") : str;
}

const PATH_QUERY_FRAGMENT_REGEXP =
	/^((?:\0.|[^?#\0])*)(\?(?:\0.|[^#\0])*)?(#.*)?$/;
const ZERO_ESCAPE_REGEXP = /\0(.)/g;

/**
 * @param {string} identifier identifier
 * @returns {[string, string, string]} parsed [path, query, fragment]
 */
function parseIdentifier(identifier) {
	// Fast path for inputs that don't use \0 escaping.
	const firstEscape = identifier.indexOf("\0");

	if (firstEscape < 0) {
		const queryStart = identifier.indexOf("?");
		const fragmentStart = identifier.indexOf("#");

		if (fragmentStart < 0) {
			if (queryStart < 0) {
				return [identifier, "", ""];
			}

			return [
				identifier.slice(0, queryStart),
				identifier.slice(queryStart),
				""
			];
		}

		if (queryStart < 0 || fragmentStart < queryStart) {
			return [
				identifier.slice(0, fragmentStart),
				"",
				identifier.slice(fragmentStart)
			];
		}

		return [
			identifier.slice(0, queryStart),
			identifier.slice(queryStart, fragmentStart),
			identifier.slice(fragmentStart)
		];
	}

	const match =
		/** @type {RegExpExecArray} */
		(PATH_QUERY_FRAGMENT_REGEXP.exec(identifier));

	return [
		match[1].replace(ZERO_ESCAPE_REGEXP, "$1"),
		match[2] ? match[2].replace(ZERO_ESCAPE_REGEXP, "$1") : "",
		match[3] || ""
	];
}

/**
 * @param {string} path path
 * @returns {string} directory name
 */
function dirname(path) {
	if (path === "/") return "/";
	const i = path.lastIndexOf("/");
	const j = path.lastIndexOf("\\");
	const i2 = path.indexOf("/");
	const j2 = path.indexOf("\\");
	const idx = i > j ? i : j;
	const idx2 = i > j ? i2 : j2;
	if (idx < 0) return path;
	if (idx === idx2) return path.slice(0, idx + 1);
	return path.slice(0, idx);
}

/**
 * @param {LoaderItemInput} loader loader request or descriptor
 * @returns {LoaderObject} loader object
 */
function createLoaderObject(loader) {
	const obj = /** @type {LoaderObject} */ (
		/** @type {unknown} */ ({
			path: null,
			query: null,
			fragment: null,
			options: null,
			ident: null,
			normal: null,
			pitch: null,
			raw: null,
			data: null,
			pitchExecuted: false,
			normalExecuted: false
		})
	);
	Object.defineProperty(obj, "request", {
		enumerable: true,
		get() {
			return escapeHash(obj.path) + escapeHash(obj.query) + obj.fragment;
		},
		set(value) {
			if (typeof value === "string") {
				const [path, query, fragment] = parseIdentifier(value);
				obj.path = path;
				obj.query = query;
				obj.fragment = fragment;
				obj.options = undefined;
				obj.ident = undefined;
				return;
			}

			if (!value.loader) {
				throw new Error(
					`request should be a string or object with loader and options (${JSON.stringify(
						value
					)})`
				);
			}

			const { loader: path, fragment, type, options, ident } = value;
			obj.path = path;
			obj.fragment = fragment || "";
			obj.type = type;
			obj.options = options;
			obj.ident = ident;

			if (options === null || options === undefined) {
				obj.query = "";
			} else if (typeof options === "string") {
				obj.query = `?${options}`;
			} else if (ident) {
				obj.query = `??${ident}`;
			} else if (typeof options === "object" && options.ident) {
				obj.query = `??${options.ident}`;
			} else {
				obj.query = `?${JSON.stringify(options)}`;
			}
		}
	});
	obj.request = loader;
	if (Object.preventExtensions) {
		Object.preventExtensions(obj);
	}
	return obj;
}

/**
 * @param {EXPECTED_FUNCTION} fn the loader function
 * @param {EXPECTED_ANY} context the loader context
 * @param {EXPECTED_ANY[]} args arguments
 * @param {(...args: EXPECTED_ANY[]) => void} callback callback
 * @returns {void}
 */
function runSyncOrAsync(fn, context, args, callback) {
	let isSync = true;
	let isDone = false;
	let isError = false; // internal error
	let reportedError = false;

	/**
	 * @param {...EXPECTED_ANY} callbackArgs callback args
	 * @returns {void}
	 */
	function innerCallback(...callbackArgs) {
		if (isDone) {
			if (reportedError) return; // ignore
			throw new Error("callback(): The callback was already called.");
		}

		isDone = true;
		isSync = false;

		try {
			callback(...callbackArgs);
		} catch (err) {
			isError = true;
			throw err;
		}
	}
	context.callback = innerCallback;

	context.async = function async() {
		if (isDone) {
			if (reportedError) return; // ignore
			throw new Error("async(): The callback was already called.");
		}

		isSync = false;

		return innerCallback;
	};

	try {
		const result = (function LOADER_EXECUTION() {
			return fn.apply(context, args);
		})();
		if (isSync) {
			isDone = true;
			if (result === undefined) return callback(null);
			if (
				result &&
				typeof result === "object" &&
				typeof result.then === "function"
			) {
				return result.then((/** @type {EXPECTED_ANY} */ r) => {
					callback(null, r);
				}, callback);
			}
			return callback(null, result);
		}
	} catch (err) {
		if (isError) throw err;
		if (isDone) {
			// loader already finished; print the error since the callback is spent.
			if (typeof err === "object" && /** @type {Error} */ (err).stack) {
				// eslint-disable-next-line no-console
				console.error(/** @type {Error} */ (err).stack);
			} else {
				// eslint-disable-next-line no-console
				console.error(err);
			}
			return;
		}
		isDone = true;
		reportedError = true;
		callback(/** @type {Error} */ (err));
	}
}

/**
 * @param {EXPECTED_ANY[]} args arguments
 * @param {boolean | null=} raw whether the loader wants a Buffer
 * @returns {void}
 */
function convertArgs(args, raw) {
	if (!raw && Buffer.isBuffer(args[0])) {
		args[0] = utf8BufferToString(args[0]);
	} else if (raw && typeof args[0] === "string") {
		args[0] = Buffer.from(args[0], "utf8");
	}
}

/**
 * @param {ProcessOptions} options process options
 * @param {EXPECTED_ANY} loaderContext the loader context
 * @param {EXPECTED_ANY[]} args arguments
 * @param {(err: Error | null, args?: EXPECTED_ANY[]) => void} callback callback
 * @returns {void}
 */
function iterateNormalLoaders(options, loaderContext, args, callback) {
	while (loaderContext.loaderIndex >= 0) {
		const currentLoaderObject =
			loaderContext.loaders[loaderContext.loaderIndex];

		if (currentLoaderObject.normalExecuted) {
			loaderContext.loaderIndex--;
			continue;
		}

		const fn = currentLoaderObject.normal;
		currentLoaderObject.normalExecuted = true;

		if (!fn) continue;

		convertArgs(args, currentLoaderObject.raw);

		return runSyncOrAsync(fn, loaderContext, args, (err, ...nextArgs) => {
			if (err) return callback(err);
			iterateNormalLoaders(options, loaderContext, nextArgs, callback);
		});
	}

	return callback(null, args);
}

/**
 * @param {ProcessOptions} options process options
 * @param {EXPECTED_ANY} loaderContext the loader context
 * @param {(err: Error | null, args?: EXPECTED_ANY[]) => void} callback callback
 * @returns {void}
 */
function processResource(options, loaderContext, callback) {
	// set loader index to last loader
	loaderContext.loaderIndex = loaderContext.loaders.length - 1;

	const { resourcePath } = loaderContext;

	if (!resourcePath) {
		return iterateNormalLoaders(options, loaderContext, [null], callback);
	}

	options.processResource(loaderContext, resourcePath, (err, ...args) => {
		if (err) return callback(err);

		options.resourceBuffer = args[0];

		iterateNormalLoaders(options, loaderContext, args, callback);
	});
}

/**
 * @param {ProcessOptions} options process options
 * @param {EXPECTED_ANY} loaderContext the loader context
 * @param {(err: Error | null, args?: EXPECTED_ANY[]) => void} callback callback
 * @returns {void}
 */
function iteratePitchingLoaders(options, loaderContext, callback) {
	// Iterative walk over already-pitched loaders without recursion.
	while (loaderContext.loaderIndex < loaderContext.loaders.length) {
		const currentLoaderObject =
			loaderContext.loaders[loaderContext.loaderIndex];

		if (currentLoaderObject.pitchExecuted) {
			loaderContext.loaderIndex++;
			continue;
		}

		return loadLoader(currentLoaderObject, (err) => {
			if (err) {
				loaderContext.cacheable(false);
				return callback(err);
			}
			const fn = currentLoaderObject.pitch;
			currentLoaderObject.pitchExecuted = true;
			if (!fn) return iteratePitchingLoaders(options, loaderContext, callback);

			runSyncOrAsync(
				fn,
				loaderContext,
				[
					loaderContext.remainingRequest,
					loaderContext.previousRequest,
					(currentLoaderObject.data = {})
				],
				(pitchErr, ...args) => {
					if (pitchErr) return callback(pitchErr);
					// Continue pitching unless the pitch yielded a value (checked by
					// value, not arity, to support sync and async usage).
					let hasArg = false;
					for (let i = 0; i < args.length; i++) {
						if (args[i] !== undefined) {
							hasArg = true;
							break;
						}
					}
					if (hasArg) {
						loaderContext.loaderIndex--;
						iterateNormalLoaders(options, loaderContext, args, callback);
					} else {
						iteratePitchingLoaders(options, loaderContext, callback);
					}
				}
			);
		});
	}

	// Reached the end: move on to processing the resource itself.
	return processResource(options, loaderContext, callback);
}

/**
 * Join loader requests into a single `!`-separated string for a range of indices.
 * @param {LoaderObject[]} loaders loader objects
 * @param {number} start inclusive start index
 * @param {number} end exclusive end index
 * @param {string} resource resource string
 * @returns {string} joined request
 */
function joinRequests(loaders, start, end, resource) {
	let result = "";
	for (let i = start; i < end; i++) {
		result += `${loaders[i].request}!`;
	}
	return result + resource;
}

/**
 * @param {string} resource resource
 * @returns {string} the context (directory) of the resource
 */
module.exports.getContext = function getContext(resource) {
	const [path] = parseIdentifier(resource);
	return dirname(path);
};

/**
 * @param {RunLoaderOptions} options run options
 * @param {(err: Error | null, result: RunLoaderResult) => void} callback callback
 * @returns {void}
 */
module.exports.runLoaders = function runLoaders(options, callback) {
	// read options
	const resource = options.resource || "";
	const loaderContext = options.context || {};
	const processResourceFn =
		options.processResource ||
		/** @type {(readResource: EXPECTED_FUNCTION, context: EXPECTED_ANY, res: string, cb: (err: Error | null, ...args: EXPECTED_ANY[]) => void) => void} */
		(
			(readResource, context, res, cb) => {
				context.addDependency(res);
				readResource(res, cb);
			}
		).bind(null, options.readResource || readFile);

	const splittedResource = resource && parseIdentifier(resource);
	const resourcePath = splittedResource ? splittedResource[0] : "";
	const resourceQuery = splittedResource ? splittedResource[1] : "";
	const resourceFragment = splittedResource ? splittedResource[2] : "";
	const contextDirectory = resourcePath ? dirname(resourcePath) : null;

	// execution state
	let requestCacheable = true;
	/** @type {string[]} */
	const fileDependencies = [];
	/** @type {string[]} */
	const contextDependencies = [];
	/** @type {string[]} */
	const missingDependencies = [];

	// prepare loader objects
	const loaders = (options.loaders || []).map(createLoaderObject);

	loaderContext.context = contextDirectory;
	loaderContext.loaderIndex = 0;
	loaderContext.loaders = loaders;
	loaderContext.resourcePath = resourcePath;
	loaderContext.resourceQuery = resourceQuery;
	loaderContext.resourceFragment = resourceFragment;
	loaderContext.async = null;
	loaderContext.callback = null;
	loaderContext.cacheable = (/** @type {boolean=} */ flag) => {
		if (flag === false) {
			requestCacheable = false;
		}
	};
	loaderContext.dependency = loaderContext.addDependency = (
		/** @type {string} */ file
	) => {
		fileDependencies.push(file);
	};
	loaderContext.addContextDependency = (/** @type {string} */ context) => {
		contextDependencies.push(context);
	};
	loaderContext.addMissingDependency = (/** @type {string} */ context) => {
		missingDependencies.push(context);
	};
	loaderContext.getDependencies = () => [...fileDependencies];
	loaderContext.getContextDependencies = () => [...contextDependencies];
	loaderContext.getMissingDependencies = () => [...missingDependencies];
	loaderContext.clearDependencies = () => {
		fileDependencies.length = 0;
		contextDependencies.length = 0;
		missingDependencies.length = 0;
		requestCacheable = true;
	};
	Object.defineProperty(loaderContext, "resource", {
		enumerable: true,
		get() {
			return (
				escapeHash(loaderContext.resourcePath) +
				escapeHash(loaderContext.resourceQuery) +
				loaderContext.resourceFragment
			);
		},
		set(value) {
			const splitted = value && parseIdentifier(value);
			loaderContext.resourcePath = splitted ? splitted[0] : "";
			loaderContext.resourceQuery = splitted ? splitted[1] : "";
			loaderContext.resourceFragment = splitted ? splitted[2] : "";
		}
	});
	Object.defineProperty(loaderContext, "request", {
		enumerable: true,
		get() {
			return joinRequests(
				loaders,
				0,
				loaders.length,
				loaderContext.resource || ""
			);
		}
	});
	Object.defineProperty(loaderContext, "remainingRequest", {
		enumerable: true,
		get() {
			return joinRequests(
				loaders,
				loaderContext.loaderIndex + 1,
				loaders.length,
				loaderContext.resource
			);
		}
	});
	Object.defineProperty(loaderContext, "currentRequest", {
		enumerable: true,
		get() {
			return joinRequests(
				loaders,
				loaderContext.loaderIndex,
				loaders.length,
				loaderContext.resource
			);
		}
	});
	Object.defineProperty(loaderContext, "previousRequest", {
		enumerable: true,
		get() {
			const end = loaderContext.loaderIndex;
			if (end === 0) return "";
			let result = loaders[0].request;
			for (let i = 1; i < end; i++) {
				result += `!${loaders[i].request}`;
			}
			return result;
		}
	});
	Object.defineProperty(loaderContext, "query", {
		enumerable: true,
		get() {
			const entry = loaders[loaderContext.loaderIndex];
			return entry.options && typeof entry.options === "object"
				? entry.options
				: entry.query;
		}
	});
	Object.defineProperty(loaderContext, "data", {
		enumerable: true,
		get() {
			return loaders[loaderContext.loaderIndex].data;
		}
	});

	// finish loader context
	if (Object.preventExtensions) {
		Object.preventExtensions(loaderContext);
	}

	/** @type {ProcessOptions} */
	const processOptions = {
		resourceBuffer: null,
		processResource: processResourceFn
	};
	iteratePitchingLoaders(processOptions, loaderContext, (err, result) => {
		if (err) {
			return callback(err, {
				cacheable: requestCacheable,
				fileDependencies,
				contextDependencies,
				missingDependencies
			});
		}
		callback(null, {
			result,
			resourceBuffer: processOptions.resourceBuffer,
			cacheable: requestCacheable,
			fileDependencies,
			contextDependencies,
			missingDependencies
		});
	});
};
