/**
 * This file was automatically generated.
 * DO NOT MODIFY BY HAND.
 * Run `yarn special-lint-fix` to update
 */

module.exports = {
	amd: {
		types: [
			{
				type: "boolean",
				multiple: false
			}
		],
		description: "You can pass `false` to disable AMD support."
	},
	bail: {
		types: [
			{
				type: "boolean",
				multiple: false
			}
		],
		description:
			"Report the first error as a hard error instead of tolerating it."
	},
	cache: {
		types: [
			{
				type: "boolean",
				multiple: true
			}
		],
		description: "Disable caching."
	},
	"cache-immutable-paths": {
		types: [
			{
				type: "string",
				multiple: true
			}
		],
		description:
			"A path to a immutable directory (usually a package manager cache directory)"
	},
	"cache-managed-paths": {
		types: [
			{
				type: "string",
				multiple: true
			}
		],
		description:
			"A path to a managed directory (usually a node_modules directory)"
	},
	"cache-type": {
		types: [
			{
				type: "string",
				multiple: true
			}
		],
		description: "In memory caching"
	},
	"cache-cache-directory": {
		types: [
			{
				type: "string",
				multiple: false
			}
		],
		description:
			"Base directory for the cache (defaults to node_modules/.cache/webpack)."
	},
	"cache-cache-location": {
		types: [
			{
				type: "string",
				multiple: false
			}
		],
		description: "Locations for the cache (defaults to cacheDirectory / name)."
	},
	"cache-hash-algorithm": {
		types: [
			{
				type: "string",
				multiple: false
			}
		],
		description:
			"Algorithm used for generation the hash (see node.js crypto package)"
	},
	"cache-idle-timeout": {
		types: [
			{
				type: "number",
				multiple: false
			}
		],
		description:
			"Time in ms after which idle period the cache storing should happen (only for store: 'pack' or 'idle')"
	},
	"cache-idle-timeout-for-initial-store": {
		types: [
			{
				type: "number",
				multiple: false
			}
		],
		description:
			"Time in ms after which idle period the initial cache storing should happen (only for store: 'pack' or 'idle')"
	},
	"cache-name": {
		types: [
			{
				type: "string",
				multiple: false
			}
		],
		description:
			"Name for the cache. Different names will lead to different coexisting caches."
	},
	"cache-store": {
		types: [
			{
				type: "string",
				multiple: false
			}
		],
		description:
			"When to store data to the filesystem. (pack: Store data when compiler is idle in a single file)"
	},
	"cache-version": {
		types: [
			{
				type: "string",
				multiple: false
			}
		],
		description:
			"Version of the cache data. Different versions won't allow to reuse the cache and override existing content. Update the version when config changed in a way which doesn't allow to reuse cache. This will invalidate the cache."
	},
	context: {
		types: [
			{
				type: "string",
				multiple: false
			}
		],
		description:
			"The base directory (absolute path!) for resolving the `entry` option. If `output.pathinfo` is set, the included pathinfo is shortened to this directory."
	},
	dependencies: {
		types: [
			{
				type: "string",
				multiple: true
			}
		],
		description: "References to another configuration to depend on."
	},
	devtool: {
		types: [
			{
				type: "boolean",
				multiple: true
			}
		]
	},
	entry: {
		types: [
			{
				type: "string",
				multiple: true
			}
		],
		description:
			"The string is resolved to a module which is loaded upon startup."
	},
	"experiments-asset": {
		types: [
			{
				type: "boolean",
				multiple: false
			}
		],
		description: "Allow module type 'asset' to generate assets"
	},
	"experiments-async-web-assembly": {
		types: [
			{
				type: "boolean",
				multiple: false
			}
		],
		description: "Support WebAssembly as asynchronous EcmaScript Module"
	},
	"experiments-import-async": {
		types: [
			{
				type: "boolean",
				multiple: false
			}
		],
		description: "Allow 'import/export' syntax to import async modules"
	},
	"experiments-import-await": {
		types: [
			{
				type: "boolean",
				multiple: false
			}
		],
		description: "Allow 'import/export await' syntax to import async modules"
	},
	"experiments-mjs": {
		types: [
			{
				type: "boolean",
				multiple: false
			}
		],
		description: "Support .mjs files as way to define strict ESM file (node.js)"
	},
	"experiments-output-module": {
		types: [
			{
				type: "boolean",
				multiple: false
			}
		],
		description: "Allow outputing javascript files as module source type"
	},
	"experiments-sync-web-assembly": {
		types: [
			{
				type: "boolean",
				multiple: false
			}
		],
		description:
			"Support WebAssembly as synchronous EcmaScript Module (outdated)"
	},
	"experiments-top-level-await": {
		types: [
			{
				type: "boolean",
				multiple: false
			}
		],
		description: "Allow using top-level-await in EcmaScript Modules"
	},
	externals: {
		types: [
			{
				type: "string",
				multiple: true
			}
		],
		description:
			"An exact matched dependency becomes external. The same string is used as external dependency."
	},
	"externals-type": {
		types: [
			{
				type: "string",
				multiple: false
			}
		],
		description:
			"Specifies the default type of externals ('amd*', 'umd*', 'system' and 'jsonp' depend on output.libraryTarget set to the same value)"
	},
	"infrastructure-logging-debug": {
		types: [
			{
				type: "string",
				multiple: true
			}
		]
	},
	"infrastructure-logging-level": {
		types: [
			{
				type: "string",
				multiple: false
			}
		],
		description: "Log level"
	},
	mode: {
		types: [
			{
				type: "string",
				multiple: false
			}
		],
		description: "Enable production optimizations or development hints."
	},
	"module-default-rules-compiler": {
		types: [
			{
				type: "string",
				multiple: true
			}
		]
	},
	"module-default-rules-enforce": {
		types: [
			{
				type: "string",
				multiple: true
			}
		],
		description: "Enforce this rule as pre or post step"
	},
	"module-default-rules-exclude": {
		types: [
			{
				type: "string",
				multiple: true
			}
		]
	},
	"module-default-rules-include": {
		types: [
			{
				type: "string",
				multiple: true
			}
		]
	},
	"module-default-rules-issuer": {
		types: [
			{
				type: "string",
				multiple: true
			}
		]
	},
	"module-default-rules-loader": {
		types: [
			{
				type: "string",
				multiple: true
			}
		],
		description: "A loader request"
	},
	"module-default-rules-options": {
		types: [
			{
				type: "string",
				multiple: true
			}
		]
	},
	"module-default-rules-real-resource": {
		types: [
			{
				type: "string",
				multiple: true
			}
		]
	},
	"module-default-rules-resource": {
		types: [
			{
				type: "string",
				multiple: true
			}
		]
	},
	"module-default-rules-resource-query": {
		types: [
			{
				type: "string",
				multiple: true
			}
		]
	},
	"module-default-rules-side-effects": {
		types: [
			{
				type: "boolean",
				multiple: true
			}
		],
		description: "Flags a module as with or without side effects"
	},
	"module-default-rules-test": {
		types: [
			{
				type: "string",
				multiple: true
			}
		]
	},
	"module-default-rules-type": {
		types: [
			{
				type: "string",
				multiple: true
			}
		],
		description: "Module type to use for the module"
	},
	"module-default-rules-use": {
		types: [
			{
				type: "string",
				multiple: true
			}
		],
		description: "A loader request"
	},
	"module-expr-context-critical": {
		types: [
			{
				type: "boolean",
				multiple: false
			}
		],
		description: "Enable warnings for full dynamic dependencies"
	},
	"module-expr-context-recursive": {
		types: [
			{
				type: "boolean",
				multiple: false
			}
		],
		description:
			"Enable recursive directory lookup for full dynamic dependencies"
	},
	"module-expr-context-reg-exp": {
		types: [
			{
				type: "boolean",
				multiple: false
			}
		]
	},
	"module-expr-context-request": {
		types: [
			{
				type: "string",
				multiple: false
			}
		],
		description: "Set the default request for full dynamic dependencies"
	},
	"module-no-parse": {
		types: [
			{
				type: "string",
				multiple: true
			}
		],
		description:
			"An absolute path, when the module starts with this path it is not parsed"
	},
	"module-rules-compiler": {
		types: [
			{
				type: "string",
				multiple: true
			}
		]
	},
	"module-rules-enforce": {
		types: [
			{
				type: "string",
				multiple: true
			}
		],
		description: "Enforce this rule as pre or post step"
	},
	"module-rules-exclude": {
		types: [
			{
				type: "string",
				multiple: true
			}
		]
	},
	"module-rules-include": {
		types: [
			{
				type: "string",
				multiple: true
			}
		]
	},
	"module-rules-issuer": {
		types: [
			{
				type: "string",
				multiple: true
			}
		]
	},
	"module-rules-loader": {
		types: [
			{
				type: "string",
				multiple: true
			}
		],
		description: "A loader request"
	},
	"module-rules-options": {
		types: [
			{
				type: "string",
				multiple: true
			}
		]
	},
	"module-rules-real-resource": {
		types: [
			{
				type: "string",
				multiple: true
			}
		]
	},
	"module-rules-resource": {
		types: [
			{
				type: "string",
				multiple: true
			}
		]
	},
	"module-rules-resource-query": {
		types: [
			{
				type: "string",
				multiple: true
			}
		]
	},
	"module-rules-side-effects": {
		types: [
			{
				type: "boolean",
				multiple: true
			}
		],
		description: "Flags a module as with or without side effects"
	},
	"module-rules-test": {
		types: [
			{
				type: "string",
				multiple: true
			}
		]
	},
	"module-rules-type": {
		types: [
			{
				type: "string",
				multiple: true
			}
		],
		description: "Module type to use for the module"
	},
	"module-rules-use": {
		types: [
			{
				type: "string",
				multiple: true
			}
		],
		description: "A loader request"
	},
	"module-strict-export-presence": {
		types: [
			{
				type: "boolean",
				multiple: false
			}
		],
		description:
			"Emit errors instead of warnings when imported names don't exist in imported module"
	},
	"module-strict-this-context-on-imports": {
		types: [
			{
				type: "boolean",
				multiple: false
			}
		],
		description:
			"Handle the this context correctly according to the spec for namespace objects"
	},
	"module-unknown-context-critical": {
		types: [
			{
				type: "boolean",
				multiple: false
			}
		],
		description:
			"Enable warnings when using the require function in a not statically analyse-able way"
	},
	"module-unknown-context-recursive": {
		types: [
			{
				type: "boolean",
				multiple: false
			}
		],
		description:
			"Enable recursive directory lookup when using the require function in a not statically analyse-able way"
	},
	"module-unknown-context-reg-exp": {
		types: [
			{
				type: "boolean",
				multiple: false
			}
		]
	},
	"module-unknown-context-request": {
		types: [
			{
				type: "string",
				multiple: false
			}
		],
		description:
			"Sets the request when using the require function in a not statically analyse-able way"
	},
	"module-unsafe-cache": {
		types: [
			{
				type: "boolean",
				multiple: false
			}
		]
	},
	"module-wrapped-context-critical": {
		types: [
			{
				type: "boolean",
				multiple: false
			}
		],
		description: "Enable warnings for partial dynamic dependencies"
	},
	"module-wrapped-context-recursive": {
		types: [
			{
				type: "boolean",
				multiple: false
			}
		],
		description:
			"Enable recursive directory lookup for partial dynamic dependencies"
	},
	name: {
		types: [
			{
				type: "string",
				multiple: false
			}
		],
		description:
			"Name of the configuration. Used when loading multiple configurations."
	},
	node: {
		types: [
			{
				type: "boolean",
				multiple: false
			}
		]
	},
	"node-dirname": {
		types: [
			{
				type: "boolean",
				multiple: true
			}
		],
		description: "Include a polyfill for the '__dirname' variable"
	},
	"node-filename": {
		types: [
			{
				type: "boolean",
				multiple: true
			}
		],
		description: "Include a polyfill for the '__filename' variable"
	},
	"node-global": {
		types: [
			{
				type: "boolean",
				multiple: false
			}
		],
		description: "Include a polyfill for the 'global' variable"
	},
	"optimization-check-wasm-types": {
		types: [
			{
				type: "boolean",
				multiple: false
			}
		],
		description:
			"Check for incompatible wasm types when importing/exporting from/to ESM"
	},
	"optimization-chunk-ids": {
		types: [
			{
				type: "string",
				multiple: true
			}
		],
		description:
			"Define the algorithm to choose chunk ids (named: readable ids for better debugging, deterministic: numeric hash ids for better long term caching, size: numeric ids focused on minimal initial download size, total-size: numeric ids focused on minimal total download size, false: no algorithm used, as custom one can be provided via plugin)"
	},
	"optimization-concatenate-modules": {
		types: [
			{
				type: "boolean",
				multiple: false
			}
		],
		description:
			"Concatenate modules when possible to generate less modules, more efficient code and enable more optimizations by the minimizer"
	},
	"optimization-flag-included-chunks": {
		types: [
			{
				type: "boolean",
				multiple: false
			}
		],
		description:
			"Also flag chunks as loaded which contain a subset of the modules"
	},
	"optimization-inner-graph": {
		types: [
			{
				type: "boolean",
				multiple: false
			}
		],
		description:
			"Creates a module-internal dependency graph for top level symbols, exports and imports, to improve unused exports detection"
	},
	"optimization-mangle-exports": {
		types: [
			{
				type: "boolean",
				multiple: false
			}
		],
		description:
			"Rename exports when possible to generate shorter code (depends on optimization.usedExports and optimization.providedExports)"
	},
	"optimization-mangle-wasm-imports": {
		types: [
			{
				type: "boolean",
				multiple: false
			}
		],
		description: "Reduce size of WASM by changing imports to shorter strings."
	},
	"optimization-merge-duplicate-chunks": {
		types: [
			{
				type: "boolean",
				multiple: false
			}
		],
		description: "Merge chunks which contain the same modules"
	},
	"optimization-minimize": {
		types: [
			{
				type: "boolean",
				multiple: false
			}
		],
		description: "Enable minimizing the output. Uses optimization.minimizer."
	},
	"optimization-module-ids": {
		types: [
			{
				type: "string",
				multiple: true
			}
		],
		description:
			"Define the algorithm to choose module ids (natural: numeric ids in order of usage, named: readable ids for better debugging, hashed: (deprecated) short hashes as ids for better long term caching, deterministic: numeric hash ids for better long term caching, size: numeric ids focused on minimal initial download size, false: no algorithm used, as custom one can be provided via plugin)"
	},
	"optimization-no-emit-on-errors": {
		types: [
			{
				type: "boolean",
				multiple: false
			}
		],
		description: "Avoid emitting assets when errors occur"
	},
	"optimization-node-env": {
		types: [
			{
				type: "boolean",
				multiple: true
			}
		]
	},
	"optimization-portable-records": {
		types: [
			{
				type: "boolean",
				multiple: false
			}
		],
		description:
			"Generate records with relative paths to be able to move the context folder"
	},
	"optimization-provided-exports": {
		types: [
			{
				type: "boolean",
				multiple: false
			}
		],
		description:
			"Figure out which exports are provided by modules to generate more efficient code"
	},
	"optimization-remove-available-modules": {
		types: [
			{
				type: "boolean",
				multiple: false
			}
		],
		description:
			"Removes modules from chunks when these modules are already included in all parents"
	},
	"optimization-remove-empty-chunks": {
		types: [
			{
				type: "boolean",
				multiple: false
			}
		],
		description: "Remove chunks which are empty"
	},
	"optimization-runtime-chunk": {
		types: [
			{
				type: "boolean",
				multiple: true
			}
		]
	},
	"optimization-runtime-chunk-name": {
		types: [
			{
				type: "string",
				multiple: false
			}
		]
	},
	"optimization-side-effects": {
		types: [
			{
				type: "boolean",
				multiple: false
			}
		],
		description:
			"Skip over modules which are flagged to contain no side effects when exports are not used"
	},
	"optimization-split-chunks": {
		types: [
			{
				type: "boolean",
				multiple: false
			}
		]
	},
	"optimization-split-chunks-automatic-name-delimiter": {
		types: [
			{
				type: "string",
				multiple: false
			}
		],
		description: "Sets the name delimiter for created chunks"
	},
	"optimization-split-chunks-chunks": {
		types: [
			{
				type: "string",
				multiple: false
			}
		]
	},
	"optimization-split-chunks-fallback-cache-group-automatic-name-delimiter": {
		types: [
			{
				type: "string",
				multiple: false
			}
		],
		description: "Sets the name delimiter for created chunks"
	},
	"optimization-split-chunks-fallback-cache-group-max-async-size": {
		types: [
			{
				type: "number",
				multiple: false
			}
		],
		description: "Size of the javascript part of the chunk"
	},
	"optimization-split-chunks-fallback-cache-group-max-initial-size": {
		types: [
			{
				type: "number",
				multiple: false
			}
		],
		description: "Size of the javascript part of the chunk"
	},
	"optimization-split-chunks-fallback-cache-group-max-size": {
		types: [
			{
				type: "number",
				multiple: false
			}
		],
		description: "Size of the javascript part of the chunk"
	},
	"optimization-split-chunks-fallback-cache-group-min-size": {
		types: [
			{
				type: "number",
				multiple: false
			}
		],
		description: "Size of the javascript part of the chunk"
	},
	"optimization-split-chunks-filename": {
		types: [
			{
				type: "string",
				multiple: false
			}
		]
	},
	"optimization-split-chunks-hide-path-info": {
		types: [
			{
				type: "boolean",
				multiple: false
			}
		],
		description:
			"Prevents exposing path info when creating names for parts splitted by maxSize"
	},
	"optimization-split-chunks-max-async-requests": {
		types: [
			{
				type: "number",
				multiple: false
			}
		],
		description:
			"Maximum number of requests which are accepted for on-demand loading"
	},
	"optimization-split-chunks-max-async-size": {
		types: [
			{
				type: "number",
				multiple: false
			}
		],
		description: "Size of the javascript part of the chunk"
	},
	"optimization-split-chunks-max-initial-requests": {
		types: [
			{
				type: "number",
				multiple: false
			}
		],
		description:
			"Maximum number of initial chunks which are accepted for an entry point"
	},
	"optimization-split-chunks-max-initial-size": {
		types: [
			{
				type: "number",
				multiple: false
			}
		],
		description: "Size of the javascript part of the chunk"
	},
	"optimization-split-chunks-max-size": {
		types: [
			{
				type: "number",
				multiple: false
			}
		],
		description: "Size of the javascript part of the chunk"
	},
	"optimization-split-chunks-min-chunks": {
		types: [
			{
				type: "number",
				multiple: false
			}
		],
		description:
			"Minimum number of times a module has to be duplicated until it's considered for splitting"
	},
	"optimization-split-chunks-min-remaining-size": {
		types: [
			{
				type: "number",
				multiple: false
			}
		],
		description: "Size of the javascript part of the chunk"
	},
	"optimization-split-chunks-min-size": {
		types: [
			{
				type: "number",
				multiple: false
			}
		],
		description: "Size of the javascript part of the chunk"
	},
	"optimization-split-chunks-name": {
		types: [
			{
				type: "boolean",
				multiple: true
			}
		]
	},
	"optimization-used-exports": {
		types: [
			{
				type: "boolean",
				multiple: false
			}
		],
		description:
			"Figure out which exports are used by modules to mangle export names, omit unused exports and generate more efficient code"
	},
	"output-asset-module-filename": {
		types: [
			{
				type: "string",
				multiple: false
			}
		]
	},
	"output-auxiliary-comment": {
		types: [
			{
				type: "string",
				multiple: false
			}
		],
		description: "Append the same comment above each import style."
	},
	"output-auxiliary-comment-amd": {
		types: [
			{
				type: "string",
				multiple: false
			}
		],
		description: "Set comment for `amd` section in UMD"
	},
	"output-auxiliary-comment-commonjs": {
		types: [
			{
				type: "string",
				multiple: false
			}
		],
		description: "Set comment for `commonjs` (exports) section in UMD"
	},
	"output-auxiliary-comment-commonjs2": {
		types: [
			{
				type: "string",
				multiple: false
			}
		],
		description: "Set comment for `commonjs2` (module.exports) section in UMD"
	},
	"output-auxiliary-comment-root": {
		types: [
			{
				type: "string",
				multiple: false
			}
		],
		description: "Set comment for `root` (global variable) section in UMD"
	},
	"output-chunk-callback-name": {
		types: [
			{
				type: "string",
				multiple: false
			}
		],
		description:
			"The callback function name used by webpack for loading of chunks in WebWorkers."
	},
	"output-chunk-filename": {
		types: [
			{
				type: "string",
				multiple: false
			}
		],
		description:
			"The filename of non-entry chunks as relative path inside the `output.path` directory."
	},
	"output-chunk-load-timeout": {
		types: [
			{
				type: "number",
				multiple: false
			}
		],
		description: "Number of milliseconds before chunk request expires"
	},
	"output-compare-before-emit": {
		types: [
			{
				type: "boolean",
				multiple: false
			}
		],
		description:
			"Check if to be emitted file already exists and have the same content before writing to output filesystem"
	},
	"output-cross-origin-loading": {
		types: [
			{
				type: "boolean",
				multiple: true
			}
		],
		description: "This option enables cross-origin loading of chunks."
	},
	"output-devtool-fallback-module-filename-template": {
		types: [
			{
				type: "string",
				multiple: false
			}
		]
	},
	"output-devtool-module-filename-template": {
		types: [
			{
				type: "string",
				multiple: false
			}
		]
	},
	"output-devtool-namespace": {
		types: [
			{
				type: "string",
				multiple: false
			}
		],
		description:
			"Module namespace to use when interpolating filename template string for the sources array in a generated SourceMap. Defaults to `output.library` if not set. It's useful for avoiding runtime collisions in sourcemaps from multiple webpack projects built as libraries."
	},
	"output-ecma-version": {
		types: [
			{
				type: "number",
				multiple: true
			}
		]
	},
	"output-enabled-library-types": {
		types: [
			{
				type: "string",
				multiple: true
			}
		],
		description: "Type of library"
	},
	"output-filename": {
		types: [
			{
				type: "string",
				multiple: false
			}
		]
	},
	"output-global-object": {
		types: [
			{
				type: "string",
				multiple: false
			}
		],
		description:
			"An expression which is used to address the global object/scope in runtime code"
	},
	"output-hash-digest": {
		types: [
			{
				type: "string",
				multiple: false
			}
		],
		description: "Digest type used for the hash"
	},
	"output-hash-digest-length": {
		types: [
			{
				type: "number",
				multiple: false
			}
		],
		description: "Number of chars which are used for the hash"
	},
	"output-hash-function": {
		types: [
			{
				type: "string",
				multiple: false
			}
		]
	},
	"output-hash-salt": {
		types: [
			{
				type: "string",
				multiple: false
			}
		],
		description: "Any string which is added to the hash to salt it"
	},
	"output-hot-update-chunk-filename": {
		types: [
			{
				type: "string",
				multiple: false
			}
		],
		description:
			"The filename of the Hot Update Chunks. They are inside the output.path directory."
	},
	"output-hot-update-function": {
		types: [
			{
				type: "string",
				multiple: false
			}
		],
		description:
			"The JSONP function used by webpack for async loading of hot update chunks."
	},
	"output-hot-update-main-filename": {
		types: [
			{
				type: "string",
				multiple: false
			}
		],
		description:
			"The filename of the Hot Update Main File. It is inside the `output.path` directory."
	},
	"output-iife": {
		types: [
			{
				type: "boolean",
				multiple: false
			}
		],
		description:
			"Wrap javascript code into IIFEs to avoid leaking into global scope."
	},
	"output-jsonp-function": {
		types: [
			{
				type: "string",
				multiple: false
			}
		],
		description:
			"The JSONP function used by webpack for async loading of chunks."
	},
	"output-jsonp-script-type": {
		types: [
			{
				type: "boolean",
				multiple: true
			}
		],
		description:
			'This option enables loading async chunks via a custom script type, such as script type="module"'
	},
	"output-library": {
		types: [
			{
				type: "string",
				multiple: true
			}
		]
	},
	"output-library-amd": {
		types: [
			{
				type: "string",
				multiple: false
			}
		],
		description: "Name of the exposed AMD library in the UMD"
	},
	"output-library-commonjs": {
		types: [
			{
				type: "string",
				multiple: false
			}
		],
		description: "Name of the exposed commonjs export in the UMD"
	},
	"output-library-root": {
		types: [
			{
				type: "string",
				multiple: true
			}
		]
	},
	"output-library-auxiliary-comment": {
		types: [
			{
				type: "string",
				multiple: false
			}
		],
		description: "Append the same comment above each import style."
	},
	"output-library-auxiliary-comment-amd": {
		types: [
			{
				type: "string",
				multiple: false
			}
		],
		description: "Set comment for `amd` section in UMD"
	},
	"output-library-auxiliary-comment-commonjs": {
		types: [
			{
				type: "string",
				multiple: false
			}
		],
		description: "Set comment for `commonjs` (exports) section in UMD"
	},
	"output-library-auxiliary-comment-commonjs2": {
		types: [
			{
				type: "string",
				multiple: false
			}
		],
		description: "Set comment for `commonjs2` (module.exports) section in UMD"
	},
	"output-library-auxiliary-comment-root": {
		types: [
			{
				type: "string",
				multiple: false
			}
		],
		description: "Set comment for `root` (global variable) section in UMD"
	},
	"output-library-export": {
		types: [
			{
				type: "string",
				multiple: true
			}
		]
	},
	"output-library-name": {
		types: [
			{
				type: "string",
				multiple: true
			}
		]
	},
	"output-library-name-amd": {
		types: [
			{
				type: "string",
				multiple: false
			}
		],
		description: "Name of the exposed AMD library in the UMD"
	},
	"output-library-name-commonjs": {
		types: [
			{
				type: "string",
				multiple: false
			}
		],
		description: "Name of the exposed commonjs export in the UMD"
	},
	"output-library-name-root": {
		types: [
			{
				type: "string",
				multiple: true
			}
		]
	},
	"output-library-type": {
		types: [
			{
				type: "string",
				multiple: false
			}
		],
		description: "Type of library"
	},
	"output-library-umd-named-define": {
		types: [
			{
				type: "boolean",
				multiple: false
			}
		],
		description:
			"If `output.libraryTarget` is set to umd and `output.library` is set, setting this to true will name the AMD module."
	},
	"output-library-target": {
		types: [
			{
				type: "string",
				multiple: false
			}
		],
		description: "Type of library"
	},
	"output-module": {
		types: [
			{
				type: "boolean",
				multiple: false
			}
		],
		description: "Output javascript files as module source type."
	},
	"output-path": {
		types: [
			{
				type: "string",
				multiple: false
			}
		],
		description: "The output directory as **absolute path** (required)."
	},
	"output-pathinfo": {
		types: [
			{
				type: "boolean",
				multiple: false
			}
		],
		description: "Include comments with information about the modules."
	},
	"output-public-path": {
		types: [
			{
				type: "string",
				multiple: false
			}
		]
	},
	"output-source-map-filename": {
		types: [
			{
				type: "string",
				multiple: false
			}
		],
		description:
			"The filename of the SourceMaps for the JavaScript files. They are inside the `output.path` directory."
	},
	"output-source-prefix": {
		types: [
			{
				type: "string",
				multiple: false
			}
		],
		description:
			"Prefixes every line of the source in the bundle with this string."
	},
	"output-strict-module-exception-handling": {
		types: [
			{
				type: "boolean",
				multiple: false
			}
		],
		description:
			"Handles exceptions in module loading correctly at a performance cost."
	},
	"output-umd-named-define": {
		types: [
			{
				type: "boolean",
				multiple: false
			}
		],
		description:
			"If `output.libraryTarget` is set to umd and `output.library` is set, setting this to true will name the AMD module."
	},
	"output-unique-name": {
		types: [
			{
				type: "string",
				multiple: false
			}
		],
		description:
			"A unique name of the webpack build to avoid multiple webpack runtimes to conflict when using globals."
	},
	"output-webassembly-module-filename": {
		types: [
			{
				type: "string",
				multiple: false
			}
		],
		description:
			"The filename of WebAssembly modules as relative path inside the `output.path` directory."
	},
	parallelism: {
		types: [
			{
				type: "number",
				multiple: false
			}
		],
		description: "The number of parallel processed modules in the compilation."
	},
	performance: {
		types: [
			{
				type: "boolean",
				multiple: false
			}
		]
	},
	"performance-hints": {
		types: [
			{
				type: "boolean",
				multiple: true
			}
		],
		description:
			"Sets the format of the hints: warnings, errors or nothing at all"
	},
	"performance-max-asset-size": {
		types: [
			{
				type: "number",
				multiple: false
			}
		],
		description:
			"Filesize limit (in bytes) when exceeded, that webpack will provide performance hints"
	},
	"performance-max-entrypoint-size": {
		types: [
			{
				type: "number",
				multiple: false
			}
		],
		description: "Total size of an entry point (in bytes)"
	},
	profile: {
		types: [
			{
				type: "boolean",
				multiple: false
			}
		],
		description: "Capture timing information for each module."
	},
	"records-input-path": {
		types: [
			{
				type: "boolean",
				multiple: true
			}
		]
	},
	"records-output-path": {
		types: [
			{
				type: "boolean",
				multiple: true
			}
		]
	},
	"records-path": {
		types: [
			{
				type: "boolean",
				multiple: true
			}
		]
	},
	"resolve-alias-alias": {
		types: [
			{
				type: "string",
				multiple: true
			}
		],
		description: "New request"
	},
	"resolve-alias-name": {
		types: [
			{
				type: "string",
				multiple: true
			}
		],
		description: "Request to be redirected"
	},
	"resolve-alias-only-module": {
		types: [
			{
				type: "boolean",
				multiple: true
			}
		],
		description: "Redirect only exact matching request"
	},
	"resolve-alias-fields": {
		types: [
			{
				type: "string",
				multiple: true
			}
		]
	},
	"resolve-cache": {
		types: [
			{
				type: "boolean",
				multiple: false
			}
		],
		description:
			"Enable caching of successfully resolved requests (cache entries are revalidated)"
	},
	"resolve-cache-with-context": {
		types: [
			{
				type: "boolean",
				multiple: false
			}
		],
		description:
			"Include the context information in the cache identifier when caching"
	},
	"resolve-description-files": {
		types: [
			{
				type: "string",
				multiple: true
			}
		],
		description: "A non-empty string"
	},
	"resolve-enforce-extension": {
		types: [
			{
				type: "boolean",
				multiple: false
			}
		],
		description:
			"Enforce using one of the extensions from the extensions option"
	},
	"resolve-extensions": {
		types: [
			{
				type: "string",
				multiple: true
			}
		],
		description: "A non-empty string"
	},
	"resolve-main-fields": {
		types: [
			{
				type: "string",
				multiple: true
			}
		]
	},
	"resolve-main-files": {
		types: [
			{
				type: "string",
				multiple: true
			}
		],
		description: "A non-empty string"
	},
	"resolve-modules": {
		types: [
			{
				type: "string",
				multiple: true
			}
		],
		description: "A non-empty string"
	},
	"resolve-symlinks": {
		types: [
			{
				type: "boolean",
				multiple: false
			}
		],
		description: "Enable resolving symlinks to the original location"
	},
	"resolve-unsafe-cache": {
		types: [
			{
				type: "boolean",
				multiple: false
			}
		]
	},
	"resolve-use-sync-file-system-calls": {
		types: [
			{
				type: "boolean",
				multiple: false
			}
		],
		description: "Use synchronous filesystem calls for the resolver"
	},
	"resolve-loader-alias-alias": {
		types: [
			{
				type: "string",
				multiple: true
			}
		],
		description: "New request"
	},
	"resolve-loader-alias-name": {
		types: [
			{
				type: "string",
				multiple: true
			}
		],
		description: "Request to be redirected"
	},
	"resolve-loader-alias-only-module": {
		types: [
			{
				type: "boolean",
				multiple: true
			}
		],
		description: "Redirect only exact matching request"
	},
	"resolve-loader-alias-fields": {
		types: [
			{
				type: "string",
				multiple: true
			}
		]
	},
	"resolve-loader-cache": {
		types: [
			{
				type: "boolean",
				multiple: false
			}
		],
		description:
			"Enable caching of successfully resolved requests (cache entries are revalidated)"
	},
	"resolve-loader-cache-with-context": {
		types: [
			{
				type: "boolean",
				multiple: false
			}
		],
		description:
			"Include the context information in the cache identifier when caching"
	},
	"resolve-loader-description-files": {
		types: [
			{
				type: "string",
				multiple: true
			}
		],
		description: "A non-empty string"
	},
	"resolve-loader-enforce-extension": {
		types: [
			{
				type: "boolean",
				multiple: false
			}
		],
		description:
			"Enforce using one of the extensions from the extensions option"
	},
	"resolve-loader-extensions": {
		types: [
			{
				type: "string",
				multiple: true
			}
		],
		description: "A non-empty string"
	},
	"resolve-loader-main-fields": {
		types: [
			{
				type: "string",
				multiple: true
			}
		]
	},
	"resolve-loader-main-files": {
		types: [
			{
				type: "string",
				multiple: true
			}
		],
		description: "A non-empty string"
	},
	"resolve-loader-modules": {
		types: [
			{
				type: "string",
				multiple: true
			}
		],
		description: "A non-empty string"
	},
	"resolve-loader-symlinks": {
		types: [
			{
				type: "boolean",
				multiple: false
			}
		],
		description: "Enable resolving symlinks to the original location"
	},
	"resolve-loader-unsafe-cache": {
		types: [
			{
				type: "boolean",
				multiple: false
			}
		]
	},
	"resolve-loader-use-sync-file-system-calls": {
		types: [
			{
				type: "boolean",
				multiple: false
			}
		],
		description: "Use synchronous filesystem calls for the resolver"
	},
	"stats-all": {
		types: [
			{
				type: "boolean",
				multiple: false
			}
		],
		description:
			"fallback value for stats options when an option is not defined (has precedence over local webpack defaults)"
	},
	"stats-assets": {
		types: [
			{
				type: "boolean",
				multiple: false
			}
		],
		description: "add assets information"
	},
	"stats-assets-sort": {
		types: [
			{
				type: "string",
				multiple: false
			}
		],
		description: "sort the assets by that field"
	},
	"stats-built-at": {
		types: [
			{
				type: "boolean",
				multiple: false
			}
		],
		description: "add built at time information"
	},
	"stats-cached": {
		types: [
			{
				type: "boolean",
				multiple: false
			}
		],
		description: "add information about cached (not built) modules"
	},
	"stats-cached-assets": {
		types: [
			{
				type: "boolean",
				multiple: false
			}
		],
		description:
			"Show cached assets (setting this to `false` only shows emitted files)"
	},
	"stats-children": {
		types: [
			{
				type: "boolean",
				multiple: false
			}
		],
		description: "add children information"
	},
	"stats-chunk-groups": {
		types: [
			{
				type: "boolean",
				multiple: false
			}
		],
		description: "Display all chunk groups with the corresponding bundles"
	},
	"stats-chunk-modules": {
		types: [
			{
				type: "boolean",
				multiple: false
			}
		],
		description: "add built modules information to chunk information"
	},
	"stats-chunk-origins": {
		types: [
			{
				type: "boolean",
				multiple: false
			}
		],
		description: "add the origins of chunks and chunk merging info"
	},
	"stats-chunk-relations": {
		types: [
			{
				type: "boolean",
				multiple: false
			}
		],
		description:
			"add information about parent, children and sibling chunks to chunk information"
	},
	"stats-chunk-root-modules": {
		types: [
			{
				type: "boolean",
				multiple: false
			}
		],
		description: "add root modules information to chunk information"
	},
	"stats-chunks": {
		types: [
			{
				type: "boolean",
				multiple: false
			}
		],
		description: "add chunk information"
	},
	"stats-chunks-sort": {
		types: [
			{
				type: "string",
				multiple: false
			}
		],
		description: "sort the chunks by that field"
	},
	"stats-colors": {
		types: [
			{
				type: "boolean",
				multiple: false
			}
		],
		description: "`webpack --colors` equivalent"
	},
	"stats-colors-bold": {
		types: [
			{
				type: "string",
				multiple: false
			}
		],
		description: "Custom color for bold text"
	},
	"stats-colors-cyan": {
		types: [
			{
				type: "string",
				multiple: false
			}
		],
		description: "Custom color for cyan text"
	},
	"stats-colors-green": {
		types: [
			{
				type: "string",
				multiple: false
			}
		],
		description: "Custom color for green text"
	},
	"stats-colors-magenta": {
		types: [
			{
				type: "string",
				multiple: false
			}
		],
		description: "Custom color for magenta text"
	},
	"stats-colors-red": {
		types: [
			{
				type: "string",
				multiple: false
			}
		],
		description: "Custom color for red text"
	},
	"stats-colors-yellow": {
		types: [
			{
				type: "string",
				multiple: false
			}
		],
		description: "Custom color for yellow text"
	},
	"stats-context": {
		types: [
			{
				type: "string",
				multiple: false
			}
		],
		description: "context directory for request shortening"
	},
	"stats-depth": {
		types: [
			{
				type: "boolean",
				multiple: false
			}
		],
		description: "add module depth in module graph"
	},
	"stats-entrypoints": {
		types: [
			{
				type: "boolean",
				multiple: false
			}
		],
		description: "Display the entry points with the corresponding bundles"
	},
	"stats-env": {
		types: [
			{
				type: "boolean",
				multiple: false
			}
		],
		description: "add --env information"
	},
	"stats-error-details": {
		types: [
			{
				type: "boolean",
				multiple: false
			}
		],
		description: "add details to errors (like resolving log)"
	},
	"stats-error-stack": {
		types: [
			{
				type: "boolean",
				multiple: false
			}
		],
		description: "add internal stack trace to errors"
	},
	"stats-errors": {
		types: [
			{
				type: "boolean",
				multiple: false
			}
		],
		description: "add errors"
	},
	"stats-exclude": {
		types: [
			{
				type: "string",
				multiple: true
			}
		]
	},
	"stats-exclude-assets": {
		types: [
			{
				type: "string",
				multiple: true
			}
		]
	},
	"stats-exclude-modules": {
		types: [
			{
				type: "string",
				multiple: true
			}
		]
	},
	"stats-hash": {
		types: [
			{
				type: "boolean",
				multiple: false
			}
		],
		description: "add the hash of the compilation"
	},
	"stats-ids": {
		types: [
			{
				type: "boolean",
				multiple: false
			}
		],
		description: "add ids"
	},
	"stats-logging": {
		types: [
			{
				type: "boolean",
				multiple: true
			}
		],
		description:
			"enable/disable logging output (true: shows normal logging output, loglevel: log)"
	},
	"stats-logging-debug": {
		types: [
			{
				type: "string",
				multiple: true
			}
		]
	},
	"stats-logging-trace": {
		types: [
			{
				type: "boolean",
				multiple: false
			}
		],
		description: "add stack traces to logging output"
	},
	"stats-max-modules": {
		types: [
			{
				type: "number",
				multiple: false
			}
		],
		description: "Set the maximum number of modules to be shown"
	},
	"stats-module-assets": {
		types: [
			{
				type: "boolean",
				multiple: false
			}
		],
		description: "add information about assets inside modules"
	},
	"stats-module-trace": {
		types: [
			{
				type: "boolean",
				multiple: false
			}
		],
		description: "add dependencies and origin of warnings/errors"
	},
	"stats-modules": {
		types: [
			{
				type: "boolean",
				multiple: false
			}
		],
		description: "add built modules information"
	},
	"stats-modules-sort": {
		types: [
			{
				type: "string",
				multiple: false
			}
		],
		description: "sort the modules by that field"
	},
	"stats-nested-modules": {
		types: [
			{
				type: "boolean",
				multiple: false
			}
		],
		description:
			"add information about modules nested in other modules (like with module concatenation)"
	},
	"stats-optimization-bailout": {
		types: [
			{
				type: "boolean",
				multiple: false
			}
		],
		description: "show reasons why optimization bailed out for modules"
	},
	"stats-orphan-modules": {
		types: [
			{
				type: "boolean",
				multiple: false
			}
		],
		description: "add information about orphan modules"
	},
	"stats-output-path": {
		types: [
			{
				type: "boolean",
				multiple: false
			}
		],
		description: "Add output path information"
	},
	"stats-performance": {
		types: [
			{
				type: "boolean",
				multiple: false
			}
		],
		description: "add performance hint flags"
	},
	"stats-preset": {
		types: [
			{
				type: "boolean",
				multiple: true
			}
		]
	},
	"stats-provided-exports": {
		types: [
			{
				type: "boolean",
				multiple: false
			}
		],
		description: "show exports provided by modules"
	},
	"stats-public-path": {
		types: [
			{
				type: "boolean",
				multiple: false
			}
		],
		description: "Add public path information"
	},
	"stats-reasons": {
		types: [
			{
				type: "boolean",
				multiple: false
			}
		],
		description: "add information about the reasons why modules are included"
	},
	"stats-runtime": {
		types: [
			{
				type: "boolean",
				multiple: false
			}
		],
		description: "add information about runtime modules"
	},
	"stats-source": {
		types: [
			{
				type: "boolean",
				multiple: false
			}
		],
		description: "add the source code of modules"
	},
	"stats-timings": {
		types: [
			{
				type: "boolean",
				multiple: false
			}
		],
		description: "add timing information"
	},
	"stats-used-exports": {
		types: [
			{
				type: "boolean",
				multiple: false
			}
		],
		description: "show exports used by modules"
	},
	"stats-version": {
		types: [
			{
				type: "boolean",
				multiple: false
			}
		],
		description: "add webpack version information"
	},
	"stats-warnings": {
		types: [
			{
				type: "boolean",
				multiple: false
			}
		],
		description: "add warnings"
	},
	"stats-warnings-filter": {
		types: [
			{
				type: "string",
				multiple: true
			}
		]
	},
	stats: {
		types: [
			{
				type: "boolean",
				multiple: true
			}
		]
	},
	target: {
		types: [
			{
				type: "string",
				multiple: false
			}
		]
	},
	watch: {
		types: [
			{
				type: "boolean",
				multiple: false
			}
		],
		description: "Enter watch mode, which rebuilds on file change."
	},
	"watch-options-aggregate-timeout": {
		types: [
			{
				type: "number",
				multiple: false
			}
		],
		description:
			"Delay the rebuilt after the first change. Value is a time in ms."
	},
	"watch-options-ignored": {
		types: [
			{
				type: "string",
				multiple: true
			}
		],
		description:
			"A single glob pattern for files that should be ignored from watching"
	},
	"watch-options-poll": {
		types: [
			{
				type: "boolean",
				multiple: true
			}
		],
		description: "`true`: use polling."
	},
	"watch-options-stdin": {
		types: [
			{
				type: "boolean",
				multiple: false
			}
		],
		description: "Stop watching when stdin stream has ended"
	}
};
