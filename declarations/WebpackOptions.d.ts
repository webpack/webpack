/*
 * This file was automatically generated.
 * DO NOT MODIFY BY HAND.
 * Run `yarn special-lint-fix` to update
 */

/**
 * Set the value of `require.amd` and `define.amd`. Or disable AMD support.
 */
export type Amd =
	| false
	| {
			[k: string]: any;
	  };
/**
 * Report the first error as a hard error instead of tolerating it.
 */
export type Bail = boolean;
/**
 * Cache generated modules and chunks to improve performance for multiple incremental builds.
 */
export type CacheOptions = true | CacheOptionsNormalized;
/**
 * Cache generated modules and chunks to improve performance for multiple incremental builds.
 */
export type CacheOptionsNormalized =
	| false
	| MemoryCacheOptions
	| FileCacheOptions;
/**
 * The base directory (absolute path!) for resolving the `entry` option. If `output.pathinfo` is set, the included pathinfo is shortened to this directory.
 */
export type Context = string;
/**
 * References to other configurations to depend on.
 */
export type Dependencies = string[];
/**
 * A developer tool to enhance debugging (false | eval | [inline-|hidden-|eval-][nosources-][cheap-[module-]]source-map).
 */
export type DevTool = (false | "eval") | string;
/**
 * The entry point(s) of the compilation.
 */
export type Entry = EntryDynamic | EntryStatic;
/**
 * A Function returning an entry object, an entry string, an entry array or a promise to these things.
 */
export type EntryDynamic = () => EntryStatic | Promise<EntryStatic>;
/**
 * A static entry description.
 */
export type EntryStatic = EntryObject | EntryUnnamed;
/**
 * Module(s) that are loaded upon startup.
 */
export type EntryItem = [string, ...string[]] | string;
/**
 * The method of loading chunks (methods included by default are 'jsonp' (web), 'importScripts' (WebWorker), 'require' (sync node.js), 'async-node' (async node.js), but others might be added by plugins).
 */
export type ChunkLoading = false | ChunkLoadingType;
/**
 * The method of loading chunks (methods included by default are 'jsonp' (web), 'importScripts' (WebWorker), 'require' (sync node.js), 'async-node' (async node.js), but others might be added by plugins).
 */
export type ChunkLoadingType =
	| ("jsonp" | "import-scripts" | "require" | "async-node")
	| string;
/**
 * Specifies the name of each output file on disk. You must **not** specify an absolute path here! The `output.path` option determines the location on disk the files are written to, filename is used solely for naming the individual files.
 */
export type Filename =
	| string
	| ((
			pathData: import("../lib/Compilation").PathData,
			assetInfo?: import("../lib/Compilation").AssetInfo
	  ) => string);
/**
 * Add a comment in the UMD wrapper.
 */
export type AuxiliaryComment = string | LibraryCustomUmdCommentObject;
/**
 * Specify which export should be exposed as library.
 */
export type LibraryExport = string[] | string;
/**
 * The name of the library (some types allow unnamed libraries too).
 */
export type LibraryName = string[] | string | LibraryCustomUmdObject;
/**
 * Type of library (types included by default are 'var', 'module', 'assign', 'this', 'window', 'self', 'global', 'commonjs', 'commonjs2', 'commonjs-module', 'amd', 'amd-require', 'umd', 'umd2', 'jsonp', 'system', but others might be added by plugins).
 */
export type LibraryType =
	| (
			| "var"
			| "module"
			| "assign"
			| "this"
			| "window"
			| "self"
			| "global"
			| "commonjs"
			| "commonjs2"
			| "commonjs-module"
			| "amd"
			| "amd-require"
			| "umd"
			| "umd2"
			| "jsonp"
			| "system"
	  )
	| string;
/**
 * If `output.libraryTarget` is set to umd and `output.library` is set, setting this to true will name the AMD module.
 */
export type UmdNamedDefine = boolean;
/**
 * The name of the runtime chunk. If set a runtime chunk with this name is created or an existing entrypoint is used as runtime.
 */
export type EntryRuntime = string;
/**
 * The method of loading WebAssembly Modules (methods included by default are 'fetch' (web/WebWorker), 'async-node' (node.js), but others might be added by plugins).
 */
export type WasmLoading = false | WasmLoadingType;
/**
 * The method of loading WebAssembly Modules (methods included by default are 'fetch' (web/WebWorker), 'async-node' (node.js), but others might be added by plugins).
 */
export type WasmLoadingType =
	| ("fetch-streaming" | "fetch" | "async-node")
	| string;
/**
 * An entry point without name.
 */
export type EntryUnnamed = EntryItem;
/**
 * Specify dependencies that shouldn't be resolved by webpack, but should become dependencies of the resulting bundle. The kind of the dependency depends on `output.libraryTarget`.
 */
export type Externals = ExternalItem[] | ExternalItem;
/**
 * Specify dependency that shouldn't be resolved by webpack, but should become dependencies of the resulting bundle. The kind of the dependency depends on `output.libraryTarget`.
 */
export type ExternalItem =
	| RegExp
	| string
	| {
			/**
			 * The dependency used for the external.
			 */
			[k: string]:
				| string[]
				| boolean
				| string
				| {
						[k: string]: any;
				  };
	  }
	| ((
			data: {context: string; request: string},
			callback: (err?: Error, result?: string) => void
	  ) => void);
/**
 * Specifies the default type of externals ('amd*', 'umd*', 'system' and 'jsonp' depend on output.libraryTarget set to the same value).
 */
export type ExternalsType =
	| "var"
	| "module"
	| "assign"
	| "this"
	| "window"
	| "self"
	| "global"
	| "commonjs"
	| "commonjs2"
	| "commonjs-module"
	| "amd"
	| "amd-require"
	| "umd"
	| "umd2"
	| "jsonp"
	| "system"
	| "promise"
	| "import"
	| "script";
/**
 * Ignore specific warnings.
 */
export type IgnoreWarnings = (
	| RegExp
	| {
			/**
			 * A RegExp to select the origin file for the warning.
			 */
			file?: RegExp;
			/**
			 * A RegExp to select the warning message.
			 */
			message?: RegExp;
			/**
			 * A RegExp to select the origin module for the warning.
			 */
			module?: RegExp;
	  }
	| ((
			warning: import("../lib/WebpackError"),
			compilation: import("../lib/Compilation")
	  ) => boolean)
)[];
/**
 * Filtering values.
 */
export type FilterTypes = FilterItemTypes[] | FilterItemTypes;
/**
 * Filtering value, regexp or function.
 */
export type FilterItemTypes = RegExp | string | ((value: string) => boolean);
/**
 * Enable production optimizations or development hints.
 */
export type Mode = "development" | "production" | "none";
/**
 * One or multiple rule conditions.
 */
export type RuleSetConditionOrConditions = RuleSetCondition | RuleSetConditions;
/**
 * A condition matcher.
 */
export type RuleSetCondition =
	| RegExp
	| string
	| {
			/**
			 * Logical AND.
			 */
			and?: RuleSetConditions;
			/**
			 * Logical NOT.
			 */
			not?: RuleSetConditions;
			/**
			 * Logical OR.
			 */
			or?: RuleSetConditions;
	  }
	| ((value: string) => boolean)
	| RuleSetConditions;
/**
 * A list of rule conditions.
 */
export type RuleSetConditions = RuleSetCondition[];
/**
 * One or multiple rule conditions matching an absolute path.
 */
export type RuleSetConditionOrConditionsAbsolute =
	| RuleSetConditionAbsolute
	| RuleSetConditionsAbsolute;
/**
 * A condition matcher matching an absolute path.
 */
export type RuleSetConditionAbsolute =
	| RegExp
	| string
	| {
			/**
			 * Logical AND.
			 */
			and?: RuleSetConditionsAbsolute;
			/**
			 * Logical NOT.
			 */
			not?: RuleSetConditionsAbsolute;
			/**
			 * Logical OR.
			 */
			or?: RuleSetConditionsAbsolute;
	  }
	| ((value: string) => boolean)
	| RuleSetConditionsAbsolute;
/**
 * A list of rule conditions matching an absolute path.
 */
export type RuleSetConditionsAbsolute = RuleSetConditionAbsolute[];
/**
 * A loader request.
 */
export type RuleSetLoader = string;
/**
 * Options passed to a loader.
 */
export type RuleSetLoaderOptions =
	| string
	| {
			[k: string]: any;
	  };
/**
 * Redirect module requests.
 */
export type ResolveAlias =
	| {
			/**
			 * New request.
			 */
			alias: string[] | false | string;
			/**
			 * Request to be redirected.
			 */
			name: string;
			/**
			 * Redirect only exact matching request.
			 */
			onlyModule?: boolean;
	  }[]
	| {
			/**
			 * New request.
			 */
			[k: string]: string[] | false | string;
	  };
/**
 * A list of descriptions of loaders applied.
 */
export type RuleSetUse =
	| RuleSetUseItem[]
	| ((data: {
			resource: string;
			realResource: string;
			resourceQuery: string;
			issuer: string;
			compiler: string;
	  }) => RuleSetUseItem[])
	| RuleSetUseItem;
/**
 * A description of an applied loader.
 */
export type RuleSetUseItem =
	| {
			/**
			 * Unique loader options identifier.
			 */
			ident?: string;
			/**
			 * Loader name.
			 */
			loader?: RuleSetLoader;
			/**
			 * Loader options.
			 */
			options?: RuleSetLoaderOptions;
	  }
	| ((data: object) => RuleSetUseItem | RuleSetUseItem[])
	| RuleSetLoader;
/**
 * A list of rules.
 */
export type RuleSetRules = ("..." | RuleSetRule)[];
/**
 * Name of the configuration. Used when loading multiple configurations.
 */
export type Name = string;
/**
 * Include polyfills or mocks for various node stuff.
 */
export type Node = false | NodeOptions;
/**
 * Function acting as plugin.
 */
