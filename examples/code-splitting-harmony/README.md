This example show how to use Code Splitting with the ES6 module syntax.

The standard `import` is sync.

`import(module: string) -> Promise` can be used to load modules on demand. This acts as split point for webpack and creates a chunk.

Providing dynamic expressions to `import` is possible. The same limits as with dynamic expressions in `require` calls apply here. Each possible module creates an additional chunk. In this example `import("c/" + name)` creates two additional chunks (one for each file in `node_modules/c/`). This is called "async context".

# example.js

``` javascript
import a from "a";

import("b").then(function(b) {
	console.log("b loaded", b);
})

function loadC(name) {
	return import("c/" + name);
}

Promise.all([loadC("1"), loadC("2")]).then(function(arr) {
	console.log("c/1 and c/2 loaded", arr);
});
```


# js/output.js

<details><summary><code>/******/ (function(modules) { /* webpackBootstrap */ })</code></summary>

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
/******/
/******/ 	};
/******/
/******/ 	// The module cache
/******/ 	var installedModules = {};
/******/
/******/ 	// objects to store loaded and loading chunks
/******/ 	var installedChunks = {
/******/ 		3: 0
/******/ 	};
/******/
/******/ 	// The require function
/******/ 	function __webpack_require__(moduleId) {
/******/
/******/ 		// Check if module is in cache
/******/ 		if(installedModules[moduleId])
/******/ 			return installedModules[moduleId].exports;
/******/
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
/******/ 	// This file contains only the entry chunk.
/******/ 	// The chunk loading function for additional chunks
/******/ 	__webpack_require__.e = function requireEnsure(chunkId) {
/******/ 		if(installedChunks[chunkId] === 0)
/******/ 			return Promise.resolve();
/******/
/******/ 		// a Promise means "currently loading".
/******/ 		if(installedChunks[chunkId]) {
/******/ 			return installedChunks[chunkId][2];
/******/ 		}
/******/
/******/ 		// setup Promise in chunk cache
/******/ 		var promise = new Promise(function(resolve, reject) {
/******/ 			installedChunks[chunkId] = [resolve, reject];
/******/ 		});
/******/ 		installedChunks[chunkId][2] = promise;
/******/
/******/ 		// start chunk loading
/******/ 		var head = document.getElementsByTagName('head')[0];
/******/ 		var script = document.createElement('script');
/******/ 		script.type = 'text/javascript';
/******/ 		script.charset = 'utf-8';
/******/ 		script.async = true;
/******/ 		script.timeout = 120000;
/******/
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
/******/ 		head.appendChild(script);
/******/
/******/ 		return promise;
/******/ 	};
/******/
/******/ 	// expose the modules object (__webpack_modules__)
/******/ 	__webpack_require__.m = modules;
/******/
/******/ 	// expose the module cache
/******/ 	__webpack_require__.c = installedModules;
/******/
/******/ 	// identity function for calling harmony imports with the correct context
/******/ 	__webpack_require__.i = function(value) { return value; };
/******/
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
/******/
/******/ 	// getDefaultExport function for compatibility with non-harmony modules
/******/ 	__webpack_require__.n = function(module) {
/******/ 		var getter = module && module.__esModule ?
/******/ 			function getDefault() { return module['default']; } :
/******/ 			function getModuleExports() { return module; };
/******/ 		__webpack_require__.d(getter, 'a', getter);
/******/ 		return getter;
/******/ 	};
/******/
/******/ 	// Object.prototype.hasOwnProperty.call
/******/ 	__webpack_require__.o = function(object, property) { return Object.prototype.hasOwnProperty.call(object, property); };
/******/
/******/ 	// __webpack_public_path__
/******/ 	__webpack_require__.p = "js/";
/******/
/******/ 	// on error function for async loading
/******/ 	__webpack_require__.oe = function(err) { console.error(err); throw err; };
/******/
/******/ 	// Load entry module and return exports
/******/ 	return __webpack_require__(__webpack_require__.s = 4);
/******/ })
/************************************************************************/
```

</details>

``` javascript
/******/ ([
/* 0 */
/* unknown exports provided */
/*!****************!*\
  !*** ./~/a.js ***!
  \****************/
/***/ (function(module, exports) {

// module a

/***/ }),
/* 1 */
/* unknown exports provided */
/* all exports used */
/*!****************************!*\
  !*** ./~/c async ^\.\/.*$ ***!
  \****************************/
/***/ (function(module, exports, __webpack_require__) {

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
	var ids = map[req];
	if(!ids)
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

/***/ }),
/* 2 */,
/* 3 */,
/* 4 */
/* unknown exports provided */
/* all exports used */
/*!********************!*\
  !*** ./example.js ***!
  \********************/
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
Object.defineProperty(__webpack_exports__, "__esModule", { value: true });
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_0_a__ = __webpack_require__(/*! a */ 0);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_0_a___default = __webpack_require__.n(__WEBPACK_IMPORTED_MODULE_0_a__);


__webpack_require__.e/* import() */(2).then(__webpack_require__.bind(null, /*! b */ 5)).then(function(b) {
	console.log("b loaded", b);
})

function loadC(name) {
	return __webpack_require__(/*! c */ 1)("./" + name);
}

Promise.all([loadC("1"), loadC("2")]).then(function(arr) {
	console.log("c/1 and c/2 loaded", arr);
});


/***/ })
/******/ ]);
```


# Info

## Uncompressed

```
Hash: d615402477252ba51b19
Version: webpack 2.3.2
      Asset       Size  Chunks             Chunk Names
