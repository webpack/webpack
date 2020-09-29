/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

"use strict";

const LazySet = require("../util/LazySet");
const makeSerializable = require("../util/makeSerializable");

/** @typedef {import("enhanced-resolve/lib/Resolver")} Resolver */
/** @typedef {import("../CacheFacade").ItemCacheFacade} ItemCacheFacade */
/** @typedef {import("../Compiler")} Compiler */
/** @typedef {import("../FileSystemInfo")} FileSystemInfo */
/** @typedef {import("../FileSystemInfo").Snapshot} Snapshot */
/** @template T @typedef {import("../util/LazySet")<T>} LazySet<T> */

class CacheEntry {
	constructor(result, snapshot) {
		this.result = result;
		this.snapshot = snapshot;
	}

	serialize({ write }) {
		write(this.result);
		write(this.snapshot);
	}

	deserialize({ read }) {
		this.result = read();
		this.snapshot = read();
	}
}

makeSerializable(CacheEntry, "webpack/lib/cache/ResolverCachePlugin");

/**
 * @template T
 * @param {Set<T> | LazySet<T>} set set to add items to
 * @param {Set<T> | LazySet<T>} otherSet set to add items from
 * @returns {void}
 */
const addAllToSet = (set, otherSet) => {
	if ("addAll" in set) {
		set.addAll(otherSet);
	} else {
		for (const item of otherSet) {
			set.add(item);
		}
	}
};

/**
 * @param {Object} object an object
 * @param {boolean} excludeContext if true, context is not included in string
 * @returns {string} stringified version
 */
const objectToString = (object, excludeContext) => {
	let str = "";
	for (const key in object) {
		if (excludeContext && key === "context") continue;
		const value = object[key];
		if (typeof value === "object" && value !== null) {
			str += `|${key}=[${objectToString(value, false)}|]`;
		} else {
			str += `|${key}=|${value}`;
		}
	}
	return str;
};

