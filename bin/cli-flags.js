/**
 * This file was automatically generated.
 * DO NOT MODIFY BY HAND.
 * Run `yarn special-lint-fix` to update
 */

module.exports = {
	amd: {
		path: "amd",
		description: "You can pass `false` to disable AMD support.",
		types: [
			{
				type: "boolean",
				multiple: false
			}
		]
	},
	bail: {
		path: "bail",
		description:
			"Report the first error as a hard error instead of tolerating it.",
		types: [
			{
				type: "boolean",
				multiple: false
			}
		]
	},
	cache: {
		path: "cache",
		description: "Disable caching.",
		types: [
			{
				type: "boolean",
				multiple: false
			}
		]
	},
	"cache-immutable-paths": {
		path: "cache.immutablePaths",
		description:
			"A path to a immutable directory (usually a package manager cache directory)",
		types: [
			{
				type: "string",
				multiple: true
			}
		]
	},
	"cache-managed-paths": {
		path: "cache.managedPaths",
		description:
			"A path to a managed directory (usually a node_modules directory)",
		types: [
			{
				type: "string",
				multiple: true
			}
		]
	},
	"cache-type": {
		path: "cache.type",
		description: "In memory caching",
		types: [
			{
				type: "string",
				multiple: false
			}
		]
	},
	"cache-cache-directory": {
		path: "cache.cacheDirectory",
		description:
			"Base directory for the cache (defaults to node_modules/.cache/webpack).",
		types: [
			{
				type: "string",
				multiple: false
			}
		]
	},
	"cache-cache-location": {
		path: "cache.cacheLocation",
		description: "Locations for the cache (defaults to cacheDirectory / name).",
		types: [
			{
				type: "string",
				multiple: false
			}
		]
	},
	"cache-hash-algorithm": {
		path: "cache.hashAlgorithm",
		description:
			"Algorithm used for generation the hash (see node.js crypto package)",
		types: [
			{
				type: "string",
				multiple: false
			}
		]
	},
	"cache-idle-timeout": {
		path: "cache.idleTimeout",
		description:
			"Time in ms after which idle period the cache storing should happen (only for store: 'pack' or 'idle')",
		types: [
			{
				type: "number",
				multiple: false
			}
		]
	},
	"cache-idle-timeout-for-initial-store": {
		path: "cache.idleTimeoutForInitialStore",
		description:
			"Time in ms after which idle period the initial cache storing should happen (only for store: 'pack' or 'idle')",
		types: [
			{
				type: "number",
				multiple: false
			}
		]
	},
	"cache-name": {
		path: "cache.name",
		description:
			"Name for the cache. Different names will lead to different coexisting caches.",
		types: [
			{
				type: "string",
				multiple: false
			}
		]
	},
	"cache-store": {
		path: "cache.store",
		description:
			"When to store data to the filesystem. (pack: Store data when compiler is idle in a single file)",
		types: [
			{
				type: "string",
				multiple: false
			}
		]
	},
	"cache-version": {
		path: "cache.version",
		description:
			"Version of the cache data. Different versions won't allow to reuse the cache and override existing content. Update the version when config changed in a way which doesn't allow to reuse cache. This will invalidate the cache.",
		types: [
			{
				type: "string",
				multiple: false
			}
		]
	},
	context: {
		path: "context",
		description:
			"The base directory (absolute path!) for resolving the `entry` option. If `output.pathinfo` is set, the included pathinfo is shortened to this directory.",
		types: [
			{
				type: "string",
				multiple: false
			}
		]
	},
	dependencies: {
		path: "dependencies",
		description: "References to another configuration to depend on.",
		types: [
			{
				type: "string",
				multiple: true
			}
		]
	},
	devtool: {
		path: "devtool",
		types: [
			{
				type: "boolean",
				multiple: false
			}
		]
	},
	entry: {
		path: "entry",
		description:
			"The string is resolved to a module which is loaded upon startup.",
		types: [
			{
				type: "string",
				multiple: true
			}
		]
	},
	"experiments-asset": {
		path: "experiments.asset",
		description: "Allow module type 'asset' to generate assets",
		types: [
			{
				type: "boolean",
				multiple: false
			}
		]
	},
	"experiments-async-web-assembly": {
		path: "experiments.asyncWebAssembly",
		description: "Support WebAssembly as asynchronous EcmaScript Module",
		types: [
			{
				type: "boolean",
				multiple: false
			}
		]
	},
	"experiments-import-async": {
		path: "experiments.importAsync",
		description: "Allow 'import/export' syntax to import async modules",
		types: [
			{
				type: "boolean",
				multiple: false
			}
		]
	},
	"experiments-import-await": {
		path: "experiments.importAwait",
		description: "Allow 'import/export await' syntax to import async modules",
		types: [
			{
				type: "boolean",
				multiple: false
			}
		]
	},
	"experiments-mjs": {
		path: "experiments.mjs",
		description:
			"Support .mjs files as way to define strict ESM file (node.js)",
		types: [
			{
				type: "boolean",
				multiple: false
			}
		]
	},
	"experiments-output-module": {
		path: "experiments.outputModule",
		description: "Allow outputing javascript files as module source type",
		types: [
			{
				type: "boolean",
				multiple: false
			}
		]
	},
	"experiments-sync-web-assembly": {
		path: "experiments.syncWebAssembly",
		description:
			"Support WebAssembly as synchronous EcmaScript Module (outdated)",
		types: [
			{
				type: "boolean",
				multiple: false
			}
		]
	},
	"experiments-top-level-await": {
		path: "experiments.topLevelAwait",
		description: "Allow using top-level-await in EcmaScript Modules",
		types: [
			{
				type: "boolean",
				multiple: false
			}
		]
	},
	externals: {
		path: "externals",
		description:
			"An exact matched dependency becomes external. The same string is used as external dependency.",
		types: [
			{
				type: "string",
				multiple: true
			}
		]
	},
	"externals-type": {
		path: "externalsType",
		description:
			"Specifies the default type of externals ('amd*', 'umd*', 'system' and 'jsonp' depend on output.libraryTarget set to the same value)",
		types: [
			{
				type: "string",
				multiple: false
			}
		]
	},
	"infrastructure-logging-debug": {
		path: "infrastructureLogging.debug",
		types: [
			{
				type: "string",
				multiple: true
			}
		]
	},
	"infrastructure-logging-level": {
		path: "infrastructureLogging.level",
		description: "Log level",
		types: [
			{
				type: "string",
				multiple: false
			}
		]
	},
	mode: {
		path: "mode",
		description: "Enable production optimizations or development hints.",
		types: [
			{
				type: "string",
				multiple: false
			}
		]
	},
	"module-default-rules-compiler": {
		path: "module.defaultRules.compiler",
		types: [
			{
				type: "string",
				multiple: true
			}
		]
	},
	"module-default-rules-enforce": {
		path: "module.defaultRules.enforce",
		description: "Enforce this rule as pre or post step",
		types: [
			{
				type: "string",
				multiple: true
			}
		]
	},
	"module-default-rules-exclude": {
		path: "module.defaultRules.exclude",
		types: [
			{
				type: "string",
				multiple: true
			}
		]
	},
	"module-default-rules-include": {
		path: "module.defaultRules.include",
		types: [
			{
				type: "string",
				multiple: true
			}
		]
	},
	"module-default-rules-issuer": {
		path: "module.defaultRules.issuer",
		types: [
			{
				type: "string",
				multiple: true
			}
		]
	},
	"module-default-rules-loader": {
		path: "module.defaultRules.loader",
		description: "A loader request",
		types: [
			{
				type: "string",
				multiple: true
			}
		]
	},
	"module-default-rules-options": {
		path: "module.defaultRules.options",
		types: [
			{
				type: "string",
				multiple: true
			}
		]
	},
	"module-default-rules-real-resource": {
		path: "module.defaultRules.realResource",
		types: [
			{
				type: "string",
				multiple: true
			}
		]
	},
	"module-default-rules-resource": {
		path: "module.defaultRules.resource",
		types: [
			{
				type: "string",
				multiple: true
			}
		]
	},
	"module-default-rules-resource-query": {
		path: "module.defaultRules.resourceQuery",
		types: [
			{
				type: "string",
				multiple: true
			}
		]
	},
	"module-default-rules-side-effects": {
		path: "module.defaultRules.sideEffects",
		description: "Flags a module as with or without side effects",
		types: [
			{
				type: "boolean",
				multiple: true
			}
		]
	},
	"module-default-rules-test": {
		path: "module.defaultRules.test",
		types: [
			{
				type: "string",
				multiple: true
			}
		]
	},
	"module-default-rules-type": {
		path: "module.defaultRules.type",
		description: "Module type to use for the module",
		types: [
			{
				type: "string",
				multiple: true
			}
		]
	},
	"module-default-rules-use": {
		path: "module.defaultRules.use",
		description: "A loader request",
		types: [
			{
				type: "string",
				multiple: true
			}
		]
	},
	"module-expr-context-critical": {
		path: "module.exprContextCritical",
		description: "Enable warnings for full dynamic dependencies",
		types: [
			{
				type: "boolean",
				multiple: false
			}
		]
	},
	"module-expr-context-recursive": {
		path: "module.exprContextRecursive",
		description:
			"Enable recursive directory lookup for full dynamic dependencies",
		types: [
			{
				type: "boolean",
				multiple: false
			}
		]
	},
	"module-expr-context-reg-exp": {
		path: "module.exprContextRegExp",
		types: [
			{
				type: "boolean",
				multiple: false
			}
		]
	},
	"module-expr-context-request": {
		path: "module.exprContextRequest",
		description: "Set the default request for full dynamic dependencies",
		types: [
			{
				type: "string",
				multiple: false
			}
		]
	},
	"module-no-parse": {
		path: "module.noParse",
		description:
			"An absolute path, when the module starts with this path it is not parsed",
		types: [
			{
				type: "string",
				multiple: true
			}
		]
	},
	"module-rules-compiler": {
		path: "module.rules.compiler",
		types: [
			{
				type: "string",
				multiple: true
			}
		]
	},
	"module-rules-enforce": {
		path: "module.rules.enforce",
		description: "Enforce this rule as pre or post step",
		types: [
			{
				type: "string",
				multiple: true
			}
		]
	},
	"module-rules-exclude": {
		path: "module.rules.exclude",
		types: [
			{
				type: "string",
				multiple: true
			}
		]
	},
	"module-rules-include": {
		path: "module.rules.include",
		types: [
			{
				type: "string",
				multiple: true
			}
		]
	},
	"module-rules-issuer": {
		path: "module.rules.issuer",
		types: [
			{
				type: "string",
				multiple: true
			}
		]
	},
	"module-rules-loader": {
		path: "module.rules.loader",
		description: "A loader request",
		types: [
			{
				type: "string",
				multiple: true
			}
		]
	},
	"module-rules-options": {
		path: "module.rules.options",
		types: [
			{
				type: "string",
				multiple: true
			}
		]
	},
	"module-rules-real-resource": {
		path: "module.rules.realResource",
		types: [
			{
				type: "string",
				multiple: true
			}
		]
	},
	"module-rules-resource": {
		path: "module.rules.resource",
		types: [
			{
				type: "string",
				multiple: true
			}
		]
	},
	"module-rules-resource-query": {
		path: "module.rules.resourceQuery",
		types: [
			{
				type: "string",
				multiple: true
			}
		]
	},
	"module-rules-side-effects": {
		path: "module.rules.sideEffects",
		description: "Flags a module as with or without side effects",
		types: [
			{
				type: "boolean",
				multiple: true
			}
		]
	},
	"module-rules-test": {
		path: "module.rules.test",
		types: [
			{
				type: "string",
				multiple: true
			}
		]
	},
	"module-rules-type": {
		path: "module.rules.type",
		description: "Module type to use for the module",
		types: [
			{
				type: "string",
				multiple: true
			}
		]
	},
	"module-rules-use": {
		path: "module.rules.use",
		description: "A loader request",
		types: [
			{
				type: "string",
				multiple: true
			}
		]
	},
	"module-strict-export-presence": {
		path: "module.strictExportPresence",
		description:
			"Emit errors instead of warnings when imported names don't exist in imported module",
		types: [
			{
				type: "boolean",
				multiple: false
			}
		]
	},
	"module-strict-this-context-on-imports": {
		path: "module.strictThisContextOnImports",
		description:
			"Handle the this context correctly according to the spec for namespace objects",
		types: [
			{
				type: "boolean",
				multiple: false
			}
		]
	},
	"module-unknown-context-critical": {
		path: "module.unknownContextCritical",
		description:
			"Enable warnings when using the require function in a not statically analyse-able way",
		types: [
			{
				type: "boolean",
				multiple: false
			}
		]
	},
	"module-unknown-context-recursive": {
		path: "module.unknownContextRecursive",
		description:
			"Enable recursive directory lookup when using the require function in a not statically analyse-able way",
		types: [
			{
				type: "boolean",
				multiple: false
			}
		]
	},
	"module-unknown-context-reg-exp": {
		path: "module.unknownContextRegExp",
		types: [
			{
				type: "boolean",
				multiple: false
			}
		]
	},
	"module-unknown-context-request": {
		path: "module.unknownContextRequest",
		description:
			"Sets the request when using the require function in a not statically analyse-able way",
		types: [
			{
				type: "string",
				multiple: false
			}
		]
	},
	"module-unsafe-cache": {
		path: "module.unsafeCache",
		types: [
			{
				type: "boolean",
				multiple: false
			}
		]
	},
	"module-wrapped-context-critical": {
		path: "module.wrappedContextCritical",
		description: "Enable warnings for partial dynamic dependencies",
		types: [
			{
				type: "boolean",
				multiple: false
			}
		]
	},
	"module-wrapped-context-recursive": {
		path: "module.wrappedContextRecursive",
		description:
			"Enable recursive directory lookup for partial dynamic dependencies",
		types: [
			{
				type: "boolean",
				multiple: false
			}
		]
	},
	name: {
		path: "name",
		description:
			"Name of the configuration. Used when loading multiple configurations.",
		types: [
			{
				type: "string",
				multiple: false
			}
		]
	},
	node: {
		path: "node",
		types: [
			{
				type: "boolean",
				multiple: false
			}
		]
	},
	"node-__dirname": {
		path: "node.__dirname",
		description: "Include a polyfill for the '__dirname' variable",
		types: [
			{
				type: "boolean",
				multiple: false
			}
		]
	},
	"node-__filename": {
		path: "node.__filename",
		description: "Include a polyfill for the '__filename' variable",
		types: [
			{
				type: "boolean",
				multiple: false
			}
		]
	},
	"node-global": {
		path: "node.global",
		description: "Include a polyfill for the 'global' variable",
		types: [
			{
				type: "boolean",
				multiple: false
			}
		]
	},
	"optimization-check-wasm-types": {
		path: "optimization.checkWasmTypes",
		description:
			"Check for incompatible wasm types when importing/exporting from/to ESM",
		types: [
			{
				type: "boolean",
				multiple: false
			}
		]
	},
	"optimization-chunk-ids": {
		path: "optimization.chunkIds",
		description:
			"Define the algorithm to choose chunk ids (named: readable ids for better debugging, deterministic: numeric hash ids for better long term caching, size: numeric ids focused on minimal initial download size, total-size: numeric ids focused on minimal total download size, false: no algorithm used, as custom one can be provided via plugin)",
		types: [
			{
				type: "string",
				multiple: false
			}
		]
	},
	"optimization-concatenate-modules": {
		path: "optimization.concatenateModules",
		description:
			"Concatenate modules when possible to generate less modules, more efficient code and enable more optimizations by the minimizer",
		types: [
			{
				type: "boolean",
				multiple: false
			}
		]
	},
	"optimization-flag-included-chunks": {
		path: "optimization.flagIncludedChunks",
		description:
			"Also flag chunks as loaded which contain a subset of the modules",
		types: [
			{
				type: "boolean",
				multiple: false
			}
		]
	},
	"optimization-inner-graph": {
		path: "optimization.innerGraph",
		description:
			"Creates a module-internal dependency graph for top level symbols, exports and imports, to improve unused exports detection",
		types: [
			{
				type: "boolean",
				multiple: false
			}
		]
	},
	"optimization-mangle-exports": {
		path: "optimization.mangleExports",
		description:
			"Rename exports when possible to generate shorter code (depends on optimization.usedExports and optimization.providedExports)",
		types: [
			{
				type: "boolean",
				multiple: false
			}
		]
	},
	"optimization-mangle-wasm-imports": {
		path: "optimization.mangleWasmImports",
		description: "Reduce size of WASM by changing imports to shorter strings.",
		types: [
			{
				type: "boolean",
				multiple: false
			}
		]
	},
	"optimization-merge-duplicate-chunks": {
		path: "optimization.mergeDuplicateChunks",
		description: "Merge chunks which contain the same modules",
		types: [
			{
				type: "boolean",
				multiple: false
			}
		]
	},
	"optimization-minimize": {
		path: "optimization.minimize",
		description: "Enable minimizing the output. Uses optimization.minimizer.",
		types: [
			{
				type: "boolean",
				multiple: false
			}
		]
	},
	"optimization-module-ids": {
		path: "optimization.moduleIds",
		description:
			"Define the algorithm to choose module ids (natural: numeric ids in order of usage, named: readable ids for better debugging, hashed: (deprecated) short hashes as ids for better long term caching, deterministic: numeric hash ids for better long term caching, size: numeric ids focused on minimal initial download size, false: no algorithm used, as custom one can be provided via plugin)",
		types: [
			{
				type: "string",
				multiple: false
			}
		]
	},
	"optimization-no-emit-on-errors": {
		path: "optimization.noEmitOnErrors",
		description: "Avoid emitting assets when errors occur",
		types: [
			{
				type: "boolean",
				multiple: false
			}
		]
	},
	"optimization-node-env": {
		path: "optimization.nodeEnv",
		types: [
			{
				type: "boolean",
				multiple: false
			}
		]
	},
	"optimization-portable-records": {
		path: "optimization.portableRecords",
		description:
			"Generate records with relative paths to be able to move the context folder",
		types: [
			{
				type: "boolean",
				multiple: false
			}
		]
	},
	"optimization-provided-exports": {
		path: "optimization.providedExports",
		description:
			"Figure out which exports are provided by modules to generate more efficient code",
		types: [
			{
				type: "boolean",
				multiple: false
			}
		]
	},
	"optimization-remove-available-modules": {
		path: "optimization.removeAvailableModules",
		description:
			"Removes modules from chunks when these modules are already included in all parents",
		types: [
			{
				type: "boolean",
				multiple: false
			}
		]
	},
	"optimization-remove-empty-chunks": {
		path: "optimization.removeEmptyChunks",
		description: "Remove chunks which are empty",
		types: [
			{
				type: "boolean",
				multiple: false
			}
		]
	},
	"optimization-runtime-chunk": {
		path: "optimization.runtimeChunk",
		types: [
			{
				type: "boolean",
				multiple: false
			}
		]
	},
	"optimization-runtime-chunk-name": {
		path: "optimization.runtimeChunk.name",
		types: [
			{
				type: "string",
				multiple: false
			}
		]
	},
	"optimization-side-effects": {
		path: "optimization.sideEffects",
		description:
			"Skip over modules which are flagged to contain no side effects when exports are not used",
		types: [
			{
				type: "boolean",
				multiple: false
			}
		]
	},
	"optimization-split-chunks": {
		path: "optimization.splitChunks",
		types: [
			{
				type: "boolean",
				multiple: false
			}
		]
	},
	"optimization-split-chunks-automatic-name-delimiter": {
		path: "optimization.splitChunks.automaticNameDelimiter",
		description: "Sets the name delimiter for created chunks",
		types: [
			{
				type: "string",
				multiple: false
			}
		]
	},
	"optimization-split-chunks-chunks": {
		path: "optimization.splitChunks.chunks",
		types: [
			{
				type: "string",
				multiple: false
			}
		]
	},
	"optimization-split-chunks-fallback-cache-group-automatic-name-delimiter": {
		path: "optimization.splitChunks.fallbackCacheGroup.automaticNameDelimiter",
		description: "Sets the name delimiter for created chunks",
		types: [
			{
				type: "string",
				multiple: false
			}
		]
	},
	"optimization-split-chunks-fallback-cache-group-max-async-size": {
		path: "optimization.splitChunks.fallbackCacheGroup.maxAsyncSize",
		description: "Size of the javascript part of the chunk",
		types: [
			{
				type: "number",
				multiple: false
			}
		]
	},
	"optimization-split-chunks-fallback-cache-group-max-initial-size": {
		path: "optimization.splitChunks.fallbackCacheGroup.maxInitialSize",
		description: "Size of the javascript part of the chunk",
		types: [
			{
				type: "number",
				multiple: false
			}
		]
	},
	"optimization-split-chunks-fallback-cache-group-max-size": {
		path: "optimization.splitChunks.fallbackCacheGroup.maxSize",
		description: "Size of the javascript part of the chunk",
		types: [
			{
				type: "number",
				multiple: false
			}
		]
	},
	"optimization-split-chunks-fallback-cache-group-min-size": {
		path: "optimization.splitChunks.fallbackCacheGroup.minSize",
		description: "Size of the javascript part of the chunk",
		types: [
			{
				type: "number",
				multiple: false
			}
		]
	},
	"optimization-split-chunks-filename": {
		path: "optimization.splitChunks.filename",
		types: [
			{
				type: "string",
				multiple: false
			}
		]
	},
	"optimization-split-chunks-hide-path-info": {
		path: "optimization.splitChunks.hidePathInfo",
		description:
			"Prevents exposing path info when creating names for parts splitted by maxSize",
		types: [
			{
				type: "boolean",
				multiple: false
			}
		]
	},
	"optimization-split-chunks-max-async-requests": {
		path: "optimization.splitChunks.maxAsyncRequests",
		description:
			"Maximum number of requests which are accepted for on-demand loading",
		types: [
			{
				type: "number",
				multiple: false
			}
		]
	},
	"optimization-split-chunks-max-async-size": {
		path: "optimization.splitChunks.maxAsyncSize",
		description: "Size of the javascript part of the chunk",
		types: [
			{
				type: "number",
				multiple: false
			}
		]
	},
	"optimization-split-chunks-max-initial-requests": {
		path: "optimization.splitChunks.maxInitialRequests",
		description:
			"Maximum number of initial chunks which are accepted for an entry point",
		types: [
			{
				type: "number",
				multiple: false
			}
		]
	},
	"optimization-split-chunks-max-initial-size": {
		path: "optimization.splitChunks.maxInitialSize",
		description: "Size of the javascript part of the chunk",
		types: [
			{
				type: "number",
				multiple: false
			}
		]
	},
	"optimization-split-chunks-max-size": {
		path: "optimization.splitChunks.maxSize",
		description: "Size of the javascript part of the chunk",
		types: [
			{
				type: "number",
				multiple: false
			}
		]
	},
	"optimization-split-chunks-min-chunks": {
		path: "optimization.splitChunks.minChunks",
		description:
			"Minimum number of times a module has to be duplicated until it's considered for splitting",
		types: [
			{
				type: "number",
				multiple: false
			}
		]
	},
	"optimization-split-chunks-min-remaining-size": {
		path: "optimization.splitChunks.minRemainingSize",
		description: "Size of the javascript part of the chunk",
		types: [
			{
				type: "number",
				multiple: false
			}
		]
	},
	"optimization-split-chunks-min-size": {
		path: "optimization.splitChunks.minSize",
		description: "Size of the javascript part of the chunk",
		types: [
			{
				type: "number",
				multiple: false
			}
		]
	},
	"optimization-split-chunks-name": {
		path: "optimization.splitChunks.name",
		types: [
			{
				type: "boolean",
				multiple: false
			}
		]
	},
	"optimization-used-exports": {
		path: "optimization.usedExports",
		description:
			"Figure out which exports are used by modules to mangle export names, omit unused exports and generate more efficient code",
		types: [
			{
				type: "boolean",
				multiple: false
			}
		]
	},
	"output-asset-module-filename": {
		path: "output.assetModuleFilename",
		types: [
			{
				type: "string",
				multiple: false
			}
		]
	},
	"output-auxiliary-comment": {
		path: "output.auxiliaryComment",
		description: "Append the same comment above each import style.",
		types: [
			{
				type: "string",
				multiple: false
			}
		]
	},
	"output-auxiliary-comment-amd": {
		path: "output.auxiliaryComment.amd",
		description: "Set comment for `amd` section in UMD",
		types: [
			{
				type: "string",
				multiple: false
			}
		]
	},
	"output-auxiliary-comment-commonjs": {
		path: "output.auxiliaryComment.commonjs",
		description: "Set comment for `commonjs` (exports) section in UMD",
		types: [
			{
				type: "string",
				multiple: false
			}
		]
	},
	"output-auxiliary-comment-commonjs2": {
		path: "output.auxiliaryComment.commonjs2",
		description: "Set comment for `commonjs2` (module.exports) section in UMD",
		types: [
			{
				type: "string",
				multiple: false
			}
		]
	},
	"output-auxiliary-comment-root": {
		path: "output.auxiliaryComment.root",
		description: "Set comment for `root` (global variable) section in UMD",
		types: [
			{
				type: "string",
				multiple: false
			}
		]
	},
	"output-chunk-callback-name": {
		path: "output.chunkCallbackName",
		description:
			"The callback function name used by webpack for loading of chunks in WebWorkers.",
		types: [
			{
				type: "string",
				multiple: false
			}
		]
	},
	"output-chunk-filename": {
		path: "output.chunkFilename",
		description:
			"The filename of non-entry chunks as relative path inside the `output.path` directory.",
		types: [
			{
				type: "string",
				multiple: false
			}
		]
	},
	"output-chunk-load-timeout": {
		path: "output.chunkLoadTimeout",
		description: "Number of milliseconds before chunk request expires",
		types: [
			{
				type: "number",
				multiple: false
			}
		]
	},
	"output-compare-before-emit": {
		path: "output.compareBeforeEmit",
		description:
			"Check if to be emitted file already exists and have the same content before writing to output filesystem",
		types: [
			{
				type: "boolean",
				multiple: false
			}
		]
	},
	"output-cross-origin-loading": {
		path: "output.crossOriginLoading",
		description: "This option enables cross-origin loading of chunks.",
		types: [
			{
				type: "boolean",
				multiple: false
			}
		]
	},
	"output-devtool-fallback-module-filename-template": {
		path: "output.devtoolFallbackModuleFilenameTemplate",
		types: [
			{
				type: "string",
				multiple: false
			}
		]
	},
	"output-devtool-module-filename-template": {
		path: "output.devtoolModuleFilenameTemplate",
		types: [
			{
				type: "string",
				multiple: false
			}
		]
	},
	"output-devtool-namespace": {
		path: "output.devtoolNamespace",
		description:
			"Module namespace to use when interpolating filename template string for the sources array in a generated SourceMap. Defaults to `output.library` if not set. It's useful for avoiding runtime collisions in sourcemaps from multiple webpack projects built as libraries.",
		types: [
			{
				type: "string",
				multiple: false
			}
		]
	},
	"output-ecma-version": {
		path: "output.ecmaVersion",
		types: [
			{
				type: "number",
				multiple: false
			}
		]
	},
	"output-enabled-library-types": {
		path: "output.enabledLibraryTypes",
		description: "Type of library",
		types: [
			{
				type: "string",
				multiple: true
			}
		]
	},
	"output-filename": {
		path: "output.filename",
		types: [
			{
				type: "string",
				multiple: false
			}
		]
	},
	"output-global-object": {
		path: "output.globalObject",
		description:
			"An expression which is used to address the global object/scope in runtime code",
		types: [
			{
				type: "string",
				multiple: false
			}
		]
	},
	"output-hash-digest": {
		path: "output.hashDigest",
		description: "Digest type used for the hash",
		types: [
			{
				type: "string",
				multiple: false
			}
		]
	},
	"output-hash-digest-length": {
		path: "output.hashDigestLength",
		description: "Number of chars which are used for the hash",
		types: [
			{
				type: "number",
				multiple: false
			}
		]
	},
	"output-hash-function": {
		path: "output.hashFunction",
		types: [
			{
				type: "string",
				multiple: false
			}
		]
	},
	"output-hash-salt": {
		path: "output.hashSalt",
		description: "Any string which is added to the hash to salt it",
		types: [
			{
				type: "string",
				multiple: false
			}
		]
	},
	"output-hot-update-chunk-filename": {
		path: "output.hotUpdateChunkFilename",
		description:
			"The filename of the Hot Update Chunks. They are inside the output.path directory.",
		types: [
			{
				type: "string",
				multiple: false
			}
		]
	},
	"output-hot-update-function": {
		path: "output.hotUpdateFunction",
		description:
			"The JSONP function used by webpack for async loading of hot update chunks.",
		types: [
			{
				type: "string",
				multiple: false
			}
		]
	},
	"output-hot-update-main-filename": {
		path: "output.hotUpdateMainFilename",
		description:
			"The filename of the Hot Update Main File. It is inside the `output.path` directory.",
		types: [
			{
				type: "string",
				multiple: false
			}
		]
	},
	"output-iife": {
		path: "output.iife",
		description:
			"Wrap javascript code into IIFEs to avoid leaking into global scope.",
		types: [
			{
				type: "boolean",
				multiple: false
			}
		]
	},
	"output-jsonp-function": {
		path: "output.jsonpFunction",
		description:
			"The JSONP function used by webpack for async loading of chunks.",
		types: [
			{
				type: "string",
				multiple: false
			}
		]
	},
	"output-jsonp-script-type": {
		path: "output.jsonpScriptType",
		description:
			'This option enables loading async chunks via a custom script type, such as script type="module"',
		types: [
			{
				type: "boolean",
				multiple: false
			}
		]
	},
	"output-library": {
		path: "output.library",
		types: [
			{
				type: "string",
				multiple: true
			}
		]
	},
	"output-library-amd": {
		path: "output.library.amd",
		description: "Name of the exposed AMD library in the UMD",
		types: [
			{
				type: "string",
				multiple: false
			}
		]
	},
	"output-library-commonjs": {
		path: "output.library.commonjs",
		description: "Name of the exposed commonjs export in the UMD",
		types: [
			{
				type: "string",
				multiple: false
			}
		]
	},
	"output-library-root": {
		path: "output.library.root",
		types: [
			{
				type: "string",
				multiple: true
			}
		]
	},
	"output-library-auxiliary-comment": {
		path: "output.library.auxiliaryComment",
		description: "Append the same comment above each import style.",
		types: [
			{
				type: "string",
				multiple: false
			}
		]
	},
	"output-library-auxiliary-comment-amd": {
		path: "output.library.auxiliaryComment.amd",
		description: "Set comment for `amd` section in UMD",
		types: [
			{
				type: "string",
				multiple: false
			}
		]
	},
	"output-library-auxiliary-comment-commonjs": {
		path: "output.library.auxiliaryComment.commonjs",
		description: "Set comment for `commonjs` (exports) section in UMD",
		types: [
			{
				type: "string",
				multiple: false
			}
		]
	},
	"output-library-auxiliary-comment-commonjs2": {
		path: "output.library.auxiliaryComment.commonjs2",
		description: "Set comment for `commonjs2` (module.exports) section in UMD",
		types: [
			{
				type: "string",
				multiple: false
			}
		]
	},
	"output-library-auxiliary-comment-root": {
		path: "output.library.auxiliaryComment.root",
		description: "Set comment for `root` (global variable) section in UMD",
		types: [
			{
				type: "string",
				multiple: false
			}
		]
	},
	"output-library-export": {
		path: "output.library.export",
		types: [
			{
				type: "string",
				multiple: true
			}
		]
	},
	"output-library-name": {
		path: "output.library.name",
		types: [
			{
				type: "string",
				multiple: true
			}
		]
	},
	"output-library-name-amd": {
		path: "output.library.name.amd",
		description: "Name of the exposed AMD library in the UMD",
		types: [
			{
				type: "string",
				multiple: false
			}
		]
	},
	"output-library-name-commonjs": {
		path: "output.library.name.commonjs",
		description: "Name of the exposed commonjs export in the UMD",
		types: [
			{
				type: "string",
				multiple: false
			}
		]
	},
	"output-library-name-root": {
		path: "output.library.name.root",
		types: [
			{
				type: "string",
				multiple: true
			}
		]
	},
	"output-library-type": {
		path: "output.library.type",
		description: "Type of library",
		types: [
			{
				type: "string",
				multiple: false
			}
		]
	},
	"output-library-umd-named-define": {
		path: "output.library.umdNamedDefine",
		description:
			"If `output.libraryTarget` is set to umd and `output.library` is set, setting this to true will name the AMD module.",
		types: [
			{
				type: "boolean",
				multiple: false
			}
		]
	},
	"output-library-target": {
		path: "output.libraryTarget",
		description: "Type of library",
		types: [
			{
				type: "string",
				multiple: false
			}
		]
	},
	"output-module": {
		path: "output.module",
		description: "Output javascript files as module source type.",
		types: [
			{
				type: "boolean",
				multiple: false
			}
		]
	},
	"output-path": {
		path: "output.path",
		description: "The output directory as **absolute path** (required).",
		types: [
			{
				type: "string",
				multiple: false
			}
		]
	},
	"output-pathinfo": {
		path: "output.pathinfo",
		description: "Include comments with information about the modules.",
		types: [
			{
				type: "boolean",
				multiple: false
			}
		]
	},
	"output-public-path": {
		path: "output.publicPath",
		types: [
			{
				type: "string",
				multiple: false
			}
		]
	},
	"output-source-map-filename": {
		path: "output.sourceMapFilename",
		description:
			"The filename of the SourceMaps for the JavaScript files. They are inside the `output.path` directory.",
		types: [
			{
				type: "string",
				multiple: false
			}
		]
	},
	"output-source-prefix": {
		path: "output.sourcePrefix",
		description:
			"Prefixes every line of the source in the bundle with this string.",
		types: [
			{
				type: "string",
				multiple: false
			}
		]
	},
	"output-strict-module-exception-handling": {
		path: "output.strictModuleExceptionHandling",
		description:
			"Handles exceptions in module loading correctly at a performance cost.",
		types: [
			{
				type: "boolean",
				multiple: false
			}
		]
	},
	"output-umd-named-define": {
		path: "output.umdNamedDefine",
		description:
			"If `output.libraryTarget` is set to umd and `output.library` is set, setting this to true will name the AMD module.",
		types: [
			{
				type: "boolean",
				multiple: false
			}
		]
	},
	"output-unique-name": {
		path: "output.uniqueName",
		description:
			"A unique name of the webpack build to avoid multiple webpack runtimes to conflict when using globals.",
		types: [
			{
				type: "string",
				multiple: false
			}
		]
	},
	"output-webassembly-module-filename": {
		path: "output.webassemblyModuleFilename",
		description:
			"The filename of WebAssembly modules as relative path inside the `output.path` directory.",
		types: [
			{
				type: "string",
				multiple: false
			}
		]
	},
	parallelism: {
		path: "parallelism",
		description: "The number of parallel processed modules in the compilation.",
		types: [
			{
				type: "number",
				multiple: false
			}
		]
	},
	performance: {
		path: "performance",
		types: [
			{
				type: "boolean",
				multiple: false
			}
		]
	},
	"performance-hints": {
		path: "performance.hints",
		description:
			"Sets the format of the hints: warnings, errors or nothing at all",
		types: [
			{
				type: "boolean",
				multiple: false
			}
		]
	},
	"performance-max-asset-size": {
		path: "performance.maxAssetSize",
		description:
			"Filesize limit (in bytes) when exceeded, that webpack will provide performance hints",
		types: [
			{
				type: "number",
				multiple: false
			}
		]
	},
	"performance-max-entrypoint-size": {
		path: "performance.maxEntrypointSize",
		description: "Total size of an entry point (in bytes)",
		types: [
			{
				type: "number",
				multiple: false
			}
		]
	},
	profile: {
		path: "profile",
		description: "Capture timing information for each module.",
		types: [
			{
				type: "boolean",
				multiple: false
			}
		]
	},
	"records-input-path": {
		path: "recordsInputPath",
		types: [
			{
				type: "boolean",
				multiple: false
			}
		]
	},
	"records-output-path": {
		path: "recordsOutputPath",
		types: [
			{
				type: "boolean",
				multiple: false
			}
		]
	},
	"records-path": {
		path: "recordsPath",
		types: [
			{
				type: "boolean",
				multiple: false
			}
		]
	},
	"resolve-alias-alias": {
		path: "resolve.alias.alias",
		description: "New request",
		types: [
			{
				type: "string",
				multiple: true
			}
		]
	},
	"resolve-alias-name": {
		path: "resolve.alias.name",
		description: "Request to be redirected",
		types: [
			{
				type: "string",
				multiple: true
			}
		]
	},
	"resolve-alias-only-module": {
		path: "resolve.alias.onlyModule",
		description: "Redirect only exact matching request",
		types: [
			{
				type: "boolean",
				multiple: true
			}
		]
	},
	"resolve-alias-fields": {
		path: "resolve.aliasFields",
		types: [
			{
				type: "string",
				multiple: true
			}
		]
	},
	"resolve-cache": {
		path: "resolve.cache",
		description:
			"Enable caching of successfully resolved requests (cache entries are revalidated)",
		types: [
			{
				type: "boolean",
				multiple: false
			}
		]
	},
	"resolve-cache-with-context": {
		path: "resolve.cacheWithContext",
		description:
			"Include the context information in the cache identifier when caching",
		types: [
			{
				type: "boolean",
				multiple: false
			}
		]
	},
	"resolve-description-files": {
		path: "resolve.descriptionFiles",
		description: "A non-empty string",
		types: [
			{
				type: "string",
				multiple: true
			}
		]
	},
	"resolve-enforce-extension": {
		path: "resolve.enforceExtension",
		description:
			"Enforce using one of the extensions from the extensions option",
		types: [
			{
				type: "boolean",
				multiple: false
			}
		]
	},
	"resolve-extensions": {
		path: "resolve.extensions",
		description: "A non-empty string",
		types: [
			{
				type: "string",
				multiple: true
			}
		]
	},
	"resolve-main-fields": {
		path: "resolve.mainFields",
		types: [
			{
				type: "string",
				multiple: true
			}
		]
	},
	"resolve-main-files": {
		path: "resolve.mainFiles",
		description: "A non-empty string",
		types: [
			{
				type: "string",
				multiple: true
			}
		]
	},
	"resolve-modules": {
		path: "resolve.modules",
		description: "A non-empty string",
		types: [
			{
				type: "string",
				multiple: true
			}
		]
	},
	"resolve-symlinks": {
		path: "resolve.symlinks",
		description: "Enable resolving symlinks to the original location",
		types: [
			{
				type: "boolean",
				multiple: false
			}
		]
	},
	"resolve-unsafe-cache": {
		path: "resolve.unsafeCache",
		types: [
			{
				type: "boolean",
				multiple: false
			}
		]
	},
	"resolve-use-sync-file-system-calls": {
		path: "resolve.useSyncFileSystemCalls",
		description: "Use synchronous filesystem calls for the resolver",
		types: [
			{
				type: "boolean",
				multiple: false
			}
		]
	},
	"resolve-loader-alias-alias": {
		path: "resolveLoader.alias.alias",
		description: "New request",
		types: [
			{
				type: "string",
				multiple: true
			}
		]
	},
	"resolve-loader-alias-name": {
		path: "resolveLoader.alias.name",
		description: "Request to be redirected",
		types: [
			{
				type: "string",
				multiple: true
			}
		]
	},
	"resolve-loader-alias-only-module": {
		path: "resolveLoader.alias.onlyModule",
		description: "Redirect only exact matching request",
		types: [
			{
				type: "boolean",
				multiple: true
			}
		]
	},
	"resolve-loader-alias-fields": {
		path: "resolveLoader.aliasFields",
		types: [
			{
				type: "string",
				multiple: true
			}
		]
	},
	"resolve-loader-cache": {
		path: "resolveLoader.cache",
		description:
			"Enable caching of successfully resolved requests (cache entries are revalidated)",
		types: [
			{
				type: "boolean",
				multiple: false
			}
		]
	},
	"resolve-loader-cache-with-context": {
		path: "resolveLoader.cacheWithContext",
		description:
			"Include the context information in the cache identifier when caching",
		types: [
			{
				type: "boolean",
				multiple: false
			}
		]
	},
	"resolve-loader-description-files": {
		path: "resolveLoader.descriptionFiles",
		description: "A non-empty string",
		types: [
			{
				type: "string",
				multiple: true
			}
		]
	},
	"resolve-loader-enforce-extension": {
		path: "resolveLoader.enforceExtension",
		description:
			"Enforce using one of the extensions from the extensions option",
		types: [
			{
				type: "boolean",
				multiple: false
			}
		]
	},
	"resolve-loader-extensions": {
		path: "resolveLoader.extensions",
		description: "A non-empty string",
		types: [
			{
				type: "string",
				multiple: true
			}
		]
	},
	"resolve-loader-main-fields": {
		path: "resolveLoader.mainFields",
		types: [
			{
				type: "string",
				multiple: true
			}
		]
	},
	"resolve-loader-main-files": {
		path: "resolveLoader.mainFiles",
		description: "A non-empty string",
		types: [
			{
				type: "string",
				multiple: true
			}
		]
	},
	"resolve-loader-modules": {
		path: "resolveLoader.modules",
		description: "A non-empty string",
		types: [
			{
				type: "string",
				multiple: true
			}
		]
	},
	"resolve-loader-symlinks": {
		path: "resolveLoader.symlinks",
		description: "Enable resolving symlinks to the original location",
		types: [
			{
				type: "boolean",
				multiple: false
			}
		]
	},
	"resolve-loader-unsafe-cache": {
		path: "resolveLoader.unsafeCache",
		types: [
			{
				type: "boolean",
				multiple: false
			}
		]
	},
	"resolve-loader-use-sync-file-system-calls": {
		path: "resolveLoader.useSyncFileSystemCalls",
		description: "Use synchronous filesystem calls for the resolver",
		types: [
			{
				type: "boolean",
				multiple: false
			}
		]
	},
	"stats-all": {
		path: "stats.all",
		description:
			"fallback value for stats options when an option is not defined (has precedence over local webpack defaults)",
		types: [
			{
				type: "boolean",
				multiple: false
			}
		]
	},
	"stats-assets": {
		path: "stats.assets",
		description: "add assets information",
		types: [
			{
				type: "boolean",
				multiple: false
			}
		]
	},
	"stats-assets-sort": {
		path: "stats.assetsSort",
		description: "sort the assets by that field",
		types: [
			{
				type: "string",
				multiple: false
			}
		]
	},
	"stats-built-at": {
		path: "stats.builtAt",
		description: "add built at time information",
		types: [
			{
				type: "boolean",
				multiple: false
			}
		]
	},
	"stats-cached": {
		path: "stats.cached",
		description: "add information about cached (not built) modules",
		types: [
			{
				type: "boolean",
				multiple: false
			}
		]
	},
	"stats-cached-assets": {
		path: "stats.cachedAssets",
		description:
			"Show cached assets (setting this to `false` only shows emitted files)",
		types: [
			{
				type: "boolean",
				multiple: false
			}
		]
	},
	"stats-children": {
		path: "stats.children",
		description: "add children information",
		types: [
			{
				type: "boolean",
				multiple: false
			}
		]
	},
	"stats-chunk-groups": {
		path: "stats.chunkGroups",
		description: "Display all chunk groups with the corresponding bundles",
		types: [
			{
				type: "boolean",
				multiple: false
			}
		]
	},
	"stats-chunk-modules": {
		path: "stats.chunkModules",
		description: "add built modules information to chunk information",
		types: [
			{
				type: "boolean",
				multiple: false
			}
		]
	},
	"stats-chunk-origins": {
		path: "stats.chunkOrigins",
		description: "add the origins of chunks and chunk merging info",
		types: [
			{
				type: "boolean",
				multiple: false
			}
		]
	},
	"stats-chunk-relations": {
		path: "stats.chunkRelations",
		description:
			"add information about parent, children and sibling chunks to chunk information",
		types: [
			{
				type: "boolean",
				multiple: false
			}
		]
	},
	"stats-chunk-root-modules": {
		path: "stats.chunkRootModules",
		description: "add root modules information to chunk information",
		types: [
			{
				type: "boolean",
				multiple: false
			}
		]
	},
	"stats-chunks": {
		path: "stats.chunks",
		description: "add chunk information",
		types: [
			{
				type: "boolean",
				multiple: false
			}
		]
	},
	"stats-chunks-sort": {
		path: "stats.chunksSort",
		description: "sort the chunks by that field",
		types: [
			{
				type: "string",
				multiple: false
			}
		]
	},
	"stats-colors": {
		path: "stats.colors",
		description: "`webpack --colors` equivalent",
		types: [
			{
				type: "boolean",
				multiple: false
			}
		]
	},
	"stats-colors-bold": {
		path: "stats.colors.bold",
		description: "Custom color for bold text",
		types: [
			{
				type: "string",
				multiple: false
			}
		]
	},
	"stats-colors-cyan": {
		path: "stats.colors.cyan",
		description: "Custom color for cyan text",
		types: [
			{
				type: "string",
				multiple: false
			}
		]
	},
	"stats-colors-green": {
		path: "stats.colors.green",
		description: "Custom color for green text",
		types: [
			{
				type: "string",
				multiple: false
			}
		]
	},
	"stats-colors-magenta": {
		path: "stats.colors.magenta",
		description: "Custom color for magenta text",
		types: [
			{
				type: "string",
				multiple: false
			}
		]
	},
	"stats-colors-red": {
		path: "stats.colors.red",
		description: "Custom color for red text",
		types: [
			{
				type: "string",
				multiple: false
			}
		]
	},
	"stats-colors-yellow": {
		path: "stats.colors.yellow",
		description: "Custom color for yellow text",
		types: [
			{
				type: "string",
				multiple: false
			}
		]
	},
	"stats-context": {
		path: "stats.context",
		description: "context directory for request shortening",
		types: [
			{
				type: "string",
				multiple: false
			}
		]
	},
	"stats-depth": {
		path: "stats.depth",
		description: "add module depth in module graph",
		types: [
			{
				type: "boolean",
				multiple: false
			}
		]
	},
	"stats-entrypoints": {
		path: "stats.entrypoints",
		description: "Display the entry points with the corresponding bundles",
		types: [
			{
				type: "boolean",
				multiple: false
			}
		]
	},
	"stats-env": {
		path: "stats.env",
		description: "add --env information",
		types: [
			{
				type: "boolean",
				multiple: false
			}
		]
	},
	"stats-error-details": {
		path: "stats.errorDetails",
		description: "add details to errors (like resolving log)",
		types: [
			{
				type: "boolean",
				multiple: false
			}
		]
	},
	"stats-error-stack": {
		path: "stats.errorStack",
		description: "add internal stack trace to errors",
		types: [
			{
				type: "boolean",
				multiple: false
			}
		]
	},
	"stats-errors": {
		path: "stats.errors",
		description: "add errors",
		types: [
			{
				type: "boolean",
				multiple: false
			}
		]
	},
	"stats-exclude": {
		path: "stats.exclude",
		types: [
			{
				type: "string",
				multiple: true
			}
		]
	},
	"stats-exclude-assets": {
		path: "stats.excludeAssets",
		types: [
			{
				type: "string",
				multiple: true
			}
		]
	},
	"stats-exclude-modules": {
		path: "stats.excludeModules",
		types: [
			{
				type: "string",
				multiple: true
			}
		]
	},
	"stats-hash": {
		path: "stats.hash",
		description: "add the hash of the compilation",
		types: [
			{
				type: "boolean",
				multiple: false
			}
		]
	},
	"stats-ids": {
		path: "stats.ids",
		description: "add ids",
		types: [
			{
				type: "boolean",
				multiple: false
			}
		]
	},
	"stats-logging": {
		path: "stats.logging",
		description:
			"enable/disable logging output (true: shows normal logging output, loglevel: log)",
		types: [
			{
				type: "boolean",
				multiple: false
			}
		]
	},
	"stats-logging-debug": {
		path: "stats.loggingDebug",
		types: [
			{
				type: "string",
				multiple: true
			}
		]
	},
	"stats-logging-trace": {
		path: "stats.loggingTrace",
		description: "add stack traces to logging output",
		types: [
			{
				type: "boolean",
				multiple: false
			}
		]
	},
	"stats-max-modules": {
		path: "stats.maxModules",
		description: "Set the maximum number of modules to be shown",
		types: [
			{
				type: "number",
				multiple: false
			}
		]
	},
	"stats-module-assets": {
		path: "stats.moduleAssets",
		description: "add information about assets inside modules",
		types: [
			{
				type: "boolean",
				multiple: false
			}
		]
	},
	"stats-module-trace": {
		path: "stats.moduleTrace",
		description: "add dependencies and origin of warnings/errors",
		types: [
			{
				type: "boolean",
				multiple: false
			}
		]
	},
	"stats-modules": {
		path: "stats.modules",
		description: "add built modules information",
		types: [
			{
				type: "boolean",
				multiple: false
			}
		]
	},
	"stats-modules-sort": {
		path: "stats.modulesSort",
		description: "sort the modules by that field",
		types: [
			{
				type: "string",
				multiple: false
			}
		]
	},
	"stats-nested-modules": {
		path: "stats.nestedModules",
		description:
			"add information about modules nested in other modules (like with module concatenation)",
		types: [
			{
				type: "boolean",
				multiple: false
			}
		]
	},
	"stats-optimization-bailout": {
		path: "stats.optimizationBailout",
		description: "show reasons why optimization bailed out for modules",
		types: [
			{
				type: "boolean",
				multiple: false
			}
		]
	},
	"stats-orphan-modules": {
		path: "stats.orphanModules",
		description: "add information about orphan modules",
		types: [
			{
				type: "boolean",
				multiple: false
			}
		]
	},
	"stats-output-path": {
		path: "stats.outputPath",
		description: "Add output path information",
		types: [
			{
				type: "boolean",
				multiple: false
			}
		]
	},
	"stats-performance": {
		path: "stats.performance",
		description: "add performance hint flags",
		types: [
			{
				type: "boolean",
				multiple: false
			}
		]
	},
	"stats-preset": {
		path: "stats.preset",
		types: [
			{
				type: "boolean",
				multiple: false
			}
		]
	},
	"stats-provided-exports": {
		path: "stats.providedExports",
		description: "show exports provided by modules",
		types: [
			{
				type: "boolean",
				multiple: false
			}
		]
	},
	"stats-public-path": {
		path: "stats.publicPath",
		description: "Add public path information",
		types: [
			{
				type: "boolean",
				multiple: false
			}
		]
	},
	"stats-reasons": {
		path: "stats.reasons",
		description: "add information about the reasons why modules are included",
		types: [
			{
				type: "boolean",
				multiple: false
			}
		]
	},
	"stats-runtime": {
		path: "stats.runtime",
		description: "add information about runtime modules",
		types: [
			{
				type: "boolean",
				multiple: false
			}
		]
	},
	"stats-source": {
		path: "stats.source",
		description: "add the source code of modules",
		types: [
			{
				type: "boolean",
				multiple: false
			}
		]
	},
	"stats-timings": {
		path: "stats.timings",
		description: "add timing information",
		types: [
			{
				type: "boolean",
				multiple: false
			}
		]
	},
	"stats-used-exports": {
		path: "stats.usedExports",
		description: "show exports used by modules",
		types: [
			{
				type: "boolean",
				multiple: false
			}
		]
	},
	"stats-version": {
		path: "stats.version",
		description: "add webpack version information",
		types: [
			{
				type: "boolean",
				multiple: false
			}
		]
	},
	"stats-warnings": {
		path: "stats.warnings",
		description: "add warnings",
		types: [
			{
				type: "boolean",
				multiple: false
			}
		]
	},
	"stats-warnings-filter": {
		path: "stats.warningsFilter",
		types: [
			{
				type: "string",
				multiple: true
			}
		]
	},
	stats: {
		path: "stats",
		types: [
			{
				type: "boolean",
				multiple: false
			}
		]
	},
	target: {
		path: "target",
		types: [
			{
				type: "string",
				multiple: false
			}
		]
	},
	watch: {
		path: "watch",
		description: "Enter watch mode, which rebuilds on file change.",
		types: [
			{
				type: "boolean",
				multiple: false
			}
		]
	},
	"watch-options-aggregate-timeout": {
		path: "watchOptions.aggregateTimeout",
		description:
			"Delay the rebuilt after the first change. Value is a time in ms.",
		types: [
			{
				type: "number",
				multiple: false
			}
		]
	},
	"watch-options-ignored": {
		path: "watchOptions.ignored",
		description:
			"A single glob pattern for files that should be ignored from watching",
		types: [
			{
				type: "string",
				multiple: true
			}
		]
	},
	"watch-options-poll": {
		path: "watchOptions.poll",
		description: "`true`: use polling.",
		types: [
			{
				type: "boolean",
				multiple: false
			}
		]
	},
	"watch-options-stdin": {
		path: "watchOptions.stdin",
		description: "Stop watching when stdin stream has ended",
		types: [
			{
				type: "boolean",
				multiple: false
			}
		]
	}
};