export type WebpackPluginFunction = (
	this: import("../lib/Compiler"),
	compiler: import("../lib/Compiler")
) => void;
/**
 * Create an additional chunk which contains only the webpack runtime and chunk hash maps.
 */
export type OptimizationRuntimeChunk =
	| ("single" | "multiple")
	| boolean
	| {
			/**
			 * The name or name factory for the runtime chunks.
			 */
			name?: string | Function;
	  };
/**
 * Size description for limits.
 */
export type OptimizationSplitChunksSizes =
	| number
	| {
			/**
			 * Size of the part of the chunk with the type of the key.
			 */
			[k: string]: number;
	  };
/**
 * The filename of asset modules as relative path inside the `output.path` directory.
 */
export type AssetModuleFilename =
	| string
	| ((
			pathData: import("../lib/Compilation").PathData,
			assetInfo?: import("../lib/Compilation").AssetInfo
	  ) => string);
/**
 * Add charset attribute for script tag.
 */
export type Charset = boolean;
/**
 * The filename of non-initial chunks as relative path inside the `output.path` directory.
 */
export type ChunkFilename =
	| string
	| ((
			pathData: import("../lib/Compilation").PathData,
			assetInfo?: import("../lib/Compilation").AssetInfo
	  ) => string);
/**
 * The format of chunks (formats included by default are 'array-push' (web/WebWorker), 'commonjs' (node.js), but others might be added by plugins).
 */
export type ChunkFormat = ("array-push" | "commonjs" | false) | string;
/**
 * Number of milliseconds before chunk request expires.
 */
export type ChunkLoadTimeout = number;
/**
 * The global variable used by webpack for loading of chunks.
 */
export type ChunkLoadingGlobal = string;
/**
 * Check if to be emitted file already exists and have the same content before writing to output filesystem.
 */
export type CompareBeforeEmit = boolean;
/**
 * This option enables cross-origin loading of chunks.
 */
export type CrossOriginLoading = false | "anonymous" | "use-credentials";
/**
 * Similar to `output.devtoolModuleFilenameTemplate`, but used in the case of duplicate module identifiers.
 */
export type DevtoolFallbackModuleFilenameTemplate = string | Function;
/**
 * Filename template string of function for the sources array in a generated SourceMap.
 */
export type DevtoolModuleFilenameTemplate = string | Function;
/**
 * Module namespace to use when interpolating filename template string for the sources array in a generated SourceMap. Defaults to `output.library` if not set. It's useful for avoiding runtime collisions in sourcemaps from multiple webpack projects built as libraries.
 */
export type DevtoolNamespace = string;
/**
 * List of chunk loading types enabled for use by entry points.
 */
export type EnabledChunkLoadingTypes = ChunkLoadingType[];
/**
 * List of library types enabled for use by entry points.
 */
export type EnabledLibraryTypes = LibraryType[];
/**
 * List of wasm loading types enabled for use by entry points.
 */
export type EnabledWasmLoadingTypes = WasmLoadingType[];
/**
 * An expression which is used to address the global object/scope in runtime code.
 */
export type GlobalObject = string;
/**
 * Digest type used for the hash.
 */
export type HashDigest = string;
/**
 * Number of chars which are used for the hash.
 */
export type HashDigestLength = number;
/**
 * Algorithm used for generation the hash (see node.js crypto package).
 */
export type HashFunction = string | typeof import("../lib/util/Hash");
/**
 * Any string which is added to the hash to salt it.
 */
export type HashSalt = string;
/**
 * The filename of the Hot Update Chunks. They are inside the output.path directory.
 */
export type HotUpdateChunkFilename = string;
/**
 * The global variable used by webpack for loading of hot update chunks.
 */
export type HotUpdateGlobal = string;
/**
 * The filename of the Hot Update Main File. It is inside the `output.path` directory.
 */
export type HotUpdateMainFilename = string;
/**
 * Wrap javascript code into IIFE's to avoid leaking into global scope.
 */
export type Iife = boolean;
/**
 * The name of the native import() function (can be exchanged for a polyfill).
 */
export type ImportFunctionName = string;
/**
 * The name of the native import.meta object (can be exchanged for a polyfill).
 */
export type ImportMetaName = string;
/**
 * Make the output files a library, exporting the exports of the entry point.
 */
export type Library = LibraryName | LibraryOptions;
/**
 * Output javascript files as module source type.
 */
export type OutputModule = boolean;
/**
 * The output directory as **absolute path** (required).
 */
export type Path = string;
/**
 * Include comments with information about the modules.
 */
export type Pathinfo = boolean;
/**
 * The `publicPath` specifies the public URL address of the output files when referenced in a browser.
 */
export type PublicPath =
	| "auto"
	| string
	| ((
			pathData: import("../lib/Compilation").PathData,
			assetInfo?: import("../lib/Compilation").AssetInfo
	  ) => string);
/**
 * This option enables loading async chunks via a custom script type, such as script type="module".
 */
export type ScriptType = false | "text/javascript" | "module";
/**
 * The filename of the SourceMaps for the JavaScript files. They are inside the `output.path` directory.
 */
export type SourceMapFilename = string;
/**
 * Prefixes every line of the source in the bundle with this string.
 */
export type SourcePrefix = string;
/**
 * Handles exceptions in module loading correctly at a performance cost.
 */
export type StrictModuleExceptionHandling = boolean;
/**
 * A unique name of the webpack build to avoid multiple webpack runtimes to conflict when using globals.
 */
export type UniqueName = string;
/**
 * The filename of WebAssembly modules as relative path inside the `output.path` directory.
 */
export type WebassemblyModuleFilename = string;
/**
 * The number of parallel processed modules in the compilation.
 */
export type Parallelism = number;
/**
 * Configuration for web performance recommendations.
 */
export type Performance = false | PerformanceOptions;
/**
 * Add additional plugins to the compiler.
 */
export type Plugins = (WebpackPluginInstance | WebpackPluginFunction)[];
/**
 * Capture timing information for each module.
 */
export type Profile = boolean;
/**
 * Store compiler state to a json file.
 */
export type RecordsInputPath = false | string;
/**
 * Load compiler state from a json file.
 */
export type RecordsOutputPath = false | string;
/**
 * Store/Load compiler state from/to a json file. This will result in persistent ids of modules and chunks. An absolute path is expected. `recordsPath` is used for `recordsInputPath` and `recordsOutputPath` if they left undefined.
 */
export type RecordsPath = false | string;
/**
 * Options for the resolver.
 */
export type Resolve = ResolveOptions;
/**
 * Options for the resolver when resolving loaders.
 */
export type ResolveLoader = ResolveOptions;
/**
 * Stats options object or preset name.
 */
export type StatsValue =
	| (
			| "none"
			| "summary"
			| "errors-only"
			| "errors-warnings"
			| "minimal"
			| "normal"
			| "detailed"
			| "verbose"
	  )
	| boolean
	| StatsOptions;
/**
 * Environment to build for. An array of environments to build for all of them when possible.
 */
export type Target = [string, ...string[]] | false | string;
/**
 * Enter watch mode, which rebuilds on file change.
 */
export type Watch = boolean;
/**
 * A Function returning a Promise resolving to a normalized entry.
 */
export type EntryDynamicNormalized = () => Promise<EntryStaticNormalized>;
/**
 * The entry point(s) of the compilation.
 */
export type EntryNormalized = EntryDynamicNormalized | EntryStaticNormalized;
/**
 * Ignore specific warnings.
 */
export type IgnoreWarningsNormalized = ((
	warning: import("../lib/WebpackError"),
	compilation: import("../lib/Compilation")
) => boolean)[];
/**
 * Create an additional chunk which contains only the webpack runtime and chunk hash maps.
 */
export type OptimizationRuntimeChunkNormalized =
	| false
	| {
			/**
			 * The name factory for the runtime chunks.
			 */
			name?: Function;
	  };
/**
 * A function returning cache groups.
 */
export type OptimizationSplitChunksGetCacheGroups = (
	module: import("../lib/Module")
) =>
	| OptimizationSplitChunksCacheGroup
	| OptimizationSplitChunksCacheGroup[]
	| void;

/**
 * Options object as provided by the user.
 */
