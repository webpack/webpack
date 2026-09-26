/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Alexander Akait @alexander-akait
*/

// The options this plugin takes. `tooling/generate-schemas.js` derives the
// matching JSON schema from this file, so a change here is a change to what
// webpack validates, to its types and to its command line flags alike.

import {
	type AbsolutePath,
	type DevToolSpelling,
	type DottedIdentifier,
	type HttpUrl,
	type NonEmptyRelativePath,
	type NonEmptyString,
	type NonNegativeNumber,
	type PositiveNumber,
	type RelativePath
} from "./vocabulary";

/**
 * Set the value of `require.amd` and `define.amd`. Or disable AMD support.
 */
export type Amd =
	| /** You can pass `false` to disable AMD support. */ false
	| /** You can pass an object to set the value of `require.amd` and `define.amd`. */ {
			[key: string]: any;
	  };

/**
 * Add a container for define/require functions in the AMD module.
 */
export type AmdContainer = NonEmptyString;

/**
 * Filtering value, regexp or function.
 * @cliHelper
 */
export type AssetFilterItemTypes =
	| RegExp
	| RelativePath
	| import("../lib/stats/DefaultStatsFactoryPlugin").AssetFilterItemFn;

/**
 * Filtering modules.
 * @cliHelper
 */
export type AssetFilterTypes =
	| Array</** Rule to filter. @cliHelper */ AssetFilterItemTypes>
	| AssetFilterItemTypes;

/**
 * The options for data url generator.
 */
export type AssetGeneratorDataUrl =
	AssetGeneratorDataUrlOptions | AssetGeneratorDataUrlFunction;

/**
 * Function that executes for module and should return an DataUrl string. It can have a string as 'ident' property which contributes to the module hash.
 */
export type AssetGeneratorDataUrlFunction =
	import("../lib/asset/AssetGenerator").DataUrlFunction;

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
 * Generator options for asset modules.
 * @implements #/definitions/AssetInlineGeneratorOptions, #/definitions/AssetResourceGeneratorOptions
 * @publishes plugins/asset/AssetGeneratorOptions
 */
export type AssetGeneratorOptions = AssetInlineGeneratorOptions &
	AssetResourceGeneratorOptions;

/**
 * Generator options for asset/inline modules.
 * @publishes plugins/asset/AssetInlineGeneratorOptions
 */
export interface AssetInlineGeneratorOptions {
	/**
	 * Whether or not this asset module should be considered binary. This can be set to 'false' to treat this asset module as text.
	 */
	binary?: boolean;
	/**
	 * The options for data url generator.
	 */
	dataUrl?: AssetGeneratorDataUrl;
}

/**
 * The filename of asset modules as relative path inside the 'output.path' directory.
 */
export type AssetModuleFilename =
	| NonEmptyRelativePath
	| import("../lib/template/TemplatedPathPlugin").TemplatePathFn<
			import("../lib/Compilation").PathDataModule
	  >;

/**
 * Emit the asset in the specified folder relative to 'output.path'. This should only be needed when custom 'publicPath' is specified to match the folder structure there.
 */
export type AssetModuleOutputPath =
	| RelativePath
	| import("../lib/template/TemplatedPathPlugin").TemplatePathFn<
			import("../lib/Compilation").PathDataModule
	  >;

/**
 * Function that executes for module and should return whenever asset should be inlined as DataUrl.
 */
export type AssetParserDataUrlFunction =
	import("../lib/asset/AssetParser").AssetParserDataUrlFunction;

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
 * @publishes plugins/asset/AssetParserOptions
 */
export interface AssetParserOptions {
	/**
	 * The condition for inlining the asset as DataUrl.
	 */
	dataUrlCondition?: AssetParserDataUrlOptions | AssetParserDataUrlFunction;
}

/**
 * Generator options for asset/resource modules.
 * @publishes plugins/asset/AssetResourceGeneratorOptions
 */
export interface AssetResourceGeneratorOptions {
	/**
	 * Whether or not this asset module should be considered binary. This can be set to 'false' to treat this asset module as text.
	 */
	binary?: boolean;
	/**
	 * Emit an output asset from this asset module. This can be set to 'false' to omit emitting e. g. for SSR.
	 */
	emit?: boolean;
	/**
	 * The filename of asset modules as relative path inside the 'output.path' directory.
	 */
	filename?: AssetModuleFilename;
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
 * Add a comment in the UMD wrapper.
 */
export type AuxiliaryComment =
	| /** Append the same comment above each import style. */ string
	| LibraryCustomUmdCommentObject;

/**
 * Report the first error as a hard error instead of tolerating it.
 */
export type Bail = boolean;

/**
 * A build dependency for filesystem cache invalidation.
 * @since 5.111.0
 */
export type BuildDependencyItem =
	| /** Request to a dependency (resolved as directory relative to the context directory). */ NonEmptyString
	| {
			/**
			 * Request to a dependency (resolved as directory relative to the context directory).
			 */
			dependency: NonEmptyString;
			/**
			 * When true, the dependency may be missing. Existence changes invalidate the cache.
			 */
			optional?: boolean;
	  };

/**
 * Cache generated modules and chunks to improve performance for multiple incremental builds.
 */
export type CacheOptions =
	/** Enable in memory caching. */ true | CacheOptionsNormalized;

/**
 * Cache generated modules and chunks to improve performance for multiple incremental builds.
 */
export type CacheOptionsNormalized =
	/** Disable caching. */ false | MemoryCacheOptions | FileCacheOptions;

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
	("array-push" | "commonjs" | "module" | false) | string;

/**
 * Number of milliseconds before chunk request expires.
 */
export type ChunkLoadTimeout = number;

/**
 * The method of loading chunks (methods included by default are 'jsonp' (web), 'import' (ESM), 'importScripts' (WebWorker), 'require' (sync node.js), 'async-node' (async node.js), but others might be added by plugins).
 */
export type ChunkLoading = false | ChunkLoadingType;

/**
 * The global variable used by webpack for loading of chunks.
 */
export type ChunkLoadingGlobal = string;

/**
 * The method of loading chunks (methods included by default are 'jsonp' (web), 'import' (ESM), 'importScripts' (WebWorker), 'require' (sync node.js), 'async-node' (async node.js), but others might be added by plugins).
 */
export type ChunkLoadingType =
	("jsonp" | "import-scripts" | "require" | "async-node" | "import") | string;

/**
 * Clean the output directory before emit.
 */
export type Clean = boolean | CleanOptions;

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
	keep?: RegExp | RelativePath | import("../lib/output/CleanPlugin").KeepFn;
}

/**
 * Check if to be emitted file already exists and have the same content before writing to output filesystem.
 */
export type CompareBeforeEmit = boolean;

/**
 * Advanced options for module concatenation.
 * @since 5.109.0
 */
export interface ConcatenateModulesOptions {
	/**
	 * Also concatenate CommonJS modules with statically analyzable exports. Defaults to 'true'.
	 */
	commonjs?: boolean;
}

/**
 * The base directory (absolute path!) for resolving the `entry` option. If `output.pathinfo` is set, the included pathinfo is shortened to this directory.
 */
export type Context = AbsolutePath;

/**
 * Copy files and directories to the output directory.
 * @since 5.111.0
 */
export type Copy =
	| CopyPattern[]
	| /** Glob or path from where the files are copied. A glob separates with '/', matches dot files, and takes '*', '**', '?', '[]' and '{}'. */ NonEmptyString;

/**
 * Options of the glob in 'from'.
 */
export interface CopyGlobOptions {
	/**
	 * Whether the glob matches the case of a file name. Defaults to 'true'.
	 */
	caseSensitive?: boolean;
	/**
	 * How many directory levels below the base of the glob are read, where '1' reads only the base itself. Defaults to no limit.
	 */
	deep?: PositiveNumber;
	/**
	 * Whether the glob reaches a file or a directory whose name starts with a dot without naming it. Defaults to 'true'.
	 */
	dot?: boolean;
	/**
	 * Whether a symbolic link is resolved and copied as what it points at. Defaults to 'true'; 'false' copies the link itself, pointing where it already points.
	 */
	followSymlinks?: boolean;
	/**
	 * Globs of the files which are not copied, resolved like 'from'. A directory one of them matches is skipped whole.
	 */
	ignore?: Array</** Glob of the files which are not copied. */ NonEmptyString>;
}

/**
 * A pattern of files which are copied to the output directory.
 */
export interface CopyObjectPattern {
	/**
	 * Directory 'from' is resolved from and the copied paths are relative to. Defaults to the compiler context, and to what 'from' names when it is not a glob.
	 */
	context?: string;
	/**
	 * Filename template of a copied file inside 'to'. Defaults to '[path][base]', which keeps the name and the directory structure below 'from'.
	 */
	filename?:
		RelativePath | import("../lib/output/CopyPlugin").CopyFilenameFunction;
	/**
	 * Glob or path from where the files are copied.
	 */
	from:
		| /** Globs or paths from where the files are copied, in order. @minItems 1 */ Array</** Glob or path from where the files are copied. A glob separates with '/', matches dot files, and takes '*', '**', '?', '[]' and '{}'. */ NonEmptyString>
		| /** Glob or path from where the files are copied. A glob separates with '/', matches dot files, and takes '*', '**', '?', '[]' and '{}'. */ NonEmptyString;
	/**
	 * Options of the glob in 'from'.
	 */
	globOptions?: CopyGlobOptions;
	/**
	 * Asset info of a copied file.
	 */
	info?:
		| /** Asset info of a copied file. @additionalProperties @emptyProperties */ import("../lib/Compilation").AssetInfo
		| /** Asset info of a copied file, from the file itself. */ import("../lib/output/CopyPlugin").CopyInfoFunction;
	/**
	 * Whether a copied file keeps the permissions of the file it was copied from. Defaults to 'false', which gives it the ones a new file gets. Has no effect on Windows.
	 */
	preservePermissions?: boolean;
	/**
	 * Whether a copied file keeps the access and modification times of the file it was copied from. Defaults to 'false', which stamps it with the time it was written.
	 */
	preserveTimestamps?: boolean;
	/**
	 * Directory the files are copied to, relative to 'output.path', which is where they land by default.
	 */
	to?:
		| /** Directory the files are copied to, relative to 'output.path', which is where they land by default. */ RelativePath
		| /** Directory a copied file is copied to, relative to 'output.path', from the file itself. */ import("../lib/output/CopyPlugin").CopyToFunction;
	/**
	 * Modifies the content of a copied file.
	 */
	transform?:
		| /** Modifies the content of a copied file, and says how the result is cached. */ {
				/**
				 * Whether the result of the transform is cached, and what it is cached under. Defaults to 'true'.
				 */
				cache?:
					| /** Whether the result of the transform is cached. */ boolean
					| /** What the result of the transform is cached under, beside the content of the file. */ {
							/**
							 * Everything beside the content of the file the transform depends on, serialized into the cache key as JSON.
							 */
							keys?:
								| /** Everything beside the content of the file the transform depends on, serialized into the cache key as JSON. @additionalProperties @emptyProperties */ import("../lib/output/CopyPlugin").CopyTransformCacheKeys
								| /** Everything beside the content of the file the transform depends on, from the file itself. */ import("../lib/output/CopyPlugin").CopyTransformCacheKeysFunction;
					  };
				/**
				 * Modifies the content of a copied file.
				 */
				transformer: import("../lib/output/CopyPlugin").CopyTransform;
		  }
		| /** Modifies the content of a copied file. */ import("../lib/output/CopyPlugin").CopyTransform;
}

/**
 * Patterns of files which are copied to the output directory, and the options of the copying itself.
 */
export interface CopyOptions {
	/**
	 * Maximum number of files which are read at the same time. Defaults to '100'.
	 */
	concurrency?: PositiveNumber;
	/**
	 * Patterns of files which are copied to the output directory.
	 * @cliExclude
	 */
	patterns: CopyPatterns;
	/**
	 * Stage of 'processAssets' the files are copied at. Defaults to 'Compilation.PROCESS_ASSETS_STAGE_ADDITIONAL', where a copied file is still minimized and compressed like every other asset; a later stage leaves it as it is on disk.
	 */
	stage?: number;
}

/**
 * A glob or a path of files which are copied to the output directory.
 */
export type CopyPattern =
	| /** Glob or path from where the files are copied. A glob separates with '/', matches dot files, and takes '*', '**', '?', '[]' and '{}'. */ NonEmptyString
	| CopyObjectPattern;

/**
 * Patterns of files which are copied to the output directory.
 * @cliExclude
 */
export type CopyPatterns = CopyPattern[];

/**
 * This option enables cross-origin loading of chunks.
 */
export type CrossOriginLoading = false | "anonymous" | "use-credentials";

/**
 * Parser options for css/auto and css/module modules.
 * @publishes plugins/css/CssAutoOrModuleParserOptions
 */
export interface CssAutoOrModuleParserOptions {
	/**
	 * Enable/disable renaming of `@keyframes`.
	 */
	animation?: CssParserAnimation;
	/**
	 * Configure how the CSS source is parsed: as a full stylesheet (default) or as a block's contents (e.g. the content of an HTML `style` attribute).
	 */
	as?: CssParserAs;
	/**
	 * Enable/disable renaming of `@container` names.
	 */
	container?: CssParserContainer;
	/**
	 * Enable/disable renaming of custom identifiers.
	 */
	customIdents?: CssParserCustomIdents;
	/**
	 * Enable/disable resolution of `@custom-media` at-rules (file-local build-time substitution).
	 * @since 5.109.0
	 */
	customMedia?: CssParserCustomMedia;
	/**
	 * Enable/disable resolution of `@custom-selector` at-rules (file-local build-time expansion to `:is(...)`).
	 * @since 5.109.0
	 */
	customSelectors?: CssParserCustomSelectors;
	/**
	 * Enable/disable renaming of dashed identifiers, e. g. custom properties.
	 */
	dashedIdents?: CssParserDashedIdents;
	/**
	 * Configure how CSS content is exported as default.
	 */
	exportType?: CssParserExportType;
	/**
	 * Auto-emit `<link rel="preload" as="font">` for the primary `src` URL of each `@font-face` reachable from an HTML entry's initial CSS. Only the first URL per `@font-face` is preloaded (preloading every format would double-download). Off by default; `parser.css.urlHints` rules and per-URL magic comments still override the seeded defaults. Set `output.crossOriginLoading` so the preload matches the font's CORS fetch.
	 * @since 5.109.0
	 */
	fontPreload?: CssParserFontPreload;
	/**
	 * Enable/disable renaming of `@function` names.
	 */
	function?: CssParserFunction;
	/**
	 * Enable/disable renaming of grid identifiers.
	 */
	grid?: CssParserGrid;
	/**
	 * Enable/disable `@import` at-rules handling.
	 */
	import?: CssParserImport;
	/**
	 * Use ES modules named export for css exports.
	 */
	namedExports?: CssParserNamedExports;
	/**
	 * Enable strict pure mode: every selector must contain at least one local class or id selector.
	 */
	pure?: CssParserPure;
	/**
	 * Enable/disable `url()`/`image-set()`/`src()`/`image()` functions handling.
	 */
	url?: CssParserUrl;
	/**
	 * URL-referenced-asset default hint rules for this parser (JavaScript `new URL(...)`, CSS `url(...)`, HTML `<img src>` / `<link href>` / `<script src>`).
	 * @since 5.109.0
	 */
	urlHints?: UrlHints;
}

/**
 * Specifies the filename template of non-initial output css files on disk. You must **not** specify an absolute path here, but the path may contain folders separated by '/'! The specified path is joined with the value of the 'output.path' option to determine the location on disk.
 */
export type CssChunkFilename = FilenameTemplate;

/**
 * Specifies the filename template of output css files on disk. You must **not** specify an absolute path here, but the path may contain folders separated by '/'! The specified path is joined with the value of the 'output.path' option to determine the location on disk.
 */
export type CssFilename = FilenameTemplate;

/**
 * Configure the generated JS modules that use the ES modules syntax.
 */
export type CssGeneratorEsModule = boolean;

/**
 * Specifies the convention of exported names.
 */
export type CssGeneratorExportsConvention =
	| ("as-is" | "camel-case" | "camel-case-only" | "dashes" | "dashes-only")
	| import("../lib/dependencies/css/CssIcssExportDependency").ExportsConventionFn;

/**
 * Avoid generating and loading a stylesheet and only embed exports from css into output javascript files.
 */
export type CssGeneratorExportsOnly = boolean;

/**
 * Configure the generated local ident name.
 */
export type CssGeneratorLocalIdentName =
	| string
	| import("../lib/template/TemplatedPathPlugin").TemplatePathFn<
			import("../lib/Compilation").PathDataModule
	  >;

/**
 * Generator options for css modules.
 * @publishes plugins/css/CssGeneratorOptions
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
 * Generator options for css/module modules.
 * @publishes plugins/css/CssModuleGeneratorOptions
 */
export interface CssModuleGeneratorOptions {
	/**
	 * Configure the generated JS modules that use the ES modules syntax.
	 */
	esModule?: CssGeneratorEsModule;
	/**
	 * Configure how CSS content is exported as default.
	 */
	exportType?: CssParserExportType;
	/**
	 * Specifies the convention of exported names.
	 */
	exportsConvention?: CssGeneratorExportsConvention;
	/**
	 * Avoid generating and loading a stylesheet and only embed exports from css into output javascript files.
	 */
	exportsOnly?: CssGeneratorExportsOnly;
	/**
	 * Digest types used for the hash.
	 */
	localIdentHashDigest?: HashDigest;
	/**
	 * Number of chars which are used for the hash.
	 */
	localIdentHashDigestLength?: HashDigestLength;
	/**
	 * Algorithm used for generation the hash (see node.js crypto package).
	 */
	localIdentHashFunction?: HashFunction;
	/**
	 * Any string which is added to the hash to salt it.
	 */
	localIdentHashSalt?: HashSalt;
	/**
	 * Configure the generated local ident name.
	 */
	localIdentName?: CssGeneratorLocalIdentName;
}

/**
 * Parser options for css/global modules.
 * @publishes plugins/css/CssModuleParserOptions
 */
export interface CssModuleParserOptions {
	/**
	 * Enable/disable renaming of `@keyframes`.
	 */
	animation?: CssParserAnimation;
	/**
	 * Configure how the CSS source is parsed: as a full stylesheet (default) or as a block's contents (e.g. the content of an HTML `style` attribute).
	 */
	as?: CssParserAs;
	/**
	 * Enable/disable renaming of `@container` names.
	 */
	container?: CssParserContainer;
	/**
	 * Enable/disable renaming of custom identifiers.
	 */
	customIdents?: CssParserCustomIdents;
	/**
	 * Enable/disable resolution of `@custom-media` at-rules (file-local build-time substitution).
	 * @since 5.109.0
	 */
	customMedia?: CssParserCustomMedia;
	/**
	 * Enable/disable resolution of `@custom-selector` at-rules (file-local build-time expansion to `:is(...)`).
	 * @since 5.109.0
	 */
	customSelectors?: CssParserCustomSelectors;
	/**
	 * Enable/disable renaming of dashed identifiers, e. g. custom properties.
	 */
	dashedIdents?: CssParserDashedIdents;
	/**
	 * Configure how CSS content is exported as default.
	 */
	exportType?: CssParserExportType;
	/**
	 * Auto-emit `<link rel="preload" as="font">` for the primary `src` URL of each `@font-face` reachable from an HTML entry's initial CSS. Only the first URL per `@font-face` is preloaded (preloading every format would double-download). Off by default; `parser.css.urlHints` rules and per-URL magic comments still override the seeded defaults. Set `output.crossOriginLoading` so the preload matches the font's CORS fetch.
	 * @since 5.109.0
	 */
	fontPreload?: CssParserFontPreload;
	/**
	 * Enable/disable renaming of `@function` names.
	 */
	function?: CssParserFunction;
	/**
	 * Enable/disable renaming of grid identifiers.
	 */
	grid?: CssParserGrid;
	/**
	 * Enable/disable `@import` at-rules handling.
	 */
	import?: CssParserImport;
	/**
	 * Use ES modules named export for css exports.
	 */
	namedExports?: CssParserNamedExports;
	/**
	 * Enable/disable `url()`/`image-set()`/`src()`/`image()` functions handling.
	 */
	url?: CssParserUrl;
	/**
	 * URL-referenced-asset default hint rules for this parser (JavaScript `new URL(...)`, CSS `url(...)`, HTML `<img src>` / `<link href>` / `<script src>`).
	 * @since 5.109.0
	 */
	urlHints?: UrlHints;
}

/**
 * Enable/disable renaming of `@keyframes`.
 */
export type CssParserAnimation = boolean;

/**
 * Configure how the CSS source is parsed: as a full stylesheet (default) or as a block's contents (e.g. the content of an HTML `style` attribute).
 */
