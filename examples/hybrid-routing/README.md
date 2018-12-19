# webpack.config.js

``` javascript
var path = require("path");
module.exports = {
	// mode: "development || "production",
	entry: {
		// The entry points for the pages
		// They also contains router
		pageA: ["./aEntry", "./router"],
		pageB: ["./bEntry", "./router"]
	},
	output: {
		path: path.join(__dirname, "dist"),
		publicPath: "js/",
		filename: "[name].bundle.js",
		chunkFilename: "[name].chunk.js"
	},
	optimization: {
		// Extract common modules from initial chunks too
		// This is optional, but good for performance.
		splitChunks: {
			chunks: "all",
			minSize: 0 // This example is too small
		},
		chunkIds: "named" // To keep filename consistent between different modes (for example building only)
	}
};
```

# aEntry.js

``` javascript
// Just show the page "a"
var render = require("./render");
render(require("./aPage"));
```

`bEntry.js` is similar. You may want to use a loader to generate this file.

# aPage.js

``` javascript
module.exports = function() {
	return "This is page A.";
};
```

`bEntry.js` is similar.

# router.js

``` javascript
var render = require("./render");

// Event when another page should be opened
// Maybe hook click on links, hashchange or popstate
window.onLinkToPage = function onLinkToPage(name) { // name is "a" or "b"
	// require the page with a dynamic require

	// It's important that this require only matches the pages
	//  elsewise there is blood in the bundle. Here this is done with a
	//  specific file prefix. It's also possible to use a directory,
	//  overwriting the RegExp with the ContextReplacementPlugin, or
	//  using the require.context method.

	// This line may throw a exception on runtime if the page wasn't found.
	import(/* webpackChunkName: "[request]" */`./${name}Page`).then(page => {;
		render(page.default);
	});
}
```

# pageA.html

``` html
<html>
	<head></head>
	<body>
		<script async src="dist/pageA~pageB.chunk.js" charset="utf-8"></script>
		<script async src="dist/aPage.chunk.js" charset="utf-8"></script>
		<script async src="dist/pageA.bundle.js" charset="utf-8"></script>
	</body>
</html>
```

# dist/router_js.bundle.js

``` javascript
(window["webpackJsonp"] = window["webpackJsonp"] || []).push([["router_js"],[
/* 0 */,
/* 1 */
/*!*******************!*\
  !*** ./render.js ***!
  \*******************/
/*! no static exports found */
/*! runtime requirements: module */
/***/ (function(module) {

module.exports = function(page) {
	console.log(page());
};

/***/ }),
/* 2 */,
/* 3 */
/*!*******************!*\
  !*** ./router.js ***!
  \*******************/
/*! no static exports found */
/*! runtime requirements: __webpack_require__ */
/***/ (function(__unusedmodule, __unusedexports, __webpack_require__) {

var render = __webpack_require__(/*! ./render */ 1);

// Event when another page should be opened
// Maybe hook click on links, hashchange or popstate
window.onLinkToPage = function onLinkToPage(name) { // name is "a" or "b"
	// require the page with a dynamic require

	// It's important that this require only matches the pages
	//  elsewise there is blood in the bundle. Here this is done with a
	//  specific file prefix. It's also possible to use a directory,
	//  overwriting the RegExp with the ContextReplacementPlugin, or
	//  using the require.context method.

	// This line may throw a exception on runtime if the page wasn't found.
	__webpack_require__(4)(`./${name}Page`).then(page => {;
		render(page.default);
	});
}


/***/ }),
/* 4 */
/*!********************************************!*\
  !*** . lazy ^\.\/.*Page$ namespace object ***!
  \********************************************/
/*! no static exports found */
/*! runtime requirements: module, __webpack_require__, __webpack_require__.e, __webpack_require__.t, __webpack_require__.d, __webpack_require__.r */
/***/ (function(module, __unusedexports, __webpack_require__) {

var map = {
	"./aPage": [
		2,
		"aPage"
	],
	"./bPage": [
		6,
		"bPage"
	]
};
function webpackAsyncContext(req) {
	var ids = map[req];
	if(!ids) {
		return Promise.resolve().then(function() {
			var e = new Error("Cannot find module '" + req + "'");
			e.code = 'MODULE_NOT_FOUND';
			throw e;
		});
	}
	return __webpack_require__.e(ids[1]).then(function() {
		var id = ids[0];
		return __webpack_require__.t(id, 7);
	});
}
webpackAsyncContext.keys = function webpackAsyncContextKeys() {
	return Object.keys(map);
};
webpackAsyncContext.id = 4;
module.exports = webpackAsyncContext;

/***/ })
]]);
```

# dist/pageA.bundle.js

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
/*!*******************!*\
  !*** ./aEntry.js ***!
  \*******************/