export interface WebpackOptions {
	/**
	 * Set the value of `require.amd` and `define.amd`. Or disable AMD support.
	 */
	amd?: Amd;
	/**
	 * Report the first error as a hard error instead of tolerating it.
	 */
	bail?: Bail;
	/**
	 * Cache generated modules and chunks to improve performance for multiple incremental builds.
	 */
	cache?: CacheOptions;
	/**
	 * The base directory (absolute path!) for resolving the `entry` option. If `output.pathinfo` is set, the included pathinfo is shortened to this directory.
	 */
	context?: Context;
	/**
	 * References to other configurations to depend on.
	 */
	dependencies?: Dependencies;
	/**
	 * Options for the webpack-dev-server.
	 */
	devServer?: DevServer;
	/**
	 * A developer tool to enhance debugging (false | eval | [inline-|hidden-|eval-][nosources-][cheap-[module-]]source-map).
	 */
	devtool?: DevTool;
	/**
	 * The entry point(s) of the compilation.
	 */
	entry?: Entry;
	/**
	 * Enables/Disables experiments (experimental features with relax SemVer compatibility).
	 */
	experiments?: Experiments;
	/**
	 * Specify dependencies that shouldn't be resolved by webpack, but should become dependencies of the resulting bundle. The kind of the dependency depends on `output.libraryTarget`.
	 */
	externals?: Externals;
	/**
	 * Enable presets of externals for specific targets.
	 */
	externalsPresets?: ExternalsPresets;
	/**
	 * Specifies the default type of externals ('amd*', 'umd*', 'system' and 'jsonp' depend on output.libraryTarget set to the same value).
	 */
	externalsType?: ExternalsType;
	/**
	 * Ignore specific warnings.
	 */
	ignoreWarnings?: IgnoreWarnings;
	/**
	 * Options for infrastructure level logging.
	 */
	infrastructureLogging?: InfrastructureLogging;
	/**
	 * Custom values available in the loader context.
	 */
	loader?: Loader;
	/**
	 * Enable production optimizations or development hints.
	 */
	mode?: Mode;
	/**
	 * Options affecting the normal modules (`NormalModuleFactory`).
	 */
	module?: ModuleOptions;
	/**
	 * Name of the configuration. Used when loading multiple configurations.
	 */
	name?: Name;
	/**
	 * Include polyfills or mocks for various node stuff.
	 */
	node?: Node;
	/**
	 * Enables/Disables integrated optimizations.
	 */
	optimization?: Optimization;
	/**
	 * Options affecting the output of the compilation. `output` options tell webpack how to write the compiled files to disk.
	 */
	output?: Output;
	/**
	 * The number of parallel processed modules in the compilation.
	 */
	parallelism?: Parallelism;
	/**
	 * Configuration for web performance recommendations.
	 */
	performance?: Performance;
	/**
	 * Add additional plugins to the compiler.
	 */
	plugins?: Plugins;
	/**
	 * Capture timing information for each module.
	 */
	profile?: Profile;
	/**
	 * Store compiler state to a json file.
	 */
	recordsInputPath?: RecordsInputPath;
	/**
	 * Load compiler state from a json file.
	 */
	recordsOutputPath?: RecordsOutputPath;
	/**
	 * Store/Load compiler state from/to a json file. This will result in persistent ids of modules and chunks. An absolute path is expected. `recordsPath` is used for `recordsInputPath` and `recordsOutputPath` if they left undefined.
	 */
	recordsPath?: RecordsPath;
	/**
	 * Options for the resolver.
	 */
	resolve?: Resolve;
	/**
	 * Options for the resolver when resolving loaders.
	 */
	resolveLoader?: ResolveLoader;
	/**
	 * Options affecting how file system snapshots are created and validated.
	 */
	snapshot?: SnapshotOptions;
	/**
	 * Stats options object or preset name.
	 */
	stats?: StatsValue;
	/**
	 * Environment to build for. An array of environments to build for all of them when possible.
	 */
	target?: Target;
	/**
	 * Enter watch mode, which rebuilds on file change.
	 */
	watch?: Watch;
	/**
	 * Options for the watcher.
	 */
	watchOptions?: WatchOptions;
}
/**
 * Options object for in-memory caching.
 */
export interface MemoryCacheOptions {
	/**
	 * In memory caching.
	 */
	type: "memory";
}
/**
 * Options object for persistent file-based caching.
 */
export interface FileCacheOptions {
	/**
	 * Dependencies the build depends on (in multiple categories, default categories: 'defaultWebpack').
	 */
	buildDependencies?: {
		/**
		 * List of dependencies the build depends on.
		 */
		[k: string]: string[];
	};
	/**
	 * Base directory for the cache (defaults to node_modules/.cache/webpack).
	 */
	cacheDirectory?: string;
	/**
	 * Locations for the cache (defaults to cacheDirectory / name).
	 */
	cacheLocation?: string;
	/**
	 * Algorithm used for generation the hash (see node.js crypto package).
	 */
	hashAlgorithm?: string;
	/**
	 * Time in ms after which idle period the cache storing should happen (only for store: 'pack' or 'idle').
	 */
	idleTimeout?: number;
	/**
	 * Time in ms after which idle period the initial cache storing should happen (only for store: 'pack' or 'idle').
	 */
	idleTimeoutForInitialStore?: number;
	/**
	 * List of paths that are managed by a package manager and contain a version or hash in its path so all files are immutable.
	 */
	immutablePaths?: string[];
	/**
	 * List of paths that are managed by a package manager and can be trusted to not be modified otherwise.
	 */
	managedPaths?: string[];
	/**
	 * Name for the cache. Different names will lead to different coexisting caches.
	 */
	name?: string;
	/**
	 * When to store data to the filesystem. (pack: Store data when compiler is idle in a single file).
	 */
	store?: "pack";
	/**
	 * Filesystem caching.
	 */
	type: "filesystem";
	/**
	 * Version of the cache data. Different versions won't allow to reuse the cache and override existing content. Update the version when config changed in a way which doesn't allow to reuse cache. This will invalidate the cache.
	 */
	version?: string;
}
/**
 * Options for the webpack-dev-server.
 */
export interface DevServer {
	[k: string]: any;
}
/**
 * Multiple entry bundles are created. The key is the entry name. The value can be a string, an array or an entry description object.
 */
export interface EntryObject {
	/**
	 * An entry point with name.
	 */
	[k: string]: EntryItem | EntryDescription;
}
/**
 * An object with entry point description.
 */
export interface EntryDescription {
	/**
	 * The method of loading chunks (methods included by default are 'jsonp' (web), 'importScripts' (WebWorker), 'require' (sync node.js), 'async-node' (async node.js), but others might be added by plugins).
	 */
	chunkLoading?: ChunkLoading;
	/**
	 * The entrypoints that the current entrypoint depend on. They must be loaded when this entrypoint is loaded.
	 */
	dependOn?: [string, ...string[]] | string;
	/**
	 * Specifies the name of each output file on disk. You must **not** specify an absolute path here! The `output.path` option determines the location on disk the files are written to, filename is used solely for naming the individual files.
	 */
	filename?: Filename;
	/**
	 * Module(s) that are loaded upon startup.
	 */
	import: EntryItem;
	/**
	 * Options for library.
	 */
	library?: LibraryOptions;
	/**
	 * The name of the runtime chunk. If set a runtime chunk with this name is created or an existing entrypoint is used as runtime.
	 */
	runtime?: EntryRuntime;
	/**
	 * The method of loading WebAssembly Modules (methods included by default are 'fetch' (web/WebWorker), 'async-node' (node.js), but others might be added by plugins).
	 */
	wasmLoading?: WasmLoading;
}
/**
 * Options for library.
 */
export interface LibraryOptions {
	/**
	 * Add a comment in the UMD wrapper.
	 */
	auxiliaryComment?: AuxiliaryComment;
	/**
	 * Specify which export should be exposed as library.
	 */
	export?: LibraryExport;
	/**
	 * The name of the library (some types allow unnamed libraries too).
	 */
	name?: LibraryName;
	/**
	 * Type of library (types included by default are 'var', 'module', 'assign', 'this', 'window', 'self', 'global', 'commonjs', 'commonjs2', 'commonjs-module', 'amd', 'amd-require', 'umd', 'umd2', 'jsonp', 'system', but others might be added by plugins).
	 */
	type: LibraryType;
	/**
	 * If `output.libraryTarget` is set to umd and `output.library` is set, setting this to true will name the AMD module.
	 */
	umdNamedDefine?: UmdNamedDefine;
}
/**
 * Set explicit comments for `commonjs`, `commonjs2`, `amd`, and `root`.
 */
export interface LibraryCustomUmdCommentObject {
	/**
	 * Set comment for `amd` section in UMD.
	 */
	amd?: string;
	/**
	 * Set comment for `commonjs` (exports) section in UMD.
	 */
	commonjs?: string;
	/**
	 * Set comment for `commonjs2` (module.exports) section in UMD.
	 */
	commonjs2?: string;
	/**
	 * Set comment for `root` (global variable) section in UMD.
	 */
	root?: string;
}
/**
 * Description object for all UMD variants of the library name.
 */
export interface LibraryCustomUmdObject {
	/**
	 * Name of the exposed AMD library in the UMD.
	 */
	amd?: string;
	/**
	 * Name of the exposed commonjs export in the UMD.
	 */
	commonjs?: string;
	/**
	 * Name of the property exposed globally by a UMD library.
	 */
	root?: string[] | string;
}
/**
 * Enables/Disables experiments (experimental features with relax SemVer compatibility).
 */
export interface Experiments {
	/**
	 * Allow module type 'asset' to generate assets.
	 */
	asset?: boolean;
	/**
	 * Support WebAssembly as asynchronous EcmaScript Module.
	 */
	asyncWebAssembly?: boolean;
	/**
	 * Allow output javascript files as module source type.
	 */
	outputModule?: boolean;
	/**
	 * Support WebAssembly as synchronous EcmaScript Module (outdated).
	 */
	syncWebAssembly?: boolean;
	/**
	 * Allow using top-level-await in EcmaScript Modules.
	 */
	topLevelAwait?: boolean;
}
/**
 * Enable presets of externals for specific targets.
 */
export interface ExternalsPresets {
	/**
	 * Treat common electron built-in modules in main and preload context like 'electron', 'ipc' or 'shell' as external and load them via require() when used.
	 */
	electron?: boolean;
	/**
	 * Treat electron built-in modules in the main context like 'app', 'ipc-main' or 'shell' as external and load them via require() when used.
	 */
	electronMain?: boolean;
	/**
	 * Treat electron built-in modules in the preload context like 'web-frame', 'ipc-renderer' or 'shell' as external and load them via require() when used.
	 */
	electronPreload?: boolean;
	/**
	 * Treat electron built-in modules in the renderer context like 'web-frame', 'ipc-renderer' or 'shell' as external and load them via require() when used.
	 */
	electronRenderer?: boolean;
	/**
	 * Treat node.js built-in modules like fs, path or vm as external and load them via require() when used.
	 */
	node?: boolean;
	/**
	 * Treat NW.js legacy nw.gui module as external and load it via require() when used.
	 */
	nwjs?: boolean;
	/**
	 * Treat references to 'http(s)://...' and 'std:...' as external and load them via import when used (Note that this changes execution order as externals are executed before any other code in the chunk).
	 */
	web?: boolean;
	/**
	 * Treat references to 'http(s)://...' and 'std:...' as external and load them via async import() when used (Note that this external type is an async module, which has various effects on the execution).
	 */
	webAsync?: boolean;
}
/**
 * Options for infrastructure level logging.
 */
export interface InfrastructureLogging {
	/**
	 * Enable debug logging for specific loggers.
	 */
	debug?: boolean | FilterTypes;
	/**
	 * Log level.
	 */
	level?: "none" | "error" | "warn" | "info" | "log" | "verbose";
}
/**
 * Custom values available in the loader context.
 */
