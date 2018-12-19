This example illustrates a very simple case of Code Splitting with `require.ensure`.

* `a` and `b` are required normally via CommonJS
* `c` is depended through the `require.ensure` array.
  * This means: make it available, but don't execute it
  * webpack will load it on demand
* `b` and `d` are required via CommonJs in the `require.ensure` callback
  * webpack detects that these are in the on-demand-callback and
  * will load them on demand
  * webpacks optimizer can optimize `b` away
    * as it is already available through the parent chunks

You can see that webpack outputs two files/chunks:

* `output.js` is the entry chunk and contains
  * the module system
  * chunk loading logic
  * the entry point `example.js`
  * module `a`
  * module `b`
* `1.output.js` is an additional chunk (on demand loaded) and contains
  * module `c`
  * module `d`

You can see that chunks are loaded via JSONP. The additional chunks are pretty small and minimize well.

# example.js

``` javascript
var a = require("a");
var b = require("b");
require.ensure(["c"], function(require) {
    require("b").xyz();
    var d = require("d");
});
```


# dist/output.js

<details><summary><code>/******/ (function(modules) { /* webpackBootstrap */ })</code></summary>

``` javascript
/******/ (function(modules, runtime) { // webpackBootstrap
/******/ 	"use strict";
/******/ 	// The module cache
/******/ 	var installedModules = {};
/******/
/******/ 	// The require function
/******/ 	function __webpack_require__(moduleId) {
/******/
/******/ 		// Check if module is in cache
/******/ 		if(installedModules[moduleId]) {
/******/ 			return installedModules[moduleId].exports;
/******/ 		}
/******/ 		// Create a new module (and put it into the cache)
/******/ 		var module = installedModules[moduleId] = {
/******/ 			i: moduleId,
/******/ 			l: false,
/******/ 			exports: {}
/******/ 		};
/******/
/******/ 		// Execute the module function
/******/ 		modules[moduleId].call(module.exports, module, module.exports, __webpack_require__);
/******/
/******/ 		// Flag the module as loaded
/******/ 		module.l = true;
/******/
/******/ 		// Return the exports of the module
/******/ 		return module.exports;
/******/ 	}
/******/
/******/
/******/ 	// expose the modules object (__webpack_modules__)
/******/ 	__webpack_require__.m = modules;
/******/
/******/ 	// initialize runtime
/******/ 	runtime(__webpack_require__);
/******/
/******/ 	// Load entry module and return exports
/******/ 	return __webpack_require__(0);
/******/ })
/************************************************************************/
```

</details>

``` javascript
/******/ ([
/* 0 */
/*!********************!*\
  !*** ./example.js ***!
  \********************/
/*! no static exports found */
/*! runtime requirements: __webpack_require__, __webpack_require__.e */
/***/ (function(__unusedmodule, __unusedexports, __webpack_require__) {

var a = __webpack_require__(/*! a */ 1);
var b = __webpack_require__(/*! b */ 2);
__webpack_require__.e(/*! require.ensure */ 3).then((function(require) {
    __webpack_require__(/*! b */ 2).xyz();
    var d = __webpack_require__(/*! d */ 4);
}).bind(null, __webpack_require__)).catch(__webpack_require__.oe);

/***/ }),
/* 1 */
/*!***************************!*\
  !*** ./node_modules/a.js ***!
  \***************************/
/*! no static exports found */
/*! runtime requirements:  */
/***/ (function() {

// module a

/***/ }),
/* 2 */
/*!***************************!*\
  !*** ./node_modules/b.js ***!
  \***************************/
/*! no static exports found */
/*! runtime requirements:  */
/***/ (function() {

// module b

/***/ })
/******/ ],
```

<details><summary><code>function(__webpack_require__) { /* webpackRuntimeModules */ });</code></summary>

