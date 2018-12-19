# example.js

``` javascript
var a = require("a");

require.ensure(["b"], function(require) {
	// a named chunk
	var c = require("c");
}, "my own chunk");

require.ensure(["b"], function(require) {
	// another chunk with the same name
	var d = require("d");
}, "my own chunk");

require.ensure([], function(require) {
	// the same again
}, "my own chunk");

require.ensure(["b"], function(require) {
	// chunk without name
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

__webpack_require__.e(/*! require.ensure | my own chunk */ 368).then((function(require) {
	// a named chunk
	var c = __webpack_require__(/*! c */ 3);
}).bind(null, __webpack_require__)).catch(__webpack_require__.oe);

__webpack_require__.e(/*! require.ensure | my own chunk */ 368).then((function(require) {
	// another chunk with the same name
	var d = __webpack_require__(/*! d */ 4);
}).bind(null, __webpack_require__)).catch(__webpack_require__.oe);

__webpack_require__.e(/*! require.ensure | my own chunk */ 368).then((function(require) {
	// the same again
}).bind(null, __webpack_require__)).catch(__webpack_require__.oe);

__webpack_require__.e(/*! require.ensure */ 126).then((function(require) {
	// chunk without name
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


# dist/126.output.js

``` javascript
(window["webpackJsonp"] = window["webpackJsonp"] || []).push([[126],[
/* 0 */,
/* 1 */,
/* 2 */
/*!***************************!*\
  !*** ./node_modules/b.js ***!
  \***************************/
/*! no static exports found */
/*! runtime requirements:  */
/***/ (function() {

// module b

/***/ }),
/* 3 */,
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

# dist/368.output.js

``` javascript
(window["webpackJsonp"] = window["webpackJsonp"] || []).push([[368],[
/* 0 */,
/* 1 */,
/* 2 */
/*!***************************!*\
  !*** ./node_modules/b.js ***!
  \***************************/
/*! no static exports found */
/*! runtime requirements:  */
/***/ (function() {

// module b

/***/ }),
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

# Info

## Unoptimized

```
Hash: 0a1b2c3d4e5f6a7b8c9d
Version: webpack 5.0.0-next
        Asset       Size  Chunks             Chunk Names
126.output.js  522 bytes   {126}  [emitted]
368.output.js  724 bytes   {368}  [emitted]  my own chunk
    output.js      8 KiB   {404}  [emitted]  main
Entrypoint main = output.js
chunk {126} 126.output.js 22 bytes <{404}> [rendered]
    > [0] ./example.js 17:0-20:2
 [2] ./node_modules/b.js 11 bytes {126} {368} [built]
     [used exports unknown]
     require.ensure item b [0] ./example.js 3:0-6:18
     require.ensure item b [0] ./example.js 8:0-11:18
     require.ensure item b [0] ./example.js 17:0-20:2
 [4] ./node_modules/d.js 11 bytes {126} {368} [built]
     [used exports unknown]
     cjs require d [0] ./example.js 10:9-21
     cjs require d [0] ./example.js 19:9-21
chunk {368} 368.output.js (my own chunk) 33 bytes <{404}> [rendered]
    > [0] ./example.js 13:0-15:18
    > [0] ./example.js 3:0-6:18
    > [0] ./example.js 8:0-11:18
 [2] ./node_modules/b.js 11 bytes {126} {368} [built]
     [used exports unknown]
     require.ensure item b [0] ./example.js 3:0-6:18
     require.ensure item b [0] ./example.js 8:0-11:18
     require.ensure item b [0] ./example.js 17:0-20:2
 [3] ./node_modules/c.js 11 bytes {368} [built]
     [used exports unknown]
     cjs require c [0] ./example.js 5:9-21
 [4] ./node_modules/d.js 11 bytes {126} {368} [built]
     [used exports unknown]
     cjs require d [0] ./example.js 10:9-21
     cjs require d [0] ./example.js 19:9-21
chunk {404} output.js (main) 432 bytes (javascript) 3.55 KiB (runtime) >{126}< >{368}< [entry] [rendered]
    > .\example.js main
 [0] ./example.js 421 bytes {404} [built]
     [used exports unknown]
     entry .\example.js main
 [1] ./node_modules/a.js 11 bytes {404} [built]
     [used exports unknown]
     cjs require a [0] ./example.js 1:8-20
     + 4 hidden chunk modules
```

## Production mode

```
Hash: 0a1b2c3d4e5f6a7b8c9d
Version: webpack 5.0.0-next
        Asset       Size        Chunks             Chunk Names
126.output.js   95 bytes         {126}  [emitted]
368.output.js  116 bytes  {126}, {368}  [emitted]  my own chunk
    output.js   1.58 KiB         {404}  [emitted]  main
Entrypoint main = output.js
chunk {126} 126.output.js 22 bytes <{404}> [rendered]
    > [275] ./example.js 17:0-20:2
  [33] ./node_modules/d.js 11 bytes {126} {368} [built]
       cjs require d [275] ./example.js 10:9-21
       cjs require d [275] ./example.js 19:9-21
 [215] ./node_modules/b.js 11 bytes {126} {368} [built]
       require.ensure item b [275] ./example.js 3:0-6:18
       require.ensure item b [275] ./example.js 8:0-11:18
       require.ensure item b [275] ./example.js 17:0-20:2
chunk {368} 368.output.js (my own chunk) 33 bytes <{404}> [rendered]
    > [275] ./example.js 13:0-15:18
    > [275] ./example.js 3:0-6:18
    > [275] ./example.js 8:0-11:18
  [33] ./node_modules/d.js 11 bytes {126} {368} [built]
       cjs require d [275] ./example.js 10:9-21
       cjs require d [275] ./example.js 19:9-21
 [215] ./node_modules/b.js 11 bytes {126} {368} [built]
       require.ensure item b [275] ./example.js 3:0-6:18
       require.ensure item b [275] ./example.js 8:0-11:18
       require.ensure item b [275] ./example.js 17:0-20:2
 [227] ./node_modules/c.js 11 bytes {368} [built]
       cjs require c [275] ./example.js 5:9-21
chunk {404} output.js (main) 432 bytes (javascript) 3.55 KiB (runtime) >{126}< >{368}< [entry] [rendered]
    > .\example.js main
  [54] ./node_modules/a.js 11 bytes {404} [built]
       cjs require a [275] ./example.js 1:8-20
 [275] ./example.js 421 bytes {404} [built]
       entry .\example.js main
     + 4 hidden chunk modules
```
