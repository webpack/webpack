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
		new CommonsChunkPlugin("admin-commons.js", ["adminPageA", "adminPageB"]),
		new CommonsChunkPlugin("commons.js", ["pageA", "pageB", "admin-commons.js"], 2),
		new CommonsChunkPlugin("c-commons.js", ["pageC", "adminPageC"]),
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
/******/ 	window["webpackJsonp"] = function webpackJsonpCallback(chunkIds, moreModules) {
/******/ 		// add "moreModules" to the modules object,
/******/ 		// then flag all "chunkIds" as loaded and fire callback
/******/ 		var moduleId, chunkId, i = 0, callbacks = [];
/******/ 		for(;i < chunkIds.length; i++) {
/******/ 			chunkId = chunkIds[i];
/******/ 			if(installedChunks[chunkId])
/******/ 				callbacks.push.apply(callbacks, installedChunks[chunkId]);
/******/ 			installedChunks[chunkId] = 0;
/******/ 		}
/******/ 		for(moduleId in moreModules) {
/******/ 			modules[moduleId] = moreModules[moduleId];
/******/ 		}
/******/ 		if(parentJsonpFunction) parentJsonpFunction(chunkIds, moreModules);
/******/ 		while(callbacks.length)
/******/ 			callbacks.shift().call(null, __webpack_require__);
/******/ 		if(moreModules[0]) {
/******/ 			installedModules[0] = 0;
/******/ 			return __webpack_require__(0);
/******/ 		}
/******/ 	};

/******/ 	// The module cache
/******/ 	var installedModules = {};

/******/ 	// object to store loaded and loading chunks
/******/ 	// "0" means "already loaded"
/******/ 	// Array means "loading", array contains callbacks
/******/ 	var installedChunks = {
/******/ 		7:0,
/******/ 		8:0
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
/******/ 	__webpack_require__.e = function requireEnsure(chunkId, callback) {
/******/ 		// "0" is the signal for "already loaded"
/******/ 		if(installedChunks[chunkId] === 0)
/******/ 			return callback.call(null, __webpack_require__);

/******/ 		// an array means "currently loading".
/******/ 		if(installedChunks[chunkId] !== undefined) {
/******/ 			installedChunks[chunkId].push(callback);
/******/ 		} else {
/******/ 			// start chunk loading
/******/ 			installedChunks[chunkId] = [callback];
/******/ 			var head = document.getElementsByTagName('head')[0];
/******/ 			var script = document.createElement('script');
/******/ 			script.type = 'text/javascript';
/******/ 			script.charset = 'utf-8';
/******/ 			script.async = true;

/******/ 			script.src = __webpack_require__.p + "" + chunkId + "." + ({"0":"adminPageA","1":"adminPageB","3":"pageA","4":"pageB","6":"admin-commons.js"}[chunkId]||chunkId) + ".js";
/******/ 			head.appendChild(script);
/******/ 		}
/******/ 	};

/******/ 	// expose the modules object (__webpack_modules__)
/******/ 	__webpack_require__.m = modules;

/******/ 	// expose the module cache
/******/ 	__webpack_require__.c = installedModules;

/******/ 	// __webpack_public_path__
/******/ 	__webpack_require__.p = "js/";
/******/ })
/************************************************************************/
/******/ ([
/* 0 */,
/* 1 */
/*!**************************!*\
  !*** ./modules/a-b-c.js ***!
  \**************************/
/***/ function(module, exports) {

	

/***/ },
/* 2 */,
/* 3 */
/*!************************!*\
  !*** ./modules/a-b.js ***!
  \************************/
/***/ function(module, exports) {

	

/***/ }
/******/ ]);
```

# js/pageA.js

``` javascript
webpackJsonp([3],[
/* 0 */
/*!******************!*\
  !*** ./pageA.js ***!
  \******************/
/***/ function(module, exports, __webpack_require__) {

	__webpack_require__(/*! ./modules/a-b-c */ 1);
	__webpack_require__(/*! ./modules/a-b */ 3);
	__webpack_require__(/*! ./modules/a-c */ 4);


/***/ },
/* 1 */,
/* 2 */,
/* 3 */,
/* 4 */
/*!************************!*\
  !*** ./modules/a-c.js ***!
  \************************/
/***/ function(module, exports) {

	

/***/ }
]);
```

# js/admin-commons.js

``` javascript
webpackJsonp([6],{

/***/ 2:
/*!**************************!*\
  !*** ./modules/admin.js ***!
  \**************************/
/***/ function(module, exports) {

	

/***/ }

});
```

# js/adminPageA.js

``` javascript
webpackJsonp([0],[
/* 0 */
/*!***********************!*\
  !*** ./adminPageA.js ***!
  \***********************/
/***/ function(module, exports, __webpack_require__) {

	__webpack_require__(/*! ./modules/a-b-c */ 1);
	__webpack_require__(/*! ./modules/admin */ 2);

/***/ }
]);
```

# Info

## Uncompressed

```
Hash: c8b70390c99c2fe1e001
Version: webpack 1.9.10
Time: 99ms
           Asset       Size  Chunks             Chunk Names
   adminPageA.js  278 bytes       0  [emitted]  adminPageA
   adminPageB.js  278 bytes       1  [emitted]  adminPageB
   adminPageC.js  439 bytes    2, 6  [emitted]  adminPageC
        pageA.js  481 bytes       3  [emitted]  pageA
        pageB.js  459 bytes       4  [emitted]  pageB
        pageC.js  625 bytes       5  [emitted]  pageC