``` js
/******/ function(__webpack_require__) { // webpackRuntimeModules
/******/ 	"use strict";
/******/ 
/******/ 	/* webpack/runtime/ensure chunk */
/******/ 	!function() {
/******/ 		__webpack_require__.f = {};
/******/ 		// This file contains only the entry chunk.
/******/ 		// The chunk loading function for additional chunks
/******/ 		__webpack_require__.e = function requireEnsure(chunkId) {
/******/ 			return Promise.all(Object.keys(__webpack_require__.f).reduce(function(promises, key) { __webpack_require__.f[key](chunkId, promises); return promises; }, []));
/******/ 		};
/******/ 	}();
/******/ 	
/******/ 	/* webpack/runtime/publicPath */
/******/ 	!function() {
/******/ 		__webpack_require__.p = "dist/";
/******/ 	}();
/******/ 	
/******/ 	/* webpack/runtime/get javascript chunk filename */
/******/ 	!function() {
/******/ 		__webpack_require__.u = function(chunkId) {
/******/ 			return "" + chunkId + ".output.js";
/******/ 		};
/******/ 	}();
/******/ 	
/******/ 	/* webpack/runtime/jsonp chunk loading */
/******/ 	!function() {
/******/ 		
/******/ 		
/******/ 		// object to store loaded and loading chunks
/******/ 		// undefined = chunk not loaded, null = chunk preloaded/prefetched
/******/ 		// Promise = chunk loading, 0 = chunk loaded
/******/ 		var installedChunks = {
/******/ 			404: 0
/******/ 		};
/******/ 		
/******/ 		
/******/ 		
/******/ 		__webpack_require__.f.j = function(chunkId, promises) {
/******/ 			// JSONP chunk loading for javascript
/******/ 			var installedChunkData = installedChunks[chunkId];
/******/ 			if(installedChunkData !== 0) { // 0 means "already installed".
/******/ 		
/******/ 				// a Promise means "currently loading".
/******/ 				if(installedChunkData) {
/******/ 					promises.push(installedChunkData[2]);
/******/ 				} else {
/******/ 					// setup Promise in chunk cache
/******/ 					var promise = new Promise(function(resolve, reject) {
/******/ 						installedChunkData = installedChunks[chunkId] = [resolve, reject];
/******/ 					});
/******/ 					promises.push(installedChunkData[2] = promise);
/******/ 		
/******/ 					// start chunk loading
/******/ 					var url = __webpack_require__.p + __webpack_require__.u(chunkId);
/******/ 					var loadingEnded = function() { if(installedChunks[chunkId]) return installedChunks[chunkId][1]; if(installedChunks[chunkId] !== 0) installedChunks[chunkId] = undefined; };
/******/ 					var script = document.createElement('script');
/******/ 					var onScriptComplete;
/******/ 		
/******/ 					script.charset = 'utf-8';
/******/ 					script.timeout = 120;
/******/ 					if (__webpack_require__.nc) {
/******/ 						script.setAttribute("nonce", __webpack_require__.nc);
/******/ 					}
/******/ 					script.src = url;
/******/ 		
/******/ 					onScriptComplete = function (event) {
/******/ 						// avoid mem leaks in IE.
/******/ 						script.onerror = script.onload = null;
/******/ 						clearTimeout(timeout);
/******/ 						var reportError = loadingEnded();
/******/ 						if(reportError) {
/******/ 							var errorType = event && (event.type === 'load' ? 'missing' : event.type);
/******/ 							var realSrc = event && event.target && event.target.src;
/******/ 							var error = new Error('Loading chunk ' + chunkId + ' failed.\n(' + errorType + ': ' + realSrc + ')');
/******/ 							error.type = errorType;
/******/ 							error.request = realSrc;
/******/ 							reportError(error);
/******/ 						}
/******/ 					};
/******/ 					var timeout = setTimeout(function(){
/******/ 						onScriptComplete({ type: 'timeout', target: script });
/******/ 					}, 120000);
/******/ 					script.onerror = script.onload = onScriptComplete;
/******/ 					document.head.appendChild(script);
/******/ 		
/******/ 					// no HMR
/******/ 				}
/******/ 			}
/******/ 		
/******/ 			// no chunk preloading needed
/******/ 		};
/******/ 		
/******/ 		// no prefetching
/******/ 		
/******/ 		// no HMR
/******/ 		
/******/ 		// no HMR manifest
/******/ 		
/******/ 		// no deferred startup
/******/ 		
/******/ 		// install a JSONP callback for chunk loading
/******/ 		function webpackJsonpCallback(data) {
/******/ 			var chunkIds = data[0];
/******/ 			var moreModules = data[1];
/******/ 		
/******/ 			var runtime = data[3];
/******/ 		
/******/ 			// add "moreModules" to the modules object,
/******/ 			// then flag all "chunkIds" as loaded and fire callback
/******/ 			var moduleId, chunkId, i = 0, resolves = [];
/******/ 			for(;i < chunkIds.length; i++) {
/******/ 				chunkId = chunkIds[i];
/******/ 				if(installedChunks[chunkId]) {
/******/ 					resolves.push(installedChunks[chunkId][0]);
/******/ 				}
/******/ 				installedChunks[chunkId] = 0;
/******/ 			}
/******/ 			for(moduleId in moreModules) {
/******/ 				if(Object.prototype.hasOwnProperty.call(moreModules, moduleId)) {
/******/ 					__webpack_require__.m[moduleId] = moreModules[moduleId];
/******/ 				}
/******/ 			}
/******/ 			if(runtime) runtime(__webpack_require__);
/******/ 			if(parentJsonpFunction) parentJsonpFunction(data);
/******/ 		
/******/ 			while(resolves.length) {
/******/ 				resolves.shift()();
/******/ 			}
/******/ 		
/******/ 		};
/******/ 		
/******/ 		var jsonpArray = window["webpackJsonp"] = window["webpackJsonp"] || [];
/******/ 		var oldJsonpFunction = jsonpArray.push.bind(jsonpArray);
/******/ 		jsonpArray.push = webpackJsonpCallback;
/******/ 		
/******/ 		var parentJsonpFunction = oldJsonpFunction;
/******/ 	}();
/******/ 	
/******/ }
);
```

