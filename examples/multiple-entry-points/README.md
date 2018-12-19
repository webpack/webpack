This example shows how to use multiple entry points with a commons chunk.

In this example you have two (HTML) pages `pageA` and `pageB`. You want to create individual bundles for each page. In addition to this you want to create a shared bundle that contains all modules used in both pages (assuming there are many/big modules in common). The pages also use Code Splitting to load a less used part of the features on demand.

You can see how to define multiple entry points via the `entry` option.

You can use

You can see the output files:

* `commons.js` contains:
  * module `common.js` which is used in both pages
* `pageA.js` contains: (`pageB.js` is similar)
  * the module system
  * chunk loading logic
  * the entry point `pageA.js`
  * it would contain any other module that is only used by `pageA`
* `1.js` is an additional chunk which is used by both pages. It contains:
  * module `shared.js`

You can also see the info that is printed to console. It shows among others:

* the generated files
* the chunks with file, name and id
  * see lines starting with `chunk`
* the modules that are in the chunks
* the reasons why the modules are included
* the reasons why a chunk is created
  * see lines starting with `>`

# pageA.js

``` javascript
var common = require("./common");
require(["./shared"], function(shared) {
	shared("This is page A");
});
```

# pageB.js

``` javascript
var common = require("./common");
require.ensure(["./shared"], function(require) {
	var shared = require("./shared");
	shared("This is page B");
});
```

# webpack.config.js

``` javascript
module.exports = {
	// mode: "development || "production",
	entry: {
		pageA: "./pageA",
		pageB: "./pageB"
	},
	optimization: {
		splitChunks: {
			cacheGroups: {
				commons: {
					name: "commons",
					chunks: "initial",
					minChunks: 2,
					minSize: 0
				}
			}
		},
		chunkIds: "deterministic" // To keep filename consistent between different modes (for example building only)
	}
};
```

# pageA.html

``` html
<html>
	<head></head>
	<body>
		<script src="js/commons.js" charset="utf-8"></script>
		<script src="js/pageA.bundle.js" charset="utf-8"></script>
	</body>
</html>
```

# dist/commons.js

``` javascript
(window["webpackJsonp"] = window["webpackJsonp"] || []).push([[987],[
/* 0 */,
/* 1 */
/*!*******************!*\
  !*** ./common.js ***!
  \*******************/
/*! no static exports found */
/*! runtime requirements: module */
/***/ (function(module) {

module.exports = "Common";

/***/ })
]]);
```

# dist/pageA.js

<details><summary><code>/******/ (function(modules) { /* webpackBootstrap */ })</code></summary>

``` javascript
/******/ (function(modules, runtime) { // webpackBootstrap
/******/ 	"use strict";
/******/ 	// The module cache
/******/ 	var installedModules = {};
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
/******/ 	// initialize runtime
/******/ 	runtime(__webpack_require__);
/******/
/******/ 	// run modules when ready
/******/ 	return __webpack_require__.x();
/******/ })
/************************************************************************/
```

</details>

``` javascript
/******/ ([
/* 0 */
/*!******************!*\
  !*** ./pageA.js ***!
  \******************/
/*! no static exports found */
/*! runtime requirements: __webpack_require__, __webpack_require__.e, __webpack_require__.oe */
/***/ (function(__unusedmodule, __unusedexports, __webpack_require__) {

var common = __webpack_require__(/*! ./common */ 1);
__webpack_require__.e(/*! AMD require */ 406).then(function() { var __WEBPACK_AMD_REQUIRE_ARRAY__ = [__webpack_require__(/*! ./shared */ 3)]; (function(shared) {
	shared("This is page A");
}).apply(null, __WEBPACK_AMD_REQUIRE_ARRAY__);}).catch(__webpack_require__.oe);

/***/ })
/******/ ],
```

<details><summary><code>function(__webpack_require__) { /* webpackRuntimeModules */ });</code></summary>

