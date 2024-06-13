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
 * Options for the webpack-dev-server.
 */
export type DevServer =
	| false
	| {
			[k: string]: any;
	  };
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
export type EntryItem = string[] | string;
/**
 * The method of loading chunks (methods included by default are 'jsonp' (web), 'import' (ESM), 'importScripts' (WebWorker), 'require' (sync node.js), 'async-node' (async node.js), but others might be added by plugins).
 */
export type ChunkLoading = false | ChunkLoadingType;
/**
 * The method of loading chunks (methods included by default are 'jsonp' (web), 'import' (ESM), 'importScripts' (WebWorker), 'require' (sync node.js), 'async-node' (async node.js), but others might be added by plugins).
 */
export type ChunkLoadingType =
	| ("jsonp" | "import-scripts" | "require" | "async-node" | "import")
	| string;
/**
 * Specifies the filename of the output file on disk. You must **not** specify an absolute path here, but the path may contain folders separated by '/'! The specified path is joined with the value of the 'output.path' option to determine the location on disk.
 */
export type EntryFilename = FilenameTemplate;
/**
 * Specifies the filename template of output files on disk. You must **not** specify an absolute path here, but the path may contain folders separated by '/'! The specified path is joined with the value of the 'output.path' option to determine the location on disk.
 */
export type FilenameTemplate =
	| string
	| ((
			pathData: import("../lib/Compilation").PathData,
			assetInfo?: import("../lib/Compilation").AssetInfo
	  ) => string);
/**
 * Specifies the layer in which modules of this entrypoint are placed.
 */
export type Layer = null | string;
/**
 * Add a container for define/require functions in the AMD module.
 */
export type AmdContainer = string;
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
 * Type of library (types included by default are 'var', 'module', 'assign', 'assign-properties', 'this', 'window', 'self', 'global', 'commonjs', 'commonjs2', 'commonjs-module', 'commonjs-static', 'amd', 'amd-require', 'umd', 'umd2', 'jsonp', 'system', but others might be added by plugins).
 */
