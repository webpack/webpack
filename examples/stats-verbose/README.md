This example shows how you use the [`verbose` stats preset](https://webpack.js.org/configuration/stats/#stats-presets) in webpack.


You see that everything is working nicely together.

# example.js

```javascript
console.log("Hello World!");
```

# webpack.config.js

```javascript
const path = require("path");

module.exports = {
    entry: {
		main: "./example"
	},
	output: {
		path: path.join(__dirname, "dist"),
		filename: "output.js",
	},
	stats: "verbose"
};
```

# dist/output.js

```javascript
/******/ (() => { // webpackBootstrap
var __webpack_exports__ = {};
/*!********************!*\
  !*** ./example.js ***!
  \********************/
/*! unknown exports (runtime-defined) */
/*! runtime requirements:  */
console.log("Hello World!");

/******/ })()
;
```

# Info

## Production mode

```
PublicPath: dist/
asset output.js 28 bytes {179} [emitted] [minimized] (name: main)
Entrypoint main 28 bytes = output.js
chunk {179} (runtime: main) output.js (main) 29 bytes [entry] [rendered]
  > ./example.js main
  ./example.js [144] 29 bytes {179} [depth 0] [built] [code generated]
    [no exports used]
    Statement (ExpressionStatement) with side effects in source code at 1:0-28
    ModuleConcatenation bailout: Module is not an ECMAScript module
    entry ./example.js main
  

LOG from webpack.Compiler
<t> make hook: 15.624208 ms
<t> finish make hook: 0.024708 ms
<t> finish compilation: 0.96875 ms
<t> seal compilation: 66.949959 ms
<t> afterCompile hook: 0.021459 ms
<t> emitAssets: 1.30875 ms
<t> emitRecords: 0.03025 ms
<t> done hook: 0.020875 ms
<t> beginIdle: 0.009291 ms

LOG from webpack.Compilation
<t> compute affected modules: 0.111833 ms
<t> finish modules: 0.55975 ms
<t> report dependency errors and warnings: 0.040125 ms
<t> optimize dependencies: 0.6375 ms
<t> create chunks: 1.044375 ms
<t> compute affected modules with chunk graph: 0.061291 ms
<t> optimize: 2.435125 ms
    1 modules hashed, 0 from cache (1 variants per module in average)
<t> module hashing: 0.624792 ms
    100% code generated (1 generated, 0 from cache)
<t> code generation: 0.626875 ms
<t> runtime requirements.modules: 0.037 ms
<t> runtime requirements.chunks: 0.113834 ms
<t> runtime requirements.entries: 0.200666 ms
<t> runtime requirements: 0.468042 ms
<t> hashing: initialize hash: 0.002833 ms
<t> hashing: sort chunks: 0.02775 ms
<t> hashing: hash runtime modules: 0.01675 ms
<t> hashing: hash chunks: 0.723625 ms
<t> hashing: hash digest: 0.021333 ms
<t> hashing: process full hash modules: 0.000708 ms
<t> hashing: 1.019625 ms
<t> record hash: 0.009083 ms
<t> module assets: 0.036292 ms
<t> create chunk assets: 1.131625 ms
<t> process assets: 58.295125 ms

LOG from webpack.FlagDependencyExportsPlugin
<t> restore cached provided exports: 0.239667 ms
<t> figure out provided exports: 0.004917 ms
    0% of exports of modules have been determined (1 no declared exports, 0 not cached, 0 flagged uncacheable, 0 from cache, 0 from mem cache, 0 additional calculations due to dependencies)
<t> store provided exports into cache: 0.007375 ms

LOG from webpack.InnerGraphPlugin
<t> infer dependency usage: 0.086167 ms

LOG from webpack.SideEffectsFlagPlugin
<t> update dependencies: 0.037666 ms

LOG from webpack.FlagDependencyUsagePlugin
<t> initialize exports usage: 0.022084 ms
<t> trace exports usage in graph: 0.309125 ms

LOG from webpack.buildChunkGraph
<t> visitModules: prepare: 0.063334 ms
<t> visitModules: visiting: 0.232459 ms
    2 queue items processed (1 blocks)
    0 chunk groups connected
    0 chunk groups processed for merging (0 module sets, 0 forked, 0 + 0 modules forked, 0 + 0 modules merged into fork, 0 resulting modules)
    0 chunk group info updated (0 already connected chunk groups reconnected)
<t> visitModules: 0.618708 ms
<t> connectChunkGroups: 0.0275 ms
<t> cleanup: 0.014083 ms

LOG from webpack.SplitChunksPlugin
<t> prepare: 0.029708 ms
<t> modules: 0.36175 ms
<t> queue: 0.001041 ms
<t> maxSize: 0.016875 ms

LOG from webpack.ModuleConcatenationPlugin
<t> select relevant modules: 0.0355 ms
<t> sort relevant modules: 0.000541 ms
<t> find modules to concatenate: 0.000875 ms
<t> sort concat configurations: 0.000334 ms
<t> create concatenated modules: 0.020458 ms
+ 3 hidden lines

LOG from webpack.FileSystemInfo
    1 new snapshots created
    0% root snapshot uncached (0 / 0)
    0% children snapshot uncached (0 / 0)
    0 entries tested
    File info in cache: 1 timestamps 1 hashes 1 timestamp hash combinations
    File timestamp hash combination snapshot optimization: 0% (0/1) entries shared via 0 shared snapshots (0 times referenced)
    Directory info in cache: 0 timestamps 0 hashes 0 timestamp hash combinations
    Managed items info in cache: 0 items

2023-04-12 21:00:22: webpack 5.78.0 compiled successfully (99ac9d9be98086178b45)
```