export type CssParserAs = "stylesheet" | "block-contents";

/**
 * Enable/disable renaming of `@container` names.
 */
export type CssParserContainer = boolean;

/**
 * Enable/disable renaming of custom identifiers.
 */
export type CssParserCustomIdents = boolean;

/**
 * Enable/disable resolution of `@custom-media` at-rules (file-local build-time substitution).
 * @since 5.109.0
 */
export type CssParserCustomMedia = boolean;

/**
 * Enable/disable resolution of `@custom-selector` at-rules (file-local build-time expansion to `:is(...)`).
 * @since 5.109.0
 */
export type CssParserCustomSelectors = boolean;

/**
 * Enable/disable renaming of dashed identifiers, e. g. custom properties.
 */
export type CssParserDashedIdents = boolean;

/**
 * Configure how CSS content is exported as default.
 */
export type CssParserExportType = "link" | "text" | "css-style-sheet" | "style";

/**
 * Auto-emit `<link rel="preload" as="font">` for the primary `src` URL of each `@font-face` reachable from an HTML entry's initial CSS. Only the first URL per `@font-face` is preloaded (preloading every format would double-download). Off by default; `parser.css.urlHints` rules and per-URL magic comments still override the seeded defaults. Set `output.crossOriginLoading` so the preload matches the font's CORS fetch.
 * @since 5.109.0
 */
export type CssParserFontPreload = boolean;

/**
 * Enable/disable renaming of `@function` names.
 */
export type CssParserFunction = boolean;

/**
 * Enable/disable renaming of grid identifiers.
 */
export type CssParserGrid = boolean;

/**
 * Enable/disable `@import` at-rules handling.
 */
export type CssParserImport = boolean;

/**
 * Use ES modules named export for css exports.
 */
export type CssParserNamedExports = boolean;

/**
 * Parser options for css modules.
 * @publishes plugins/css/CssParserOptions
 */
export interface CssParserOptions {
	/**
	 * Configure how the CSS source is parsed: as a full stylesheet (default) or as a block's contents (e.g. the content of an HTML `style` attribute).
	 */
	as?: CssParserAs;
	/**
	 * Enable/disable resolution of `@custom-media` at-rules (file-local build-time substitution).
	 * @since 5.109.0
	 */
	customMedia?: CssParserCustomMedia;
	/**
	 * Enable/disable resolution of `@custom-selector` at-rules (file-local build-time expansion to `:is(...)`).
	 * @since 5.109.0
	 */
	customSelectors?: CssParserCustomSelectors;
	/**
	 * Configure how CSS content is exported as default.
	 */
	exportType?: CssParserExportType;
	/**
	 * Auto-emit `<link rel="preload" as="font">` for the primary `src` URL of each `@font-face` reachable from an HTML entry's initial CSS. Only the first URL per `@font-face` is preloaded (preloading every format would double-download). Off by default; `parser.css.urlHints` rules and per-URL magic comments still override the seeded defaults. Set `output.crossOriginLoading` so the preload matches the font's CORS fetch.
	 * @since 5.109.0
	 */
	fontPreload?: CssParserFontPreload;
	/**
	 * Enable/disable `@import` at-rules handling.
	 */
	import?: CssParserImport;
	/**
	 * Use ES modules named export for css exports.
	 */
	namedExports?: CssParserNamedExports;
	/**
	 * Enable/disable `url()`/`image-set()`/`src()`/`image()` functions handling.
	 */
	url?: CssParserUrl;
	/**
	 * URL-referenced-asset default hint rules for this parser (JavaScript `new URL(...)`, CSS `url(...)`, HTML `<img src>` / `<link href>` / `<script src>`).
	 * @since 5.109.0
	 */
	urlHints?: UrlHints;
}

/**
 * Enable strict pure mode: every selector must contain at least one local class or id selector.
 */
export type CssParserPure = boolean;

/**
 * Enable/disable `url()`/`image-set()`/`src()`/`image()` functions handling.
 */
export type CssParserUrl = boolean;

/**
 * Options for defer import.
 */
export type DeferImportExperimentOptions = boolean;

/**
 * References to other configurations to depend on.
 */
export type Dependencies =
	Array</** References to another configuration to depend on. */ string>;

/**
 * Options for the webpack-dev-server.
 */
export type DevServer =
	| /** Disable dev server. */ false
	| /** Options for the webpack-dev-server. */ { [key: string]: any };

/**
 * A developer tool to enhance debugging (false | eval | [inline-|hidden-|eval-][nosources-][cheap-[module-]]source-map).
 */
export type DevTool =
	| Array</** Allow to assign devtool values per asset type (all, javascript, or css). */ {
			/**
			 * Which asset type should receive this devtool value.
			 */
			type: "all" | "javascript" | "css";
			/**
			 * A developer tool to enhance debugging (false | eval | [inline-|hidden-|eval-][nosources-][cheap-[module-]]source-map).
			 */
			use: RawDevTool;
	  }>
	| RawDevTool;

/**
 * Similar to `output.devtoolModuleFilenameTemplate`, but used in the case of duplicate module identifiers.
 */
export type DevtoolFallbackModuleFilenameTemplate =
	| string
	| import("../lib/devtool/ModuleFilenameHelpers").ModuleFilenameTemplateFunction;

/**
 * Filename template string of function for the sources array in a generated SourceMap.
 */
export type DevtoolModuleFilenameTemplate =
	| string
	| import("../lib/devtool/ModuleFilenameHelpers").ModuleFilenameTemplateFunction;

/**
 * Module namespace to use when interpolating filename template string for the sources array in a generated SourceMap. Defaults to `output.library` if not set. It's useful for avoiding runtime collisions in sourcemaps from multiple webpack projects built as libraries.
 */
export type DevtoolNamespace = string;

/**
 * Enable and configure the Dotenv plugin to load environment variables from .env files.
 */
export type Dotenv =
	| /** Enable Dotenv plugin with default options. */ boolean
	| DotenvPluginOptions;

/**
 * Options for Dotenv plugin.
 */
export interface DotenvPluginOptions {
	/**
	 * The directory from which .env files are loaded. Can be an absolute path, false will disable the .env file loading.
	 */
	dir?: false | AbsolutePath;
	/**
	 * Only expose environment variables that start with these prefixes. Defaults to 'WEBPACK_'.
	 */
	prefix?:
		| Array</** A prefix that environment variables must start with to be exposed. */ NonEmptyString>
		| NonEmptyString;
	/**
	 * Template patterns for .env file names. Use [mode] as placeholder for the webpack mode. Defaults to ['.env', '.env.local', '.env.[mode]', '.env.[mode].local'].
	 */
	template?: Array</** A template pattern for .env file names. */ NonEmptyString>;
}

/**
 * No generator options are supported for this module type.
 */
export type EmptyGeneratorOptions = {};

/**
 * No parser options are supported for this module type.
 */
export type EmptyParserOptions = {};

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
 * The entry point(s) of the compilation.
 */
export type Entry = EntryDynamic | EntryStatic;

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
	dependOn?:
		| /** The entrypoints that the current entrypoint depend on. They must be loaded when this entrypoint is loaded. @uniqueItems true @minItems 1 */ Array</** An entrypoint that the current entrypoint depend on. It must be loaded when this entrypoint is loaded. */ NonEmptyString>
		| /** An entrypoint that the current entrypoint depend on. It must be loaded when this entrypoint is loaded. */ NonEmptyString;
	/**
	 * Specifies the filename of the output file on disk. You must **not** specify an absolute path here, but the path may contain folders separated by '/'! The specified path is joined with the value of the 'output.path' option to determine the location on disk.
	 */
	filename?: EntryFilename;
	/**
	 * Generate an HTML file for this entrypoint with its JS and CSS output chunks injected. An object overrides `output.html` option by option for this entry; `inline` is resolved once per generated page and can only be set on `output.html`.
	 */
	html?: boolean | OutputHtmlOptions;
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
	/**
	 * Mark this entry as a worker so its output file uses 'output.workerChunkFilename'.
	 */
	worker?: boolean;
}

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
	 * @uniqueItems true
	 * @minItems 1
	 */
	dependOn?: Array</** An entrypoint that the current entrypoint depend on. It must be loaded when this entrypoint is loaded. */ NonEmptyString>;
	/**
	 * Specifies the filename of output files on disk. You must **not** specify an absolute path here, but the path may contain folders separated by '/'! The specified path is joined with the value of the 'output.path' option to determine the location on disk.
	 */
	filename?: Filename;
	/**
	 * Generate an HTML file for this entrypoint with its JS and CSS output chunks injected. An object overrides `output.html` option by option for this entry; `inline` is resolved once per generated page and can only be set on `output.html`.
	 */
	html?: boolean | OutputHtmlOptions;
	/**
	 * Module(s) that are loaded upon startup. The last one is exported.
	 * @uniqueItems true
	 * @minItems 1
	 */
	import?: Array</** Module that is loaded upon startup. Only the last one is exported. */ NonEmptyString>;
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
	/**
	 * Mark this entry as a worker so its output file uses 'output.workerChunkFilename'.
	 */
	worker?: boolean;
}

/**
 * A Function returning an entry object, an entry string, an entry array or a promise to these things.
 */
export type EntryDynamic =
	import("../lib/entry/DynamicEntryPlugin").RawEntryDynamic;

/**
 * A Function returning a Promise resolving to a normalized entry.
 */
export type EntryDynamicNormalized =
	import("../lib/entry/DynamicEntryPlugin").EntryDynamic;

/**
 * Specifies the filename of the output file on disk. You must **not** specify an absolute path here, but the path may contain folders separated by '/'! The specified path is joined with the value of the 'output.path' option to determine the location on disk.
 */
export type EntryFilename = FilenameTemplate;

/**
 * Module(s) that are loaded upon startup.
 */
export type EntryItem =
	| /** All modules are loaded upon startup. The last one is exported. @uniqueItems true @minItems 1 */ Array</** A module that is loaded upon startup. Only the last one is exported. */ NonEmptyString>
	| /** The string is resolved to a module which is loaded upon startup. */ NonEmptyString;

/**
 * The entry point(s) of the compilation.
 */
export type EntryNormalized = EntryDynamicNormalized | EntryStaticNormalized;

/**
 * Multiple entry bundles are created. The key is the entry name. The value can be a string, an array or an entry description object.
 */
export type EntryObject = {
	/**
	 * An entry point with name.
	 */
	[key: string]: EntryItem | EntryDescription;
};

/**
 * The name of the runtime chunk. If set a runtime chunk with this name is created or an existing entrypoint is used as runtime.
 */
export type EntryRuntime = false | NonEmptyString;

/**
 * A static entry description.
 */
export type EntryStatic = EntryObject | EntryUnnamed;

/**
 * Multiple entry bundles are created. The key is the entry name. The value is an entry description object.
 */
export type EntryStaticNormalized = {
	/**
	 * An object with entry point description.
	 */
	[key: string]: EntryDescriptionNormalized;
};

/**
 * An entry point without name.
 */
export type EntryUnnamed = EntryItem;

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
	 * The environment supports deferred module evaluation ('import defer * as ns from "..."', 'import.defer("...")').
	 * @since 5.110.0
	 * @experimental
	 */
	deferImport?: boolean;
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
	 * The environment supports generator functions and yield ('function* () { yield ... }').
	 * @since 5.109.0
	 */
	generator?: boolean;
	/**
	 * The environment supports 'globalThis'.
	 */
	globalThis?: boolean;
	/**
	 * The environment supports 'Object.hasOwn'.
	 */
	hasOwn?: boolean;
	/**
	 * The environment supports `import.meta.dirname` and `import.meta.filename`.
	 */
	importMetaDirnameAndFilename?: boolean;
	/**
	 * The environment supports let for variable declarations.
	 */
	let?: boolean;
	/**
	 * The environment supports logical assignment operators ('a ||= b', 'a &&= b', 'a ??= b').
	 */
	logicalAssignment?: boolean;
	/**
	 * The environment supports object method shorthand ('{ module() {} }').
	 */
	methodShorthand?: boolean;
	/**
	 * The environment supports EcmaScript Module syntax to import EcmaScript modules (import ... from '...').
	 */
	module?: boolean;
	/**
	 * The environment supports `<link rel="modulepreload">` to preload EcmaScript modules.
	 * @since 5.109.0
	 */
	modulePreload?: boolean;
	/**
	 * The environment supports `process.getBuiltinModule()` to synchronously load Node.js core modules.
	 */
	nodeBuiltinModuleGetter?: boolean;
	/**
	 * The environment supports `node:` prefix for Node.js core modules.
	 */
	nodePrefixForCoreModules?: boolean;
	/**
	 * The environment supports optional chaining ('obj?.a' or 'obj?.()').
	 */
	optionalChaining?: boolean;
	/**
	 * The environment supports source phase imports ('import source m from "..."', 'import.source("...")').
	 * @since 5.110.0
	 * @experimental
	 */
	sourceImport?: boolean;
	/**
	 * The environment supports spread and rest in array/object literals and calls ('{ ...obj }', 'fn(...args)').
	 */
	spread?: boolean;
	/**
	 * The environment supports 'Symbol' (and well-known symbols like 'Symbol.toStringTag').
	 */
	symbol?: boolean;
	/**
	 * The environment supports template literals.
	 */
	templateLiteral?: boolean;
	/**
	 * The environment supports top-level await ('await x' at the top level of a module).
	 * @since 5.111.0
	 */
	topLevelAwait?: boolean;
}

/**
 * Enables/Disables experiments (experimental features with relax SemVer compatibility).
 * @additionalProperties
 */
export interface Experiments {
	/**
	 * Support WebAssembly as asynchronous EcmaScript Module. `"auto"` (the default) enables it unless a loader is registered for WebAssembly files.
	 * @since 5.0.0
	 * @experimental
	 */
	asyncWebAssembly?:
		| /** Enable the built-in async WebAssembly support only when no loader is registered for WebAssembly files. */ "auto"
		| /** Enable/disable the built-in async WebAssembly support. */ boolean;
	/**
	 * Enable backward-compat layer with deprecation warnings for many webpack 4 APIs.
	 * @since 5.62.0
	 * @experimental
	 */
	backCompat?: boolean;
	/**
	 * Build http(s): urls using a lockfile and resource content cache.
	 * @since 5.49.0
	 * @experimental
	 */
	buildHttp?: HttpUriAllowedUris | HttpUriOptions;
	/**
	 * Enable additional in memory caching of modules that are unchanged and reference only unchanged modules.
	 * @since 5.54.0
	 * @experimental
	 */
	cacheUnaffected?: boolean;
	/**
	 * Enable css support. `"auto"` (the default) enables the built-in CSS support unless a loader is registered for CSS files.
	 * @since 5.66.0
	 * @experimental
	 */
	css?:
		| /** Enable the built-in CSS support only when no loader is registered for CSS files. */ "auto"
		| /** Enable/disable the built-in CSS support. */ boolean;
	/**
	 * Enable experimental tc39 proposal https://github.com/tc39/proposal-defer-import-eval. This allows to defer execution of a module until it's first use.
	 * @since 5.100.0
	 * @experimental
	 */
	deferImport?: boolean;
	/**
	 * Apply defaults of next major version.
	 * @since 5.53.0
	 * @experimental
	 */
	futureDefaults?: boolean;
	/**
	 * Enable HTML entry support. Treats `.html` files as a first-class module type so they can be used directly as entry points. `"auto"` (the default) enables it unless a loader is registered for HTML files.
	 * @since 5.107.0
	 * @experimental
	 */
	html?:
		| /** Enable the built-in HTML support only when no loader is registered for HTML files. */ "auto"
		| /** Enable/disable the built-in HTML support. */ boolean;
	/**
	 * Compile entrypoints and import()s only when they are accessed.
	 * @since 5.17.0
	 * @experimental
	 */
	lazyCompilation?: boolean | LazyCompilationOptions;
	/**
	 * Enable experimental tc39 proposal https://github.com/tc39/proposal-source-phase-imports. This allows importing modules at source phase.
	 * @since 5.106.0
	 * @experimental
	 */
	sourceImport?: boolean;
	/**
	 * Support WebAssembly as synchronous EcmaScript Module (outdated).
	 * @since 5.0.0
	 * @experimental
	 */
	syncWebAssembly?: boolean;
	/**
	 * Enable typescript support. `"auto"` (the default) enables the built-in TypeScript support when Node.js supports it (>= 22.6) and no loader is registered for TypeScript files.
	 * @since 5.107.0
	 * @experimental
	 */
	typescript?:
		| /** Enable the built-in TypeScript support only when Node.js supports it (>= 22.6) and no loader is registered for TypeScript files. */ "auto"
		| /** Enable/disable the built-in TypeScript support. */ boolean;
	[key: string]: any;
}

/**
 * Enables/Disables experiments (experimental features with relax SemVer compatibility).
 */
export interface ExperimentsNormalized {
	/**
	 * Support WebAssembly as asynchronous EcmaScript Module. `"auto"` (the default) enables it unless a loader is registered for WebAssembly files.
	 * @since 5.0.0
	 * @experimental
	 */
	asyncWebAssembly?:
		| /** Enable the built-in async WebAssembly support only when no loader is registered for WebAssembly files. */ "auto"
		| /** Enable/disable the built-in async WebAssembly support. */ boolean;
	/**
	 * Enable backward-compat layer with deprecation warnings for many webpack 4 APIs.
	 * @since 5.62.0
	 * @experimental
	 */
	backCompat?: boolean;
	/**
	 * Build http(s): urls using a lockfile and resource content cache.
	 * @since 5.49.0
	 * @experimental
	 */
	buildHttp?: HttpUriOptions;
	/**
	 * Enable additional in memory caching of modules that are unchanged and reference only unchanged modules.
	 * @since 5.54.0
	 * @experimental
	 */
	cacheUnaffected?: boolean;
	/**
	 * Enable css support. `"auto"` (the default) enables the built-in CSS support unless a loader is registered for CSS files.
	 * @since 5.66.0
	 * @experimental
	 */
	css?:
		| /** Enable the built-in CSS support only when no loader is registered for CSS files. */ "auto"
		| /** Enable/disable the built-in CSS support. */ boolean;
	/**
	 * Enable experimental tc39 proposal https://github.com/tc39/proposal-defer-import-eval. This allows to defer execution of a module until it's first use.
	 * @since 5.100.0
	 * @experimental
	 */
	deferImport?: boolean;
	/**
	 * Apply defaults of next major version.
	 * @since 5.53.0
	 * @experimental
	 */
	futureDefaults?: boolean;
	/**
	 * Enable HTML entry support. Treats `.html` files as a first-class module type so they can be used directly as entry points. `"auto"` (the default) enables it unless a loader is registered for HTML files.
	 * @since 5.107.0
	 * @experimental
	 */
	html?:
		| /** Enable the built-in HTML support only when no loader is registered for HTML files. */ "auto"
		| /** Enable/disable the built-in HTML support. */ boolean;
	/**
	 * Compile entrypoints and import()s only when they are accessed.
	 * @since 5.17.0
	 * @experimental
	 */
	lazyCompilation?: false | LazyCompilationOptions;
	/**
	 * Enable experimental tc39 proposal https://github.com/tc39/proposal-source-phase-imports. This allows importing modules at source phase.
	 * @since 5.106.0
	 * @experimental
	 */
	sourceImport?: boolean;
	/**
	 * Support WebAssembly as synchronous EcmaScript Module (outdated).
	 * @since 5.0.0
	 * @experimental
	 */
	syncWebAssembly?: boolean;
	/**
	 * Enable typescript support. `"auto"` (the default) enables the built-in TypeScript support when Node.js supports it (>= 22.6) and no loader is registered for TypeScript files.
	 * @since 5.107.0
	 * @experimental
	 */
	typescript?:
		| /** Enable the built-in TypeScript support only when Node.js supports it (>= 22.6) and no loader is registered for TypeScript files. */ "auto"
		| /** Enable/disable the built-in TypeScript support. */ boolean;
}

/**
 * Extend configuration from another configuration (only works when using webpack-cli).
 */
export type Extends = ExtendsItem[] | ExtendsItem;

/**
 * Path to the configuration to be extended (only works when using webpack-cli).
 */
export type ExtendsItem = string;

/**
 * Specify dependency that shouldn't be resolved by webpack, but should become dependencies of the resulting bundle. The kind of the dependency depends on `output.libraryTarget`.
 */
export type ExternalItem =
	| /** Every matched dependency becomes external. */ RegExp
	| /** An exact matched dependency becomes external. The same string is used as external dependency. */ string
	| ExternalItemObject
	| ExternalItemFunction;

/**
 * The function is called on each dependency.
 */
export type ExternalItemFunction =
	ExternalItemFunctionCallback | ExternalItemFunctionPromise;

/**
 * The function is called on each dependency (`function(context, request, callback(err, result))`).
 */
