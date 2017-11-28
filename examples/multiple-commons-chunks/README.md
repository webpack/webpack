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
	mode: "production",
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

# js/commons.js

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
/******/ 		7: 0,
/******/ 		8: 0
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
/******/ 	// This file contains only the entry chunk.
/******/ 	// The chunk loading function for additional chunks
/******/ 	__webpack_require__.e = function requireEnsure(chunkId) {
/******/ 		var promises = [];
/******/
/******/
/******/ 		// JSONP chunk loading for javascript
/******/
/******/ 		var installedChunkData = installedChunks[chunkId];
/******/ 		if(installedChunkData !== 0) { // 0 means "already installed".
/******/
/******/ 			// a Promise means "currently loading".
/******/ 			if(installedChunkData) {
/******/ 				promises.push(installedChunkData[2]);
/******/ 			} else {
/******/ 				// setup Promise in chunk cache
/******/ 				var promise = new Promise(function(resolve, reject) {
/******/ 					installedChunkData = installedChunks[chunkId] = [resolve, reject];
/******/ 				});
/******/ 				promises.push(installedChunkData[2] = promise);
/******/
/******/ 				// start chunk loading
/******/ 				var head = document.getElementsByTagName('head')[0];
/******/ 				var script = document.createElement('script');
/******/ 				script.charset = 'utf-8';
/******/ 				script.timeout = 120000;
/******/
/******/ 				if (__webpack_require__.nc) {
/******/ 					script.setAttribute("nonce", __webpack_require__.nc);
/******/ 				}
/******/ 				script.src = __webpack_require__.p + "" + chunkId + ".js";
/******/ 				var timeout = setTimeout(function(){
/******/ 					onScriptComplete({ type: 'timeout', target: script });
/******/ 				}, 120000);
/******/ 				script.onerror = script.onload = onScriptComplete;
/******/ 				function onScriptComplete(event) {
/******/ 					// avoid mem leaks in IE.
/******/ 					script.onerror = script.onload = null;
/******/ 					clearTimeout(timeout);
/******/ 					var chunk = installedChunks[chunkId];
/******/ 					if(chunk !== 0) {
/******/ 						if(chunk) {
/******/ 							var errorType = event && (event.type === 'load' ? 'missing' : event.type);
/******/ 							var realSrc = event && event.target && event.target.src;
/******/ 							var error = new Error('Loading chunk ' + chunkId + ' failed.\n(' + errorType + ': ' + realSrc + ')');
/******/ 							error.type = errorType;
/******/ 							error.request = realSrc;
/******/ 							chunk[1](error);
/******/ 						}
/******/ 						installedChunks[chunkId] = undefined;
/******/ 					}
/******/ 				};
/******/ 				head.appendChild(script);
/******/ 			}
/******/ 		}
/******/ 		return Promise.all(promises);
/******/ 	};
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
/******/ 	__webpack_require__.p = "js/";
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
/* 0 */
/*!**************************!*\
  !*** ./modules/a-b-c.js ***!
  \**************************/
/*! no static exports found */
/*! all exports used */
/*! ModuleConcatenation bailout: Module is not an ECMAScript module */
/***/ (function(module, exports) {



/***/ }),
/* 1 */,
/* 2 */,
/* 3 */,
/* 4 */
/*!************************!*\
  !*** ./modules/a-b.js ***!
  \************************/
