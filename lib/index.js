/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

"use strict";

const util = require("util");
const memoize = require("./util/memoize");

const getCliArguments = memoize(() => require("./config/cli"));
const getTerminalColors = memoize(() => require("./util/terminalColors"));

// `webpack.cli` is the surface webpack-cli reads, and a getter per export is
// what keeps reading a color from parsing the options schema.
const getCli = memoize(() => ({
	get getArguments() {
		return getCliArguments().getArguments;
	},
	get processArguments() {
		return getCliArguments().processArguments;
	},
	get createColors() {
		return getTerminalColors().createColors;
	},
	get isColorSupported() {
		return getTerminalColors().isColorSupported;
	}
}));

/** @typedef {import("../declarations/WebpackOptions").Entry} Entry */
/** @typedef {import("../declarations/WebpackOptions").EntryNormalized} EntryNormalized */
/** @typedef {import("../declarations/WebpackOptions").EntryObject} EntryObject */
/** @typedef {import("../declarations/WebpackOptions").ExternalItem} ExternalItem */
/** @typedef {import("../declarations/WebpackOptions").ExternalItemFunction} ExternalItemFunction */
/** @typedef {import("../declarations/WebpackOptions").ExternalItemObjectKnown} ExternalItemObjectKnown */
/** @typedef {import("../declarations/WebpackOptions").ExternalItemObjectUnknown} ExternalItemObjectUnknown */
/** @typedef {import("../declarations/WebpackOptions").ExternalItemValue} ExternalItemValue */
/** @typedef {import("../declarations/WebpackOptions").Externals} Externals */
/** @typedef {import("../declarations/WebpackOptions").FileCacheOptions} FileCacheOptions */
/** @typedef {import("../declarations/WebpackOptions").GeneratorOptionsByModuleTypeKnown} GeneratorOptionsByModuleTypeKnown */
/** @typedef {import("../declarations/WebpackOptions").LibraryOptions} LibraryOptions */
/** @typedef {import("../declarations/WebpackOptions").MemoryCacheOptions} MemoryCacheOptions */
/** @typedef {import("../declarations/WebpackOptions").ModuleOptions} ModuleOptions */
/** @typedef {import("../declarations/WebpackOptions").ParserOptionsByModuleTypeKnown} ParserOptionsByModuleTypeKnown */
/** @typedef {import("../declarations/WebpackOptions").ResolveOptions} ResolveOptions */
/** @typedef {import("../declarations/WebpackOptions").RuleSetCondition} RuleSetCondition */
/** @typedef {import("../declarations/WebpackOptions").RuleSetConditionAbsolute} RuleSetConditionAbsolute */
/** @typedef {import("../declarations/WebpackOptions").RuleSetRule} RuleSetRule */
/** @typedef {import("../declarations/WebpackOptions").RuleSetUse} RuleSetUse */
/** @typedef {import("../declarations/WebpackOptions").RuleSetUseFunction} RuleSetUseFunction */
/** @typedef {import("../declarations/WebpackOptions").RuleSetUseItem} RuleSetUseItem */
/** @typedef {import("../declarations/WebpackOptions").StatsOptions} StatsOptions */
/** @typedef {import("../declarations/WebpackOptions").WebpackOptions} Configuration */
/** @typedef {import("../declarations/WebpackOptions").WebpackOptionsNormalized} WebpackOptionsNormalized */
/** @typedef {import("../declarations/WebpackOptions").WebpackPluginFunction} WebpackPluginFunction */
/** @typedef {import("../declarations/WebpackOptions").WebpackPluginInstance} WebpackPluginInstance */
/** @typedef {import("./asset/AssetModule").AssetModuleBuildInfo} AssetModuleBuildInfo */
/** @typedef {import("./graph/ChunkGroup")} ChunkGroup */
/** @typedef {import("./Compiler").AssetEmittedInfo} AssetEmittedInfo */
/** @typedef {import("./context/ContextModule").ContextModuleBuildInfo} ContextModuleBuildInfo */
/** @typedef {import("./css/CssModule").CssModuleBuildInfo} CssModuleBuildInfo */
/** @typedef {import("./css/CssModule").CssModuleBuildMeta} CssModuleBuildMeta */
/** @typedef {import("./externals/ExternalModule").ExternalModuleBuildInfo} ExternalModuleBuildInfo */
/** @typedef {import("./html/HtmlModule").HtmlModuleBuildInfo} HtmlModuleBuildInfo */
/** @typedef {import("./javascript/JavascriptModule").JavascriptModuleBuildInfo} JavascriptModuleBuildInfo */
/** @typedef {import("./javascript/JavascriptModule").JavascriptModuleBuildMeta} JavascriptModuleBuildMeta */
/** @typedef {import("./json/JsonModule").JsonModuleBuildInfo} JsonModuleBuildInfo */
/** @typedef {import("./module/Module").BuildInfo} BuildInfo */
/** @typedef {import("./module/Module").BuildMeta} BuildMeta */
/** @typedef {import("./module/NormalModule").NormalModuleBuildInfo} NormalModuleBuildInfo */
/** @typedef {import("./optimize/ConcatenatedModule").ConcatenatedModuleBuildInfo} ConcatenatedModuleBuildInfo */
/** @typedef {import("./wasm-sync/SyncWasmModule").SyncWasmModuleBuildMeta} SyncWasmModuleBuildMeta */
/** @typedef {import("./Compilation").Asset} Asset */
/** @typedef {import("./Compilation").AssetInfo} AssetInfo */
/** @typedef {import("./Compilation").EntryOptions} EntryOptions */
/** @typedef {import("./Compilation").PathData} PathData */
/** @typedef {import("./Compilation").PathDataChunk} PathDataChunk */
/** @typedef {import("./Compilation").PathDataModule} PathDataModule */
/** @typedef {import("./module/CodeGenerationResults")} CodeGenerationResults */
/** @typedef {import("./graph/Entrypoint")} Entrypoint */
/** @typedef {import("./externals/ExternalModuleFactoryPlugin").ExternalItemFunctionCallback} ExternalItemFunctionCallback */
/** @typedef {import("./externals/ExternalModuleFactoryPlugin").ExternalItemFunctionData} ExternalItemFunctionData */
/** @typedef {import("./externals/ExternalModuleFactoryPlugin").ExternalItemFunctionDataGetResolve} ExternalItemFunctionDataGetResolve */
/** @typedef {import("./externals/ExternalModuleFactoryPlugin").ExternalItemFunctionDataGetResolveCallbackResult} ExternalItemFunctionDataGetResolveCallbackResult */
/** @typedef {import("./externals/ExternalModuleFactoryPlugin").ExternalItemFunctionDataGetResolveResult} ExternalItemFunctionDataGetResolveResult */
/** @typedef {import("./externals/ExternalModuleFactoryPlugin").ExternalItemFunctionPromise} ExternalItemFunctionPromise */
/** @typedef {import("./MultiCompiler").MultiCompilerOptions} MultiCompilerOptions */
/** @typedef {import("./MultiCompiler").MultiWebpackOptions} MultiConfiguration */
/** @typedef {import("./stats/MultiStats")} MultiStats */
/** @typedef {import("./stats/MultiStats").MultiStatsOptions} MultiStatsOptions */
/** @typedef {import("./module/NormalModuleFactory").ResolveData} ResolveData */
/** @typedef {import("./module/Parser").ParserState} ParserState */
/** @typedef {import("./resolve/ResolverFactory").ResolvePluginInstance} ResolvePluginInstance */
/** @typedef {import("./resolve/ResolverFactory").Resolver} Resolver */
/** @typedef {import("./template/Template").RenderManifestEntry} RenderManifestEntry */
/** @typedef {import("./template/Template").RenderManifestOptions} RenderManifestOptions */
/** @typedef {import("./template/TemplatedPathPlugin").TemplatePath} TemplatePath */
/** @typedef {import("./watch/Watching")} Watching */
/** @typedef {import("./config/cli").Argument} Argument */
/** @typedef {import("./config/cli").Problem} Problem */
/** @typedef {import("./util/terminalColors").Colors} Colors */
/** @typedef {import("./util/terminalColors").ColorsOptions} ColorsOptions */
/** @typedef {import("./config/defineConfig").ConfigurationFactory} ConfigurationFactory */
/** @typedef {import("./config/defineConfig").DefineConfigInput} DefineConfigInput */
/** @typedef {import("./stats/DefaultStatsFactoryPlugin").StatsAsset} StatsAsset */
/** @typedef {import("./stats/DefaultStatsFactoryPlugin").StatsChunk} StatsChunk */
/** @typedef {import("./stats/DefaultStatsFactoryPlugin").StatsChunkGroup} StatsChunkGroup */
/** @typedef {import("./stats/DefaultStatsFactoryPlugin").StatsChunkOrigin} StatsChunkOrigin */
/** @typedef {import("./stats/DefaultStatsFactoryPlugin").StatsCompilation} StatsCompilation */
/** @typedef {import("./stats/DefaultStatsFactoryPlugin").StatsError} StatsError */
/** @typedef {import("./stats/DefaultStatsFactoryPlugin").StatsLogging} StatsLogging */
/** @typedef {import("./stats/DefaultStatsFactoryPlugin").StatsLoggingEntry} StatsLoggingEntry */
/** @typedef {import("./stats/DefaultStatsFactoryPlugin").StatsModule} StatsModule */
/** @typedef {import("./stats/DefaultStatsFactoryPlugin").StatsModuleIssuer} StatsModuleIssuer */
/** @typedef {import("./stats/DefaultStatsFactoryPlugin").StatsModuleReason} StatsModuleReason */
/** @typedef {import("./stats/DefaultStatsFactoryPlugin").StatsModuleTraceDependency} StatsModuleTraceDependency */
/** @typedef {import("./stats/DefaultStatsFactoryPlugin").StatsModuleTraceItem} StatsModuleTraceItem */
/** @typedef {import("./stats/DefaultStatsFactoryPlugin").StatsProfile} StatsProfile */
/** @typedef {import("./serialization/ObjectMiddleware").ObjectSerializerContext} ObjectSerializerContext */
/** @typedef {import("./serialization/ObjectMiddleware").ObjectDeserializerContext} ObjectDeserializerContext */
/** @typedef {import("./fs/fs").InputFileSystem} InputFileSystem */
/** @typedef {import("./fs/fs").OutputFileSystem} OutputFileSystem */

