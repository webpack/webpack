/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

"use strict";

/** @typedef {import("enhanced-resolve/lib/Resolver")} Resolver */
/** @typedef {import("../Compiler")} Compiler */
/** @typedef {import("../FileSystemInfo")} FileSystemInfo */

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
		compiler.hooks.thisCompilation.tap("ResolverCachePlugin", compilation => {
			fileSystemInfo = compilation.fileSystemInfo;
		});
		const doRealResolve = (
			identifier,
			type,
			resolver,
			resolveContext,
			request,
			callback
		) => {
			const newRequest = Object.assign(
				{
					_ResolverCachePluginCacheMiss: true
				},
				request
			);
			const newResolveContext = Object.assign({}, resolveContext, {
				stack: new Set(),
				missing: new Set(),
				fileDependencies: new Set(),
				contextDependencies: new Set()
			});
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
					propagate("missing");
					propagate("fileDependencies");
					propagate("contextDependencies");
					if (err) return callback(err);
					const fileDependencies = newResolveContext.fileDependencies;
					const contextDependencies = newResolveContext.contextDependencies;
					const missingDependencies = newResolveContext.missing;
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
								{
									result,
									missing: newResolveContext.missing,
									fileDependencies: newResolveContext.fileDependencies,
									contextDependencies: newResolveContext.contextDependencies,
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
								const processCacheResult = (err, cacheEntry) => {
									if (err) return callback(err);

									if (cacheEntry) {
										fileSystemInfo.checkSnapshotValid(
											cacheEntry.snapshot,
											(err, valid) => {
												if (err || !valid) {
													return doRealResolve(
														identifier,
														type,
														resolver,
														resolveContext,
														request,
														callback
													);
												}
												if (resolveContext.missing) {
													for (const item of cacheEntry.missing) {
														resolveContext.missing.add(item);
													}
												}
												if (resolveContext.fileDependencies) {
													for (const item of cacheEntry.fileDependencies) {
														resolveContext.fileDependencies.add(item);
													}
												}
												if (resolveContext.contextDependencies) {
													for (const item of cacheEntry.contextDependencies) {
														resolveContext.contextDependencies.add(item);
													}
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