/*! no static exports found */
/*! all exports used */
/*! ModuleConcatenation bailout: Module is not an ECMAScript module */
/***/ (function(module, exports) {



/***/ })
/******/ ]);
```

# js/pageA.js

``` javascript
(window["webpackJsonp"] = window["webpackJsonp"] || []).push([[2],{

/***/ 2:
/*!************************!*\
  !*** ./modules/a-c.js ***!
  \************************/
/*! no static exports found */
/*! all exports used */
/*! ModuleConcatenation bailout: Module is not an ECMAScript module */
/***/ (function(module, exports) {



/***/ }),

/***/ 5:
/*!******************!*\
  !*** ./pageA.js ***!
  \******************/
/*! no static exports found */
/*! all exports used */
/*! ModuleConcatenation bailout: Module is not an ECMAScript module */
/***/ (function(module, exports, __webpack_require__) {

__webpack_require__(/*! ./modules/a-b-c */ 0);
__webpack_require__(/*! ./modules/a-b */ 4);
__webpack_require__(/*! ./modules/a-c */ 2);


/***/ })

},[[5,7,2]]]);
```

# js/admin-commons.js

``` javascript
(window["webpackJsonp"] = window["webpackJsonp"] || []).push([[4],[
/* 0 */,
/* 1 */
/*!**************************!*\
  !*** ./modules/admin.js ***!
  \**************************/
/*! no static exports found */
/*! all exports used */
/*! ModuleConcatenation bailout: Module is not an ECMAScript module */
/***/ (function(module, exports) {



/***/ })
]]);
```

# js/adminPageA.js

``` javascript
(window["webpackJsonp"] = window["webpackJsonp"] || []).push([[6],{

/***/ 8:
/*!***********************!*\
  !*** ./adminPageA.js ***!
  \***********************/
/*! no static exports found */
/*! all exports used */
/*! ModuleConcatenation bailout: Module is not an ECMAScript module */
/***/ (function(module, exports, __webpack_require__) {

__webpack_require__(/*! ./modules/a-b-c */ 0);
__webpack_require__(/*! ./modules/admin */ 1);

/***/ })

},[[8,7,4,6]]]);
```

# Info

## Uncompressed

```
Hash: aae3eb52e46997530381
Version: webpack next
           Asset       Size  Chunks             Chunk Names
        pageC.js   1.06 KiB       0  [emitted]  pageC
        pageB.js  771 bytes       1  [emitted]  pageB
        pageA.js  771 bytes       2  [emitted]  pageA
   adminPageC.js  750 bytes    3, 4  [emitted]  adminPageC
admin-commons.js  357 bytes       4  [emitted]  admin-commons
   adminPageB.js  469 bytes       5  [emitted]  adminPageB
   adminPageA.js  469 bytes       6  [emitted]  adminPageA
      commons.js   7.62 KiB    7, 8  [emitted]  commons
    c-commons.js   7.32 KiB       8  [emitted]  c-commons
Entrypoint pageA = commons.js pageA.js
Entrypoint pageB = commons.js pageB.js
Entrypoint pageC = c-commons.js pageC.js
Entrypoint adminPageA = commons.js admin-commons.js adminPageA.js
Entrypoint adminPageB = commons.js admin-commons.js adminPageB.js
Entrypoint adminPageC = c-commons.js adminPageC.js
chunk    {0} pageC.js (pageC) 83 bytes {8} [initial] [rendered]
    > pageC [7] ./pageC.js 
    [2] ./modules/a-c.js 0 bytes {0} {2} [built]
        cjs require ./modules/a-c [5] ./pageA.js 3:0-24
        cjs require ./modules/a-c [7] ./pageC.js 3:0-24
    [3] ./modules/b-c.js 0 bytes {0} {1} [built]
        cjs require ./modules/b-c [6] ./pageB.js 3:0-24
        cjs require ./modules/b-c [7] ./pageC.js 2:0-24
    [7] ./pageC.js 83 bytes {0} [built]
        single entry ./pageC  pageC
chunk    {1} pageB.js (pageB) 83 bytes {7} [initial] [rendered]
    > pageB [6] ./pageB.js 
    [3] ./modules/b-c.js 0 bytes {0} {1} [built]
        cjs require ./modules/b-c [6] ./pageB.js 3:0-24
        cjs require ./modules/b-c [7] ./pageC.js 2:0-24
    [6] ./pageB.js 83 bytes {1} [built]
        single entry ./pageB  pageB
chunk    {2} pageA.js (pageA) 83 bytes {7} [initial] [rendered]
    > pageA [5] ./pageA.js 
    [2] ./modules/a-c.js 0 bytes {0} {2} [built]
        cjs require ./modules/a-c [5] ./pageA.js 3:0-24
        cjs require ./modules/a-c [7] ./pageC.js 3:0-24
    [5] ./pageA.js 83 bytes {2} [built]
        single entry ./pageA  pageA
chunk    {3} adminPageC.js (adminPageC) 56 bytes {8} [initial] [rendered]
    > adminPageC [10] ./adminPageC.js 
    [1] ./modules/admin.js 0 bytes {3} {4} [built]
        cjs require ./modules/admin [8] ./adminPageA.js 2:0-26
        cjs require ./modules/admin [9] ./adminPageB.js 2:0-26
        cjs require ./modules/admin [10] ./adminPageC.js 2:0-26
   [10] ./adminPageC.js 56 bytes {3} [built]
        single entry ./adminPageC  adminPageC