0.output.js  218 bytes       0  [emitted]  
1.output.js  218 bytes       1  [emitted]  
2.output.js  210 bytes       2  [emitted]  
  output.js    7.48 kB       3  [emitted]  main
Entrypoint main = output.js
chunk    {0} 0.output.js 13 bytes {3} [rendered]
    [3] ./~/c/2.js 13 bytes {0} [optional] [built]
        context element ./2 [1] ./~/c async ^\.\/.*$ ./2
        context element ./2.js [1] ./~/c async ^\.\/.*$ ./2.js
chunk    {1} 1.output.js 13 bytes {3} [rendered]
    [2] ./~/c/1.js 13 bytes {1} [optional] [built]
        context element ./1 [1] ./~/c async ^\.\/.*$ ./1
        context element ./1.js [1] ./~/c async ^\.\/.*$ ./1.js
chunk    {2} 2.output.js 11 bytes {3} [rendered]
    > [4] ./example.js 3:0-11
    [5] ./~/b.js 11 bytes {2} [built]
        import() b [4] ./example.js 3:0-11
chunk    {3} output.js (main) 427 bytes [entry] [rendered]
    > main [4] ./example.js 
    [0] ./~/a.js 11 bytes {3} [built]
        [no exports used]
        harmony import a [4] ./example.js 1:0-18
    [1] ./~/c async ^\.\/.*$ 160 bytes {3} [built]
        import() context c [4] ./example.js 8:8-27
    [4] ./example.js 256 bytes {3} [built]
```

## Minimized (uglify-js, no zip)

```
Hash: d615402477252ba51b19
Version: webpack 2.3.2
      Asset      Size  Chunks             Chunk Names
0.output.js  38 bytes       0  [emitted]  
1.output.js  38 bytes       1  [emitted]  
2.output.js  38 bytes       2  [emitted]  
  output.js   1.92 kB       3  [emitted]  main
Entrypoint main = output.js
chunk    {0} 0.output.js 13 bytes {3} [rendered]
    [3] ./~/c/2.js 13 bytes {0} [optional] [built]
        context element ./2 [1] ./~/c async ^\.\/.*$ ./2
        context element ./2.js [1] ./~/c async ^\.\/.*$ ./2.js
chunk    {1} 1.output.js 13 bytes {3} [rendered]
    [2] ./~/c/1.js 13 bytes {1} [optional] [built]
        context element ./1 [1] ./~/c async ^\.\/.*$ ./1
        context element ./1.js [1] ./~/c async ^\.\/.*$ ./1.js
chunk    {2} 2.output.js 11 bytes {3} [rendered]
    > [4] ./example.js 3:0-11
    [5] ./~/b.js 11 bytes {2} [built]
        import() b [4] ./example.js 3:0-11
chunk    {3} output.js (main) 427 bytes [entry] [rendered]
    > main [4] ./example.js 
    [0] ./~/a.js 11 bytes {3} [built]
        [no exports used]
        harmony import a [4] ./example.js 1:0-18
    [1] ./~/c async ^\.\/.*$ 160 bytes {3} [built]
        import() context c [4] ./example.js 8:8-27
    [4] ./example.js 256 bytes {3} [built]
```