/**
 * Returns function.
 * @template {EXPECTED_FUNCTION} T
 * @param {() => T} factory factory function
 * @returns {T} function
 */
const lazyFunction = (factory) => {
	const fac = memoize(factory);
	const f = /** @type {unknown} */ (
		/**
		 * Handles the callback logic for this hook.
		 * @param {...EXPECTED_ANY} args args
		 * @returns {T} result
		 */
		(...args) => fac()(...args)
	);
	return /** @type {T} */ (f);
};

/**
 * Merges the provided values into a single result.
 * @template A
 * @template B
 * @param {A} obj input a
 * @param {B} exports input b
 * @returns {A & B} merged
 */
const mergeExports = (obj, exports) => {
	const descriptors = Object.getOwnPropertyDescriptors(exports);
	for (const name of Object.keys(descriptors)) {
		const descriptor = descriptors[name];
		if (descriptor.get) {
			const fn = descriptor.get;
			Object.defineProperty(obj, name, {
				configurable: false,
				enumerable: true,
				get: memoize(fn)
			});
		} else if (typeof descriptor.value === "object") {
			Object.defineProperty(obj, name, {
				configurable: false,
				enumerable: true,
				writable: false,
				value: mergeExports({}, descriptor.value)
			});
		} else {
			throw new Error(
				"Exposed values must be either a getter or an nested object"
			);
		}
	}
	return /** @type {A & B} */ (Object.freeze(obj));
};

