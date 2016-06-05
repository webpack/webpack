# pageA.js

``` javascript
require("./modules/a-b-c");
require("./modules/a-b");
require("./modules/a-c");
```

# adminPageA.js

``` javascript
require("./modules/a-b-c");
require("./modules/admin");
```

# webpack.config.js

``` javascript
var path = require("path");
var CommonsChunkPlugin = require("../../lib/optimize/CommonsChunkPlugin");
module.exports = {
	entry: {
		pageA: "./pageA",
		pageB: "./pageB",
		pageC: "./pageC",
		adminPageA: "./adminPageA",
		adminPageB: "./adminPageB",
		adminPageC: "./adminPageC",
	},
	output: {
		path: path.join(__dirname, "js"),
		filename: "[name].js"
	},
	plugins: [
		new CommonsChunkPlugin({
			name: "admin-commons",
			chunks: ["adminPageA", "adminPageB"]
		}),
		new CommonsChunkPlugin({
			name: "commons",
			chunks: ["pageA", "pageB", "admin-commons"],
			minChunks: 2
		}),
		new CommonsChunkPlugin({
			name: "c-commons",
			chunks: ["pageC", "adminPageC"]
		}),
	]
}
```

# pageA.html

``` html
<html>
	<head></head>
	<body>
		<script src="js/commons.js" charset="utf-8"></script>
		<script src="js/pageA.js" charset="utf-8"></script>
	</body>
</html>
```

# adminPageA.html

``` html
<html>
	<head></head>
	<body>
		<script src="js/commons.js" charset="utf-8"></script>
		<script src="js/admin-commons.js" charset="utf-8"></script>
		<script src="js/adminPageA.js" charset="utf-8"></script>
	</body>
</html>
```

# js/commons.js

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
/******/ 				result = __webpack_require__(executeModules[i]);
/******/ 			}
/******/ 		}
/******/ 		return result;
/******/ 	};

/******/ 	// The module cache
/******/ 	var installedModules = {};

/******/ 	// objects to store loaded and loading chunks
/******/ 	var installedChunks = {
/******/ 		0: 0,
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
/******/ })
/************************************************************************/
/******/ ([
/* 0 */
/*!**************************!*\
  !*** ./modules/a-b-c.js ***!
  \**************************/
/***/ function(module, exports) {

	

/***/ },
/* 1 */,
/* 2 */,
/* 3 */,
/* 4 */
/*!************************!*\
  !*** ./modules/a-b.js ***!
  \************************/
/***/ function(module, exports) {

	

/***/ }
/******/ ]);
```

# js/pageA.js

``` javascript
webpackJsonp([4],{

/***/ 2:
/*!************************!*\
  !*** ./modules/a-c.js ***!
  \************************/
/***/ function(module, exports) {

	

/***/ },

/***/ 8:
/*!******************!*\
  !*** ./pageA.js ***!
  \******************/
/***/ function(module, exports, __webpack_require__) {

	__webpack_require__(/*! ./modules/a-b-c */ 0);
	__webpack_require__(/*! ./modules/a-b */ 4);
	__webpack_require__(/*! ./modules/a-c */ 2);


/***/ }

},[8]);
```

# js/admin-commons.js

``` javascript
webpackJsonp([6],[
/* 0 */,
/* 1 */
/*!**************************!*\
  !*** ./modules/admin.js ***!
  \**************************/
/***/ function(module, exports) {

	

/***/ }
]);
```

# js/adminPageA.js

``` javascript
webpackJsonp([8],{

/***/ 5:
/*!***********************!*\
  !*** ./adminPageA.js ***!
  \***********************/
/***/ function(module, exports, __webpack_require__) {

	__webpack_require__(/*! ./modules/a-b-c */ 0);
	__webpack_require__(/*! ./modules/admin */ 1);

/***/ }

},[5]);
```

# Info

## Uncompressed

```
Hash: 6095ff10ee795cc9a647
Version: webpack 2.1.0-beta.11
Time: 104ms
           Asset       Size  Chunks             Chunk Names
      commons.js    4.78 kB    0, 1  [emitted]  commons
    c-commons.js    4.59 kB       1  [emitted]  c-commons
        pageC.js  611 bytes       2  [emitted]  pageC
        pageB.js  463 bytes       3  [emitted]  pageB
        pageA.js  463 bytes       4  [emitted]  pageA
   adminPageC.js  439 bytes    5, 6  [emitted]  adminPageC
admin-commons.js  180 bytes       6  [emitted]  admin-commons
   adminPageB.js  285 bytes       7  [emitted]  adminPageB
   adminPageA.js  285 bytes       8  [emitted]  adminPageA
