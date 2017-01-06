This example shows how to create a async loaded commons chunk.

When a chunk has many child chunks which share common modules the `CommonsChunkPlugin` can extract these common modules into a commons chunk which is loaded in parallel to the requested child chunk.

The example entry references two chunks:

* entry chunk
  * async require -> chunk X
  * async require -> chunk Y
* chunk X
  * module `a`
  * module `b`
  * module `c`
* chunk Y
  * module `a`
  * module `b`
  * module `d`

These chunks share modules `a` and `b`. The `CommonsChunkPlugin` extract these into chunk Z:

* entry chunk
  * async require -> chunk X & Z
  * async require -> chunk Y & Z
* chunk X
  * module `c`
* chunk Y
  * module `d`
* chunk Z
  * module `a`
  * module `b`

Pretty useful for a router in a SPA.


# example.js

``` javascript
// a chunks with a, b, c
require(["./a", "./b", "./c"], function(a, b, c) {});

// a chunk with a, b, d
require.ensure(["./a"], function(require) {
	require("./b");
	require("./d");
});
```

# webpack.config.js

``` javascript
var path = require("path");
var CommonsChunkPlugin = require("../../lib/optimize/CommonsChunkPlugin");
module.exports = {
	plugins: [
		new CommonsChunkPlugin({
			// process all children of the main chunk
			// if omitted it would process all chunks
			name: "main",
			// create a additional async chunk for the common modules
			// which is loaded in parallel to the requested chunks
			async: true
		})
	]
}
```

# js/output.js