export interface Loader {
	[k: string]: any;
}
/**
 * Options affecting the normal modules (`NormalModuleFactory`).
 */
export interface ModuleOptions {
	/**
	 * An array of rules applied by default for modules.
	 */
	defaultRules?: RuleSetRules;
	/**
	 * Enable warnings for full dynamic dependencies.
	 */
	exprContextCritical?: boolean;
	/**
	 * Enable recursive directory lookup for full dynamic dependencies.
	 */
	exprContextRecursive?: boolean;
	/**
	 * Sets the default regular expression for full dynamic dependencies.
	 */
	exprContextRegExp?: RegExp | boolean;
	/**
	 * Set the default request for full dynamic dependencies.
	 */
	exprContextRequest?: string;
	/**
	 * Don't parse files matching. It's matched against the full resolved request.
	 */
	noParse?:
		| [RegExp | string | Function, ...(RegExp | string | Function)[]]
		| RegExp
		| string
		| Function;
	/**
	 * An array of rules applied for modules.
	 */
	rules?: RuleSetRules;
	/**
	 * Emit errors instead of warnings when imported names don't exist in imported module.
	 */
	strictExportPresence?: boolean;
	/**
	 * Handle the this context correctly according to the spec for namespace objects.
	 */
	strictThisContextOnImports?: boolean;
	/**
	 * Enable warnings when using the require function in a not statically analyse-able way.
	 */
	unknownContextCritical?: boolean;
	/**
	 * Enable recursive directory lookup when using the require function in a not statically analyse-able way.
	 */
	unknownContextRecursive?: boolean;
	/**
	 * Sets the regular expression when using the require function in a not statically analyse-able way.
	 */
	unknownContextRegExp?: RegExp | boolean;
	/**
	 * Sets the request when using the require function in a not statically analyse-able way.
	 */
	unknownContextRequest?: string;
	/**
	 * Cache the resolving of module requests.
	 */
	unsafeCache?: boolean | Function;
	/**
	 * Enable warnings for partial dynamic dependencies.
	 */
	wrappedContextCritical?: boolean;
	/**
	 * Enable recursive directory lookup for partial dynamic dependencies.
	 */
	wrappedContextRecursive?: boolean;
	/**
	 * Set the inner regular expression for partial dynamic dependencies.
	 */
	wrappedContextRegExp?: RegExp;
}
/**
 * A rule description with conditions and effects for modules.
 */
export interface RuleSetRule {
	/**
	 * Match the child compiler name.
	 */
	compiler?: RuleSetConditionOrConditions;
	/**
	 * Match dependency type.
	 */
	dependency?: RuleSetConditionOrConditions;
	/**
	 * Match values of properties in the description file (usually package.json).
	 */
	descriptionData?: {
		[k: string]: RuleSetConditionOrConditions;
	};
	/**
	 * Enforce this rule as pre or post step.
	 */
	enforce?: "pre" | "post";
	/**
	 * Shortcut for resource.exclude.
	 */
	exclude?: RuleSetConditionOrConditionsAbsolute;
	/**
	 * The options for the module generator.
	 */
	generator?: {
		[k: string]: any;
	};
	/**
	 * Shortcut for resource.include.
	 */
	include?: RuleSetConditionOrConditionsAbsolute;
	/**
	 * Match the issuer of the module (The module pointing to this module).
	 */
	issuer?: RuleSetConditionOrConditionsAbsolute;
	/**
	 * Shortcut for use.loader.
	 */
	loader?: RuleSetLoader;
	/**
	 * Match module mimetype when load from Data URI.
	 */
	mimetype?: RuleSetConditionOrConditions;
	/**
	 * Only execute the first matching rule in this array.
	 */
	oneOf?: RuleSetRule[];
	/**
	 * Shortcut for use.options.
	 */
	options?: RuleSetLoaderOptions;
	/**
	 * Options for parsing.
	 */
	parser?: {
		[k: string]: any;
	};
	/**
	 * Match the real resource path of the module.
	 */
	realResource?: RuleSetConditionOrConditionsAbsolute;
	/**
	 * Options for the resolver.
	 */
	resolve?: ResolveOptions;
	/**
	 * Match the resource path of the module.
	 */
	resource?: RuleSetConditionOrConditionsAbsolute;
	/**
	 * Match the resource fragment of the module.
	 */
	resourceFragment?: RuleSetConditionOrConditions;
	/**
	 * Match the resource query of the module.
	 */
	resourceQuery?: RuleSetConditionOrConditions;
	/**
	 * Match and execute these rules when this rule is matched.
	 */
	rules?: RuleSetRule[];
	/**
	 * Flags a module as with or without side effects.
	 */
	sideEffects?: boolean;
	/**
	 * Shortcut for resource.test.
	 */
	test?: RuleSetConditionOrConditionsAbsolute;
	/**
	 * Module type to use for the module.
	 */
	type?: string;
	/**
	 * Modifiers applied to the module when rule is matched.
	 */
	use?: RuleSetUse;
}
/**
 * Options object for resolving requests.
 */
export interface ResolveOptions {
	/**
	 * Redirect module requests.
	 */
	alias?: ResolveAlias;
	/**
	 * Fields in the description file (usually package.json) which are used to redirect requests inside the module.
	 */
	aliasFields?: (string[] | string)[];
	/**
	 * Extra resolve options per dependency category. Typical categories are "commonjs", "amd", "esm".
	 */
	byDependency?: {
		/**
		 * Options object for resolving requests.
		 */
		[k: string]: ResolveOptions;
	};
	/**
	 * Enable caching of successfully resolved requests (cache entries are revalidated).
	 */
	cache?: boolean;
	/**
	 * Predicate function to decide which requests should be cached.
	 */
	cachePredicate?: (
		request: import("enhanced-resolve").ResolveRequest
	) => boolean;
	/**
	 * Include the context information in the cache identifier when caching.
	 */
	cacheWithContext?: boolean;
	/**
	 * Condition names for exports field entry point.
	 */
	conditionNames?: string[];
	/**
	 * Filenames used to find a description file (like a package.json).
	 */
	descriptionFiles?: string[];
	/**
	 * Enforce the resolver to use one of the extensions from the extensions option (User must specify requests without extension).
	 */
	enforceExtension?: boolean;
	/**
	 * Field names from the description file (usually package.json) which are used to provide entry points of a package.
	 */
	exportsFields?: string[];
	/**
	 * Extensions added to the request when trying to find the file.
	 */
	extensions?: string[];
	/**
	 * Redirect module requests when normal resolving fails.
	 */
	fallback?: ResolveAlias;
	/**
	 * Filesystem for the resolver.
	 */
	fileSystem?: import("../lib/util/fs").InputFileSystem;
	/**
	 * Treats the request specified by the user as fully specified, meaning no extensions are added and the mainFiles in directories are not resolved (This doesn't affect requests from mainFields, aliasFields or aliases).
	 */
	fullySpecified?: boolean;
	/**
	 * Field names from the description file (usually package.json) which are used to provide internal request of a package (requests starting with # are considered as internal).
	 */
	importsFields?: string[];
	/**
	 * Field names from the description file (package.json) which are used to find the default entry point.
	 */
	mainFields?: (string[] | string)[];
	/**
	 * Filenames used to find the default entry point if there is no description file or main field.
	 */
	mainFiles?: string[];
	/**
	 * Folder names or directory paths where to find modules.
	 */
	modules?: string[];
	/**
	 * Plugins for the resolver.
	 */
	plugins?: ("..." | ResolvePluginInstance)[];
	/**
	 * Prefer to resolve module requests as relative request and fallback to resolving as module.
	 */
	preferRelative?: boolean;
	/**
	 * Custom resolver.
	 */
	resolver?: import("enhanced-resolve").Resolver;
	/**
	 * A list of resolve restrictions. Resolve results must fulfill all of these restrictions to resolve successfully. Other resolve paths are taken when restrictions are not met.
	 */
	restrictions?: (RegExp | string)[];
	/**
	 * A list of directories in which requests that are server-relative URLs (starting with '/') are resolved. On non-windows system these requests are tried to resolve as absolute path first.
	 */
	roots?: string[];
	/**
	 * Enable resolving symlinks to the original location.
	 */
	symlinks?: boolean;
	/**
	 * Enable caching of successfully resolved requests (cache entries are not revalidated).
	 */
	unsafeCache?:
		| boolean
		| {
				[k: string]: any;
		  };
	/**
	 * Use synchronous filesystem calls for the resolver.
	 */
	useSyncFileSystemCalls?: boolean;
}
/**
 * Plugin instance.
 */
export interface ResolvePluginInstance {
	/**
	 * The run point of the plugin, required method.
	 */
	apply: (resolver: import("enhanced-resolve/lib/Resolver")) => void;
	[k: string]: any;
}
/**
 * Options object for node compatibility features.
 */
export interface NodeOptions {
	/**
	 * Include a polyfill for the '__dirname' variable.
	 */
	__dirname?: false | true | "mock" | "eval-only";
	/**
	 * Include a polyfill for the '__filename' variable.
	 */
	__filename?: false | true | "mock" | "eval-only";
	/**
	 * Include a polyfill for the 'global' variable.
	 */
	global?: boolean;
}
/**
 * Enables/Disables integrated optimizations.
 */
