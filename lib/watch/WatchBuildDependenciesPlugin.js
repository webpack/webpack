/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Alexander Akait @alexander-akait
*/

"use strict";

const {
	setSharedBuildDependencies
} = require("../cache/sharedBuildDependencies");
const FileSystemInfo = require("../fs/FileSystemInfo");
const { join } = require("../fs/fs");

/** @import Compiler from "../Compiler" */
/** @import { InputFileSystem } from "../fs/fs" */
/** @import { FileSystemInfoEntry, ResolveBuildDependenciesResult } from "../fs/FileSystemInfo" */
/** @import { NormalizedBuildDependencyItem } from "../cache/AddBuildDependenciesPlugin" */

const PLUGIN_NAME = "WatchBuildDependenciesPlugin";

/**
 * The timestamp a build dependency had when the configuration was loaded.
 * @param {Error | null | undefined} err error reading the timestamp
 * @param {FileSystemInfoEntry | "ignore" | null | undefined} entry timestamp entry
 * @param {number} loadedAt when the configuration was loaded
 * @returns {number | null | undefined} the timestamp, `null` when missing, `undefined` when unknown or changed after loading (any reported change counts)
 */
const toLoadedTimestamp = (err, entry, loadedAt) => {
	if (err || entry === "ignore" || entry === undefined) return undefined;
	if (entry === null) return null;
	const { timestamp } = entry;
	// the same millisecond as loading counts as after it
	return timestamp !== undefined && timestamp < loadedAt
		? timestamp
		: undefined;
};

class WatchBuildDependenciesPlugin {
	/**
	 * Creates an instance of WatchBuildDependenciesPlugin.
	 * @param {NormalizedBuildDependencyItem[]} buildDependencies build dependencies to watch
	 */
	constructor(buildDependencies) {
		/** @type {NormalizedBuildDependencyItem[]} */
		this.buildDependencies = buildDependencies;
	}

	/**
	 * Applies the plugin by registering its hooks on the compiler.
	 * @param {Compiler} compiler the compiler instance
	 * @returns {void}
	 */
	apply(compiler) {
		if (this.buildDependencies.length === 0) return;
		// applied right after the configuration was loaded
		const loadedAt = Date.now();
		/** @type {Promise<void> | undefined} */
		let resolving;
		compiler.hooks.watchRun.tap(PLUGIN_NAME, () => {
			if (resolving !== undefined) return;
			// runs alongside the first compilation; `done` waits for it
			resolving = new Promise((resolve) => {
				const logger = compiler.getInfrastructureLogger(PLUGIN_NAME);
				const { managedPaths, immutablePaths, unmanagedPaths } =
					compiler.options.snapshot;
				const fs = /** @type {InputFileSystem} */ (compiler.inputFileSystem);
				const fileSystemInfo = new FileSystemInfo(fs, {
					managedPaths,
					immutablePaths,
					unmanagedPaths,
					logger,
					hashFunction: compiler.options.output.hashFunction
				});
				const dependencies = this.buildDependencies.map(
					(item) => item.dependency
				);
				/** @type {Promise<ResolveBuildDependenciesResult | undefined>} */
				const resolved = new Promise((resolveResult) => {
					fileSystemInfo.resolveBuildDependencies(
						compiler.context,
						dependencies,
						this.buildDependencies
							.filter((item) => item.optional)
							.map((item) => item.dependency),
						(err, result) => {
							if (err || !result) {
								logger.warn(
									`Unable to resolve build dependencies, their changes are not watched: ${err}`
								);
								return resolveResult(undefined);
							}
							resolveResult(result);
						}
					);
				});
				// the persistent cache reuses this instead of resolving the same files again
				setSharedBuildDependencies(compiler, new Set(dependencies), resolved);
				resolved.then((result) => {
					if (!result) return resolve();
					/** @type {Set<string>} */
					const files = new Set();
					/**
					 * @param {string} path resolved file or directory
					 * @param {boolean} isDirectory true for a directory
					 */
					const add = (path, isDirectory) => {
						const managedItem = fileSystemInfo.getManagedItemOf(path);
						if (managedItem === true) return;
						// a package changes with its version, not per file
						if (managedItem !== undefined) {
							files.add(join(fs, managedItem, "package.json"));
						} else if (isDirectory) {
							files.add(join(fs, path, "package.json"));
						} else {
							files.add(path);
						}
					};
					for (const file of result.files) add(file, false);
					for (const directory of result.directories) add(directory, true);
					/** @type {Map<string, number | null | undefined>} */
					const timestamps = new Map();
					let pending = files.size + 1;
					const done = () => {
						if (--pending > 0) return;
						compiler.buildDependencyFiles = timestamps;
						logger.debug(
							`Watching ${timestamps.size} build dependencies:\n${[
								...timestamps.keys()
							].join("\n")}`
						);
						resolve();
					};
					// the watcher reports files written shortly before the build as changed, their timestamp tells
					for (const file of files) {
						fileSystemInfo.getFileTimestamp(file, (err, entry) => {
							timestamps.set(file, toLoadedTimestamp(err, entry, loadedAt));
							done();
						});
					}
					done();
				});
			});
		});
		compiler.hooks.done.tapPromise(PLUGIN_NAME, () =>
			resolving === undefined ? Promise.resolve() : resolving
		);
	}
}

module.exports = WatchBuildDependenciesPlugin;
