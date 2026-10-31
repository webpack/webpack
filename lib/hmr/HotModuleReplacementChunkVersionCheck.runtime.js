/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Alexander Akait @alexander-akait
*/

"use strict";

/** @typedef {import("./HotModuleReplacement.runtime").ModuleId} ModuleId */
/** @typedef {import("./HotModuleReplacement.runtime").Hot} Hot */
/** @typedef {import("./HotModuleReplacement.runtime").StatusHandler} StatusHandler */

// Globals injected by code generation; declared here only to type the template.
/* eslint-disable no-unassigned-vars */
/** @type {Record<ModuleId, ModuleId[]>} */
var $hmrChunkGroups$;
/** @type {Record<ModuleId, string>} */
var $hmrChunkVersions$;
/** @type {Record<ModuleId, string>} */
var $hmrLoadedChunkVersions$;
/** @type {<T>(chunkId: ModuleId, promise: Promise<T>, hot: Hot) => Promise<T>} */
var $hmrCheckChunkVersions$;
/* eslint-enable no-unassigned-vars */

module.exports = function () {
	/**
	 * Checks every chunk loaded by the group handler, outside the blocking load promise.
	 * The group and version maps are added with this module, so they are always set.
	 * @template T
	 * @param {ModuleId} chunkId chunk id
	 * @param {Promise<T>} promise the chunk load
	 * @param {Hot} hot hot API of the module loading the chunk
	 * @returns {Promise<T>} the same result, once the loaded chunks fit
	 */
	$hmrCheckChunkVersions$ = function (chunkId, promise, hot) {
		var siblings = $hmrChunkGroups$[chunkId];
		if (siblings) {
			for (var i = 0; i < siblings.length; i++) {
				promise = checkChunkVersion(siblings[i], promise, hot);
			}
		}
		return checkChunkVersion(chunkId, promise, hot);
	};

	/**
	 * Whether a loaded chunk came from the build the runtime runs, as far as it can tell.
	 * @param {ModuleId} chunkId chunk id
	 * @returns {boolean} true when its modules fit the running code
	 */
	function isCurrentChunkVersion(chunkId) {
		var loaded = $hmrLoadedChunkVersions$[chunkId];
		return loaded === undefined || loaded === $hmrChunkVersions$[chunkId];
	}

	/**
	 * Whether a loaded chunk fits the running code and no update that may replace its
	 * modules is downloading.
	 * @param {ModuleId} chunkId chunk id
	 * @param {Hot} hot hot API of the module loading the chunk
	 * @returns {boolean} true when the chunk load can resolve
	 */
	function isSettledChunkVersion(chunkId, hot) {
		var status = hot.status();
		return (
			status !== "check" &&
			status !== "prepare" &&
			isCurrentChunkVersion(chunkId)
		);
	}

	/**
	 * Holds a chunk load until the chunk fits the running code; one already loaded and
	 * fitting resolves as fast as before.
	 * @template T
	 * @param {ModuleId} chunkId chunk id
	 * @param {Promise<T>} promise the chunk load
	 * @param {Hot} hot hot API of the module loading the chunk
	 * @returns {Promise<T>} the same result, once the chunk fits
	 */
	function checkChunkVersion(chunkId, promise, hot) {
		if (
			$hmrChunkVersions$[chunkId] === undefined ||
			$hmrLoadedChunkVersions$[chunkId] === $hmrChunkVersions$[chunkId]
		) {
			return promise;
		}
		return promise.then(function (result) {
			if (isSettledChunkVersion(chunkId, hot)) return result;
			return waitForChunkVersion(chunkId, hot).then(function () {
				return result;
			});
		});
	}

	/**
	 * Holds a loaded chunk from another build until the updates leading to it are applied,
	 * and one that installs while an update downloads until that update is ready or applied,
	 * since the update may replace its modules. A status handler that settles removes itself
	 * afterwards: removing it while the handlers run would skip the next one.
	 * @param {ModuleId} chunkId chunk id
	 * @param {Hot} hot hot API of the module loading the chunk
	 * @returns {Promise<void>} resolves when the chunk fits the running code
	 */
	function waitForChunkVersion(chunkId, hot) {
		if (isSettledChunkVersion(chunkId, hot)) return Promise.resolve();
		var status = hot.status();
		if (status === "abort" || status === "fail") {
			return Promise.reject(
				new Error(
					"Loaded chunk " +
						chunkId +
						" is from another build, and the update failed (" +
						status +
						")"
				)
			);
		}
		if (status !== "idle") {
			return /** @type {Promise<void>} */ (
				new Promise(function (resolve) {
					hot.addStatusHandler(
						/** @type {StatusHandler} */
						function handler(newStatus) {
							if (
								newStatus === "ready" ||
								newStatus === "idle" ||
								newStatus === "abort" ||
								newStatus === "fail"
							) {
								resolve();
								Promise.resolve().then(function () {
									hot.removeStatusHandler(handler);
								});
							}
						}
					);
				})
			).then(function () {
				return waitForChunkVersion(chunkId, hot);
			});
		}
		return hot.check(true).then(function (updatedModules) {
			if (!updatedModules && !isCurrentChunkVersion(chunkId)) {
				throw new Error(
					"Loaded chunk " +
						chunkId +
						" is from another build, and no update leads to it"
				);
			}
			return waitForChunkVersion(chunkId, hot);
		});
	}
};