export interface Optimization {
	/**
	 * Check for incompatible wasm types when importing/exporting from/to ESM.
	 */
	checkWasmTypes?: boolean;
	/**
	 * Define the algorithm to choose chunk ids (named: readable ids for better debugging, deterministic: numeric hash ids for better long term caching, size: numeric ids focused on minimal initial download size, total-size: numeric ids focused on minimal total download size, false: no algorithm used, as custom one can be provided via plugin).
	 */
	chunkIds?:
		| "natural"
		| "named"
		| "deterministic"
		| "size"
		| "total-size"
		| false;
	/**
	 * Concatenate modules when possible to generate less modules, more efficient code and enable more optimizations by the minimizer.
	 */
	concatenateModules?: boolean;
	/**
	 * Emit assets even when errors occur. Critical errors are emitted into the generated code and will cause errors at runtime.
	 */
	emitOnErrors?: boolean;
	/**
	 * Also flag chunks as loaded which contain a subset of the modules.
	 */
	flagIncludedChunks?: boolean;
	/**
	 * Creates a module-internal dependency graph for top level symbols, exports and imports, to improve unused exports detection.
	 */
	innerGraph?: boolean;
	/**
	 * Rename exports when possible to generate shorter code (depends on optimization.usedExports and optimization.providedExports, true/"deterministic": generate short deterministic names optimized for caching, "size": generate the shortest possible names).
	 */
	mangleExports?: ("size" | "deterministic") | boolean;
	/**
	 * Reduce size of WASM by changing imports to shorter strings.
	 */
	mangleWasmImports?: boolean;
	/**
	 * Merge chunks which contain the same modules.
	 */
	mergeDuplicateChunks?: boolean;
	/**
	 * Enable minimizing the output. Uses optimization.minimizer.
	 */
	minimize?: boolean;
	/**
	 * Minimizer(s) to use for minimizing the output.
	 */
	minimizer?: ("..." | WebpackPluginInstance | WebpackPluginFunction)[];
	/**
	 * Define the algorithm to choose module ids (natural: numeric ids in order of usage, named: readable ids for better debugging, hashed: (deprecated) short hashes as ids for better long term caching, deterministic: numeric hash ids for better long term caching, size: numeric ids focused on minimal initial download size, false: no algorithm used, as custom one can be provided via plugin).
	 */
	moduleIds?: "natural" | "named" | "hashed" | "deterministic" | "size" | false;
	/**
	 * Avoid emitting assets when errors occur (deprecated: use 'emitOnErrors' instead).
	 */
	noEmitOnErrors?: boolean;
	/**
	 * Set process.env.NODE_ENV to a specific value.
	 */
	nodeEnv?: false | string;
	/**
	 * Generate records with relative paths to be able to move the context folder.
	 */
	portableRecords?: boolean;
	/**
	 * Figure out which exports are provided by modules to generate more efficient code.
	 */
	providedExports?: boolean;
	/**
	 * Use real [contenthash] based on final content of the assets.
	 */
	realContentHash?: boolean;
	/**
	 * Removes modules from chunks when these modules are already included in all parents.
	 */
	removeAvailableModules?: boolean;
	/**
	 * Remove chunks which are empty.
	 */
	removeEmptyChunks?: boolean;
	/**
	 * Create an additional chunk which contains only the webpack runtime and chunk hash maps.
	 */
	runtimeChunk?: OptimizationRuntimeChunk;
	/**
	 * Skip over modules which contain no side effects when exports are not used (false: disabled, 'flag': only use manually placed side effects flag, true: also analyse source code for side effects).
	 */
	sideEffects?: "flag" | boolean;
	/**
	 * Optimize duplication and caching by splitting chunks by shared modules and cache group.
	 */
	splitChunks?: false | OptimizationSplitChunksOptions;
	/**
	 * Figure out which exports are used by modules to mangle export names, omit unused exports and generate more efficient code (true: analyse used exports for each runtime, "global": analyse exports globally for all runtimes combined).
	 */
	usedExports?: "global" | boolean;
}
/**
 * Plugin instance.
 */
export interface WebpackPluginInstance {
	/**
	 * The run point of the plugin, required method.
	 */
	apply: (compiler: import("../lib/Compiler")) => void;
	[k: string]: any;
}
/**
 * Options object for splitting chunks into smaller chunks.
 */
export interface OptimizationSplitChunksOptions {
	/**
	 * Sets the name delimiter for created chunks.
	 */
	automaticNameDelimiter?: string;
	/**
	 * Assign modules to a cache group (modules from different cache groups are tried to keep in separate chunks, default categories: 'default', 'defaultVendors').
	 */
	cacheGroups?: {
		/**
		 * Configuration for a cache group.
		 */
		[k: string]:
			| false
			| RegExp
			| string
			| Function
			| OptimizationSplitChunksCacheGroup;
	};
	/**
	 * Select chunks for determining shared modules (defaults to "async", "initial" and "all" requires adding these chunks to the HTML).
	 */
	chunks?:
		| ("initial" | "async" | "all")
		| ((chunk: import("../lib/Chunk")) => boolean);
	/**
	 * Sets the size types which are used when a number is used for sizes.
	 */
	defaultSizeTypes?: string[];
	/**
	 * Size threshold at which splitting is enforced and other restrictions (minRemainingSize, maxAsyncRequests, maxInitialRequests) are ignored.
	 */
	enforceSizeThreshold?: OptimizationSplitChunksSizes;
	/**
	 * Options for modules not selected by any other cache group.
	 */
	fallbackCacheGroup?: {
		/**
		 * Sets the name delimiter for created chunks.
		 */
		automaticNameDelimiter?: string;
		/**
		 * Maximal size hint for the on-demand chunks.
		 */
		maxAsyncSize?: OptimizationSplitChunksSizes;
		/**
		 * Maximal size hint for the initial chunks.
		 */
		maxInitialSize?: OptimizationSplitChunksSizes;
		/**
		 * Maximal size hint for the created chunks.
		 */
		maxSize?: OptimizationSplitChunksSizes;
		/**
		 * Minimal size for the created chunk.
		 */
		minSize?: OptimizationSplitChunksSizes;
	};
	/**
	 * Sets the template for the filename for created chunks.
	 */
	filename?:
		| string
		| ((
				pathData: import("../lib/Compilation").PathData,
				assetInfo?: import("../lib/Compilation").AssetInfo
		  ) => string);
	/**
	 * Prevents exposing path info when creating names for parts splitted by maxSize.
	 */
	hidePathInfo?: boolean;
	/**
	 * Maximum number of requests which are accepted for on-demand loading.
	 */
	maxAsyncRequests?: number;
	/**
	 * Maximal size hint for the on-demand chunks.
	 */
	maxAsyncSize?: OptimizationSplitChunksSizes;
	/**
	 * Maximum number of initial chunks which are accepted for an entry point.
	 */
	maxInitialRequests?: number;
	/**
	 * Maximal size hint for the initial chunks.
	 */
	maxInitialSize?: OptimizationSplitChunksSizes;
	/**
	 * Maximal size hint for the created chunks.
	 */
	maxSize?: OptimizationSplitChunksSizes;
	/**
	 * Minimum number of times a module has to be duplicated until it's considered for splitting.
	 */
	minChunks?: number;
	/**
	 * Minimal size for the chunks the stay after moving the modules to a new chunk.
	 */
	minRemainingSize?: OptimizationSplitChunksSizes;
	/**
	 * Minimal size for the created chunks.
	 */
	minSize?: OptimizationSplitChunksSizes;
	/**
	 * Give chunks created a name (chunks with equal name are merged).
	 */
	name?: false | string | Function;
	/**
	 * Compare used exports when checking common modules. Modules will only be put in the same chunk when exports are equal.
	 */
	usedExports?: boolean;
}
/**
 * Options object for describing behavior of a cache group selecting modules that should be cached together.
 */
export interface OptimizationSplitChunksCacheGroup {
	/**
	 * Sets the name delimiter for created chunks.
	 */
	automaticNameDelimiter?: string;
	/**
	 * Select chunks for determining cache group content (defaults to "initial", "initial" and "all" requires adding these chunks to the HTML).
	 */
	chunks?:
		| ("initial" | "async" | "all")
		| ((chunk: import("../lib/Chunk")) => boolean);
	/**
	 * Ignore minimum size, minimum chunks and maximum requests and always create chunks for this cache group.
	 */
	enforce?: boolean;
	/**
	 * Size threshold at which splitting is enforced and other restrictions (minRemainingSize, maxAsyncRequests, maxInitialRequests) are ignored.
	 */
	enforceSizeThreshold?: OptimizationSplitChunksSizes;
	/**
	 * Sets the template for the filename for created chunks.
	 */
	filename?:
		| string
		| ((
				pathData: import("../lib/Compilation").PathData,
				assetInfo?: import("../lib/Compilation").AssetInfo
		  ) => string);
	/**
	 * Sets the hint for chunk id.
	 */
	idHint?: string;
	/**
	 * Maximum number of requests which are accepted for on-demand loading.
	 */
	maxAsyncRequests?: number;
	/**
	 * Maximal size hint for the on-demand chunks.
	 */
	maxAsyncSize?: OptimizationSplitChunksSizes;
	/**
	 * Maximum number of initial chunks which are accepted for an entry point.
	 */
	maxInitialRequests?: number;
	/**
	 * Maximal size hint for the initial chunks.
	 */
	maxInitialSize?: OptimizationSplitChunksSizes;
	/**
	 * Maximal size hint for the created chunks.
	 */
	maxSize?: OptimizationSplitChunksSizes;
	/**
	 * Minimum number of times a module has to be duplicated until it's considered for splitting.
	 */
	minChunks?: number;
	/**
	 * Minimal size for the chunks the stay after moving the modules to a new chunk.
	 */
	minRemainingSize?: OptimizationSplitChunksSizes;
	/**
	 * Minimal size for the created chunk.
	 */
	minSize?: OptimizationSplitChunksSizes;
	/**
	 * Give chunks for this cache group a name (chunks with equal name are merged).
	 */
	name?: false | string | Function;
	/**
	 * Priority of this cache group.
	 */
	priority?: number;
	/**
	 * Try to reuse existing chunk (with name) when it has matching modules.
	 */
	reuseExistingChunk?: boolean;
	/**
	 * Assign modules to a cache group by module name.
	 */
	test?: RegExp | string | Function;
	/**
	 * Assign modules to a cache group by module type.
	 */
	type?: RegExp | string | Function;
	/**
	 * Compare used exports when checking common modules. Modules will only be put in the same chunk when exports are equal.
	 */
	usedExports?: boolean;
}
/**
 * Options affecting the output of the compilation. `output` options tell webpack how to write the compiled files to disk.
 */
