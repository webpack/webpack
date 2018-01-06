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
	// mode: "development || "production",
	entry: {
		pageA: "./pageA",
		pageB: "./pageB",
		pageC: "./pageC",
		adminPageA: "./adminPageA",
		adminPageB: "./adminPageB",
		adminPageC: "./adminPageC",
	},
	output: {
		path: path.join(__dirname, "dist"),
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
};
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

# dist/commons.js

<details><summary><code>/******/ (function(modules) { /* webpackBootstrap */ })</code></summary>

``` javascript
/******/ (function(modules) { // webpackBootstrap
/******/ 	// install a JSONP callback for chunk loading
/******/ 	function webpackJsonpCallback(data) {
/******/ 		var chunkIds = data[0], moreModules = data[1], executeModules = data[2];
/******/ 		// add "moreModules" to the modules object,
/******/ 		// then flag all "chunkIds" as loaded and fire callback
/******/ 		var moduleId, chunkId, i = 0, resolves = [], result;
/******/ 		for(;i < chunkIds.length; i++) {
/******/ 			chunkId = chunkIds[i];
/******/ 			if(installedChunks[chunkId]) {
/******/ 				resolves.push(installedChunks[chunkId][0]);
/******/ 			}
/******/ 			installedChunks[chunkId] = 0;
/******/ 		}
/******/ 		for(moduleId in moreModules) {
/******/ 			if(Object.prototype.hasOwnProperty.call(moreModules, moduleId)) {
/******/ 				modules[moduleId] = moreModules[moduleId];
/******/ 			}
/******/ 		}
/******/ 		if(parentJsonpFunction) parentJsonpFunction(data);
/******/ 		while(resolves.length) {
/******/ 			resolves.shift()();
/******/ 		}
/******/ 		scheduledModules.push.apply(scheduledModules, executeModules || []);
/******/
/******/ 		for(i = 0; i < scheduledModules.length; i++) {
/******/ 			var scheduledModule = scheduledModules[i];
/******/ 			var fullfilled = true;
/******/ 			for(var j = 1; j < scheduledModule.length; j++) {
/******/ 				var depId = scheduledModule[j];
/******/ 				if(installedChunks[depId] !== 0) fullfilled = false;
/******/ 			}
/******/ 			if(fullfilled) {
/******/ 				scheduledModules.splice(i--, 1);
/******/ 				result = __webpack_require__(__webpack_require__.s = scheduledModule[0]);
/******/ 			}
/******/ 		}
/******/ 		return result;
/******/ 	};
/******/
/******/ 	// The module cache
/******/ 	var installedModules = {};
/******/
/******/ 	// object to store loaded and loading chunks
/******/ 	var installedChunks = {
/******/ 		7: 0
/******/ 	};
/******/
/******/ 	var scheduledModules = [];
/******/
/******/ 	// The require function
/******/ 	function __webpack_require__(moduleId) {
/******/
/******/ 		// Check if module is in cache
/******/ 		if(installedModules[moduleId]) {
/******/ 			return installedModules[moduleId].exports;
/******/ 		}
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
/******/
/******/ 	// expose the modules object (__webpack_modules__)
/******/ 	__webpack_require__.m = modules;
/******/
/******/ 	// expose the module cache
/******/ 	__webpack_require__.c = installedModules;
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
/******/ 	// define __esModule on exports
/******/ 	__webpack_require__.r = function(exports) {
/******/ 		Object.defineProperty(exports, '__esModule', { value: true });
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
/******/ 	__webpack_require__.p = "dist/";
/******/
/******/ 	// on error function for async loading
/******/ 	__webpack_require__.oe = function(err) { console.error(err); throw err; };
/******/
/******/ 	var jsonpArray = window["webpackJsonp"] = window["webpackJsonp"] || [];
/******/ 	var parentJsonpFunction = jsonpArray.push.bind(jsonpArray);
/******/ 	jsonpArray.push = webpackJsonpCallback;
/******/ 	jsonpArray = jsonpArray.slice();
/******/ 	for(var i = 0; i < jsonpArray.length; i++) webpackJsonpCallback(jsonpArray[i]);
/******/ })
/************************************************************************/
```

</details>

``` javascript
/******/ ([
/* 0 */,
/* 1 */
/*!**************************!*\
  !*** ./modules/a-b-c.js ***!
  \**************************/
/*! no static exports found */
/***/ (function(module, exports) {



/***/ }),
/* 2 */
/*!************************!*\
  !*** ./modules/a-b.js ***!
  \************************/
/*! no static exports found */
/***/ (function(module, exports) {



/***/ })
/******/ ]);
```

