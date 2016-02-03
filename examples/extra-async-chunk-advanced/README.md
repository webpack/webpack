

# example.js

``` javascript
require(["./a", "./b", "./c"], function(a, b, c) {});

require.ensure(["./a"], function(require) {
	require("./b");
	require("./d");
});

require.ensure(["./a", "./e"], function(require) {
	require("./a");
	require.ensure(["./b"], function(require) {
		require("./f");
	});
	require.ensure(["./b"], function(require) {
		require("./g");
	});
});
```

# webpack.config.js

``` javascript
var path = require("path");
var CommonsChunkPlugin = require("../../lib/optimize/CommonsChunkPlugin");
module.exports = {
	plugins: [
		new CommonsChunkPlugin({
			name: "main",
			async: "async1"
		}),
		new CommonsChunkPlugin({
			name: "main",
			async: "async2",
			minChunks: 2
		}),
		new CommonsChunkPlugin({
			async: true
		}),
	]
}
```

# js/output.js

``` javascript
/******/ (function(modules) { // webpackBootstrap
/******/ 	// install a JSONP callback for chunk loading
/******/ 	var parentJsonpFunction = window["webpackJsonp"];
/******/ 	window["webpackJsonp"] = function webpackJsonpCallback(chunkIds, moreModules, executeModule) {
/******/ 		// add "moreModules" to the modules object,
/******/ 		// then flag all "chunkIds" as loaded and fire callback
/******/ 		var moduleId, chunkId, i = 0, resolves = [];
/******/ 		for(;i < chunkIds.length; i++) {
/******/ 			chunkId = chunkIds[i];
/******/ 			if(installedChunks[chunkId])
/******/ 				resolves.push(installedChunks[chunkId][0]);
/******/ 			installedChunks[chunkId] = 0;
/******/ 		}
/******/ 		for(moduleId in moreModules) {
/******/ 			modules[moduleId] = moreModules[moduleId];
/******/ 		}
/******/ 		if(parentJsonpFunction) parentJsonpFunction(chunkIds, moreModules);
/******/ 		while(resolves.length)
/******/ 			resolves.shift()();

/******/ 	};

/******/ 	// The module cache
/******/ 	var installedModules = {};

/******/ 	// objects to store loaded and loading chunks
/******/ 	var installedChunks = {
/******/ 		2: 0
/******/ 	};

/******/ 	// The require function
/******/ 	function __webpack_require__(moduleId) {

/******/ 		// Check if module is in cache
/******/ 		if(installedModules[moduleId])
/******/ 			return installedModules[moduleId].exports;

/******/ 		// Create a new module (and put it into the cache)
/******/ 		var module = installedModules[moduleId] = {
/******/ 			exports: {},
/******/ 			id: moduleId,
/******/ 			loaded: false
/******/ 		};

/******/ 		// Execute the module function
/******/ 		modules[moduleId].call(module.exports, module, module.exports, __webpack_require__);

/******/ 		// Flag the module as loaded
/******/ 		module.loaded = true;

/******/ 		// Return the exports of the module
/******/ 		return module.exports;
/******/ 	}

/******/ 	// This file contains only the entry chunk.
/******/ 	// The chunk loading function for additional chunks
/******/ 	__webpack_require__.e = function requireEnsure(chunkId) {
/******/ 		if(installedChunks[chunkId] === 0)
/******/ 			return Promise.resolve()

/******/ 		// an Promise means "currently loading".
/******/ 		if(installedChunks[chunkId]) {
/******/ 			return installedChunks[chunkId][2];
/******/ 		}
/******/ 		// start chunk loading
/******/ 		var head = document.getElementsByTagName('head')[0];
/******/ 		var script = document.createElement('script');
/******/ 		script.type = 'text/javascript';
/******/ 		script.charset = 'utf-8';
/******/ 		script.async = true;
/******/ 		script.timeout = 120000;

/******/ 		script.src = __webpack_require__.p + "" + chunkId + ".js";
/******/ 		var timeout = setTimeout(onScriptComplete, 120000);
/******/ 		script.onerror = script.onload = onScriptComplete;
/******/ 		function onScriptComplete() {
/******/ 			// avoid mem leaks in IE.
/******/ 			script.onerror = script.onload = null;
/******/ 			clearTimeout(timeout);
/******/ 			var chunk = installedChunks[chunkId];
/******/ 			if(chunk !== 0) {
/******/ 				if(chunk) chunk[1](new Error('Loading chunk ' + chunkId + ' failed.'));
/******/ 				installedChunks[chunkId] = undefined;
/******/ 			}
/******/ 		};
/******/ 		head.appendChild(script);

/******/ 		var promise = new Promise(function(resolve, reject) {
/******/ 			installedChunks[chunkId] = [resolve, reject];
/******/ 		});
/******/ 		return installedChunks[chunkId][2] = promise;
/******/ 	};

/******/ 	// expose the modules object (__webpack_modules__)
/******/ 	__webpack_require__.m = modules;

/******/ 	// expose the module cache
/******/ 	__webpack_require__.c = installedModules;

/******/ 	// on error function for async loading
/******/ 	__webpack_require__.oe = function(err) { throw err; };

/******/ 	// __webpack_public_path__
/******/ 	__webpack_require__.p = "js/";
/******/ 	// Load entry module and return exports
/******/ 	return __webpack_require__(__webpack_require__.s = 5);
/******/ })
/************************************************************************/
/******/ ({

/***/ 5:
/*!********************!*\
  !*** ./example.js ***!
  \********************/
/***/ function(module, exports, __webpack_require__) {

	Promise.all/* require */([__webpack_require__.e(0), __webpack_require__.e(1), __webpack_require__.e(5)]).then(function() { var __WEBPACK_AMD_REQUIRE_ARRAY__ = [__webpack_require__(/*! ./a */ 0), __webpack_require__(/*! ./b */ 1), __webpack_require__(/*! ./c */ 2)]; (function(a, b, c) {}.apply(null, __WEBPACK_AMD_REQUIRE_ARRAY__));}).catch(function(err) { __webpack_require__.oe(err); });

	Promise.all/* nsure */([__webpack_require__.e(0), __webpack_require__.e(1), __webpack_require__.e(4)]).then(function(require) {
		__webpack_require__(/*! ./b */ 1);
		__webpack_require__(/*! ./d */ 3);
	}.bind(null, __webpack_require__)).catch(function(err) { __webpack_require__.oe(err); });

	Promise.all/* nsure */([__webpack_require__.e(1), __webpack_require__.e(3)]).then(function(require) {
		__webpack_require__(/*! ./a */ 0);
		Promise.all/* nsure */([__webpack_require__.e(0), __webpack_require__.e(7)]).then(function(require) {
			__webpack_require__(/*! ./f */ 6);
		}.bind(null, __webpack_require__)).catch(function(err) { __webpack_require__.oe(err); });
		Promise.all/* nsure */([__webpack_require__.e(0), __webpack_require__.e(6)]).then(function(require) {
			__webpack_require__(/*! ./g */ 7);
		}.bind(null, __webpack_require__)).catch(function(err) { __webpack_require__.oe(err); });
	}.bind(null, __webpack_require__)).catch(function(err) { __webpack_require__.oe(err); });


/***/ }

/******/ });
```