export interface Output {
	/**
	 * The filename of asset modules as relative path inside the `output.path` directory.
	 */
	assetModuleFilename?: AssetModuleFilename;
	/**
	 * Add a comment in the UMD wrapper.
	 */
	auxiliaryComment?: AuxiliaryComment;
	/**
	 * Add charset attribute for script tag.
	 */
	charset?: Charset;
	/**
	 * The filename of non-initial chunks as relative path inside the `output.path` directory.
	 */
	chunkFilename?: ChunkFilename;
	/**
	 * The format of chunks (formats included by default are 'array-push' (web/WebWorker), 'commonjs' (node.js), but others might be added by plugins).
	 */
	chunkFormat?: ChunkFormat;
	/**
	 * Number of milliseconds before chunk request expires.
	 */
	chunkLoadTimeout?: ChunkLoadTimeout;
	/**
	 * The method of loading chunks (methods included by default are 'jsonp' (web), 'importScripts' (WebWorker), 'require' (sync node.js), 'async-node' (async node.js), but others might be added by plugins).
	 */
	chunkLoading?: ChunkLoading;
	/**
	 * The global variable used by webpack for loading of chunks.
	 */
	chunkLoadingGlobal?: ChunkLoadingGlobal;
	/**
	 * Check if to be emitted file already exists and have the same content before writing to output filesystem.
	 */
	compareBeforeEmit?: CompareBeforeEmit;
	/**
	 * This option enables cross-origin loading of chunks.
	 */
	crossOriginLoading?: CrossOriginLoading;
	/**
	 * Similar to `output.devtoolModuleFilenameTemplate`, but used in the case of duplicate module identifiers.
	 */
	devtoolFallbackModuleFilenameTemplate?: DevtoolFallbackModuleFilenameTemplate;
	/**
	 * Filename template string of function for the sources array in a generated SourceMap.
	 */
	devtoolModuleFilenameTemplate?: DevtoolModuleFilenameTemplate;
	/**
	 * Module namespace to use when interpolating filename template string for the sources array in a generated SourceMap. Defaults to `output.library` if not set. It's useful for avoiding runtime collisions in sourcemaps from multiple webpack projects built as libraries.
	 */
	devtoolNamespace?: DevtoolNamespace;
	/**
	 * List of chunk loading types enabled for use by entry points.
	 */
	enabledChunkLoadingTypes?: EnabledChunkLoadingTypes;
	/**
	 * List of library types enabled for use by entry points.
	 */
	enabledLibraryTypes?: EnabledLibraryTypes;
	/**
	 * List of wasm loading types enabled for use by entry points.
	 */
	enabledWasmLoadingTypes?: EnabledWasmLoadingTypes;
	/**
	 * The abilities of the environment where the webpack generated code should run.
	 */
	environment?: Environment;
	/**
	 * Specifies the name of each output file on disk. You must **not** specify an absolute path here! The `output.path` option determines the location on disk the files are written to, filename is used solely for naming the individual files.
	 */
	filename?: Filename;
	/**
	 * An expression which is used to address the global object/scope in runtime code.
	 */
	globalObject?: GlobalObject;
	/**
	 * Digest type used for the hash.
	 */
	hashDigest?: HashDigest;
	/**
	 * Number of chars which are used for the hash.
	 */
	hashDigestLength?: HashDigestLength;
	/**
	 * Algorithm used for generation the hash (see node.js crypto package).
	 */
	hashFunction?: HashFunction;
	/**
	 * Any string which is added to the hash to salt it.
	 */
	hashSalt?: HashSalt;
	/**
	 * The filename of the Hot Update Chunks. They are inside the output.path directory.
	 */
	hotUpdateChunkFilename?: HotUpdateChunkFilename;
	/**
	 * The global variable used by webpack for loading of hot update chunks.
	 */
	hotUpdateGlobal?: HotUpdateGlobal;
	/**
	 * The filename of the Hot Update Main File. It is inside the `output.path` directory.
	 */
	hotUpdateMainFilename?: HotUpdateMainFilename;
	/**
	 * Wrap javascript code into IIFE's to avoid leaking into global scope.
	 */
	iife?: Iife;
	/**
	 * The name of the native import() function (can be exchanged for a polyfill).
	 */
	importFunctionName?: ImportFunctionName;
	/**
	 * The name of the native import.meta object (can be exchanged for a polyfill).
	 */
	importMetaName?: ImportMetaName;
	/**
	 * Make the output files a library, exporting the exports of the entry point.
	 */
	library?: Library;
	/**
	 * Specify which export should be exposed as library.
	 */
	libraryExport?: LibraryExport;
	/**
	 * Type of library (types included by default are 'var', 'module', 'assign', 'this', 'window', 'self', 'global', 'commonjs', 'commonjs2', 'commonjs-module', 'amd', 'amd-require', 'umd', 'umd2', 'jsonp', 'system', but others might be added by plugins).
	 */
	libraryTarget?: LibraryType;
	/**
	 * Output javascript files as module source type.
	 */
	module?: OutputModule;
	/**
	 * The output directory as **absolute path** (required).
	 */
	path?: Path;
	/**
	 * Include comments with information about the modules.
	 */
	pathinfo?: Pathinfo;
	/**
	 * The `publicPath` specifies the public URL address of the output files when referenced in a browser.
	 */
	publicPath?: PublicPath;
	/**
	 * This option enables loading async chunks via a custom script type, such as script type="module".
	 */
	scriptType?: ScriptType;
	/**
	 * The filename of the SourceMaps for the JavaScript files. They are inside the `output.path` directory.
	 */
	sourceMapFilename?: SourceMapFilename;
	/**
	 * Prefixes every line of the source in the bundle with this string.
	 */
	sourcePrefix?: SourcePrefix;
	/**
	 * Handles exceptions in module loading correctly at a performance cost.
	 */
	strictModuleExceptionHandling?: StrictModuleExceptionHandling;
	/**
	 * If `output.libraryTarget` is set to umd and `output.library` is set, setting this to true will name the AMD module.
	 */
	umdNamedDefine?: UmdNamedDefine;
	/**
	 * A unique name of the webpack build to avoid multiple webpack runtimes to conflict when using globals.
	 */
	uniqueName?: UniqueName;
	/**
	 * The method of loading WebAssembly Modules (methods included by default are 'fetch' (web/WebWorker), 'async-node' (node.js), but others might be added by plugins).
	 */
	wasmLoading?: WasmLoading;
	/**
	 * The filename of WebAssembly modules as relative path inside the `output.path` directory.
	 */
	webassemblyModuleFilename?: WebassemblyModuleFilename;
	/**
	 * The method of loading chunks (methods included by default are 'jsonp' (web), 'importScripts' (WebWorker), 'require' (sync node.js), 'async-node' (async node.js), but others might be added by plugins).
	 */
	workerChunkLoading?: ChunkLoading;
	/**
	 * The method of loading WebAssembly Modules (methods included by default are 'fetch' (web/WebWorker), 'async-node' (node.js), but others might be added by plugins).
	 */
	workerWasmLoading?: WasmLoading;
}
/**
 * The abilities of the environment where the webpack generated code should run.
 */
export interface Environment {
	/**
	 * The environment supports arrow functions ('() => { ... }').
	 */
	arrowFunction?: boolean;
	/**
	 * The environment supports BigInt as literal (123n).
	 */
	bigIntLiteral?: boolean;
	/**
	 * The environment supports const and let for variable declarations.
	 */
	const?: boolean;
	/**
	 * The environment supports destructuring ('{ a, b } = obj').
	 */
	destructuring?: boolean;
	/**
	 * The environment supports an async import() function to import EcmaScript modules.
	 */
	dynamicImport?: boolean;
	/**
	 * The environment supports 'for of' iteration ('for (const x of array) { ... }').
	 */
	forOf?: boolean;
	/**
	 * The environment supports EcmaScript Module syntax to import EcmaScript modules (import ... from '...').
	 */
	module?: boolean;
}
/**
 * Configuration object for web performance recommendations.
 */
export interface PerformanceOptions {
	/**
	 * Filter function to select assets that are checked.
	 */
	assetFilter?: Function;
	/**
	 * Sets the format of the hints: warnings, errors or nothing at all.
	 */
	hints?: false | "warning" | "error";
	/**
	 * File size limit (in bytes) when exceeded, that webpack will provide performance hints.
	 */
	maxAssetSize?: number;
	/**
	 * Total size of an entry point (in bytes).
	 */
	maxEntrypointSize?: number;
}
/**
 * Options affecting how file system snapshots are created and validated.
 */
export interface SnapshotOptions {
	/**
	 * Options for snapshotting build dependencies to determine if the whole cache need to be invalidated.
	 */
	buildDependencies?: {
		/**
		 * Use hashes of the content of the files/directories to determine invalidation.
		 */
		hash?: boolean;
		/**
		 * Use timestamps of the files/directories to determine invalidation.
		 */
		timestamp?: boolean;
	};
	/**
	 * List of paths that are managed by a package manager and contain a version or hash in its path so all files are immutable.
	 */
	immutablePaths?: string[];
	/**
	 * List of paths that are managed by a package manager and can be trusted to not be modified otherwise.
	 */
	managedPaths?: string[];
	/**
	 * Options for snapshotting dependencies of modules to determine if they need to be built again.
	 */
	module?: {
		/**
		 * Use hashes of the content of the files/directories to determine invalidation.
		 */
		hash?: boolean;
		/**
		 * Use timestamps of the files/directories to determine invalidation.
		 */
		timestamp?: boolean;
	};
	/**
	 * Options for snapshotting dependencies of request resolving to determine if requests need to be re-resolved.
	 */
	resolve?: {
		/**
		 * Use hashes of the content of the files/directories to determine invalidation.
		 */
		hash?: boolean;
		/**
		 * Use timestamps of the files/directories to determine invalidation.
		 */
		timestamp?: boolean;
	};
	/**
	 * Options for snapshotting the resolving of build dependencies to determine if the build dependencies need to be re-resolved.
	 */
	resolveBuildDependencies?: {
		/**
		 * Use hashes of the content of the files/directories to determine invalidation.
		 */
		hash?: boolean;
		/**
		 * Use timestamps of the files/directories to determine invalidation.
		 */
		timestamp?: boolean;
	};
}
/**
 * Stats options object.
 */
