# webpack.config.js

``` javascript
var path = require("path");
var CommonsChunkPlugin = require("../../lib/optimize/CommonsChunkPlugin");
module.exports = {
	entry: {
		vendor: ["./vendor"],
		pageA: "./pageA",
		pageB: "./pageB",
		pageC: "./pageC"
	},
	output: {
		path: path.join(__dirname, "js"),
		filename: "[name].js"
	},
	plugins: [
		new CommonsChunkPlugin({
			name: "vendor",
			minChunks: Infinity
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
/******/ 	return __webpack_require__(__webpack_require__.s = 4);
/******/ })
/************************************************************************/
/******/ ([
/* 0 */
/*!*******************!*\
  !*** ./vendor.js ***!
  \*******************/
/***/ function(module, exports) {

	module.exports = "Vendor";

/***/ },
/* 1 */,
/* 2 */,
/* 3 */,
/* 4 */
/*!********************!*\
  !*** multi vendor ***!
  \********************/
/***/ function(module, exports, __webpack_require__) {

	module.exports = __webpack_require__(/*! ./vendor */0);


/***/ }
/******/ ]);
```

# js/pageA.js

``` javascript
webpackJsonp([3],[
/* 0 */,
/* 1 */
/*!******************!*\
  !*** ./pageA.js ***!
  \******************/
/***/ function(module, exports) {

	module.exports = "pageA";

/***/ }
],[1]);
```

# Info

## Uncompressed

```
Hash: 7cd0b14caedac75ad66d
Version: webpack 2.0.6-beta
Time: 84ms
    Asset       Size  Chunks             Chunk Names
vendor.js     4.6 kB       0  [emitted]  vendor
 pageC.js  179 bytes       1  [emitted]  pageC
 pageB.js  179 bytes       2  [emitted]  pageB
 pageA.js  185 bytes       3  [emitted]  pageA
chunk    {0} vendor.js (vendor) 54 bytes [rendered]
    > vendor [4] multi vendor 
    [0] ./vendor.js 26 bytes {0} [built]
        single entry ./vendor [4] multi vendor
    [4] multi vendor 28 bytes {0} [built]
chunk    {1} pageC.js (pageC) 25 bytes {0} [rendered]
    > pageC [3] ./pageC.js 
    [3] ./pageC.js 25 bytes {1} [built]
chunk    {2} pageB.js (pageB) 25 bytes {0} [rendered]
    > pageB [2] ./pageB.js 
    [2] ./pageB.js 25 bytes {2} [built]
chunk    {3} pageA.js (pageA) 25 bytes {0} [rendered]
    > pageA [1] ./pageA.js 
    [1] ./pageA.js 25 bytes {3} [built]
```

## Minimized (uglify-js, no zip)

```
Hash: 7cd0b14caedac75ad66d
Version: webpack 2.0.6-beta
Time: 268ms
    Asset      Size  Chunks             Chunk Names
vendor.js   1.04 kB       0  [emitted]  vendor
 pageC.js  59 bytes       1  [emitted]  pageC
 pageB.js  59 bytes       2  [emitted]  pageB
 pageA.js  58 bytes       3  [emitted]  pageA
chunk    {0} vendor.js (vendor) 54 bytes [rendered]
    > vendor [4] multi vendor 
    [0] ./vendor.js 26 bytes {0} [built]
        single entry ./vendor [4] multi vendor
    [4] multi vendor 28 bytes {0} [built]
chunk    {1} pageC.js (pageC) 25 bytes {0} [rendered]
    > pageC [3] ./pageC.js 
    [3] ./pageC.js 25 bytes {1} [built]
chunk    {2} pageB.js (pageB) 25 bytes {0} [rendered]
    > pageB [2] ./pageB.js 
    [2] ./pageB.js 25 bytes {2} [built]
chunk    {3} pageA.js (pageA) 25 bytes {0} [rendered]
    > pageA [1] ./pageA.js 
    [1] ./pageA.js 25 bytes {3} [built]
```
