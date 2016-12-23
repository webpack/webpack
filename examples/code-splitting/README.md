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
* `1.js` is an additional chunk (on demand loaded) and contains
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
/******/ 		1: 0
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
/******/ ([
/* 0 */
/* unknown exports provided */
/* all exports used */
/*!****************!*\
  !*** ./~/b.js ***!
  \****************/
/***/ function(module, exports) {

// module b

/***/ },
/* 1 */
/* unknown exports provided */
/* all exports used */
/*!****************!*\
  !*** ./~/a.js ***!
  \****************/
/***/ function(module, exports) {

// module a

/***/ },
/* 2 */,
/* 3 */,
/* 4 */
/* unknown exports provided */
/* all exports used */
/*!********************!*\
  !*** ./example.js ***!
  \********************/
/***/ function(module, exports, __webpack_require__) {

var a = __webpack_require__(/*! a */ 1);
var b = __webpack_require__(/*! b */ 0);
__webpack_require__.e/* require.ensure */(0).then((function(require) {
    __webpack_require__(/*! b */ 0).xyz();
    var d = __webpack_require__(/*! d */ 3);
}).bind(null, __webpack_require__)).catch(__webpack_require__.oe);

/***/ }
/******/ ]);
```

# js/0.output.js

``` javascript
webpackJsonp([0],[
/* 0 */,
/* 1 */,
/* 2 */
/* unknown exports provided */
/* all exports used */
/*!****************!*\
  !*** ./~/c.js ***!
  \****************/
/***/ function(module, exports) {

// module c

/***/ },
/* 3 */
/* unknown exports provided */
/* all exports used */
/*!****************!*\
  !*** ./~/d.js ***!
  \****************/
/***/ function(module, exports) {

// module d

/***/ }
]);
```

Minimized

``` javascript
webpackJsonp([0],[,,function(n,c){},function(n,c){}]);
```

# Info

## Uncompressed

```
Hash: 199e267fd7f9f732d06f
Version: webpack 2.2.0-rc.2
      Asset       Size  Chunks             Chunk Names
0.output.js  407 bytes       0  [emitted]  
  output.js    6.36 kB       1  [emitted]  main
Entrypoint main = output.js
chunk    {0} 0.output.js 22 bytes {1} [rendered]
    > [4] ./example.js 3:0-6:2
    [2] ./~/c.js 11 bytes {0} [built]
        require.ensure item c [4] ./example.js 3:0-6:2
    [3] ./~/d.js 11 bytes {0} [built]
        cjs require d [4] ./example.js 5:12-24
chunk    {1} output.js (main) 166 bytes [entry] [rendered]
    > main [4] ./example.js 
    [0] ./~/b.js 11 bytes {1} [built]
        cjs require b [4] ./example.js 2:8-20
        cjs require b [4] ./example.js 4:4-16
    [1] ./~/a.js 11 bytes {1} [built]
        cjs require a [4] ./example.js 1:8-20
    [4] ./example.js 144 bytes {1} [built]
```

## Minimized (uglify-js, no zip)

```
Hash: 199e267fd7f9f732d06f
Version: webpack 2.2.0-rc.2
      Asset      Size  Chunks             Chunk Names
0.output.js  54 bytes       0  [emitted]  
  output.js   1.47 kB       1  [emitted]  main
Entrypoint main = output.js
chunk    {0} 0.output.js 22 bytes {1} [rendered]
    > [4] ./example.js 3:0-6:2
    [2] ./~/c.js 11 bytes {0} [built]
        require.ensure item c [4] ./example.js 3:0-6:2
    [3] ./~/d.js 11 bytes {0} [built]
        cjs require d [4] ./example.js 5:12-24
chunk    {1} output.js (main) 166 bytes [entry] [rendered]
    > main [4] ./example.js 
    [0] ./~/b.js 11 bytes {1} [built]
        cjs require b [4] ./example.js 2:8-20
        cjs require b [4] ./example.js 4:4-16
    [1] ./~/a.js 11 bytes {1} [built]
        cjs require a [4] ./example.js 1:8-20
    [4] ./example.js 144 bytes {1} [built]
```