export interface StatsOptions {
	/**
	 * Fallback value for stats options when an option is not defined (has precedence over local webpack defaults).
	 */
	all?: boolean;
	/**
	 * Add assets information.
	 */
	assets?: boolean;
	/**
	 * Sort the assets by that field.
	 */
	assetsSort?: string;
	/**
	 * Space to display assets (groups will be collapsed to fit this space).
	 */
	assetsSpace?: number;
	/**
	 * Add built at time information.
	 */
	builtAt?: boolean;
	/**
	 * Add information about cached (not built) modules.
	 */
	cached?: boolean;
	/**
	 * Show cached assets (setting this to `false` only shows emitted files).
	 */
	cachedAssets?: boolean;
	/**
	 * Add information about cached (not built) modules.
	 */
	cachedModules?: boolean;
	/**
	 * Add children information.
	 */
	children?: boolean;
	/**
	 * Display auxiliary assets in chunk groups.
	 */
	chunkGroupAuxiliary?: boolean;
	/**
	 * Display children of chunk groups.
	 */
	chunkGroupChildren?: boolean;
	/**
	 * Limit of assets displayed in chunk groups.
	 */
	chunkGroupMaxAssets?: number;
	/**
	 * Display all chunk groups with the corresponding bundles.
	 */
	chunkGroups?: boolean;
	/**
	 * Add built modules information to chunk information.
	 */
	chunkModules?: boolean;
	/**
	 * Add the origins of chunks and chunk merging info.
	 */
	chunkOrigins?: boolean;
	/**
	 * Add information about parent, children and sibling chunks to chunk information.
	 */
	chunkRelations?: boolean;
	/**
	 * Add chunk information.
	 */
	chunks?: boolean;
	/**
	 * Sort the chunks by that field.
	 */
	chunksSort?: string;
	/**
	 * Enables/Disables colorful output.
	 */
	colors?:
		| boolean
		| {
				/**
				 * Custom color for bold text.
				 */
				bold?: string;
				/**
				 * Custom color for cyan text.
				 */
				cyan?: string;
				/**
				 * Custom color for green text.
				 */
				green?: string;
				/**
				 * Custom color for magenta text.
				 */
				magenta?: string;
				/**
				 * Custom color for red text.
				 */
				red?: string;
				/**
				 * Custom color for yellow text.
				 */
				yellow?: string;
		  };
	/**
	 * Context directory for request shortening.
	 */
	context?: string;
	/**
	 * Show chunk modules that are dependencies of other modules of the chunk.
	 */
	dependentModules?: boolean;
	/**
	 * Add module depth in module graph.
	 */
	depth?: boolean;
	/**
	 * Display the entry points with the corresponding bundles.
	 */
	entrypoints?: "auto" | boolean;
	/**
	 * Add --env information.
	 */
	env?: boolean;
	/**
	 * Add details to errors (like resolving log).
	 */
	errorDetails?: boolean;
	/**
	 * Add internal stack trace to errors.
	 */
	errorStack?: boolean;
	/**
	 * Add errors.
	 */
	errors?: boolean;
	/**
	 * Add errors count.
	 */
	errorsCount?: boolean;
	/**
	 * Please use excludeModules instead.
	 */
	exclude?: boolean | FilterTypes;
	/**
	 * Suppress assets that match the specified filters. Filters can be Strings, RegExps or Functions.
	 */
	excludeAssets?: FilterTypes;
	/**
	 * Suppress modules that match the specified filters. Filters can be Strings, RegExps, Booleans or Functions.
	 */
	excludeModules?: boolean | FilterTypes;
	/**
	 * Group assets by how their are related to chunks.
	 */
	groupAssetsByChunk?: boolean;
	/**
	 * Group assets by their status (emitted, compared for emit or cached).
	 */
	groupAssetsByEmitStatus?: boolean;
	/**
	 * Group assets by their extension.
	 */
	groupAssetsByExtension?: boolean;
	/**
	 * Group assets by their asset info (immutable, development, hotModuleReplacement, etc).
	 */
	groupAssetsByInfo?: boolean;
	/**
	 * Group assets by their path.
	 */
	groupAssetsByPath?: boolean;
	/**
	 * Group modules by their attributes (errors, warnings, assets, optional, orphan, or dependent).
	 */
	groupModulesByAttributes?: boolean;
	/**
	 * Group modules by their status (cached or built and cacheable).
	 */
	groupModulesByCacheStatus?: boolean;
	/**
	 * Group modules by their extension.
	 */
	groupModulesByExtension?: boolean;
	/**
	 * Group modules by their path.
	 */
	groupModulesByPath?: boolean;
	/**
	 * Add the hash of the compilation.
	 */
	hash?: boolean;
	/**
	 * Add ids.
	 */
	ids?: boolean;
	/**
	 * Add logging output.
	 */
	logging?: ("none" | "error" | "warn" | "info" | "log" | "verbose") | boolean;
	/**
	 * Include debug logging of specified loggers (i. e. for plugins or loaders). Filters can be Strings, RegExps or Functions.
	 */
	loggingDebug?: boolean | FilterTypes;
	/**
	 * Add stack traces to logging output.
	 */
	loggingTrace?: boolean;
	/**
	 * Add information about assets inside modules.
	 */
	moduleAssets?: boolean;
	/**
	 * Add dependencies and origin of warnings/errors.
	 */
	moduleTrace?: boolean;
	/**
	 * Add built modules information.
	 */
	modules?: boolean;
	/**
	 * Sort the modules by that field.
	 */
	modulesSort?: string;
	/**
	 * Space to display modules (groups will be collapsed to fit this space, values is in number of modules/groups).
	 */
	modulesSpace?: number;
	/**
	 * Add information about modules nested in other modules (like with module concatenation).
	 */
	nestedModules?: boolean;
	/**
	 * Show reasons why optimization bailed out for modules.
	 */
	optimizationBailout?: boolean;
	/**
	 * Add information about orphan modules.
	 */
	orphanModules?: boolean;
	/**
	 * Add output path information.
	 */
	outputPath?: boolean;
	/**
	 * Add performance hint flags.
	 */
	performance?: boolean;
	/**
	 * Preset for the default values.
	 */
	preset?: boolean | string;
	/**
	 * Show exports provided by modules.
	 */
	providedExports?: boolean;
	/**
	 * Add public path information.
	 */
	publicPath?: boolean;
	/**
	 * Add information about the reasons why modules are included.
	 */
	reasons?: boolean;
	/**
	 * Add information about assets that are related to other assets (like SourceMaps for assets).
	 */
	relatedAssets?: boolean;
	/**
	 * Add information about runtime modules.
	 */
	runtimeModules?: boolean;
	/**
	 * Add the source code of modules.
	 */
	source?: boolean;
	/**
	 * Add timing information.
	 */
	timings?: boolean;
	/**
	 * Show exports used by modules.
	 */
	usedExports?: boolean;
	/**
	 * Add webpack version information.
	 */
	version?: boolean;
	/**
	 * Add warnings.
	 */
	warnings?: boolean;
	/**
	 * Add warnings count.
	 */
	warningsCount?: boolean;
	/**
	 * Suppress listing warnings that match the specified filters (they will still be counted). Filters can be Strings, RegExps or Functions.
	 */
	warningsFilter?: FilterTypes;
}
/**
 * Options for the watcher.
 */
export interface WatchOptions {
	/**
	 * Delay the rebuilt after the first change. Value is a time in ms.
	 */
	aggregateTimeout?: number;
	/**
	 * Resolve symlinks and watch symlink and real file. This is usually not needed as webpack already resolves symlinks ('resolve.symlinks').
	 */
	followSymlinks?: boolean;
	/**
	 * Ignore some files from watching (glob pattern or regexp).
	 */
	ignored?: string[] | RegExp | string;
	/**
	 * Enable polling mode for watching.
	 */
	poll?: number | boolean;
	/**
	 * Stop watching when stdin stream has ended.
	 */
	stdin?: boolean;
}
/**
 * An object with entry point description.
 */
export interface EntryDescriptionNormalized {
	/**
	 * The method of loading chunks (methods included by default are 'jsonp' (web), 'importScripts' (WebWorker), 'require' (sync node.js), 'async-node' (async node.js), but others might be added by plugins).
	 */
	chunkLoading?: ChunkLoading;
	/**
	 * The entrypoints that the current entrypoint depend on. They must be loaded when this entrypoint is loaded.
	 */
	dependOn?: [string, ...string[]];
	/**
	 * Specifies the name of each output file on disk. You must **not** specify an absolute path here! The `output.path` option determines the location on disk the files are written to, filename is used solely for naming the individual files.
	 */
	filename?: Filename;
	/**
	 * Module(s) that are loaded upon startup. The last one is exported.
	 */
	import?: [string, ...string[]];
	/**
	 * Options for library.
	 */
	library?: LibraryOptions;
	/**
	 * The name of the runtime chunk. If set a runtime chunk with this name is created or an existing entrypoint is used as runtime.
	 */
	runtime?: EntryRuntime;
	/**
	 * The method of loading WebAssembly Modules (methods included by default are 'fetch' (web/WebWorker), 'async-node' (node.js), but others might be added by plugins).
	 */
	wasmLoading?: WasmLoading;
}
/**
 * Multiple entry bundles are created. The key is the entry name. The value is an entry description object.
 */
export interface EntryStaticNormalized {
	/**
	 * An object with entry point description.
	 */
	[k: string]: EntryDescriptionNormalized;
}
/**
 * Normalized options affecting the output of the compilation. `output` options tell webpack how to write the compiled files to disk.
 */
