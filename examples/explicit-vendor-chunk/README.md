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
/******/ 		if(executeModules) {
/******/ 			for(i=0; i < executeModules.length; i++) {
/******/ 				result = __webpack_require__(__webpack_require__.s = executeModules[i]);
/******/ 			}
/******/ 		}
/******/ 		return result;
/******/ 	};

/******/ 	// The module cache
/******/ 	var installedModules = {};

/******/ 	// objects to store loaded and loading chunks
/******/ 	var installedChunks = {
/******/ 		3: 0
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

/******/ 	// define getter function for harmory exports
/******/ 	__webpack_require__.d = function(exports, name, getter) {
/******/ 		Object.defineProperty(exports, name, {
/******/ 			configurable: false,
/******/ 			enumerable: true,
/******/ 			get: getter
/******/ 		});
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
/* unknown exports provided */
/* all exports used */
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
webpackJsonp([2],[
/* 0 */,
/* 1 */
/* unknown exports provided */
/* all exports used */
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
Hash: 9f87222952220094b363
Version: webpack 2.1.0-beta.22
Time: 154ms
    Asset       Size  Chunks             Chunk Names
 pageC.js  232 bytes       0  [emitted]  pageC
 pageB.js  232 bytes       1  [emitted]  pageB
 pageA.js  238 bytes       2  [emitted]  pageA
vendor.js    5.96 kB       3  [emitted]  vendor
Entrypoint pageA = vendor.js pageA.js
Entrypoint pageB = vendor.js pageB.js
Entrypoint pageC = vendor.js pageC.js
Entrypoint vendor = vendor.js
chunk    {0} pageC.js (pageC) 25 bytes {3} [initial] [rendered]
    > pageC [3] ./pageC.js 
    [3] ./pageC.js 25 bytes {0} [built]
chunk    {1} pageB.js (pageB) 25 bytes {3} [initial] [rendered]
    > pageB [2] ./pageB.js 
    [2] ./pageB.js 25 bytes {1} [built]
chunk    {2} pageA.js (pageA) 25 bytes {3} [initial] [rendered]
    > pageA [1] ./pageA.js 
    [1] ./pageA.js 25 bytes {2} [built]
chunk    {3} vendor.js (vendor) 54 bytes [entry] [rendered]
    > vendor [4] multi vendor 
    [0] ./vendor.js 26 bytes {3} [built]
        single entry ./vendor [4] multi vendor
    [4] multi vendor 28 bytes {3} [built]
```

## Minimized (uglify-js, no zip)

```
Hash: 9f87222952220094b363
Version: webpack 2.1.0-beta.22
Time: 294ms
    Asset      Size  Chunks             Chunk Names
 pageC.js  59 bytes       0  [emitted]  pageC
 pageB.js  59 bytes       1  [emitted]  pageB
 pageA.js  58 bytes       2  [emitted]  pageA
vendor.js   1.41 kB       3  [emitted]  vendor
Entrypoint pageA = vendor.js pageA.js
Entrypoint pageB = vendor.js pageB.js
Entrypoint pageC = vendor.js pageC.js
Entrypoint vendor = vendor.js
chunk    {0} pageC.js (pageC) 25 bytes {3} [initial] [rendered]
    > pageC [3] ./pageC.js 
    [3] ./pageC.js 25 bytes {0} [built]
chunk    {1} pageB.js (pageB) 25 bytes {3} [initial] [rendered]
    > pageB [2] ./pageB.js 
    [2] ./pageB.js 25 bytes {1} [built]
chunk    {2} pageA.js (pageA) 25 bytes {3} [initial] [rendered]
    > pageA [1] ./pageA.js 
    [1] ./pageA.js 25 bytes {2} [built]
chunk    {3} vendor.js (vendor) 54 bytes [entry] [rendered]
    > vendor [4] multi vendor 
    [0] ./vendor.js 26 bytes {3} [built]
        single entry ./vendor [4] multi vendor
    [4] multi vendor 28 bytes {3} [built]
```
