/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

"use strict";

const asyncLib = require("neo-async");

/** @typedef {import("enhanced-resolve/lib/Resolver")} Resolver */
/** @typedef {import("../Compiler")} Compiler */
/** @typedef {import("../FileSystemInfo")} FileSystemInfo */

const INVALID = {};

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
					const fileDependencies = new Set(newResolveContext.fileDependencies);
					if (newResolveContext.missing) {
						for (const missing of newResolveContext.missing) {
							fileDependencies.add(missing);
						}
					}
					const contextDependencies = new Set(
						newResolveContext.contextDependencies
					);
					// TODO remove this when enhanced-resolve supports fileDependencies
					if (result && result.path) {
						fileDependencies.add(result.path);
					}
					const fileTimestamps = new Map();
					const contextTimestamps = new Map();
					const store = () => {
						cache.store(
							identifier,
							null,
							{
								result,
								resolveTime,
								fileTimestamps,
								contextTimestamps
							},
							restoreErr => {
								if (restoreErr) return callback(restoreErr);
								if (result) return callback(null, result);
								callback();
							}
						);
					};
					asyncLib.parallel(
						[
							asyncLib.each.bind(
								asyncLib,
								fileDependencies,
								(dep, callback) => {
									fileSystemInfo.getFileTimestamp(dep, (err, entry) => {
										if (err) {
											fileTimestamps.set(dep, "error");
										} else {
											fileTimestamps.set(dep, entry && entry.timestamp);
										}
										callback();
									});
								}
							),
							asyncLib.each.bind(
								asyncLib,
								contextDependencies,
								(dep, callback) => {
									fileSystemInfo.getContextTimestamp(dep, (err, entry) => {
										contextTimestamps.set(dep, "error");
										// TODO: getContextTimestamp is not implemented yet
										callback();
									});
								}
							)
						],
						err => {
							if (err) return callback(err);
							store();
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
								const identifier = `/resolve/${type}/${JSON.stringify(
									request
								)}`;
								cache.get(identifier, null, (err, cacheEntry) => {
									if (err) return callback(err);

									if (cacheEntry) {
										const {
											result,
											resolveTime,
											fileTimestamps,
											contextTimestamps
										} = cacheEntry;
										asyncLib.parallel(
											[
												asyncLib.each.bind(
													asyncLib,
													fileTimestamps,
													([dep, ts], callback) => {
														fileSystemInfo.getFileTimestamp(
															dep,
															(err, entry) => {
																if (err) return callback(err);
																if (ts === "error") {
																	return callback(
																		!entry || entry.safeTime > resolveTime
																			? INVALID
																			: null
																	);
																}
																if (!entry !== !ts) return callback(INVALID);
																if (entry && entry.timestamp) {
																	return callback(
																		entry.timestamp !== ts ? INVALID : null
																	);
																}
																callback();
															}
														);
													}
												),
												asyncLib.each.bind(
													asyncLib,
													contextTimestamps,
													([dep, ts], callback) => {
														fileSystemInfo.getContextTimestamp(
															dep,
															(err, entry) => {
																if (err) return callback(err);
																if (ts === "error") {
																	return callback(
																		!entry || entry.safeTime > resolveTime
																			? INVALID
																			: null
																	);
																}
																if (!entry !== !ts) return callback(INVALID);
																if (entry && entry.timestamp) {
																	return callback(
																		entry.timestamp !== ts ? INVALID : null
																	);
																}
																callback();
															}
														);
													}
												)
											],
											err => {
												if (err) {
													return doRealResolve(
														identifier,
														type,
														resolver,
														resolveContext,
														request,
														callback
													);
												}
												callback(null, result);
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
								});
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