chunk    {4} admin-commons.js (admin-commons) 0 bytes {7} [initial] [rendered]
    [1] ./modules/admin.js 0 bytes {3} {4} [built]
        cjs require ./modules/admin [8] ./adminPageA.js 2:0-26
        cjs require ./modules/admin [9] ./adminPageB.js 2:0-26
        cjs require ./modules/admin [10] ./adminPageC.js 2:0-26
chunk    {5} adminPageB.js (adminPageB) 56 bytes {4} [initial] [rendered]
    > adminPageB [9] ./adminPageB.js 
    [9] ./adminPageB.js 56 bytes {5} [built]
        single entry ./adminPageB  adminPageB
chunk    {6} adminPageA.js (adminPageA) 56 bytes {4} [initial] [rendered]
    > adminPageA [8] ./adminPageA.js 
    [8] ./adminPageA.js 56 bytes {6} [built]
        single entry ./adminPageA  adminPageA
chunk    {7} commons.js (commons) 0 bytes [entry] [rendered]
    [0] ./modules/a-b-c.js 0 bytes {7} {8} [built]
        cjs require ./modules/a-b-c [5] ./pageA.js 1:0-26
        cjs require ./modules/a-b-c [6] ./pageB.js 1:0-26
        cjs require ./modules/a-b-c [7] ./pageC.js 1:0-26
        cjs require ./modules/a-b-c [8] ./adminPageA.js 1:0-26
        cjs require ./modules/a-b-c [9] ./adminPageB.js 1:0-26
        cjs require ./modules/a-b-c [10] ./adminPageC.js 1:0-26
    [4] ./modules/a-b.js 0 bytes {7} [built]
        cjs require ./modules/a-b [5] ./pageA.js 2:0-24
        cjs require ./modules/a-b [6] ./pageB.js 2:0-24
chunk    {8} c-commons.js (c-commons) 0 bytes [entry] [rendered]
    [0] ./modules/a-b-c.js 0 bytes {7} {8} [built]
        cjs require ./modules/a-b-c [5] ./pageA.js 1:0-26
        cjs require ./modules/a-b-c [6] ./pageB.js 1:0-26
        cjs require ./modules/a-b-c [7] ./pageC.js 1:0-26
        cjs require ./modules/a-b-c [8] ./adminPageA.js 1:0-26
        cjs require ./modules/a-b-c [9] ./adminPageB.js 1:0-26
        cjs require ./modules/a-b-c [10] ./adminPageC.js 1:0-26
```

## Minimized (uglify-js, no zip)

```
Hash: aae3eb52e46997530381
Version: webpack next
           Asset       Size  Chunks             Chunk Names
        pageC.js  139 bytes       0  [emitted]  pageC
        pageB.js  122 bytes       1  [emitted]  pageB
        pageA.js  122 bytes       2  [emitted]  pageA
   adminPageC.js  121 bytes    3, 4  [emitted]  adminPageC
admin-commons.js   77 bytes       4  [emitted]  admin-commons
   adminPageB.js  101 bytes       5  [emitted]  adminPageB
   adminPageA.js  101 bytes       6  [emitted]  adminPageA
      commons.js   1.74 KiB    7, 8  [emitted]  commons
    c-commons.js   1.72 KiB       8  [emitted]  c-commons
Entrypoint pageA = commons.js pageA.js
Entrypoint pageB = commons.js pageB.js
Entrypoint pageC = c-commons.js pageC.js
Entrypoint adminPageA = commons.js admin-commons.js adminPageA.js
Entrypoint adminPageB = commons.js admin-commons.js adminPageB.js
Entrypoint adminPageC = c-commons.js adminPageC.js
chunk    {0} pageC.js (pageC) 83 bytes {8} [initial] [rendered]
    > pageC [7] ./pageC.js 
    [2] ./modules/a-c.js 0 bytes {0} {2} [built]
        cjs require ./modules/a-c [5] ./pageA.js 3:0-24
        cjs require ./modules/a-c [7] ./pageC.js 3:0-24
    [3] ./modules/b-c.js 0 bytes {0} {1} [built]
        cjs require ./modules/b-c [6] ./pageB.js 3:0-24
        cjs require ./modules/b-c [7] ./pageC.js 2:0-24
    [7] ./pageC.js 83 bytes {0} [built]
        single entry ./pageC  pageC