const fn = lazyFunction(() => require("./webpack"));

module.exports = mergeExports(fn, {
	get webpack() {
		return require("./webpack");
	},
	// Stays at the top level rather than only under `config`: every config file
	// calls it, and a scope would put three names in front of each one.
	get defineConfig() {
		return require("./config/defineConfig");
	},
	/**
	 * Returns validate fn.
	 * @returns {(configuration: Configuration | MultiConfiguration) => void} validate fn
	 */
	get validate() {
		const webpackOptionsSchemaCheck =
			/** @type {(configuration: Configuration | MultiConfiguration) => boolean} */
			(require("../schemas/WebpackOptions.check"));

		const getRealValidate = memoize(
			/**
			 * Handles the callback logic for this hook.
			 * @returns {(configuration: Configuration | MultiConfiguration) => void} validate fn
			 */
			() => {
				const validateSchema = require("./config/validateSchema");
				const webpackOptionsSchema =
					/** @type {EXPECTED_ANY} */
					(require("../schemas/WebpackOptions.json"));

				return (options) => validateSchema(webpackOptionsSchema, options);
			}
		);
		return (options) => {
			if (!webpackOptionsSchemaCheck(options)) {
				getRealValidate()(options);
			}
		};
	},
	/**
	 * Validates a value against a JSON schema.
	 * @deprecated use `config.validateSchema` — TODO in the next major release: remove
	 * @returns {typeof import("./config/validateSchema")} the schema validator
	 */
	get validateSchema() {
		const validateSchema = require("./config/validateSchema");

		return validateSchema;
	},
	get version() {
		return /** @type {string} */ (require("../package.json").version);
	},

	get cli() {
		return getCli();
	},
	/**
	 * Resolves every module of the last build eagerly.
	 * @deprecated use `prefetch.AutomaticPrefetchPlugin` — TODO in the next major release: remove
	 * @returns {typeof import("./prefetch/AutomaticPrefetchPlugin")} the moved export
	 */
	get AutomaticPrefetchPlugin() {
		return require("./prefetch/AutomaticPrefetchPlugin");
	},
	get AsyncDependenciesBlock() {
		return require("./graph/AsyncDependenciesBlock");
	},
	get BannerPlugin() {
		return require("./output/BannerPlugin");
	},
	/**
	 * The cache a compilation stores and restores through.
	 * @deprecated use `cache.Cache` — TODO in the next major release: remove
	 * @returns {typeof import("./cache/Cache")} the moved export
	 */
	get Cache() {
		return require("./cache/Cache");
	},
	get Chunk() {
		return require("./graph/Chunk");
	},
	get ChunkGraph() {
		return require("./graph/ChunkGraph");
	},
	get CleanPlugin() {
		return require("./output/CleanPlugin");
	},
	get Compilation() {
		return require("./Compilation");
	},
	get Compiler() {
		return require("./Compiler");
	},
	/**
	 * The protocol scope hoisting renders through.
	 * @deprecated use `optimize.ConcatenationScope` — TODO in the next major release: remove
	 * @returns {typeof import("./optimize/ConcatenationScope")} the moved export
	 */
	get ConcatenationScope() {
		return require("./optimize/ConcatenationScope");
	},
	get ContextExclusionPlugin() {
		return require("./context/ContextExclusionPlugin");
	},
	get ContextReplacementPlugin() {
		return require("./context/ContextReplacementPlugin");
	},
	get CopyPlugin() {
		return require("./output/CopyPlugin");
	},
	get DefinePlugin() {
		return require("./define/DefinePlugin");
	},
	get Dependency() {
		return require("./graph/Dependency");
	},
	get DynamicEntryPlugin() {
		return require("./entry/DynamicEntryPlugin");
	},
	get DotenvPlugin() {
		return require("./define/DotenvPlugin");
	},
	get EntryOptionPlugin() {
		return require("./entry/EntryOptionPlugin");
	},
	get EntryPlugin() {
		return require("./entry/EntryPlugin");
	},
	get EnvironmentPlugin() {
		return require("./define/EnvironmentPlugin");
	},
	get EvalDevToolModulePlugin() {
		return require("./devtool/EvalDevToolModulePlugin");
	},
	get EvalSourceMapDevToolPlugin() {
		return require("./devtool/EvalSourceMapDevToolPlugin");
	},
	get ExternalModule() {
		return require("./externals/ExternalModule");
	},
	get ExternalsPlugin() {
		return require("./externals/ExternalsPlugin");
	},
	get Generator() {
		return require("./module/Generator");
	},
	get HotUpdateChunk() {
		return require("./graph/HotUpdateChunk");
	},
	get HotModuleReplacementPlugin() {
		return require("./hmr/HotModuleReplacementPlugin");
	},
	get InitFragment() {
		return require("./template/InitFragment");
	},
	get IgnorePlugin() {
		return require("./resolve/IgnorePlugin");
	},
	get JavascriptModulesPlugin() {
		return util.deprecate(
			() => require("./javascript/JavascriptModulesPlugin"),
			"webpack.JavascriptModulesPlugin has moved to webpack.javascript.JavascriptModulesPlugin",
			"DEP_WEBPACK_JAVASCRIPT_MODULES_PLUGIN"
		)();
	},
	get LibraryTemplatePlugin() {
		return util.deprecate(
			() => require("./library/LibraryTemplatePlugin"),
			"webpack.LibraryTemplatePlugin is deprecated and has been replaced by compilation.outputOptions.library or compilation.addEntry + passing a library option",
			"DEP_WEBPACK_LIBRARY_TEMPLATE_PLUGIN"
		)();
	},
	get LoaderOptionsPlugin() {
		return require("./loaders/LoaderOptionsPlugin");
	},
	get LoaderTargetPlugin() {
		return require("./loaders/LoaderTargetPlugin");
	},
	get Module() {
		return require("./module/Module");
	},
	get ModuleFactory() {
		return require("./module/ModuleFactory");
	},
	get ModuleFilenameHelpers() {
		return require("./devtool/ModuleFilenameHelpers");
	},
	get ModuleGraph() {
		return require("./graph/ModuleGraph");
	},
	get ModuleGraphConnection() {
		return require("./graph/ModuleGraphConnection");
	},
	get NoEmitOnErrorsPlugin() {
		return require("./diagnostics/NoEmitOnErrorsPlugin");
	},
	get NormalModule() {
		return require("./module/NormalModule");
	},
	get NormalModuleReplacementPlugin() {
		return require("./resolve/NormalModuleReplacementPlugin");
	},
	get MultiCompiler() {
		return require("./MultiCompiler");
	},
	/**
	 * The stage constants the optimization hooks are tapped at.
	 * @deprecated use `optimize.OptimizationStages` — TODO in the next major release: remove
	 * @returns {typeof import("./optimize/OptimizationStages")} the moved export
	 */
	get OptimizationStages() {
		return require("./optimize/OptimizationStages");
	},
	get Parser() {
		return require("./module/Parser");
	},
	/**
	 * Pins the target platform a `target: false` build cannot infer.
	 * @deprecated use `config.PlatformPlugin` — TODO in the next major release: remove
	 * @returns {typeof import("./config/PlatformPlugin")} the moved export
	 */
	get PlatformPlugin() {
		return require("./config/PlatformPlugin");
	},
	/**
	 * Resolves one request eagerly at build time.
	 * @deprecated use `prefetch.PrefetchPlugin` — TODO in the next major release: remove
	 * @returns {typeof import("./prefetch/PrefetchPlugin")} the moved export
	 */
	get PrefetchPlugin() {
		return require("./prefetch/PrefetchPlugin");
	},
	get ProgressPlugin() {
		return require("./logging/ProgressPlugin");
	},
	get ProvidePlugin() {
		return require("./provide/ProvidePlugin");
	},
	/**
	 * The symbols a runtime module may declare a requirement on.
	 * @deprecated use `runtime.RuntimeGlobals` — TODO in the next major release: remove
	 * @returns {typeof import("./runtime/RuntimeGlobals")} the moved export
	 */
	get RuntimeGlobals() {
		return require("./runtime/RuntimeGlobals");
	},
	/**
	 * The base class every emitted runtime module extends.
	 * @deprecated use `runtime.RuntimeModule` — TODO in the next major release: remove
	 * @returns {typeof import("./runtime/RuntimeModule")} the moved export
	 */
	get RuntimeModule() {
		return require("./runtime/RuntimeModule");
	},
	get SingleEntryPlugin() {
		return util.deprecate(
			() => require("./entry/EntryPlugin"),
			"SingleEntryPlugin was renamed to EntryPlugin",
			"DEP_WEBPACK_SINGLE_ENTRY_PLUGIN"
		)();
	},
	get SSRManifestPlugin() {
		return require("./output/SSRManifestPlugin");
	},
	get SourceMapDevToolPlugin() {
		return require("./devtool/SourceMapDevToolPlugin");
	},
	get Stats() {
		return require("./stats/Stats");
	},
	get ManifestPlugin() {
		return require("./output/ManifestPlugin");
	},
	get Template() {
		return require("./template/Template");
	},
	get UsageState() {
		return require("./graph/ExportsInfo").UsageState;
	},
	get WatchIgnorePlugin() {
		return require("./watch/WatchIgnorePlugin");
	},
	get WebpackError() {
		return require("./errors/WebpackError");
	},
	/**
	 * Reads a resolved configuration into the plugins it implies.
	 * @deprecated use `config.WebpackOptionsApply` — TODO in the next major release: remove
	 * @returns {typeof import("./config/WebpackOptionsApply")} the moved export
	 */
	get WebpackOptionsApply() {
		return require("./config/WebpackOptionsApply");
	},
	get WebpackOptionsDefaulter() {
		return util.deprecate(
			() => require("./config/WebpackOptionsDefaulter"),
			"webpack.WebpackOptionsDefaulter is deprecated and has been replaced by webpack.config.getNormalizedWebpackOptions and webpack.config.applyWebpackOptionsDefaults",
			"DEP_WEBPACK_OPTIONS_DEFAULTER"
		)();
	},
	// TODO in the next major release: remove
	get WebpackOptionsValidationError() {
		return require("schema-utils").ValidationError;
	},
	get ValidationError() {
		return require("schema-utils").ValidationError;
	},

	cache: {
		get Cache() {
			return require("./cache/Cache");
		},
		get MemoryCachePlugin() {
			return require("./cache/MemoryCachePlugin");
		}
	},

	config: {
		get PlatformPlugin() {
			return require("./config/PlatformPlugin");
		},
		get WebpackOptionsApply() {
			return require("./config/WebpackOptionsApply");
		},
		get defineConfig() {
			return require("./config/defineConfig");
		},
		get validateSchema() {
			return require("./config/validateSchema");
		},
		get getNormalizedWebpackOptions() {
			return require("./config/normalization").getNormalizedWebpackOptions;
		},
		get applyWebpackOptionsDefaults() {
			return require("./config/defaults").applyWebpackOptionsDefaults;
		}
	},

	dependencies: {
		get ModuleDependency() {
			return require("./dependencies/ModuleDependency");
		},
		// TODO in the next major release: rename to `ESMImportDependency`
		get HarmonyImportDependency() {
			return require("./dependencies/esm/ESMImportDependency");
		},
		get ConstDependency() {
			return require("./dependencies/ConstDependency");
		},
		get NullDependency() {
			return require("./dependencies/NullDependency");
		}
	},

	ids: {
		get ChunkModuleIdRangePlugin() {
			return require("./ids/ChunkModuleIdRangePlugin");
		},
		get NaturalModuleIdsPlugin() {
			return require("./ids/NaturalModuleIdsPlugin");
		},
		get OccurrenceModuleIdsPlugin() {
			return require("./ids/OccurrenceModuleIdsPlugin");
		},
		get NamedModuleIdsPlugin() {
			return require("./ids/NamedModuleIdsPlugin");
		},
		get DeterministicChunkIdsPlugin() {
			return require("./ids/DeterministicChunkIdsPlugin");
		},
		get DeterministicModuleIdsPlugin() {
			return require("./ids/DeterministicModuleIdsPlugin");
		},
		get NamedChunkIdsPlugin() {
			return require("./ids/NamedChunkIdsPlugin");
		},
		get OccurrenceChunkIdsPlugin() {
			return require("./ids/OccurrenceChunkIdsPlugin");
		},
		get HashedModuleIdsPlugin() {
			return require("./ids/HashedModuleIdsPlugin");
		}
	},

	javascript: {
		get EnableChunkLoadingPlugin() {
			return require("./javascript/EnableChunkLoadingPlugin");
		},
		get JavascriptModulesPlugin() {
			return require("./javascript/JavascriptModulesPlugin");
		},
		get JavascriptParser() {
			return require("./javascript/JavascriptParser");
		},
		// The parser a build reads source with and the printer it writes minified
		// source back out with, each loaded only where it is asked for.
		get syntax() {
			return require("./javascript/syntax");
		}
	},

	optimize: {
		get ConcatenationScope() {
			return require("./optimize/ConcatenationScope");
		},
		get OptimizationStages() {
			return require("./optimize/OptimizationStages");
		},
		get AggressiveMergingPlugin() {
			return require("./optimize/AggressiveMergingPlugin");
		},
		get AggressiveSplittingPlugin() {
			return util.deprecate(
				() => require("./optimize/AggressiveSplittingPlugin"),
				"AggressiveSplittingPlugin is deprecated in favor of SplitChunksPlugin",
				"DEP_WEBPACK_AGGRESSIVE_SPLITTING_PLUGIN"
			)();
		},
		get InnerGraph() {
			return require("./optimize/InnerGraph");
		},
		get LimitChunkCountPlugin() {
			return require("./optimize/LimitChunkCountPlugin");
		},
		get MergeDuplicateChunksPlugin() {
			return require("./optimize/MergeDuplicateChunksPlugin");
		},
		get MinChunkSizePlugin() {
			return require("./optimize/MinChunkSizePlugin");
		},
		get ModuleConcatenationPlugin() {
			return require("./optimize/ModuleConcatenationPlugin");
		},
		get RealContentHashPlugin() {
			return require("./optimize/RealContentHashPlugin");
		},
		get RuntimeChunkPlugin() {
			return require("./optimize/RuntimeChunkPlugin");
		},
		get SideEffectsFlagPlugin() {
			return require("./optimize/SideEffectsFlagPlugin");
		},
		get SplitChunksPlugin() {
			return require("./optimize/SplitChunksPlugin");
		}
	},

	runtime: {
		get RuntimeGlobals() {
			return require("./runtime/RuntimeGlobals");
		},
		get RuntimeModule() {
			return require("./runtime/RuntimeModule");
		},
		get GetChunkFilenameRuntimeModule() {
			return require("./runtime/GetChunkFilenameRuntimeModule");
		},
		get LoadScriptRuntimeModule() {
			return require("./runtime/LoadScriptRuntimeModule");
		}
	},

	prefetch: {
		get AutomaticPrefetchPlugin() {
			return require("./prefetch/AutomaticPrefetchPlugin");
		},
		get PrefetchPlugin() {
			return require("./prefetch/PrefetchPlugin");
		},
		get ChunkPrefetchPreloadPlugin() {
			return require("./prefetch/ChunkPrefetchPreloadPlugin");
		}
	},

	web: {
		get FetchCompileWasmPlugin() {
			return require("./web/FetchCompileWasmPlugin");
		},
		get FetchCompileAsyncWasmPlugin() {
			return require("./web/FetchCompileAsyncWasmPlugin");
		},
		get JsonpChunkLoadingRuntimeModule() {
			return require("./web/JsonpChunkLoadingRuntimeModule");
		},
		get JsonpTemplatePlugin() {
			return require("./web/JsonpTemplatePlugin");
		},
		/**
		 * The runtime module that loads a chunk's CSS.
		 * @deprecated use `css.CssLoadingRuntimeModule`, the scope this module lives in — TODO in the next major release: remove
		 * @returns {typeof import("./css/CssLoadingRuntimeModule")} the runtime module
		 */
		get CssLoadingRuntimeModule() {
			return require("./css/CssLoadingRuntimeModule");
		}
	},

	esm: {
		get ModuleChunkLoadingRuntimeModule() {
			return require("./esm/ModuleChunkLoadingRuntimeModule");
		}
	},

	webworker: {
		get WebWorkerTemplatePlugin() {
			return require("./webworker/WebWorkerTemplatePlugin");
		}
	},

	node: {
		get NodeEnvironmentPlugin() {
			return require("./node/NodeEnvironmentPlugin");
		},
		get NodeSourcePlugin() {
			return require("./node/NodeSourcePlugin");
		},
		get NodeTargetPlugin() {
			return require("./node/NodeTargetPlugin");
		},
		get NodeTemplatePlugin() {
			return require("./node/NodeTemplatePlugin");
		},
		get ReadFileCompileWasmPlugin() {
			return require("./node/ReadFileCompileWasmPlugin");
		},
		get ReadFileCompileAsyncWasmPlugin() {
			return require("./node/ReadFileCompileAsyncWasmPlugin");
		}
	},

	electron: {
		get ElectronTargetPlugin() {
			return require("./electron/ElectronTargetPlugin");
		}
	},

	bun: {
		get BunTargetPlugin() {
			return require("./bun/BunTargetPlugin");
		}
	},

	deno: {
		get DenoTargetPlugin() {
			return require("./deno/DenoTargetPlugin");
		}
	},

	wasm: {
		get AsyncWebAssemblyModulesPlugin() {
			return require("./wasm/AsyncWebAssemblyModulesPlugin");
		},
		get EnableWasmLoadingPlugin() {
			return require("./wasm/EnableWasmLoadingPlugin");
		}
	},

	asset: {
		get AssetModulesPlugin() {
			return require("./asset/AssetModulesPlugin");
		}
	},

	json: {
		get JsonModulesPlugin() {
			return require("./json/JsonModulesPlugin");
		}
	},

	css: {
		get CssLoadingRuntimeModule() {
			return require("./css/CssLoadingRuntimeModule");
		},
		get CssModulesPlugin() {
			return require("./css/CssModulesPlugin");
		},
		// The minifier `optimization.minimizer` dispatches CSS to by default.
		get cssMinify() {
			return require("./css/cssMinify");
		},
		// Experimental native CSS parser + safe minifying serializer (its
		// `SourceProcessor` / `printer` exports carry the `@experimental` tag).
		get syntax() {
			return require("./css/syntax");
		}
	},

	html: {
		// Minifies what a document embeds, by handing each body back to webpack's
		// own minifier for that language.
		get builtinEmbeddedRenderer() {
			return require("./html/builtinEmbeddedRenderer").builtinEmbeddedRenderer;
		},
		get HtmlModulesPlugin() {
			return require("./html/HtmlModulesPlugin");
		},
		// The minifier `optimization.minimizer` dispatches HTML to by default.
		get htmlMinify() {
			return require("./html/htmlMinify");
		},
		// Experimental native HTML parser + safe minifying serializer (its
		// `SourceProcessor` / `printer` exports carry the `@experimental` tag).
		get syntax() {
			return require("./html/syntax");
		}
	},

	library: {
		get AbstractLibraryPlugin() {
			return require("./library/AbstractLibraryPlugin");
		},
		get EnableLibraryPlugin() {
			return require("./library/EnableLibraryPlugin");
		}
	},

	// TODO in the next major release: remove in favor of `dll` scope
	get DelegatedPlugin() {
		return require("./dll/DelegatedPlugin");
	},
	get DllPlugin() {
		return require("./dll/DllPlugin");
	},
	get DllReferencePlugin() {
		return require("./dll/DllReferencePlugin");
	},
	get LibManifestPlugin() {
		return require("./dll/LibManifestPlugin");
	},

	dll: {
		get DelegatedPlugin() {
			return require("./dll/DelegatedPlugin");
		},
		get DllPlugin() {
			return require("./dll/DllPlugin");
		},
		get DllReferencePlugin() {
			return require("./dll/DllReferencePlugin");
		},
		get LibManifestPlugin() {
			return require("./dll/LibManifestPlugin");
		}
	},

	container: {
		get ContainerPlugin() {
			return require("./container/ContainerPlugin");
		},
		get ContainerReferencePlugin() {
			return require("./container/ContainerReferencePlugin");
		},
		get ModuleFederationPlugin() {
			return require("./container/ModuleFederationPlugin");
		},
		get scope() {
			return require("./container/options").scope;
		}
	},

	sharing: {
		get ConsumeSharedPlugin() {
			return require("./sharing/ConsumeSharedPlugin");
		},
		get ProvideSharedPlugin() {
			return require("./sharing/ProvideSharedPlugin");
		},
		get SharePlugin() {
			return require("./sharing/SharePlugin");
		},
		get scope() {
			return require("./container/options").scope;
		}
	},

	debug: {
		get ProfilingPlugin() {
			return require("./debug/ProfilingPlugin");
		}
	},

	util: {
		get createHash() {
			return require("./util/createHash");
		},
		get comparators() {
			return require("./util/comparators");
		},
		get runtime() {
			return require("./util/runtime");
		},
		get serialization() {
			return require("./util/serialization");
		},
		get cleverMerge() {
			return require("./util/cleverMerge").cachedCleverMerge;
		},
		get LazySet() {
			return require("./util/LazySet");
		},
		get RequestShortener() {
			return require("./util/RequestShortener");
		},
		get compileBooleanMatcher() {
			return require("./util/compileBooleanMatcher");
		},
		// Reading and writing `data:` URLs, and the helpers a minifier drives a
		// caller's `renderEmbeddedSource` through.
		get dataURL() {
			return require("./util/dataURL");
		}
	},

	get sources() {
		return require("webpack-sources");
	},

	experiments: {
		schemes: {
			get HttpUriPlugin() {
				return require("./schemes/HttpUriPlugin");
			},
			get VirtualUrlPlugin() {
				return require("./schemes/VirtualUrlPlugin");
			}
		},
		ids: {
			get SyncModuleIdsPlugin() {
				return require("./ids/SyncModuleIdsPlugin");
			}
		},
		typescript: {
			get TypeScriptPlugin() {
				return require("./typescript/TypeScriptPlugin");
			}
		}
	}
});