``` js
/******/ function(__webpack_require__) { // webpackRuntimeModules
/******/ 	"use strict";
/******/ 
/******/ 	/* webpack/runtime/ensure chunk */
/******/ 	!function() {
/******/ 		__webpack_require__.f = {};
/******/ 		// This file contains only the entry chunk.
/******/ 		// The chunk loading function for additional chunks
/******/ 		__webpack_require__.e = function requireEnsure(chunkId) {
/******/ 			return Promise.all(Object.keys(__webpack_require__.f).reduce(function(promises, key) { __webpack_require__.f[key](chunkId, promises); return promises; }, []));
/******/ 		};
/******/ 	}();
/******/ 	
/******/ 	/* webpack/runtime/publicPath */
/******/ 	!function() {
/******/ 		__webpack_require__.p = "dist/";
/******/ 	}();
/******/ 	
/******/ 	/* webpack/runtime/get javascript chunk filename */
/******/ 	!function() {
/******/ 		__webpack_require__.u = function(chunkId) {
/******/ 			return "" + chunkId + ".js";
/******/ 		};
/******/ 	}();
/******/ 	
/******/ 	/* webpack/runtime/jsonp chunk loading */
/******/ 	!function() {
/******/ 		
/******/ 		
/******/ 		// object to store loaded and loading chunks
/******/ 		// undefined = chunk not loaded, null = chunk preloaded/prefetched
/******/ 		// Promise = chunk loading, 0 = chunk loaded
/******/ 		var installedChunks = {
/******/ 			641: 0
/******/ 		};
/******/ 		
/******/ 		var deferredModules = [
/******/ 			[0,987]
/******/ 		];
/******/ 		
/******/ 		__webpack_require__.f.j = function(chunkId, promises) {
/******/ 			// JSONP chunk loading for javascript
/******/ 			var installedChunkData = installedChunks[chunkId];
/******/ 			if(installedChunkData !== 0) { // 0 means "already installed".
/******/ 		
/******/ 				// a Promise means "currently loading".
/******/ 				if(installedChunkData) {
/******/ 					promises.push(installedChunkData[2]);
/******/ 				} else {
/******/ 					// setup Promise in chunk cache
/******/ 					var promise = new Promise(function(resolve, reject) {
/******/ 						installedChunkData = installedChunks[chunkId] = [resolve, reject];
/******/ 					});
/******/ 					promises.push(installedChunkData[2] = promise);
/******/ 		
/******/ 					// start chunk loading
/******/ 					var url = __webpack_require__.p + __webpack_require__.u(chunkId);
/******/ 					var loadingEnded = function() { if(installedChunks[chunkId]) return installedChunks[chunkId][1]; if(installedChunks[chunkId] !== 0) installedChunks[chunkId] = undefined; };
/******/ 					var script = document.createElement('script');
/******/ 					var onScriptComplete;
/******/ 		
/******/ 					script.charset = 'utf-8';
/******/ 					script.timeout = 120;
/******/ 					if (__webpack_require__.nc) {
/******/ 						script.setAttribute("nonce", __webpack_require__.nc);
/******/ 					}
/******/ 					script.src = url;
/******/ 		
/******/ 					onScriptComplete = function (event) {
/******/ 						// avoid mem leaks in IE.
/******/ 						script.onerror = script.onload = null;
/******/ 						clearTimeout(timeout);
/******/ 						var reportError = loadingEnded();
/******/ 						if(reportError) {
/******/ 							var errorType = event && (event.type === 'load' ? 'missing' : event.type);
/******/ 							var realSrc = event && event.target && event.target.src;
/******/ 							var error = new Error('Loading chunk ' + chunkId + ' failed.\n(' + errorType + ': ' + realSrc + ')');
/******/ 							error.type = errorType;
/******/ 							error.request = realSrc;
/******/ 							reportError(error);
/******/ 						}
/******/ 					};
/******/ 					var timeout = setTimeout(function(){
/******/ 						onScriptComplete({ type: 'timeout', target: script });
/******/ 					}, 120000);
/******/ 					script.onerror = script.onload = onScriptComplete;
/******/ 					document.head.appendChild(script);
/******/ 		
/******/ 					// no HMR
/******/ 				}
/******/ 			}
/******/ 		
/******/ 			// no chunk preloading needed
/******/ 		};
/******/ 		
/******/ 		// no prefetching
/******/ 		
/******/ 		// no HMR
/******/ 		
/******/ 		// no HMR manifest
/******/ 		
/******/ 		var checkDeferredModules = function() {};
/******/ 		function checkDeferredModulesImpl() {
/******/ 			var result;
/******/ 			for(var i = 0; i < deferredModules.length; i++) {
/******/ 				var deferredModule = deferredModules[i];
/******/ 				var fulfilled = true;
/******/ 				for(var j = 1; j < deferredModule.length; j++) {
/******/ 					var depId = deferredModule[j];
/******/ 					if(installedChunks[depId] !== 0) fulfilled = false;
/******/ 				}
/******/ 				if(fulfilled) {
/******/ 					deferredModules.splice(i--, 1);
/******/ 					result = __webpack_require__(__webpack_require__.s = deferredModule[0]);
/******/ 				}
/******/ 			}
/******/ 			return result;
/******/ 		}
/******/ 		__webpack_require__.x = function() {
/******/ 			return (checkDeferredModules = checkDeferredModulesImpl)();
/******/ 		};
/******/ 		
/******/ 		// install a JSONP callback for chunk loading
/******/ 		function webpackJsonpCallback(data) {
/******/ 			var chunkIds = data[0];
/******/ 			var moreModules = data[1];
/******/ 			var executeModules = data[2];
/******/ 			var runtime = data[3];
/******/ 		
/******/ 			// add "moreModules" to the modules object,
/******/ 			// then flag all "chunkIds" as loaded and fire callback
/******/ 			var moduleId, chunkId, i = 0, resolves = [];
/******/ 			for(;i < chunkIds.length; i++) {
/******/ 				chunkId = chunkIds[i];
/******/ 				if(installedChunks[chunkId]) {
/******/ 					resolves.push(installedChunks[chunkId][0]);
/******/ 				}
/******/ 				installedChunks[chunkId] = 0;
/******/ 			}
/******/ 			for(moduleId in moreModules) {
/******/ 				if(Object.prototype.hasOwnProperty.call(moreModules, moduleId)) {
/******/ 					__webpack_require__.m[moduleId] = moreModules[moduleId];
/******/ 				}
/******/ 			}
/******/ 			if(runtime) runtime(__webpack_require__);
/******/ 			if(parentJsonpFunction) parentJsonpFunction(data);
/******/ 		
/******/ 			while(resolves.length) {
/******/ 				resolves.shift()();
/******/ 			}
/******/ 		
/******/ 			// add entry modules from loaded chunk to deferred list
/******/ 			if(executeModules) deferredModules.push.apply(deferredModules, executeModules);
/******/ 		
/******/ 			// run deferred modules when all chunks ready
/******/ 			return checkDeferredModules();
/******/ 		};
/******/ 		
/******/ 		var jsonpArray = window["webpackJsonp"] = window["webpackJsonp"] || [];
/******/ 		var oldJsonpFunction = jsonpArray.push.bind(jsonpArray);
/******/ 		jsonpArray.push = webpackJsonpCallback;
/******/ 		jsonpArray = jsonpArray.slice();
/******/ 		for(var i = 0; i < jsonpArray.length; i++) webpackJsonpCallback(jsonpArray[i]);
/******/ 		var parentJsonpFunction = oldJsonpFunction;
/******/ 	}();
/******/ 	
/******/ }
);
```