export type ExternalItemFunctionCallback =
	import("../lib/externals/ExternalModuleFactoryPlugin").ExternalItemFunctionCallback;

/**
 * The function is called on each dependency (`function(context, request)`).
 */
export type ExternalItemFunctionPromise =
	import("../lib/externals/ExternalModuleFactoryPlugin").ExternalItemFunctionPromise;

/**
 * How an external's exports interoperate with ES module imports, independent of the importing module's strictness (similar to Rollup's `output.interop`). 'default': treat as CommonJS, the default import is the whole exports (Node.js semantics). 'esModule': treat as an ES module namespace, the default import is unboxed to `.default`.
 * @since 5.109.0
 */
export type ExternalItemInterop = "default" | "esModule";

/**
 * If an dependency matches exactly a property of the object, the property value is used as dependency.
 */
export interface ExternalItemObjectKnown {
	/**
	 * Specify externals depending on the layer.
	 */
	byLayer?:
		| {
				[key: string]: ExternalItem;
		  }
		| import("../lib/externals/ExternalModuleFactoryPlugin").ExternalItemByLayerFn;
}

/**
 * If an dependency matches exactly a property of the object, the property value is used as dependency.
 */
export interface ExternalItemObjectUnknown {
	[key: string]: ExternalItemValue;
}

/**
 * If an dependency matches exactly a property of the object, the property value is used as dependency.
 */
export type ExternalItemObject = ExternalItemObjectKnown &
	ExternalItemObjectUnknown;

/**
 * Whether importing the external has side effects (like the `sideEffects` flag in a package.json). `false` allows webpack to drop the external when none of its exports are used. Defaults to `true`, as webpack can't analyze an external.
 * @since 5.110.0
 */
export type ExternalItemSideEffects = boolean;

/**
 * The dependency used for the external.
 */
export type ExternalItemValue =
	ExternalItemValueTarget | ExternalItemValueWithOptions;

/**
 * The target of the external with a type, optionally with an 'interop' hint describing how its exports interoperate with ES module imports.
 */
export interface ExternalItemValueObjectKnown {
	/**
	 * How an external's exports interoperate with ES module imports, independent of the importing module's strictness (similar to Rollup's `output.interop`). 'default': treat as CommonJS, the default import is the whole exports (Node.js semantics). 'esModule': treat as an ES module namespace, the default import is unboxed to `.default`.
	 * @since 5.109.0
	 */
	interop?: ExternalItemInterop;
}

/**
 * The target of the external with a type, optionally with an 'interop' hint describing how its exports interoperate with ES module imports.
 */
export interface ExternalItemValueObjectUnknown {
	/**
	 * The target of the external for a specific external type.
	 */
	[key: string]:
		| Array</** A part of the target of the external. */ NonEmptyString>
		| /** The target of the external. */ string;
}

/**
 * The target of the external with a type, optionally with an 'interop' hint describing how its exports interoperate with ES module imports.
 */
export type ExternalItemValueObject = ExternalItemValueObjectKnown &
	ExternalItemValueObjectUnknown;

/**
 * The target of the external.
 */
export type ExternalItemValueTarget =
	| Array</** A part of the target of the external. */ NonEmptyString>
	| /** `true`: The dependency name is used as target of the external. */ boolean
	| /** The target of the external. */ string
	| ExternalItemValueObject;

/**
 * The target of the external together with options describing how webpack should treat it.
 * @since 5.110.0
 */
export interface ExternalItemValueWithOptions {
	/**
	 * The target of the external.
	 */
	external: ExternalItemValueTarget;
	/**
	 * Whether importing the external has side effects (like the `sideEffects` flag in a package.json). `false` allows webpack to drop the external when none of its exports are used. Defaults to `true`, as webpack can't analyze an external.
	 * @since 5.110.0
	 */
	sideEffects?: ExternalItemSideEffects;
}

/**
 * Specify dependencies that shouldn't be resolved by webpack, but should become dependencies of the resulting bundle. The kind of the dependency depends on `output.libraryTarget`.
 */
export type Externals = ExternalItem[] | ExternalItem;

/**
 * Enable presets of externals for specific targets.
 */
export interface ExternalsPresets {
	/**
	 * Treat bun built-in modules like 'bun', 'bun:sqlite' or 'bun:ffi' and node.js built-in modules as external and load them via import when used (for the Bun runtime).
	 */
	bun?: boolean;
	/**
	 * Treat node.js built-in modules like fs, path or vm as external and load them via the required 'node:' specifier when used (for the Deno runtime).
	 */
	deno?: boolean;
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
	 * Treat installed packages (requests resolving into a 'node_modules' directory) as external and load them via require()/import at runtime instead of bundling them (useful for server-side rendering builds).
	 */
	nodeModules?:
		| /** Enable or disable externalizing installed packages. */ boolean
		| /** Externalize installed packages with options. */ {
				/**
				 * Keep these requests bundled instead of externalizing them.
				 */
				allowlist?: Array<
					| /** A request that should stay bundled. */ /** Requests matching the RegExp stay bundled. */ RegExp
					| /** An exact request that should stay bundled. */ string
					| /** A function returning true for requests that should stay bundled. */ ((
							request: string
					  ) => boolean)
				>;
		  };
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
	| "amd-async"
	| "umd"
	| "umd2"
	| "jsonp"
	| "system"
	| "promise"
	| "import"
	| "module-import"
	| "script"
	| "node-commonjs"
	| "asset"
	| "asset-url"
	| "css-import"
	| "css-url";

/**
 * These values will be ignored by webpack and created to be used with '&&' or '||' to improve readability of configurations.
 * @undefinedAsNull
 * @cliExclude
 */
export type Falsy = false | 0 | "" | null | undefined;

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
		[key: string]: BuildDependencyItem[];
	};
	/**
	 * Base directory for the cache (defaults to node_modules/.cache/webpack).
	 */
	cacheDirectory?: AbsolutePath;
	/**
	 * Locations for the cache (defaults to cacheDirectory / name).
	 */
	cacheLocation?: AbsolutePath;
	/**
	 * Compression type used for the cache files.
	 */
	compression?: false | "gzip" | "brotli" | "zstd";
	/**
	 * Algorithm used for generation the hash (see node.js crypto package).
	 */
	hashAlgorithm?: string;
	/**
	 * Time in ms after which idle period the cache storing should happen.
	 */
	idleTimeout?: NonNegativeNumber;
	/**
	 * Time in ms after which idle period the cache storing should happen when larger changes has been detected (cumulative build time > 2 x avg cache store time).
	 */
	idleTimeoutAfterLargeChanges?: NonNegativeNumber;
	/**
	 * Time in ms after which idle period the initial cache storing should happen.
	 */
	idleTimeoutForInitialStore?: NonNegativeNumber;
	/**
	 * List of paths that are managed by a package manager and contain a version or hash in its path so all files are immutable.
	 */
	immutablePaths?: Array<
		| /** List of paths that are managed by a package manager and contain a version or hash in its path so all files are immutable. */ /** A RegExp matching an immutable directory (usually a package manager cache directory, including the tailing slash) */ RegExp
		| /** A path to an immutable directory (usually a package manager cache directory). */ AbsolutePath
	>;
	/**
	 * List of paths that are managed by a package manager and can be trusted to not be modified otherwise.
	 */
	managedPaths?: Array<
		| /** List of paths that are managed by a package manager and can be trusted to not be modified otherwise. */ /** A RegExp matching a managed directory (usually a node_modules directory, including the tailing slash) */ RegExp
		| /** A path to a managed directory (usually a node_modules directory). */ AbsolutePath
	>;
	/**
	 * Time for which unused cache entries stay in the filesystem cache at minimum (in milliseconds).
	 */
	maxAge?: NonNegativeNumber;
	/**
	 * Number of generations unused cache entries stay in memory cache at minimum (0 = no memory cache used, 1 = may be removed after unused for a single compilation, ..., Infinity: kept forever). Cache entries will be deserialized from disk when removed from memory cache.
	 */
	maxMemoryGenerations?: NonNegativeNumber;
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
 * Specifies the filename of output files on disk. You must **not** specify an absolute path here, but the path may contain folders separated by '/'! The specified path is joined with the value of the 'output.path' option to determine the location on disk.
 */
export type Filename = FilenameTemplate;

/**
 * Specifies the filename template of output files on disk. You must **not** specify an absolute path here, but the path may contain folders separated by '/'! The specified path is joined with the value of the 'output.path' option to determine the location on disk.
 */
export type FilenameTemplate =
	| NonEmptyRelativePath
	| import("../lib/template/TemplatedPathPlugin").TemplatePathFn<
			import("../lib/Compilation").PathDataChunk
	  >;

/**
 * Filtering value, regexp or function.
 * @cliHelper
 */
export type FilterItemTypes =
	| RegExp
	| RelativePath
	| import("../lib/stats/DefaultStatsFactoryPlugin").FilterItemTypeFn;

/**
 * Filtering values.
 * @cliHelper
 */
export type FilterTypes =
	Array</** Rule to filter. @cliHelper */ FilterItemTypes> | FilterItemTypes;

/**
 * Specify options for each generator.
 */
export interface GeneratorOptionsByModuleTypeKnown {
	/**
	 * Generator options for asset modules.
	 * @implements #/definitions/AssetInlineGeneratorOptions, #/definitions/AssetResourceGeneratorOptions
	 */
	asset?: AssetGeneratorOptions;
	/**
	 * No generator options are supported for this module type.
	 */
	"asset/bytes"?: EmptyGeneratorOptions;
	/**
	 * Generator options for asset/inline modules.
	 */
	"asset/inline"?: AssetInlineGeneratorOptions;
	/**
	 * Generator options for asset/resource modules.
	 */
	"asset/resource"?: AssetResourceGeneratorOptions;
	/**
	 * No generator options are supported for this module type.
	 */
	"asset/source"?: EmptyGeneratorOptions;
	/**
	 * Generator options for css modules.
	 */
	css?: CssGeneratorOptions;
	/**
	 * Generator options for css/module modules.
	 */
	"css/auto"?: CssModuleGeneratorOptions;
	/**
	 * Generator options for css/module modules.
	 */
	"css/global"?: CssModuleGeneratorOptions;
	/**
	 * Generator options for css/module modules.
	 */
	"css/module"?: CssModuleGeneratorOptions;
	/**
	 * Generator options for html modules.
	 */
	html?: HtmlGeneratorOptions;
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
	/**
	 * Generator options for json modules.
	 */
	json?: JsonGeneratorOptions;
}

/**
 * Specify options for each generator.
 */
export interface GeneratorOptionsByModuleTypeUnknown {
	/**
	 * Options for generating.
	 * @additionalProperties
	 */
	[key: string]: { [key: string]: any };
}

/**
 * Specify options for each generator.
 */
export type GeneratorOptionsByModuleType = GeneratorOptionsByModuleTypeKnown &
	GeneratorOptionsByModuleTypeUnknown;

/**
 * An expression which is used to address the global object/scope in runtime code.
 */
export type GlobalObject = NonEmptyString;

/**
 * Digest types used for the hash.
 */
export type HashDigest = string;

/**
 * Number of chars which are used for the hash.
 */
export type HashDigestLength = PositiveNumber;

/**
 * Algorithm used for generation the hash (see node.js crypto package).
 */
export type HashFunction = NonEmptyString | typeof import("../lib/util/Hash");

/**
 * Any string which is added to the hash to salt it.
 */
export type HashSalt = NonEmptyString;

/**
 * The filename of the Hot Update Chunks. They are inside the output.path directory.
 */
export type HotUpdateChunkFilename = RelativePath;

/**
 * The global variable used by webpack for loading of hot update chunks.
 */
export type HotUpdateGlobal = string;

/**
 * The filename of the Hot Update Main File. It is inside the 'output.path' directory.
 */
export type HotUpdateMainFilename = RelativePath;

/**
 * Specifies the filename template of non-initial output html files on disk. You must **not** specify an absolute path here, but the path may contain folders separated by '/'! The specified path is joined with the value of the 'output.path' option to determine the location on disk.
 */
export type HtmlChunkFilename = FilenameTemplate;

/**
 * A single favicon `<link>`: either a path string (used as the icon `href`) or an object with the icon `href` plus extra link attributes (`sizes`, `media`, `color`, `type`, `crossorigin`).
 */
export type HtmlFaviconIcon =
	| NonEmptyString
	| {
			/**
			 * Value for the `color` attribute (used by `rel="mask-icon"`).
			 */
			color?: NonEmptyString;
			/**
			 * Value for the `crossorigin` attribute.
			 */
			crossorigin?: "anonymous" | "use-credentials";
			/**
			 * Path to the icon file, emitted as a hashed asset.
			 */
			href: NonEmptyString;
			/**
			 * Value for the `media` attribute (e.g. `"(prefers-color-scheme: dark)"`).
			 */
			media?: NonEmptyString;
			/**
			 * Value for the `sizes` attribute (e.g. `"180x180"` or `"any"`).
			 */
			sizes?: NonEmptyString;
			/**
			 * Value for the `type` attribute; inferred from the file extension when omitted.
			 */
			type?: NonEmptyString;
	  };

/**
 * Specifies the filename template of output html files on disk. You must **not** specify an absolute path here, but the path may contain folders separated by '/'! The specified path is joined with the value of the 'output.path' option to determine the location on disk.
 */
export type HtmlFilename = FilenameTemplate;

/**
 * Generator options for html modules.
 * @publishes plugins/HtmlGeneratorOptions
 */
export interface HtmlGeneratorOptions {
	/**
	 * Emit the parsed and URL-rewritten HTML as a standalone `.html` output file alongside the module's JavaScript export. `true` always emits the file; `false` never does; `"inline"` exposes the processed HTML for inline write-back (e.g. `<iframe srcdoc>`) without emitting a standalone file. When unset, extraction defaults to `true` for HTML modules used as compilation entries (HTML entry points) and `false` for HTML modules imported from JavaScript. Filenames follow `output.htmlFilename` / `output.htmlChunkFilename`.
	 */
	extract?: "inline" | boolean;
}

/**
 * Configure how the HTML source is parsed: `"document"` (the default) parses a full page; any other value is the tag name of the context element to parse the source as that element's inner HTML (a fragment) — e.g. `"template"` for a neutral fragment, or `"tbody"` so context-sensitive tags like a bare `<tr>`/`<td>` are kept instead of dropped.
 * @since 5.109.0
 */
export type HtmlParserAs = "document" | string;

/**
 * Parser options for html modules.
 * @publishes plugins/HtmlParserOptions
 */
export interface HtmlParserOptions {
	/**
	 * Configure how the HTML source is parsed: `"document"` (the default) parses a full page; any other value is the tag name of the context element to parse the source as that element's inner HTML (a fragment) — e.g. `"template"` for a neutral fragment, or `"tbody"` so context-sensitive tags like a bare `<tr>`/`<td>` are kept instead of dropped.
	 * @since 5.109.0
	 */
	as?: HtmlParserAs;
	/**
	 * Name the chunk an extracted `<script>`/`<link>` tag becomes, in place of the page and the tag's position. A string may carry `[page]` (the page's path, escaped for a name), `[name]` (the tag's own basename, empty for an inline body), `[index]` (the tag's position in the page) and `[type]`; a function is called with the same values and returns the name. A `<!-- webpackChunkName: "..." -->` comment before a tag wins over it, and either way the name is also the stem the chunk's file is emitted under.
	 * @since 5.112.0
	 */
	chunkName?: NonEmptyString | import("../lib/html/HtmlParser").HtmlChunkNameFn;
	/**
	 * Configure extraction of URL-like attribute values (e.g. `<img src>`, `<link href>`, `<script src>`) as webpack dependencies. `true` (default) uses the built-in source list; `false` disables extraction entirely so attributes are left untouched and `<script src>` / `<link rel="modulepreload">` / `<link rel="stylesheet">` no longer become compilation entries; an array lets you customize which `tag`/`attribute` pairs are treated as URLs and how they are bundled. Use the string `"..."` inside the array to inline the defaults. Inline `<script>` and `<style>` bodies are always processed. Use `webpackIgnore` comments or `IgnorePlugin` to skip individual URLs.
	 */
	sources?:
		| /** Sources to extract as webpack dependencies. Use `"..."` to inline the default source list. @minItems 1 */ Array<
				| /** A source entry: either the string `"..."` to inline the built-in default sources, or an object describing a `tag`/`attribute` pair to extract and how to bundle it. */ "..."
				| {
						/**
						 * Attribute name whose value is treated as a URL.
						 */
						attribute: NonEmptyString;
						/**
						 * Called with the element's decoded attribute map and the decoded attribute value; return false to skip this source entry for that element.
						 */
						filter?: (
							attributes: Map<string, string>,
							value: string
						) => boolean;
						/**
						 * Tag name to match. Omit to match any tag.
						 */
						tag?: NonEmptyString;
						/**
						 * How the attribute value should be parsed and bundled, or `false` to disable a built-in source for this `tag`/`attribute` (use together with `"..."` to drop a default, e.g. stop treating `<img src>` as a URL). `src` extracts a single URL as a plain asset; `srcset` parses a `srcset`-style list of candidate URLs as plain assets; `css-url` extracts `url(...)` references from a CSS value (like an SVG presentation attribute such as `fill`) as plain assets; `script` and `script-module` emit a classic / ES-module chunk entry like `<script src>` and `<script type="module" src>`; `stylesheet` emits a CSS chunk entry like `<link rel="stylesheet">`; `html` treats the URL as a link to another HTML file that is bundled as its own emitted page (its assets extracted) and rewrites the attribute to the page's output filename (like Parcel's `<a href="page.html">`); `stylesheet-style` treats the attribute value as a full stylesheet (like a `<style>` body) and `stylesheet-style-attribute` as a CSS block's contents (a declaration list, like a `style` attribute) — both bundle it through the CSS pipeline and replace the attribute's content with the processed CSS at render time; `srcdoc` treats the attribute value as an entity-encoded HTML document (like `<iframe srcdoc>`), bundling it through the HTML pipeline and replacing the attribute's content with the processed HTML at render time.
						 */
						type:
							| (
									| "src"
									| "srcset"
									| "css-url"
									| "script"
									| "script-module"
									| "stylesheet"
									| "html"
									| "stylesheet-style"
									| "stylesheet-style-attribute"
									| "srcdoc"
							  )
							| false;
				  }
		  >
		| boolean;
	/**
	 * Transform the raw source before the html parser extracts dependencies. Receives the source string and a context (`{ module, resource }`) and must return the html string to parse. Useful for compiling a templating language (Handlebars, EJS, Eta, …) to html so that URLs the template emits are still picked up as webpack dependencies. Runs synchronously.
	 */
	template?: import("../lib/html/HtmlParser").HtmlTemplateFunction;
	/**
	 * URL-referenced-asset default hint rules for this parser (JavaScript `new URL(...)`, CSS `url(...)`, HTML `<img src>` / `<link href>` / `<script src>`).
	 * @since 5.109.0
	 */
	urlHints?: UrlHints;
}

/**
 * A custom resource-hint `<link>` for `output.html.resourceHints`. Exactly one of `href` / `chunk` / `entry` names the target.
 * @since 5.109.0
 */
export interface HtmlResourceHint {
	/**
	 * The `as` attribute (`script`, `style`, `font`, …); defaults to `script` for chunk/entry references.
	 */
	as?: string;
	/**
	 * Name of a chunk to hint; its emitted URL is resolved automatically.
	 */
	chunk?: NonEmptyString;
	/**
	 * The CORS mode; `true` maps to `anonymous`.
	 */
	crossorigin?: ("anonymous" | "use-credentials") | boolean;
	/**
	 * Name of an entrypoint to hint; expands to one hint per initial chunk.
	 */
	entry?: NonEmptyString;
	/**
	 * The `fetchpriority` attribute. Emitted on `preload` / `modulepreload` and on `prefetch` (the spec now permits it there).
	 */
	fetchPriority?: "low" | "high" | "auto";
	/**
	 * A literal URL used verbatim (external resource, `preconnect` origin, or an already-hashed asset).
	 */
	href?: string;
	/**
	 * Subresource Integrity for a chunk/entry reference. Follows `output.html.integrity` by default; set `false` to opt this hint out.
	 */
	integrity?: boolean;
	/**
	 * The `media` attribute.
	 */
	media?: string;
	/**
	 * The `rel` of the resource hint.
	 */
	rel: "preload" | "prefetch" | "modulepreload" | "preconnect" | "dns-prefetch";
	/**
	 * The `type` attribute (MIME type).
	 */
	type?: string;
}

/**
 * List of allowed URIs for building http resources.
 * @cliExclude
 */
