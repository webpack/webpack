This example shows how to create an explicit vendor chunk as well as a common chunk for code shared among entry points. In this example, we have 3 entry points: `pageA`, `pageB`, and `pageC`. Those entry points share some of the same utility modules, but not others. This configuration will pull out any modules common to at least 2 bundles and place it it the `common` bundle instead, all while keeping the specified vendor libraries in their own bundle by themselves.

To better understand, here are the entry points and which utility modules they depend on:

- `pageA`
 - `utility1`
 - `utility2`
- `pageB`
 - `utility2`
 - `utility3`
- `pageC`
 - `utility2`
 - `utility3`

Given this configuration, webpack will produce the following bundles:

- `vendor`
 - webpack runtime
 - `vendor1`
 - `vendor2`
- `common`
 - `utility2`
 - `utility3`
- `pageA`
 - `pageA`
 - `utility1`
- `pageB`
 - `pageB`
- `pageC`
 - `pageC`

With this bundle configuration, you would load your third party libraries, then your common application code, then your page-specific application code.

# webpack.config.js

``` javascript
var path = require("path");
var CommonsChunkPlugin = require("../../lib/optimize/CommonsChunkPlugin");

module.exports = {
	entry: {
		vendor: ["./vendor1", "./vendor2"],
		pageA: "./pageA",
		pageB: "./pageB",
		pageC: "./pageC"
		// older versions of webpack may require an empty entry point declaration here
		// common: []
	},
	output: {
		path: path.join(__dirname, "js"),
		filename: "[name].js"
	},
	plugins: [
		new CommonsChunkPlugin({
			// The order of this array matters
			names: ["common", "vendor"],
			minChunks: 2
		})
	]
};
```

# js/vendor.js

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
/******/ 		if(executeModule + 1) { // typeof executeModule === "number"
/******/ 			return __webpack_require__(executeModule);
/******/ 		}
/******/ 	};

/******/ 	// The module cache
/******/ 	var installedModules = {};

/******/ 	// objects to store loaded and loading chunks
/******/ 	var installedChunks = {
/******/ 		0: 0
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
/******/ 	return __webpack_require__(__webpack_require__.s = 8);
/******/ })
/************************************************************************/
/******/ ({

/***/ 3:
/*!********************!*\
  !*** ./vendor1.js ***!
  \********************/
/***/ function(module, exports) {

	module.exports = "vendor1";

/***/ },

/***/ 4:
/*!********************!*\
  !*** ./vendor2.js ***!
  \********************/
/***/ function(module, exports) {

	module.exports = "vendor2";

/***/ },

/***/ 8:
/*!********************!*\
  !*** multi vendor ***!
  \********************/
/***/ function(module, exports, __webpack_require__) {

	__webpack_require__(/*! ./vendor1 */3);
	module.exports = __webpack_require__(/*! ./vendor2 */4);


/***/ }

/******/ });
```

# js/common.js

``` javascript
webpackJsonp([1],[
/* 0 */
/*!*********************!*\
  !*** ./utility2.js ***!
  \*********************/
/***/ function(module, exports) {

	module.exports = "utility2";

/***/ },
/* 1 */
/*!*********************!*\
  !*** ./utility3.js ***!
  \*********************/
/***/ function(module, exports) {

	module.exports = "utility3";

/***/ }
]);
```

# js/pageA.js

``` javascript
webpackJsonp([2],{

/***/ 2:
/*!*********************!*\
  !*** ./utility1.js ***!
  \*********************/
/***/ function(module, exports) {

	module.exports = "utility1";

/***/ },

/***/ 5:
/*!******************!*\
  !*** ./pageA.js ***!
  \******************/
/***/ function(module, exports, __webpack_require__) {

	var utility1 = __webpack_require__(/*! ./utility1 */ 2);
	var utility2 = __webpack_require__(/*! ./utility2 */ 0);

	module.exports = "pageA";

/***/ }

},[5]);
```

# js/pageB.js

``` javascript
webpackJsonp([4],{

/***/ 6:
/*!******************!*\
  !*** ./pageB.js ***!
  \******************/
/***/ function(module, exports, __webpack_require__) {

	var utility2 = __webpack_require__(/*! ./utility2 */ 0);
	var utility3 = __webpack_require__(/*! ./utility3 */ 1);

	module.exports = "pageB";

/***/ }

},[6]);
```

# js/pageC.js

``` javascript
webpackJsonp([3],{

/***/ 7:
/*!******************!*\
  !*** ./pageC.js ***!
  \******************/
/***/ function(module, exports, __webpack_require__) {

	var utility2 = __webpack_require__(/*! ./utility2 */ 0);
	var utility3 = __webpack_require__(/*! ./utility3 */ 1);

	module.exports = "pageC";

/***/ }

},[7]);
```

# Info

## Uncompressed

```
Hash: ecc1460eefa0316fd425
Version: webpack 2.0.6-beta
Time: 108ms
    Asset       Size  Chunks             Chunk Names