</details>


# dist/pageB.js

``` javascript
/******/ (function(modules, runtime) { // webpackBootstrap
/******/ 	"use strict";
/******/ 	// The module cache
/******/ 	var installedModules = {};
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
/******/ 	// initialize runtime
/******/ 	runtime(__webpack_require__);
/******/
/******/ 	// run modules when ready
/******/ 	return __webpack_require__.x();
/******/ })
/************************************************************************/
/******/ ({

/***/ 2:
/*!******************!*\
  !*** ./pageB.js ***!
  \******************/
/*! no static exports found */
/*! runtime requirements: __webpack_require__, __webpack_require__.e */
/***/ (function(__unusedmodule, __unusedexports, __webpack_require__) {

var common = __webpack_require__(/*! ./common */ 1);
__webpack_require__.e(/*! require.ensure */ 406).then((function(require) {
	var shared = __webpack_require__(/*! ./shared */ 3);
	shared("This is page B");
}).bind(null, __webpack_require__)).catch(__webpack_require__.oe);

/***/ })

/******/ },
/******/ function(__webpack_require__) { // webpackRuntimeModules
/******/ 	"use strict";
/******/ 
/******/ 	/* webpack/runtime/ensure chunk */
/******/ 	!function() {
/******/ 		__webpack_require__.f = {};
/******/ 		// This file contains only the entry chunk.
/******/ 		// The chunk loading function for additional chunks
/******/ 		__webpack_require__.e = function requireEnsure(chunkId) {
/******/ 			return Promise.all(Object.keys(__webpack_require__.f).reduce(function(promises, key) { __webpack_require__.f[key](chunkId, promises); return promises; }, []));
/******/ 		};
/******/ 	}();
/******/ 	
/******/ 	/* webpack/runtime/publicPath */
/******/ 	!function() {
/******/ 		__webpack_require__.p = "dist/";
/******/ 	}();
/******/ 	
/******/ 	/* webpack/runtime/get javascript chunk filename */
/******/ 	!function() {
/******/ 		__webpack_require__.u = function(chunkId) {
/******/ 			return "" + chunkId + ".js";
/******/ 		};
/******/ 	}();
/******/ 	
/******/ 	/* webpack/runtime/jsonp chunk loading */
/******/ 	!function() {
/******/ 		
/******/ 		
/******/ 		// object to store loaded and loading chunks
/******/ 		// undefined = chunk not loaded, null = chunk preloaded/prefetched
/******/ 		// Promise = chunk loading, 0 = chunk loaded
/******/ 		var installedChunks = {
/******/ 			791: 0
/******/ 		};
/******/ 		
/******/ 		var deferredModules = [
/******/ 			[2,987]
/******/ 		];
/******/ 		
/******/ 		__webpack_require__.f.j = function(chunkId, promises) {
/******/ 			// JSONP chunk loading for javascript
/******/ 			var installedChunkData = installedChunks[chunkId];
/******/ 			if(installedChunkData !== 0) { // 0 means "already installed".
/******/ 		
/******/ 				// a Promise means "currently loading".
/******/ 				if(installedChunkData) {
/******/ 					promises.push(installedChunkData[2]);
/******/ 				} else {
/******/ 					// setup Promise in chunk cache
/******/ 					var promise = new Promise(function(resolve, reject) {
/******/ 						installedChunkData = installedChunks[chunkId] = [resolve, reject];
/******/ 					});
/******/ 					promises.push(installedChunkData[2] = promise);
/******/ 		
/******/ 					// start chunk loading
/******/ 					var url = __webpack_require__.p + __webpack_require__.u(chunkId);
/******/ 					var loadingEnded = function() { if(installedChunks[chunkId]) return installedChunks[chunkId][1]; if(installedChunks[chunkId] !== 0) installedChunks[chunkId] = undefined; };
/******/ 					var script = document.createElement('script');
/******/ 					var onScriptComplete;
/******/ 		
/******/ 					script.charset = 'utf-8';
/******/ 					script.timeout = 120;
/******/ 					if (__webpack_require__.nc) {
/******/ 						script.setAttribute("nonce", __webpack_require__.nc);
/******/ 					}
/******/ 					script.src = url;
/******/ 		
/******/ 					onScriptComplete = function (event) {
/******/ 						// avoid mem leaks in IE.
/******/ 						script.onerror = script.onload = null;
/******/ 						clearTimeout(timeout);
/******/ 						var reportError = loadingEnded();
/******/ 						if(reportError) {
/******/ 							var errorType = event && (event.type === 'load' ? 'missing' : event.type);
/******/ 							var realSrc = event && event.target && event.target.src;
/******/ 							var error = new Error('Loading chunk ' + chunkId + ' failed.\n(' + errorType + ': ' + realSrc + ')');
/******/ 							error.type = errorType;
/******/ 							error.request = realSrc;
/******/ 							reportError(error);
/******/ 						}
/******/ 					};
/******/ 					var timeout = setTimeout(function(){
/******/ 						onScriptComplete({ type: 'timeout', target: script });
/******/ 					}, 120000);
/******/ 					script.onerror = script.onload = onScriptComplete;
/******/ 					document.head.appendChild(script);
/******/ 		
/******/ 					// no HMR
/******/ 				}
/******/ 			}
/******/ 		
/******/ 			// no chunk preloading needed
/******/ 		};
/******/ 		
/******/ 		// no prefetching
/******/ 		
/******/ 		// no HMR
/******/ 		
/******/ 		// no HMR manifest
/******/ 		
/******/ 		var checkDeferredModules = function() {};
/******/ 		function checkDeferredModulesImpl() {
/******/ 			var result;
/******/ 			for(var i = 0; i < deferredModules.length; i++) {
/******/ 				var deferredModule = deferredModules[i];
/******/ 				var fulfilled = true;
/******/ 				for(var j = 1; j < deferredModule.length; j++) {
/******/ 					var depId = deferredModule[j];
/******/ 					if(installedChunks[depId] !== 0) fulfilled = false;
/******/ 				}
/******/ 				if(fulfilled) {
/******/ 					deferredModules.splice(i--, 1);
/******/ 					result = __webpack_require__(__webpack_require__.s = deferredModule[0]);
/******/ 				}
/******/ 			}
/******/ 			return result;
/******/ 		}
/******/ 		__webpack_require__.x = function() {
/******/ 			return (checkDeferredModules = checkDeferredModulesImpl)();
/******/ 		};
/******/ 		
/******/ 		// install a JSONP callback for chunk loading
/******/ 		function webpackJsonpCallback(data) {
/******/ 			var chunkIds = data[0];
/******/ 			var moreModules = data[1];
/******/ 			var executeModules = data[2];
/******/ 			var runtime = data[3];
/******/ 		
/******/ 			// add "moreModules" to the modules object,
/******/ 			// then flag all "chunkIds" as loaded and fire callback
/******/ 			var moduleId, chunkId, i = 0, resolves = [];
/******/ 			for(;i < chunkIds.length; i++) {
/******/ 				chunkId = chunkIds[i];
/******/ 				if(installedChunks[chunkId]) {
/******/ 					resolves.push(installedChunks[chunkId][0]);
/******/ 				}
/******/ 				installedChunks[chunkId] = 0;
/******/ 			}
/******/ 			for(moduleId in moreModules) {
/******/ 				if(Object.prototype.hasOwnProperty.call(moreModules, moduleId)) {
/******/ 					__webpack_require__.m[moduleId] = moreModules[moduleId];
/******/ 				}
/******/ 			}
/******/ 			if(runtime) runtime(__webpack_require__);
/******/ 			if(parentJsonpFunction) parentJsonpFunction(data);
/******/ 		
/******/ 			while(resolves.length) {
/******/ 				resolves.shift()();
/******/ 			}
/******/ 		
/******/ 			// add entry modules from loaded chunk to deferred list
/******/ 			if(executeModules) deferredModules.push.apply(deferredModules, executeModules);
/******/ 		
/******/ 			// run deferred modules when all chunks ready
/******/ 			return checkDeferredModules();
/******/ 		};
/******/ 		
/******/ 		var jsonpArray = window["webpackJsonp"] = window["webpackJsonp"] || [];
/******/ 		var oldJsonpFunction = jsonpArray.push.bind(jsonpArray);
/******/ 		jsonpArray.push = webpackJsonpCallback;
/******/ 		jsonpArray = jsonpArray.slice();
/******/ 		for(var i = 0; i < jsonpArray.length; i++) webpackJsonpCallback(jsonpArray[i]);
/******/ 		var parentJsonpFunction = oldJsonpFunction;
/******/ 	}();
/******/ 	
/******/ }
);
```