chunk    {0} commons.js (commons) 0 bytes [rendered]
    [0] ./modules/a-b-c.js 0 bytes {0} {1} [built]
        cjs require ./modules/a-b-c [5] ./adminPageA.js 1:0-26
        cjs require ./modules/a-b-c [6] ./adminPageB.js 1:0-26
        cjs require ./modules/a-b-c [7] ./adminPageC.js 1:0-26
        cjs require ./modules/a-b-c [8] ./pageA.js 1:0-26
        cjs require ./modules/a-b-c [9] ./pageB.js 1:0-26
        cjs require ./modules/a-b-c [10] ./pageC.js 1:0-26
    [4] ./modules/a-b.js 0 bytes {0} [built]
        cjs require ./modules/a-b [8] ./pageA.js 2:0-24
        cjs require ./modules/a-b [9] ./pageB.js 2:0-24
chunk    {1} c-commons.js (c-commons) 0 bytes [rendered]
    [0] ./modules/a-b-c.js 0 bytes {0} {1} [built]
        cjs require ./modules/a-b-c [5] ./adminPageA.js 1:0-26
        cjs require ./modules/a-b-c [6] ./adminPageB.js 1:0-26
        cjs require ./modules/a-b-c [7] ./adminPageC.js 1:0-26
        cjs require ./modules/a-b-c [8] ./pageA.js 1:0-26
        cjs require ./modules/a-b-c [9] ./pageB.js 1:0-26
        cjs require ./modules/a-b-c [10] ./pageC.js 1:0-26
chunk    {2} pageC.js (pageC) 83 bytes {1} [rendered]
    > pageC [10] ./pageC.js 
    [2] ./modules/a-c.js 0 bytes {2} {4} [built]
        cjs require ./modules/a-c [8] ./pageA.js 3:0-24
        cjs require ./modules/a-c [10] ./pageC.js 3:0-24
    [3] ./modules/b-c.js 0 bytes {2} {3} [built]
        cjs require ./modules/b-c [9] ./pageB.js 3:0-24
        cjs require ./modules/b-c [10] ./pageC.js 2:0-24
   [10] ./pageC.js 83 bytes {2} [built]
chunk    {3} pageB.js (pageB) 83 bytes {0} [rendered]
    > pageB [9] ./pageB.js 
    [3] ./modules/b-c.js 0 bytes {2} {3} [built]
        cjs require ./modules/b-c [9] ./pageB.js 3:0-24
        cjs require ./modules/b-c [10] ./pageC.js 2:0-24
    [9] ./pageB.js 83 bytes {3} [built]
chunk    {4} pageA.js (pageA) 83 bytes {0} [rendered]
    > pageA [8] ./pageA.js 
    [2] ./modules/a-c.js 0 bytes {2} {4} [built]
        cjs require ./modules/a-c [8] ./pageA.js 3:0-24
        cjs require ./modules/a-c [10] ./pageC.js 3:0-24
    [8] ./pageA.js 83 bytes {4} [built]
chunk    {5} adminPageC.js (adminPageC) 56 bytes {1} [rendered]
    > adminPageC [7] ./adminPageC.js 
    [1] ./modules/admin.js 0 bytes {5} {6} [built]
        cjs require ./modules/admin [5] ./adminPageA.js 2:0-26
        cjs require ./modules/admin [6] ./adminPageB.js 2:0-26
        cjs require ./modules/admin [7] ./adminPageC.js 2:0-26
    [7] ./adminPageC.js 56 bytes {5} [built]
chunk    {6} admin-commons.js (admin-commons) 0 bytes {0} [rendered]
    [1] ./modules/admin.js 0 bytes {5} {6} [built]
        cjs require ./modules/admin [5] ./adminPageA.js 2:0-26
        cjs require ./modules/admin [6] ./adminPageB.js 2:0-26
        cjs require ./modules/admin [7] ./adminPageC.js 2:0-26
chunk    {7} adminPageB.js (adminPageB) 56 bytes {6} [rendered]
    > adminPageB [6] ./adminPageB.js 
    [6] ./adminPageB.js 56 bytes {7} [built]
chunk    {8} adminPageA.js (adminPageA) 56 bytes {6} [rendered]
    > adminPageA [5] ./adminPageA.js 
    [5] ./adminPageA.js 56 bytes {8} [built]
```

## Minimized (uglify-js, no zip)

```
Hash: 6095ff10ee795cc9a647
Version: webpack 2.1.0-beta.11
Time: 215ms
           Asset      Size  Chunks             Chunk Names
      commons.js   1.09 kB    0, 1  [emitted]  commons
    c-commons.js   1.07 kB       1  [emitted]  c-commons
        pageC.js  96 bytes       2  [emitted]  pageC
        pageB.js  76 bytes       3  [emitted]  pageB
        pageA.js  76 bytes       4  [emitted]  pageA
   adminPageC.js  73 bytes    5, 6  [emitted]  adminPageC
