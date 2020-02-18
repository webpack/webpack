/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

"use strict";

const normalizeEcmaVersion = require("../util/normalizeEcmaVersion");

/** @typedef {import("../../declarations/WebpackOptions").EntryStatic} EntryStatic */
/** @typedef {import("../../declarations/WebpackOptions").EntryStaticNormalized} EntryStaticNormalized */
/** @typedef {import("../../declarations/WebpackOptions").OptimizationRuntimeChunk} OptimizationRuntimeChunk */
/** @typedef {import("../../declarations/WebpackOptions").OptimizationRuntimeChunkNormalized} OptimizationRuntimeChunkNormalized */
/** @typedef {import("../../declarations/WebpackOptions").WebpackOptions} WebpackOptions */
/** @typedef {import("../../declarations/WebpackOptions").WebpackOptionsNormalized} WebpackOptionsNormalized */

/**
 * @template T
 * @template R
 * @param {T=} value value or not
 * @param {function(T): R} fn nested handler
 * @returns {R} result value
 */
const nestedConfig = (value, fn) =>
	value === undefined ? fn(/** @type {T} */ ({})) : fn(value);

/**
 * @template T
 * @template R
 * @param {T=} value value or not
 * @param {function(T): R} fn nested handler
 * @returns {R=} result value
 */
const optionalNestedConfig = (value, fn) =>
	value === undefined ? undefined : fn(value);

/**
 * @template T
 * @template R
 * @param {T[]=} value array or not
 * @param {function(T[]): R[]} fn nested handler
 * @returns {R[]=} cloned value
 */
const nestedArray = (value, fn) => (Array.isArray(value) ? fn(value) : fn([]));

/**
 * @template T
 * @template R
 * @param {T[]=} value array or not
 * @param {function(T[]): R[]} fn nested handler
 * @returns {R[]=} cloned value
 */
const optionalNestedArray = (value, fn) =>
	Array.isArray(value) ? fn(value) : undefined;

/**
 * @param {WebpackOptions} config input config
 * @returns {WebpackOptionsNormalized} normalized options
 */
