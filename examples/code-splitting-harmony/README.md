This example show how to use Code Splitting with the ES6 module syntax.

The standard `import` is sync.

`System.import(module: string) -> Promise` can be used to load modules on demand. This acts as split point for webpack and creates a chunk.

Providing dynamic expressions to `System.import` is possible. The same limits as with dynamic expressions in `require` calls apply here. Each possible module creates an additional chunk. In this example `System.import("c/" + name)` creates two additional chunks (one for each file in `node_modules/c/`). This is called "async context".

# example.js

``` javascript
import a from "a";

System.import("b").then(function(b) {
	console.log("b loaded", b);
})

function loadC(name) {
	return System.import("c/" + name)
}

Promise.all([loadC("1"), loadC("2")]).then(function(arr) {
	console.log("c/1 and c/2 loaded", arr);
});
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
/******/ 	return __webpack_require__(__webpack_require__.s = 4);
/******/ })
/************************************************************************/
/******/ ([
/* 0 */
/*!****************!*\
  !*** ./~/a.js ***!
  \****************/
/***/ function(module, exports) {

	// module a

/***/ },
/* 1 */
/*!****************************!*\
  !*** ./~/c async ^\.\/.*$ ***!
  \****************************/
/***/ function(module, exports, __webpack_require__) {

	var map = {
		"./1": [
			2,
			1
		],
		"./1.js": [
			2,
			1
		],
		"./2": [
			3,
			0
		],
		"./2.js": [
			3,
			0
		]
	};
	function webpackAsyncContext(req) {
		var ids = map[req];	if(!ids)
			return Promise.reject(new Error("Cannot find module '" + req + "'."));
		return __webpack_require__.e(ids[1]).then(function() {
			return __webpack_require__(ids[0]);
		});
	};
	webpackAsyncContext.keys = function webpackAsyncContextKeys() {
		return Object.keys(map);
	};
	module.exports = webpackAsyncContext;
	webpackAsyncContext.id = 1;


/***/ },
/* 2 */,
/* 3 */,
/* 4 */
/*!********************!*\
  !*** ./example.js ***!
  \********************/
/***/ function(module, exports, __webpack_require__) {

	/* harmony import */ var __WEBPACK_IMPORTED_MODULE_0_a__ = __webpack_require__(/*! a */ 0);
	/* harmony import */ var __WEBPACK_IMPORTED_MODULE_0_a___default = __WEBPACK_IMPORTED_MODULE_0_a__ && __WEBPACK_IMPORTED_MODULE_0_a__.__esModule ? function() { return __WEBPACK_IMPORTED_MODULE_0_a__['default'] } : function() { return __WEBPACK_IMPORTED_MODULE_0_a__; }
	/* harmony import */ Object.defineProperty(__WEBPACK_IMPORTED_MODULE_0_a___default, 'a', { get: __WEBPACK_IMPORTED_MODULE_0_a___default });


	__webpack_require__.e/* System.import */(3).then(__webpack_require__.bind(null, /*! b */ 5)).then(function(b) {
		console.log("b loaded", b);
	})

	function loadC(name) {
		return __webpack_require__(/*! c */ 1)("./" + name)
	}

	Promise.all([loadC("1"), loadC("2")]).then(function(arr) {
		console.log("c/1 and c/2 loaded", arr);
	});


/***/ }
/******/ ]);
```


# Info

## Uncompressed

```
Hash: cefcab66a83c5000d38e
Version: webpack 2.0.6-beta
Time: 141ms
    Asset       Size  Chunks             Chunk Names
     0.js  163 bytes       0  [emitted]  
     1.js  163 bytes       1  [emitted]  
output.js    5.95 kB       2  [emitted]  main
     3.js  155 bytes       3  [emitted]  
chunk    {0} 0.js 13 bytes {2} [rendered]
    [3] ./~/c/2.js 13 bytes {0} [optional] [built]
        context element ./2 [1] ./~/c async ^\.\/.*$
        context element ./2.js [1] ./~/c async ^\.\/.*$
chunk    {1} 1.js 13 bytes {2} [rendered]
    [2] ./~/c/1.js 13 bytes {1} [optional] [built]
        context element ./1 [1] ./~/c async ^\.\/.*$
        context element ./1.js [1] ./~/c async ^\.\/.*$
chunk    {2} output.js (main) 440 bytes [rendered]
    > main [4] ./example.js 
    [0] ./~/a.js 11 bytes {2} [built]
        harmony import a [4] ./example.js 1:0-18
    [1] ./~/c async ^\.\/.*$ 160 bytes {2} [built]
        System.import context c [4] ./example.js 8:8-34
    [4] ./example.js 269 bytes {2} [built]
chunk    {3} 3.js 11 bytes {2} [rendered]
    > [4] ./example.js 3:0-18
    [5] ./~/b.js 11 bytes {3} [built]
        System.import b [4] ./example.js 3:0-18
```

## Minimized (uglify-js, no zip)

```
Hash: cefcab66a83c5000d38e
Version: webpack 2.0.6-beta
Time: 326ms
    Asset      Size  Chunks             Chunk Names
     0.js  38 bytes       0  [emitted]  
     1.js  38 bytes       1  [emitted]  
output.js   1.56 kB       2  [emitted]  main
     3.js  38 bytes       3  [emitted]  
chunk    {0} 0.js 13 bytes {2} [rendered]
    [3] ./~/c/2.js 13 bytes {0} [optional] [built]
        context element ./2 [1] ./~/c async ^\.\/.*$
        context element ./2.js [1] ./~/c async ^\.\/.*$
chunk    {1} 1.js 13 bytes {2} [rendered]
    [2] ./~/c/1.js 13 bytes {1} [optional] [built]
        context element ./1 [1] ./~/c async ^\.\/.*$
        context element ./1.js [1] ./~/c async ^\.\/.*$
chunk    {2} output.js (main) 440 bytes [rendered]
    > main [4] ./example.js 
    [0] ./~/a.js 11 bytes {2} [built]
        harmony import a [4] ./example.js 1:0-18
    [1] ./~/c async ^\.\/.*$ 160 bytes {2} [built]
        System.import context c [4] ./example.js 8:8-34
    [4] ./example.js 269 bytes {2} [built]
chunk    {3} 3.js 11 bytes {2} [rendered]
    > [4] ./example.js 3:0-18
    [5] ./~/b.js 11 bytes {3} [built]
        System.import b [4] ./example.js 3:0-18
```
