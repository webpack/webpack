/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

"use strict";

const { readFile } = require("fs");
const { parseResource } = require("../util/identifier");
const loadLoader = require("./loadLoader");

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
 * @property {string[]} notCacheableReasons reasons why the request is not cacheable (e.g. paths of loaders that marked it)
 * @property {string[]} fileDependencies file dependencies
 * @property {string[]} contextDependencies context (directory) dependencies
 * @property {string[]} missingDependencies missing dependencies
 */

/** @typedef {(...args: EXPECTED_ANY[]) => void} LoaderCallback */

/** @typedef {import("../../declarations/LoaderContext").LoaderRunnerLoaderContext<EXPECTED_ANY>} LoaderRunnerLoaderContext */

/**
 * The loader context as the runner sees and mutates it: the canonical
 * `LoaderRunnerLoaderContext` shape (not re-declared here), with only the fields
 * the runner assigns internally before a loader runs widened to their mutable
 * form (nullable `context`/`callback`/`async`, `LoaderObject` loaders).
 * @typedef {Omit<LoaderRunnerLoaderContext, "context" | "callback" | "async" | "loaders"> & { context: string | null, callback: LoaderCallback | null, async: (() => LoaderCallback | undefined) | null, loaders: LoaderObject[] }} LoaderContext
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
 * A single loader in the pipeline. `request` is an accessor: reading it
 * serializes path/query/fragment; assigning a string or descriptor parses it.
 */
class LoaderObject {
	/**
	 * @param {LoaderItemInput} loader loader request or descriptor
	 */
	constructor(loader) {
		/** @type {string} */
		this.path = "";
		/** @type {string} */
		this.query = "";
		/** @type {string} */
		this.fragment = "";
		/** @type {string | { [key: string]: EXPECTED_ANY } | null=} */
		this.options = null;
		/** @type {string | null=} */
		this.ident = null;
		/** @type {string=} */
		this.type = undefined;
		/** @type {EXPECTED_FUNCTION | null=} */
		this.normal = null;
		/** @type {EXPECTED_FUNCTION | null=} */
		this.pitch = null;
		/** @type {boolean | null=} */
		this.raw = null;
		/** @type {EXPECTED_OBJECT | null=} */
		this.data = null;
		this.pitchExecuted = false;
		this.normalExecuted = false;
		// enumerable own accessor: class getters are non-enumerable and would be
		// dropped when the loader object is serialized (loaders rely on `request`)
		Object.defineProperty(this, "request", REQUEST_DESCRIPTOR);
		this.request = loader;
		Object.preventExtensions(this);
	}

	/**
	 * @returns {string} the loader request (path + query + fragment)
	 */
	get request() {
		return escapeHash(this.path) + escapeHash(this.query) + this.fragment;
	}

