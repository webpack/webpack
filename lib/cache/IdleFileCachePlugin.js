/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

"use strict";

const Cache = require("../Cache");
const ProgressPlugin = require("../ProgressPlugin");

/** @typedef {import("../Compiler")} Compiler */

const BUILD_DEPENDENCIES_KEY = Symbol();

class IdleFileCachePlugin {
	/**
	 * @param {TODO} strategy cache strategy
	 * @param {number} idleTimeout timeout
	 * @param {number} idleTimeoutForInitialStore initial timeout
	 */
	constructor(strategy, idleTimeout, idleTimeoutForInitialStore) {
		this.strategy = strategy;
		this.idleTimeout = idleTimeout;
		this.idleTimeoutForInitialStore = idleTimeoutForInitialStore;
	}

	/**
	 * Apply the plugin
	 * @param {Compiler} compiler the compiler instance
	 * @returns {void}
	 */
	apply(compiler) {
		const strategy = this.strategy;
		const idleTimeout = this.idleTimeout;
		const idleTimeoutForInitialStore = Math.min(
			idleTimeout,
			this.idleTimeoutForInitialStore
		);

		const resolvedPromise = Promise.resolve();

		/** @type {Map<string | typeof BUILD_DEPENDENCIES_KEY, () => Promise>} */
		const pendingIdleTasks = new Map();

		compiler.cache.hooks.store.tap(
			{ name: "IdleFileCachePlugin", stage: Cache.STAGE_DISK },
			(identifier, etag, data) => {
				pendingIdleTasks.set(identifier, () =>
					strategy.store(identifier, etag, data)
				);
			}
		);

		compiler.cache.hooks.get.tapPromise(
			{ name: "IdleFileCachePlugin", stage: Cache.STAGE_DISK },
			(identifier, etag, gotHandlers) => {
				return strategy.restore(identifier, etag).then(cacheEntry => {
					if (cacheEntry === undefined) {
						gotHandlers.push((result, callback) => {
							if (result !== undefined) {
								pendingIdleTasks.set(identifier, () =>
									strategy.store(identifier, etag, result)
								);
							}
							callback();
						});
					} else {
						return cacheEntry;
					}
				});
			}
		);

		compiler.cache.hooks.storeBuildDependencies.tap(
			{ name: "IdleFileCachePlugin", stage: Cache.STAGE_DISK },
			dependencies => {
				pendingIdleTasks.set(BUILD_DEPENDENCIES_KEY, () =>
					strategy.storeBuildDependencies(dependencies)
				);
			}
		);

		compiler.cache.hooks.shutdown.tapPromise(
			{ name: "IdleFileCachePlugin", stage: Cache.STAGE_DISK },
			() => {
				if (idleTimer) {
					clearTimeout(idleTimer);
					idleTimer = undefined;
				}
				isIdle = false;
				const reportProgress = ProgressPlugin.getReporter(compiler);
				const jobs = Array.from(pendingIdleTasks.values());
				if (reportProgress) reportProgress(0, "process pending cache items");
				const promises = jobs.map(fn => fn());
				pendingIdleTasks.clear();
				promises.push(currentIdlePromise);
				const promise = Promise.all(promises);
				currentIdlePromise = promise.then(() => strategy.afterAllStored());
				if (reportProgress) {
					currentIdlePromise = currentIdlePromise.then(() => {
						reportProgress(1, `stored`);
					});
				}
				return currentIdlePromise;
			}
		);

		/** @type {Promise<any>} */
		let currentIdlePromise = resolvedPromise;
		let isIdle = false;
		let isInitialStore = true;
		const processIdleTasks = () => {
			if (isIdle) {
				if (pendingIdleTasks.size > 0) {
					const promises = [currentIdlePromise];
					const maxTime = Date.now() + 100;
					let maxCount = 100;
					for (const [filename, factory] of pendingIdleTasks) {
						pendingIdleTasks.delete(filename);
						promises.push(factory());
						if (maxCount-- <= 0 || Date.now() > maxTime) break;
					}
					currentIdlePromise = Promise.all(promises);
					currentIdlePromise.then(() => {
						// Allow to exit the process between
						setTimeout(processIdleTasks, 0).unref();
					});
					return;
				}
				currentIdlePromise = currentIdlePromise
					.then(() => strategy.afterAllStored())
					.catch(err => {
						const logger = compiler.getInfrastructureLogger(
							"IdleFileCachePlugin"
						);
						logger.warn(`Background tasks during idle failed: ${err.message}`);
						logger.debug(err.stack);
					});
				isInitialStore = false;
			}
		};
		let idleTimer = undefined;
		compiler.cache.hooks.beginIdle.tap(
			{ name: "IdleFileCachePlugin", stage: Cache.STAGE_DISK },
			() => {
				idleTimer = setTimeout(
					() => {
						idleTimer = undefined;
						isIdle = true;
						resolvedPromise.then(processIdleTasks);
					},
					isInitialStore ? idleTimeoutForInitialStore : idleTimeout
				);
				idleTimer.unref();
			}
		);
		compiler.cache.hooks.endIdle.tap(
			{ name: "IdleFileCachePlugin", stage: Cache.STAGE_DISK },
			() => {
				if (idleTimer) {
					clearTimeout(idleTimer);
					idleTimer = undefined;
				}
				isIdle = false;
			}
		);
	}
}

module.exports = IdleFileCachePlugin;