const getNormalizedWebpackOptions = config => {
	return {
		amd: config.amd,
		bail: config.bail,
		cache: optionalNestedConfig(config.cache, cache => {
			if (cache === false) return false;
			if (cache === true) {
				return {
					type: "memory"
				};
			}
			switch (cache.type) {
				case "filesystem":
					return {
						type: "filesystem",
						buildDependencies: nestedConfig(
							cache.buildDependencies,
							buildDependencies => ({
								...buildDependencies
							})
						),
						cacheDirectory: cache.cacheDirectory,
						cacheLocation: cache.cacheLocation,
						hashAlgorithm: cache.hashAlgorithm,
						idleTimeout: cache.idleTimeout,
						idleTimeoutForInitialStore: cache.idleTimeoutForInitialStore,
						immutablePaths: optionalNestedArray(cache.immutablePaths, p => [
							...p
						]),
						managedPaths: optionalNestedArray(cache.managedPaths, p => [...p]),
						name: cache.name,
						store: cache.store,
						version: cache.version
					};
				case undefined:
				case "memory":
					return {
						type: "memory",
						immutablePaths: optionalNestedArray(cache.immutablePaths, p => [
							...p
						]),
						managedPaths: optionalNestedArray(cache.managedPaths, p => [...p])
					};
				default:
					// @ts-ignore never
					throw new Error(`Not implemented cache.type ${cache.type}`);
			}
		}),
		context: config.context,
		dependencies: config.dependencies,
		devServer: optionalNestedConfig(config.devServer, devServer => ({
			...devServer
		})),
		devtool: config.devtool,
		entry: nestedConfig(config.entry, entry => {
			if (typeof entry === "function") {
				return () =>
					Promise.resolve()
						.then(entry)
						.then(getNormalizedEntryStatic);
			}
			return getNormalizedEntryStatic(entry);
		}),
		experiments: nestedConfig(config.experiments, experiments => ({
			...experiments
		})),
		externals: config.externals,
		infrastructureLogging: nestedConfig(
			config.infrastructureLogging,
			infrastructureLogging => ({
				...infrastructureLogging
			})
		),
		loader: config.loader,
		mode: config.mode,
		module: nestedConfig(config.module, module => ({
			...module,
			rules: nestedArray(module.rules, r => [...r])
		})),
		name: config.name,
		node: nestedConfig(
			config.node,
			node =>
				node && {
					...node
				}
		),
		optimization: nestedConfig(config.optimization, optimization => ({
			...optimization,
			runtimeChunk: getNormalizedOptimizationRuntimeChunk(
				optimization.runtimeChunk
			),
			splitChunks: nestedConfig(
				optimization.splitChunks,
				splitChunks =>
					splitChunks && {
						...splitChunks,
						cacheGroups: nestedConfig(splitChunks.cacheGroups, cacheGroups => ({
							...cacheGroups
						}))
					}
			)
		})),
		output: nestedConfig(config.output, output => ({
			...output,
			ecmaVersion: normalizeEcmaVersion(output.ecmaVersion)
		})),
		parallelism: config.parallelism,
		performance: optionalNestedConfig(config.performance, performance => {
			if (performance === false) return false;
			return {
				...performance
			};
		}),
		plugins: nestedArray(config.plugins, p => [...p]),
		profile: config.profile,
		recordsInputPath:
			config.recordsInputPath !== undefined
				? config.recordsInputPath
				: config.recordsPath,
		recordsOutputPath:
			config.recordsOutputPath !== undefined
				? config.recordsOutputPath
				: config.recordsPath,
		resolve: nestedConfig(config.resolve, resolve => ({
			...resolve
		})),
		resolveLoader: nestedConfig(config.resolveLoader, resolve => ({
			...resolve
		})),
		serve: optionalNestedConfig(config.serve, serve => ({
			...serve
		})),
		stats: nestedConfig(config.stats, stats => {
			if (stats === false) {
				return {
					preset: "none"
				};
			}
			if (stats === true) {
				return {};
			}
			if (typeof stats === "string") {
				return {
					preset: stats
				};
			}
			return {
				...stats
			};
		}),
		target: config.target,
		watch: config.watch,
		watchOptions: nestedConfig(config.watchOptions, watchOptions => ({
			...watchOptions
		}))
	};
};

/**
 * @param {EntryStatic} entry static entry options
 * @returns {EntryStaticNormalized} normalized static entry options
 */
const getNormalizedEntryStatic = entry => {
	if (typeof entry === "string") {
		return {
			main: {
				import: [entry]
			}
		};
	}
	if (Array.isArray(entry)) {
		return {
			main: {
				import: entry
			}
		};
	}
	/** @type {EntryStaticNormalized} */
	const result = {};
	for (const key of Object.keys(entry)) {
		const value = entry[key];
		if (typeof value === "string") {
			result[key] = {
				import: [value]
			};
		} else if (Array.isArray(value)) {
			result[key] = {
				import: value
			};
		} else {
			result[key] = value;
		}
	}
	return result;
};

/**
 * @param {OptimizationRuntimeChunk=} runtimeChunk runtimeChunk option
 * @returns {OptimizationRuntimeChunkNormalized=} normalized runtimeChunk option
 */
const getNormalizedOptimizationRuntimeChunk = runtimeChunk => {
	if (runtimeChunk === undefined) return undefined;
	if (runtimeChunk === false) return false;
	if (runtimeChunk === "single") {
		return {
			name: () => "runtime"
		};
	}
	if (runtimeChunk === true || runtimeChunk === "multiple") {
		return {
			name: entrypoint => `runtime~${entrypoint.name}`
		};
	}
	const { name } = runtimeChunk;
	return {
		name: typeof name === "function" ? name : () => name
	};
};

exports.getNormalizedWebpackOptions = getNormalizedWebpackOptions;