/*! no static exports found */
/*! runtime requirements: __webpack_require__ */
/***/ (function(__unusedmodule, __unusedexports, __webpack_require__) {

// Just show the page "a"
var render = __webpack_require__(/*! ./render */ 1);
render(__webpack_require__(/*! ./aPage */ 2));

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
/******/ 	/* webpack/runtime/create fake namespace object */
/******/ 	!function() {
/******/ 		// create a fake namespace object
/******/ 		// mode & 1: value is a module id, require it
/******/ 		// mode & 2: merge all properties of value into the ns
/******/ 		// mode & 4: return value when already ns object
/******/ 		// mode & 8|1: behave like require
/******/ 		__webpack_require__.t = function(value, mode) {
/******/ 			if(mode & 1) value = this(value);
/******/ 			if(mode & 8) return value;
/******/ 			if((mode & 4) && typeof value === 'object' && value && value.__esModule) return value;
/******/ 			var ns = Object.create(null);
/******/ 			__webpack_require__.r(ns);
/******/ 			Object.defineProperty(ns, 'default', { enumerable: true, value: value });
/******/ 			if(mode & 2 && typeof value != 'string') for(var key in value) __webpack_require__.d(ns, key, function(key) { return value[key]; }.bind(null, key));
/******/ 			return ns;
/******/ 		};
/******/ 	}();
/******/ 	
/******/ 	/* webpack/runtime/define property getter */
/******/ 	!function() {
/******/ 		// define getter function for harmony exports
/******/ 		var hasOwnProperty = Object.prototype.hasOwnProperty;
/******/ 		__webpack_require__.d = function(exports, name, getter) {
/******/ 			if(!hasOwnProperty.call(exports, name)) {
/******/ 				Object.defineProperty(exports, name, { enumerable: true, get: getter });
/******/ 			}
/******/ 		};
/******/ 	}();
/******/ 	
/******/ 	/* webpack/runtime/make namespace object */
/******/ 	!function() {
/******/ 		// define __esModule on exports
/******/ 		__webpack_require__.r = function(exports) {
/******/ 			if(typeof Symbol !== 'undefined' && Symbol.toStringTag) {
/******/ 				Object.defineProperty(exports, Symbol.toStringTag, { value: 'Module' });
/******/ 			}
/******/ 			Object.defineProperty(exports, '__esModule', { value: true });
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
/******/ 			return "" + chunkId + ".chunk.js";
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
/******/ 			"pageA": 0
/******/ 		};
/******/ 		
/******/ 		var deferredModules = [
/******/ 			[0,"router_js","aPage"],
/******/ 			[3,"router_js","aPage"]
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


# dist/aPage.chunk.js

``` javascript
(window["webpackJsonp"] = window["webpackJsonp"] || []).push([["aPage"],{

/***/ 2:
/*!******************!*\
  !*** ./aPage.js ***!
  \******************/
/*! no static exports found */
/*! runtime requirements: module */
/***/ (function(module) {

module.exports = function() {
	return "This is page A.";
};

/***/ })

}]);
```

# Info

## Unoptimized

```
Hash: 0a1b2c3d4e5f6a7b8c9d
Version: webpack 5.0.0-next
              Asset       Size       Chunks             Chunk Names
     aPage.chunk.js  324 bytes      {aPage}  [emitted]  aPage
     bPage.chunk.js  324 bytes      {bPage}  [emitted]  bPage
    pageA.bundle.js   10.2 KiB      {pageA}  [emitted]  pageA
    pageB.bundle.js   10.2 KiB      {pageB}  [emitted]  pageB
router_js.bundle.js   2.27 KiB  {router_js}  [emitted]
Entrypoint pageA = router_js.bundle.js aPage.chunk.js pageA.bundle.js
Entrypoint pageB = router_js.bundle.js bPage.chunk.js pageB.bundle.js
chunk {aPage} aPage.chunk.js (aPage) 59 bytes <{bPage}> <{pageB}> <{router_js}> ={pageA}= ={router_js}= >{bPage}< [initial] [rendered] reused as split chunk (cache group: default)
    > ./aPage [4] . lazy ^\.\/.*Page$ namespace object ./aPage
    > ./aEntry pageA
    > ./router pageA
 [2] ./aPage.js 59 bytes {aPage} [built]
     [used exports unknown]
     cjs require ./aPage [0] ./aEntry.js 3:7-25
     context element ./aPage [4] . lazy ^\.\/.*Page$ namespace object ./aPage
chunk {bPage} bPage.chunk.js (bPage) 59 bytes <{aPage}> <{pageA}> <{router_js}> ={pageB}= ={router_js}= >{aPage}< [initial] [rendered] reused as split chunk (cache group: default)
    > ./bPage [4] . lazy ^\.\/.*Page$ namespace object ./bPage
    > ./bEntry pageB
    > ./router pageB
 [6] ./bPage.js 59 bytes {bPage} [built]
     [used exports unknown]
     context element ./bPage [4] . lazy ^\.\/.*Page$ namespace object ./bPage
     cjs require ./bPage [5] ./bEntry.js 3:7-25
chunk {pageA} pageA.bundle.js (pageA) 87 bytes (javascript) 5.8 KiB (runtime) ={aPage}= ={router_js}= >{bPage}< [entry] [rendered]
    > ./aEntry pageA
    > ./router pageA
 [0] ./aEntry.js 87 bytes {pageA} [built]
     [used exports unknown]
     entry ./aEntry pageA
     + 7 hidden chunk modules
chunk {pageB} pageB.bundle.js (pageB) 87 bytes (javascript) 5.8 KiB (runtime) ={bPage}= ={router_js}= >{aPage}< [entry] [rendered]
    > ./bEntry pageB
    > ./router pageB
 [5] ./bEntry.js 87 bytes {pageB} [built]
     [used exports unknown]
     entry ./bEntry pageB
     + 7 hidden chunk modules
chunk {router_js} router_js.bundle.js 950 bytes ={aPage}= ={bPage}= ={pageA}= ={pageB}= >{aPage}< >{bPage}< [initial] [rendered] split chunk (cache group: default)
    > ./aEntry pageA
    > ./router pageA
    > ./bEntry pageB
    > ./router pageB
 [1] ./render.js 58 bytes {router_js} [built]
     [used exports unknown]
     cjs require ./render [0] ./aEntry.js 2:13-32
     cjs require ./render [3] ./router.js 1:13-32
     cjs require ./render [5] ./bEntry.js 2:13-32
 [3] ./router.js 732 bytes {router_js} [built]
     [used exports unknown]
     entry ./router pageA
     entry ./router pageB
 [4] . lazy ^\.\/.*Page$ namespace object 160 bytes {router_js} [built]
     [used exports unknown]
     import() context lazy . [3] ./router.js 15:1-59
```

## Production mode

```
Hash: 0a1b2c3d4e5f6a7b8c9d
Version: webpack 5.0.0-next
              Asset       Size       Chunks             Chunk Names
     aPage.chunk.js  129 bytes      {aPage}  [emitted]  aPage
     bPage.chunk.js  129 bytes      {bPage}  [emitted]  bPage
    pageA.bundle.js   2.27 KiB      {pageA}  [emitted]  pageA
    pageB.bundle.js   2.27 KiB      {pageB}  [emitted]  pageB
router_js.bundle.js  583 bytes  {router_js}  [emitted]
Entrypoint pageA = router_js.bundle.js aPage.chunk.js pageA.bundle.js
Entrypoint pageB = router_js.bundle.js bPage.chunk.js pageB.bundle.js
chunk {aPage} aPage.chunk.js (aPage) 59 bytes <{bPage}> <{pageB}> <{router_js}> ={pageA}= ={router_js}= >{bPage}< [initial] [rendered] reused as split chunk (cache group: default)
    > ./aPage [843] . lazy ^\.\/.*Page$ namespace object ./aPage
    > ./aEntry pageA
    > ./router pageA
 [262] ./aPage.js 59 bytes {aPage} [built]
       context element ./aPage [843] . lazy ^\.\/.*Page$ namespace object ./aPage
       cjs require ./aPage [876] ./aEntry.js 3:7-25
chunk {bPage} bPage.chunk.js (bPage) 59 bytes <{aPage}> <{pageA}> <{router_js}> ={pageB}= ={router_js}= >{aPage}< [initial] [rendered] reused as split chunk (cache group: default)
    > ./bPage [843] . lazy ^\.\/.*Page$ namespace object ./bPage
    > ./bEntry pageB
    > ./router pageB
 [542] ./bPage.js 59 bytes {bPage} [built]
       cjs require ./bPage [261] ./bEntry.js 3:7-25
       context element ./bPage [843] . lazy ^\.\/.*Page$ namespace object ./bPage
chunk {pageA} pageA.bundle.js (pageA) 87 bytes (javascript) 5.8 KiB (runtime) ={aPage}= ={router_js}= >{bPage}< [entry] [rendered]
    > ./aEntry pageA
    > ./router pageA
 [876] ./aEntry.js 87 bytes {pageA} [built]
       [module unused]
       entry ./aEntry pageA
     + 7 hidden chunk modules
chunk {pageB} pageB.bundle.js (pageB) 87 bytes (javascript) 5.8 KiB (runtime) ={bPage}= ={router_js}= >{aPage}< [entry] [rendered]
    > ./bEntry pageB
    > ./router pageB
 [261] ./bEntry.js 87 bytes {pageB} [built]
       [module unused]
       entry ./bEntry pageB
     + 7 hidden chunk modules
chunk {router_js} router_js.bundle.js 950 bytes ={aPage}= ={bPage}= ={pageA}= ={pageB}= >{aPage}< >{bPage}< [initial] [rendered] split chunk (cache group: default)
    > ./aEntry pageA
    > ./router pageA
    > ./bEntry pageB
    > ./router pageB
 [372] ./router.js 732 bytes {router_js} [built]
       entry ./router pageA
       entry ./router pageB
 [760] ./render.js 58 bytes {router_js} [built]
       cjs require ./render [261] ./bEntry.js 2:13-32
       cjs require ./render [372] ./router.js 1:13-32
       cjs require ./render [876] ./aEntry.js 2:13-32
 [843] . lazy ^\.\/.*Page$ namespace object 160 bytes {router_js} [built]
       import() context lazy . [372] ./router.js 15:1-59
```
