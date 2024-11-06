This configuration will enable the detailed output for the stats report.

You see that everything is working nicely together.

# example.js

```javascript
console.log("Hello World!");
```

# webpack.config.js

```javascript
const path = require("path");

module.exports = {
    output: {
		path: path.join(__dirname, "dist"),
		filename: "output.js"
	},
	stats: "detailed"
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

LOG from webpack.Compilation
    1 modules hashed, 0 from cache (1 variants per module in average)
    100% code generated (1 generated, 0 from cache)
+ 24 hidden lines

LOG from webpack.FlagDependencyExportsPlugin
    0% of exports of modules have been determined (1 no declared exports, 0 not cached, 0 flagged uncacheable, 0 from cache, 0 from mem cache, 0 additional calculations due to dependencies)
+ 3 hidden lines

LOG from webpack.buildChunkGraph
    2 queue items processed (1 blocks)
    0 chunk groups connected
    0 chunk groups processed for merging (0 module sets, 0 forked, 0 + 0 modules forked, 0 + 0 modules merged into fork, 0 resulting modules)
    0 chunk group info updated (0 already connected chunk groups reconnected)
+ 5 hidden lines

LOG from webpack.FileSystemInfo
    1 new snapshots created
    0% root snapshot uncached (0 / 0)
    0% children snapshot uncached (0 / 0)
    0 entries tested
    File info in cache: 1 timestamps 1 hashes 1 timestamp hash combinations
    File timestamp hash combination snapshot optimization: 0% (0/1) entries shared via 0 shared snapshots (0 times referenced)
    Directory info in cache: 0 timestamps 0 hashes 0 timestamp hash combinations
    Managed items info in cache: 0 items

2023-06-23 22:57:08: webpack 5.88.0 compiled successfully (208f5e6e78a48d3e157f)
```