export type HttpUriAllowedUris = HttpUriOptionsAllowedUris;

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
	cacheLocation?: false | AbsolutePath;
	/**
	 * When set, anything that would lead to a modification of the lockfile or any resource content, will result in an error.
	 */
	frozen?: boolean;
	/**
	 * Location of the lockfile.
	 */
	lockfileLocation?: AbsolutePath;
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
 * List of allowed URIs (resp. the beginning of them).
 */
export type HttpUriOptionsAllowedUris = Array<
	| /** List of allowed URIs (resp. the beginning of them). */ /** Allowed URI pattern. */ RegExp
	| /** Allowed URI (resp. the beginning of it). */ HttpUrl
	| /** Allowed URI filter function. */ import("../lib/schemes/HttpUriPlugin").AllowedUriFn
>;

/**
 * Ignore specific warnings.
 */
export type IgnoreWarnings = Array<
	| /** Ignore specific warnings. */ /** A RegExp to select the warning message. */ RegExp
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
	| /** A custom function to select warnings based on the raw warning instance. */ import("../lib/diagnostics/IgnoreWarningsPlugin").IgnoreFn
>;

/**
 * Ignore specific warnings.
 */
export type IgnoreWarningsNormalized = Array<
	/** A function to select warnings based on the raw warning instance. */ import("../lib/diagnostics/IgnoreWarningsPlugin").IgnoreFn
>;

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
 * Enable/disable evaluating import.meta fields. Omitted fields are enabled and unknown fields are preserved. Custom fields are allowed.
 * @since 5.109.0
 */
export interface ImportMetaParserOptionsKnown {
	/**
	 * Enable/disable evaluating import.meta.dirname.
	 */
	dirname?: boolean;
	/**
	 * Enable/disable evaluating import.meta.env.
	 */
	env?: boolean;
	/**
	 * Enable/disable evaluating import.meta.filename.
	 */
	filename?: boolean;
	/**
	 * Enable/disable evaluating import.meta.main.
	 */
	main?: boolean;
	/**
	 * Enable/disable evaluating import.meta.resolve.
	 */
	resolve?: boolean;
	/**
	 * Enable/disable evaluating import.meta.url.
	 */
	url?: boolean;
	/**
	 * Enable/disable evaluating import.meta.webpack.
	 */
	webpack?: boolean;
	/**
	 * Enable/disable evaluating import.meta.webpackContext.
	 */
	webpackContext?: boolean;
	/**
	 * Enable/disable evaluating import.meta.webpackHot.
	 */
	webpackHot?: boolean;
}

/**
 * Enable/disable evaluating import.meta fields. Omitted fields are enabled and unknown fields are preserved. Custom fields are allowed.
 * @since 5.109.0
 */
export interface ImportMetaParserOptionsUnknown {
	/**
	 * Enable/disable evaluating a custom import.meta field.
	 */
	[key: string]: boolean;
}

/**
 * Enable/disable evaluating import.meta fields. Omitted fields are enabled and unknown fields are preserved. Custom fields are allowed.
 * @since 5.109.0
 */
export type ImportMetaParserOptions = ImportMetaParserOptionsKnown &
	ImportMetaParserOptionsUnknown;

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
	 * @typeOnly
	 */
	console?: Console;
	/**
	 * Enable debug logging for specific loggers.
	 */
	debug?:
		/** Enable/Disable debug logging for all loggers. */ boolean | FilterTypes;
	/**
	 * Log level.
	 */
	level?: "none" | "error" | "warn" | "info" | "log" | "verbose";
	/**
	 * Show build progress. `"auto"` shows it only for interactive terminals. This option is only used when no custom console is provided.
	 * @since 5.109.0
	 */
	progress?: "auto" | boolean;
	/**
	 * Stream used for logging output. Defaults to process.stderr. This option is only used when no custom console is provided.
	 * @typeOnly
	 */
	stream?: NodeJS.WritableStream & {
		isTTY?: boolean;
		columns?: number;
		rows?: number;
	};
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
	 * Set .name to "default" for anonymous default export functions and classes per ES spec. Disable to reduce output size when .name is not needed.
	 */
	anonymousDefaultExportName?: boolean;
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
	 * Enable experimental tc39 proposal https://github.com/tc39/proposal-defer-import-eval. This allows to defer execution of a module until it's first use.
	 * @since 5.100.0
	 */
	deferImport?: boolean;
	/**
	 * Auto-emit `<link rel="preload" as="style">` for the CSS of every dynamically imported (`import()`) chunk, so the stylesheet fetches in parallel with the chunk's JavaScript instead of after it parses. Unlike `dynamicImportPreload`, the JavaScript itself is not preloaded. `true` uses the default order; a number sets the preload order.
	 * @since 5.109.0
	 */
	dynamicImportCssPreload?: number | boolean;
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
	 * Enable/disable parsing of dynamic URL.
	 */
	dynamicUrl?: boolean;
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
	 * Enable/disable evaluating import.meta. Set to 'preserve-unknown' or an object to preserve unknown properties for runtime evaluation.
	 */
	importMeta?:
		| boolean
		| /** @jsonType string */ "preserve-unknown"
		| ImportMetaParserOptions;
	/**
	 * Deprecated in favor of "importMeta" object option with a "webpackContext" field. Enable/disable evaluating import.meta.webpackContext.
	 * @deprecated
	 */
	importMetaContext?: boolean;
	/**
	 * Include polyfills or mocks for various node stuff.
	 */
	node?: Node;
	/**
	 * Override the module to strict or non-strict. This may affect the behavior of the module (some behaviors differ between strict and non-strict), so please configure this option carefully.
	 */
	overrideStrict?: "strict" | "non-strict";
	/**
	 * Function to parser source code.
	 */
	parse?: import("../lib/javascript/JavascriptParser").ParseFunction;
	/**
	 * Mark the listed top-level function names for pure-function-based tree shaking.
	 */
	pureFunctions?: Array</** A top-level function name in the module to treat as side-effect-free when called. */ NonEmptyString>;
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
	 * Enable experimental tc39 proposal https://github.com/tc39/proposal-source-phase-imports. This allows importing modules at source phase.
	 */
	sourceImport?: boolean;
	/**
	 * Hand out a spec-compliant Module Namespace Exotic Object for 'import * as ns' and 'import()' of this module instead of the plain exports object. Requires 'Proxy' in the target environment, keeps every exported name, and costs runtime code, so enable it per module. Set it on the imported module, not on the importer.
	 * @since 5.111.0
	 */
	specNamespaceObject?: boolean;
	/**
	 * Deprecated in favor of "exportsPresence". Emit errors instead of warnings when imported names don't exist in imported module.
	 * @deprecated
	 */
	strictExportPresence?: boolean;
	/**
	 * Specifies the behavior of constructs that break at runtime in strict mode (e.g. 'with', 'arguments.callee', assigning to read-only globals) when modules are emitted as ES module output.
	 * @since 5.109.0
	 */
	strictModeViolations?: "error" | "warn" | false;
	/**
	 * Handle the this context correctly according to the spec for namespace objects.
	 */
	strictThisContextOnImports?: boolean;
	/**
	 * Enable/disable parsing of System.js special syntax like System.import, System.get, System.set and System.register.
	 */
	system?: boolean;
	/**
	 * Set what top-level "this" refers to in a non-ES module: "exports" (the exports object, as in Node.js) or "global" (the global object, as in a classic script).
	 * @since 5.112.0
	 */
	topLevelThis?: "exports" | "global";
	/**
	 * Enable typescript support.
	 * @experimental
	 */
	typescript?: boolean;
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
	 * URL-referenced-asset default hint rules for this parser (JavaScript `new URL(...)`, CSS `url(...)`, HTML `<img src>` / `<link href>` / `<script src>`).
	 * @since 5.109.0
	 */
	urlHints?: UrlHints;
	/**
	 * Disable or configure parsing of WebWorker syntax like new Worker() or navigator.serviceWorker.register().
	 */
	worker?:
		| Array</** Specify a syntax that should be parsed as WebWorker reference. 'Abc' handles 'new Abc()', 'Abc from xyz' handles 'import { Abc } from "xyz"; new Abc()', 'abc()' handles 'abc()', and combinations are also possible. */ NonEmptyString>
		| boolean;
	/**
	 * Disable or configure parsing of Worklet syntax like context.audioWorklet.addModule() or CSS.paintWorklet.addModule().
	 * @since 5.109.0
	 */
	worklet?:
		| Array</** Specify a syntax that should be parsed as Worklet reference. '*context.audioWorklet.addModule()' handles 'context.audioWorklet.addModule()', 'abc()' handles 'abc()', and combinations are also possible. */ NonEmptyString>
		| boolean;
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
 * Generator options for json modules.
 * @publishes plugins/json/JsonModulesPluginGenerator
 */
export interface JsonGeneratorOptions {
	/**
	 * Use `JSON.parse` when the JSON string is longer than 20 characters.
	 */
	JSONParse?: boolean;
}

/**
 * Parser options for JSON modules.
 * @publishes plugins/json/JsonModulesPluginParser
 */
export interface JsonParserOptions {
	/**
	 * The depth of json dependency flagged as `exportInfo`.
	 */
	exportsDepth?: number;
	/**
	 * Allow named exports for json of object type.
	 */
	namedExports?: boolean;
	/**
	 * Function to parser content and return JSON.
	 */
	parse?: import("../lib/json/JsonParser").ParseFn;
}

/**
 * Specifies the layer in which modules of this entrypoint are placed.
 */
export type Layer = null | NonEmptyString;

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
		| /** A port. */ number
		| /** Listen options. @additionalProperties @properties {"host":{"description":"A host.","type":"string"},"port":{"description":"A port.","type":"number"}} @jsonType object @tsType import('net').ListenOptions */ import("net").ListenOptions
		| /** A custom listen function. */ import("../lib/hmr/lazyCompilationBackend").Listen;
	/**
	 * Specifies the protocol the client should use to connect to the server.
	 */
	protocol?: "http" | "https";
	/**
	 * Specifies how to create the server handling the EventSource requests.
	 */
	server?:
		| /** ServerOptions for the http or https createServer call. @additionalProperties @emptyProperties @jsonType object @tsType import("../lib/hmr/lazyCompilationBackend").HttpsServerOptions | import("../lib/hmr/lazyCompilationBackend").HttpServerOptions */ (
				| import("../lib/hmr/lazyCompilationBackend").HttpsServerOptions
				| import("../lib/hmr/lazyCompilationBackend").HttpServerOptions
		  )
		| /** A custom create server function. */ import("../lib/hmr/lazyCompilationBackend").CreateServerFunction;
}

/**
 * Options for compiling entrypoints and import()s only when they are accessed.
 */
export interface LazyCompilationOptions {
	/**
	 * Specifies the backend that should be used for handling client keep alive.
	 */
	backend?:
		| /** A custom backend. */ import("../lib/hmr/LazyCompilationPlugin").BackEnd
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
	test?: RegExp | string | import("../lib/hmr/LazyCompilationPlugin").TestFn;
}

/**
 * Make the output files a library, exporting the exports of the entry point.
 */
export type Library = LibraryName | LibraryOptions;

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
	amd?: NonEmptyString;
	/**
	 * Name of the exposed commonjs export in the UMD.
	 */
	commonjs?: NonEmptyString;
	/**
	 * Name of the property exposed globally by a UMD library.
	 */
	root?:
		| Array</** Part of the name of the property exposed globally by a UMD library. */ NonEmptyString>
		| NonEmptyString;
}

/**
 * Which modules of an entry the library exposes the exports of: only the last one, or all of them, where a name more than one module binds differently is left out, as 'export *' does.
 * @since 5.112.0
 */
export type LibraryEntryExports = "last" | "all";

/**
 * Specify which export should be exposed as library.
 */
export type LibraryExport =
	| Array</** Part of the export that should be exposed as library. */ NonEmptyString>
	| NonEmptyString;

/**
 * The name of the library (some types allow unnamed libraries too).
 */
export type LibraryName =
	| /** @minItems 1 */ Array</** A part of the library name. */ NonEmptyString>
	| NonEmptyString
	| LibraryCustomUmdObject;

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
	 * Which modules of an entry the library exposes the exports of: only the last one, or all of them, where a name more than one module binds differently is left out, as 'export *' does.
	 * @since 5.112.0
	 */
	entryExports?: LibraryEntryExports;
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
	 * Add a branch to the UMD wrapper for an AMD-style loader exposing `define` on a container object, given as a dot-separated path, after the `define.amd` branch.
	 * @since 5.110.0
	 */
	umdAmdContainer?: UmdAmdContainer;
	/**
	 * If `output.libraryTarget` is set to umd and `output.library` is set, setting this to true will name the AMD module.
	 */
	umdNamedDefine?: UmdNamedDefine;
}

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
 * Custom values available in the loader context.
 */
export type Loader = { [key: string]: any };

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
	maxGenerations?: PositiveNumber;
	/**
	 * In memory caching.
	 */
	type: "memory";
}

/**
 * Enable production optimizations or development hints.
 */
export type Mode = "development" | "production" | "none";

/**
 * Filtering value, regexp or function.
 * @cliHelper
 */
export type ModuleFilterItemTypes =
	| RegExp
	| RelativePath
	| import("../lib/stats/DefaultStatsFactoryPlugin").ModuleFilterItemTypeFn;

/**
 * Filtering modules.
 * @cliHelper
 */
export type ModuleFilterTypes =
	| Array</** Rule to filter. @cliHelper */ ModuleFilterItemTypes>
	| ModuleFilterItemTypes;

/**
 * Options affecting the normal modules (`NormalModuleFactory`).
 */
export interface ModuleOptions {
	/**
	 * An array of rules applied by default for modules.
	 * @cliExclude
	 */
	defaultRules?: RuleSetRules;
	/**
	 * Enable warnings for full dynamic dependencies. Deprecated: This option has moved to 'module.parser.javascript.exprContextCritical'.
	 * @deprecated
	 */
	exprContextCritical?: boolean;
	/**
	 * Enable recursive directory lookup for full dynamic dependencies. Deprecated: This option has moved to 'module.parser.javascript.exprContextRecursive'.
	 * @deprecated
	 */
	exprContextRecursive?: boolean;
	/**
	 * Sets the default regular expression for full dynamic dependencies. Deprecated: This option has moved to 'module.parser.javascript.exprContextRegExp'.
	 * @deprecated
	 */
	exprContextRegExp?: RegExp | boolean;
	/**
	 * Set the default request for full dynamic dependencies. Deprecated: This option has moved to 'module.parser.javascript.exprContextRequest'.
	 * @deprecated
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
	 * @deprecated
	 */
	strictExportPresence?: boolean;
	/**
	 * Handle the this context correctly according to the spec for namespace objects. Deprecated: This option has moved to 'module.parser.javascript.strictThisContextOnImports'.
	 * @deprecated
	 */
	strictThisContextOnImports?: boolean;
	/**
	 * Enable warnings when using the require function in a not statically analyse-able way. Deprecated: This option has moved to 'module.parser.javascript.unknownContextCritical'.
	 * @deprecated
	 */
	unknownContextCritical?: boolean;
	/**
	 * Enable recursive directory lookup when using the require function in a not statically analyse-able way. Deprecated: This option has moved to 'module.parser.javascript.unknownContextRecursive'.
	 * @deprecated
	 */
	unknownContextRecursive?: boolean;
	/**
	 * Sets the regular expression when using the require function in a not statically analyse-able way. Deprecated: This option has moved to 'module.parser.javascript.unknownContextRegExp'.
	 * @deprecated
	 */
	unknownContextRegExp?: RegExp | boolean;
	/**
	 * Sets the request when using the require function in a not statically analyse-able way. Deprecated: This option has moved to 'module.parser.javascript.unknownContextRequest'.
	 * @deprecated
	 */
	unknownContextRequest?: string;
	/**
	 * Cache the resolving of module requests.
	 */
	unsafeCache?: boolean | import("../lib/Compilation").UnsafeCachePredicate;
	/**
	 * Enable warnings for partial dynamic dependencies. Deprecated: This option has moved to 'module.parser.javascript.wrappedContextCritical'.
	 * @deprecated
	 */
	wrappedContextCritical?: boolean;
	/**
	 * Enable recursive directory lookup for partial dynamic dependencies. Deprecated: This option has moved to 'module.parser.javascript.wrappedContextRecursive'.
	 * @deprecated
	 */
	wrappedContextRecursive?: boolean;
	/**
	 * Set the inner regular expression for partial dynamic dependencies. Deprecated: This option has moved to 'module.parser.javascript.wrappedContextRegExp'.
	 * @deprecated
	 */
	wrappedContextRegExp?: RegExp;
}

/**
 * Options affecting the normal modules (`NormalModuleFactory`).
 */