# Info

## Uncompressed

```
Hash: 231957f90f3442d8bba6
Version: webpack 2.0.6-beta
Time: 117ms
    Asset       Size  Chunks             Chunk Names
     0.js  165 bytes       0  [emitted]  async2
     1.js  156 bytes       1  [emitted]  async1
output.js    5.63 kB       2  [emitted]  main
     3.js  159 bytes       3  [emitted]  
     4.js  159 bytes       4  [emitted]  
     5.js  159 bytes       5  [emitted]  
     6.js  159 bytes       6  [emitted]  
     7.js  159 bytes       7  [emitted]  
chunk    {0} 0.js (async2) 21 bytes {2} {3} [rendered]
    > async commons [5] ./example.js 1:0-52
    > async commons [5] ./example.js 3:0-6:2
    > duplicate async commons [5] ./example.js 10:1-12:3
    > duplicate async commons [5] ./example.js 13:1-15:3
    [1] ./b.js 21 bytes {0} [built]
        amd require ./b [5] ./example.js 1:0-52
        cjs require ./b [5] ./example.js 4:1-15
        require.ensure item ./b [5] ./example.js 10:1-12:3
        require.ensure item ./b [5] ./example.js 13:1-15:3
chunk    {1} 1.js (async1) 21 bytes {2} [rendered]
    > async commons [5] ./example.js 1:0-52
    > async commons [5] ./example.js 3:0-6:2
    > async commons [5] ./example.js 8:0-16:2
    [0] ./a.js 21 bytes {1} [built]
        amd require ./a [5] ./example.js 1:0-52
        require.ensure item ./a [5] ./example.js 3:0-6:2
        require.ensure item ./a [5] ./example.js 8:0-16:2
        cjs require ./a [5] ./example.js 9:1-15
chunk    {2} output.js (main) 362 bytes [rendered]
    > main [5] ./example.js 
    [5] ./example.js 362 bytes {2} [built]
chunk    {3} 3.js 21 bytes {2} [rendered]
    > [5] ./example.js 8:0-16:2
    [4] ./e.js 21 bytes {3} [built]
        require.ensure item ./e [5] ./example.js 8:0-16:2
chunk    {4} 4.js 21 bytes {2} [rendered]
    > [5] ./example.js 3:0-6:2
    [3] ./d.js 21 bytes {4} [built]
        cjs require ./d [5] ./example.js 5:1-15
chunk    {5} 5.js 21 bytes {2} [rendered]
    > [5] ./example.js 1:0-52
    [2] ./c.js 21 bytes {5} [built]
        amd require ./c [5] ./example.js 1:0-52
chunk    {6} 6.js 21 bytes {3} [rendered]
    > [5] ./example.js 13:1-15:3
    [7] ./g.js 21 bytes {6} [built]
        cjs require ./g [5] ./example.js 14:2-16
chunk    {7} 7.js 21 bytes {3} [rendered]
    > [5] ./example.js 10:1-12:3
    [6] ./f.js 21 bytes {7} [built]
        cjs require ./f [5] ./example.js 11:2-16
```