admin-commons.js  174 bytes       6  [emitted]  admin-commons.js
      commons.js    3.96 kB    7, 8  [emitted]  commons.js
    c-commons.js    3.73 kB       8  [emitted]  c-commons.js
chunk    {0} adminPageA.js (adminPageA) 56 bytes {6} [rendered]
    > adminPageA [0] ./adminPageA.js 
    [0] ./adminPageA.js 56 bytes {0} [built]
chunk    {1} adminPageB.js (adminPageB) 56 bytes {6} [rendered]
    > adminPageB [0] ./adminPageB.js 
    [0] ./adminPageB.js 56 bytes {1} [built]
chunk    {2} adminPageC.js (adminPageC) 56 bytes {8} [rendered]
    > adminPageC [0] ./adminPageC.js 
    [0] ./adminPageC.js 56 bytes {2} [built]
    [2] ./modules/admin.js 0 bytes {2} {6} [built]
        cjs require ./modules/admin [0] ./adminPageA.js 2:0-26
        cjs require ./modules/admin [0] ./adminPageB.js 2:0-26
        cjs require ./modules/admin [0] ./adminPageC.js 2:0-26
chunk    {3} pageA.js (pageA) 83 bytes {7} [rendered]
    > pageA [0] ./pageA.js 
    [0] ./pageA.js 83 bytes {3} [built]
    [4] ./modules/a-c.js 0 bytes {3} {5} [built]
        cjs require ./modules/a-c [0] ./pageC.js 3:0-24
        cjs require ./modules/a-c [0] ./pageA.js 3:0-24
chunk    {4} pageB.js (pageB) 83 bytes {7} [rendered]
    > pageB [0] ./pageB.js 
    [0] ./pageB.js 83 bytes {4} [built]
    [5] ./modules/b-c.js 0 bytes {4} {5} [built]
        cjs require ./modules/b-c [0] ./pageC.js 2:0-24
        cjs require ./modules/b-c [0] ./pageB.js 3:0-24
chunk    {5} pageC.js (pageC) 83 bytes {8} [rendered]
    > pageC [0] ./pageC.js 
    [0] ./pageC.js 83 bytes {5} [built]
    [4] ./modules/a-c.js 0 bytes {3} {5} [built]
        cjs require ./modules/a-c [0] ./pageC.js 3:0-24
        cjs require ./modules/a-c [0] ./pageA.js 3:0-24
    [5] ./modules/b-c.js 0 bytes {4} {5} [built]
        cjs require ./modules/b-c [0] ./pageC.js 2:0-24
        cjs require ./modules/b-c [0] ./pageB.js 3:0-24
chunk    {6} admin-commons.js (admin-commons.js) 0 bytes {7} [rendered]
    [2] ./modules/admin.js 0 bytes {2} {6} [built]
        cjs require ./modules/admin [0] ./adminPageA.js 2:0-26
        cjs require ./modules/admin [0] ./adminPageB.js 2:0-26
        cjs require ./modules/admin [0] ./adminPageC.js 2:0-26
chunk    {7} commons.js (commons.js) 0 bytes [rendered]
    [1] ./modules/a-b-c.js 0 bytes {7} {8} [built]
        cjs require ./modules/a-b-c [0] ./pageC.js 1:0-26
        cjs require ./modules/a-b-c [0] ./pageB.js 1:0-26
        cjs require ./modules/a-b-c [0] ./pageA.js 1:0-26
        cjs require ./modules/a-b-c [0] ./adminPageA.js 1:0-26
        cjs require ./modules/a-b-c [0] ./adminPageB.js 1:0-26
        cjs require ./modules/a-b-c [0] ./adminPageC.js 1:0-26
    [3] ./modules/a-b.js 0 bytes {7} [built]
        cjs require ./modules/a-b [0] ./pageB.js 2:0-24
        cjs require ./modules/a-b [0] ./pageA.js 2:0-24
chunk    {8} c-commons.js (c-commons.js) 0 bytes [rendered]
    [1] ./modules/a-b-c.js 0 bytes {7} {8} [built]
        cjs require ./modules/a-b-c [0] ./pageC.js 1:0-26
        cjs require ./modules/a-b-c [0] ./pageB.js 1:0-26
        cjs require ./modules/a-b-c [0] ./pageA.js 1:0-26
        cjs require ./modules/a-b-c [0] ./adminPageA.js 1:0-26
        cjs require ./modules/a-b-c [0] ./adminPageB.js 1:0-26
        cjs require ./modules/a-b-c [0] ./adminPageC.js 1:0-26