# dist/pageA.js

``` javascript
(window["webpackJsonp"] = window["webpackJsonp"] || []).push([[0],[
/* 0 */
/*!******************!*\
  !*** ./pageA.js ***!
  \******************/
/*! no static exports found */
/***/ (function(module, exports, __webpack_require__) {

__webpack_require__(/*! ./modules/a-b-c */ 1);
__webpack_require__(/*! ./modules/a-b */ 2);
__webpack_require__(/*! ./modules/a-c */ 3);


/***/ }),
/* 1 */,
/* 2 */,
/* 3 */
/*!************************!*\
  !*** ./modules/a-c.js ***!
  \************************/
/*! no static exports found */
/***/ (function(module, exports) {



/***/ })
],[[0,7,0]]]);
```

# dist/admin-commons.js

``` javascript
(window["webpackJsonp"] = window["webpackJsonp"] || []).push([[6],{

/***/ 8:
/*!**************************!*\
  !*** ./modules/admin.js ***!
  \**************************/
/*! no static exports found */
/***/ (function(module, exports) {



/***/ })

}]);
```

# dist/adminPageA.js

``` javascript
(window["webpackJsonp"] = window["webpackJsonp"] || []).push([[3],{

/***/ 7:
/*!***********************!*\
  !*** ./adminPageA.js ***!
  \***********************/
/*! no static exports found */
/***/ (function(module, exports, __webpack_require__) {

__webpack_require__(/*! ./modules/a-b-c */ 1);
__webpack_require__(/*! ./modules/admin */ 8);

/***/ })

},[[7,7,6,3]]]);
```

# Info

## Unoptimized

