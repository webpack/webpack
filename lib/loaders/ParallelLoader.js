/*
	MIT License http://www.opensource.org/licenses/mit-license.php
*/

"use strict";

const { getScheme } = require("../util/URLAbsoluteSpecifier");
const { markNotCacheable } = require("./LoaderRunner");
const { getWorkerPool } = require("./ParallelLoaderWorkerPool");

/** @typedef {import("./LoaderRunner").LoaderObject} LoaderObject */
/** @typedef {import("./ParallelLoaderWorkerPool").JobResult} JobResult */

/**
 * The fields below are constant for a whole compilation. One object per
 * compilation lets the pool intern it by identity and ship it to each worker
 * once, instead of cloning it into every job.
 * @type {WeakMap<EXPECTED_OBJECT, EXPECTED_ANY>}
 */
const constantsByCompilation = new WeakMap();

/**
 * @param {EXPECTED_ANY} loaderContext the loader context
 * @returns {EXPECTED_ANY} the compilation-wide worker constants
 */
const getConstants = (loaderContext) => {
	const compilation = loaderContext._compilation;
	let constants = constantsByCompilation.get(compilation);
	if (constants === undefined) {
		constants = {
			mode: loaderContext.mode,
			target: loaderContext.target,
			rootContext: loaderContext.rootContext,
			hashFunction: loaderContext.hashFunction,
			hashDigest: loaderContext.hashDigest,
			hashDigestLength: loaderContext.hashDigestLength,
			hashSalt: loaderContext.hashSalt,
			environment: loaderContext.environment,
			validate: Boolean(compilation.options.validate)
		};
		constantsByCompilation.set(compilation, constants);
	}
	return constants;
};

/**
 * Structured clone hands back a plain `Uint8Array`; `NormalModule` expects a
 * `Buffer` for binary module types.
 * @param {EXPECTED_ANY} value loader result value
 * @returns {EXPECTED_ANY} the value, as a Buffer when it came back as bytes
 */
const asBufferIfBytes = (value) => {
	if (value instanceof Uint8Array && !Buffer.isBuffer(value)) {
		return Buffer.from(value.buffer, value.byteOffset, value.byteLength);
	}
	return value;
};

/**
 * Runs every loader placed after this one in the chain inside a worker thread.
 * The pitch returns the worker's result, which makes the loader runner skip
 * both the remaining loaders and the resource read on the main thread.
 * @this {EXPECTED_ANY}
 * @returns {void}
 */
function pitch() {
	const pool = getWorkerPool(this._compiler);
	// no pool means `experiments.parallel.loader` is off for this compiler: fall
	// through and let the rest of the chain run inline
	if (pool === undefined) return;

	const remaining = this.loaders.slice(this.loaderIndex + 1);
	if (remaining.length === 0) return;

	// scheme-backed resources (data:, http:, …) are read through `NormalModule`'s
	// readResource hooks, which live on the main thread and have no worker
	// equivalent, so those chains stay inline
	if (getScheme(this.resource) !== undefined) return;

	const callback = this.async();

	pool.run(
		{
			resource: this.resource,
			loaders: remaining.map((/** @type {LoaderObject} */ loader) => ({
				loader: loader.path,
				options: loader.options,
				ident: loader.ident,
				type: loader.type
			})),
			sourceMap: this.sourceMap,
			hot: this.hot,
			constants: getConstants(this)
		},
		this,
		(err, result) => {
			if (result) {
				if (result.cacheable === false) {
					if (result.notCacheableReasons.length > 0) {
						markNotCacheable(this, result.notCacheableReasons);
					} else {
						this.cacheable(false);
					}
				}
				for (const dependency of result.fileDependencies) {
					this.addDependency(dependency);
				}
				for (const dependency of result.contextDependencies) {
					this.addContextDependency(dependency);
				}
				for (const dependency of result.missingDependencies) {
					this.addMissingDependency(dependency);
				}
				for (const dependency of result.buildDependencies) {
					this.addBuildDependency(dependency);
				}
			}

			if (err) return callback(err);

			const values = /** @type {JobResult} */ (result).result;

			callback(null, ...values.map(asBufferIfBytes));
		}
	);
}

module.exports.pitch = pitch;