class ResolverCachePlugin {
	/**
	 * Apply the plugin
	 * @param {Compiler} compiler the compiler instance
	 * @returns {void}
	 */
	apply(compiler) {
		const cache = compiler.getCache("ResolverCachePlugin");
		/** @type {FileSystemInfo} */
		let fileSystemInfo;
		let snapshotOptions;
		let realResolves = 0;
		let cachedResolves = 0;
		let cacheInvalidResolves = 0;
		let concurrentResolves = 0;
		compiler.hooks.thisCompilation.tap("ResolverCachePlugin", compilation => {
			snapshotOptions = compilation.options.snapshot.resolve;
			fileSystemInfo = compilation.fileSystemInfo;
			compilation.hooks.finishModules.tap("ResolverCachePlugin", () => {
				if (realResolves + cachedResolves > 0) {
					const logger = compilation.getLogger("webpack.ResolverCachePlugin");
					logger.log(
						`${Math.round(
							(100 * realResolves) / (realResolves + cachedResolves)
						)}% really resolved (${realResolves} real resolves with ${cacheInvalidResolves} cached but invalid, ${cachedResolves} cached valid, ${concurrentResolves} concurrent)`
					);
					realResolves = 0;
					cachedResolves = 0;
					cacheInvalidResolves = 0;
					concurrentResolves = 0;
				}
			});
		});
		/**
		 * @param {ItemCacheFacade} itemCache cache
		 * @param {Resolver} resolver the resolver
		 * @param {Object} resolveContext context for resolving meta info
		 * @param {Object} request the request info object
		 * @param {function(Error=, Object=): void} callback callback function
		 * @returns {void}
		 */
		const doRealResolve = (
			itemCache,
			resolver,
			resolveContext,
			request,
			callback
		) => {
			realResolves++;
			const newRequest = {
				_ResolverCachePluginCacheMiss: true,
				...request
			};
			const newResolveContext = {
				...resolveContext,
				stack: new Set(),
				missingDependencies: new LazySet(),
				fileDependencies: new LazySet(),
				contextDependencies: new LazySet()
			};
			const propagate = key => {
				if (resolveContext[key]) {
					addAllToSet(resolveContext[key], newResolveContext[key]);
				}
			};
			const resolveTime = Date.now();
			resolver.doResolve(
				resolver.hooks.resolve,
				newRequest,
				"Cache miss",
				newResolveContext,
				(err, result) => {
					propagate("fileDependencies");
					propagate("contextDependencies");
					propagate("missingDependencies");
					if (err) return callback(err);
					const fileDependencies = newResolveContext.fileDependencies;
					const contextDependencies = newResolveContext.contextDependencies;
					const missingDependencies = newResolveContext.missingDependencies;
					fileSystemInfo.createSnapshot(
						resolveTime,
						fileDependencies,
						contextDependencies,
						missingDependencies,
						snapshotOptions,
						(err, snapshot) => {
							if (err) return callback(err);
							if (!snapshot) {
								if (result) return callback(null, result);
								return callback();
							}
							itemCache.store(new CacheEntry(result, snapshot), storeErr => {
								if (storeErr) return callback(storeErr);
								if (result) return callback(null, result);
								callback();
							});
						}
					);
				}
			);
		};
		compiler.resolverFactory.hooks.resolver.intercept({
			factory(type, hook) {
				/** @type {Map<string, (function(Error=, Object=): void)[]>} */
				const activeRequests = new Map();
				hook.tap(
					"ResolverCachePlugin",
					/**
					 * @param {Resolver} resolver the resolver
					 * @param {Object} options resolve options
					 * @param {Object} userOptions resolve options passed by the user
					 * @returns {void}
					 */
					(resolver, options, userOptions) => {
						if (options.cache !== true) return;
						const optionsIdent = objectToString(userOptions, false);
						const cacheWithContext =
							options.cacheWithContext !== undefined
								? options.cacheWithContext
								: false;
						resolver.hooks.resolve.tapAsync(
							{
								name: "ResolverCachePlugin",
								stage: -100
							},
							(request, resolveContext, callback) => {
								if (request._ResolverCachePluginCacheMiss || !fileSystemInfo) {
									return callback();
								}
								const identifier = `${type}${optionsIdent}${objectToString(
									request,
									!cacheWithContext
								)}`;
								const activeRequest = activeRequests.get(identifier);
								if (activeRequest) {
									activeRequest.push(callback);
									return;
								}
								const itemCache = cache.getItemCache(identifier, null);
								let callbacks;
								const done = (err, result) => {
									if (callbacks === undefined) {
										callback(err, result);
										callbacks = false;
									} else {
										for (const callback of callbacks) {
											callback(err, result);
										}
										activeRequests.delete(identifier);
										callbacks = false;
									}
								};
								/**
								 * @param {Error=} err error if any
								 * @param {CacheEntry=} cacheEntry cache entry
								 * @returns {void}
								 */
								const processCacheResult = (err, cacheEntry) => {
									if (err) return done(err);

									if (cacheEntry) {
										const { snapshot, result } = cacheEntry;
										fileSystemInfo.checkSnapshotValid(
											snapshot,
											(err, valid) => {
												if (err || !valid) {
													cacheInvalidResolves++;
													return doRealResolve(
														itemCache,
														resolver,
														resolveContext,
														request,
														done
													);
												}
												cachedResolves++;
												if (resolveContext.missingDependencies) {
													addAllToSet(
														resolveContext.missingDependencies,
														snapshot.getMissingIterable()
													);
												}
												if (resolveContext.fileDependencies) {
													addAllToSet(
														resolveContext.fileDependencies,
														snapshot.getFileIterable()
													);
												}
												if (resolveContext.contextDependencies) {
													addAllToSet(
														resolveContext.contextDependencies,
														snapshot.getContextIterable()
													);
												}
												done(null, result);
											}
										);
									} else {
										doRealResolve(
											itemCache,
											resolver,
											resolveContext,
											request,
											done
										);
									}
								};
								itemCache.get(processCacheResult);
								if (callbacks === undefined) {
									callbacks = [callback];
									activeRequests.set(identifier, callbacks);
								}
							}
						);
					}
				);
				return hook;
			}
		});
	}
}

module.exports = ResolverCachePlugin;