<details><summary>`/******/ (function(modules) { /* webpackBootstrap */ })`</summary>
``` javascript
/******/ (function(modules) { // webpackBootstrap
/******/ 	// install a JSONP callback for chunk loading
/******/ 	var parentJsonpFunction = window["webpackJsonp"];
/******/ 	window["webpackJsonp"] = function webpackJsonpCallback(chunkIds, moreModules, executeModules) {
/******/ 		// add "moreModules" to the modules object,
/******/ 		// then flag all "chunkIds" as loaded and fire callback
/******/ 		var moduleId, chunkId, i = 0, resolves = [], result;
/******/ 		for(;i < chunkIds.length; i++) {
/******/ 			chunkId = chunkIds[i];
/******/ 			if(installedChunks[chunkId])
/******/ 				resolves.push(installedChunks[chunkId][0]);
/******/ 			installedChunks[chunkId] = 0;
/******/ 		}
/******/ 		for(moduleId in moreModules) {
/******/ 			if(Object.prototype.hasOwnProperty.call(moreModules, moduleId)) {
/******/ 				modules[moduleId] = moreModules[moduleId];
/******/ 			}
/******/ 		}
/******/ 		if(parentJsonpFunction) parentJsonpFunction(chunkIds, moreModules, executeModules);
/******/ 		while(resolves.length)
/******/ 			resolves.shift()();

/******/ 	};

/******/ 	// The module cache
/******/ 	var installedModules = {};

/******/ 	// objects to store loaded and loading chunks
/******/ 	var installedChunks = {
/******/ 		3: 0
/******/ 	};

/******/ 	// The require function
/******/ 	function __webpack_require__(moduleId) {

/******/ 		// Check if module is in cache
/******/ 		if(installedModules[moduleId])
/******/ 			return installedModules[moduleId].exports;

/******/ 		// Create a new module (and put it into the cache)
/******/ 		var module = installedModules[moduleId] = {
/******/ 			i: moduleId,
/******/ 			l: false,
/******/ 			exports: {}
/******/ 		};

/******/ 		// Execute the module function
/******/ 		modules[moduleId].call(module.exports, module, module.exports, __webpack_require__);

/******/ 		// Flag the module as loaded
/******/ 		module.l = true;

/******/ 		// Return the exports of the module
/******/ 		return module.exports;
/******/ 	}

/******/ 	// This file contains only the entry chunk.
/******/ 	// The chunk loading function for additional chunks
/******/ 	__webpack_require__.e = function requireEnsure(chunkId) {
/******/ 		if(installedChunks[chunkId] === 0)
/******/ 			return Promise.resolve();

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

/******/ 		if (__webpack_require__.nc) {
/******/ 			script.setAttribute("nonce", __webpack_require__.nc);
/******/ 		}
/******/ 		script.src = __webpack_require__.p + "" + chunkId + ".output.js";
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

/******/ 		var promise = new Promise(function(resolve, reject) {
/******/ 			installedChunks[chunkId] = [resolve, reject];
/******/ 		});
/******/ 		installedChunks[chunkId][2] = promise;

/******/ 		head.appendChild(script);
/******/ 		return promise;
/******/ 	};

/******/ 	// expose the modules object (__webpack_modules__)
/******/ 	__webpack_require__.m = modules;

/******/ 	// expose the module cache
/******/ 	__webpack_require__.c = installedModules;

/******/ 	// identity function for calling harmony imports with the correct context
/******/ 	__webpack_require__.i = function(value) { return value; };

/******/ 	// define getter function for harmony exports
/******/ 	__webpack_require__.d = function(exports, name, getter) {
/******/ 		if(!__webpack_require__.o(exports, name)) {
/******/ 			Object.defineProperty(exports, name, {
/******/ 				configurable: false,
/******/ 				enumerable: true,
/******/ 				get: getter
/******/ 			});
/******/ 		}
/******/ 	};

/******/ 	// getDefaultExport function for compatibility with non-harmony modules
/******/ 	__webpack_require__.n = function(module) {
/******/ 		var getter = module && module.__esModule ?
/******/ 			function getDefault() { return module['default']; } :
/******/ 			function getModuleExports() { return module; };
/******/ 		__webpack_require__.d(getter, 'a', getter);
/******/ 		return getter;
/******/ 	};

/******/ 	// Object.prototype.hasOwnProperty.call
/******/ 	__webpack_require__.o = function(object, property) { return Object.prototype.hasOwnProperty.call(object, property); };

/******/ 	// __webpack_public_path__
/******/ 	__webpack_require__.p = "js/";

/******/ 	// on error function for async loading
/******/ 	__webpack_require__.oe = function(err) { console.error(err); throw err; };

/******/ 	// Load entry module and return exports
/******/ 	return __webpack_require__(__webpack_require__.s = 4);
/******/ })
/************************************************************************/
```
</details>
``` javascript
/******/ ({

/***/ 4:
/* unknown exports provided */
/* all exports used */
/*!********************!*\
  !*** ./example.js ***!
  \********************/
/***/ function(module, exports, __webpack_require__) {

// a chunks with a, b, c
Promise.all/* require */([__webpack_require__.e(0), __webpack_require__.e(2)]).then(function() { var __WEBPACK_AMD_REQUIRE_ARRAY__ = [__webpack_require__(/*! ./a */ 0), __webpack_require__(/*! ./b */ 1), __webpack_require__(/*! ./c */ 2)]; (function(a, b, c) {}.apply(null, __WEBPACK_AMD_REQUIRE_ARRAY__));}).catch(__webpack_require__.oe);

// a chunk with a, b, d
Promise.all/* require.ensure */([__webpack_require__.e(0), __webpack_require__.e(1)]).then((function(require) {
	__webpack_require__(/*! ./b */ 1);
	__webpack_require__(/*! ./d */ 3);
}).bind(null, __webpack_require__)).catch(__webpack_require__.oe);


/***/ }

/******/ });
```

# js/0.output.js

``` javascript
webpackJsonp([0],[
/* 0 */
/* unknown exports provided */
/* all exports used */
/*!**************!*\
  !*** ./a.js ***!
  \**************/
/***/ function(module, exports) {

module.exports = "a";

/***/ },
/* 1 */
/* unknown exports provided */
/* all exports used */
/*!**************!*\
  !*** ./b.js ***!
  \**************/
/***/ function(module, exports) {

module.exports = "b";

/***/ }
]);
```