chunk    {1} pageB.js (pageB) 83 bytes {7} [initial] [rendered]
    > pageB [6] ./pageB.js 
    [3] ./modules/b-c.js 0 bytes {0} {1} [built]
        cjs require ./modules/b-c [6] ./pageB.js 3:0-24
        cjs require ./modules/b-c [7] ./pageC.js 2:0-24
    [6] ./pageB.js 83 bytes {1} [built]
        single entry ./pageB  pageB
chunk    {2} pageA.js (pageA) 83 bytes {7} [initial] [rendered]
    > pageA [5] ./pageA.js 
    [2] ./modules/a-c.js 0 bytes {0} {2} [built]
        cjs require ./modules/a-c [5] ./pageA.js 3:0-24
        cjs require ./modules/a-c [7] ./pageC.js 3:0-24
    [5] ./pageA.js 83 bytes {2} [built]
        single entry ./pageA  pageA
chunk    {3} adminPageC.js (adminPageC) 56 bytes {8} [initial] [rendered]
    > adminPageC [10] ./adminPageC.js 
    [1] ./modules/admin.js 0 bytes {3} {4} [built]
        cjs require ./modules/admin [8] ./adminPageA.js 2:0-26
        cjs require ./modules/admin [9] ./adminPageB.js 2:0-26
        cjs require ./modules/admin [10] ./adminPageC.js 2:0-26
   [10] ./adminPageC.js 56 bytes {3} [built]
        single entry ./adminPageC  adminPageC
chunk    {4} admin-commons.js (admin-commons) 0 bytes {7} [initial] [rendered]
    [1] ./modules/admin.js 0 bytes {3} {4} [built]
        cjs require ./modules/admin [8] ./adminPageA.js 2:0-26
        cjs require ./modules/admin [9] ./adminPageB.js 2:0-26
        cjs require ./modules/admin [10] ./adminPageC.js 2:0-26
chunk    {5} adminPageB.js (adminPageB) 56 bytes {4} [initial] [rendered]
    > adminPageB [9] ./adminPageB.js 
    [9] ./adminPageB.js 56 bytes {5} [built]
        single entry ./adminPageB  adminPageB
chunk    {6} adminPageA.js (adminPageA) 56 bytes {4} [initial] [rendered]
    > adminPageA [8] ./adminPageA.js 
    [8] ./adminPageA.js 56 bytes {6} [built]
        single entry ./adminPageA  adminPageA
chunk    {7} commons.js (commons) 0 bytes [entry] [rendered]
    [0] ./modules/a-b-c.js 0 bytes {7} {8} [built]
        cjs require ./modules/a-b-c [5] ./pageA.js 1:0-26
        cjs require ./modules/a-b-c [6] ./pageB.js 1:0-26
        cjs require ./modules/a-b-c [7] ./pageC.js 1:0-26
        cjs require ./modules/a-b-c [8] ./adminPageA.js 1:0-26
        cjs require ./modules/a-b-c [9] ./adminPageB.js 1:0-26
        cjs require ./modules/a-b-c [10] ./adminPageC.js 1:0-26
    [4] ./modules/a-b.js 0 bytes {7} [built]
        cjs require ./modules/a-b [5] ./pageA.js 2:0-24
        cjs require ./modules/a-b [6] ./pageB.js 2:0-24
chunk    {8} c-commons.js (c-commons) 0 bytes [entry] [rendered]
    [0] ./modules/a-b-c.js 0 bytes {7} {8} [built]
        cjs require ./modules/a-b-c [5] ./pageA.js 1:0-26
        cjs require ./modules/a-b-c [6] ./pageB.js 1:0-26
        cjs require ./modules/a-b-c [7] ./pageC.js 1:0-26
        cjs require ./modules/a-b-c [8] ./adminPageA.js 1:0-26
        cjs require ./modules/a-b-c [9] ./adminPageB.js 1:0-26
        cjs require ./modules/a-b-c [10] ./adminPageC.js 1:0-26
```