</details>


# dist/3.output.js

``` javascript
(window["webpackJsonp"] = window["webpackJsonp"] || []).push([[3],[
/* 0 */,
/* 1 */,
/* 2 */,
/* 3 */
/*!***************************!*\
  !*** ./node_modules/c.js ***!
  \***************************/
/*! no static exports found */
/*! runtime requirements:  */
/***/ (function() {

// module c

/***/ }),
/* 4 */
/*!***************************!*\
  !*** ./node_modules/d.js ***!
  \***************************/
/*! no static exports found */
/*! runtime requirements:  */
/***/ (function() {

// module d

/***/ })
]]);
```

Minimized

``` javascript
(window.webpackJsonp=window.webpackJsonp||[]).push([[3],{227:function(){},33:function(){}}]);
```

# Info

## Unoptimized

```
Hash: 0a1b2c3d4e5f6a7b8c9d
Version: webpack 5.0.0-next
      Asset       Size  Chunks             Chunk Names
3.output.js  520 bytes     {3}  [emitted]
  output.js   7.64 KiB   {404}  [emitted]  main
Entrypoint main = output.js
chunk {3} 3.output.js 22 bytes <{404}> [rendered]
    > [0] ./example.js 3:0-6:2
 [3] ./node_modules/c.js 11 bytes {3} [built]
     [used exports unknown]
     require.ensure item c [0] ./example.js 3:0-6:2
 [4] ./node_modules/d.js 11 bytes {3} [built]
     [used exports unknown]
     cjs require d [0] ./example.js 5:12-24
chunk {404} output.js (main) 161 bytes (javascript) 3.55 KiB (runtime) >{3}< [entry] [rendered]
    > .\example.js main
 [0] ./example.js 139 bytes {404} [built]
     [used exports unknown]
     entry .\example.js main
 [1] ./node_modules/a.js 11 bytes {404} [built]
     [used exports unknown]
     cjs require a [0] ./example.js 1:8-20
 [2] ./node_modules/b.js 11 bytes {404} [built]
     [used exports unknown]
     cjs require b [0] ./example.js 2:8-20
     cjs require b [0] ./example.js 4:4-16
     + 4 hidden chunk modules
```

## Production mode

```
Hash: 0a1b2c3d4e5f6a7b8c9d
Version: webpack 5.0.0-next
      Asset      Size  Chunks             Chunk Names
3.output.js  93 bytes     {3}  [emitted]
  output.js  1.45 KiB   {404}  [emitted]  main
Entrypoint main = output.js
chunk {3} 3.output.js 22 bytes <{404}> [rendered]
    > [275] ./example.js 3:0-6:2
  [33] ./node_modules/d.js 11 bytes {3} [built]
       cjs require d [275] ./example.js 5:12-24
 [227] ./node_modules/c.js 11 bytes {3} [built]
       require.ensure item c [275] ./example.js 3:0-6:2
chunk {404} output.js (main) 161 bytes (javascript) 3.55 KiB (runtime) >{3}< [entry] [rendered]
    > .\example.js main
  [54] ./node_modules/a.js 11 bytes {404} [built]
       cjs require a [275] ./example.js 1:8-20
 [215] ./node_modules/b.js 11 bytes {404} [built]
       cjs require b [275] ./example.js 2:8-20
       cjs require b [275] ./example.js 4:4-16
 [275] ./example.js 139 bytes {404} [built]
       entry .\example.js main
     + 4 hidden chunk modules
```
