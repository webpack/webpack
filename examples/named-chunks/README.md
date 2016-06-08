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

/******/ 	// identity function for calling harmory imports with the correct context
/******/ 	__webpack_require__.i = function(value) { return value; };

/******/ 	// __webpack_public_path__
/******/ 	__webpack_require__.p = "js/";

/******/ 	// on error function for async loading
/******/ 	__webpack_require__.oe = function(err) { console.error(err); throw err; };

/******/ 	// Load entry module and return exports
/******/ 	return __webpack_require__(__webpack_require__.s = 3);
/******/ })
/************************************************************************/
/******/ ([
/* 0 */,
/* 1 */,
/* 2 */
/*!****************!*\
  !*** ./~/a.js ***!
  \****************/
/***/ function(module, exports) {

	// module a

/***/ },
/* 3 */
/*!********************!*\
  !*** ./example.js ***!
  \********************/
/***/ function(module, exports, __webpack_require__) {

	var a = __webpack_require__(/*! a */ 2);

	__webpack_require__.e/* nsure */(0/*! my own chunk */).catch(function(err) { __webpack_require__.oe(err); }).then((function(require) {
		// a named chunk
		var c = __webpack_require__(/*! c */ 4);
	}).bind(null, __webpack_require__));

	__webpack_require__.e/* nsure */(0/*! my own chunk */).catch(function(err) { __webpack_require__.oe(err); }).then((function(require) {
		// another chunk with the same name
		var d = __webpack_require__(/*! d */ 1);
	}).bind(null, __webpack_require__));

	__webpack_require__.e/* nsure */(0/*! my own chunk */).catch(function(err) { __webpack_require__.oe(err); }).then((function(require) {
		// the same again
	}).bind(null, __webpack_require__));

	__webpack_require__.e/* nsure */(1).catch(function(err) { __webpack_require__.oe(err); }).then((function(require) {
		// chunk without name
		var d = __webpack_require__(/*! d */ 1);
	}).bind(null, __webpack_require__));


/***/ }
/******/ ]);
```

# js/0.js

``` javascript
webpackJsonp([0,1],[
/* 0 */
/*!****************!*\
  !*** ./~/b.js ***!
  \****************/
/***/ function(module, exports) {

	// module b

/***/ },
/* 1 */
/*!****************!*\
  !*** ./~/d.js ***!
  \****************/
/***/ function(module, exports) {

	// module d

/***/ },
/* 2 */,
/* 3 */,
/* 4 */
/*!****************!*\
  !*** ./~/c.js ***!
  \****************/
/***/ function(module, exports) {

	// module c

/***/ }
]);
```

# js/1.js

``` javascript
webpackJsonp([1],[
/* 0 */
/*!****************!*\
  !*** ./~/b.js ***!
  \****************/
/***/ function(module, exports) {

	// module b

/***/ },
/* 1 */
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
Hash: d5bad271e38640b37f6a
Version: webpack 2.1.0-beta.11
Time: 80ms
    Asset       Size  Chunks             Chunk Names
     0.js  434 bytes    0, 1  [emitted]  my own chunk
     1.js  283 bytes       1  [emitted]  
output.js    5.63 kB       2  [emitted]  main
chunk    {0} 0.js (my own chunk) 33 bytes {2} [rendered]
    > my own chunk [3] ./example.js 3:0-6:18
    > my own chunk [3] ./example.js 8:0-11:18
    > my own chunk [3] ./example.js 13:0-15:18
    [0] ./~/b.js 11 bytes {0} {1} [built]
        require.ensure item b [3] ./example.js 3:0-6:18
        require.ensure item b [3] ./example.js 8:0-11:18
        require.ensure item b [3] ./example.js 17:0-20:2
    [1] ./~/d.js 11 bytes {0} {1} [built]
        cjs require d [3] ./example.js 10:9-21
        cjs require d [3] ./example.js 19:9-21
    [4] ./~/c.js 11 bytes {0} [built]
        cjs require c [3] ./example.js 5:9-21
chunk    {1} 1.js 22 bytes {2} [rendered]
    > [3] ./example.js 17:0-20:2
    [0] ./~/b.js 11 bytes {0} {1} [built]
        require.ensure item b [3] ./example.js 3:0-6:18
        require.ensure item b [3] ./example.js 8:0-11:18
        require.ensure item b [3] ./example.js 17:0-20:2
    [1] ./~/d.js 11 bytes {0} {1} [built]
        cjs require d [3] ./example.js 10:9-21
        cjs require d [3] ./example.js 19:9-21
chunk    {2} output.js (main) 452 bytes [rendered]
    > main [3] ./example.js 
    [2] ./~/a.js 11 bytes {2} [built]
        cjs require a [3] ./example.js 1:8-20
    [3] ./example.js 441 bytes {2} [built]
```

## Minimized (uglify-js, no zip)

```
Hash: d5bad271e38640b37f6a
Version: webpack 2.1.0-beta.11
Time: 207ms
    Asset      Size  Chunks             Chunk Names
     0.js  72 bytes    0, 1  [emitted]  my own chunk
     1.js  52 bytes       1  [emitted]  
output.js   1.36 kB       2  [emitted]  main
chunk    {0} 0.js (my own chunk) 33 bytes {2} [rendered]
    > my own chunk [3] ./example.js 3:0-6:18
    > my own chunk [3] ./example.js 8:0-11:18
    > my own chunk [3] ./example.js 13:0-15:18
    [0] ./~/b.js 11 bytes {0} {1} [built]
        require.ensure item b [3] ./example.js 3:0-6:18
        require.ensure item b [3] ./example.js 8:0-11:18
        require.ensure item b [3] ./example.js 17:0-20:2
    [1] ./~/d.js 11 bytes {0} {1} [built]
        cjs require d [3] ./example.js 10:9-21
        cjs require d [3] ./example.js 19:9-21
    [4] ./~/c.js 11 bytes {0} [built]
        cjs require c [3] ./example.js 5:9-21
chunk    {1} 1.js 22 bytes {2} [rendered]
    > [3] ./example.js 17:0-20:2
    [0] ./~/b.js 11 bytes {0} {1} [built]
        require.ensure item b [3] ./example.js 3:0-6:18
        require.ensure item b [3] ./example.js 8:0-11:18
        require.ensure item b [3] ./example.js 17:0-20:2
    [1] ./~/d.js 11 bytes {0} {1} [built]
        cjs require d [3] ./example.js 10:9-21
        cjs require d [3] ./example.js 19:9-21
chunk    {2} output.js (main) 452 bytes [rendered]
    > main [3] ./example.js 
    [2] ./~/a.js 11 bytes {2} [built]
        cjs require a [3] ./example.js 1:8-20
    [3] ./example.js 441 bytes {2} [built]
```