## Minimized (uglify-js, no zip)

```
Hash: 231957f90f3442d8bba6
Version: webpack 2.0.6-beta
Time: 312ms
    Asset      Size  Chunks             Chunk Names
     0.js  50 bytes       0  [emitted]  async2
     1.js  49 bytes       1  [emitted]  async1
output.js    1.5 kB       2  [emitted]  main
     3.js  51 bytes       3  [emitted]  
     4.js  51 bytes       4  [emitted]  
     5.js  51 bytes       5  [emitted]  
     6.js  51 bytes       6  [emitted]  
     7.js  51 bytes       7  [emitted]  
chunk    {0} 0.js (async2) 21 bytes {2} {3} [rendered]
    > async commons [5] ./example.js 1:0-52
    > async commons [5] ./example.js 3:0-6:2
    > duplicate async commons [5] ./example.js 10:1-12:3
    > duplicate async commons [5] ./example.js 13:1-15:3
    [1] ./b.js 21 bytes {0} [built]
        amd require ./b [5] ./example.js 1:0-52
        cjs require ./b [5] ./example.js 4:1-15
        require.ensure item ./b [5] ./example.js 10:1-12:3
        require.ensure item ./b [5] ./example.js 13:1-15:3
chunk    {1} 1.js (async1) 21 bytes {2} [rendered]
    > async commons [5] ./example.js 1:0-52
    > async commons [5] ./example.js 3:0-6:2
    > async commons [5] ./example.js 8:0-16:2
    [0] ./a.js 21 bytes {1} [built]
        amd require ./a [5] ./example.js 1:0-52
        require.ensure item ./a [5] ./example.js 3:0-6:2
        require.ensure item ./a [5] ./example.js 8:0-16:2
        cjs require ./a [5] ./example.js 9:1-15
chunk    {2} output.js (main) 362 bytes [rendered]
    > main [5] ./example.js 
    [5] ./example.js 362 bytes {2} [built]
chunk    {3} 3.js 21 bytes {2} [rendered]
    > [5] ./example.js 8:0-16:2
    [4] ./e.js 21 bytes {3} [built]
        require.ensure item ./e [5] ./example.js 8:0-16:2
chunk    {4} 4.js 21 bytes {2} [rendered]
    > [5] ./example.js 3:0-6:2
    [3] ./d.js 21 bytes {4} [built]
        cjs require ./d [5] ./example.js 5:1-15
chunk    {5} 5.js 21 bytes {2} [rendered]
    > [5] ./example.js 1:0-52
    [2] ./c.js 21 bytes {5} [built]
        amd require ./c [5] ./example.js 1:0-52
chunk    {6} 6.js 21 bytes {3} [rendered]
    > [5] ./example.js 13:1-15:3
    [7] ./g.js 21 bytes {6} [built]
        cjs require ./g [5] ./example.js 14:2-16
chunk    {7} 7.js 21 bytes {3} [rendered]
    > [5] ./example.js 10:1-12:3
    [6] ./f.js 21 bytes {7} [built]
        cjs require ./f [5] ./example.js 11:2-16
```