```
Hash: 0a1b2c3d4e5f6a7b8c9d
Version: webpack next
           Asset       Size  Chunks             Chunk Names
        pageA.js  594 bytes       0  [emitted]  pageA
        pageB.js  581 bytes       1  [emitted]  pageB
        pageC.js  788 bytes       2  [emitted]  pageC
   adminPageA.js  374 bytes       3  [emitted]  adminPageA
   adminPageB.js  374 bytes       4  [emitted]  adminPageB
   adminPageC.js  558 bytes       5  [emitted]  adminPageC
admin-commons.js  256 bytes       6  [emitted]  admin-commons
      commons.js   5.03 KiB       7  [emitted]  commons
    c-commons.js   4.85 KiB       8  [emitted]  c-commons
Entrypoint pageA = commons.js pageA.js
Entrypoint pageB = commons.js pageB.js
Entrypoint pageC = c-commons.js pageC.js
Entrypoint adminPageA = commons.js admin-commons.js adminPageA.js
Entrypoint adminPageB = commons.js admin-commons.js adminPageB.js
Entrypoint adminPageC = c-commons.js adminPageC.js
chunk    {0} pageA.js (pageA) 83 bytes {7} [initial] [rendered]
    > pageA [0] ./pageA.js 
    [0] ./pageA.js 83 bytes {0} [built]
        single entry ./pageA  pageA
    [3] ./modules/a-c.js 0 bytes {0} {2} [built]
        cjs require ./modules/a-c [0] ./pageA.js 3:0-24
        cjs require ./modules/a-c [6] ./pageC.js 3:0-24
chunk    {1} pageB.js (pageB) 83 bytes {7} [initial] [rendered]
    > pageB [4] ./pageB.js 
    [4] ./pageB.js 83 bytes {1} [built]
        single entry ./pageB  pageB
    [5] ./modules/b-c.js 0 bytes {1} {2} [built]
        cjs require ./modules/b-c [4] ./pageB.js 3:0-24
        cjs require ./modules/b-c [6] ./pageC.js 2:0-24
chunk    {2} pageC.js (pageC) 83 bytes {8} [initial] [rendered]
    > pageC [6] ./pageC.js 
    [3] ./modules/a-c.js 0 bytes {0} {2} [built]
        cjs require ./modules/a-c [0] ./pageA.js 3:0-24
        cjs require ./modules/a-c [6] ./pageC.js 3:0-24
    [5] ./modules/b-c.js 0 bytes {1} {2} [built]
        cjs require ./modules/b-c [4] ./pageB.js 3:0-24
        cjs require ./modules/b-c [6] ./pageC.js 2:0-24
    [6] ./pageC.js 83 bytes {2} [built]
        single entry ./pageC  pageC
chunk    {3} adminPageA.js (adminPageA) 56 bytes {6} [initial] [rendered]
    > adminPageA [7] ./adminPageA.js 
    [7] ./adminPageA.js 56 bytes {3} [built]
        single entry ./adminPageA  adminPageA
chunk    {4} adminPageB.js (adminPageB) 56 bytes {6} [initial] [rendered]
    > adminPageB [9] ./adminPageB.js 
    [9] ./adminPageB.js 56 bytes {4} [built]
        single entry ./adminPageB  adminPageB
chunk    {5} adminPageC.js (adminPageC) 56 bytes {8} [initial] [rendered]
    > adminPageC [10] ./adminPageC.js 
    [8] ./modules/admin.js 0 bytes {5} {6} [built]
        cjs require ./modules/admin [7] ./adminPageA.js 2:0-26
        cjs require ./modules/admin [9] ./adminPageB.js 2:0-26
        cjs require ./modules/admin [10] ./adminPageC.js 2:0-26
   [10] ./adminPageC.js 56 bytes {5} [built]
        single entry ./adminPageC  adminPageC
chunk    {6} admin-commons.js (admin-commons) 0 bytes {7} [initial] [rendered]
    [8] ./modules/admin.js 0 bytes {5} {6} [built]
        cjs require ./modules/admin [7] ./adminPageA.js 2:0-26
        cjs require ./modules/admin [9] ./adminPageB.js 2:0-26
        cjs require ./modules/admin [10] ./adminPageC.js 2:0-26
chunk    {7} commons.js (commons) 0 bytes [entry] [rendered]
    [1] ./modules/a-b-c.js 0 bytes {7} {8} [built]
        cjs require ./modules/a-b-c [0] ./pageA.js 1:0-26
        cjs require ./modules/a-b-c [4] ./pageB.js 1:0-26
        cjs require ./modules/a-b-c [6] ./pageC.js 1:0-26
        cjs require ./modules/a-b-c [7] ./adminPageA.js 1:0-26
        cjs require ./modules/a-b-c [9] ./adminPageB.js 1:0-26
        cjs require ./modules/a-b-c [10] ./adminPageC.js 1:0-26
    [2] ./modules/a-b.js 0 bytes {7} [built]
        cjs require ./modules/a-b [0] ./pageA.js 2:0-24
        cjs require ./modules/a-b [4] ./pageB.js 2:0-24
chunk    {8} c-commons.js (c-commons) 0 bytes [entry] [rendered]
    [1] ./modules/a-b-c.js 0 bytes {7} {8} [built]
        cjs require ./modules/a-b-c [0] ./pageA.js 1:0-26
        cjs require ./modules/a-b-c [4] ./pageB.js 1:0-26
        cjs require ./modules/a-b-c [6] ./pageC.js 1:0-26
        cjs require ./modules/a-b-c [7] ./adminPageA.js 1:0-26
        cjs require ./modules/a-b-c [9] ./adminPageB.js 1:0-26
        cjs require ./modules/a-b-c [10] ./adminPageC.js 1:0-26
```

## Production mode