export type LibraryType =
	| (
			| "var"
			| "module"
			| "assign"
			| "assign-properties"
			| "this"
			| "window"
			| "self"
			| "global"
			| "commonjs"
			| "commonjs2"
			| "commonjs-module"
			| "commonjs-static"
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
 * The 'publicPath' specifies the public URL address of the output files when referenced in a browser.
 */
export type PublicPath = "auto" | RawPublicPath;
/**
 * The 'publicPath' specifies the public URL address of the output files when referenced in a browser.
 */
export type RawPublicPath =
	| string
	| ((
			pathData: import("../lib/Compilation").PathData,
			assetInfo?: import("../lib/Compilation").AssetInfo
	  ) => string);
/**
 * The name of the runtime chunk. If set a runtime chunk with this name is created or an existing entrypoint is used as runtime.
 */
export type EntryRuntime = false | string;
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
 * Enables/Disables experiments (experimental features with relax SemVer compatibility).
 */
export type Experiments = ExperimentsCommon & ExperimentsExtra;
/**
 * Extend configuration from another configuration (only works when using webpack-cli).
 */
export type Extends = ExtendsItem[] | ExtendsItem;
/**
 * Path to the configuration to be extended (only works when using webpack-cli).
 */
export type ExtendsItem = string;
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
	| (ExternalItemObjectKnown & ExternalItemObjectUnknown)
	| (
			| ((
					data: ExternalItemFunctionData,
					callback: (err?: Error | null, result?: ExternalItemValue) => void
			  ) => void)
			| ((data: ExternalItemFunctionData) => Promise<ExternalItemValue>)
	  );
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
	| "commonjs-static"
	| "amd"
	| "amd-require"
	| "umd"
	| "umd2"
	| "jsonp"
	| "system"
	| "promise"
	| "import"
	| "script"
	| "node-commonjs";
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
 * These values will be ignored by webpack and created to be used with '&&' or '||' to improve readability of configurations.
 */
export type Falsy = false | 0 | "" | null | undefined;
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
	| ((value: string) => boolean)
	| RuleSetLogicalConditions
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
	| ((value: string) => boolean)
	| RuleSetLogicalConditionsAbsolute
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
 * Plugin instance.
 */
export type ResolvePluginInstance =
	| {
			/**
			 * The run point of the plugin, required method.
			 */
			apply: (arg0: import("enhanced-resolve").Resolver) => void;
			[k: string]: any;
	  }
	| ((
			this: import("enhanced-resolve").Resolver,
			arg1: import("enhanced-resolve").Resolver
	  ) => void);
/**
 * A list of descriptions of loaders applied.
 */
export type RuleSetUse =
	| (Falsy | RuleSetUseItem)[]
	| ((data: {
			resource: string;
			realResource: string;
			resourceQuery: string;
			issuer: string;
			compiler: string;
	  }) => (Falsy | RuleSetUseItem)[])
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
	| ((data: object) => RuleSetUseItem | (Falsy | RuleSetUseItem)[])
	| RuleSetLoader;
/**
 * A list of rules.
 */
export type RuleSetRules = ("..." | Falsy | RuleSetRule)[];
/**
 * Specify options for each generator.
 */
export type GeneratorOptionsByModuleType = GeneratorOptionsByModuleTypeKnown &
	GeneratorOptionsByModuleTypeUnknown;
/**
 * Don't parse files matching. It's matched against the full resolved request.
 */
export type NoParse =
	| (RegExp | string | Function)[]
	| RegExp
	| string
	| Function;
/**
 * Specify options for each parser.
 */
export type ParserOptionsByModuleType = ParserOptionsByModuleTypeKnown &
	ParserOptionsByModuleTypeUnknown;
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
 * The filename of asset modules as relative path inside the 'output.path' directory.
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
 * Specifies the filename template of output files of non-initial chunks on disk. You must **not** specify an absolute path here, but the path may contain folders separated by '/'! The specified path is joined with the value of the 'output.path' option to determine the location on disk.
 */
export type ChunkFilename = FilenameTemplate;
/**
 * The format of chunks (formats included by default are 'array-push' (web/WebWorker), 'commonjs' (node.js), 'module' (ESM), but others might be added by plugins).
 */
export type ChunkFormat =
	| ("array-push" | "commonjs" | "module" | false)
	| string;
/**
 * Number of milliseconds before chunk request expires.
 */
export type ChunkLoadTimeout = number;
/**
 * The global variable used by webpack for loading of chunks.
 */
export type ChunkLoadingGlobal = string;
/**
 * Clean the output directory before emit.
 */
export type Clean = boolean | CleanOptions;
/**
 * Check if to be emitted file already exists and have the same content before writing to output filesystem.
 */
export type CompareBeforeEmit = boolean;
/**
 * This option enables cross-origin loading of chunks.
 */
export type CrossOriginLoading = false | "anonymous" | "use-credentials";
/**
 * Specifies the filename template of non-initial output css files on disk. You must **not** specify an absolute path here, but the path may contain folders separated by '/'! The specified path is joined with the value of the 'output.path' option to determine the location on disk.
 */
export type CssChunkFilename = FilenameTemplate;
/**
 * Specifies the filename template of output css files on disk. You must **not** specify an absolute path here, but the path may contain folders separated by '/'! The specified path is joined with the value of the 'output.path' option to determine the location on disk.
 */
export type CssFilename = FilenameTemplate;
/**
 * Compress the data in the head tag of CSS files.
 */
export type CssHeadDataCompression = boolean;
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
 * Specifies the filename of output files on disk. You must **not** specify an absolute path here, but the path may contain folders separated by '/'! The specified path is joined with the value of the 'output.path' option to determine the location on disk.
 */
export type Filename = FilenameTemplate;
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
 * The filename of the Hot Update Main File. It is inside the 'output.path' directory.
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
export type Pathinfo = "verbose" | boolean;
/**
 * This option enables loading async chunks via a custom script type, such as script type="module".
 */
export type ScriptType = false | "text/javascript" | "module";
/**
 * The filename of the SourceMaps for the JavaScript files. They are inside the 'output.path' directory.
 */
export type SourceMapFilename = string;
/**
 * Prefixes every line of the source in the bundle with this string.
 */
export type SourcePrefix = string;
/**
 * Handles error in module loading correctly at a performance cost. This will handle module error compatible with the EcmaScript Modules spec.
 */
export type StrictModuleErrorHandling = boolean;
/**
 * Handles exceptions in module loading correctly at a performance cost (Deprecated). This will handle module error compatible with the Node.js CommonJS way.
 */
export type StrictModuleExceptionHandling = boolean;
/**
 * A unique name of the webpack build to avoid multiple webpack runtimes to conflict when using globals.
 */
export type UniqueName = string;
/**
 * The filename of WebAssembly modules as relative path inside the 'output.path' directory.
 */
export type WebassemblyModuleFilename = string;
/**
 * Worker public path. Much like the public path, this sets the location where the worker script file is intended to be found. If not set, webpack will use the publicPath. Don't set this option unless your worker scripts are located at a different path from your other script files.
 */
export type WorkerPublicPath = string;
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
export type Plugins = (Falsy | WebpackPluginInstance | WebpackPluginFunction)[];
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
 * Filtering modules.
 */
export type ModuleFilterTypes = ModuleFilterItemTypes[] | ModuleFilterItemTypes;
/**
 * Filtering value, regexp or function.
 */
export type ModuleFilterItemTypes =
	| RegExp
	| string
	| ((
			name: string,
			module: import("../lib/stats/DefaultStatsFactoryPlugin").StatsModule,
			type: "module" | "chunk" | "root-of-chunk" | "nested"
	  ) => boolean);
/**
 * Filtering modules.
 */
export type AssetFilterTypes = AssetFilterItemTypes[] | AssetFilterItemTypes;
/**
 * Filtering value, regexp or function.
 */
export type AssetFilterItemTypes =
	| RegExp
	| string
	| ((
			name: string,
			asset: import("../lib/stats/DefaultStatsFactoryPlugin").StatsAsset
	  ) => boolean);
/**
 * Filtering warnings.
 */
export type WarningFilterTypes =
	| WarningFilterItemTypes[]
	| WarningFilterItemTypes;
/**
 * Filtering value, regexp or function.
 */
export type WarningFilterItemTypes =
	| RegExp
	| string
	| ((
			warning: import("../lib/stats/DefaultStatsFactoryPlugin").StatsError,
			value: string
	  ) => boolean);
/**
 * Environment to build for. An array of environments to build for all of them when possible.
 */
export type Target = string[] | false | string;
/**
 * Enter watch mode, which rebuilds on file change.
 */
export type Watch = boolean;
/**
 * The options for data url generator.
 */
export type AssetGeneratorDataUrl =
	| AssetGeneratorDataUrlOptions
	| AssetGeneratorDataUrlFunction;
/**
 * Function that executes for module and should return an DataUrl string. It can have a string as 'ident' property which contributes to the module hash.
 */
export type AssetGeneratorDataUrlFunction = (
	source: string | Buffer,
	context: {filename: string; module: import("../lib/Module")}
) => string;
/**
 * Generator options for asset modules.
 */
export type AssetGeneratorOptions = AssetInlineGeneratorOptions &
	AssetResourceGeneratorOptions;
/**
 * Emit the asset in the specified folder relative to 'output.path'. This should only be needed when custom 'publicPath' is specified to match the folder structure there.
 */
export type AssetModuleOutputPath =
	| string
	| ((
			pathData: import("../lib/Compilation").PathData,
			assetInfo?: import("../lib/Compilation").AssetInfo
	  ) => string);
/**
 * Function that executes for module and should return whenever asset should be inlined as DataUrl.
 */
export type AssetParserDataUrlFunction = (
	source: string | Buffer,
	context: {filename: string; module: import("../lib/Module")}
) => boolean;
/**
 * Configure the generated JS modules that use the ES modules syntax.
 */
export type CssGeneratorEsModule = boolean;
/**
 * Specifies the convention of exported names.
 */
export type CssGeneratorExportsConvention =
	| ("as-is" | "camel-case" | "camel-case-only" | "dashes" | "dashes-only")
	| ((name: string) => string);
/**
 * Avoid generating and loading a stylesheet and only embed exports from css into output javascript files.
 */
export type CssGeneratorExportsOnly = boolean;
/**
 * Configure the generated local ident name.
 */
export type CssGeneratorLocalIdentName = string;
/**
 * Use ES modules named export for css exports.
 */
export type CssParserNamedExports = boolean;
/**
 * A Function returning a Promise resolving to a normalized entry.
 */
export type EntryDynamicNormalized = () => Promise<EntryStaticNormalized>;
/**
 * The entry point(s) of the compilation.
 */
export type EntryNormalized = EntryDynamicNormalized | EntryStaticNormalized;
/**
 * Enables/Disables experiments (experimental features with relax SemVer compatibility).
 */
export type ExperimentsNormalized = ExperimentsCommon &
	ExperimentsNormalizedExtra;
/**
 * The dependency used for the external.
 */
export type ExternalItemValue =
	| string[]
	| boolean
	| string
	| {
			[k: string]: any;
	  };
/**
 * List of allowed URIs for building http resources.
 */
export type HttpUriAllowedUris = HttpUriOptionsAllowedUris;
/**
 * List of allowed URIs (resp. the beginning of them).
 */
export type HttpUriOptionsAllowedUris = (
	| RegExp
	| string
	| ((uri: string) => boolean)
)[];
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
	 * Extend configuration from another configuration (only works when using webpack-cli).
	 */
	extends?: Extends;
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
	 * Additionally cache computation of modules that are unchanged and reference only unchanged modules.
	 */
	cacheUnaffected?: boolean;
	/**
	 * Number of generations unused cache entries stay in memory cache at minimum (1 = may be removed after unused for a single compilation, ..., Infinity: kept forever).
	 */
	maxGenerations?: number;
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
	 * Allows to collect unused memory allocated during deserialization. This requires copying data into smaller buffers and has a performance cost.
	 */
	allowCollectingMemory?: boolean;
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
	 * Compression type used for the cache files.
	 */
	compression?: false | "gzip" | "brotli";
	/**
	 * Algorithm used for generation the hash (see node.js crypto package).
	 */
	hashAlgorithm?: string;
	/**
	 * Time in ms after which idle period the cache storing should happen.
	 */
	idleTimeout?: number;
	/**
	 * Time in ms after which idle period the cache storing should happen when larger changes has been detected (cumulative build time > 2 x avg cache store time).
	 */
	idleTimeoutAfterLargeChanges?: number;
	/**
	 * Time in ms after which idle period the initial cache storing should happen.
	 */
	idleTimeoutForInitialStore?: number;
	/**
	 * List of paths that are managed by a package manager and contain a version or hash in its path so all files are immutable.
	 */
	immutablePaths?: (RegExp | string)[];
	/**
	 * List of paths that are managed by a package manager and can be trusted to not be modified otherwise.
	 */
	managedPaths?: (RegExp | string)[];
	/**
	 * Time for which unused cache entries stay in the filesystem cache at minimum (in milliseconds).
	 */
	maxAge?: number;
	/**
	 * Number of generations unused cache entries stay in memory cache at minimum (0 = no memory cache used, 1 = may be removed after unused for a single compilation, ..., Infinity: kept forever). Cache entries will be deserialized from disk when removed from memory cache.
	 */
	maxMemoryGenerations?: number;
	/**
	 * Additionally cache computation of modules that are unchanged and reference only unchanged modules in memory.
	 */
	memoryCacheUnaffected?: boolean;
	/**
	 * Name for the cache. Different names will lead to different coexisting caches.
	 */
	name?: string;
	/**
	 * Track and log detailed timing information for individual cache items.
	 */
	profile?: boolean;
	/**
	 * Enable/disable readonly mode.
	 */
	readonly?: boolean;
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
	 * Enable/disable creating async chunks that are loaded on demand.
	 */
	asyncChunks?: boolean;
	/**
	 * Base uri for this entry.
	 */
	baseUri?: string;
	/**
	 * The method of loading chunks (methods included by default are 'jsonp' (web), 'import' (ESM), 'importScripts' (WebWorker), 'require' (sync node.js), 'async-node' (async node.js), but others might be added by plugins).
	 */
	chunkLoading?: ChunkLoading;
	/**
	 * The entrypoints that the current entrypoint depend on. They must be loaded when this entrypoint is loaded.
	 */
	dependOn?: string[] | string;
	/**
	 * Specifies the filename of the output file on disk. You must **not** specify an absolute path here, but the path may contain folders separated by '/'! The specified path is joined with the value of the 'output.path' option to determine the location on disk.
	 */
	filename?: EntryFilename;
	/**
	 * Module(s) that are loaded upon startup.
	 */
	import: EntryItem;
	/**
	 * Specifies the layer in which modules of this entrypoint are placed.
	 */
	layer?: Layer;
	/**
	 * Options for library.
	 */
	library?: LibraryOptions;
	/**
	 * The 'publicPath' specifies the public URL address of the output files when referenced in a browser.
	 */
	publicPath?: PublicPath;
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
	 * Add a container for define/require functions in the AMD module.
	 */
	amdContainer?: AmdContainer;
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
	 * Type of library (types included by default are 'var', 'module', 'assign', 'assign-properties', 'this', 'window', 'self', 'global', 'commonjs', 'commonjs2', 'commonjs-module', 'commonjs-static', 'amd', 'amd-require', 'umd', 'umd2', 'jsonp', 'system', but others might be added by plugins).
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
	 * Only appends lines to the output. Avoids updating existing output e. g. for status messages. This option is only used when no custom console is provided.
	 */
	appendOnly?: boolean;
	/**
	 * Enables/Disables colorful output. This option is only used when no custom console is provided.
	 */
	colors?: boolean;
	/**
	 * Custom console used for logging.
	 */
	console?: Console;
	/**
	 * Enable debug logging for specific loggers.
	 */
	debug?: boolean | FilterTypes;
	/**
	 * Log level.
	 */
	level?: "none" | "error" | "warn" | "info" | "log" | "verbose";
	/**
	 * Stream used for logging output. Defaults to process.stderr. This option is only used when no custom console is provided.
	 */
	stream?: NodeJS.WritableStream;
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
	 * Enable recursive directory lookup for full dynamic dependencies. Deprecated: This option has moved to 'module.parser.javascript.exprContextRecursive'.
	 */
	exprContextRecursive?: boolean;
	/**
	 * Sets the default regular expression for full dynamic dependencies. Deprecated: This option has moved to 'module.parser.javascript.exprContextRegExp'.
	 */
	exprContextRegExp?: RegExp | boolean;
	/**
	 * Set the default request for full dynamic dependencies. Deprecated: This option has moved to 'module.parser.javascript.exprContextRequest'.
	 */
	exprContextRequest?: string;
	/**
	 * Specify options for each generator.
	 */
	generator?: GeneratorOptionsByModuleType;
	/**
	 * Don't parse files matching. It's matched against the full resolved request.
	 */
	noParse?: NoParse;
	/**
	 * Specify options for each parser.
	 */
	parser?: ParserOptionsByModuleType;
	/**
	 * An array of rules applied for modules.
	 */
	rules?: RuleSetRules;
	/**
	 * Emit errors instead of warnings when imported names don't exist in imported module. Deprecated: This option has moved to 'module.parser.javascript.strictExportPresence'.
	 */
	strictExportPresence?: boolean;
	/**
	 * Handle the this context correctly according to the spec for namespace objects. Deprecated: This option has moved to 'module.parser.javascript.strictThisContextOnImports'.
	 */
	strictThisContextOnImports?: boolean;
	/**
	 * Enable warnings when using the require function in a not statically analyse-able way. Deprecated: This option has moved to 'module.parser.javascript.unknownContextCritical'.
	 */
	unknownContextCritical?: boolean;
	/**
	 * Enable recursive directory lookup when using the require function in a not statically analyse-able way. Deprecated: This option has moved to 'module.parser.javascript.unknownContextRecursive'.
	 */
	unknownContextRecursive?: boolean;
	/**
	 * Sets the regular expression when using the require function in a not statically analyse-able way. Deprecated: This option has moved to 'module.parser.javascript.unknownContextRegExp'.
	 */
	unknownContextRegExp?: RegExp | boolean;
	/**
	 * Sets the request when using the require function in a not statically analyse-able way. Deprecated: This option has moved to 'module.parser.javascript.unknownContextRequest'.
	 */
	unknownContextRequest?: string;
	/**
	 * Cache the resolving of module requests.
	 */
	unsafeCache?: boolean | Function;
	/**
	 * Enable warnings for partial dynamic dependencies. Deprecated: This option has moved to 'module.parser.javascript.wrappedContextCritical'.
	 */
	wrappedContextCritical?: boolean;
	/**
	 * Enable recursive directory lookup for partial dynamic dependencies. Deprecated: This option has moved to 'module.parser.javascript.wrappedContextRecursive'.
	 */
	wrappedContextRecursive?: boolean;
	/**
	 * Set the inner regular expression for partial dynamic dependencies. Deprecated: This option has moved to 'module.parser.javascript.wrappedContextRegExp'.
	 */
	wrappedContextRegExp?: RegExp;
}
/**
 * A rule description with conditions and effects for modules.
 */
