/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

"use strict";

const util = require("util");

/** @typedef {import("../../declarations/WebpackOptions").EntryStatic} EntryStatic */
/** @typedef {import("../../declarations/WebpackOptions").EntryStaticNormalized} EntryStaticNormalized */
/** @typedef {import("../../declarations/WebpackOptions").LibraryName} LibraryName */
/** @typedef {import("../../declarations/WebpackOptions").LibraryOptions} LibraryOptions */
/** @typedef {import("../../declarations/WebpackOptions").OptimizationRuntimeChunk} OptimizationRuntimeChunk */
/** @typedef {import("../../declarations/WebpackOptions").OptimizationRuntimeChunkNormalized} OptimizationRuntimeChunkNormalized */
/** @typedef {import("../../declarations/WebpackOptions").OutputNormalized} OutputNormalized */
/** @typedef {import("../../declarations/WebpackOptions").WebpackOptions} WebpackOptions */
/** @typedef {import("../../declarations/WebpackOptions").WebpackOptionsNormalized} WebpackOptionsNormalized */

const handledDeprecatedNoEmitOnErrors = util.deprecate(
	(noEmitOnErrors, emitOnErrors) => {
		if (emitOnErrors !== undefined && !noEmitOnErrors === !emitOnErrors) {
			throw new Error(
				"Conflicting use of 'optimization.noEmitOnErrors' and 'optimization.emitOnErrors'. Remove deprecated 'optimization.noEmitOnErrors' from config."
			);
		}
		return !noEmitOnErrors;
	},
	"optimization.noEmitOnErrors is deprecated in favor of optimization.emitOnErrors",
	"DEP_WEBPACK_CONFIGURATION_OPTIMIZATION_NO_EMIT_ON_ERRORS"
);

/**
 * @template T
 * @template R
 * @param {T|undefined} value value or not
 * @param {function(T): R} fn nested handler
 * @returns {R} result value
 */
const nestedConfig = (value, fn) =>
	value === undefined ? fn(/** @type {T} */ ({})) : fn(value);

/**
 * @template T
 * @param {T|undefined} value value or not
 * @returns {T} result value
 */
const cloneObject = value => {
	return /** @type {T} */ ({ ...value });
};

/**
 * @template T
 * @template R
 * @param {T|undefined} value value or not
 * @param {function(T): R} fn nested handler
 * @returns {R|undefined} result value
 */
const optionalNestedConfig = (value, fn) =>
	value === undefined ? undefined : fn(value);

/**
 * @template T
 * @template R
 * @param {T[]|undefined} value array or not
 * @param {function(T[]): R[]} fn nested handler
 * @returns {R[]|undefined} cloned value
 */
const nestedArray = (value, fn) => (Array.isArray(value) ? fn(value) : fn([]));

/**
 * @template T
 * @template R
 * @param {T[]|undefined} value array or not
 * @param {function(T[]): R[]} fn nested handler
 * @returns {R[]|undefined} cloned value
 */
const optionalNestedArray = (value, fn) =>
	Array.isArray(value) ? fn(value) : undefined;

/**
 * @template T
 * @template R
 * @param {Record<string, T>|undefined} value value or not
 * @param {function(T): R} fn nested handler
 * @returns {Record<string, R>} result value
 */