export interface OutputNormalized {
	/**
	 * The filename of asset modules as relative path inside the `output.path` directory.
	 */
	assetModuleFilename?: AssetModuleFilename;
	/**
	 * Add charset attribute for script tag.
	 */
	charset?: Charset;
	/**
	 * The filename of non-initial chunks as relative path inside the `output.path` directory.
	 */
	chunkFilename?: ChunkFilename;
	/**
	 * The format of chunks (formats included by default are 'array-push' (web/WebWorker), 'commonjs' (node.js), but others might be added by plugins).
	 */
	chunkFormat?: ChunkFormat;
	/**
	 * Number of milliseconds before chunk request expires.
	 */
	chunkLoadTimeout?: ChunkLoadTimeout;
	/**
	 * The method of loading chunks (methods included by default are 'jsonp' (web), 'importScripts' (WebWorker), 'require' (sync node.js), 'async-node' (async node.js), but others might be added by plugins).
	 */
	chunkLoading?: ChunkLoading;
	/**
	 * The global variable used by webpack for loading of chunks.
	 */
	chunkLoadingGlobal?: ChunkLoadingGlobal;
	/**
	 * Check if to be emitted file already exists and have the same content before writing to output filesystem.
	 */
	compareBeforeEmit?: CompareBeforeEmit;
	/**
	 * This option enables cross-origin loading of chunks.
	 */
	crossOriginLoading?: CrossOriginLoading;
	/**
	 * Similar to `output.devtoolModuleFilenameTemplate`, but used in the case of duplicate module identifiers.
	 */
	devtoolFallbackModuleFilenameTemplate?: DevtoolFallbackModuleFilenameTemplate;
	/**
	 * Filename template string of function for the sources array in a generated SourceMap.
	 */
	devtoolModuleFilenameTemplate?: DevtoolModuleFilenameTemplate;
	/**
	 * Module namespace to use when interpolating filename template string for the sources array in a generated SourceMap. Defaults to `output.library` if not set. It's useful for avoiding runtime collisions in sourcemaps from multiple webpack projects built as libraries.
	 */
	devtoolNamespace?: DevtoolNamespace;
	/**
	 * List of chunk loading types enabled for use by entry points.
	 */
	enabledChunkLoadingTypes?: EnabledChunkLoadingTypes;
	/**
	 * List of library types enabled for use by entry points.
	 */
	enabledLibraryTypes?: EnabledLibraryTypes;
	/**
	 * List of wasm loading types enabled for use by entry points.
	 */
	enabledWasmLoadingTypes?: EnabledWasmLoadingTypes;
	/**
	 * The abilities of the environment where the webpack generated code should run.
	 */
	environment?: Environment;
	/**
	 * Specifies the name of each output file on disk. You must **not** specify an absolute path here! The `output.path` option determines the location on disk the files are written to, filename is used solely for naming the individual files.
	 */
	filename?: Filename;
	/**
	 * An expression which is used to address the global object/scope in runtime code.
	 */
	globalObject?: GlobalObject;
	/**
	 * Digest type used for the hash.
	 */
	hashDigest?: HashDigest;
	/**
	 * Number of chars which are used for the hash.
	 */
	hashDigestLength?: HashDigestLength;
	/**
	 * Algorithm used for generation the hash (see node.js crypto package).
	 */
	hashFunction?: HashFunction;
	/**
	 * Any string which is added to the hash to salt it.
	 */
	hashSalt?: HashSalt;
	/**
	 * The filename of the Hot Update Chunks. They are inside the output.path directory.
	 */
	hotUpdateChunkFilename?: HotUpdateChunkFilename;
	/**
	 * The global variable used by webpack for loading of hot update chunks.
	 */
	hotUpdateGlobal?: HotUpdateGlobal;
	/**
	 * The filename of the Hot Update Main File. It is inside the `output.path` directory.
	 */
	hotUpdateMainFilename?: HotUpdateMainFilename;
	/**
	 * Wrap javascript code into IIFE's to avoid leaking into global scope.
	 */
	iife?: Iife;
	/**
	 * The name of the native import() function (can be exchanged for a polyfill).
	 */
	importFunctionName?: ImportFunctionName;
	/**
	 * The name of the native import.meta object (can be exchanged for a polyfill).
	 */
	importMetaName?: ImportMetaName;
	/**
	 * Options for library.
	 */
	library?: LibraryOptions;
	/**
	 * Output javascript files as module source type.
	 */
	module?: OutputModule;
	/**
	 * The output directory as **absolute path** (required).
	 */
	path?: Path;
	/**
	 * Include comments with information about the modules.
	 */
	pathinfo?: Pathinfo;
	/**
	 * The `publicPath` specifies the public URL address of the output files when referenced in a browser.
	 */
	publicPath?: PublicPath;
	/**
	 * This option enables loading async chunks via a custom script type, such as script type="module".
	 */
	scriptType?: ScriptType;
	/**
	 * The filename of the SourceMaps for the JavaScript files. They are inside the `output.path` directory.
	 */
	sourceMapFilename?: SourceMapFilename;
	/**
	 * Prefixes every line of the source in the bundle with this string.
	 */
	sourcePrefix?: SourcePrefix;
	/**
	 * Handles exceptions in module loading correctly at a performance cost.
	 */
	strictModuleExceptionHandling?: StrictModuleExceptionHandling;
	/**
	 * A unique name of the webpack build to avoid multiple webpack runtimes to conflict when using globals.
	 */
	uniqueName?: UniqueName;
	/**
	 * The method of loading WebAssembly Modules (methods included by default are 'fetch' (web/WebWorker), 'async-node' (node.js), but others might be added by plugins).
	 */
	wasmLoading?: WasmLoading;
	/**
	 * The filename of WebAssembly modules as relative path inside the `output.path` directory.
	 */
	webassemblyModuleFilename?: WebassemblyModuleFilename;
	/**
	 * The method of loading chunks (methods included by default are 'jsonp' (web), 'importScripts' (WebWorker), 'require' (sync node.js), 'async-node' (async node.js), but others might be added by plugins).
	 */
	workerChunkLoading?: ChunkLoading;
	/**
	 * The method of loading WebAssembly Modules (methods included by default are 'fetch' (web/WebWorker), 'async-node' (node.js), but others might be added by plugins).
	 */
	workerWasmLoading?: WasmLoading;
}
/**
 * Normalized webpack options object.
 */
export interface WebpackOptionsNormalized {
	/**
	 * Set the value of `require.amd` and `define.amd`. Or disable AMD support.
	 */
	amd?: Amd;
	/**
	 * Report the first error as a hard error instead of tolerating it.
	 */
	bail?: Bail;
	/**
	 * Cache generated modules and chunks to improve performance for multiple incremental builds.
	 */
	cache: CacheOptionsNormalized;
	/**
	 * The base directory (absolute path!) for resolving the `entry` option. If `output.pathinfo` is set, the included pathinfo is shortened to this directory.
	 */
	context?: Context;
	/**
	 * References to other configurations to depend on.
	 */
	dependencies?: Dependencies;
	/**
	 * Options for the webpack-dev-server.
	 */
	devServer?: DevServer;
	/**
	 * A developer tool to enhance debugging (false | eval | [inline-|hidden-|eval-][nosources-][cheap-[module-]]source-map).
	 */
	devtool?: DevTool;
	/**
	 * The entry point(s) of the compilation.
	 */
	entry: EntryNormalized;
	/**
	 * Enables/Disables experiments (experimental features with relax SemVer compatibility).
	 */
	experiments: Experiments;
	/**
	 * Specify dependencies that shouldn't be resolved by webpack, but should become dependencies of the resulting bundle. The kind of the dependency depends on `output.libraryTarget`.
	 */
	externals: Externals;
	/**
	 * Enable presets of externals for specific targets.
	 */
	externalsPresets: ExternalsPresets;
	/**
	 * Specifies the default type of externals ('amd*', 'umd*', 'system' and 'jsonp' depend on output.libraryTarget set to the same value).
	 */
	externalsType?: ExternalsType;
	/**
	 * Ignore specific warnings.
	 */
	ignoreWarnings?: IgnoreWarningsNormalized;
	/**
	 * Options for infrastructure level logging.
	 */
	infrastructureLogging: InfrastructureLogging;
	/**
	 * Custom values available in the loader context.
	 */
	loader?: Loader;
	/**
	 * Enable production optimizations or development hints.
	 */
	mode?: Mode;
	/**
	 * Options affecting the normal modules (`NormalModuleFactory`).
	 */
	module: ModuleOptions;
	/**
	 * Name of the configuration. Used when loading multiple configurations.
	 */
	name?: Name;
	/**
	 * Include polyfills or mocks for various node stuff.
	 */
	node: Node;
	/**
	 * Enables/Disables integrated optimizations.
	 */
	optimization: Optimization;
	/**
	 * Normalized options affecting the output of the compilation. `output` options tell webpack how to write the compiled files to disk.
	 */
	output: OutputNormalized;
	/**
	 * The number of parallel processed modules in the compilation.
	 */
	parallelism?: Parallelism;
	/**
	 * Configuration for web performance recommendations.
	 */
	performance?: Performance;
	/**
	 * Add additional plugins to the compiler.
	 */
	plugins: Plugins;
	/**
	 * Capture timing information for each module.
	 */
	profile?: Profile;
	/**
	 * Store compiler state to a json file.
	 */
	recordsInputPath?: RecordsInputPath;
	/**
	 * Load compiler state from a json file.
	 */
	recordsOutputPath?: RecordsOutputPath;
	/**
	 * Options for the resolver.
	 */
	resolve: Resolve;
	/**
	 * Options for the resolver when resolving loaders.
	 */
	resolveLoader: ResolveLoader;
	/**
	 * Options affecting how file system snapshots are created and validated.
	 */
	snapshot: SnapshotOptions;
	/**
	 * Stats options object or preset name.
	 */
	stats: StatsValue;
	/**
	 * Environment to build for. An array of environments to build for all of them when possible.
	 */
	target?: Target;
	/**
	 * Enter watch mode, which rebuilds on file change.
	 */
	watch?: Watch;
	/**
	 * Options for the watcher.
	 */
	watchOptions: WatchOptions;
}