	/**
	 * @param {LoaderItemInput} value loader request or descriptor
	 */
	set request(value) {
		if (typeof value === "string") {
			const { path, query, fragment } = parseResource(value);
			this.path = path;
			this.query = query;
			this.fragment = fragment;
			this.options = undefined;
			this.ident = undefined;
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
		this.path = path;
		this.fragment = fragment || "";
		this.type = type;
		this.options = options;
		this.ident = ident;

		if (options === null || options === undefined) {
			this.query = "";
		} else if (typeof options === "string") {
			this.query = `?${options}`;
		} else if (ident) {
			this.query = `??${ident}`;
		} else if (typeof options === "object" && options.ident) {
			this.query = `??${options.ident}`;
		} else {
			this.query = `?${JSON.stringify(options)}`;
		}
	}
}

// Shared enumerable descriptor reusing the prototype's `request` accessor.
const REQUEST_DESCRIPTOR = {
	.../** @type {PropertyDescriptor} */ (
		Object.getOwnPropertyDescriptor(LoaderObject.prototype, "request")
	),
	enumerable: true
};

/**
 * @param {EXPECTED_FUNCTION} fn the loader function
 * @param {LoaderContext} context the loader context
 * @param {EXPECTED_ANY[]} args arguments
 * @param {LoaderCallback} callback callback
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
 * @param {LoaderContext} loaderContext the loader context
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

		if (!fn) {
			loaderContext.loaderIndex--;
			continue;
		}

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
 * @param {LoaderContext} loaderContext the loader context
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
 * @param {LoaderContext} loaderContext the loader context
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

module.exports.LoaderObject = LoaderObject;

module.exports.createLoaderContext = createLoaderContext;

/**
 * @param {string} resource resource
 * @returns {string} the context (directory) of the resource
 */
module.exports.getContext = function getContext(resource) {
	return dirname(parseResource(resource).path);
};

/**
 * @typedef {object} LoaderState
 * @property {boolean} cacheable whether the request is cacheable
 * @property {string[]} notCacheableReasons reasons why the request is not cacheable (e.g. paths of loaders that marked it)
 * @property {string[]} fileDependencies collected file dependencies
 * @property {string[]} contextDependencies collected context dependencies
 * @property {string[]} missingDependencies collected missing dependencies
 */

// Carries the mutable result state off the loader-visible surface, so loaders
// and JSON serialization of the context never see it.
const LOADER_STATE = Symbol("loader context state");

/**
 * @param {LoaderContext} loaderContext loader context
 * @returns {LoaderState} the hidden mutable state carried under `LOADER_STATE`
 */
function getState(loaderContext) {
	return /** @type {EXPECTED_ANY} */ (loaderContext)[LOADER_STATE];
}

/**
 * Phase 1 of loader-context construction (the single place the context shape is
 * defined): augments `base` in place with fresh result state and the dependency
 * methods. Phase 2 lives in `runLoaders`, which sets the resource-derived fields
 * and the `request` accessors once host hooks have populated the context, then
 * freezes it — the accessors are added last so V8 keeps the context in
 * fast-properties mode. Returned unfrozen.
 * @param {EXPECTED_ANY=} base object to augment (the caller's context), if any
 * @returns {LoaderContext} the loader context
 */
function createLoaderContext(base) {
	/** @type {LoaderState} */
	const state = {
		cacheable: true,
		notCacheableReasons: [],
		fileDependencies: [],
		contextDependencies: [],
		missingDependencies: []
	};

	const loaderContext = /** @type {LoaderContext} */ (base || {});
	// resource-derived fields and loaders are set by runLoaders (after hooks)
	loaderContext.context = null;
	loaderContext.loaderIndex = 0;
	loaderContext.loaders = [];
	loaderContext.resourcePath = "";
	loaderContext.resourceQuery = "";
	loaderContext.resourceFragment = "";
	loaderContext.async = null;
	loaderContext.callback = null;
	// closures over `state` (not `this`-based): loaders pass these as detached
	// callbacks, e.g. `deps.forEach(this.addDependency)`, so they must not rely on
	// the receiver
	loaderContext.cacheable = (flag) => {
		if (flag === false) {
			state.cacheable = false;
			// attribute the flag to the running loader; absent when the host marks
			// the request outside the loader run (e.g. in a beforeLoaders hook)
			const currentLoader = loaderContext.loaders[loaderContext.loaderIndex];
			if (
				currentLoader &&
				!state.notCacheableReasons.includes(currentLoader.path)
			) {
				state.notCacheableReasons.push(currentLoader.path);
			}
		}
	};
	loaderContext.dependency = loaderContext.addDependency = (file) => {
		state.fileDependencies.push(file);
	};
	loaderContext.addContextDependency = (context) => {
		state.contextDependencies.push(context);
	};
	loaderContext.addMissingDependency = (missing) => {
		state.missingDependencies.push(missing);
	};
	loaderContext.getDependencies = () => [...state.fileDependencies];
	loaderContext.getContextDependencies = () => [...state.contextDependencies];
	loaderContext.getMissingDependencies = () => [...state.missingDependencies];
	loaderContext.clearDependencies = () => {
		state.fileDependencies.length = 0;
		state.contextDependencies.length = 0;
		state.missingDependencies.length = 0;
		state.cacheable = true;
		state.notCacheableReasons.length = 0;
	};
	Object.defineProperty(loaderContext, LOADER_STATE, { value: state });
	return loaderContext;
}

/**
 * Marks the request as not cacheable with the given reasons instead of
 * attributing the currently running loader (used by the host when the cause
 * lives outside the loader, e.g. in a child compilation of `importModule`).
 * @param {LoaderRunnerLoaderContext} loaderContext loader context
 * @param {string[]} reasons reasons why the request is not cacheable
 * @returns {void}
 */
module.exports.markNotCacheable = (loaderContext, reasons) => {
	const state = getState(/** @type {LoaderContext} */ (loaderContext));
	state.cacheable = false;
	for (const reason of reasons) {
		if (!state.notCacheableReasons.includes(reason)) {
			state.notCacheableReasons.push(reason);
		}
	}
};

/**
 * The `request`-family accessors. Enumerable because loaders serialize the
 * context; shared (no per-context closures) and `this`-based. Added last, via
 * `Object.defineProperties`, to keep the context in fast-properties mode. Shared
 * (same descriptors), so re-defining them on a reused context is a harmless no-op.
 * @type {PropertyDescriptorMap & ThisType<LoaderContext>}
 */
const ACCESSORS = {
	resource: {
		enumerable: true,
		get() {
			return (
				escapeHash(this.resourcePath) +
				escapeHash(this.resourceQuery) +
				this.resourceFragment
			);
		},
		set(value) {
			const splitted = value && parseResource(value);
			this.resourcePath = splitted ? splitted.path : "";
			this.resourceQuery = splitted ? splitted.query : "";
			this.resourceFragment = splitted ? splitted.fragment : "";
		}
	},
	request: {
		enumerable: true,
		get() {
			return joinRequests(
				this.loaders,
				0,
				this.loaders.length,
				this.resource || ""
			);
		}
	},
	remainingRequest: {
		enumerable: true,
		get() {
			return joinRequests(
				this.loaders,
				this.loaderIndex + 1,
				this.loaders.length,
				this.resource
			);
		}
	},
	currentRequest: {
		enumerable: true,
		get() {
			return joinRequests(
				this.loaders,
				this.loaderIndex,
				this.loaders.length,
				this.resource
			);
		}
	},
	previousRequest: {
		enumerable: true,
		get() {
			const { loaders } = this;
			const end = this.loaderIndex;
			if (end === 0) return "";
			let result = loaders[0].request;
			for (let i = 1; i < end; i++) {
				result += `!${loaders[i].request}`;
			}
			return result;
		}
	},
	query: {
		enumerable: true,
		get() {
			const entry = this.loaders[this.loaderIndex];
			return entry.options && typeof entry.options === "object"
				? entry.options
				: entry.query;
		}
	},
	data: {
		enumerable: true,
		get() {
			return this.loaders[this.loaderIndex].data;
		}
	}
};

/**
 * @param {RunLoaderOptions} options run options
 * @param {(err: Error | null, result: RunLoaderResult) => void} callback callback
 * @returns {void}
 */
module.exports.runLoaders = function runLoaders(options, callback) {
	// reuse a context already prepared by createLoaderContext (e.g. from
	// NormalModule), else augment the caller-provided context (or a fresh object)
	// in place. State is intentionally preserved across the handoff, so host hooks
	// (e.g. beforeLoaders) can pre-add dependencies or mark the request
	// non-cacheable before the run; a caller re-running on the same context should
	// clearDependencies() first to avoid accumulating stale dependencies.
	const provided = /** @type {EXPECTED_ANY} */ (options.context);
	const loaderContext =
		provided && provided[LOADER_STATE]
			? /** @type {LoaderContext} */ (provided)
			: createLoaderContext(provided);
	const state = getState(loaderContext);

	// (re)set iteration + resource fields and map loaders now, after host hooks
	// (e.g. NormalModule's loader/beforeLoaders) have run and may have changed them
	loaderContext.loaderIndex = 0;
	const resource = options.resource || "";
	const splittedResource = resource && parseResource(resource);
	loaderContext.resourcePath = splittedResource ? splittedResource.path : "";
	loaderContext.resourceQuery = splittedResource ? splittedResource.query : "";
	loaderContext.resourceFragment = splittedResource
		? splittedResource.fragment
		: "";
	loaderContext.context = loaderContext.resourcePath
		? dirname(loaderContext.resourcePath)
		: null;
	loaderContext.loaders = (options.loaders || []).map(
		(loader) => new LoaderObject(loader)
	);

	const processResourceFn =
		options.processResource ||
		/** @type {(readResource: EXPECTED_FUNCTION, context: EXPECTED_ANY, res: string, cb: (err: Error | null, ...args: EXPECTED_ANY[]) => void) => void} */
		(
			(readResource, context, res, cb) => {
				context.addDependency(res);
				readResource(res, cb);
			}
		).bind(null, options.readResource || readFile);

	// add accessors last (keeps fast properties) and freeze, now that callers
	// (e.g. NormalModule's beforeLoaders) have populated the context
	Object.defineProperties(loaderContext, ACCESSORS);
	Object.preventExtensions(loaderContext);

	/** @type {ProcessOptions} */
	const processOptions = {
		resourceBuffer: null,
		processResource: processResourceFn
	};
	iteratePitchingLoaders(processOptions, loaderContext, (err, result) => {
		if (err) {
			return callback(err, {
				cacheable: state.cacheable,
				notCacheableReasons: state.notCacheableReasons,
				fileDependencies: state.fileDependencies,
				contextDependencies: state.contextDependencies,
				missingDependencies: state.missingDependencies
			});
		}
		callback(null, {
			result,
			resourceBuffer: processOptions.resourceBuffer,
			cacheable: state.cacheable,
			notCacheableReasons: state.notCacheableReasons,
			fileDependencies: state.fileDependencies,
			contextDependencies: state.contextDependencies,
			missingDependencies: state.missingDependencies
		});
	});
};