const keyedNestedConfig = (value, fn) =>
	value === undefined
		? {}
		: Object.keys(value).reduce(
				(obj, key) => ((obj[key] = fn(value[key])), obj),
				/** @type {Record<string, R>} */ ({})
		  );

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
						buildDependencies: cloneObject(cache.buildDependencies),
						cacheDirectory: cache.cacheDirectory,
						cacheLocation: cache.cacheLocation,
						hashAlgorithm: cache.hashAlgorithm,
						idleTimeout: cache.idleTimeout,
						idleTimeoutForInitialStore: cache.idleTimeoutForInitialStore,
						name: cache.name,
						store: cache.store,
						version: cache.version
					};
				case undefined:
				case "memory":
					return {
						type: "memory"
					};
				default:
					// @ts-expect-error Property 'type' does not exist on type 'never'. ts(2339)
					throw new Error(`Not implemented cache.type ${cache.type}`);
			}
		}),
		context: config.context,
		dependencies: config.dependencies,
		devServer: optionalNestedConfig(config.devServer, devServer => ({
			...devServer
		})),
		devtool: config.devtool,
		entry:
			config.entry === undefined
				? { main: {} }
				: typeof config.entry === "function"
				? (fn => () =>
						Promise.resolve().then(fn).then(getNormalizedEntryStatic))(
						config.entry
				  )
				: getNormalizedEntryStatic(config.entry),
		experiments: cloneObject(config.experiments),
		externals: config.externals,
		externalsPresets: cloneObject(config.externalsPresets),
		externalsType: config.externalsType,
		ignoreWarnings: config.ignoreWarnings
			? config.ignoreWarnings.map(ignore => {
					if (typeof ignore === "function") return ignore;
					const i = ignore instanceof RegExp ? { message: ignore } : ignore;
					return (warning, { requestShortener }) => {
						if (!i.message && !i.module && !i.file) return false;
						if (i.message && !i.message.test(warning.message)) {
							return false;
						}
						if (
							i.module &&
							(!warning.module ||
								!i.module.test(
									warning.module.readableIdentifier(requestShortener)
								))
						) {
							return false;
						}
						if (i.file && (!warning.file || !i.file.test(warning.file))) {
							return false;
						}
						return true;
					};
			  })
			: undefined,
		infrastructureLogging: cloneObject(config.infrastructureLogging),
		loader: cloneObject(config.loader),
		mode: config.mode,
		module: nestedConfig(config.module, module => ({
			...module,
			parser: cloneObject(module.parser),
			generator: cloneObject(module.generator),
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
		optimization: nestedConfig(config.optimization, optimization => {
			return {
				...optimization,
				runtimeChunk: getNormalizedOptimizationRuntimeChunk(
					optimization.runtimeChunk
				),
				splitChunks: nestedConfig(
					optimization.splitChunks,
					splitChunks =>
						splitChunks && {
							...splitChunks,
							defaultSizeTypes: splitChunks.defaultSizeTypes
								? [...splitChunks.defaultSizeTypes]
								: ["..."],
							cacheGroups: cloneObject(splitChunks.cacheGroups)
						}
				),
				emitOnErrors:
					optimization.noEmitOnErrors !== undefined
						? handledDeprecatedNoEmitOnErrors(
								optimization.noEmitOnErrors,
								optimization.emitOnErrors
						  )
						: optimization.emitOnErrors
			};
		}),
		output: nestedConfig(config.output, output => {
			const { library } = output;
			const libraryAsName = /** @type {LibraryName} */ (library);
			const libraryBase =
				typeof library === "object" &&
				library &&
				!Array.isArray(library) &&
				"type" in library
					? library
					: libraryAsName || output.libraryTarget
					? /** @type {LibraryOptions} */ ({
							name: libraryAsName
					  })
					: undefined;
			/** @type {OutputNormalized} */
			const result = {
				assetModuleFilename: output.assetModuleFilename,
				charset: output.charset,
				chunkFilename: output.chunkFilename,
				chunkFormat: output.chunkFormat,
				chunkLoading: output.chunkLoading,
				chunkLoadingGlobal: output.chunkLoadingGlobal,
				chunkLoadTimeout: output.chunkLoadTimeout,
				compareBeforeEmit: output.compareBeforeEmit,
				crossOriginLoading: output.crossOriginLoading,
				devtoolFallbackModuleFilenameTemplate:
					output.devtoolFallbackModuleFilenameTemplate,
				devtoolModuleFilenameTemplate: output.devtoolModuleFilenameTemplate,
				devtoolNamespace: output.devtoolNamespace,
				environment: cloneObject(output.environment),
				enabledChunkLoadingTypes: output.enabledChunkLoadingTypes
					? [...output.enabledChunkLoadingTypes]
					: ["..."],
				enabledLibraryTypes: output.enabledLibraryTypes
					? [...output.enabledLibraryTypes]
					: ["..."],
				enabledWasmLoadingTypes: output.enabledWasmLoadingTypes
					? [...output.enabledWasmLoadingTypes]
					: ["..."],
				filename: output.filename,
				globalObject: output.globalObject,
				hashDigest: output.hashDigest,
				hashDigestLength: output.hashDigestLength,
				hashFunction: output.hashFunction,
				hashSalt: output.hashSalt,
				hotUpdateChunkFilename: output.hotUpdateChunkFilename,
				hotUpdateGlobal: output.hotUpdateGlobal,
				hotUpdateMainFilename: output.hotUpdateMainFilename,
				iife: output.iife,
				importFunctionName: output.importFunctionName,
				importMetaName: output.importMetaName,
				scriptType: output.scriptType,
				library: libraryBase && {
					type:
						output.libraryTarget !== undefined
							? output.libraryTarget
							: libraryBase.type,
					auxiliaryComment:
						output.auxiliaryComment !== undefined
							? output.auxiliaryComment
							: libraryBase.auxiliaryComment,
					export:
						output.libraryExport !== undefined
							? output.libraryExport
							: libraryBase.export,
					name: libraryBase.name,
					umdNamedDefine:
						output.umdNamedDefine !== undefined
							? output.umdNamedDefine
							: libraryBase.umdNamedDefine
				},
				module: output.module,
				path: output.path,
				pathinfo: output.pathinfo,
				publicPath: output.publicPath,
				sourceMapFilename: output.sourceMapFilename,
				sourcePrefix: output.sourcePrefix,
				strictModuleExceptionHandling: output.strictModuleExceptionHandling,
				uniqueName: output.uniqueName,
				wasmLoading: output.wasmLoading,
				webassemblyModuleFilename: output.webassemblyModuleFilename,
				workerChunkLoading: output.workerChunkLoading,
				workerWasmLoading: output.workerWasmLoading
			};
			return result;
		}),
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
			...resolve,
			byDependency: keyedNestedConfig(resolve.byDependency, cloneObject)
		})),
		resolveLoader: cloneObject(config.resolveLoader),
		snapshot: nestedConfig(config.snapshot, snapshot => ({
			resolveBuildDependencies: optionalNestedConfig(
				snapshot.resolveBuildDependencies,
				resolveBuildDependencies => ({
					timestamp: resolveBuildDependencies.timestamp,
					hash: resolveBuildDependencies.hash
				})
			),
			buildDependencies: optionalNestedConfig(
				snapshot.buildDependencies,
				buildDependencies => ({
					timestamp: buildDependencies.timestamp,
					hash: buildDependencies.hash
				})
			),
			resolve: optionalNestedConfig(snapshot.resolve, resolve => ({
				timestamp: resolve.timestamp,
				hash: resolve.hash
			})),
			module: optionalNestedConfig(snapshot.module, module => ({
				timestamp: module.timestamp,
				hash: module.hash
			})),
			immutablePaths: optionalNestedArray(snapshot.immutablePaths, p => [...p]),
			managedPaths: optionalNestedArray(snapshot.managedPaths, p => [...p])
		})),
		stats: nestedConfig(config.stats, stats => {
			if (stats === false) {
				return {
					preset: "none"
				};
			}
			if (stats === true) {
				return {
					preset: "normal"
				};
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
		watchOptions: cloneObject(config.watchOptions)
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
			result[key] = {
				import:
					value.import &&
					(Array.isArray(value.import) ? value.import : [value.import]),
				filename: value.filename,
				layer: value.layer,
				runtime: value.runtime,
				chunkLoading: value.chunkLoading,
				wasmLoading: value.wasmLoading,
				dependOn:
					value.dependOn &&
					(Array.isArray(value.dependOn) ? value.dependOn : [value.dependOn]),
				library: value.library
			};
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
