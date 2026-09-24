/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Alexander Akait @alexander-akait
*/

"use strict";

/** @import Compiler from "../Compiler" */
/** @import FileSystemInfo, { ResolveBuildDependenciesResult } from "../fs/FileSystemInfo" */

/**
 * @typedef {object} SharedBuildDependencies
 * @property {ReadonlySet<string>} dependencies the resolved build dependencies
 * @property {Promise<ResolveBuildDependenciesResult | undefined>} result what they resolved to, `undefined` when resolving failed
 */

/** @type {WeakMap<Compiler, SharedBuildDependencies>} */
const sharedBuildDependencies = new WeakMap();

/**
 * Makes build dependencies resolved for a compiler reusable by others resolving them for it.
 * @param {Compiler} compiler the compiler
 * @param {ReadonlySet<string>} dependencies the resolved build dependencies
 * @param {Promise<ResolveBuildDependenciesResult | undefined>} result what they resolve to
 * @returns {void}
 */
const setSharedBuildDependencies = (compiler, dependencies, result) => {
	sharedBuildDependencies.set(compiler, { dependencies, result });
};

/**
 * @param {ResolveBuildDependenciesResult} target result to add to
 * @param {ResolveBuildDependenciesResult} source result to add
 * @returns {ResolveBuildDependenciesResult} the target
 */
const mergeResults = (target, source) => {
	for (const file of source.files) target.files.add(file);
	for (const directory of source.directories) target.directories.add(directory);
	for (const item of source.missing) target.missing.add(item);
	for (const [key, value] of source.resolveResults) {
		target.resolveResults.set(key, value);
	}
	const { resolveDependencies } = target;
	for (const file of source.resolveDependencies.files) {
		resolveDependencies.files.add(file);
	}
	for (const directory of source.resolveDependencies.directories) {
		resolveDependencies.directories.add(directory);
	}
	for (const item of source.resolveDependencies.missing) {
		resolveDependencies.missing.add(item);
	}
	return target;
};

/**
 * Resolves build dependencies, reusing those already resolved for the compiler.
 * @param {Compiler} compiler the compiler
 * @param {FileSystemInfo} fileSystemInfo resolves the remaining ones
 * @param {string} context context directory
 * @param {ReadonlySet<string>} dependencies build dependencies
 * @param {ReadonlySet<string>} optionalDependencies build dependencies that may be missing
 * @param {(err?: Error | null, result?: ResolveBuildDependenciesResult) => void} callback callback
 * @returns {void}
 */
const resolveBuildDependencies = (
	compiler,
	fileSystemInfo,
	context,
	dependencies,
	optionalDependencies,
	callback
) => {
	const shared = sharedBuildDependencies.get(compiler);
	if (shared === undefined) {
		fileSystemInfo.resolveBuildDependencies(
			context,
			dependencies,
			optionalDependencies,
			callback
		);
		return;
	}
	shared.result.then((sharedResult) => {
		/** @type {Set<string>} */
		const remaining = new Set();
		/** @type {Set<string>} */
		const remainingOptional = new Set();
		for (const dependency of dependencies) {
			if (sharedResult !== undefined && shared.dependencies.has(dependency)) {
				continue;
			}
			remaining.add(dependency);
			if (optionalDependencies.has(dependency)) {
				remainingOptional.add(dependency);
			}
		}
		if (sharedResult === undefined || remaining.size > 0) {
			fileSystemInfo.resolveBuildDependencies(
				context,
				remaining,
				remainingOptional,
				(err, result) => {
					if (err) return callback(err);
					const merged = /** @type {ResolveBuildDependenciesResult} */ (result);
					callback(
						null,
						sharedResult === undefined
							? merged
							: mergeResults(merged, sharedResult)
					);
				}
			);
			return;
		}
		callback(
			null,
			mergeResults(
				{
					files: new Set(),
					directories: new Set(),
					missing: new Set(),
					resolveResults: new Map(),
					resolveDependencies: {
						files: new Set(),
						directories: new Set(),
						missing: new Set()
					}
				},
				sharedResult
			)
		);
	}, callback);
};

module.exports = { resolveBuildDependencies, setSharedBuildDependencies };
