module.exports = {
	amd: {
		types: ["boolean"],
		description: "You can pass `false` to disable AMD support."
	},
	bail: {
		types: ["boolean"],
		description:
			"Report the first error as a hard error instead of tolerating it."
	},
	cache: {
		types: ["boolean"],
		description: "Disable caching."
	},
	"cache-type": {
		types: ["string"],
		description: "In memory caching"
	},
	"cache-cache-directory": {
		types: ["string"],
		description:
			"Base directory for the cache (defaults to node_modules/.cache/webpack)."
	},
	"cache-cache-location": {
		types: ["string"],
		description: "Locations for the cache (defaults to cacheDirectory / name)."
	},
	"cache-hash-algorithm": {
		types: ["string"],
		description:
			"Algorithm used for generation the hash (see node.js crypto package)"
	},
	"cache-idle-timeout": {
		types: ["number"],
		description:
			"Time in ms after which idle period the cache storing should happen (only for store: 'pack' or 'idle')"
	},
	"cache-idle-timeout-for-initial-store": {
		types: ["number"],
		description:
			"Time in ms after which idle period the initial cache storing should happen (only for store: 'pack' or 'idle')"
	},
	"cache-name": {
		types: ["string"],
		description:
			"Name for the cache. Different names will lead to different coexisting caches."
	},
	"cache-store": {
		types: ["string"],
		description:
			"When to store data to the filesystem. (pack: Store data when compiler is idle in a single file)"
	},
	"cache-version": {
		types: ["string"],
		description:
			"Version of the cache data. Different versions won't allow to reuse the cache and override existing content. Update the version when config changed in a way which doesn't allow to reuse cache. This will invalidate the cache."
	},
	context: {
		types: ["string"],
		description:
			"The base directory (absolute path!) for resolving the `entry` option. If `output.pathinfo` is set, the included pathinfo is shortened to this directory."
	},
	devtool: {
		types: ["boolean", "string"]
	},
	entry: {
		types: ["string"],
		description:
			"The string is resolved to a module which is loaded upon startup."
	},
	"experiments-asset": {
		types: ["boolean"],
		description: "Allow module type 'asset' to generate assets"
	},
	"experiments-async-web-assembly": {
		types: ["boolean"],
		description: "Support WebAssembly as asynchronous EcmaScript Module"
	},
	"experiments-import-async": {
		types: ["boolean"],
		description: "Allow 'import/export' syntax to import async modules"
	},
	"experiments-import-await": {
		types: ["boolean"],
		description: "Allow 'import/export await' syntax to import async modules"
	},
	"experiments-mjs": {
		types: ["boolean"],
		description: "Support .mjs files as way to define strict ESM file (node.js)"
	},
	"experiments-output-module": {
		types: ["boolean"],
		description: "Allow outputing javascript files as module source type"
	},
	"experiments-sync-web-assembly": {
		types: ["boolean"],
		description:
			"Support WebAssembly as synchronous EcmaScript Module (outdated)"
	},
	"experiments-top-level-await": {
		types: ["boolean"],
		description: "Allow using top-level-await in EcmaScript Modules"
	},
	externals: {
		types: ["string"],
		description:
			"An exact matched dependency becomes external. The same string is used as external dependency."
	},
	"externals-type": {
		types: ["string"],
		description:
			"Specifies the default type of externals ('amd*', 'umd*', 'system' and 'jsonp' depend on output.libraryTarget set to the same value)"
	},
	"infrastructure-logging-debug": {
		types: ["string", "boolean"]
	},
	"infrastructure-logging-level": {
		types: ["string"],
		description: "Log level"
	},
	mode: {
		types: ["string"],
		description: "Enable production optimizations or development hints."
	},
	"module-expr-context-critical": {
		types: ["boolean"],
		description: "Enable warnings for full dynamic dependencies"
	},
	"module-expr-context-recursive": {
		types: ["boolean"],
		description:
			"Enable recursive directory lookup for full dynamic dependencies"
	},
	"module-expr-context-reg-exp": {
		types: ["boolean"]
	},
	"module-expr-context-request": {
		types: ["string"],
		description: "Set the default request for full dynamic dependencies"
	},
	"module-no-parse": {
		types: ["string"]
	},
	"module-strict-export-presence": {
		types: ["boolean"],
		description:
			"Emit errors instead of warnings when imported names don't exist in imported module"
	},
	"module-strict-this-context-on-imports": {
		types: ["boolean"],
		description:
			"Handle the this context correctly according to the spec for namespace objects"
	},
	"module-unknown-context-critical": {
		types: ["boolean"],
		description:
			"Enable warnings when using the require function in a not statically analyse-able way"
	},
	"module-unknown-context-recursive": {
		types: ["boolean"],
		description:
			"Enable recursive directory lookup when using the require function in a not statically analyse-able way"
	},
	"module-unknown-context-reg-exp": {
		types: ["boolean"]
	},
	"module-unknown-context-request": {
		types: ["string"],
		description:
			"Sets the request when using the require function in a not statically analyse-able way"
	},
	"module-unsafe-cache": {
		types: ["boolean"]
	},
	"module-wrapped-context-critical": {
		types: ["boolean"],
		description: "Enable warnings for partial dynamic dependencies"
	},
	"module-wrapped-context-recursive": {
		types: ["boolean"],
		description:
			"Enable recursive directory lookup for partial dynamic dependencies"
	},
	name: {
		types: ["string"],
		description:
			"Name of the configuration. Used when loading multiple configurations."
	},
	node: {
		types: ["boolean"]
	},
	"node-dirname": {
		types: ["boolean", "string"],
		description: "Include a polyfill for the '__dirname' variable"
	},
	"node-filename": {
		types: ["boolean", "string"],
		description: "Include a polyfill for the '__filename' variable"
	},
	"node-global": {
		types: ["boolean"],
		description: "Include a polyfill for the 'global' variable"
	},
	"optimization-check-wasm-types": {
		types: ["boolean"],
		description:
			"Check for incompatible wasm types when importing/exporting from/to ESM"
	},
	"optimization-chunk-ids": {
		types: ["string", "boolean"],
		description:
			"Define the algorithm to choose chunk ids (named: readable ids for better debugging, deterministic: numeric hash ids for better long term caching, size: numeric ids focused on minimal initial download size, total-size: numeric ids focused on minimal total download size, false: no algorithm used, as custom one can be provided via plugin)"
	},
	"optimization-concatenate-modules": {
		types: ["boolean"],
		description:
			"Concatenate modules when possible to generate less modules, more efficient code and enable more optimizations by the minimizer"
	},
	"optimization-flag-included-chunks": {
		types: ["boolean"],
		description:
			"Also flag chunks as loaded which contain a subset of the modules"
	},
	"optimization-inner-graph": {
		types: ["boolean"],
		description:
			"Creates a module-internal dependency graph for top level symbols, exports and imports, to improve unused exports detection"
	},
	"optimization-mangle-exports": {
		types: ["boolean"],
		description:
			"Rename exports when possible to generate shorter code (depends on optimization.usedExports and optimization.providedExports)"
	},
	"optimization-mangle-wasm-imports": {
		types: ["boolean"],
		description: "Reduce size of WASM by changing imports to shorter strings."
	},
	"optimization-merge-duplicate-chunks": {
		types: ["boolean"],
		description: "Merge chunks which contain the same modules"
	},
	"optimization-minimize": {
		types: ["boolean"],
		description: "Enable minimizing the output. Uses optimization.minimizer."
	},
	"optimization-module-ids": {
		types: ["string", "boolean"],
		description:
			"Define the algorithm to choose module ids (natural: numeric ids in order of usage, named: readable ids for better debugging, hashed: (deprecated) short hashes as ids for better long term caching, deterministic: numeric hash ids for better long term caching, size: numeric ids focused on minimal initial download size, false: no algorithm used, as custom one can be provided via plugin)"
	},
	"optimization-no-emit-on-errors": {
		types: ["boolean"],
		description: "Avoid emitting assets when errors occur"
	},
	"optimization-node-env": {
		types: ["boolean", "string"]
	},
	"optimization-portable-records": {
		types: ["boolean"],
		description:
			"Generate records with relative paths to be able to move the context folder"
	},
	"optimization-provided-exports": {
		types: ["boolean"],
		description:
			"Figure out which exports are provided by modules to generate more efficient code"
	},
	"optimization-remove-available-modules": {
		types: ["boolean"],
		description:
			"Removes modules from chunks when these modules are already included in all parents"
	},
	"optimization-remove-empty-chunks": {
		types: ["boolean"],
		description: "Remove chunks which are empty"
	},
	"optimization-runtime-chunk": {
		types: ["boolean", "string"]
	},
	"optimization-runtime-chunk-name": {
		types: ["string"]
	},
	"optimization-side-effects": {
		types: ["boolean"],
		description:
			"Skip over modules which are flagged to contain no side effects when exports are not used"
	},
	"optimization-split-chunks": {
		types: ["boolean"]
	},
	"optimization-split-chunks-automatic-name-delimiter": {
		types: ["string"],
		description: "Sets the name delimiter for created chunks"
	},
	"optimization-split-chunks-chunks": {
		types: ["string"]
	},
	"optimization-split-chunks-fallback-cache-group-automatic-name-delimiter": {
		types: ["string"],
		description: "Sets the name delimiter for created chunks"
	},
	"optimization-split-chunks-fallback-cache-group-max-async-size": {
		types: ["number"],
		description: "Size of the javascript part of the chunk"
	},
	"optimization-split-chunks-fallback-cache-group-max-initial-size": {
		types: ["number"],
		description: "Size of the javascript part of the chunk"
	},
	"optimization-split-chunks-fallback-cache-group-max-size": {
		types: ["number"],
		description: "Size of the javascript part of the chunk"
	},
	"optimization-split-chunks-fallback-cache-group-min-size": {
		types: ["number"],
		description: "Size of the javascript part of the chunk"
	},
	"optimization-split-chunks-filename": {
		types: ["string"]
	},
	"optimization-split-chunks-hide-path-info": {
		types: ["boolean"],
		description:
			"Prevents exposing path info when creating names for parts splitted by maxSize"
	},
	"optimization-split-chunks-max-async-requests": {
		types: ["number"],
		description:
			"Maximum number of requests which are accepted for on-demand loading"
	},
	"optimization-split-chunks-max-async-size": {
		types: ["number"],
		description: "Size of the javascript part of the chunk"
	},
	"optimization-split-chunks-max-initial-requests": {
		types: ["number"],
		description:
			"Maximum number of initial chunks which are accepted for an entry point"
	},
	"optimization-split-chunks-max-initial-size": {
		types: ["number"],
		description: "Size of the javascript part of the chunk"
	},
	"optimization-split-chunks-max-size": {
		types: ["number"],
		description: "Size of the javascript part of the chunk"
	},
	"optimization-split-chunks-min-chunks": {
		types: ["number"],
		description:
			"Minimum number of times a module has to be duplicated until it's considered for splitting"
	},
	"optimization-split-chunks-min-remaining-size": {
		types: ["number"],
		description: "Size of the javascript part of the chunk"
	},
	"optimization-split-chunks-min-size": {
		types: ["number"],
		description: "Size of the javascript part of the chunk"
	},
	"optimization-split-chunks-name": {
		types: ["boolean", "string"]
	},
	"optimization-used-exports": {
		types: ["boolean"],
		description:
			"Figure out which exports are used by modules to mangle export names, omit unused exports and generate more efficient code"
	},
	"output-asset-module-filename": {
		types: ["string"]
	},
	"output-auxiliary-comment": {
		types: ["string"],
		description: "Append the same comment above each import style."
	},
	"output-auxiliary-comment-amd": {
		types: ["string"],
		description: "Set comment for `amd` section in UMD"
	},
	"output-auxiliary-comment-commonjs": {
		types: ["string"],
		description: "Set comment for `commonjs` (exports) section in UMD"
	},
	"output-auxiliary-comment-commonjs2": {
		types: ["string"],
		description: "Set comment for `commonjs2` (module.exports) section in UMD"
	},
	"output-auxiliary-comment-root": {
		types: ["string"],
		description: "Set comment for `root` (global variable) section in UMD"
	},
	"output-chunk-callback-name": {
		types: ["string"],
		description:
			"The callback function name used by webpack for loading of chunks in WebWorkers."
	},
	"output-chunk-filename": {
		types: ["string"],
		description:
			"The filename of non-entry chunks as relative path inside the `output.path` directory."
	},
	"output-chunk-load-timeout": {
		types: ["number"],
		description: "Number of milliseconds before chunk request expires"
	},
	"output-compare-before-emit": {
		types: ["boolean"],
		description:
			"Check if to be emitted file already exists and have the same content before writing to output filesystem"
	},
	"output-cross-origin-loading": {
		types: ["boolean", "string"],
		description: "This option enables cross-origin loading of chunks."
	},
	"output-devtool-fallback-module-filename-template": {
		types: ["string"]
	},
	"output-devtool-module-filename-template": {
		types: ["string"]
	},
	"output-devtool-namespace": {
		types: ["string"],
		description:
			"Module namespace to use when interpolating filename template string for the sources array in a generated SourceMap. Defaults to `output.library` if not set. It's useful for avoiding runtime collisions in sourcemaps from multiple webpack projects built as libraries."
	},
	"output-ecma-version": {
		types: ["number"]
	},
	"output-filename": {
		types: ["string"]
	},
	"output-global-object": {
		types: ["string"],
		description:
			"An expression which is used to address the global object/scope in runtime code"
	},
	"output-hash-digest": {
		types: ["string"],
		description: "Digest type used for the hash"
	},
	"output-hash-digest-length": {
		types: ["number"],
		description: "Number of chars which are used for the hash"
	},
	"output-hash-function": {
		types: ["string"]
	},
	"output-hash-salt": {
		types: ["string"],
		description: "Any string which is added to the hash to salt it"
	},
	"output-hot-update-chunk-filename": {
		types: ["string"],
		description:
			"The filename of the Hot Update Chunks. They are inside the output.path directory."
	},
	"output-hot-update-function": {
		types: ["string"],
		description:
			"The JSONP function used by webpack for async loading of hot update chunks."
	},
	"output-hot-update-main-filename": {
		types: ["string"],
		description:
			"The filename of the Hot Update Main File. It is inside the `output.path` directory."
	},
	"output-iife": {
		types: ["boolean"],
		description:
			"Wrap javascript code into IIFEs to avoid leaking into global scope."
	},
	"output-jsonp-function": {
		types: ["string"],
		description:
			"The JSONP function used by webpack for async loading of chunks."
	},
	"output-jsonp-script-type": {
		types: ["boolean", "string"],
		description:
			'This option enables loading async chunks via a custom script type, such as script type="module"'
	},
	"output-library": {
		types: ["string"]
	},
	"output-library-amd": {
		types: ["string"],
		description: "Name of the exposed AMD library in the UMD"
	},
	"output-library-commonjs": {
		types: ["string"],
		description: "Name of the exposed commonjs export in the UMD"
	},
	"output-library-root": {
		types: ["string"]
	},
	"output-library-auxiliary-comment": {
		types: ["string"],
		description: "Append the same comment above each import style."
	},
	"output-library-auxiliary-comment-amd": {
		types: ["string"],
		description: "Set comment for `amd` section in UMD"
	},
	"output-library-auxiliary-comment-commonjs": {
		types: ["string"],
		description: "Set comment for `commonjs` (exports) section in UMD"
	},
	"output-library-auxiliary-comment-commonjs2": {
		types: ["string"],
		description: "Set comment for `commonjs2` (module.exports) section in UMD"
	},
	"output-library-auxiliary-comment-root": {
		types: ["string"],
		description: "Set comment for `root` (global variable) section in UMD"
	},
	"output-library-export": {
		types: ["string"]
	},
	"output-library-name": {
		types: ["string"]
	},
	"output-library-name-amd": {
		types: ["string"],
		description: "Name of the exposed AMD library in the UMD"
	},
	"output-library-name-commonjs": {
		types: ["string"],
		description: "Name of the exposed commonjs export in the UMD"
	},
	"output-library-name-root": {
		types: ["string"]
	},
	"output-library-type": {
		types: ["string"],
		description: "Type of library"
	},
	"output-library-umd-named-define": {
		types: ["boolean"],
		description:
			"If `output.libraryTarget` is set to umd and `output.library` is set, setting this to true will name the AMD module."
	},
	"output-library-target": {
		types: ["string"],
		description: "Type of library"
	},
	"output-module": {
		types: ["boolean"],
		description: "Output javascript files as module source type."
	},
	"output-path": {
		types: ["string"],
		description: "The output directory as **absolute path** (required)."
	},
	"output-pathinfo": {
		types: ["boolean"],
		description: "Include comments with information about the modules."
	},
	"output-public-path": {
		types: ["string"]
	},
	"output-source-map-filename": {
		types: ["string"],
		description:
			"The filename of the SourceMaps for the JavaScript files. They are inside the `output.path` directory."
	},
	"output-source-prefix": {
		types: ["string"],
		description:
			"Prefixes every line of the source in the bundle with this string."
	},
	"output-strict-module-exception-handling": {
		types: ["boolean"],
		description:
			"Handles exceptions in module loading correctly at a performance cost."
	},
	"output-umd-named-define": {
		types: ["boolean"],
		description:
			"If `output.libraryTarget` is set to umd and `output.library` is set, setting this to true will name the AMD module."
	},
	"output-unique-name": {
		types: ["string"],
		description:
			"A unique name of the webpack build to avoid multiple webpack runtimes to conflict when using globals."
	},
	"output-webassembly-module-filename": {
		types: ["string"],
		description:
			"The filename of WebAssembly modules as relative path inside the `output.path` directory."
	},
	parallelism: {
		types: ["number"],
		description: "The number of parallel processed modules in the compilation."
	},
	performance: {
		types: ["boolean"]
	},
	"performance-hints": {
		types: ["boolean", "string"],
		description:
			"Sets the format of the hints: warnings, errors or nothing at all"
	},
	"performance-max-asset-size": {
		types: ["number"],
		description:
			"Filesize limit (in bytes) when exceeded, that webpack will provide performance hints"
	},
	"performance-max-entrypoint-size": {
		types: ["number"],
		description: "Total size of an entry point (in bytes)"
	},
	profile: {
		types: ["boolean"],
		description: "Capture timing information for each module."
	},
	"records-input-path": {
		types: ["boolean", "string"]
	},
	"records-output-path": {
		types: ["boolean", "string"]
	},
	"records-path": {
		types: ["boolean", "string"]
	},
	"resolve-cache": {
		types: ["boolean"],
		description:
			"Enable caching of successfully resolved requests (cache entries are revalidated)"
	},
	"resolve-cache-with-context": {
		types: ["boolean"],
		description:
			"Include the context information in the cache identifier when caching"
	},
	"resolve-enforce-extension": {
		types: ["boolean"],
		description:
			"Enforce using one of the extensions from the extensions option"
	},
	"resolve-symlinks": {
		types: ["boolean"],
		description: "Enable resolving symlinks to the original location"
	},
	"resolve-unsafe-cache": {
		types: ["boolean"]
	},
	"resolve-use-sync-file-system-calls": {
		types: ["boolean"],
		description: "Use synchronous filesystem calls for the resolver"
	},
	"resolve-loader-cache": {
		types: ["boolean"],
		description:
			"Enable caching of successfully resolved requests (cache entries are revalidated)"
	},
	"resolve-loader-cache-with-context": {
		types: ["boolean"],
		description:
			"Include the context information in the cache identifier when caching"
	},
	"resolve-loader-enforce-extension": {
		types: ["boolean"],
		description:
			"Enforce using one of the extensions from the extensions option"
	},
	"resolve-loader-symlinks": {
		types: ["boolean"],
		description: "Enable resolving symlinks to the original location"
	},
	"resolve-loader-unsafe-cache": {
		types: ["boolean"]
	},
	"resolve-loader-use-sync-file-system-calls": {
		types: ["boolean"],
		description: "Use synchronous filesystem calls for the resolver"
	},
	"stats-all": {
		types: ["boolean"],
		description:
			"fallback value for stats options when an option is not defined (has precedence over local webpack defaults)"
	},
	"stats-assets": {
		types: ["boolean"],
		description: "add assets information"
	},
	"stats-assets-sort": {
		types: ["string"],
		description: "sort the assets by that field"
	},
	"stats-built-at": {
		types: ["boolean"],
		description: "add built at time information"
	},
	"stats-cached": {
		types: ["boolean"],
		description: "add information about cached (not built) modules"
	},
	"stats-cached-assets": {
		types: ["boolean"],
		description:
			"Show cached assets (setting this to `false` only shows emitted files)"
	},
	"stats-children": {
		types: ["boolean"],
		description: "add children information"
	},
	"stats-chunk-groups": {
		types: ["boolean"],
		description: "Display all chunk groups with the corresponding bundles"
	},
	"stats-chunk-modules": {
		types: ["boolean"],
		description: "add built modules information to chunk information"
	},
	"stats-chunk-origins": {
		types: ["boolean"],
		description: "add the origins of chunks and chunk merging info"
	},
	"stats-chunk-relations": {
		types: ["boolean"],
		description:
			"add information about parent, children and sibling chunks to chunk information"
	},
	"stats-chunk-root-modules": {
		types: ["boolean"],
		description: "add root modules information to chunk information"
	},
	"stats-chunks": {
		types: ["boolean"],
		description: "add chunk information"
	},
	"stats-chunks-sort": {
		types: ["string"],
		description: "sort the chunks by that field"
	},
	"stats-colors": {
		types: ["boolean"],
		description: "`webpack --colors` equivalent"
	},
	"stats-colors-bold": {
		types: ["string"],
		description: "Custom color for bold text"
	},
	"stats-colors-cyan": {
		types: ["string"],
		description: "Custom color for cyan text"
	},
	"stats-colors-green": {
		types: ["string"],
		description: "Custom color for green text"
	},
	"stats-colors-magenta": {
		types: ["string"],
		description: "Custom color for magenta text"
	},
	"stats-colors-red": {
		types: ["string"],
		description: "Custom color for red text"
	},
	"stats-colors-yellow": {
		types: ["string"],
		description: "Custom color for yellow text"
	},
	"stats-context": {
		types: ["string"],
		description: "context directory for request shortening"
	},
	"stats-depth": {
		types: ["boolean"],
		description: "add module depth in module graph"
	},
	"stats-entrypoints": {
		types: ["boolean"],
		description: "Display the entry points with the corresponding bundles"
	},
	"stats-env": {
		types: ["boolean"],
		description: "add --env information"
	},
	"stats-error-details": {
		types: ["boolean"],
		description: "add details to errors (like resolving log)"
	},
	"stats-error-stack": {
		types: ["boolean"],
		description: "add internal stack trace to errors"
	},
	"stats-errors": {
		types: ["boolean"],
		description: "add errors"
	},
	"stats-exclude": {
		types: ["string", "boolean"]
	},
	"stats-exclude-assets": {
		types: ["string"]
	},
	"stats-exclude-modules": {
		types: ["string", "boolean"]
	},
	"stats-hash": {
		types: ["boolean"],
		description: "add the hash of the compilation"
	},
	"stats-ids": {
		types: ["boolean"],
		description: "add ids"
	},
	"stats-logging": {
		types: ["boolean", "string"],
		description:
			"enable/disable logging output (true: shows normal logging output, loglevel: log)"
	},
	"stats-logging-debug": {
		types: ["string", "boolean"]
	},
	"stats-logging-trace": {
		types: ["boolean"],
		description: "add stack traces to logging output"
	},
	"stats-max-modules": {
		types: ["number"],
		description: "Set the maximum number of modules to be shown"
	},
	"stats-module-assets": {
		types: ["boolean"],
		description: "add information about assets inside modules"
	},
	"stats-module-trace": {
		types: ["boolean"],
		description: "add dependencies and origin of warnings/errors"
	},
	"stats-modules": {
		types: ["boolean"],
		description: "add built modules information"
	},
	"stats-modules-sort": {
		types: ["string"],
		description: "sort the modules by that field"
	},
	"stats-nested-modules": {
		types: ["boolean"],
		description:
			"add information about modules nested in other modules (like with module concatenation)"
	},
	"stats-optimization-bailout": {
		types: ["boolean"],
		description: "show reasons why optimization bailed out for modules"
	},
	"stats-orphan-modules": {
		types: ["boolean"],
		description: "add information about orphan modules"
	},
	"stats-output-path": {
		types: ["boolean"],
		description: "Add output path information"
	},
	"stats-performance": {
		types: ["boolean"],
		description: "add performance hint flags"
	},
	"stats-preset": {
		types: ["boolean", "string"]
	},
	"stats-provided-exports": {
		types: ["boolean"],
		description: "show exports provided by modules"
	},
	"stats-public-path": {
		types: ["boolean"],
		description: "Add public path information"
	},
	"stats-reasons": {
		types: ["boolean"],
		description: "add information about the reasons why modules are included"
	},
	"stats-runtime": {
		types: ["boolean"],
		description: "add information about runtime modules"
	},
	"stats-source": {
		types: ["boolean"],
		description: "add the source code of modules"
	},
	"stats-timings": {
		types: ["boolean"],
		description: "add timing information"
	},
	"stats-used-exports": {
		types: ["boolean"],
		description: "show exports used by modules"
	},
	"stats-version": {
		types: ["boolean"],
		description: "add webpack version information"
	},
	"stats-warnings": {
		types: ["boolean"],
		description: "add warnings"
	},
	"stats-warnings-filter": {
		types: ["string"]
	},
	stats: {
		types: ["boolean", "string"]
	},
	target: {
		types: ["string"]
	},
	watch: {
		types: ["boolean"],
		description: "Enter watch mode, which rebuilds on file change."
	},
	"watch-options-aggregate-timeout": {
		types: ["number"],
		description:
			"Delay the rebuilt after the first change. Value is a time in ms."
	},
	"watch-options-ignored": {
		types: ["string"],
		description:
			"A single glob pattern for files that should be ignored from watching"
	},
	"watch-options-poll": {
		types: ["boolean", "number"],
		description: "`true`: use polling."
	},
	"watch-options-stdin": {
		types: ["boolean"],
		description: "Stop watching when stdin stream has ended"
	}
};