# js/1.output.js

``` javascript
webpackJsonp([1],{

/***/ 3:
/* unknown exports provided */
/* all exports used */
/*!**************!*\
  !*** ./d.js ***!
  \**************/
/***/ function(module, exports) {

module.exports = "d";

/***/ }

});
```

# js/2.output.js

``` javascript
webpackJsonp([2],{

/***/ 2:
/* unknown exports provided */
/* all exports used */
/*!**************!*\
  !*** ./c.js ***!
  \**************/
/***/ function(module, exports) {

module.exports = "c";

/***/ }

});
```

# Info

## Uncompressed

```
Hash: 303428dc1404ff150977
Version: webpack 2.2.0-rc.2
      Asset       Size  Chunks             Chunk Names
0.output.js  397 bytes       0  [emitted]  
1.output.js  212 bytes       1  [emitted]  
2.output.js  212 bytes       2  [emitted]  
  output.js    6.32 kB       3  [emitted]  main
Entrypoint main = output.js
chunk    {0} 0.output.js 42 bytes {3} [rendered]
    > async commons [4] ./example.js 2:0-52
    > async commons [4] ./example.js 5:0-8:2
    [0] ./a.js 21 bytes {0} [built]
        amd require ./a [4] ./example.js 2:0-52
        require.ensure item ./a [4] ./example.js 5:0-8:2
    [1] ./b.js 21 bytes {0} [built]
        amd require ./b [4] ./example.js 2:0-52
        cjs require ./b [4] ./example.js 6:1-15
chunk    {1} 1.output.js 21 bytes {3} [rendered]
    > [4] ./example.js 5:0-8:2
    [3] ./d.js 21 bytes {1} [built]
        cjs require ./d [4] ./example.js 7:1-15
chunk    {2} 2.output.js 21 bytes {3} [rendered]
    > [4] ./example.js 2:0-52
    [2] ./c.js 21 bytes {2} [built]
        amd require ./c [4] ./example.js 2:0-52
chunk    {3} output.js (main) 194 bytes [entry] [rendered]
    > main [4] ./example.js 
    [4] ./example.js 194 bytes {3} [built]
```

## Minimized (uglify-js, no zip)

```
Hash: 303428dc1404ff150977
Version: webpack 2.2.0-rc.2
      Asset      Size  Chunks             Chunk Names
0.output.js  78 bytes       0  [emitted]  
1.output.js  51 bytes       1  [emitted]  
2.output.js  51 bytes       2  [emitted]  
  output.js   1.56 kB       3  [emitted]  main
Entrypoint main = output.js
chunk    {0} 0.output.js 42 bytes {3} [rendered]
    > async commons [4] ./example.js 2:0-52
    > async commons [4] ./example.js 5:0-8:2
    [0] ./a.js 21 bytes {0} [built]
        amd require ./a [4] ./example.js 2:0-52
        require.ensure item ./a [4] ./example.js 5:0-8:2
    [1] ./b.js 21 bytes {0} [built]
        amd require ./b [4] ./example.js 2:0-52
        cjs require ./b [4] ./example.js 6:1-15
chunk    {1} 1.output.js 21 bytes {3} [rendered]
    > [4] ./example.js 5:0-8:2
    [3] ./d.js 21 bytes {1} [built]
        cjs require ./d [4] ./example.js 7:1-15
chunk    {2} 2.output.js 21 bytes {3} [rendered]
    > [4] ./example.js 2:0-52
    [2] ./c.js 21 bytes {2} [built]
        amd require ./c [4] ./example.js 2:0-52
chunk    {3} output.js (main) 194 bytes [entry] [rendered]
    > main [4] ./example.js 
    [4] ./example.js 194 bytes {3} [built]
```
