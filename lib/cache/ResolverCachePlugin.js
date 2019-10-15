/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

"use strict";

/** @typedef {import("enhanced-resolve/lib/Resolver")} Resolver */
/** @typedef {import("../Compiler")} Compiler */
/** @typedef {import("../FileSystemInfo")} FileSystemInfo */
/** @typedef {import("../FileSystemInfo").Snapshot} Snapshot */
/** @template T @typedef {import("../util/LazySet")<T>} LazySet<T> */

/**
 * @typedef {Object} CacheEntry
 * @property {Object} result
 * @property {Set<string>} fileDependencies
 * @property {Set<string>} contextDependencies
 * @property {Set<string>} missingDependencies
 * @property {Snapshot} snapshot
 */

/**
 * @template T
 * @param {Set<T> | LazySet<T>} set set to add items to
 * @param {Set<T>} otherSet set to add items from
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
 * @param {Object} request a request
 * @returns {string} stringified version
 */
const requestToString = request => {
	let str = "";
	for (const key in request) {
		const value = request[key];
		if (typeof value === "object" && value !== null) {
			str += `/${key}={${requestToString(value)}}`;
		} else {
			str += `/${key}=${value}`;
		}
	}
	return str;
};

class ResolverCachePlugin {
	/**
	 * @param {Compiler} compiler Webpack compiler
	 * @returns {void}
	 */
	apply(compiler) {
		const cache = compiler.cache;
		/** @type {FileSystemInfo} */
		let fileSystemInfo;
		let realResolves = 0;
		let cachedResolves = 0;
		let cacheInvalidResolves = 0;
		compiler.hooks.thisCompilation.tap("ResolverCachePlugin", compilation => {
			fileSystemInfo = compilation.fileSystemInfo;
			compilation.hooks.finishModules.tap("ResolverCachePlugin", () => {
				const logger = compilation.getLogger("webpack.ResolverCachePlugin");
				logger.debug(
					`${Math.round(
						(100 * realResolves) / (realResolves + cachedResolves)
					)}% really resolved (${realResolves} real resolves, ${cachedResolves} cached, ${cacheInvalidResolves} cached but invalid)`
				);
				realResolves = 0;
				cachedResolves = 0;
				cacheInvalidResolves = 0;
			});
		});
		/**
		 * @param {string} identifier cache key
		 * @param {string} type resolver type
		 * @param {Resolver} resolver the resolver
		 * @param {Object} resolveContext context for resolving meta info
		 * @param {Object} request the request info object
		 * @param {function(Error=, Object=): void} callback callback function
		 * @returns {void}
		 */
		const doRealResolve = (
			identifier,
			type,
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
				missingDependencies: new Set(),
				fileDependencies: new Set(),
				contextDependencies: new Set()
			};
			const propagate = key => {
				if (resolveContext[key]) {
					for (const dep of newResolveContext[key]) {
						resolveContext[key].add(dep);
					}
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
					// TODO remove this when enhanced-resolve supports fileDependencies
					if (result && result.path) {
						fileDependencies.add(result.path);
					}
					fileSystemInfo.createSnapshot(
						resolveTime,
						fileDependencies,
						contextDependencies,
						missingDependencies,
						null,
						(err, snapshot) => {
							if (err) return callback(err);
							cache.store(
								identifier,
								null,
								/** @type {CacheEntry} */ {
									result,
									fileDependencies: newResolveContext.fileDependencies,
									contextDependencies: newResolveContext.contextDependencies,
									missingDependencies: newResolveContext.missingDependencies,
									snapshot
								},
								storeErr => {
									if (storeErr) return callback(storeErr);
									if (result) return callback(null, result);
									callback();
								}
							);
						}
					);
				}
			);
		};
		compiler.resolverFactory.hooks.resolver.intercept({
			factory(type, hook) {
				hook.tap(
					"ResolverCachePlugin",
					/**
					 * @param {Resolver} resolver the resolver
					 * @param {Object} options resolve options
					 * @returns {void}
					 */
					(resolver, options) => {
						if (options.cache !== true) return;
						resolver.hooks.resolve.tapAsync(
							{
								name: "ResolverCachePlugin",
								stage: -100
							},
							(request, resolveContext, callback) => {
								if (request._ResolverCachePluginCacheMiss || !fileSystemInfo) {
									return callback();
								}
								const identifier = `/resolve/${type}${requestToString(
									request
								)}`;
								/**
								 * @param {Error=} err error if any
								 * @param {CacheEntry=} cacheEntry cache entry
								 * @returns {void}
								 */
								const processCacheResult = (err, cacheEntry) => {
									if (err) return callback(err);

									if (cacheEntry) {
										fileSystemInfo.checkSnapshotValid(
											cacheEntry.snapshot,
											(err, valid) => {
												if (err || !valid) {
													cacheInvalidResolves++;
													return doRealResolve(
														identifier,
														type,
														resolver,
														resolveContext,
														request,
														callback
													);
												}
												cachedResolves++;
												if (resolveContext.missingDependencies) {
													addAllToSet(
														resolveContext.missingDependencies,
														cacheEntry.missingDependencies
													);
												}
												if (resolveContext.fileDependencies) {
													addAllToSet(
														resolveContext.fileDependencies,
														cacheEntry.fileDependencies
													);
												}
												if (resolveContext.contextDependencies) {
													addAllToSet(
														resolveContext.contextDependencies,
														cacheEntry.contextDependencies
													);
												}
												callback(null, cacheEntry.result);
											}
										);
									} else {
										doRealResolve(
											identifier,
											type,
											resolver,
											resolveContext,
											request,
											callback
										);
									}
								};
								cache.get(identifier, null, processCacheResult);
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