export interface ModuleOptionsNormalized {
	/**
	 * An array of rules applied by default for modules.
	 * @cliExclude
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
	unsafeCache?: boolean | import("../lib/Compilation").UnsafeCachePredicate;
}

/**
 * Name of the configuration. Used when loading multiple configurations.
 */
export type Name = string;

/**
 * Don't parse files matching. It's matched against the full resolved request.
 */
export type NoParse =
	| /** @minItems 1 */ Array<
			| /** Don't parse files matching. It's matched against the full resolved request. */ /** A regular expression, when matched the module is not parsed. */ RegExp
			| /** An absolute path, when the module starts with this path it is not parsed. */ AbsolutePath
			| import("../lib/module/NormalModule").NoParseFn
	  >
	| /** A regular expression, when matched the module is not parsed. */ RegExp
	| /** An absolute path, when the module starts with this path it is not parsed. */ AbsolutePath
	| import("../lib/module/NormalModule").NoParseFn;

/**
 * Include polyfills or mocks for various node stuff.
 */
export type Node = false | NodeOptions;

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
		false | true | "warn-mock" | "mock" | "node-module" | "eval-only";
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
	 * Avoid wrapping the entry module in an IIFE.
	 */
	avoidEntryIife?: boolean;
	/**
	 * Check for incompatible wasm types when importing/exporting from/to ESM.
	 */
	checkWasmTypes?: boolean;
	/**
	 * Define the algorithm to choose chunk ids (named: readable ids for better debugging, deterministic: numeric hash ids for better long term caching, size: numeric ids focused on minimal initial download size, total-size: numeric ids focused on minimal total download size, false: no algorithm used, as custom one can be provided via plugin).
	 */
	chunkIds?:
		"natural" | "named" | "deterministic" | "size" | "total-size" | false;
	/**
	 * Concatenate modules when possible to generate less modules, more efficient code and enable more optimizations by the minimizer. An options object implies 'true'.
	 */
	concatenateModules?: boolean | ConcatenateModulesOptions;
	/**
	 * Emit assets even when errors occur. Critical errors are emitted into the generated code and will cause errors at runtime.
	 */
	emitOnErrors?: boolean;
	/**
	 * Also flag chunks as loaded which contain a subset of the modules.
	 */
	flagIncludedChunks?: boolean;
	/**
	 * Inline ESM exports that bind to small primitive constants (≤6-byte null/undefined/boolean/number/string). Inlining makes the import dependency inactive so DCE can drop the export and possibly the module.
	 */
	inlineExports?: boolean;
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
	 * Enable minimizing the output. Uses optimization.minimizer. An options object implies 'true' and sets optimization.minimizeOptions.
	 */
	minimize?: boolean | OptimizationMinimizeOptions;
	/**
	 * Enable minimizing the output, configured per asset type. An absent type is minimized with the defaults; `false` disables minimizing it.
	 * @since 5.110.0
	 */
	minimizeOptions?: OptimizationMinimizeOptions;
	/**
	 * Minimizer(s) to use for minimizing the output.
	 * @cliExclude
	 */
	minimizer?: Array<
		| /** Plugin of type object or instanceof Function. */ "..."
		| Falsy
		| WebpackPluginInstance
		| WebpackPluginFunction
	>;
	/**
	 * Define the algorithm to choose module ids (natural: numeric ids in order of usage, named: readable ids for better debugging, hashed: (deprecated) short hashes as ids for better long term caching, deterministic: numeric hash ids for better long term caching, size: numeric ids focused on minimal initial download size, false: no algorithm used, as custom one can be provided via plugin).
	 */
	moduleIds?: "natural" | "named" | "hashed" | "deterministic" | "size" | false;
	/**
	 * Avoid emitting assets when errors occur (deprecated: use 'emitOnErrors' instead).
	 * @deprecated
	 * @cliExclude
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
 * What the CSS minimizer does. Applies wherever it runs: on `.css` assets and on the inline `<style>` / `style=""` the HTML minimizer hands it. Every transform that keeps the stylesheet's meaning is on by default and may be turned off on its own, so a document a rewrite breaks can be minimized without it while the rest still applies; the two that change what the CSSOM hands back (`convertLengthUnits`, `rewriteCustomProperties`) are off until asked for.
 * @since 5.110.0
 */
export interface OptimizationMinimizeCss {
	/**
	 * Write a color the `browserslist` target cannot read as an extra declaration before the one naming it, in a spelling it does read: `color: oklch(59.686% 0.15619 49.7694)` is written as `color: #c65d06` and then the `oklch()` itself, so an engine reading neither the Lab family nor `hwb()` is left with a color rather than with nothing. The fallback is that color clipped into the sRGB gamut and rounded, which the declaration standing after it corrects wherever it is read. Nothing is written where the author already set the property earlier in the same block, where the color holds a substitution or a relative reference this cannot fold, or where the fallback would still name a function the target cannot read. On by default, and only in effect for a `browserslist` target — any other target names no browsers to answer for.
	 * @since 5.111.0
	 */
	colorFallbacks?: boolean;
	/**
	 * Which comments survive. `"some"`, the default, keeps a `/*!` banner and a comment annotated `@license` or `@preserve`; `true` (or `"all"`) keeps every comment and `false` keeps none; a string is read as a regular expression source, and it, a `RegExp` or a `(comment) => boolean` predicate is asked about each comment's own text and keeps the ones it accepts — standing in for the default rule rather than beside it, as terser's `format.comments` does, so a pattern that names nothing else drops the ones `"some"` would have kept. A `/*#` source-map pragma is a link rather than a comment, so `"some"` and `"all"` keep it; `false`, a pattern or a predicate decides it like any other. A predicate is handed to the minimizer's worker pool as source, so it must not close over anything.
	 * @since 5.110.0
	 */
	comments?:
		| ("all" | "some")
		| RegExp
		| boolean
		| string
		| ((comment: string) => boolean);
	/**
	 * Write a polar or Lab color as the nearest hex even where that hex only approximates it. `shortenColors` converts one only where webpack can prove an engine's own conversion lands on the same bytes, and keeps the function in the two places it cannot: a channel sitting too near a `.5` boundary for two implementations to round it alike (it is why esbuild and lightningcss emit different bytes for `hwb(194 0% 0%)`), and a color outside the sRGB gamut, which hex can only clip to a different color. Off by default, for those two reasons, and the two are not the same trade: on the boundary this writes the byte esbuild, lightningcss and cssnano write anyway, while outside the gamut it goes further than any of them — lightningcss keeps the function there and writes a fallback before it, which is what `colorFallbacks` does. A space engines read through transfers of their own (`a98-rgb`, `prophoto-rgb`) is left alone either way, the hex there naming a color no engine paints rather than a near one. This is about replacing the function: a fallback stands before it rather than in its place, so it already clips and rounds this way.
	 * @since 5.112.0
	 */
	convertApproximateColors?: boolean;
	/**
	 * Rewrite a length into a shorter unit it is exactly equal in (`16px` -> `1pc`). Off by default: the authored unit is lost, and once the asset is compressed the rewrite rarely earns anything.
	 * @since 5.110.0
	 */
	convertLengthUnits?: boolean;
	/**
	 * Drop a declaration a later one in the same block overrides even where nothing states that the target can read the later value. Off by default. With a `browserslist` target this is already done wherever every browser it names is known to read the later value, so the option only widens the case where no target is selected and there are no engines to name — which is what csso and cssnano do unconditionally. What it gives up is the fallback pair: `color:#c65d06;color:lab(50% 100 -100)` loses the hex, so an engine that cannot read `lab()` is left with nothing. A selection naming a browser the compat tables do not cover is still answered for the whole of it rather than by this option, since naming a browser states a target the option does not override.
	 * @since 5.112.0
	 */
	dropOverriddenDeclarations?: boolean;
	/**
	 * Write a name that matches ASCII case-insensitively in lowercase: an at-rule name, a property name, a pseudo-class or pseudo-element name, a function name, a unit, and a keyword standing in a value whose grammar takes keywords alone. `@MEDIA`, `COLOR`, `:NTH-CHILD`, `URL(`, `1PX` and `currentColor` become `@media`, `color`, `:nth-child`, `url(`, `1px` and `currentcolor`. On by default, and exact: CSS matches every one of these ASCII case-insensitively, so the fold names the same thing. What it never touches is a name the author chose — a custom property, a custom ident such as an animation or grid-area name, an id, a class, a type selector, an attribute's value, or anything inside a substituted value. `@charset` is left as written, being read as bytes rather than matched, and `!important` is always written in lowercase because the printer writes the keyword rather than copying it.
	 * @since 5.111.0
	 */
	foldCase?: boolean;
	/**
	 * Write a spelling the `browserslist` target cannot read as one it can — the same value said another way, rather than left for an engine that will drop it: a 4-/8-digit hex as `rgba()`, a double-position gradient stop as the two stops it names, `inset` / `overflow` / `place-*` as the longhands they set, `text-decoration` as its own longhands where a slot is newer than the shorthand, `system-ui` as the stack of platform font names it stands for, a `:lang()` or `:not()` holding a list as the `:is()` that means it, a media feature range as the `min-`/`max-` pair, and `light-dark()` as the custom-property pair a color scheme switches. On by default, and only in effect for a `browserslist` target — any other target names no browsers to answer for. Off leaves every such spelling as written, which is how a stylesheet one of these rewrites gets wrong is minified; it never makes the minifier write a spelling the target cannot read.
	 * @since 5.111.0
	 */
	lowerUnsupported?: boolean;
	/**
	 * Give a rule the selectors of a later one printing the same block, and an at-rule the block of a later one stating the same condition, past the rules standing between them. Off by default because it reorders the cascade, so it holds only where nothing between the two declares a property the block being moved does — a condition between counts for what its own rules declare, while `@layer` and anything else whose declarations cannot be read stands in the way whatever it says. A block repeated at a distance already compresses on its own, so a selector join is taken only where the copy of the block it drops is worth more than twice the selector it writes instead; an at-rule join writes no selector and drops the repeated prelude outright. A named `@layer` is not joined this way — its place in the cascade is where its name is first written, not what its prelude states. `mergeRules` is the safe half of this, joining only what nothing stands between.
	 * @since 5.111.0
	 */
	mergeDistantRules?: boolean;
	/**
	 * Write a family of longhands as the one shorthand that sets them — four sides or corners, the two a pair shorthand sets, or the slots of an order-free one — even where unrelated declarations stand between them. On by default.
	 * @since 5.110.0
	 */
	mergeLonghands?: boolean;
	/**
	 * Join rules nothing stands between: adjacent rules that print the same block become one selector list, at-rules that share a prelude become one rule, and a named `@layer` block a later sibling opens again is folded into the first. On by default.
	 * @since 5.110.0
	 */
	mergeRules?: boolean;
	/**
	 * Normalize quoting: a string takes whichever quote needs fewer escapes, a `url()` and an attribute selector's value drop theirs where the content is still one token, and a font family whose name is a run of identifiers is written unquoted. On by default.
	 * @since 5.110.0
	 */
	normalizeQuotes?: boolean;
	/**
	 * Each pseudo-class to write as an ordinary class instead, as `{ "focus-visible": "focus-visible" }` — so a script can apply the class where the engine reads no such pseudo. Only a plain pseudo-class is rewritten, wherever it stands in a selector: a pseudo-element (`::hover`) and a functional pseudo of the same name (`:hover(…)`) are not what a class stands in for, and a `:name` inside a quoted attribute value is nobody's pseudo. Nothing applies the class — that is the script's part.
	 * @since 5.111.0
	 */
	pseudoClasses?: {
		/**
		 * The class to write instead, without its `.`.
		 */
		[key: string]: NonEmptyString;
	};
	/**
	 * Compute a call into the shorter call naming the same value: `calc()` and every math function over constants, a transform naming one axis or an identity, a gradient's default direction and its implied stops, an easing function that has a keyword, and a filter function given the amount an omitted argument already means. On by default.
	 * @since 5.110.0
	 */
	reduceFunctions?: boolean;
	/**
	 * Drop a rule or declaration nothing can read: a rule whose block ends up empty, a declaration a later one in the same block overrides, a rule an identical later sibling makes dead, and the `@charset` naming an encoding the output is not written in. On by default. Joining rules that are not dead is `mergeRules`.
	 * @since 5.110.0
	 */
	removeDeadRules?: boolean;
	/**
	 * Resolve the `@custom-media` and `@custom-selector` at-rules: write the query or the selector list a name stands for wherever one asks for it, and drop the rule that named it. `@custom-media --wide (width>400px)` with `@media (--wide)` becomes `@media (width>400px)`, and `@custom-selector :--heading h1, h2` with `:--heading` becomes `:is(h1, h2)`. Off until asked for: `module.parser.css.customMedia` and `module.parser.css.customSelectors` already resolve both in every stylesheet webpack parses, so this is for a `.css` asset that reached the minimizer without being parsed — one emitted by `asset/resource` or copied in. Only a name stated before the rule asking for it is written out — the rules are read in the order they are written — and a rule naming one this has not come to is left as the author had it. A selector list is written as `:is(…)`, so a name is substituted only where the target reads `:is()`.
	 * @since 5.111.0
	 */
	resolveCustomAtRules?: boolean;
	/**
	 * Shorten the values of custom properties (`--x: #ffffff` -> `#fff`, `--y: 0.5rem` -> `.5rem`), which are otherwise written back exactly as authored. Off by default: `getComputedStyle().getPropertyValue()` hands this text back, so a rewritten value is a different CSSOM — the one place a declaration's authored text survives. What it may rewrite is exactly what any other value's tokens may be, a color in a substitution's fallback included — that fallback being the property's value rather than the function's own argument.
	 * @since 5.110.0
	 */
	rewriteCustomProperties?: boolean;
	/**
	 * Write a `:dir()` the `browserslist` target cannot read as the `[dir]` attribute selector it approximates: `a:dir(rtl)` becomes `a[dir=rtl]`. Off until asked for, because the two are not the same question — `:dir()` reads the directionality an element resolves to, which it may inherit from an ancestor, while `[dir=rtl]` reads the attribute on the element itself, so an element inside a `dir="rtl"` ancestor matches the first and not the second. Only in effect for a `browserslist` target that reads no `:dir()`; any other target names no browsers to answer for.
	 * @since 5.111.0
	 */
	rewriteDirSelector?: boolean;
	/**
	 * Write an escaped identifier the shortest way that names the same thing, in a value or an id: `grid-area:\66oot` becomes `grid-area:foot` and `#\41 x` becomes `#Ax`. On by default, and exact: the escape and what replaces it are the same identifier. Off leaves every escape as the author wrote it, which is what a consumer comparing the text rather than reading the identifier needs.
	 * @since 5.111.0
	 */
	rewriteEscapes?: boolean;
	/**
	 * Write each color in the shortest spelling of the same value: `#ffffff` -> `#fff`, `rgb(1 2 3)` -> `#010203`, a named color where the property takes no identifier of the author's own, and every polar and Lab function the target agrees with hex on. On by default.
	 * @since 5.110.0
	 */
	shortenColors?: boolean;
	/**
	 * Shorten a rule's condition prelude: a media feature in its range spelling where the target reads one (`(min-width:100px)` -> `(width>=100px)`), an `and` of two one-sided ranges collapsed into the interval it describes, the `all` a query states before an `and` (which matches what the condition alone matches), and an operand a condition already states — in `@supports` and `@container` as well as `@media`. On by default.
	 * @since 5.110.0
	 */
	shortenMediaQueries?: boolean;
	/**
	 * Write each number in its shortest equal spelling — dropping a leading zero, a trailing fraction and a `+`, rounding to the six significant digits a stylesheet can observe, dropping the unit a zero does not need, and writing an alpha and a ratio the one way its grammar spells them. On by default.
	 * @since 5.110.0
	 */
	shortenNumbers?: boolean;
	/**
	 * Rewrite a selector into an equal one: a selector list deduplicated and ordered, a CSS2 pseudo-element's second colon dropped, the universal a compound already implies dropped, an `An+B` written the shortest way its microsyntax allows, and a `from` / `100%` keyframe selector written as the shorter of the pair. On by default.
	 * @since 5.110.0
	 */
	shortenSelectors?: boolean;
	/**
	 * Write a value the shortest way its property's own grammar allows: a `{1,4}` box or corner notation collapsed, a slot holding its own initial dropped, and `flex` / `font-weight` / `display` / `transition` / `<position>` / `<repeat-style>` written the short way. On by default. Merging separate longhand declarations is `mergeLonghands`.
	 * @since 5.110.0
	 */
	shortenValues?: boolean;
	/**
	 * Names a whole-project analysis found nothing uses, which the minimizer then takes out: a bare name is matched against every class and id a selector names and against every `@keyframes` name, and a `--`-prefixed one against every custom property a declaration sets. A selector list keeps the selectors that do not name one, and a rule left with none goes; a name inside a functional pseudo (`:not(.gone)`, `:is(.gone, .kept)`) is not one the rule needs, so it is left alone. Nothing is derived here — the list is the caller's, and a name on it that something does use takes working CSS out.
	 * @since 5.111.0
	 */
	unusedSymbols?: Array</** A class, id, `@keyframes` or custom property name nothing uses. */ NonEmptyString>;
	/**
	 * Maintain vendor prefixes for the `browserslist` target: add the `-webkit-` / `-moz-` / `-ms-` spelling of a property, at-rule or pseudo-selector that a selected browser still needs, and drop one none of them does. On by default, and only in effect for a `browserslist` target — any other target names no browsers to prefix for. A browserslist name no compat dataset covers (`op_mini`, `and_uc`, `and_qq`, `baidu`, `kaios`, `bb`) is skipped, and a selection of nothing but those prefixes for no one.
	 * @since 5.110.0
	 */
	vendorPrefixes?: boolean;
}

/**
 * What the HTML minimizer does. Every transform that keeps the document's DOM is on by default and may be turned off on its own, so a page a rewrite breaks can be minimized without it while the rest still applies; the ones that change what a script or a selector reads back are off until asked for.
 * @since 5.110.0
 */
export interface OptimizationMinimizeHtml {
	/**
	 * Write a boolean attribute as the bare name its presence already means. The DOM reads `checked` from the attribute being there and never from its value, so `checked="checked"` and `checked=""` are the same element — but `getAttribute` hands back what was written. `true`, the default, rewrites only the spelling the spec itself canonicalizes, the attribute's own name; `"all"` rewrites any value, including the `checked="false"` that already means checked.
	 * @since 5.110.0
	 */
	collapseBooleanAttributes?: "all" | boolean;
	/**
	 * Collapse each run of whitespace in text to a single space. Left alone inside `pre`, `textarea` and `listing`, where whitespace renders verbatim. `true` (or `"conservative"`) never removes whitespace entirely — dropping it would join two inline elements that render apart. `"smart"` also drops the whitespace that sits against a block element's edge, where no line box reaches it. `"all"` drops the whitespace at every text node's edges, which does change how adjacent inline elements render.
	 * @since 5.110.0
	 */
	collapseWhitespace?: ("conservative" | "smart" | "all") | boolean;
	/**
	 * Which comments survive. `"some"`, the default, keeps nothing: every comment an HTML parser reads is inert; `true` (or `"all"`) keeps every comment and `false` keeps none; a string is read as a regular expression source, and it, a `RegExp` or a `(comment) => boolean` predicate is asked about each comment's own text and keeps the ones it accepts — standing in for the default rule rather than beside it, as terser's `format.comments` does, so a pattern that names nothing else drops the ones `"some"` would have kept. A downlevel conditional comment, a server-side include and a `<?…?>` template directive are code rather than comments and stay whatever this says. A predicate is handed to the minimizer's worker pool as source, so it must not close over anything.
	 * @since 5.110.0
	 */
	comments?:
		| ("all" | "some")
		| RegExp
		| boolean
		| string
		| ((comment: string) => boolean);
	/**
	 * Print a run of adjacent `<script>` elements as one, joined by a newline and a `;`. Only bare ones fold — any attribute at all, a `src`, `type`, `nonce`, `async` or `id` among them, says the two are not interchangeable with one — and only where the print writes the bodies itself, so a `<script>` that `output.html.inline` fills in after the print is left alone. A body is left alone too wherever appending it would change what it means: one still inside a string, template or block comment would swallow the next, and a directive prologue, a hashbang or a leading `-->` mean what they do only at a start the appended body no longer has. Off by default: it removes elements, so `document.scripts`, a `script:nth-child()` selector and `querySelectorAll("script").length` all read a different document; a later body's `var` and `function` declarations become visible to the bodies before it; and a body that throws takes the rest of its run with it rather than only itself, while one that does not parse takes the whole run, its own code included.
	 * @since 5.111.0
	 */
	mergeScripts?: boolean;
	/**
	 * Print a run of adjacent `<style>` elements as one sheet. Off by default: it removes elements, so `document.styleSheets`, a `style:nth-child()` selector and `querySelectorAll("style").length` all read a different document. A sheet the CSS minifier does not accept is never folded — appending to one that may be unterminated would make the next sheet part of its last rule — and neither is one led by `@import` / `@charset` / `@namespace`, which apply only at the top of a sheet.
	 * @since 5.110.0
	 */
	mergeStyles?: boolean;
	/**
	 * Minify the markup inside a downlevel-hidden conditional comment (`<!--[if IE]> … <![endif]-->`). Off by default: the body is minified on its own, so a context-sensitive decision inside it — which end tags are optional, where a table cell may sit — is taken as though it started a document rather than where the comment sits. Only browsers older than IE10 read these at all.
	 * @since 5.110.0
	 */
	minifyConditionalComments?: boolean;
	/**
	 * Write an attribute value with whichever delimiters cost least — bare where the grammar allows it, else under the quote that needs fewer character references. On by default: the DOM reads the same value either way.
	 * @since 5.110.0
	 */
	normalizeAttributeQuotes?: boolean;
	/**
	 * Fold an enumerated attribute's value to the keyword it names (`type="TEXT"` -> `type=text`), which the DOM matches ASCII case-insensitively. A value the spec does not enumerate is left as written. On by default.
	 * @since 5.110.0
	 */
	normalizeEnumeratedAttributes?: boolean;
	/**
	 * Normalize a list-shaped attribute value: a space-separated token list (`class`, `rel`, `part`, …), a comma-separated one (`accept`, `sizes`, …), a `srcset` and the viewport `<meta content>`. On by default. A list is read as the set the DOM reflects, so a repeat folds away, only where every token of it is a word: one holding a delimiter another language wrote a statement in is text, and keeps every token it names. Reordering a token list is `sortTokenLists`, which is separate and off by default.
	 * @since 5.110.0
	 */
	normalizeListAttributes?: boolean;
	/**
	 * Write an integer attribute (`tabindex`, `colspan`, `width`, …) the one way its own rules read it — leading whitespace, a `+` and leading zeros all go. On by default.
	 * @since 5.110.0
	 */
	normalizeNumericAttributes?: boolean;
	/**
	 * Drop the ASCII whitespace around a URL value (`href`, `src`, `action`, `poster`, …), which resolving the URL skips over, so the request goes to the same place either way. On by default: `getAttribute` hands back the attribute as written, so a script comparing those bytes is the one this is turned off for.
	 * @since 5.111.0
	 */
	normalizeUrlAttributes?: boolean;
	/**
	 * Drop an attribute whose empty or all-whitespace value leaves it in the state its absence gives: the globals `class`, `id`, `style`, `dir`, `accesskey`, `itemprop`, `itemref`, `itemtype` and `part`, and every attribute reflecting a token list on the elements the spec defines it for — `rel` on `<a>`, `<area>`, `<form>` and `<link>`, `ping` on `<a>` and `<area>`, `headers` on `<td>` and `<th>`, `blocking` on `<link>`, `<script>` and `<style>`, `sizes` on `<link>`, `for` on `<output>` — where an empty list is no tokens. Anywhere else that spelling is an author attribute whose meaning is a script's, so `<x-foo rel="">` and `<label for="">` keep it. Off by default: an attribute selector matches on presence, so `[class]` stops matching. Never dropped: `title` and `lang`, whose empty value means what absence does not; `sandbox`, whose empty list is the most restrictive state an `<iframe>` has; and an event handler, whose empty body still compiles to a function where absence reads null.
	 * @since 5.110.0
	 */
	removeEmptyAttributes?: boolean;
	/**
	 * Drop an element that has no children and no attributes. Kept anyway when its bare form is still doing a job (`canvas`, `slot`, `template`, `textarea`, `progress`, `meter`, `output`, `dialog`, and the table structure), when it is a void element, or when it is foreign content. Off by default: CSS can give an empty element a size or a `::before`, and the minifier cannot see the stylesheet. Emptiness is read off the output rather than the source, so a run of nested empties goes together and an element left empty only by a dropped comment or by whitespace `collapseWhitespace` deletes goes with them.
	 * @since 5.110.0
	 */
	removeEmptyElements?: boolean;
	/**
	 * How much of the `<html>` / `<head>` / `<body>` shell §13.1.2.4 lets the parser imply may be left out. Every other optional tag goes unconditionally — nothing can observe that — but these six are what a consumer reading the page with a regexp rather than a parser looks for. `"smart"`, the default, leaves out the one such a reader never matches: the `<html>` start tag, which is omittable only when it carries no attribute at all, so the `<html lang=en>` anyone greps for keeps its tag anyway. `</html>` stays with it, since a truncation check reads a page as complete by finding one. `true` (or `"all"`) leaves out all six, which is where a crawler matching on `<body>` stops finding one; `false` leaves out none. A tag also stays wherever the spec keeps it: an attribute to carry, a comment minifying does not drop, whitespace opening the element, or a `meta` / `noscript` / `link` / `script` / `style` / `template` element opening the body.
	 * @since 5.110.0
	 */
	removeImpliedTags?: ("smart" | "all") | boolean;
	/**
	 * Leave out a tag §13.1.2.4 lets the parser imply, other than the `<html>` / `<head>` / `<body>` shell, which `removeImpliedTags` decides on its own. On by default: nothing can observe the difference, the tree parses the same either way. A tag still stays wherever the spec keeps it — a comment or whitespace behind it, or a following element the insertion mode does not close it through.
	 * @since 5.110.0
	 */
	removeOptionalTags?: boolean;
	/**
	 * Drop an attribute whose value is the one the element already defaults to. Off by default: an attribute a page no longer carries is one `getAttribute` and every attribute selector read differently, whichever tier dropped it. `true` (or `"smart"`) drops only markers on elements that render nothing — `<script type=text/javascript>`, `<script language=javascript>`, `<script charset=utf-8>`, `<style type=text/css>`, `<link type=text/css>`, `<link media=all>` — so no rule that styles the page stops applying, which is what `@swc/html` does by default. `"all"` also drops spec defaults such as `<input type=text>` and `<form method=get>`, which reaches further still: an attribute selector matches the content attribute, not the reflected default, so `input[type=text]` stops matching.
	 * @since 5.110.0
	 */
	removeRedundantAttributes?: ("smart" | "all") | boolean;
	/**
	 * Print an element's attributes in a fixed order: the document's commonest attribute names first, ties by name. Nothing in HTML reads attribute order, so this only makes the same markup compress better across pages — the run of attributes two elements share becomes the same run of bytes. Off by default: a script reading `element.attributes` back, or a snapshot of the emitted HTML, sees the new order.
	 * @since 5.110.0
	 */
	sortAttributes?: boolean;
	/**
	 * Print every space-separated token list the DOM reads as a set — `class`, `rel`, `part`, `sandbox`, `blocking`, `itemprop` / `itemref` / `itemtype`, `<output for>` and `<link sizes>` — in token order. Nothing matching those reads order, so this only makes the same markup compress better across pages. Off by default: a script reading `className` or `rel` back sees the new order. Asked for on its own: a list this reorders is rewritten whether or not `normalizeListAttributes` is on, since another order is another spelling. The lists the DOM does not read as a set are left alone whatever this says — `ping` is the order its requests go out in and `accesskey` the order its keys are tried.
	 * @since 5.110.0
	 */
	sortTokenLists?: boolean;
}

/**
 * Options handed as-is to the JavaScript minimizer (terser-compatible). Defaults to `{ compress: { passes: 2 } }`.
 * @since 5.110.0
 * @additionalProperties
 */
export type OptimizationMinimizeJavascript = { [key: string]: any };

/**
 * Enable minimizing the output, configured per asset type. An absent type is minimized with the defaults; `false` disables minimizing it.
 * @since 5.110.0
 */
export interface OptimizationMinimizeOptions {
	/**
	 * Minimize CSS assets: `false` disables it, an object configures what the built-in minimizer may do beyond the transforms that always apply.
	 */
	css?: false | OptimizationMinimizeCss;
	/**
	 * Minimize HTML assets: `false` disables it, an object configures what the built-in minimizer may do beyond the transforms that always apply.
	 */
	html?: false | OptimizationMinimizeHtml;
	/**
	 * Minimize JavaScript assets: `false` disables it, an object is handed as-is to the JavaScript minimizer.
	 */
	javascript?: false | OptimizationMinimizeJavascript;
	/**
	 * Minimize JSON assets by re-serializing them without whitespace (defaults to `true` with `experiments.futureDefaults`, otherwise `false`).
	 * @since 5.112.0
	 */
	json?: boolean;
}

/**
 * Enables/Disables integrated optimizations.
 */
export interface OptimizationNormalized {
	/**
	 * Avoid wrapping the entry module in an IIFE.
	 */
	avoidEntryIife?: boolean;
	/**
	 * Check for incompatible wasm types when importing/exporting from/to ESM.
	 */
	checkWasmTypes?: boolean;
	/**
	 * Define the algorithm to choose chunk ids (named: readable ids for better debugging, deterministic: numeric hash ids for better long term caching, size: numeric ids focused on minimal initial download size, total-size: numeric ids focused on minimal total download size, false: no algorithm used, as custom one can be provided via plugin).
	 */
	chunkIds?:
		"natural" | "named" | "deterministic" | "size" | "total-size" | false;
	/**
	 * Concatenate modules when possible to generate less modules, more efficient code and enable more optimizations by the minimizer. An options object implies 'true'.
	 */
	concatenateModules?: boolean | ConcatenateModulesOptions;
	/**
	 * Emit assets even when errors occur. Critical errors are emitted into the generated code and will cause errors at runtime.
	 */
	emitOnErrors?: boolean;
	/**
	 * Also flag chunks as loaded which contain a subset of the modules.
	 */
	flagIncludedChunks?: boolean;
	/**
	 * Inline ESM exports that bind to small primitive constants (≤6-byte null/undefined/boolean/number/string). Inlining makes the import dependency inactive so DCE can drop the export and possibly the module.
	 */
	inlineExports?: boolean;
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
	 * Enable minimizing the output, configured per asset type. An absent type is minimized with the defaults; `false` disables minimizing it.
	 * @since 5.110.0
	 */
	minimizeOptions?: OptimizationMinimizeOptions;
	/**
	 * Minimizer(s) to use for minimizing the output.
	 * @cliExclude
	 */
	minimizer?: Array<
		| /** Plugin of type object or instanceof Function. */ "..."
		| WebpackPluginInstance
		| WebpackPluginFunction
	>;
	/**
	 * Define the algorithm to choose module ids (natural: numeric ids in order of usage, named: readable ids for better debugging, hashed: (deprecated) short hashes as ids for better long term caching, deterministic: numeric hash ids for better long term caching, size: numeric ids focused on minimal initial download size, false: no algorithm used, as custom one can be provided via plugin).
	 */
	moduleIds?: "natural" | "named" | "hashed" | "deterministic" | "size" | false;
	/**
	 * Avoid emitting assets when errors occur (deprecated: use 'emitOnErrors' instead).
	 * @deprecated
	 * @cliExclude
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
	runtimeChunk?: OptimizationRuntimeChunkNormalized;
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
 * Create an additional chunk which contains only the webpack runtime and chunk hash maps.
 */
export type OptimizationRuntimeChunk =
	| ("single" | "multiple")
	| boolean
	| {
			/**
			 * The name or name factory for the runtime chunks.
			 */
			name?:
				| string
				| import("../lib/optimize/RuntimeChunkPlugin").RuntimeChunkFunction;
	  };

/**
 * Create an additional chunk which contains only the webpack runtime and chunk hash maps.
 */
export type OptimizationRuntimeChunkNormalized =
	| false
	| {
			/**
			 * The name factory for the runtime chunks.
			 */
			name?: import("../lib/optimize/RuntimeChunkPlugin").RuntimeChunkFunction;
	  };

/**
 * Options object for describing behavior of a cache group selecting modules that should be cached together.
 */
export interface OptimizationSplitChunksCacheGroup {
	/**
	 * Sets the name delimiter for created chunks.
	 */
	automaticNameDelimiter?: NonEmptyString;
	/**
	 * Select chunks for determining cache group content (defaults to "initial", "initial" and "all" requires adding these chunks to the HTML).
	 */
	chunks?:
		| ("initial" | "async" | "all")
		| RegExp
		| import("../lib/optimize/SplitChunksPlugin").ChunkFilterFn;
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
		| NonEmptyRelativePath
		| import("../lib/template/TemplatedPathPlugin").TemplatePathFn<
				import("../lib/Compilation").PathDataChunk
		  >;
	/**
	 * Sets the hint for chunk id.
	 */
	idHint?: string;
	/**
	 * Assign modules to a cache group by module layer.
	 */
	layer?:
		| RegExp
		| string
		| import("../lib/optimize/SplitChunksPlugin").CheckModuleLayerFn;
	/**
	 * Maximum number of requests which are accepted for on-demand loading.
	 */
	maxAsyncRequests?: PositiveNumber;
	/**
	 * Maximal size hint for the on-demand chunks.
	 */
	maxAsyncSize?: OptimizationSplitChunksSizes;
	/**
	 * Maximum number of initial chunks which are accepted for an entry point.
	 */
	maxInitialRequests?: PositiveNumber;
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
	minChunks?: PositiveNumber;
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
	name?: false | string | import("../lib/optimize/SplitChunksPlugin").GetNameFn;
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
	test?:
		RegExp | string | import("../lib/optimize/SplitChunksPlugin").CheckTestFn;
	/**
	 * Assign modules to a cache group by module type.
	 */
	type?:
		| RegExp
		| string
		| import("../lib/optimize/SplitChunksPlugin").CheckModuleTypeFn;
	/**
	 * Compare used exports when checking common modules. Modules will only be put in the same chunk when exports are equal.
	 */
	usedExports?: boolean;
}

/**
 * A function returning cache groups.
 */
export type OptimizationSplitChunksGetCacheGroups =
	import("../lib/optimize/SplitChunksPlugin").RawGetCacheGroups;

/**
 * Options object for splitting chunks into smaller chunks.
 */
export interface OptimizationSplitChunksOptions {
	/**
	 * Sets the name delimiter for created chunks.
	 */
	automaticNameDelimiter?: NonEmptyString;
	/**
	 * Assign modules to a cache group (modules from different cache groups are tried to keep in separate chunks, default categories: 'default', 'defaultVendors').
	 * @not {"description":"Using the cacheGroup shorthand syntax with a cache group named 'test' is a potential config error\nDid you intent to define a cache group with a test instead?\ncacheGroups: {\n  <name>: {\n    test: ...\n  }\n}.","type":"object","additionalProperties":true,"properties":{"test":{"description":"The test property is a cache group name, but using the test option of the cache group could be intended instead.","anyOf":[{"instanceof":"RegExp","tsType":"RegExp"},{"type":"string"},{"$ref":"#/definitions/OptimizationSplitChunksGetCacheGroups"}]}},"required":["test"]}
	 */
	cacheGroups?: {
		/**
		 * Configuration for a cache group.
		 */
		[key: string]:
			| false
			| RegExp
			| string
			| OptimizationSplitChunksGetCacheGroups
			| OptimizationSplitChunksCacheGroup;
	};
	/**
	 * Select chunks for determining shared modules (defaults to "async", "initial" and "all" requires adding these chunks to the HTML).
	 */
	chunks?:
		| ("initial" | "async" | "all")
		| RegExp
		| import("../lib/optimize/SplitChunksPlugin").ChunkFilterFn;
	/**
	 * Rounds of intersections of the chunk sets to look through for modules shared by chunks no single chunk set holds together (0 looks through the chunk sets alone; every round costs more computation).
	 * @since 5.112.0
	 */
	dedupDepth?: NonNegativeNumber;
	/**
	 * Sets the size types which are used when a number is used for sizes.
	 * @minItems 1
	 */
	defaultSizeTypes?: Array</** Size type, like 'javascript', 'webassembly'. @jsonType string @tsType import("../lib/module/Module").SourceType */ string>;
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
		automaticNameDelimiter?: NonEmptyString;
		/**
		 * Select chunks for determining shared modules (defaults to "async", "initial" and "all" requires adding these chunks to the HTML).
		 */
		chunks?:
			| ("initial" | "async" | "all")
			| RegExp
			| import("../lib/optimize/SplitChunksPlugin").ChunkFilterFn;
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
		| NonEmptyRelativePath
		| import("../lib/template/TemplatedPathPlugin").TemplatePathFn<
				import("../lib/Compilation").PathDataChunk
		  >;
	/**
	 * Prevents exposing path info when creating names for parts splitted by maxSize.
	 */
	hidePathInfo?: boolean;
	/**
	 * Maximum number of requests which are accepted for on-demand loading.
	 */
	maxAsyncRequests?: PositiveNumber;
	/**
	 * Maximal size hint for the on-demand chunks.
	 */
	maxAsyncSize?: OptimizationSplitChunksSizes;
	/**
	 * Maximum number of initial chunks which are accepted for an entry point.
	 */
	maxInitialRequests?: PositiveNumber;
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
	minChunks?: PositiveNumber;
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
	name?: false | string | import("../lib/optimize/SplitChunksPlugin").GetNameFn;
	/**
	 * Compare used exports when checking common modules. Modules will only be put in the same chunk when exports are equal.
	 */
	usedExports?: boolean;
}

/**
 * Size description for limits.
 */
export type OptimizationSplitChunksSizes =
	| /** Size of the javascript part of the chunk. */ NonNegativeNumber
	| /** Specify size limits per size type. */ {
			/**
			 * Size of the part of the chunk with the type of the key.
			 */
			[key: string]: number;
	  };

/**
 * Options affecting the output of the compilation. `output` options tell webpack how to write the compiled files to disk.
 */
export interface Output {
	/**
	 * @cliExclude
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
	 * @cliExclude
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
	 * Copy files and directories to the output directory.
	 * @since 5.111.0
	 */
	copy?: Copy;
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
	 * Digest types used for the hash.
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
	 * Generate an HTML file for each non-HTML entrypoint with its JS and CSS output chunks injected. Can be overridden per entry via the entry descriptor `html` option.
	 */
	html?: OutputHtml;
	/**
	 * Specifies the filename template of non-initial output html files on disk. You must **not** specify an absolute path here, but the path may contain folders separated by '/'! The specified path is joined with the value of the 'output.path' option to determine the location on disk.
	 */
	htmlChunkFilename?: HtmlChunkFilename;
	/**
	 * Specifies the filename template of output html files on disk. You must **not** specify an absolute path here, but the path may contain folders separated by '/'! The specified path is joined with the value of the 'output.path' option to determine the location on disk.
	 */
	htmlFilename?: HtmlFilename;
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
	 * @cliExclude
	 */
	libraryExport?: LibraryExport;
	/**
	 * @cliExclude
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
	 * Resource-hint (`<link rel="prefetch">` / `<link rel="preload">` / `<link rel="modulepreload">` / `<link rel="preconnect">`) emission for extracted HTML entries and URL-referenced assets. Accepts the initial-graph shorthand (boolean / `"prefetch"` / `"preload"` / `"none"` / `HtmlResourceHint[]` / function — equivalent to `{ initial: <value> }`) or the full object form `{ initial, urlHints, preconnect, modulePreloadPolyfill, manifest }`. `initial` defaults on for ESM output (`output.module`), where native `import()` would otherwise waterfall; classic output stays opt-in.
	 * @since 5.109.0
	 */
	resourceHints?: ResourceHints;
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
	 * @deprecated
	 */
	strictModuleExceptionHandling?: StrictModuleExceptionHandling;
	/**
	 * Emit a runtime check that throws a 'MODULE_NOT_FOUND' error when a required module id is missing from the bundle.
	 */
	strictModuleResolution?: StrictModuleResolution;
	/**
	 * Use a Trusted Types policy to create urls for chunks. 'output.uniqueName' is used a default policy name. Passing a string sets a custom policy name.
	 */
	trustedTypes?:
		| true
		| /** The name of the Trusted Types policy created by webpack to serve bundle chunks. */ NonEmptyString
		| TrustedTypes;
	/**
	 * @cliExclude
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
	 * Fall back to non-streaming WebAssembly instantiation when streaming compilation fails because the server does not serve `.wasm` files with the `application/wasm` MIME type.
	 * @since 5.109.0
	 */
	wasmStreamingFallback?: WasmStreamingFallback;
	/**
	 * The filename of WebAssembly modules as relative path inside the 'output.path' directory.
	 */
	webassemblyModuleFilename?: WebassemblyModuleFilename;
	/**
	 * Specifies the filename template of non-initial output worker's files on disk. You must **not** specify an absolute path here, but the path may contain folders separated by '/'! The specified path is joined with the value of the 'output.path' option to determine the location on disk.
	 */
	workerChunkFilename?: WorkerChunkFilename;
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
 * Generate an HTML file for each non-HTML entrypoint with its JS and CSS output chunks injected. Can be overridden per entry via the entry descriptor `html` option.
 */
export type OutputHtml = boolean | OutputHtmlOptions;

/**
 * Options for the generated HTML files.
 */
export interface OutputHtmlOptions {
	/**
	 * Inject a `<base>` element into the page `<head>`. A string sets `href`; an object sets both `href` and optionally `target`. Skipped if the HTML already contains a `<base>` element.
	 * @since 5.109.0
	 */
	base?:
		| NonEmptyString
		| {
				/**
				 * Value for the `href` attribute of the `<base>` element.
				 */
				href: NonEmptyString;
				/**
				 * Value for the `target` attribute of the `<base>` element (e.g. `"_blank"`).
				 */
				target?: NonEmptyString;
		  };
	/**
	 * Inject a `<meta http-equiv="Content-Security-Policy">` into every webpack-emitted HTML page. `false` (default) does nothing; `true` uses a strict baseline (`script-src 'self'`, `style-src 'self'`, `object-src 'none'`, `base-uri 'self'`) and appends a `sha256` hash of every inline `<script>`/`<style>` to `script-src`/`style-src`. An object customizes it. Skipped when the page already declares a CSP.
	 */
	csp?:
		| boolean
		| {
				/**
				 * Hash algorithm used for inline `<script>`/`<style>` sources.
				 */
				hashFunction?: "sha256" | "sha384" | "sha512";
				/**
				 * Placeholder nonce added to injected `<script>`/`<style>` tags and as a `'nonce-…'` source; rewrite it per request server-side.
				 */
				nonce?: NonEmptyString;
				/**
				 * CSP directives merged over the baseline. Each key is a directive (e.g. `"script-src"`); the value is a source string or list. Inline hashes and any `nonce` are still appended to `script-src`/`style-src`.
				 */
				policy?: {
					/**
					 * A CSP source expression, or a list of them, for this directive.
					 */
					[key: string]:
						| Array</** A CSP source expression (e.g. `"'self'"`, `"https://cdn.example.com"`). */ string>
						| string;
				};
		  };
	/**
	 * Favicon(s) for webpack-generated HTML (authored pages are left untouched). `false` (default) injects nothing; `true` injects the webpack logo; a string is a path to an icon; an object maps each `<link rel>` to an icon — a path string, an object with the icon `href` plus extra link attributes (`sizes`, `media`, `color`, `type`, `crossorigin`), or an array of these for multiple icons under the same `rel` (e.g. several `sizes`, or light/dark `media` variants); a function receives the page name and returns one of these. Every icon is emitted as a hashed asset.
	 * @since 5.109.0
	 */
	favicon?:
		| boolean
		| NonEmptyString
		| {
				/**
				 * Icon(s) for a single `<link rel>`: one icon or an array of icons.
				 */
				[key: string]: /** @minItems 1 */ HtmlFaviconIcon[] | HtmlFaviconIcon;
		  }
		| ((
				name: string
		  ) =>
				| boolean
				| string
				| { [rel: string]: HtmlFaviconIcon | HtmlFaviconIcon[] });
	/**
	 * Where to place injected chunk `<script>`/`<link>` tags. `"body"` (default; `"head"` with `output.module`) keeps them next to the entry tag — end of `<body>` on generated pages; `"head"` moves them into `<head>`; `false` suppresses sibling-chunk injection (entry tags and resource hints remain).
	 * @since 5.109.0
	 */
	inject?: ("body" | "head") | /** @jsonType boolean */ false;
	/**
	 * Inline the content of matching chunks directly into the HTML instead of emitting a separate `<script>`/`<link>` tag. `true` inlines every chunk; `"script"` inlines only JavaScript, `"style"` only CSS; an array of `RegExp` patterns matches against the chunk name and the filename template it is emitted under. A chunk another entry loads its runtime from by url stays a separate file.
	 * @since 5.109.0
	 */
	inline?:
		| Array</** A regular expression matched against the chunk name; matching chunks are inlined. */ RegExp>
		| ("script" | "style")
		| boolean;
	/**
	 * Add Subresource Integrity (SRI) `integrity` attributes to injected `<script>`/`<link>` tags. `true` uses `['sha384']`; an array sets the hash algorithms; a function receives each referenced asset and returns the algorithms to use or `false` to skip it.
	 * @since 5.109.0
	 */
	integrity?:
		| Array</** A hash algorithm name passed to Node.js `crypto.createHash` (e.g. 'sha256', 'sha384', 'sha512'). */ NonEmptyString>
		| boolean
		| ((asset: {
				chunk: import("../lib/graph/Chunk");
				filename: string;
		  }) => string[] | false);
	/**
	 * Web app manifest for webpack-generated HTML (authored pages are left untouched). `false` (default) injects nothing. A string is a path to an existing `.webmanifest` file to link. An object is the manifest contents — serialized, emitted as a hashed `.webmanifest` and linked with `<link rel="manifest">`; its `icons`/`screenshots` `src` paths resolve like any request and are emitted as hashed assets. A function receives the page name and returns one of these.
	 */
	manifest?:
		| false
		| NonEmptyString
		| /** @additionalProperties */ { [key: string]: any }
		| ((name: string) => false | string | { [key: string]: EXPECTED_ANY });
	/**
	 * Inject `<meta>` tags into the page `<head>`. Each key is the `name` attribute (or `"charset"` for a charset declaration); the value is the `content` string. Keys beginning with `og:` use the `property` attribute instead of `name`. A tag is skipped if the HTML already contains a meta with the same name.
	 * @since 5.109.0
	 */
	meta?: {
		/**
		 * Content string for the meta tag.
		 */
		[key: string]: string;
	};
	/**
	 * How injected `<script>` tags load. `auto` (default) emits a module script for ES module output and `defer` otherwise; `defer` forces a deferred script; `blocking` emits a plain blocking script.
	 */
	scriptLoading?: "auto" | "blocking" | "defer";
	/**
	 * Sets the `<title>` of the generated HTML page. Skipped if the HTML already contains a `<title>` element.
	 * @since 5.109.0
	 */
	title?: string;
}

/**
 * Output javascript files as module source type.
 */
export type OutputModule = boolean;

/**
 * Normalized options affecting the output of the compilation. `output` options tell webpack how to write the compiled files to disk.
 * @required environment, enabledChunkLoadingTypes, enabledLibraryTypes, enabledWasmLoadingTypes
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
	 * Patterns of files which are copied to the output directory, and the options of the copying itself.
	 */
	copy?: CopyOptions;
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
	enabledChunkLoadingTypes: EnabledChunkLoadingTypes;
	/**
	 * List of library types enabled for use by entry points.
	 */
	enabledLibraryTypes: EnabledLibraryTypes;
	/**
	 * List of wasm loading types enabled for use by entry points.
	 */
	enabledWasmLoadingTypes: EnabledWasmLoadingTypes;
	/**
	 * The abilities of the environment where the webpack generated code should run.
	 */
	environment: Environment;
	/**
	 * Specifies the filename of output files on disk. You must **not** specify an absolute path here, but the path may contain folders separated by '/'! The specified path is joined with the value of the 'output.path' option to determine the location on disk.
	 */
	filename?: Filename;
	/**
	 * An expression which is used to address the global object/scope in runtime code.
	 */
	globalObject?: GlobalObject;
	/**
	 * Digest types used for the hash.
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
	 * Generate an HTML file for each non-HTML entrypoint with its JS and CSS output chunks injected. Can be overridden per entry via the entry descriptor `html` option.
	 */
	html?: OutputHtml;
	/**
	 * Specifies the filename template of non-initial output html files on disk. You must **not** specify an absolute path here, but the path may contain folders separated by '/'! The specified path is joined with the value of the 'output.path' option to determine the location on disk.
	 */
	htmlChunkFilename?: HtmlChunkFilename;
	/**
	 * Specifies the filename template of output html files on disk. You must **not** specify an absolute path here, but the path may contain folders separated by '/'! The specified path is joined with the value of the 'output.path' option to determine the location on disk.
	 */
	htmlFilename?: HtmlFilename;
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
	 * Full resource-hint configuration.
	 * @since 5.109.0
	 */
	resourceHints?: ResourceHintsOptions;
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
	 * @deprecated
	 */
	strictModuleExceptionHandling?: StrictModuleExceptionHandling;
	/**
	 * Emit a runtime check that throws a 'MODULE_NOT_FOUND' error when a required module id is missing from the bundle.
	 */
	strictModuleResolution?: StrictModuleResolution;
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
	 * Fall back to non-streaming WebAssembly instantiation when streaming compilation fails because the server does not serve `.wasm` files with the `application/wasm` MIME type.
	 * @since 5.109.0
	 */
	wasmStreamingFallback?: WasmStreamingFallback;
	/**
	 * The filename of WebAssembly modules as relative path inside the 'output.path' directory.
	 */
	webassemblyModuleFilename?: WebassemblyModuleFilename;
	/**
	 * Specifies the filename template of non-initial output worker's files on disk. You must **not** specify an absolute path here, but the path may contain folders separated by '/'! The specified path is joined with the value of the 'output.path' option to determine the location on disk.
	 */
	workerChunkFilename?: WorkerChunkFilename;
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
 * The number of parallel processed modules in the compilation.
 */
export type Parallelism = PositiveNumber;

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
	"asset/bytes"?: EmptyParserOptions;
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
	 * Parser options for css/auto and css/module modules.
	 */
	"css/auto"?: CssAutoOrModuleParserOptions;
	/**
	 * Parser options for css/global modules.
	 */
	"css/global"?: CssModuleParserOptions;
	/**
	 * Parser options for css/auto and css/module modules.
	 */
	"css/module"?: CssAutoOrModuleParserOptions;
	/**
	 * Parser options for html modules.
	 */
	html?: HtmlParserOptions;
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
	/**
	 * Parser options for JSON modules.
	 */
	json?: JsonParserOptions;
}

/**
 * Specify options for each parser.
 */
export interface ParserOptionsByModuleTypeUnknown {
	/**
	 * Options for parsing.
	 * @additionalProperties
	 */
	[key: string]: { [key: string]: any };
}

/**
 * Specify options for each parser.
 */
export type ParserOptionsByModuleType = ParserOptionsByModuleTypeKnown &
	ParserOptionsByModuleTypeUnknown;

/**
 * The output directory as **absolute path** (required).
 */
export type Path = AbsolutePath;

/**
 * Include comments with information about the modules.
 */
export type Pathinfo = "verbose" | boolean;

/**
 * Configuration for web performance recommendations.
 */
export type Performance = false | PerformanceOptions;

/**
 * Configuration object for web performance recommendations.
 */
export interface PerformanceOptions {
	/**
	 * Fallback value for the performance checks that are not set individually (has precedence over local webpack defaults). Does not apply to 'hints', 'maxAssetSize' or 'maxEntrypointSize'.
	 * @since 5.110.0
	 */
	all?: boolean;
	/**
	 * Report references in ESM output that keep webpack's runtime form, naming what stops each from being written as a literal 'import()' or 'new URL()' another bundler can follow (requires 'hints' to be enabled).
	 * @since 5.111.0
	 */
	analyzableBailouts?: boolean;
	/**
	 * Filter function to select assets that are checked.
	 */
	assetFilter?: import("../lib/performance/SizeLimitsPlugin").AssetFilter;
	/**
	 * Report chains of 'import()' calls where each chunk can only be requested once the one before it has arrived, so the levels cost round trips in series (requires 'hints' to be enabled).
	 * @since 5.110.0
	 */
	asyncChunkWaterfalls?: boolean;
	/**
	 * Report 'require.context' calls with no filter, which bundle every file under a directory (requires 'hints' to be enabled).
	 * @since 5.110.0
	 */
	broadContexts?: boolean;
	/**
	 * Report how much of the module graph the cache reused, and the modules that can never be reused (requires 'hints' to be enabled).
	 * @since 5.110.0
	 */
	cacheEffectiveness?: boolean;
	/**
	 * Report groups of modules that import each other synchronously (requires 'hints' to be enabled).
	 * @since 5.110.0
	 */
	circularDependencies?: boolean;
	/**
	 * Report chunks asked for as both prefetch and preload from the same place, where the two directives contradict each other.
	 * @since 5.110.0
	 */
	conflictingResourceHints?: boolean;
	/**
	 * Report modules emitted into more than one chunk, and the bytes the extra copies cost (requires 'hints' to be enabled).
	 * @since 5.110.0
	 */
	duplicateModules?: boolean;
	/**
	 * Report packages which are included more than once, in different versions or as multiple copies of the same version (requires 'hints' to be enabled).
	 * @since 5.110.0
	 */
	duplicatePackages?: boolean;
	/**
	 * Report modules whose exports cannot be read statically, which stops anything importing them from being tree-shaken (requires 'hints' to be enabled).
	 * @since 5.110.0
	 */
	dynamicExports?: boolean;
	/**
	 * Report modules that call 'eval' directly, which stops minification, scope hoisting and tree shaking (requires 'hints' to be enabled).
	 * @since 5.110.0
	 */
	evalUsage?: boolean;
	/**
	 * Sets the format of the hints: warnings, errors, stats-only or nothing at all.
	 */
	hints?: false | "warning" | "error" | "stats";
	/**
	 * Report the loaders, plugins and hooks that hold the main thread, timing each one's own code rather than what it waited for (requires 'hints' to be enabled).
	 * @since 5.110.0
	 */
	hotspots?: boolean;
	/**
	 * Report assets inlined as data urls that are large enough for the base64 cost and the lost caching to outweigh the request they save (requires 'hints' to be enabled).
	 * @since 5.110.0
	 */
	inlinedAssets?: boolean;
	/**
	 * Report a single module that makes up most of the chunk it is in (requires 'hints' to be enabled).
	 * @since 5.110.0
	 */
	largeModules?: boolean;
	/**
	 * Report polyfill packages that emulate language features the target already supports natively (requires 'hints' to be enabled).
	 * @since 5.110.0
	 */
	legacyJavascript?: boolean;
	/**
	 * File size limit (in bytes) when exceeded, that webpack will provide performance hints.
	 */
	maxAssetSize?: number;
	/**
	 * Total size of an entry point (in bytes).
	 */
	maxEntrypointSize?: number;
	/**
	 * Report packages that keep unused code in the bundle because their package.json does not declare 'sideEffects' (requires 'hints' to be enabled).
	 * @since 5.110.0
	 */
	missingSideEffects?: boolean;
	/**
	 * Report an entry that exports a default beside named exports for a CommonJS library, where a consumer receives the namespace object (requires 'hints' to be enabled).
	 * @since 5.110.0
	 */
	mixedExports?: boolean;
	/**
	 * Report conditions in 'module.rules' that hardcode a path separator, so they only match on one operating system.
	 * @since 5.110.0
	 */
	osDependentRules?: boolean;
	/**
	 * Report '/*#__PURE__*\/' annotations that sit somewhere the parser does not read them (requires 'hints' to be enabled).
	 * @since 5.110.0
	 */
	pureAnnotations?: boolean;
	/**
	 * Report 'import()' calls whose module is already loaded where the call runs, so they defer nothing (requires 'hints' to be enabled).
	 * @since 5.110.0
	 */
	redundantDynamicImports?: boolean;
	/**
	 * Report modules that could not be merged into their importer's scope, and why (requires 'hints' to be enabled).
	 * @since 5.110.0
	 */
	scopeHoistingBailouts?: boolean;
	/**
	 * Report source maps that cost more than they give: a production 'devtool' that writes the map into the JavaScript, and modules a loader transformed without returning a map, which leaves positions pointing at the loader's output (requires 'hints' to be enabled).
	 * @since 5.111.0
	 */
	sourceMaps?: boolean;
	/**
	 * Report splits 'optimization.splitChunks' refused because 'maxInitialRequests' or 'maxAsyncRequests' was already reached (requires 'hints' to be enabled).
	 * @since 5.110.0
	 */
	splitChunksCapped?: boolean;
	/**
	 * Report chunks loaded on demand that carry less than 'optimization.splitChunks.minSize' (requires 'hints' to be enabled).
	 * @since 5.110.0
	 */
	tinyChunks?: boolean;
	/**
	 * Report modules that read 'this' at the top level of an ES module, where it is 'undefined' rather than the module object or the global one (requires 'hints' to be enabled).
	 * @since 5.110.0
	 */
	topLevelThis?: boolean;
	/**
	 * Report initial chunks that mix 'node_modules' code with application code, so every application change re-downloads the dependencies too (requires 'hints' to be enabled).
	 * @since 5.110.0
	 */
	unsplitVendors?: boolean;
	/**
	 * Report asset files emitted for an import whose binding nothing reads, so the bytes ship for nothing (requires 'hints' to be enabled).
	 * @since 5.111.0
	 */
	unusedAssets?: boolean;
	/**
	 * Report configuration that no build used: 'resolve.alias' entries nothing matched, 'DefinePlugin' keys nothing referenced, 'externals' nothing imported, 'module.rules' that never matched, and Module Federation 'shared' keys or 'remotes' nothing imported.
	 * @since 5.111.0
	 */
	unusedConfig?: boolean;
	/**
	 * Report modules bundled although nothing uses what they export, naming the re-export or the side-effect statement that kept each one (requires 'hints' to be enabled).
	 * @since 5.111.0
	 */
	unusedModules?: boolean;
}

/**
 * Add additional plugins to the compiler.
 */
export type Plugins = Array<
	| /** Plugin of type object or instanceof Function. */ Falsy
	| WebpackPluginInstance
	| WebpackPluginFunction
>;

/**
 * Add additional plugins to the compiler.
 */
export type PluginsNormalized = Array<
	| /** Plugin of type object or instanceof Function. */ WebpackPluginInstance
	| WebpackPluginFunction
>;

/**
 * Capture timing information for each module.
 */
export type Profile = boolean;

/**
 * The 'publicPath' specifies the public URL address of the output files when referenced in a browser.
 */
export type PublicPath = "auto" | RawPublicPath;

/**
 * A developer tool to enhance debugging (false | eval | [inline-|hidden-|eval-][nosources-][cheap-[module-]]source-map).
 */
export type RawDevTool = (false | "eval") | DevToolSpelling;

/**
 * The 'publicPath' specifies the public URL address of the output files when referenced in a browser.
 */
export type RawPublicPath =
	string | import("../lib/template/TemplatedPathPlugin").TemplatePathFn;

/**
 * Store compiler state to a json file.
 */
export type RecordsInputPath = false | AbsolutePath;

/**
 * Load compiler state from a json file.
 */
export type RecordsOutputPath = false | AbsolutePath;

/**
 * Store/Load compiler state from/to a json file. This will result in persistent ids of modules and chunks. An absolute path is expected. `recordsPath` is used for `recordsInputPath` and `recordsOutputPath` if they left undefined.
 */
export type RecordsPath = false | AbsolutePath;

/**
 * Options for the resolver.
 */
export type Resolve = ResolveOptions;

/**
 * Redirect module requests.
 */
export type ResolveAlias =
	| Array</** Alias configuration. */ {
			/**
			 * New request.
			 */
			alias:
				| /** Multiple alternative requests. */ Array</** One choice of request. */ NonEmptyString>
				| /** Ignore request (replace with empty module). */ false
				| /** New request. */ NonEmptyString;
			/**
			 * Request to be redirected.
			 */
			name: string;
			/**
			 * Redirect only exact matching request.
			 */
			onlyModule?: boolean;
	  }>
	| {
			/**
			 * New request.
			 */
			[key: string]:
				| /** Multiple alternative requests. */ Array</** One choice of request. */ NonEmptyString>
				| /** Ignore request (replace with empty module). */ false
				| /** New request. */ NonEmptyString;
	  };

/**
 * Options for the resolver when resolving loaders.
 */
export type ResolveLoader = ResolveOptions;

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
	aliasFields?: Array<
		| /** Field in the description file (usually package.json) which are used to redirect requests inside the module. */ Array</** Part of the field path in the description file (usually package.json) which are used to redirect requests inside the module. */ NonEmptyString>
		| NonEmptyString
	>;
	/**
	 * Extra resolve options per dependency category. Typical categories are "commonjs", "amd", "esm".
	 */
	byDependency?: {
		/**
		 * Options object for resolving requests.
		 */
		[key: string]: ResolveOptions;
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
	conditionNames?: Array</** Condition names for exports field entry point. */ string>;
	/**
	 * Filenames used to find a description file (like a package.json).
	 */
	descriptionFiles?: Array</** Filename used to find a description file (like a package.json). */ NonEmptyString>;
	/**
	 * Enforce the resolver to use one of the extensions from the extensions option (User must specify requests without extension).
	 */
	enforceExtension?: boolean;
	/**
	 * Field names from the description file (usually package.json) which are used to provide entry points of a package.
	 */
	exportsFields?: Array</** Field name from the description file (usually package.json) which is used to provide entry points of a package. */ string>;
	/**
	 * An object which maps extension to extension aliases.
	 */
	extensionAlias?: {
		/**
		 * Extension alias.
		 */
		[key: string]:
			| /** Multiple extensions. */ Array</** Aliased extension. */ NonEmptyString>
			| /** Aliased extension. */ NonEmptyString;
	};
	/**
	 * Extensions added to the request when trying to find the file.
	 */
	extensions?: Array</** Extension added to the request when trying to find the file. */ string>;
	/**
	 * Redirect module requests when normal resolving fails.
	 */
	fallback?: ResolveAlias;
	/**
	 * Filesystem for the resolver.
	 * @typeOnly
	 */
	fileSystem?: import("../lib/fs/fs").InputFileSystem;
	/**
	 * Treats the request specified by the user as fully specified, meaning no extensions are added and the mainFiles in directories are not resolved (This doesn't affect requests from mainFields, aliasFields or aliases).
	 */
	fullySpecified?: boolean;
	/**
	 * Field names from the description file (usually package.json) which are used to provide internal request of a package (requests starting with # are considered as internal).
	 */
	importsFields?: Array</** Field name from the description file (usually package.json) which is used to provide internal request of a package (requests starting with # are considered as internal). */ string>;
	/**
	 * Field names from the description file (package.json) which are used to find the default entry point.
	 */
	mainFields?: Array<
		| /** Field name from the description file (package.json) which are used to find the default entry point. */ Array</** Part of the field path from the description file (package.json) which are used to find the default entry point. */ NonEmptyString>
		| NonEmptyString
	>;
	/**
	 * Filenames used to find the default entry point if there is no description file or main field.
	 */
	mainFiles?: Array</** Filename used to find the default entry point if there is no description file or main field. */ NonEmptyString>;
	/**
	 * Folder names or directory paths where to find modules.
	 */
	modules?: Array</** Folder name or directory path where to find modules. */ NonEmptyString>;
	/**
	 * Plugins for the resolver.
	 * @cliExclude
	 */
	plugins?: Array<
		| /** Plugin of type object or instanceof Function. */ "..."
		| Falsy
		| ResolvePluginInstance
	>;
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
	 * @typeOnly
	 */
	resolver?: import("enhanced-resolve").Resolver;
	/**
	 * A list of resolve restrictions. Resolve results must fulfill all of these restrictions to resolve successfully. Other resolve paths are taken when restrictions are not met.
	 */
	restrictions?: Array<
		| /** Resolve restriction. Resolve result must fulfill this restriction. */ RegExp
		| AbsolutePath
	>;
	/**
	 * A list of directories in which requests that are server-relative URLs (starting with '/') are resolved.
	 */
	roots?: Array</** Directory in which requests that are server-relative URLs (starting with '/') are resolved. */ string>;
	/**
	 * Enable resolving symlinks to the original location.
	 */
	symlinks?: boolean;
	/**
	 * TypeScript config for paths mapping. Can be `false` (disabled), `true` (use default `tsconfig.json`), a string path to `tsconfig.json`, or an object with `configFile` and `references` options.
	 */
	tsconfig?:
		| boolean
		| string
		| {
				/**
				 * A path to the tsconfig file.
				 */
				configFile?: string;
				/**
				 * References to other tsconfig files. 'auto' inherits from TypeScript config, or an array of relative/absolute paths.
				 */
				references?: "auto" | string;
		  };
	/**
	 * Enable caching of successfully resolved requests (cache entries are not revalidated).
	 */
	unsafeCache?: boolean | /** @additionalProperties */ { [key: string]: any };
	/**
	 * Use synchronous filesystem calls for the resolver.
	 */
	useSyncFileSystemCalls?: boolean;
}

/**
 * Plugin instance.
 */
export type ResolvePluginInstance =
	| /** @additionalProperties */ {
			/**
			 * The run point of the plugin, required method.
			 */
			apply: (arg0: import("enhanced-resolve").Resolver) => void;
			[key: string]: any;
	  }
	| ((
			this: import("enhanced-resolve").Resolver,
			arg1: import("enhanced-resolve").Resolver
	  ) => void);

/**
 * Resource-hint (`<link rel="prefetch">` / `<link rel="preload">` / `<link rel="modulepreload">` / `<link rel="preconnect">`) emission for extracted HTML entries and URL-referenced assets. Accepts the initial-graph shorthand (boolean / `"prefetch"` / `"preload"` / `"none"` / `HtmlResourceHint[]` / function — equivalent to `{ initial: <value> }`) or the full object form `{ initial, urlHints, preconnect, modulePreloadPolyfill, manifest }`. `initial` defaults on for ESM output (`output.module`), where native `import()` would otherwise waterfall; classic output stays opt-in.
 * @since 5.109.0
 */
export type ResourceHints = ResourceHintsInitial | ResourceHintsOptions;

/**
 * Initial dependency-graph chunk hints. `true` auto-emits `<link rel="modulepreload">` (ESM output) or `<link rel="preload" as="script">` (classic) for each of the entry's initial dependency chunks; `"prefetch"` uses `<link rel="prefetch">`; `"preload"` is an alias of `true`; `false` disables chunk hints (URL-asset hints from magic comments / `urlHints` still fire); `"none"` is a hard off switch (no `<link>` anywhere, empty stats / manifest); an array of `HtmlResourceHint` descriptors replaces the auto set; a function receives the auto `defaultHints` plus context (`entryName`, `entrypoint`, `hostType: "html" | "js"`, `compilation`) and returns the final list (replaces the removed `resolveDependencies` hook).
 * @since 5.109.0
 */
export type ResourceHintsInitial =
	| HtmlResourceHint[]
	| ("prefetch" | "preload" | "none")
	| boolean
	| ((context: {
			entryName: string;
			entrypoint: import("../lib/graph/Entrypoint");
			hostType: "html" | "js";
			compilation: import("../lib/Compilation");
			defaultHints: (import("../lib/dependencies/html/HtmlEntryDependency").HtmlResourceHint & {
				hostChunks: string[];
			})[];
	  }) => import("../lib/dependencies/html/HtmlEntryDependency").HtmlResourceHint[]);

/**
 * Full resource-hint configuration.
 * @since 5.109.0
 */
export interface ResourceHintsOptions {
	/**
	 * Skip the runtime-injected `<link rel="prefetch">` for a chunk that is already preloaded or prefetched in the document (avoids a duplicate request in some browsers such as Chrome).
	 */
	dedupe?: boolean;
	/**
	 * Initial dependency-graph chunk hints. `true` auto-emits `<link rel="modulepreload">` (ESM output) or `<link rel="preload" as="script">` (classic) for each of the entry's initial dependency chunks; `"prefetch"` uses `<link rel="prefetch">`; `"preload"` is an alias of `true`; `false` disables chunk hints (URL-asset hints from magic comments / `urlHints` still fire); `"none"` is a hard off switch (no `<link>` anywhere, empty stats / manifest); an array of `HtmlResourceHint` descriptors replaces the auto set; a function receives the auto `defaultHints` plus context (`entryName`, `entrypoint`, `hostType: "html" | "js"`, `compilation`) and returns the final list (replaces the removed `resolveDependencies` hook).
	 * @since 5.109.0
	 */
	initial?: ResourceHintsInitial;
	/**
	 * Emit a JSON manifest of the resolved resource hints for each entrypoint (the same descriptors as `stats.entrypoints[].resourceHints`) as an output asset at this path. Lets an SSR server inject the `<link>` tags itself without walking the chunk graph — webpack's analogue of Vite's `build.ssrManifest`. Empty when `initial` is `"none"`.
	 */
	manifest?: NonEmptyString;
	/**
	 * Inject a tiny inline `<script>` polyfill for `<link rel="modulepreload">` into extracted HTML pages. Defaults from the target's modulepreload support (`output.environment.modulePreload`) — `true` when the environment lacks native support, `false` when it has it. Set `false` to never inject (the `<link>` tags are still emitted but do nothing on browsers without support — useful under a strict CSP that forbids inline scripts).
	 */
	modulePreloadPolyfill?: boolean;
	/**
	 * Auto-emit `<link rel="preconnect">` for the origin of a cross-origin `output.publicPath` (the origin bundles and assets are served from) into extracted HTML entries and the resource-hint stats / manifest. Mirrors `output.crossOriginLoading`. No-op when `publicPath` is relative or `"auto"`.
	 */
	preconnect?: boolean;
	/**
	 * Project-wide URL-referenced-asset hint rules, applied as the base `urlHints` of every parser (JavaScript `new URL(...)`, CSS `url(...)`, HTML `<img src>` / `<link href>`). Parser-scoped `module.parser.<type>.urlHints` rules and per-URL magic comments still override these.
	 */
	urlHints?: UrlHintRule[];
}

/**
 * A condition matcher.
 * @cliHelper
 */
export type RuleSetCondition =
	| RegExp
	| string
	| import("../lib/rules/RuleSetCompiler").RuleSetConditionFn
	| RuleSetLogicalConditions
	| RuleSetConditions;

/**
 * A condition matcher matching an absolute path.
 * @cliHelper
 */
export type RuleSetConditionAbsolute =
	| RegExp
	| AbsolutePath
	| import("../lib/rules/RuleSetCompiler").RuleSetConditionFn
	| RuleSetLogicalConditionsAbsolute
	| RuleSetConditionsAbsolute;

/**
 * One or multiple rule conditions.
 * @cliHelper
 */
export type RuleSetConditionOrConditions = RuleSetCondition | RuleSetConditions;

/**
 * One or multiple rule conditions matching an absolute path.
 * @cliHelper
 */
export type RuleSetConditionOrConditionsAbsolute =
	RuleSetConditionAbsolute | RuleSetConditionsAbsolute;

/**
 * A list of rule conditions.
 */
export type RuleSetConditions =
	Array</** A rule condition. */ RuleSetCondition>;

/**
 * A list of rule conditions matching an absolute path.
 */
export type RuleSetConditionsAbsolute =
	Array</** A rule condition matching an absolute path. */ RuleSetConditionAbsolute>;

/**
 * A glob pattern matched against a path, using `/` as path separator on every OS; a `!` prefix excludes what it matches.
 */
export type RuleSetGlob = NonEmptyString;

/**
 * A list of glob patterns.
 */
export type RuleSetGlobs = RuleSetGlob[];

/**
 * A loader request.
 */
export type RuleSetLoader = NonEmptyString;

/**
 * Options passed to a loader.
 */
export type RuleSetLoaderOptions = string | { [key: string]: any };

/**
 * Logic operators and glob patterns used in a condition matcher.
 */
export interface RuleSetLogicalConditions {
	/**
	 * Logical AND.
	 */
	and?: RuleSetConditions;
	/**
	 * Match glob patterns against the value, `!` in front of a pattern excludes it. Path separators are normalized to `/` on every OS, and a relative pattern matches at any depth.
	 * @since 5.110.0
	 */
	glob?: RuleSetGlob | RuleSetGlobs;
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
 * Logic operators and glob patterns used in a condition matcher.
 */
export interface RuleSetLogicalConditionsAbsolute {
	/**
	 * Logical AND.
	 */
	and?: RuleSetConditionsAbsolute;
	/**
	 * Match glob patterns against the value, `!` in front of a pattern excludes it. Path separators are normalized to `/` on every OS, and a relative pattern matches at any depth.
	 * @since 5.110.0
	 */
	glob?: RuleSetGlob | RuleSetGlobs;
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
 * A rule description with conditions and effects for modules.
 */
export interface RuleSetRule {
	/**
	 * Match on import assertions of the dependency.
	 */
	assert?: {
		[key: string]: RuleSetConditionOrConditions;
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
		[key: string]: RuleSetConditionOrConditions;
	};
	/**
	 * Match the path of the module relative to the directory of the description file (usually package.json), i.e. './lib/button.js'. Always uses forward slashes.
	 * @since 5.110.0
	 */
	descriptionRelativePath?: RuleSetConditionOrConditions;
	/**
	 * Enforce this rule as pre or post step.
	 */
	enforce?: "pre" | "post";
	/**
	 * Shortcut for resource.exclude.
	 */
	exclude?: RuleSetConditionOrConditionsAbsolute;
	/**
	 * Enable/Disable extracting source map.
	 */
	extractSourceMap?: boolean;
	/**
	 * The options for the module generator.
	 */
	generator?: { [key: string]: any };
	/**
	 * Match the module resource against glob patterns, `!` in front of a pattern excludes it. Combines with `test`, `include` and `exclude`.
	 * @since 5.110.0
	 */
	glob?: RuleSetGlob | RuleSetGlobs;
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
	oneOf?: Array</** A rule. */ Falsy | RuleSetRule>;
	/**
	 * Shortcut for use.options.
	 * @cliExclude
	 */
	options?: RuleSetLoaderOptions;
	/**
	 * Options for parsing.
	 * @additionalProperties
	 */
	parser?: { [key: string]: any };
	/**
	 * Match the import phase of the dependency.
	 */
	phase?: RuleSetConditionOrConditions;
	/**
	 * Match the real resource path of the module.
	 */
	realResource?: RuleSetConditionOrConditionsAbsolute;
	/**
	 * Options for the resolver.
	 * @jsonType object
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
	rules?: Array</** A rule. */ Falsy | RuleSetRule>;
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
		[key: string]: RuleSetConditionOrConditions;
	};
}

/**
 * A list of rules.
 */
export type RuleSetRules = Array<
	/** A rule. */ /** @cliExclude */ "..." | Falsy | RuleSetRule
>;

/**
 * A list of descriptions of loaders applied.
 */
export type RuleSetUse =
	| Array</** An use item. */ Falsy | RuleSetUseItem>
	| RuleSetUseFunction
	| RuleSetUseItem;

/**
 * The function is called on each data and return rule set item.
 */
export type RuleSetUseFunction =
	import("../lib/rules/RuleSetCompiler").RuleSetUseFn;

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
	| RuleSetUseFunction
	| RuleSetLoader;

/**
 * This option enables loading async chunks via a custom script type, such as script type="module".
 */
export type ScriptType = false | "text/javascript" | "module";

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
	 * Options for snapshotting the context module to determine if it needs to be built again.
	 */
	contextModule?: {
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
	immutablePaths?: Array<
		| /** List of paths that are managed by a package manager and contain a version or hash in its path so all files are immutable. */ /** A RegExp matching an immutable directory (usually a package manager cache directory, including the tailing slash) */ RegExp
		| /** A path to an immutable directory (usually a package manager cache directory). */ AbsolutePath
	>;
	/**
	 * List of paths that are managed by a package manager and can be trusted to not be modified otherwise.
	 */
	managedPaths?: Array<
		| /** List of paths that are managed by a package manager and can be trusted to not be modified otherwise. */ /** A RegExp matching a managed directory (usually a node_modules directory, including the tailing slash) */ RegExp
		| /** A path to a managed directory (usually a node_modules directory). */ AbsolutePath
	>;
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
	unmanagedPaths?: Array<
		| /** List of paths that are not managed by a package manager and the contents are subject to change. */ /** A RegExp matching an unmanaged directory. */ RegExp
		| /** A path to an unmanaged directory. */ AbsolutePath
	>;
}

/**
 * The filename of the SourceMaps for the JavaScript files. They are inside the 'output.path' directory.
 */
export type SourceMapFilename = RelativePath;

/**
 * Prefixes every line of the source in the bundle with this string.
 */
export type SourcePrefix = string;

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
	assetsSort?: false | string;
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
	 * @deprecated
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
	children?: StatsValue[] | StatsValue;
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
	 * Include the resolved `<link>` resource-hint descriptors for each entrypoint (`entrypoints[name].resourceHints`). Combines `output.resourceHints.chunks` (initial-graph modulepreload/preload/prefetch) with `output.resourceHints.assets` (URL-referenced fonts / images / …). Lets SSR frameworks inject the hints server-side without walking the chunk graph themselves; the analogue of Vite's `build.ssrManifest`.
	 * @since 5.109.0
	 */
	chunkGroupResourceHints?: boolean;
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
	chunksSort?: false | string;
	/**
	 * Enables/Disables colorful output.
	 */
	colors?:
		| /** Enables/Disables colorful output. */ boolean
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
	context?: AbsolutePath;
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
	 * Add cause to errors.
	 */
	errorCause?: "auto" | boolean;
	/**
	 * Add details to errors (like resolving log).
	 */
	errorDetails?: "auto" | boolean;
	/**
	 * Add nested errors to errors (like in AggregateError).
	 */
	errorErrors?: "auto" | boolean;
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
	 * @cliExclude
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
	 * Add performance hints reported with 'performance.hints: "stats"'.
	 * @since 5.110.0
	 */
	hints?: boolean;
	/**
	 * Add the number of performance hints.
	 * @since 5.110.0
	 */
	hintsCount?: boolean;
	/**
	 * Add ids.
	 */
	ids?: boolean;
	/**
	 * Add logging output.
	 */
	logging?:
		| /** Specify log level of logging output. */ (
				"none" | "error" | "warn" | "info" | "log" | "verbose"
		  )
		| /** Enable/disable logging output (`true`: shows normal logging output, loglevel: log). */ boolean;
	/**
	 * Include debug logging of specified loggers (i. e. for plugins or loaders). Filters can be Strings, RegExps or Functions.
	 */
	loggingDebug?:
		/** Enable/Disable debug logging for all loggers. */ boolean | FilterTypes;
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
	modulesSort?: false | string;
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
	 * @deprecated
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
 * Handles error in module loading correctly at a performance cost. This will handle module error compatible with the EcmaScript Modules spec.
 */
export type StrictModuleErrorHandling = boolean;

/**
 * Handles exceptions in module loading correctly at a performance cost (Deprecated). This will handle module error compatible with the Node.js CommonJS way.
 * @deprecated
 */
export type StrictModuleExceptionHandling = boolean;

/**
 * Emit a runtime check that throws a 'MODULE_NOT_FOUND' error when a required module id is missing from the bundle.
 */
export type StrictModuleResolution = boolean;

/**
 * Environment to build for. An array of environments to build for all of them when possible.
 */
export type Target =
	| /** @minItems 1 */ Array</** Specific environment, runtime, or syntax. */ NonEmptyString>
	| false
	| NonEmptyString;

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
	policyName?: NonEmptyString;
}

/**
 * Add a branch to the UMD wrapper for an AMD-style loader exposing `define` on a container object, given as a dot-separated path, after the `define.amd` branch.
 * @since 5.110.0
 */
export type UmdAmdContainer = DottedIdentifier;

/**
 * If `output.libraryTarget` is set to umd and `output.library` is set, setting this to true will name the AMD module.
 */
export type UmdNamedDefine = boolean;

/**
 * A unique name of the webpack build to avoid multiple webpack runtimes to conflict when using globals.
 */
export type UniqueName = NonEmptyString;

/**
 * One default-hint rule for URL-referenced assets emitted by this parser (JS `new URL(...)`, CSS `url(...)`, HTML `<img src>` / `<link href>` / `<script src>`). `test` / `include` / `exclude` match against the asset's request; omit all three to apply to every asset. Matching rules set the same fields a `webpackPrefetch` / `webpackPreload` / `webpackAs` / `webpackType` / `webpackMedia` / `webpackFetchPriority` magic comment would; explicit magic comments on the same URL still win.
 * @since 5.109.0
 */
export interface UrlHintRule {
	/**
	 * Default `as` attribute (script / style / font / image / …).
	 */
	as?: string;
	/**
	 * A condition matcher.
	 * @cliHelper
	 */
	exclude?: RuleSetCondition;
	/**
	 * Default fetchpriority for prefetch / preload links.
	 */
	fetchPriority?: "low" | "high" | "auto" | false;
	/**
	 * A condition matcher.
	 * @cliHelper
	 */
	include?: RuleSetCondition;
	/**
	 * Default `media` attribute (e.g. `"(min-width: 800px)"`).
	 */
	media?: string;
	/**
	 * When true, emit `<link rel="prefetch">` for matching assets without an explicit hint comment.
	 */
	prefetch?: boolean;
	/**
	 * When true, emit `<link rel="preload">` for matching assets without an explicit hint comment.
	 */
	preload?: boolean;
	/**
	 * A condition matcher.
	 * @cliHelper
	 */
	test?: RuleSetCondition;
	/**
	 * Default `type` attribute (MIME).
	 */
	type?: string;
}

/**
 * URL-referenced-asset default hint rules for this parser (JavaScript `new URL(...)`, CSS `url(...)`, HTML `<img src>` / `<link href>` / `<script src>`).
 * @since 5.109.0
 */
export type UrlHints = UrlHintRule[];

/**
 * Enable validation of webpack configuration. Defaults to true in development mode. In production mode, defaults to true unless futureDefaults is enabled, then defaults to false.
 */
export type Validate = boolean;

/**
 * Filtering value, regexp or function.
 * @cliHelper
 */
export type WarningFilterItemTypes =
	| RegExp
	| RelativePath
	| import("../lib/stats/DefaultStatsPresetPlugin").WarningFilterFn;

/**
 * Filtering warnings.
 * @cliHelper
 */
export type WarningFilterTypes =
	| Array</** Rule to filter. @cliHelper */ WarningFilterItemTypes>
	| WarningFilterItemTypes;

/**
 * The method of loading WebAssembly Modules (methods included by default are 'fetch' (web/WebWorker), 'async-node' (node.js), but others might be added by plugins).
 */
export type WasmLoading = false | WasmLoadingType;

/**
 * The method of loading WebAssembly Modules (methods included by default are 'fetch' (web/WebWorker), 'async-node' (node.js), but others might be added by plugins).
 */
export type WasmLoadingType = ("fetch" | "async-node") | string;

/**
 * Fall back to non-streaming WebAssembly instantiation when streaming compilation fails because the server does not serve `.wasm` files with the `application/wasm` MIME type.
 * @since 5.109.0
 */
export type WasmStreamingFallback = boolean;

/**
 * Enter watch mode, which rebuilds on file change.
 */
export type Watch = boolean;

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
	ignored?:
		| Array</** A glob pattern for files that should be ignored from watching. */ NonEmptyString>
		| RegExp
		| /** A single glob pattern for files that should be ignored from watching. */ NonEmptyString;
	/**
	 * Enable polling mode for watching.
	 */
	poll?:
		| /** `number`: use polling with specified interval. */ number
		| /** `true`: use polling. */ boolean;
	/**
	 * Stop watching when stdin stream has ended.
	 */
	stdin?: boolean;
}

/**
 * The filename of WebAssembly modules as relative path inside the 'output.path' directory.
 */
export type WebassemblyModuleFilename = RelativePath;

/**
 * Normalized webpack options object.
 * @required cache, snapshot, entry, experiments, externals, externalsPresets, infrastructureLogging, module, node, optimization, output, plugins, resolve, resolveLoader, stats, watchOptions
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
	 * Enable and configure the Dotenv plugin to load environment variables from .env files.
	 */
	dotenv?: Dotenv;
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
	optimization: OptimizationNormalized;
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
	plugins: PluginsNormalized;
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
	 * Enable validation of webpack configuration. Defaults to true in development mode. In production mode, defaults to true unless futureDefaults is enabled, then defaults to false.
	 */
	validate?: Validate;
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
 * Function acting as plugin.
 */
export type WebpackPluginFunction =
	import("../lib/webpack").WebpackPluginFunction;

/**
 * Plugin instance.
 * @additionalProperties
 */
export interface WebpackPluginInstance {
	/**
	 * The run point of the plugin, required method.
	 */
	apply: import("../lib/webpack").WebpackPluginInstanceApplyFunction;
	[key: string]: any;
}

/**
 * Specifies the filename template of non-initial output worker's files on disk. You must **not** specify an absolute path here, but the path may contain folders separated by '/'! The specified path is joined with the value of the 'output.path' option to determine the location on disk.
 */
export type WorkerChunkFilename = FilenameTemplate;

/**
 * Worker public path. Much like the public path, this sets the location where the worker script file is intended to be found. If not set, webpack will use the publicPath. Don't set this option unless your worker scripts are located at a different path from your other script files.
 */
export type WorkerPublicPath = string;

/**
 * Options object as provided by the user.
 * @schema
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
	 * Enable and configure the Dotenv plugin to load environment variables from .env files.
	 */
	dotenv?: Dotenv;
	/**
	 * The entry point(s) of the compilation.
	 */
	entry?: Entry;
	/**
	 * Enables/Disables experiments (experimental features with relax SemVer compatibility).
	 * @additionalProperties
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
	 * Enable validation of webpack configuration. Defaults to true in development mode. In production mode, defaults to true unless futureDefaults is enabled, then defaults to false.
	 */
	validate?: Validate;
	/**
	 * Enter watch mode, which rebuilds on file change.
	 */
	watch?: Watch;
	/**
	 * Options for the watcher.
	 */
	watchOptions?: WatchOptions;
}
