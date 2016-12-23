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
/******/ 		2: 0
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
/* 0 */,
/* 1 */,
/* 2 */
/* unknown exports provided */
/* all exports used */
/*!****************!*\
  !*** ./~/a.js ***!
  \****************/
/***/ function(module, exports) {

// module a

/***/ },
/* 3 */,
/* 4 */
/* unknown exports provided */
/* all exports used */
/*!********************!*\
  !*** ./example.js ***!
  \********************/
/***/ function(module, exports, __webpack_require__) {

var a = __webpack_require__(/*! a */ 2);

__webpack_require__.e/* require.ensure */(0/*! my own chunk */).then((function(require) {
	// a named chunk
	var c = __webpack_require__(/*! c */ 3);
}).bind(null, __webpack_require__)).catch(__webpack_require__.oe);

__webpack_require__.e/* require.ensure */(0/*! my own chunk */).then((function(require) {
	// another chunk with the same name
	var d = __webpack_require__(/*! d */ 1);
}).bind(null, __webpack_require__)).catch(__webpack_require__.oe);

__webpack_require__.e/* require.ensure */(0/*! my own chunk */).then((function(require) {
	// the same again
}).bind(null, __webpack_require__)).catch(__webpack_require__.oe);

__webpack_require__.e/* require.ensure */(1).then((function(require) {
	// chunk without name
	var d = __webpack_require__(/*! d */ 1);
}).bind(null, __webpack_require__)).catch(__webpack_require__.oe);


/***/ }
/******/ ]);
```

# js/0.output.js

``` javascript
webpackJsonp([0,1],[
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
  !*** ./~/d.js ***!
  \****************/
/***/ function(module, exports) {

// module d

/***/ },
/* 2 */,
/* 3 */
/* unknown exports provided */
/* all exports used */
/*!****************!*\
  !*** ./~/c.js ***!
  \****************/
/***/ function(module, exports) {

// module c

/***/ }
]);
```

# js/1.output.js

``` javascript
webpackJsonp([1],[
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
  !*** ./~/d.js ***!
  \****************/
/***/ function(module, exports) {

// module d

/***/ }
]);
```

# Info

## Uncompressed

```
Hash: 506a07f004399c29a7c8
Version: webpack 2.2.0-rc.2
      Asset       Size  Chunks             Chunk Names
0.output.js  584 bytes    0, 1  [emitted]  my own chunk
1.output.js  389 bytes       1  [emitted]  
  output.js    6.77 kB       2  [emitted]  main
Entrypoint main = output.js
chunk    {0} 0.output.js (my own chunk) 33 bytes {2} [rendered]
    > my own chunk [4] ./example.js 3:0-6:18
    > my own chunk [4] ./example.js 8:0-11:18
    > my own chunk [4] ./example.js 13:0-15:18
    [0] ./~/b.js 11 bytes {0} {1} [built]
        require.ensure item b [4] ./example.js 3:0-6:18
        require.ensure item b [4] ./example.js 8:0-11:18
        require.ensure item b [4] ./example.js 17:0-20:2
    [1] ./~/d.js 11 bytes {0} {1} [built]
        cjs require d [4] ./example.js 10:9-21
        cjs require d [4] ./example.js 19:9-21
    [3] ./~/c.js 11 bytes {0} [built]
        cjs require c [4] ./example.js 5:9-21
chunk    {1} 1.output.js 22 bytes {2} [rendered]
    > [4] ./example.js 17:0-20:2
    [0] ./~/b.js 11 bytes {0} {1} [built]
        require.ensure item b [4] ./example.js 3:0-6:18
        require.ensure item b [4] ./example.js 8:0-11:18
        require.ensure item b [4] ./example.js 17:0-20:2
    [1] ./~/d.js 11 bytes {0} {1} [built]
        cjs require d [4] ./example.js 10:9-21
        cjs require d [4] ./example.js 19:9-21
chunk    {2} output.js (main) 452 bytes [entry] [rendered]
    > main [4] ./example.js 
    [2] ./~/a.js 11 bytes {2} [built]
        cjs require a [4] ./example.js 1:8-20
    [4] ./example.js 441 bytes {2} [built]
```

## Minimized (uglify-js, no zip)

```
Hash: 506a07f004399c29a7c8
Version: webpack 2.2.0-rc.2
      Asset      Size  Chunks             Chunk Names
0.output.js  71 bytes    0, 1  [emitted]  my own chunk
1.output.js  52 bytes       1  [emitted]  
  output.js    1.6 kB       2  [emitted]  main
Entrypoint main = output.js
chunk    {0} 0.output.js (my own chunk) 33 bytes {2} [rendered]
    > my own chunk [4] ./example.js 3:0-6:18
    > my own chunk [4] ./example.js 8:0-11:18
    > my own chunk [4] ./example.js 13:0-15:18
    [0] ./~/b.js 11 bytes {0} {1} [built]
        require.ensure item b [4] ./example.js 3:0-6:18
        require.ensure item b [4] ./example.js 8:0-11:18
        require.ensure item b [4] ./example.js 17:0-20:2
    [1] ./~/d.js 11 bytes {0} {1} [built]
        cjs require d [4] ./example.js 10:9-21
        cjs require d [4] ./example.js 19:9-21
    [3] ./~/c.js 11 bytes {0} [built]
        cjs require c [4] ./example.js 5:9-21
chunk    {1} 1.output.js 22 bytes {2} [rendered]
    > [4] ./example.js 17:0-20:2
    [0] ./~/b.js 11 bytes {0} {1} [built]
        require.ensure item b [4] ./example.js 3:0-6:18
        require.ensure item b [4] ./example.js 8:0-11:18
        require.ensure item b [4] ./example.js 17:0-20:2
    [1] ./~/d.js 11 bytes {0} {1} [built]
        cjs require d [4] ./example.js 10:9-21
        cjs require d [4] ./example.js 19:9-21
chunk    {2} output.js (main) 452 bytes [entry] [rendered]
    > main [4] ./example.js 
    [2] ./~/a.js 11 bytes {2} [built]
        cjs require a [4] ./example.js 1:8-20
    [4] ./example.js 441 bytes {2} [built]
```