/**
 * The loader-authoring types, re-exported here because this file is what
 * `generate-types.js` reads webpack's public type surface from
 * @template [OptionsType={}]
 * @template [ContextAdditions={}]
 * @typedef {import("./loaders/LoaderRunner").LoaderModule<OptionsType, ContextAdditions>} LoaderModule
 */

/**
 * @template [OptionsType={}]
 * @template [ContextAdditions={}]
 * @typedef {import("./loaders/LoaderRunner").RawLoaderDefinition<OptionsType, ContextAdditions>} RawLoaderDefinition
 */

/**
 * @template [OptionsType={}]
 * @template [ContextAdditions={}]
 * @typedef {import("./loaders/LoaderRunner").LoaderDefinition<OptionsType, ContextAdditions>} LoaderDefinition
 */

/**
 * @template [OptionsType={}]
 * @template [ContextAdditions={}]
 * @typedef {import("./loaders/LoaderRunner").LoaderDefinitionFunction<OptionsType, ContextAdditions>} LoaderDefinitionFunction
 */

/**
 * @template [OptionsType={}]
 * @template [ContextAdditions={}]
 * @typedef {import("./loaders/LoaderRunner").PitchLoaderDefinitionFunction<OptionsType, ContextAdditions>} PitchLoaderDefinitionFunction
 */

/**
 * @template [OptionsType={}]
 * @template [ContextAdditions={}]
 * @typedef {import("./loaders/LoaderRunner").RawLoaderDefinitionFunction<OptionsType, ContextAdditions>} RawLoaderDefinitionFunction
 */

/**
 * @template OptionsType
 * @typedef {import("./module/NormalModule").LoaderContext<OptionsType>} LoaderContext
 */