```
Hash: 0a1b2c3d4e5f6a7b8c9d
Version: webpack next
           Asset       Size  Chunks             Chunk Names
admin-commons.js   77 bytes       0  [emitted]  admin-commons
   adminPageC.js  119 bytes    1, 0  [emitted]  adminPageC
   adminPageB.js  101 bytes       2  [emitted]  adminPageB
   adminPageA.js  101 bytes       3  [emitted]  adminPageA
        pageC.js  140 bytes       4  [emitted]  pageC
        pageB.js  122 bytes       5  [emitted]  pageB
        pageA.js  124 bytes       6  [emitted]  pageA
    c-commons.js   1.06 KiB       7  [emitted]  c-commons
      commons.js   1.08 KiB    8, 7  [emitted]  commons
Entrypoint pageA = commons.js pageA.js
Entrypoint pageB = commons.js pageB.js
Entrypoint pageC = c-commons.js pageC.js
Entrypoint adminPageA = commons.js admin-commons.js adminPageA.js
Entrypoint adminPageB = commons.js admin-commons.js adminPageB.js
Entrypoint adminPageC = c-commons.js adminPageC.js
chunk    {0} admin-commons.js (admin-commons) 0 bytes {8} [initial] [rendered]
    [1] ./modules/admin.js 0 bytes {0} {1} [built]
        cjs require ./modules/admin [5] ./adminPageC.js 2:0-26
        cjs require ./modules/admin [6] ./adminPageB.js 2:0-26
        cjs require ./modules/admin [7] ./adminPageA.js 2:0-26
chunk    {1} adminPageC.js (adminPageC) 56 bytes {7} [initial] [rendered]
    > adminPageC [5] ./adminPageC.js 
    [1] ./modules/admin.js 0 bytes {0} {1} [built]
        cjs require ./modules/admin [5] ./adminPageC.js 2:0-26
        cjs require ./modules/admin [6] ./adminPageB.js 2:0-26
        cjs require ./modules/admin [7] ./adminPageA.js 2:0-26
    [5] ./adminPageC.js 56 bytes {1} [built]
        single entry ./adminPageC  adminPageC
chunk    {2} adminPageB.js (adminPageB) 56 bytes {0} [initial] [rendered]
    > adminPageB [6] ./adminPageB.js 
    [6] ./adminPageB.js 56 bytes {2} [built]
        single entry ./adminPageB  adminPageB
chunk    {3} adminPageA.js (adminPageA) 56 bytes {0} [initial] [rendered]
    > adminPageA [7] ./adminPageA.js 
    [7] ./adminPageA.js 56 bytes {3} [built]
        single entry ./adminPageA  adminPageA
chunk    {4} pageC.js (pageC) 83 bytes {7} [initial] [rendered]
    > pageC [8] ./pageC.js 
    [2] ./modules/b-c.js 0 bytes {4} {5} [built]
        cjs require ./modules/b-c [8] ./pageC.js 2:0-24
        cjs require ./modules/b-c [9] ./pageB.js 3:0-24
    [3] ./modules/a-c.js 0 bytes {4} {6} [built]
        cjs require ./modules/a-c [8] ./pageC.js 3:0-24
        cjs require ./modules/a-c [10] ./pageA.js 3:0-24
    [8] ./pageC.js 83 bytes {4} [built]
        single entry ./pageC  pageC
chunk    {5} pageB.js (pageB) 83 bytes {8} [initial] [rendered]
    > pageB [9] ./pageB.js 
    [2] ./modules/b-c.js 0 bytes {4} {5} [built]
        cjs require ./modules/b-c [8] ./pageC.js 2:0-24
        cjs require ./modules/b-c [9] ./pageB.js 3:0-24
    [9] ./pageB.js 83 bytes {5} [built]
        single entry ./pageB  pageB
chunk    {6} pageA.js (pageA) 83 bytes {8} [initial] [rendered]
    > pageA [10] ./pageA.js 
    [3] ./modules/a-c.js 0 bytes {4} {6} [built]
        cjs require ./modules/a-c [8] ./pageC.js 3:0-24
        cjs require ./modules/a-c [10] ./pageA.js 3:0-24
   [10] ./pageA.js 83 bytes {6} [built]
        single entry ./pageA  pageA
chunk    {7} c-commons.js (c-commons) 0 bytes [entry] [rendered]
    [0] ./modules/a-b-c.js 0 bytes {7} {8} [built]
        cjs require ./modules/a-b-c [5] ./adminPageC.js 1:0-26
        cjs require ./modules/a-b-c [6] ./adminPageB.js 1:0-26
        cjs require ./modules/a-b-c [7] ./adminPageA.js 1:0-26
        cjs require ./modules/a-b-c [8] ./pageC.js 1:0-26
        cjs require ./modules/a-b-c [9] ./pageB.js 1:0-26
        cjs require ./modules/a-b-c [10] ./pageA.js 1:0-26
chunk    {8} commons.js (commons) 0 bytes [entry] [rendered]
    [0] ./modules/a-b-c.js 0 bytes {7} {8} [built]
        cjs require ./modules/a-b-c [5] ./adminPageC.js 1:0-26
        cjs require ./modules/a-b-c [6] ./adminPageB.js 1:0-26
        cjs require ./modules/a-b-c [7] ./adminPageA.js 1:0-26
        cjs require ./modules/a-b-c [8] ./pageC.js 1:0-26
        cjs require ./modules/a-b-c [9] ./pageB.js 1:0-26
        cjs require ./modules/a-b-c [10] ./pageA.js 1:0-26
    [4] ./modules/a-b.js 0 bytes {8} [built]
        cjs require ./modules/a-b [9] ./pageB.js 2:0-24
        cjs require ./modules/a-b [10] ./pageA.js 2:0-24
```
