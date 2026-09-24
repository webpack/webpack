/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Alexander Akait @alexander-akait
*/

"use strict";

const FileSystemInfo = require("../fs/FileSystemInfo");
const { join } = require("../fs/fs");

/** @import Compiler from "../Compiler" */
/** @import { InputFileSystem } from "../fs/fs" */
/** @import { NormalizedBuildDependencyItem } from "../cache/AddBuildDependenciesPlugin" */

const PLUGIN_NAME = "WatchBuildDependenciesPlugin";

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
				fileSystemInfo.resolveBuildDependencies(
					compiler.context,
					this.buildDependencies.map((item) => item.dependency),
					this.buildDependencies
						.filter((item) => item.optional)
						.map((item) => item.dependency),
					(err, result) => {
						if (err || !result) {
							logger.warn(
								`Unable to resolve build dependencies, their changes are not watched: ${err}`
							);
							return resolve();
						}
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
						compiler.buildDependencyFiles = files;
						logger.debug(
							`Watching ${files.size} build dependencies:\n${[...files].join(
								"\n"
							)}`
						);
						resolve();
					}
				);
			});
		});
		compiler.hooks.done.tapPromise(PLUGIN_NAME, () =>
			resolving === undefined ? Promise.resolve() : resolving
		);
	}
}

module.exports = WatchBuildDependenciesPlugin;
