# webpack.config.js

```javascript
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
		occurrenceOrder: true // To keep filename consistent between different modes (for example building only)
	}
};
```

# aEntry.js

```javascript
// Just show the page "a"
var render = require("./render");
render(require("./aPage"));
```

`bEntry.js` is similar. You may want to use a loader to generate this file.

# aPage.js

```javascript
module.exports = function() {
	return "This is page A.";
};
```

`bEntry.js` is similar.

# router.js

```javascript
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

```html
<html>
	<head></head>
	<body>
		<script async src="dist/pageA~pageB.chunk.js" charset="utf-8"></script>
		<script async src="dist/aPage.chunk.js" charset="utf-8"></script>
		<script async src="dist/pageA.bundle.js" charset="utf-8"></script>
	</body>
</html>
```

# dist/pageA~pageB.chunk.js

```javascript
(window["webpackJsonp"] = window["webpackJsonp"] || []).push([[2],[
/* 0 */
/*!*******************!*\
  !*** ./render.js ***!
  \*******************/
/*! no static exports found */
/***/ (function(module, exports) {

module.exports = function(page) {
	console.log(page());
};

/***/ }),
/* 1 */,
/* 2 */
/*!*******************!*\
  !*** ./router.js ***!
  \*******************/
/*! no static exports found */
/***/ (function(module, exports, __webpack_require__) {

var render = __webpack_require__(/*! ./render */ 0);

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
	__webpack_require__(6)(`./${name}Page`).then(page => {;
		render(page.default);
	});
}


/***/ }),
/* 3 */,
/* 4 */,
/* 5 */,
/* 6 */
/*!********************************************!*\
  !*** . lazy ^\.\/.*Page$ namespace object ***!
  \********************************************/
/*! no static exports found */
/***/ (function(module, exports, __webpack_require__) {

var map = {
	"./aPage": [
		1,
		0
	],
	"./bPage": [
		3,
		1
	]
};
function webpackAsyncContext(req) {
	if(!__webpack_require__.o(map, req)) {
		return Promise.resolve().then(function() {
			var e = new Error("Cannot find module '" + req + "'");
			e.code = 'MODULE_NOT_FOUND';
			throw e;
		});
	}

	var ids = map[req], id = ids[0];
	return __webpack_require__.e(ids[1]).then(function() {
		return __webpack_require__.t(id, 7);
	});
}
webpackAsyncContext.keys = function webpackAsyncContextKeys() {
	return Object.keys(map);
};
webpackAsyncContext.id = 6;
module.exports = webpackAsyncContext;

/***/ })
]]);
```

# dist/pageA.bundle.js

<details><summary><code>/******/ (function(modules) { /* webpackBootstrap */ })</code></summary>

```javascript
/******/ (function(modules) { // webpackBootstrap
/******/ 	// install a JSONP callback for chunk loading
/******/ 	function webpackJsonpCallback(data) {
/******/ 		var chunkIds = data[0];
/******/ 		var moreModules = data[1];
/******/ 		var executeModules = data[2];
/******/
/******/ 		// add "moreModules" to the modules object,
/******/ 		// then flag all "chunkIds" as loaded and fire callback
/******/ 		var moduleId, chunkId, i = 0, resolves = [];
/******/ 		for(;i < chunkIds.length; i++) {
/******/ 			chunkId = chunkIds[i];
/******/ 			if(Object.prototype.hasOwnProperty.call(installedChunks, chunkId) && installedChunks[chunkId]) {
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
/******/
/******/ 		while(resolves.length) {
/******/ 			resolves.shift()();
/******/ 		}
/******/
/******/ 		// add entry modules from loaded chunk to deferred list
/******/ 		deferredModules.push.apply(deferredModules, executeModules || []);
/******/
/******/ 		// run deferred modules when all chunks ready
/******/ 		return checkDeferredModules();
/******/ 	};
/******/ 	function checkDeferredModules() {
/******/ 		var result;
/******/ 		for(var i = 0; i < deferredModules.length; i++) {
/******/ 			var deferredModule = deferredModules[i];
/******/ 			var fulfilled = true;
/******/ 			for(var j = 1; j < deferredModule.length; j++) {
/******/ 				var depId = deferredModule[j];
/******/ 				if(installedChunks[depId] !== 0) fulfilled = false;
/******/ 			}
/******/ 			if(fulfilled) {
/******/ 				deferredModules.splice(i--, 1);
/******/ 				result = __webpack_require__(__webpack_require__.s = deferredModule[0]);
/******/ 			}
/******/ 		}
/******/
/******/ 		return result;
/******/ 	}
/******/
/******/ 	// The module cache
/******/ 	var installedModules = {};
/******/
/******/ 	// object to store loaded and loading chunks
/******/ 	// undefined = chunk not loaded, null = chunk preloaded/prefetched
/******/ 	// Promise = chunk loading, 0 = chunk loaded
/******/ 	var installedChunks = {
/******/ 		3: 0
/******/ 	};
/******/
/******/ 	var deferredModules = [];
/******/
/******/ 	// script path function
/******/ 	function jsonpScriptSrc(chunkId) {
/******/ 		return __webpack_require__.p + "" + ({"1":"bPage"}[chunkId]||chunkId) + ".chunk.js"
/******/ 	}
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
/******/ 				var script = document.createElement('script');
/******/ 				var onScriptComplete;
/******/
/******/ 				script.charset = 'utf-8';
/******/ 				script.timeout = 120;
/******/ 				if (__webpack_require__.nc) {
/******/ 					script.setAttribute("nonce", __webpack_require__.nc);
/******/ 				}
/******/ 				script.src = jsonpScriptSrc(chunkId);
/******/
/******/ 				// create error before stack unwound to get useful stacktrace later
/******/ 				var error = new Error();
/******/ 				onScriptComplete = function (event) {
/******/ 					// avoid mem leaks in IE.
/******/ 					script.onerror = script.onload = null;
/******/ 					clearTimeout(timeout);
/******/ 					var chunk = installedChunks[chunkId];
/******/ 					if(chunk !== 0) {
/******/ 						if(chunk) {
/******/ 							var errorType = event && (event.type === 'load' ? 'missing' : event.type);
/******/ 							var realSrc = event && event.target && event.target.src;
/******/ 							error.message = 'Loading chunk ' + chunkId + ' failed.\n(' + errorType + ': ' + realSrc + ')';
/******/ 							error.name = 'ChunkLoadError';
/******/ 							error.type = errorType;
/******/ 							error.request = realSrc;
/******/ 							chunk[1](error);
/******/ 						}
/******/ 						installedChunks[chunkId] = undefined;
/******/ 					}
/******/ 				};
/******/ 				var timeout = setTimeout(function(){
/******/ 					onScriptComplete({ type: 'timeout', target: script });
/******/ 				}, 120000);
/******/ 				script.onerror = script.onload = onScriptComplete;
/******/ 				document.head.appendChild(script);
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
/******/ 			Object.defineProperty(exports, name, { enumerable: true, get: getter });
/******/ 		}
/******/ 	};
/******/
/******/ 	// define __esModule on exports
/******/ 	__webpack_require__.r = function(exports) {
/******/ 		if(typeof Symbol !== 'undefined' && Symbol.toStringTag) {
/******/ 			Object.defineProperty(exports, Symbol.toStringTag, { value: 'Module' });
/******/ 		}
/******/ 		Object.defineProperty(exports, '__esModule', { value: true });
/******/ 	};
/******/
/******/ 	// create a fake namespace object
/******/ 	// mode & 1: value is a module id, require it
/******/ 	// mode & 2: merge all properties of value into the ns
/******/ 	// mode & 4: return value when already ns object
/******/ 	// mode & 8|1: behave like require
/******/ 	__webpack_require__.t = function(value, mode) {
/******/ 		if(mode & 1) value = __webpack_require__(value);
/******/ 		if(mode & 8) return value;
/******/ 		if((mode & 4) && typeof value === 'object' && value && value.__esModule) return value;
/******/ 		var ns = Object.create(null);
/******/ 		__webpack_require__.r(ns);
/******/ 		Object.defineProperty(ns, 'default', { enumerable: true, value: value });
/******/ 		if(mode & 2 && typeof value != 'string') for(var key in value) __webpack_require__.d(ns, key, function(key) { return value[key]; }.bind(null, key));
/******/ 		return ns;
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
/******/ 	var oldJsonpFunction = jsonpArray.push.bind(jsonpArray);
/******/ 	jsonpArray.push = webpackJsonpCallback;
/******/ 	jsonpArray = jsonpArray.slice();
/******/ 	for(var i = 0; i < jsonpArray.length; i++) webpackJsonpCallback(jsonpArray[i]);
/******/ 	var parentJsonpFunction = oldJsonpFunction;
/******/
/******/
/******/ 	// add entry module to deferred list
/******/ 	deferredModules.push([4,2,0]);
/******/ 	// run deferred modules when ready
/******/ 	return checkDeferredModules();
/******/ })
/************************************************************************/
```

</details>

```javascript
/******/ ({

/***/ 4:
/*!*******************************!*\
  !*** multi ./aEntry ./router ***!
  \*******************************/
/*! no static exports found */
/***/ (function(module, exports, __webpack_require__) {

__webpack_require__(/*! ./aEntry */5);
module.exports = __webpack_require__(/*! ./router */2);


/***/ }),

/***/ 5:
/*!*******************!*\
  !*** ./aEntry.js ***!
  \*******************/
/*! no static exports found */
/***/ (function(module, exports, __webpack_require__) {

// Just show the page "a"
var render = __webpack_require__(/*! ./render */ 0);
render(__webpack_require__(/*! ./aPage */ 1));

/***/ })

/******/ });
```

# dist/aPage.chunk.js

```javascript
(window["webpackJsonp"] = window["webpackJsonp"] || []).push([[0],[
/* 0 */,
/* 1 */
/*!******************!*\
  !*** ./aPage.js ***!
  \******************/
/*! no static exports found */
/***/ (function(module, exports) {

module.exports = function() {
	return "This is page A.";
};

/***/ })
]]);
```

# Info

## Unoptimized

```
Hash: 0a1b2c3d4e5f6a7b8c9d
Version: webpack 4.39.0
               Asset       Size  Chunks             Chunk Names
      aPage.chunk.js  297 bytes       0  [emitted]  aPage
      bPage.chunk.js  291 bytes       1  [emitted]  bPage
     pageA.bundle.js   9.65 KiB       3  [emitted]  pageA
pageA~pageB.chunk.js   2.04 KiB       2  [emitted]  pageA~pageB
     pageB.bundle.js   9.65 KiB       4  [emitted]  pageB
Entrypoint pageA = pageA~pageB.chunk.js aPage.chunk.js pageA.bundle.js
Entrypoint pageB = pageA~pageB.chunk.js bPage.chunk.js pageB.bundle.js
chunk    {0} aPage.chunk.js (aPage) 59 bytes <{1}> <{2}> <{4}> ={2}= ={3}= >{1}< [initial] [rendered] reused as split chunk (cache group: default)
    > ./aPage [6] . lazy ^\.\/.*Page$ namespace object ./aPage
    > ./aPage [6] . lazy ^\.\/.*Page$ namespace object ./aPage
    > pageA
 [1] ./aPage.js 59 bytes {0} [built]
     cjs require ./aPage [5] ./aEntry.js 3:7-25
     context element ./aPage [6] . lazy ^\.\/.*Page$ namespace object ./aPage
chunk    {1} bPage.chunk.js (bPage) 59 bytes <{0}> <{2}> <{3}> ={2}= ={4}= >{0}< [initial] [rendered] reused as split chunk (cache group: default)
    > ./bPage [6] . lazy ^\.\/.*Page$ namespace object ./bPage
    > ./bPage [6] . lazy ^\.\/.*Page$ namespace object ./bPage
    > pageB
 [3] ./bPage.js 59 bytes {1} [built]
     context element ./bPage [6] . lazy ^\.\/.*Page$ namespace object ./bPage
     cjs require ./bPage [8] ./bEntry.js 3:7-25
chunk    {2} pageA~pageB.chunk.js (pageA~pageB) 950 bytes ={0}= ={1}= ={3}= ={4}= >{0}< >{1}< [initial] [rendered] split chunk (cache group: default) (name: pageA~pageB)
    > pageA
    > pageB
 [0] ./render.js 58 bytes {2} [built]
     cjs require ./render [2] ./router.js 1:13-32
     cjs require ./render [5] ./aEntry.js 2:13-32
     cjs require ./render [8] ./bEntry.js 2:13-32
 [2] ./router.js 732 bytes {2} [built]
     single entry ./router [4] multi ./aEntry ./router pageA[1]
     single entry ./router [7] multi ./bEntry ./router pageB[1]
 [6] . lazy ^\.\/.*Page$ namespace object 160 bytes {2} [built]
     import() context lazy . [2] ./router.js 15:1-59
chunk    {3} pageA.bundle.js (pageA) 127 bytes ={0}= ={2}= >{1}< [entry] [rendered]
    > pageA
 [4] multi ./aEntry ./router 40 bytes {3} [built]
     multi entry 
 [5] ./aEntry.js 87 bytes {3} [built]
     single entry ./aEntry [4] multi ./aEntry ./router pageA[0]
chunk    {4} pageB.bundle.js (pageB) 127 bytes ={1}= ={2}= >{0}< [entry] [rendered]
    > pageB
 [7] multi ./bEntry ./router 40 bytes {4} [built]
     multi entry 
 [8] ./bEntry.js 87 bytes {4} [built]
     single entry ./bEntry [7] multi ./bEntry ./router pageB[0]
```

## Production mode

```
Hash: 0a1b2c3d4e5f6a7b8c9d
Version: webpack 4.39.0
               Asset       Size  Chunks             Chunk Names
      aPage.chunk.js  122 bytes       0  [emitted]  aPage
      bPage.chunk.js  123 bytes       1  [emitted]  bPage
     pageA.bundle.js    2.3 KiB       3  [emitted]  pageA
pageA~pageB.chunk.js  559 bytes       2  [emitted]  pageA~pageB
     pageB.bundle.js    2.3 KiB       4  [emitted]  pageB
Entrypoint pageA = pageA~pageB.chunk.js aPage.chunk.js pageA.bundle.js
Entrypoint pageB = pageA~pageB.chunk.js bPage.chunk.js pageB.bundle.js
chunk    {0} aPage.chunk.js (aPage) 59 bytes <{1}> <{2}> <{4}> ={2}= ={3}= >{1}< [initial] [rendered] reused as split chunk (cache group: default)
    > ./aPage [6] . lazy ^\.\/.*Page$ namespace object ./aPage
    > ./aPage [6] . lazy ^\.\/.*Page$ namespace object ./aPage
    > pageA
 [1] ./aPage.js 59 bytes {0} [built]
     cjs require ./aPage [5] ./aEntry.js 3:7-25
     context element ./aPage [6] . lazy ^\.\/.*Page$ namespace object ./aPage
chunk    {1} bPage.chunk.js (bPage) 59 bytes <{0}> <{2}> <{3}> ={2}= ={4}= >{0}< [initial] [rendered] reused as split chunk (cache group: default)
    > ./bPage [6] . lazy ^\.\/.*Page$ namespace object ./bPage
    > ./bPage [6] . lazy ^\.\/.*Page$ namespace object ./bPage
    > pageB
 [3] ./bPage.js 59 bytes {1} [built]
     context element ./bPage [6] . lazy ^\.\/.*Page$ namespace object ./bPage
     cjs require ./bPage [8] ./bEntry.js 3:7-25
chunk    {2} pageA~pageB.chunk.js (pageA~pageB) 950 bytes ={0}= ={1}= ={3}= ={4}= >{0}< >{1}< [initial] [rendered] split chunk (cache group: default) (name: pageA~pageB)
    > pageA
    > pageB
 [0] ./render.js 58 bytes {2} [built]
     cjs require ./render [2] ./router.js 1:13-32
     cjs require ./render [5] ./aEntry.js 2:13-32
     cjs require ./render [8] ./bEntry.js 2:13-32
 [2] ./router.js 732 bytes {2} [built]
     single entry ./router [4] multi ./aEntry ./router pageA[1]
     single entry ./router [7] multi ./bEntry ./router pageB[1]
 [6] . lazy ^\.\/.*Page$ namespace object 160 bytes {2} [built]
     import() context lazy . [2] ./router.js 15:1-59
chunk    {3} pageA.bundle.js (pageA) 127 bytes ={0}= ={2}= >{1}< [entry] [rendered]
    > pageA
 [4] multi ./aEntry ./router 40 bytes {3} [built]
     multi entry 
 [5] ./aEntry.js 87 bytes {3} [built]
     single entry ./aEntry [4] multi ./aEntry ./router pageA[0]
chunk    {4} pageB.bundle.js (pageB) 127 bytes ={1}= ={2}= >{0}< [entry] [rendered]
    > pageB
 [7] multi ./bEntry ./router 40 bytes {4} [built]
     multi entry 
 [8] ./bEntry.js 87 bytes {4} [built]
     single entry ./bEntry [7] multi ./bEntry ./router pageB[0]
```