```

## Minimized (uglify-js, no zip)

```
Hash: c676a306c4af01dba069
Version: webpack 1.9.10
Time: 345ms
           Asset       Size  Chunks             Chunk Names
      commons.js  837 bytes    0, 1  [emitted]  commons.js
    c-commons.js  768 bytes       1  [emitted]  c-commons.js
        pageC.js   86 bytes       2  [emitted]  pageC
        pageB.js   71 bytes       3  [emitted]  pageB
        pageA.js   70 bytes       4  [emitted]  pageA
   adminPageC.js   66 bytes    5, 6  [emitted]  adminPageC
admin-commons.js   38 bytes       6  [emitted]  admin-commons.js
   adminPageB.js   47 bytes       7  [emitted]  adminPageB
   adminPageA.js   47 bytes       8  [emitted]  adminPageA
chunk    {0} commons.js (commons.js) 0 bytes [rendered]
    [1] ./modules/a-b-c.js 0 bytes {0} {1} [built]
        cjs require ./modules/a-b-c [0] ./pageB.js 1:0-26
        cjs require ./modules/a-b-c [0] ./pageA.js 1:0-26
        cjs require ./modules/a-b-c [0] ./pageC.js 1:0-26
        cjs require ./modules/a-b-c [0] ./adminPageB.js 1:0-26
        cjs require ./modules/a-b-c [0] ./adminPageA.js 1:0-26
        cjs require ./modules/a-b-c [0] ./adminPageC.js 1:0-26
    [5] ./modules/a-b.js 0 bytes {0} [built]
        cjs require ./modules/a-b [0] ./pageB.js 2:0-24
        cjs require ./modules/a-b [0] ./pageA.js 2:0-24
chunk    {1} c-commons.js (c-commons.js) 0 bytes [rendered]
    [1] ./modules/a-b-c.js 0 bytes {0} {1} [built]
        cjs require ./modules/a-b-c [0] ./pageB.js 1:0-26
        cjs require ./modules/a-b-c [0] ./pageA.js 1:0-26
        cjs require ./modules/a-b-c [0] ./pageC.js 1:0-26
        cjs require ./modules/a-b-c [0] ./adminPageB.js 1:0-26
        cjs require ./modules/a-b-c [0] ./adminPageA.js 1:0-26
        cjs require ./modules/a-b-c [0] ./adminPageC.js 1:0-26
chunk    {2} pageC.js (pageC) 83 bytes {1} [rendered]
    > pageC [0] ./pageC.js 
    [0] ./pageC.js 83 bytes {2} [built]
    [3] ./modules/a-c.js 0 bytes {2} {4} [built]
        cjs require ./modules/a-c [0] ./pageA.js 3:0-24
        cjs require ./modules/a-c [0] ./pageC.js 3:0-24
    [4] ./modules/b-c.js 0 bytes {2} {3} [built]
        cjs require ./modules/b-c [0] ./pageB.js 3:0-24
        cjs require ./modules/b-c [0] ./pageC.js 2:0-24
chunk    {3} pageB.js (pageB) 83 bytes {0} [rendered]
    > pageB [0] ./pageB.js 
    [0] ./pageB.js 83 bytes {3} [built]
    [4] ./modules/b-c.js 0 bytes {2} {3} [built]
        cjs require ./modules/b-c [0] ./pageB.js 3:0-24
        cjs require ./modules/b-c [0] ./pageC.js 2:0-24
chunk    {4} pageA.js (pageA) 83 bytes {0} [rendered]
    > pageA [0] ./pageA.js 
    [0] ./pageA.js 83 bytes {4} [built]
    [3] ./modules/a-c.js 0 bytes {2} {4} [built]
        cjs require ./modules/a-c [0] ./pageA.js 3:0-24
        cjs require ./modules/a-c [0] ./pageC.js 3:0-24
chunk    {5} adminPageC.js (adminPageC) 56 bytes {1} [rendered]
    > adminPageC [0] ./adminPageC.js 
    [0] ./adminPageC.js 56 bytes {5} [built]
    [2] ./modules/admin.js 0 bytes {5} {6} [built]
        cjs require ./modules/admin [0] ./adminPageB.js 2:0-26
        cjs require ./modules/admin [0] ./adminPageA.js 2:0-26
        cjs require ./modules/admin [0] ./adminPageC.js 2:0-26
chunk    {6} admin-commons.js (admin-commons.js) 0 bytes {0} [rendered]
    [2] ./modules/admin.js 0 bytes {5} {6} [built]
        cjs require ./modules/admin [0] ./adminPageB.js 2:0-26
        cjs require ./modules/admin [0] ./adminPageA.js 2:0-26
        cjs require ./modules/admin [0] ./adminPageC.js 2:0-26
chunk    {7} adminPageB.js (adminPageB) 56 bytes {6} [rendered]
    > adminPageB [0] ./adminPageB.js 
    [0] ./adminPageB.js 56 bytes {7} [built]
chunk    {8} adminPageA.js (adminPageA) 56 bytes {6} [rendered]
    > adminPageA [0] ./adminPageA.js 
    [0] ./adminPageA.js 56 bytes {8} [built]
```