# dist/406.js

``` javascript
(window["webpackJsonp"] = window["webpackJsonp"] || []).push([[406],{

/***/ 3:
/*!*******************!*\
  !*** ./shared.js ***!
  \*******************/
/*! no static exports found */
/*! runtime requirements: __webpack_require__, module */
/***/ (function(module, __unusedexports, __webpack_require__) {

var common = __webpack_require__(/*! ./common */ 1);
module.exports = function(msg) {
	console.log(msg);
};

/***/ })

}]);
```

# Info

## Unoptimized

```
Hash: 0a1b2c3d4e5f6a7b8c9d
Version: webpack 5.0.0-next
     Asset       Size  Chunks             Chunk Names
    406.js  430 bytes   {406}  [emitted]
commons.js  296 bytes   {987}  [emitted]  commons
  pageA.js   8.49 KiB   {641}  [emitted]  pageA
  pageB.js   8.42 KiB   {791}  [emitted]  pageB
Entrypoint pageA = commons.js pageA.js
Entrypoint pageB = commons.js pageB.js
chunk {406} 406.js 88 bytes <{641}> <{791}> <{987}> [rendered]
    > ./shared [0] ./pageA.js 2:0-4:2
    > [2] ./pageB.js 2:0-5:2
 [3] ./shared.js 88 bytes {406} [built]
     [used exports unknown]
     amd require ./shared [0] ./pageA.js 2:0-4:2
     require.ensure item ./shared [2] ./pageB.js 2:0-5:2
     cjs require ./shared [2] ./pageB.js 3:14-33
chunk {641} pageA.js (pageA) 105 bytes (javascript) 4.5 KiB (runtime) ={987}= >{406}< [entry] [rendered]
    > ./pageA pageA
 [0] ./pageA.js 105 bytes {641} [built]
     [used exports unknown]
     entry ./pageA pageA
     + 4 hidden chunk modules
chunk {791} pageB.js (pageB) 148 bytes (javascript) 4.5 KiB (runtime) ={987}= >{406}< [entry] [rendered]
    > ./pageB pageB
 [2] ./pageB.js 148 bytes {791} [built]
     [used exports unknown]
     entry ./pageB pageB
     + 4 hidden chunk modules
chunk {987} commons.js (commons) 26 bytes ={641}= ={791}= >{406}< [initial] [rendered] split chunk (cache group: commons) (name: commons)
    > ./pageA pageA
    > ./pageB pageB
 [1] ./common.js 26 bytes {987} [built]
     [used exports unknown]
     cjs require ./common [0] ./pageA.js 1:13-32
     cjs require ./common [2] ./pageB.js 1:13-32
     cjs require ./common [3] ./shared.js 1:13-32
```

