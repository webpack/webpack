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
PublicPath: [1mdist/[39m[22m
asset [1m[32moutput.js[39m[22m 28 bytes {[1m[33m792[39m[22m} [1m[32m[emitted][39m[22m [1m[32m[minimized][39m[22m (name: main)
Entrypoint [1mmain[39m[22m 28 bytes = [1m[32moutput.js[39m[22m
chunk {[1m[33m792[39m[22m} (runtime: main) [1m[32moutput.js[39m[22m (main) 29 bytes [1m[33m[entry][39m[22m [1m[32m[rendered][39m[22m
  > ./example.js [1m[39m[22m main
[1m./example.js[39m[22m [695] 29 bytes {[1m[33m792[39m[22m} [depth 0] [1m[33m[built][39m[22m [1m[33m[code generated][39m[22m
  [1m[36m[no exports used][39m[22m
  [1m[33mStatement (ExpressionStatement) with side effects in source code at 1:0-28[39m[22m
  [1m[33mModuleConcatenation bailout: Module is not an ECMAScript module[39m[22m

[1mLOG from webpack.Compilation[39m[22m
    [1m1 modules hashed, 0 from cache (1 variants per module in average)[39m[22m
    [1m100% code generated (1 generated, 0 from cache)[39m[22m
+ 24 hidden lines

[1mLOG from webpack.FlagDependencyExportsPlugin[39m[22m
    [1m0% of exports of modules have been determined (1 no declared exports, 0 not cached, 0 flagged uncacheable, 0 from cache, 0 from mem cache, 0 additional calculations due to dependencies)[39m[22m
+ 3 hidden lines

[1mLOG from webpack.buildChunkGraph[39m[22m
    [1m2 queue items processed (1 blocks)[39m[22m
    [1m0 chunk groups connected[39m[22m
    [1m0 chunk groups processed for merging (0 module sets, 0 forked, 0 + 0 modules forked, 0 + 0 modules merged into fork, 0 resulting modules)[39m[22m
    [1m0 chunk group info updated (0 already connected chunk groups reconnected)[39m[22m
+ 5 hidden lines

[1mLOG from webpack.FileSystemInfo[39m[22m
    [1m1 new snapshots created[39m[22m
    [1m0% root snapshot uncached (0 / 0)[39m[22m
    [1m0% children snapshot uncached (0 / 0)[39m[22m
    [1m0 entries tested[39m[22m
    [1mFile info in cache: 1 timestamps 1 hashes 1 timestamp hash combinations[39m[22m
    [1mFile timestamp hash combination snapshot optimization: 0% (0/1) entries shared via 0 shared snapshots (0 times referenced)[39m[22m
    [1mDirectory info in cache: 0 timestamps 0 hashes 0 timestamp hash combinations[39m[22m
    [1mManaged items info in cache: 0 items[39m[22m

2025-04-27 [1m00:16:13[39m[22m: webpack 5.99.7 compiled [1m[32msuccessfully[39m[22m (922245dc37adc36977b5)
```
