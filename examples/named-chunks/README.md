# example.js

```javascript
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

```javascript
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
/******/ 	// the startup function
/******/ 	function startup() {
/******/ 		// Load entry module and return exports
/******/ 		return __webpack_require__(0);
/******/ 	};
/******/ 	// initialize runtime
/******/ 	runtime(__webpack_require__);
/******/
/******/ 	// run startup
/******/ 	return startup();
/******/ })
/************************************************************************/
```

</details>

```javascript
/******/ ([
/* 0 */
/*!********************!*\
  !*** ./example.js ***!
  \********************/
/*! other exports [maybe provided (runtime-defined)] [no usage info] */
/*! runtime requirements: __webpack_require____webpack_require__.e,  */
/***/ (function(__unusedmodule, __unusedexports, __webpack_require__) {

var a = __webpack_require__(/*! a */ 1);

__webpack_require__.e(/*! require.ensure | my own chunk */ 666).then((function(require) {
	// a named chunk
	var c = __webpack_require__(/*! c */ 3);
}).bind(null, __webpack_require__)).catch(__webpack_require__.oe);

__webpack_require__.e(/*! require.ensure | my own chunk */ 666).then((function(require) {
	// another chunk with the same name
	var d = __webpack_require__(/*! d */ 4);
}).bind(null, __webpack_require__)).catch(__webpack_require__.oe);

__webpack_require__.e(/*! require.ensure | my own chunk */ 666).then((function(require) {
	// the same again
}).bind(null, __webpack_require__)).catch(__webpack_require__.oe);

__webpack_require__.e(/*! require.ensure */ 885).then((function(require) {
	// chunk without name
	var d = __webpack_require__(/*! d */ 4);
}).bind(null, __webpack_require__)).catch(__webpack_require__.oe);


/***/ }),
/* 1 */
/*!***************************!*\
  !*** ./node_modules/a.js ***!
  \***************************/
/*! other exports [maybe provided (runtime-defined)] [no usage info] */
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
/******/ 		// This function allow to reference async chunks
/******/ 		__webpack_require__.u = function(chunkId) {
/******/ 			// return url for filenames based on template
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
/******/ 			179: 0
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


# dist/666.output.js

```javascript
(window["webpackJsonp"] = window["webpackJsonp"] || []).push([[666],[
/* 0 */,
/* 1 */,
/* 2 */
/*!***************************!*\
  !*** ./node_modules/b.js ***!
  \***************************/
/*! other exports [maybe provided (runtime-defined)] [no usage info] */
/*! runtime requirements:  */
/***/ (function() {

// module b

/***/ }),
/* 3 */
/*!***************************!*\
  !*** ./node_modules/c.js ***!
  \***************************/
/*! other exports [maybe provided (runtime-defined)] [no usage info] */
/*! runtime requirements:  */
/***/ (function() {

// module c

/***/ }),
/* 4 */
/*!***************************!*\
  !*** ./node_modules/d.js ***!
  \***************************/
/*! other exports [maybe provided (runtime-defined)] [no usage info] */
/*! runtime requirements:  */
/***/ (function() {

// module d

/***/ })
]]);
```

# dist/885.output.js

```javascript
(window["webpackJsonp"] = window["webpackJsonp"] || []).push([[885],[
/* 0 */,
/* 1 */,
/* 2 */
/*!***************************!*\
  !*** ./node_modules/b.js ***!
  \***************************/
/*! other exports [maybe provided (runtime-defined)] [no usage info] */
/*! runtime requirements:  */
/***/ (function() {

// module b

/***/ }),
/* 3 */,
/* 4 */
/*!***************************!*\
  !*** ./node_modules/d.js ***!
  \***************************/
/*! other exports [maybe provided (runtime-defined)] [no usage info] */
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
Version: webpack 5.0.0-alpha.11
        Asset       Size  Chunks             Chunk Names
666.output.js  847 bytes   {666}  [emitted]  my own chunk
885.output.js  604 bytes   {885}  [emitted]
    output.js   8.32 KiB   {179}  [emitted]  main
Entrypoint main = output.js
chunk {179} output.js (main) 432 bytes (javascript) 3.64 KiB (runtime) [entry] [rendered]
    > ./example.js main
 [0] ./example.js 421 bytes {179} [built]
     [used exports unknown]
     entry ./example.js main
 [1] ./node_modules/a.js 11 bytes {179} [built]
     [used exports unknown]
     cjs require a [0] ./example.js 1:8-20
     + 4 hidden chunk modules
chunk {666} 666.output.js (my own chunk) 33 bytes [rendered]
    > [0] ./example.js 13:0-15:18
    > [0] ./example.js 3:0-6:18
    > [0] ./example.js 8:0-11:18
 [2] ./node_modules/b.js 11 bytes {666} {885} [built]
     [used exports unknown]
     require.ensure item b [0] ./example.js 3:0-6:18
     require.ensure item b [0] ./example.js 8:0-11:18
     require.ensure item b [0] ./example.js 17:0-20:2
 [3] ./node_modules/c.js 11 bytes {666} [built]
     [used exports unknown]
     cjs require c [0] ./example.js 5:9-21
 [4] ./node_modules/d.js 11 bytes {666} {885} [built]
     [used exports unknown]
     cjs require d [0] ./example.js 10:9-21
     cjs require d [0] ./example.js 19:9-21
chunk {885} 885.output.js 22 bytes [rendered]
    > [0] ./example.js 17:0-20:2
 [2] ./node_modules/b.js 11 bytes {666} {885} [built]
     [used exports unknown]
     require.ensure item b [0] ./example.js 3:0-6:18
     require.ensure item b [0] ./example.js 8:0-11:18
     require.ensure item b [0] ./example.js 17:0-20:2
 [4] ./node_modules/d.js 11 bytes {666} {885} [built]
     [used exports unknown]
     cjs require d [0] ./example.js 10:9-21
     cjs require d [0] ./example.js 19:9-21
```

## Production mode

```
Hash: 0a1b2c3d4e5f6a7b8c9d
Version: webpack 5.0.0-alpha.11
        Asset       Size        Chunks             Chunk Names
666.output.js  117 bytes  {666}, {885}  [emitted]  my own chunk
885.output.js   96 bytes         {885}  [emitted]
    output.js   1.59 KiB         {179}  [emitted]  main
Entrypoint main = output.js
chunk {179} output.js (main) 432 bytes (javascript) 3.64 KiB (runtime) [entry] [rendered]
    > ./example.js main
 [144] ./example.js 421 bytes {179} [built]
       entry ./example.js main
 [213] ./node_modules/a.js 11 bytes {179} [built]
       cjs require a [144] ./example.js 1:8-20
     + 4 hidden chunk modules
chunk {666} 666.output.js (my own chunk) 33 bytes [rendered]
    > [144] ./example.js 13:0-15:18
    > [144] ./example.js 3:0-6:18
    > [144] ./example.js 8:0-11:18
 [286] ./node_modules/c.js 11 bytes {666} [built]
       cjs require c [144] ./example.js 5:9-21
 [644] ./node_modules/b.js 11 bytes {666} {885} [built]
       require.ensure item b [144] ./example.js 3:0-6:18
       require.ensure item b [144] ./example.js 8:0-11:18
       require.ensure item b [144] ./example.js 17:0-20:2
 [882] ./node_modules/d.js 11 bytes {666} {885} [built]
       cjs require d [144] ./example.js 10:9-21
       cjs require d [144] ./example.js 19:9-21
chunk {885} 885.output.js 22 bytes [rendered]
    > [144] ./example.js 17:0-20:2
 [644] ./node_modules/b.js 11 bytes {666} {885} [built]
       require.ensure item b [144] ./example.js 3:0-6:18
       require.ensure item b [144] ./example.js 8:0-11:18
       require.ensure item b [144] ./example.js 17:0-20:2
 [882] ./node_modules/d.js 11 bytes {666} {885} [built]
       cjs require d [144] ./example.js 10:9-21
       cjs require d [144] ./example.js 19:9-21
```