export interface RuleSetRule {
	/**
	 * Match on import assertions of the dependency.
	 */
	assert?: {
		[k: string]: RuleSetConditionOrConditions;
	};
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
	 * Match layer of the issuer of this module (The module pointing to this module).
	 */
	issuerLayer?: RuleSetConditionOrConditions;
	/**
	 * Specifies the layer in which the module should be placed in.
	 */
	layer?: string;
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
	oneOf?: (Falsy | RuleSetRule)[];
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
	rules?: (Falsy | RuleSetRule)[];
	/**
	 * Match module scheme.
	 */
	scheme?: RuleSetConditionOrConditions;
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
	/**
	 * Match on import attributes of the dependency.
	 */
	with?: {
		[k: string]: RuleSetConditionOrConditions;
	};
}
/**
 * Logic operators used in a condition matcher.
 */
export interface RuleSetLogicalConditions {
	/**
	 * Logical AND.
	 */
	and?: RuleSetConditions;
	/**
	 * Logical NOT.
	 */
	not?: RuleSetCondition;
	/**
	 * Logical OR.
	 */
	or?: RuleSetConditions;
}
/**
 * Logic operators used in a condition matcher.
 */
export interface RuleSetLogicalConditionsAbsolute {
	/**
	 * Logical AND.
	 */
	and?: RuleSetConditionsAbsolute;
	/**
	 * Logical NOT.
	 */
	not?: RuleSetConditionAbsolute;
	/**
	 * Logical OR.
	 */
	or?: RuleSetConditionsAbsolute;
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
	 * An object which maps extension to extension aliases.
	 */
	extensionAlias?: {
		/**
		 * Extension alias.
		 */
		[k: string]: string[] | string;
	};
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
	plugins?: ("..." | Falsy | ResolvePluginInstance)[];
	/**
	 * Prefer to resolve server-relative URLs (starting with '/') as absolute paths before falling back to resolve in 'resolve.roots'.
	 */
	preferAbsolute?: boolean;
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
	 * A list of directories in which requests that are server-relative URLs (starting with '/') are resolved.
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
 * Options object for node compatibility features.
 */
export interface NodeOptions {
	/**
	 * Include a polyfill for the '__dirname' variable.
	 */
	__dirname?: false | true | "warn-mock" | "mock" | "node-module" | "eval-only";
	/**
	 * Include a polyfill for the '__filename' variable.
	 */
	__filename?:
		| false
		| true
		| "warn-mock"
		| "mock"
		| "node-module"
		| "eval-only";
	/**
	 * Include a polyfill for the 'global' variable.
	 */
	global?: false | true | "warn";
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
	minimizer?: ("..." | Falsy | WebpackPluginInstance | WebpackPluginFunction)[];
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
		| RegExp
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
		 * Select chunks for determining shared modules (defaults to "async", "initial" and "all" requires adding these chunks to the HTML).
		 */
		chunks?:
			| ("initial" | "async" | "all")
			| RegExp
			| ((chunk: import("../lib/Chunk")) => boolean);
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
		/**
		 * Minimum size reduction due to the created chunk.
		 */
		minSizeReduction?: OptimizationSplitChunksSizes;
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
	 * Minimum size reduction due to the created chunk.
	 */
	minSizeReduction?: OptimizationSplitChunksSizes;
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
		| RegExp
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
	 * Assign modules to a cache group by module layer.
	 */
	layer?: RegExp | string | Function;
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
	 * Minimum size reduction due to the created chunk.
	 */
	minSizeReduction?: OptimizationSplitChunksSizes;
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
	 * Add a container for define/require functions in the AMD module.
	 */
	amdContainer?: AmdContainer;
	/**
	 * The filename of asset modules as relative path inside the 'output.path' directory.
	 */
	assetModuleFilename?: AssetModuleFilename;
	/**
	 * Enable/disable creating async chunks that are loaded on demand.
	 */
	asyncChunks?: boolean;
	/**
	 * Add a comment in the UMD wrapper.
	 */
	auxiliaryComment?: AuxiliaryComment;
	/**
	 * Add charset attribute for script tag.
	 */
	charset?: Charset;
	/**
	 * Specifies the filename template of output files of non-initial chunks on disk. You must **not** specify an absolute path here, but the path may contain folders separated by '/'! The specified path is joined with the value of the 'output.path' option to determine the location on disk.
	 */
	chunkFilename?: ChunkFilename;
	/**
	 * The format of chunks (formats included by default are 'array-push' (web/WebWorker), 'commonjs' (node.js), 'module' (ESM), but others might be added by plugins).
	 */
	chunkFormat?: ChunkFormat;
	/**
	 * Number of milliseconds before chunk request expires.
	 */
	chunkLoadTimeout?: ChunkLoadTimeout;
	/**
	 * The method of loading chunks (methods included by default are 'jsonp' (web), 'import' (ESM), 'importScripts' (WebWorker), 'require' (sync node.js), 'async-node' (async node.js), but others might be added by plugins).
	 */
	chunkLoading?: ChunkLoading;
	/**
	 * The global variable used by webpack for loading of chunks.
	 */
	chunkLoadingGlobal?: ChunkLoadingGlobal;
	/**
	 * Clean the output directory before emit.
	 */
	clean?: Clean;
	/**
	 * Check if to be emitted file already exists and have the same content before writing to output filesystem.
	 */
	compareBeforeEmit?: CompareBeforeEmit;
	/**
	 * This option enables cross-origin loading of chunks.
	 */
	crossOriginLoading?: CrossOriginLoading;
	/**
	 * Specifies the filename template of non-initial output css files on disk. You must **not** specify an absolute path here, but the path may contain folders separated by '/'! The specified path is joined with the value of the 'output.path' option to determine the location on disk.
	 */
	cssChunkFilename?: CssChunkFilename;
	/**
	 * Specifies the filename template of output css files on disk. You must **not** specify an absolute path here, but the path may contain folders separated by '/'! The specified path is joined with the value of the 'output.path' option to determine the location on disk.
	 */
	cssFilename?: CssFilename;
	/**
	 * Compress the data in the head tag of CSS files.
	 */
	cssHeadDataCompression?: CssHeadDataCompression;
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
	 * Specifies the filename of output files on disk. You must **not** specify an absolute path here, but the path may contain folders separated by '/'! The specified path is joined with the value of the 'output.path' option to determine the location on disk.
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
	 * The filename of the Hot Update Main File. It is inside the 'output.path' directory.
	 */
	hotUpdateMainFilename?: HotUpdateMainFilename;
	/**
	 * Ignore warnings in the browser.
	 */
	ignoreBrowserWarnings?: boolean;
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
	 * Type of library (types included by default are 'var', 'module', 'assign', 'assign-properties', 'this', 'window', 'self', 'global', 'commonjs', 'commonjs2', 'commonjs-module', 'commonjs-static', 'amd', 'amd-require', 'umd', 'umd2', 'jsonp', 'system', but others might be added by plugins).
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
	 * The 'publicPath' specifies the public URL address of the output files when referenced in a browser.
	 */
	publicPath?: PublicPath;
	/**
	 * This option enables loading async chunks via a custom script type, such as script type="module".
	 */
	scriptType?: ScriptType;
	/**
	 * The filename of the SourceMaps for the JavaScript files. They are inside the 'output.path' directory.
	 */
	sourceMapFilename?: SourceMapFilename;
	/**
	 * Prefixes every line of the source in the bundle with this string.
	 */
	sourcePrefix?: SourcePrefix;
	/**
	 * Handles error in module loading correctly at a performance cost. This will handle module error compatible with the EcmaScript Modules spec.
	 */
	strictModuleErrorHandling?: StrictModuleErrorHandling;
	/**
	 * Handles exceptions in module loading correctly at a performance cost (Deprecated). This will handle module error compatible with the Node.js CommonJS way.
	 */
	strictModuleExceptionHandling?: StrictModuleExceptionHandling;
	/**
	 * Use a Trusted Types policy to create urls for chunks. 'output.uniqueName' is used a default policy name. Passing a string sets a custom policy name.
	 */
	trustedTypes?: true | string | TrustedTypes;
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
	 * The filename of WebAssembly modules as relative path inside the 'output.path' directory.
	 */
	webassemblyModuleFilename?: WebassemblyModuleFilename;
	/**
	 * The method of loading chunks (methods included by default are 'jsonp' (web), 'import' (ESM), 'importScripts' (WebWorker), 'require' (sync node.js), 'async-node' (async node.js), but others might be added by plugins).
	 */
	workerChunkLoading?: ChunkLoading;
	/**
	 * Worker public path. Much like the public path, this sets the location where the worker script file is intended to be found. If not set, webpack will use the publicPath. Don't set this option unless your worker scripts are located at a different path from your other script files.
	 */
	workerPublicPath?: WorkerPublicPath;
	/**
	 * The method of loading WebAssembly Modules (methods included by default are 'fetch' (web/WebWorker), 'async-node' (node.js), but others might be added by plugins).
	 */
	workerWasmLoading?: WasmLoading;
}
/**
 * Advanced options for cleaning assets.
 */
export interface CleanOptions {
	/**
	 * Log the assets that should be removed instead of deleting them.
	 */
	dry?: boolean;
	/**
	 * Keep these assets.
	 */
	keep?: RegExp | string | ((filename: string) => boolean);
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
	 * The environment supports async function and await ('async function () { await ... }').
	 */
	asyncFunction?: boolean;
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
	 * The environment supports 'document'.
	 */
	document?: boolean;
	/**
	 * The environment supports an async import() function to import EcmaScript modules.
	 */
	dynamicImport?: boolean;
	/**
	 * The environment supports an async import() is available when creating a worker.
	 */
	dynamicImportInWorker?: boolean;
	/**
	 * The environment supports 'for of' iteration ('for (const x of array) { ... }').
	 */
	forOf?: boolean;
	/**
	 * The environment supports 'globalThis'.
	 */
	globalThis?: boolean;
	/**
	 * The environment supports EcmaScript Module syntax to import EcmaScript modules (import ... from '...').
	 */
	module?: boolean;
	/**
	 * The environment supports `node:` prefix for Node.js core modules.
	 */
	nodePrefixForCoreModules?: boolean;
	/**
	 * The environment supports optional chaining ('obj?.a' or 'obj?.()').
	 */
	optionalChaining?: boolean;
	/**
	 * The environment supports template literals.
	 */
	templateLiteral?: boolean;
}
/**
 * Use a Trusted Types policy to create urls for chunks.
 */
export interface TrustedTypes {
	/**
	 * If the call to `trustedTypes.createPolicy(...)` fails -- e.g., due to the policy name missing from the CSP `trusted-types` list, or it being a duplicate name, etc. -- controls whether to continue with loading in the hope that `require-trusted-types-for 'script'` isn't enforced yet, versus fail immediately. Default behavior is 'stop'.
	 */
	onPolicyCreationFailure?: "continue" | "stop";
	/**
	 * The name of the Trusted Types policy created by webpack to serve bundle chunks.
	 */
	policyName?: string;
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
	immutablePaths?: (RegExp | string)[];
	/**
	 * List of paths that are managed by a package manager and can be trusted to not be modified otherwise.
	 */
	managedPaths?: (RegExp | string)[];
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
	/**
	 * List of paths that are not managed by a package manager and the contents are subject to change.
	 */
	unmanagedPaths?: (RegExp | string)[];
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
	 * Add information about cached (not built) modules (deprecated: use 'cachedModules' instead).
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
	 * Space to display chunk modules (groups will be collapsed to fit this space, value is in number of modules/group).
	 */
	chunkModulesSpace?: number;
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
	errorDetails?: "auto" | boolean;
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
	 * Space to display errors (value is in number of lines).
	 */
	errorsSpace?: number;
	/**
	 * Please use excludeModules instead.
	 */
	exclude?: boolean | ModuleFilterTypes;
	/**
	 * Suppress assets that match the specified filters. Filters can be Strings, RegExps or Functions.
	 */
	excludeAssets?: AssetFilterTypes;
	/**
	 * Suppress modules that match the specified filters. Filters can be Strings, RegExps, Booleans or Functions.
	 */
	excludeModules?: boolean | ModuleFilterTypes;
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
	 * Group modules by their layer.
	 */
	groupModulesByLayer?: boolean;
	/**
	 * Group modules by their path.
	 */
	groupModulesByPath?: boolean;
	/**
	 * Group modules by their type.
	 */
	groupModulesByType?: boolean;
	/**
	 * Group reasons by their origin module.
	 */
	groupReasonsByOrigin?: boolean;
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
	 * Space to display modules (groups will be collapsed to fit this space, value is in number of modules/groups).
	 */
	modulesSpace?: number;
	/**
	 * Add information about modules nested in other modules (like with module concatenation).
	 */
	nestedModules?: boolean;
	/**
	 * Space to display modules nested within other modules (groups will be collapsed to fit this space, value is in number of modules/group).
	 */
	nestedModulesSpace?: number;
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
	 * Space to display reasons (groups will be collapsed to fit this space).
	 */
	reasonsSpace?: number;
	/**
	 * Add information about assets that are related to other assets (like SourceMaps for assets).
	 */
	relatedAssets?: boolean;
	/**
	 * Add information about runtime modules (deprecated: use 'runtimeModules' instead).
	 */
	runtime?: boolean;
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
	warningsFilter?: WarningFilterTypes;
	/**
	 * Space to display warnings (value is in number of lines).
	 */
	warningsSpace?: number;
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
 * Options object for data url generation.
 */
export interface AssetGeneratorDataUrlOptions {
	/**
	 * Asset encoding (defaults to base64).
	 */
	encoding?: false | "base64";
	/**
	 * Asset mimetype (getting from file extension by default).
	 */
	mimetype?: string;
}
/**
 * Generator options for asset/inline modules.
 */
export interface AssetInlineGeneratorOptions {
	/**
	 * The options for data url generator.
	 */
	dataUrl?: AssetGeneratorDataUrl;
}
/**
 * Options object for DataUrl condition.
 */
export interface AssetParserDataUrlOptions {
	/**
	 * Maximum size of asset that should be inline as modules. Default: 8kb.
	 */
	maxSize?: number;
}
/**
 * Parser options for asset modules.
 */
export interface AssetParserOptions {
	/**
	 * The condition for inlining the asset as DataUrl.
	 */
	dataUrlCondition?: AssetParserDataUrlOptions | AssetParserDataUrlFunction;
}
/**
 * Generator options for asset/resource modules.
 */
export interface AssetResourceGeneratorOptions {
	/**
	 * Emit an output asset from this asset module. This can be set to 'false' to omit emitting e. g. for SSR.
	 */
	emit?: boolean;
	/**
	 * Specifies the filename template of output files on disk. You must **not** specify an absolute path here, but the path may contain folders separated by '/'! The specified path is joined with the value of the 'output.path' option to determine the location on disk.
	 */
	filename?: FilenameTemplate;
	/**
	 * Emit the asset in the specified folder relative to 'output.path'. This should only be needed when custom 'publicPath' is specified to match the folder structure there.
	 */
	outputPath?: AssetModuleOutputPath;
	/**
	 * The 'publicPath' specifies the public URL address of the output files when referenced in a browser.
	 */
	publicPath?: RawPublicPath;
}
/**
 * Generator options for css/auto modules.
 */
export interface CssAutoGeneratorOptions {
	/**
	 * Configure the generated JS modules that use the ES modules syntax.
	 */
	esModule?: CssGeneratorEsModule;
	/**
	 * Specifies the convention of exported names.
	 */
	exportsConvention?: CssGeneratorExportsConvention;
	/**
	 * Avoid generating and loading a stylesheet and only embed exports from css into output javascript files.
	 */
	exportsOnly?: CssGeneratorExportsOnly;
	/**
	 * Configure the generated local ident name.
	 */
	localIdentName?: CssGeneratorLocalIdentName;
}
/**
 * Parser options for css/auto modules.
 */
export interface CssAutoParserOptions {
	/**
	 * Use ES modules named export for css exports.
	 */
	namedExports?: CssParserNamedExports;
}
/**
 * Generator options for css modules.
 */
export interface CssGeneratorOptions {
	/**
	 * Configure the generated JS modules that use the ES modules syntax.
	 */
	esModule?: CssGeneratorEsModule;
	/**
	 * Avoid generating and loading a stylesheet and only embed exports from css into output javascript files.
	 */
	exportsOnly?: CssGeneratorExportsOnly;
}
/**
 * Generator options for css/global modules.
 */
export interface CssGlobalGeneratorOptions {
	/**
	 * Configure the generated JS modules that use the ES modules syntax.
	 */
	esModule?: CssGeneratorEsModule;
	/**
	 * Specifies the convention of exported names.
	 */
	exportsConvention?: CssGeneratorExportsConvention;
	/**
	 * Avoid generating and loading a stylesheet and only embed exports from css into output javascript files.
	 */
	exportsOnly?: CssGeneratorExportsOnly;
	/**
	 * Configure the generated local ident name.
	 */
	localIdentName?: CssGeneratorLocalIdentName;
}
/**
 * Parser options for css/global modules.
 */
export interface CssGlobalParserOptions {
	/**
	 * Use ES modules named export for css exports.
	 */
	namedExports?: CssParserNamedExports;
}
/**
 * Generator options for css/module modules.
 */
export interface CssModuleGeneratorOptions {
	/**
	 * Configure the generated JS modules that use the ES modules syntax.
	 */
	esModule?: CssGeneratorEsModule;
	/**
	 * Specifies the convention of exported names.
	 */
	exportsConvention?: CssGeneratorExportsConvention;
	/**
	 * Avoid generating and loading a stylesheet and only embed exports from css into output javascript files.
	 */
	exportsOnly?: CssGeneratorExportsOnly;
	/**
	 * Configure the generated local ident name.
	 */
	localIdentName?: CssGeneratorLocalIdentName;
}
/**
 * Parser options for css/module modules.
 */
export interface CssModuleParserOptions {
	/**
	 * Use ES modules named export for css exports.
	 */
	namedExports?: CssParserNamedExports;
}
/**
 * Parser options for css modules.
 */
export interface CssParserOptions {
	/**
	 * Use ES modules named export for css exports.
	 */
	namedExports?: CssParserNamedExports;
}
/**
 * No generator options are supported for this module type.
 */
export interface EmptyGeneratorOptions {}
/**
 * No parser options are supported for this module type.
 */
export interface EmptyParserOptions {}
/**
 * An object with entry point description.
 */
export interface EntryDescriptionNormalized {
	/**
	 * Enable/disable creating async chunks that are loaded on demand.
	 */
	asyncChunks?: boolean;
	/**
	 * Base uri for this entry.
	 */
	baseUri?: string;
	/**
	 * The method of loading chunks (methods included by default are 'jsonp' (web), 'import' (ESM), 'importScripts' (WebWorker), 'require' (sync node.js), 'async-node' (async node.js), but others might be added by plugins).
	 */
	chunkLoading?: ChunkLoading;
	/**
	 * The entrypoints that the current entrypoint depend on. They must be loaded when this entrypoint is loaded.
	 */
	dependOn?: string[];
	/**
	 * Specifies the filename of output files on disk. You must **not** specify an absolute path here, but the path may contain folders separated by '/'! The specified path is joined with the value of the 'output.path' option to determine the location on disk.
	 */
	filename?: Filename;
	/**
	 * Module(s) that are loaded upon startup. The last one is exported.
	 */
	import?: string[];
	/**
	 * Specifies the layer in which modules of this entrypoint are placed.
	 */
	layer?: Layer;
	/**
	 * Options for library.
	 */
	library?: LibraryOptions;
	/**
	 * The 'publicPath' specifies the public URL address of the output files when referenced in a browser.
	 */
	publicPath?: PublicPath;
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
 * Enables/Disables experiments (experimental features with relax SemVer compatibility).
 */
export interface ExperimentsCommon {
	/**
	 * Support WebAssembly as asynchronous EcmaScript Module.
	 */
	asyncWebAssembly?: boolean;
	/**
	 * Enable backward-compat layer with deprecation warnings for many webpack 4 APIs.
	 */
	backCompat?: boolean;
	/**
	 * Enable additional in memory caching of modules that are unchanged and reference only unchanged modules.
	 */
	cacheUnaffected?: boolean;
	/**
	 * Apply defaults of next major version.
	 */
	futureDefaults?: boolean;
	/**
	 * Enable module layers.
	 */
	layers?: boolean;
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
 * Data object passed as argument when a function is set for 'externals'.
 */
export interface ExternalItemFunctionData {
	/**
	 * The directory in which the request is placed.
	 */
	context?: string;
	/**
	 * Contextual information.
	 */
	contextInfo?: import("../lib/ModuleFactory").ModuleFactoryCreateDataContextInfo;
	/**
	 * The category of the referencing dependencies.
	 */
	dependencyType?: string;
	/**
	 * Get a resolve function with the current resolver options.
	 */
	getResolve?: (
		options?: ResolveOptions
	) =>
		| ((
				context: string,
				request: string,
				callback: (err?: Error, result?: string) => void
		  ) => void)
		| ((context: string, request: string) => Promise<string>);
	/**
	 * The request as written by the user in the require/import expression/statement.
	 */
	request?: string;
}
/**
 * Options for building http resources.
 */
export interface HttpUriOptions {
	/**
	 * List of allowed URIs (resp. the beginning of them).
	 */
	allowedUris: HttpUriOptionsAllowedUris;
	/**
	 * Location where resource content is stored for lockfile entries. It's also possible to disable storing by passing false.
	 */
	cacheLocation?: false | string;
	/**
	 * When set, anything that would lead to a modification of the lockfile or any resource content, will result in an error.
	 */
	frozen?: boolean;
	/**
	 * Location of the lockfile.
	 */
	lockfileLocation?: string;
	/**
	 * Proxy configuration, which can be used to specify a proxy server to use for HTTP requests.
	 */
	proxy?: string;
	/**
	 * When set, resources of existing lockfile entries will be fetched and entries will be upgraded when resource content has changed.
	 */
	upgrade?: boolean;
}
/**
 * Parser options for javascript modules.
 */
export interface JavascriptParserOptions {
	/**
	 * Set the value of `require.amd` and `define.amd`. Or disable AMD support.
	 */
	amd?: Amd;
	/**
	 * Enable/disable special handling for browserify bundles.
	 */
	browserify?: boolean;
	/**
	 * Enable/disable parsing of CommonJs syntax.
	 */
	commonjs?: boolean;
	/**
	 * Enable/disable parsing of magic comments in CommonJs syntax.
	 */
	commonjsMagicComments?: boolean;
	/**
	 * Enable/disable parsing "import { createRequire } from "module"" and evaluating createRequire().
	 */
	createRequire?: boolean | string;
	/**
	 * Specifies global fetchPriority for dynamic import.
	 */
	dynamicImportFetchPriority?: "low" | "high" | "auto" | false;
	/**
	 * Specifies global mode for dynamic import.
	 */
	dynamicImportMode?: "eager" | "weak" | "lazy" | "lazy-once";
	/**
	 * Specifies global prefetch for dynamic import.
	 */
	dynamicImportPrefetch?: number | boolean;
	/**
	 * Specifies global preload for dynamic import.
	 */
	dynamicImportPreload?: number | boolean;
	/**
	 * Specifies the behavior of invalid export names in "import ... from ..." and "export ... from ...".
	 */
	exportsPresence?: "error" | "warn" | "auto" | false;
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
	 * Enable/disable parsing of EcmaScript Modules syntax.
	 */
	harmony?: boolean;
	/**
	 * Enable/disable parsing of import() syntax.
	 */
	import?: boolean;
	/**
	 * Specifies the behavior of invalid export names in "import ... from ...".
	 */
	importExportsPresence?: "error" | "warn" | "auto" | false;
	/**
	 * Enable/disable evaluating import.meta.
	 */
	importMeta?: boolean;
	/**
	 * Enable/disable evaluating import.meta.webpackContext.
	 */
	importMetaContext?: boolean;
	/**
	 * Include polyfills or mocks for various node stuff.
	 */
	node?: Node;
	/**
	 * Specifies the behavior of invalid export names in "export ... from ...". This might be useful to disable during the migration from "export ... from ..." to "export type ... from ..." when reexporting types in TypeScript.
	 */
	reexportExportsPresence?: "error" | "warn" | "auto" | false;
	/**
	 * Enable/disable parsing of require.context syntax.
	 */
	requireContext?: boolean;
	/**
	 * Enable/disable parsing of require.ensure syntax.
	 */
	requireEnsure?: boolean;
	/**
	 * Enable/disable parsing of require.include syntax.
	 */
	requireInclude?: boolean;
	/**
	 * Enable/disable parsing of require.js special syntax like require.config, requirejs.config, require.version and requirejs.onError.
	 */
	requireJs?: boolean;
	/**
	 * Deprecated in favor of "exportsPresence". Emit errors instead of warnings when imported names don't exist in imported module.
	 */
	strictExportPresence?: boolean;
	/**
	 * Handle the this context correctly according to the spec for namespace objects.
	 */
	strictThisContextOnImports?: boolean;
	/**
	 * Enable/disable parsing of System.js special syntax like System.import, System.get, System.set and System.register.
	 */
	system?: boolean;
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
	 * Enable/disable parsing of new URL() syntax.
	 */
	url?: "relative" | boolean;
	/**
	 * Disable or configure parsing of WebWorker syntax like new Worker() or navigator.serviceWorker.register().
	 */
	worker?: string[] | boolean;
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
	[k: string]: any;
}
/**
 * Options for the default backend.
 */
export interface LazyCompilationDefaultBackendOptions {
	/**
	 * A custom client.
	 */
	client?: string;
	/**
	 * Specifies where to listen to from the server.
	 */
	listen?:
		| number
		| import("net").ListenOptions
		| ((server: import("net").Server) => void);
	/**
	 * Specifies the protocol the client should use to connect to the server.
	 */
	protocol?: "http" | "https";
	/**
	 * Specifies how to create the server handling the EventSource requests.
	 */
	server?:
		| (import("https").ServerOptions | import("http").ServerOptions)
		| (() => import("net").Server);
}
/**
 * Options for compiling entrypoints and import()s only when they are accessed.
 */
export interface LazyCompilationOptions {
	/**
	 * Specifies the backend that should be used for handling client keep alive.
	 */
	backend?:
		| (
				| ((
						compiler: import("../lib/Compiler"),
						callback: (
							err?: Error,
							api?: import("../lib/hmr/LazyCompilationPlugin").BackendApi
						) => void
				  ) => void)
				| ((
						compiler: import("../lib/Compiler")
				  ) => Promise<import("../lib/hmr/LazyCompilationPlugin").BackendApi>)
		  )
		| LazyCompilationDefaultBackendOptions;
	/**
	 * Enable/disable lazy compilation for entries.
	 */
	entries?: boolean;
	/**
	 * Enable/disable lazy compilation for import() modules.
	 */
	imports?: boolean;
	/**
	 * Specify which entrypoints or import()ed modules should be lazily compiled. This is matched with the imported module and not the entrypoint name.
	 */
	test?: RegExp | string | ((module: import("../lib/Module")) => boolean);
}
/**
 * Options affecting the normal modules (`NormalModuleFactory`).
 */
export interface ModuleOptionsNormalized {
	/**
	 * An array of rules applied by default for modules.
	 */
	defaultRules: RuleSetRules;
	/**
	 * Specify options for each generator.
	 */
	generator: GeneratorOptionsByModuleType;
	/**
	 * Don't parse files matching. It's matched against the full resolved request.
	 */
	noParse?: NoParse;
	/**
	 * Specify options for each parser.
	 */
	parser: ParserOptionsByModuleType;
	/**
	 * An array of rules applied for modules.
	 */
	rules: RuleSetRules;
	/**
	 * Cache the resolving of module requests.
	 */
	unsafeCache?: boolean | Function;
}
/**
 * Normalized options affecting the output of the compilation. `output` options tell webpack how to write the compiled files to disk.
 */
export interface OutputNormalized {
	/**
	 * The filename of asset modules as relative path inside the 'output.path' directory.
	 */
	assetModuleFilename?: AssetModuleFilename;
	/**
	 * Enable/disable creating async chunks that are loaded on demand.
	 */
	asyncChunks?: boolean;
	/**
	 * Add charset attribute for script tag.
	 */
	charset?: Charset;
	/**
	 * Specifies the filename template of output files of non-initial chunks on disk. You must **not** specify an absolute path here, but the path may contain folders separated by '/'! The specified path is joined with the value of the 'output.path' option to determine the location on disk.
	 */
	chunkFilename?: ChunkFilename;
	/**
	 * The format of chunks (formats included by default are 'array-push' (web/WebWorker), 'commonjs' (node.js), 'module' (ESM), but others might be added by plugins).
	 */
	chunkFormat?: ChunkFormat;
	/**
	 * Number of milliseconds before chunk request expires.
	 */
	chunkLoadTimeout?: ChunkLoadTimeout;
	/**
	 * The method of loading chunks (methods included by default are 'jsonp' (web), 'import' (ESM), 'importScripts' (WebWorker), 'require' (sync node.js), 'async-node' (async node.js), but others might be added by plugins).
	 */
	chunkLoading?: ChunkLoading;
	/**
	 * The global variable used by webpack for loading of chunks.
	 */
	chunkLoadingGlobal?: ChunkLoadingGlobal;
	/**
	 * Clean the output directory before emit.
	 */
	clean?: Clean;
	/**
	 * Check if to be emitted file already exists and have the same content before writing to output filesystem.
	 */
	compareBeforeEmit?: CompareBeforeEmit;
	/**
	 * This option enables cross-origin loading of chunks.
	 */
	crossOriginLoading?: CrossOriginLoading;
	/**
	 * Specifies the filename template of non-initial output css files on disk. You must **not** specify an absolute path here, but the path may contain folders separated by '/'! The specified path is joined with the value of the 'output.path' option to determine the location on disk.
	 */
	cssChunkFilename?: CssChunkFilename;
	/**
	 * Specifies the filename template of output css files on disk. You must **not** specify an absolute path here, but the path may contain folders separated by '/'! The specified path is joined with the value of the 'output.path' option to determine the location on disk.
	 */
	cssFilename?: CssFilename;
	/**
	 * Compress the data in the head tag of CSS files.
	 */
	cssHeadDataCompression?: CssHeadDataCompression;
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
	 * Specifies the filename of output files on disk. You must **not** specify an absolute path here, but the path may contain folders separated by '/'! The specified path is joined with the value of the 'output.path' option to determine the location on disk.
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
	 * The filename of the Hot Update Main File. It is inside the 'output.path' directory.
	 */
	hotUpdateMainFilename?: HotUpdateMainFilename;
	/**
	 * Ignore warnings in the browser.
	 */
	ignoreBrowserWarnings?: boolean;
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
	 * The 'publicPath' specifies the public URL address of the output files when referenced in a browser.
	 */
	publicPath?: PublicPath;
	/**
	 * This option enables loading async chunks via a custom script type, such as script type="module".
	 */
	scriptType?: ScriptType;
	/**
	 * The filename of the SourceMaps for the JavaScript files. They are inside the 'output.path' directory.
	 */
	sourceMapFilename?: SourceMapFilename;
	/**
	 * Prefixes every line of the source in the bundle with this string.
	 */
	sourcePrefix?: SourcePrefix;
	/**
	 * Handles error in module loading correctly at a performance cost. This will handle module error compatible with the EcmaScript Modules spec.
	 */
	strictModuleErrorHandling?: StrictModuleErrorHandling;
	/**
	 * Handles exceptions in module loading correctly at a performance cost (Deprecated). This will handle module error compatible with the Node.js CommonJS way.
	 */
	strictModuleExceptionHandling?: StrictModuleExceptionHandling;
	/**
	 * Use a Trusted Types policy to create urls for chunks.
	 */
	trustedTypes?: TrustedTypes;
	/**
	 * A unique name of the webpack build to avoid multiple webpack runtimes to conflict when using globals.
	 */
	uniqueName?: UniqueName;
	/**
	 * The method of loading WebAssembly Modules (methods included by default are 'fetch' (web/WebWorker), 'async-node' (node.js), but others might be added by plugins).
	 */
	wasmLoading?: WasmLoading;
	/**
	 * The filename of WebAssembly modules as relative path inside the 'output.path' directory.
	 */
	webassemblyModuleFilename?: WebassemblyModuleFilename;
	/**
	 * The method of loading chunks (methods included by default are 'jsonp' (web), 'import' (ESM), 'importScripts' (WebWorker), 'require' (sync node.js), 'async-node' (async node.js), but others might be added by plugins).
	 */
	workerChunkLoading?: ChunkLoading;
	/**
	 * Worker public path. Much like the public path, this sets the location where the worker script file is intended to be found. If not set, webpack will use the publicPath. Don't set this option unless your worker scripts are located at a different path from your other script files.
	 */
	workerPublicPath?: WorkerPublicPath;
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
	experiments: ExperimentsNormalized;
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
	module: ModuleOptionsNormalized;
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
/**
 * Enables/Disables experiments (experimental features with relax SemVer compatibility).
 */
export interface ExperimentsExtra {
	/**
	 * Build http(s): urls using a lockfile and resource content cache.
	 */
	buildHttp?: HttpUriAllowedUris | HttpUriOptions;
	/**
	 * Enable css support.
	 */
	css?: boolean;
	/**
	 * Compile entrypoints and import()s only when they are accessed.
	 */
	lazyCompilation?: boolean | LazyCompilationOptions;
}
/**
 * Enables/Disables experiments (experimental features with relax SemVer compatibility).
 */
export interface ExperimentsNormalizedExtra {
	/**
	 * Build http(s): urls using a lockfile and resource content cache.
	 */
	buildHttp?: HttpUriOptions;
	/**
	 * Enable css support.
	 */
	css?: boolean;
	/**
	 * Compile entrypoints and import()s only when they are accessed.
	 */
	lazyCompilation?: false | LazyCompilationOptions;
}
/**
 * If an dependency matches exactly a property of the object, the property value is used as dependency.
 */
export interface ExternalItemObjectKnown {
	/**
	 * Specify externals depending on the layer.
	 */
	byLayer?:
		| {
				[k: string]: ExternalItem;
		  }
		| ((layer: string | null) => ExternalItem);
}
/**
 * If an dependency matches exactly a property of the object, the property value is used as dependency.
 */
export interface ExternalItemObjectUnknown {
	[k: string]: ExternalItemValue;
}
/**
 * Specify options for each generator.
 */
export interface GeneratorOptionsByModuleTypeKnown {
	/**
	 * Generator options for asset modules.
	 */
	asset?: AssetGeneratorOptions;
	/**
	 * Generator options for asset/inline modules.
	 */
	"asset/inline"?: AssetInlineGeneratorOptions;
	/**
	 * Generator options for asset/resource modules.
	 */
	"asset/resource"?: AssetResourceGeneratorOptions;
	/**
	 * Generator options for css modules.
	 */
	css?: CssGeneratorOptions;
	/**
	 * Generator options for css/auto modules.
	 */
	"css/auto"?: CssAutoGeneratorOptions;
	/**
	 * Generator options for css/global modules.
	 */
	"css/global"?: CssGlobalGeneratorOptions;
	/**
	 * Generator options for css/module modules.
	 */
	"css/module"?: CssModuleGeneratorOptions;
	/**
	 * No generator options are supported for this module type.
	 */
	javascript?: EmptyGeneratorOptions;
	/**
	 * No generator options are supported for this module type.
	 */
	"javascript/auto"?: EmptyGeneratorOptions;
	/**
	 * No generator options are supported for this module type.
	 */
	"javascript/dynamic"?: EmptyGeneratorOptions;
	/**
	 * No generator options are supported for this module type.
	 */
	"javascript/esm"?: EmptyGeneratorOptions;
}
/**
 * Specify options for each generator.
 */
export interface GeneratorOptionsByModuleTypeUnknown {
	/**
	 * Options for generating.
	 */
	[k: string]: {
		[k: string]: any;
	};
}
/**
 * Specify options for each parser.
 */
export interface ParserOptionsByModuleTypeKnown {
	/**
	 * Parser options for asset modules.
	 */
	asset?: AssetParserOptions;
	/**
	 * No parser options are supported for this module type.
	 */
	"asset/inline"?: EmptyParserOptions;
	/**
	 * No parser options are supported for this module type.
	 */
	"asset/resource"?: EmptyParserOptions;
	/**
	 * No parser options are supported for this module type.
	 */
	"asset/source"?: EmptyParserOptions;
	/**
	 * Parser options for css modules.
	 */
	css?: CssParserOptions;
	/**
	 * Parser options for css/auto modules.
	 */
	"css/auto"?: CssAutoParserOptions;
	/**
	 * Parser options for css/global modules.
	 */
	"css/global"?: CssGlobalParserOptions;
	/**
	 * Parser options for css/module modules.
	 */
	"css/module"?: CssModuleParserOptions;
	/**
	 * Parser options for javascript modules.
	 */
	javascript?: JavascriptParserOptions;
	/**
	 * Parser options for javascript modules.
	 */
	"javascript/auto"?: JavascriptParserOptions;
	/**
	 * Parser options for javascript modules.
	 */
	"javascript/dynamic"?: JavascriptParserOptions;
	/**
	 * Parser options for javascript modules.
	 */
	"javascript/esm"?: JavascriptParserOptions;
}
/**
 * Specify options for each parser.
 */
export interface ParserOptionsByModuleTypeUnknown {
	/**
	 * Options for parsing.
	 */
	[k: string]: {
		[k: string]: any;
	};
}