## Production mode

```
Hash: 0a1b2c3d4e5f6a7b8c9d
Version: webpack 5.0.0-next
     Asset       Size  Chunks             Chunk Names
    406.js  128 bytes   {406}  [emitted]
commons.js   98 bytes   {987}  [emitted]  commons
  pageA.js   1.73 KiB   {641}  [emitted]  pageA
  pageB.js   1.71 KiB   {791}  [emitted]  pageB
Entrypoint pageA = commons.js pageA.js
Entrypoint pageB = commons.js pageB.js
chunk {406} 406.js 88 bytes <{641}> <{791}> <{987}> [rendered]
    > ./shared [953] ./pageA.js 2:0-4:2
    > [954] ./pageB.js 2:0-5:2
 [406] ./shared.js 88 bytes {406} [built]
       amd require ./shared [953] ./pageA.js 2:0-4:2
       require.ensure item ./shared [954] ./pageB.js 2:0-5:2
       cjs require ./shared [954] ./pageB.js 3:14-33
chunk {641} pageA.js (pageA) 105 bytes (javascript) 4.5 KiB (runtime) ={987}= >{406}< [entry] [rendered]
    > ./pageA pageA
 [953] ./pageA.js 105 bytes {641} [built]
       entry ./pageA pageA
     + 4 hidden chunk modules
chunk {791} pageB.js (pageB) 148 bytes (javascript) 4.5 KiB (runtime) ={987}= >{406}< [entry] [rendered]
    > ./pageB pageB
 [954] ./pageB.js 148 bytes {791} [built]
       entry ./pageB pageB
     + 4 hidden chunk modules
chunk {987} commons.js (commons) 26 bytes ={641}= ={791}= >{406}< [initial] [rendered] split chunk (cache group: commons) (name: commons)
    > ./pageA pageA
    > ./pageB pageB
 [280] ./common.js 26 bytes {987} [built]
       cjs require ./common [406] ./shared.js 1:13-32
       cjs require ./common [953] ./pageA.js 1:13-32
       cjs require ./common [954] ./pageB.js 1:13-32
```