admin-commons.js  37 bytes       6  [emitted]  admin-commons
   adminPageB.js  53 bytes       7  [emitted]  adminPageB
   adminPageA.js  53 bytes       8  [emitted]  adminPageA
chunk    {0} commons.js (commons) 0 bytes [rendered]
    [0] ./modules/a-b-c.js 0 bytes {0} {1} [built]
        cjs require ./modules/a-b-c [5] ./adminPageA.js 1:0-26
        cjs require ./modules/a-b-c [6] ./adminPageB.js 1:0-26
        cjs require ./modules/a-b-c [7] ./adminPageC.js 1:0-26
        cjs require ./modules/a-b-c [8] ./pageA.js 1:0-26
        cjs require ./modules/a-b-c [9] ./pageB.js 1:0-26
        cjs require ./modules/a-b-c [10] ./pageC.js 1:0-26
    [4] ./modules/a-b.js 0 bytes {0} [built]
        cjs require ./modules/a-b [8] ./pageA.js 2:0-24
        cjs require ./modules/a-b [9] ./pageB.js 2:0-24
chunk    {1} c-commons.js (c-commons) 0 bytes [rendered]
    [0] ./modules/a-b-c.js 0 bytes {0} {1} [built]
        cjs require ./modules/a-b-c [5] ./adminPageA.js 1:0-26
        cjs require ./modules/a-b-c [6] ./adminPageB.js 1:0-26
        cjs require ./modules/a-b-c [7] ./adminPageC.js 1:0-26
        cjs require ./modules/a-b-c [8] ./pageA.js 1:0-26
        cjs require ./modules/a-b-c [9] ./pageB.js 1:0-26
        cjs require ./modules/a-b-c [10] ./pageC.js 1:0-26
chunk    {2} pageC.js (pageC) 83 bytes {1} [rendered]
    > pageC [10] ./pageC.js 
    [2] ./modules/a-c.js 0 bytes {2} {4} [built]
        cjs require ./modules/a-c [8] ./pageA.js 3:0-24
        cjs require ./modules/a-c [10] ./pageC.js 3:0-24
    [3] ./modules/b-c.js 0 bytes {2} {3} [built]
        cjs require ./modules/b-c [9] ./pageB.js 3:0-24
        cjs require ./modules/b-c [10] ./pageC.js 2:0-24
   [10] ./pageC.js 83 bytes {2} [built]
chunk    {3} pageB.js (pageB) 83 bytes {0} [rendered]
    > pageB [9] ./pageB.js 
    [3] ./modules/b-c.js 0 bytes {2} {3} [built]
        cjs require ./modules/b-c [9] ./pageB.js 3:0-24
        cjs require ./modules/b-c [10] ./pageC.js 2:0-24
    [9] ./pageB.js 83 bytes {3} [built]
chunk    {4} pageA.js (pageA) 83 bytes {0} [rendered]
    > pageA [8] ./pageA.js 
    [2] ./modules/a-c.js 0 bytes {2} {4} [built]
        cjs require ./modules/a-c [8] ./pageA.js 3:0-24
        cjs require ./modules/a-c [10] ./pageC.js 3:0-24
    [8] ./pageA.js 83 bytes {4} [built]
chunk    {5} adminPageC.js (adminPageC) 56 bytes {1} [rendered]
    > adminPageC [7] ./adminPageC.js 
    [1] ./modules/admin.js 0 bytes {5} {6} [built]
        cjs require ./modules/admin [5] ./adminPageA.js 2:0-26
        cjs require ./modules/admin [6] ./adminPageB.js 2:0-26
        cjs require ./modules/admin [7] ./adminPageC.js 2:0-26
    [7] ./adminPageC.js 56 bytes {5} [built]
chunk    {6} admin-commons.js (admin-commons) 0 bytes {0} [rendered]
    [1] ./modules/admin.js 0 bytes {5} {6} [built]
        cjs require ./modules/admin [5] ./adminPageA.js 2:0-26
        cjs require ./modules/admin [6] ./adminPageB.js 2:0-26
        cjs require ./modules/admin [7] ./adminPageC.js 2:0-26
chunk    {7} adminPageB.js (adminPageB) 56 bytes {6} [rendered]
    > adminPageB [6] ./adminPageB.js 
    [6] ./adminPageB.js 56 bytes {7} [built]
chunk    {8} adminPageA.js (adminPageA) 56 bytes {6} [rendered]
    > adminPageA [5] ./adminPageA.js 
    [5] ./adminPageA.js 56 bytes {8} [built]
```