vendor.js    4.79 kB       0  [emitted]  vendor
common.js  347 bytes       1  [emitted]  common
 pageA.js  485 bytes       2  [emitted]  pageA
 pageC.js  320 bytes       3  [emitted]  pageC
 pageB.js  320 bytes       4  [emitted]  pageB
chunk    {0} vendor.js (vendor) 94 bytes [rendered]
    > vendor [8] multi vendor 
    [3] ./vendor1.js 27 bytes {0} [built]
        single entry ./vendor1 [8] multi vendor
    [4] ./vendor2.js 27 bytes {0} [built]
        single entry ./vendor2 [8] multi vendor
    [8] multi vendor 40 bytes {0} [built]
chunk    {1} common.js (common) 56 bytes {0} [rendered]
    [0] ./utility2.js 28 bytes {1} [built]
        cjs require ./utility2 [5] ./pageA.js 2:15-36
        cjs require ./utility2 [6] ./pageB.js 1:15-36
        cjs require ./utility2 [7] ./pageC.js 1:15-36
    [1] ./utility3.js 28 bytes {1} [built]
        cjs require ./utility3 [6] ./pageB.js 2:15-36
        cjs require ./utility3 [7] ./pageC.js 2:15-36
chunk    {2} pageA.js (pageA) 133 bytes {1} [rendered]
    > pageA [5] ./pageA.js 
    [2] ./utility1.js 28 bytes {2} [built]
        cjs require ./utility1 [5] ./pageA.js 1:15-36
    [5] ./pageA.js 105 bytes {2} [built]
chunk    {3} pageC.js (pageC) 105 bytes {1} [rendered]
    > pageC [7] ./pageC.js 
    [7] ./pageC.js 105 bytes {3} [built]
chunk    {4} pageB.js (pageB) 105 bytes {1} [rendered]
    > pageB [6] ./pageB.js 
    [6] ./pageB.js 105 bytes {4} [built]
```

## Minimized (uglify-js, no zip)

```
Hash: ecc1460eefa0316fd425
Version: webpack 2.0.6-beta
Time: 248ms
    Asset       Size  Chunks             Chunk Names
vendor.js    1.08 kB       0  [emitted]  vendor
common.js   92 bytes       1  [emitted]  common
 pageA.js  109 bytes       2  [emitted]  pageA
 pageC.js   71 bytes       3  [emitted]  pageC
 pageB.js   71 bytes       4  [emitted]  pageB
chunk    {0} vendor.js (vendor) 94 bytes [rendered]
    > vendor [8] multi vendor 
    [3] ./vendor1.js 27 bytes {0} [built]
        single entry ./vendor1 [8] multi vendor
    [4] ./vendor2.js 27 bytes {0} [built]
        single entry ./vendor2 [8] multi vendor
    [8] multi vendor 40 bytes {0} [built]
chunk    {1} common.js (common) 56 bytes {0} [rendered]
    [0] ./utility2.js 28 bytes {1} [built]
        cjs require ./utility2 [5] ./pageA.js 2:15-36
        cjs require ./utility2 [6] ./pageB.js 1:15-36
        cjs require ./utility2 [7] ./pageC.js 1:15-36
    [1] ./utility3.js 28 bytes {1} [built]
        cjs require ./utility3 [6] ./pageB.js 2:15-36
        cjs require ./utility3 [7] ./pageC.js 2:15-36
chunk    {2} pageA.js (pageA) 133 bytes {1} [rendered]
    > pageA [5] ./pageA.js 
    [2] ./utility1.js 28 bytes {2} [built]
        cjs require ./utility1 [5] ./pageA.js 1:15-36
    [5] ./pageA.js 105 bytes {2} [built]
chunk    {3} pageC.js (pageC) 105 bytes {1} [rendered]
    > pageC [7] ./pageC.js 
    [7] ./pageC.js 105 bytes {3} [built]
chunk    {4} pageB.js (pageB) 105 bytes {1} [rendered]
    > pageB [6] ./pageB.js 
    [6] ./pageB.js 105 bytes {4} [built]

WARNING in pageA.js from UglifyJs
Side effects in initialization of unused variable utility1 [./pageA.js:1,0]
Side effects in initialization of unused variable utility2 [./pageA.js:2,0]

WARNING in pageC.js from UglifyJs
Side effects in initialization of unused variable utility2 [./pageC.js:1,0]
Side effects in initialization of unused variable utility3 [./pageC.js:2,0]

WARNING in pageB.js from UglifyJs
Side effects in initialization of unused variable utility2 [./pageB.js:1,0]
Side effects in initialization of unused variable utility3 [./pageB.js:2,0]
```
