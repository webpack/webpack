# Changelog (pre-1.12)

1.11
BUG: fix for incorrect order with extract-text-webpack-plugin and in output files
1.10
API: added (experimental) NamedModulesPlugin
API: added stats presets
beautified source code and enforced beautified source code in CI
1.9
BUG: fixed hashing problems
CLI: allow webpack.config.babel.js
CLI: fixed passing entries over CLI
API: rename target atom to electron
API: include/exclude for BannerPlugin
API: added watchOptions (i. e. polling)
API: sort by global order by default
BUG: Support webpack bundles with externals in webpack bundles
1.8
(2015-04-29)

API: added filtering option for SourceMapPlugin
COMMUNITY: changed rules regarding issues and chat room. Questions should move to stackoverflow
BUG: stores records relative to context
SUPPORT: support other compile-to-js langs for webpack config
API: added cheap SourceMaps with line to line mappings
API: more flexible SourceMap devtool configuration
API: added crossOrginLoading option
API: enable CSS SourceMaps by default
API: error when using CommonsChunkPlugin wrongly
1.7
(2015-03-11)

SUPPORT: added semicolon to end of bundle
SUPPORT: added HMR management code for node.js (serverside)
API: Watching.close callback is optional
API: Added WatchIgnorePlugin
API: added experimental cheap source-map mode, which will be faster in the future
BUG: fixed nested objects in DefinePlugin
BUG: fixed HMR bug which caused unaffected modules to reload
API: allow functions as test in loaders list
API: allow arrays in loaders list, in which only one matches
API: allow “and” expressions in loaders list
1.6
(2015-02-24)

API: allow more types in DefinePlugin
API: console colors are automatically
BUG: DedupePlugin is more reliable
SUPPORT: added support for relative inlinded AMD modules
TEST: more test cases
1.5
(2015-01-21)

API: added async parameter to CommonsChunksPlugin to create a async loaded commons chunks
SUPPORT: Symlinks while resolving
API: added EnvironmentPlugin

API: support loading of multiple chunks in a dependency block

API: added node.Buffer option
API: added node.setImmediate
1.4
(2014-12-28)

API: added ‘hidden-sourcemap’ devtool
API: added NoErrorsPlugin, which doesn’t emit a bundle on errors
API: added hot-only dev-server, which doesn’t reload the page on unaccepted update
API: more features for the CommonsChunkPlugin to process non-entry chunks
API: support library with commons chunks
API: added options parameter to module.hot.accept/check
BUG: rewrite module reasons on module moving
BUG: fixed bug, when extending Object.prototype
API: expose sourceMap flag to loaders
BUG: allow array in module.hot.accept
API: expose id in context
INTERNAL: moved placeholder replacing into plugin
1.3
(2014-08-25)

API: plugin interface for all templates
API: resolve path in NormalModuleReplacementPlugin
API: added MultiCompiler (experimental)
API: more params for the ContextReplacementPlugin
API: added support for optional externals
API: support multiple assets in assetsByChunkName
API: better support for [name]
API: better filenames in SourceMaps + options
API: added API for error handing in self accepted modules
API: added __webpack_hash__
SUPPORT: Support browserify pre-built bundles with a warning
SUPPORT: better AMD support
BUG: fixed sourceMappingURL path
TEST: tests run on linux and windows
PERFORMANCE: more caching for main chunk
1.2
(2014-05-27)

BUG: fixed some SourceMap issues
API: added typeof support to the DefinePlugin
BUG: fixed parser crash
1.1
(2014-05-17)

API: added externals option
API: cache is enabled by default
SUPPORT: Generated require is now __webpack_require__
SUPPORT: updates to node.js buildin replacements
PERFORMANCE: more and more reliable caching
API: support [hash] in output.path
API: allow to overwrite default RegExp and warnings for contexts
API: allow querystring on output files
API: Warning about case-sensitive modules
API: added access to outside require with __non_webpack_require__
API: added node-webkit target
SUPPORT: allow multiple webpack entry chunks on a page
SUPPORT: .json is a default extension (similar to node.js)
SUPPORT: ignore modules by browser field
bug fixes
1.0
API: The following options are now DEPRECATED and superseded by plugins:
define -> DefinePluging
prefetch -> PrefetchPlugin
provide -> ProvidePlugin
hot -> HotModuleReplacementPlugin
optimize.dedupe -> optimize.DedupePlugin
optimize.minimize -> optimize.UglifyJsPlugin
optimize.maxChunks -> optimize.LimitChunkCountPlugin
optimize.minChunkSize -> optimize.MinChunkSizePlugin
optimize.occurenceOrder -> optimize.OccurenceOrderPlugin
Warnings are emitted when using deprecated options
API: plugins are now exported by webpack: require("webpack").DefinePlugin
API: Labeled Modules are now disabled by default, use the dependencies.LabeledModulesPlugin
API: Internal plugin arguments simplified
API: added ResolverPlugin
API: added chunk origin tracking and resolve logging (for finding compile bugs)
API: added eval-source-map devtool
API: default configuration depends on target option
API: changed filenames in SourceMaps
API: ids for entry chunks need to longer have the id 0
API: output as amd module
API: allow to configure the indent of the source
API: added AggressiveMergingPlugin and ResolverPlugin
API: added --display-origins to show chunk origins
API: added --display-error-details to show resolving log
SUPPORT: Support for the browser-field
SUPPORT: free vars are tracked over IIFEs
SUPPORT: allow to rename free vars
SUPPORT: allow local named amd modules
PERFORMANCE: Cache final module sources
SIZE: no require.e if not needed
bug fixes
0.11
API: this in modules is now exports (if this breaks a library, try prefixing imports?this=>window!)
API: added Hot Code Replacement --hot (web and node target) [experimental]
API: added define option
API: support new sourceMappingURL and sourceURL syntax
API: added CommonsChunkPlugin
API: --profile --progress now display process timings
API: added loaderContext.loadModule
PERFORMANCE: added unsafeCache and noParse option for performance
SIZE: automatically remove require.ensure when no chunk was generated.
SIZE: generate (sparse) array instead of object as module container when appropriate
SUPPORT: extract dependencies from a bound callback
SUPPORT: support evaluating of .replace and .split
TEST: added many of the browsertest to the node.js tests
0.10
SUPPORT: node 0.10 support
PERFORMANCE: whole chunks can now be cached
API: store state in json file (records) --records-path
API: added --devtool source-map and --devtool inline-source-map
SIZE: added option --optimize-occurence-order
SIZE: added --optimize-dedupe
Small changes:

PERFORMANCE: assets are only emitted if they changed
API: added --profile
PERFORMANCE: added --prefetch [experimental]
API: added BannerPlugin
API: added [chunkhash] [experimental]
API: added hashDigestLength
PERFORMANCE: increased filesystem caching to 60s
PERFORMANCE: purge only changed files in watch mode
PERFORMANCE: purge all files on compiling in not-watch mode
SUPPORT: in-memory filesystem now supports windows-like paths too
SIZE: merging chunk is more clever
0.9
…

0.8
Updated to UglifyJs 2
Query String are allowed for loaders and resources
Updated many loaders to use query strings as parameters
“jam” is no longer a default modules folder (still possible to add it per config)
API: fixed typos: modulesDirectories, separable, library
API: api of enhanced-resolve and enhanced-require changed.
API: options.minimize and now be also a object, which is passed to UglifyJs2.Compressor
API: added "web" to default package mains, added "webLoader" to default loader package mains
API: removed "webpack" from default loader package mains
added “node” template: bundle can run on node.js host (experimental)
0.7.6
API: added experimental chunk merging via options.maxChunks
0.7
API: loaderContext.depencency is more relaxed and don’t need to be called before reading
API: loader.seperable cannot combined with
loaderContext.emitFile and loaderContext.emitSubStats
loaderContext.options.events
loaderContext.options.resolve
loaderContext.resolve and loaderContext.resolve.sync
API: added loader.seperableIfResolve
API: loader.seperableIfResolve cannot combined with
loaderContext.emitFile and loaderContext.emitSubStats
loaderContext.options.events
API: added profile option (and --profile)
API: added workers option (and --workers)
API: added closeWorkers option
API: if option workers is used:
options must be JSON.stringify-able. Except options.events.
Any error thrown in loader must be an object (i. e. an Error object). Only message, stack and value of toString is passed to main process.
API: added workersNoResolve option. Workers should not used while resolving.
API: The expected Cache object for options.cache has changed.
API: event module is emited after the module is finished.
API: event context is now named context-enum
API: added event context which is emited after the context is finished.
API: event dependency is removed. Use stats.dependencies for this.
API: event loader is removed. Use stats.loaders for this.
API: added stats.contexts as a list of contexts.
API: added stats...modules[..].dependencies for as list of files which affect the module’s content.
API: added stats...modules[..].loaders for as list of loaders which affect the module’s content.
API: removed stats.modulesPerChunk, it is useless and was deprecated.
API: added stats.chunkNameFiles which export the files for named chunks
API: added stats.startTime, timestamp as number
cmd: more colorful output to indicate caching and timing
API: webpack in watch mode emits the event watch-end if watch mode have to end (i. e. loader changed). You may restart it after clearing require.cache.
API: added loaderContext.loaderType as one of loader, preLoader or postLoader.
API: added loaderContext.currentLoaders as list of all loader of the current type.
API: added loaderContext.loaderIndex as index of current loader in loaderContext.currentLoaders.
API: added loaderContext.loaders, loaderContext.preLoaders and loaderContext.postLoaders.
API: added stats.fileModules…reasons[].async = true instead of “async xxx”
API: added loaderContext.emitError and loaderContext.emitWarning
0.6
internal: resolving logic moved into enhanced-resolve.
internal: moved loaders logic into enhanced-require.
API: removed require-polyfill, use enhanced-require.
API: removed deprecated script-src-prefix.
API: removed deprecated direct compile into output, overwrite emitFile.
API: parameter options is not longer optional.
API: added loader.seperable (see spec).
API: loaderContext.resolve is now async, even in sync mod