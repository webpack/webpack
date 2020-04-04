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
		chunkIds: "named" // To keep filename consistent between different modes (for example building only)
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
	//  otherwise there is blood in the bundle. Here this is done with a
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

# dist/router_js.bundle.js

``` javascript
(window["webpackJsonp"] = window["webpackJsonp"] || []).push([["router_js"],[
/* 0 */,
/* 1 */
/*!*******************!*\
  !*** ./render.js ***!
  \*******************/
/*! exports [maybe provided (runtime-defined)] [no usage info] */
/*! runtime requirements: module */
/***/ ((module) => {

module.exports = function(page) {
	console.log(page());
};

/***/ }),
/* 2 */,
/* 3 */
/*!*******************!*\
  !*** ./router.js ***!
  \*******************/
/*! exports [maybe provided (runtime-defined)] [no usage info] */
/*! runtime requirements: __webpack_require__ */
/***/ ((__unused_webpack_module, __unused_webpack_exports, __webpack_require__) => {

var render = __webpack_require__(/*! ./render */ 1);

// Event when another page should be opened
// Maybe hook click on links, hashchange or popstate
window.onLinkToPage = function onLinkToPage(name) { // name is "a" or "b"
	// require the page with a dynamic require

	// It's important that this require only matches the pages
	//  otherwise there is blood in the bundle. Here this is done with a
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
/*!*****************************************************************!*\
  !*** . lazy ^\.\/.*Page$ chunkName: [request] namespace object ***!
  \*****************************************************************/
/*! exports [maybe provided (runtime-defined)] [no usage info] */
/*! runtime requirements: module, __webpack_require__, __webpack_require__.e, __webpack_require__.t, __webpack_require__.* */
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

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
	if(!Object.prototype.hasOwnProperty.call(map, req)) {
		return Promise.resolve().then(() => {
			var e = new Error("Cannot find module '" + req + "'");
			e.code = 'MODULE_NOT_FOUND';
			throw e;
		});
	}

	var ids = map[req], id = ids[0];
	return __webpack_require__.e(ids[1]).then(() => {
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

```javascript
/******/ (() => { // webpackBootstrap
/******/ 	var __webpack_modules__ = ([
/* 0 */
/*!*******************!*\
  !*** ./aEntry.js ***!
  \*******************/
/*! exports [maybe provided (runtime-defined)] [no usage info] */
/*! runtime requirements: __webpack_require__ */
/***/ ((__unused_webpack_module, __unused_webpack_exports, __webpack_require__) => {

// Just show the page "a"
var render = __webpack_require__(/*! ./render */ 1);
render(__webpack_require__(/*! ./aPage */ 2));

/***/ })
/******/ 	]);
```

<details><summary><code>/* webpack runtime code */</code></summary>

``` js
/************************************************************************/
/******/ 	// The module cache
/******/ 	var __webpack_module_cache__ = {};
/******/ 	
/******/ 	// The require function
/******/ 	function __webpack_require__(moduleId) {
/******/ 		// Check if module is in cache
/******/ 		if(__webpack_module_cache__[moduleId]) {
/******/ 			return __webpack_module_cache__[moduleId].exports;
/******/ 		}
/******/ 		// Create a new module (and put it into the cache)
/******/ 		var module = __webpack_module_cache__[moduleId] = {
/******/ 			i: moduleId,
/******/ 			l: false,
/******/ 			exports: {}
/******/ 		};
/******/ 	
/******/ 		// Execute the module function
/******/ 		__webpack_modules__[moduleId](module, module.exports, __webpack_require__);
/******/ 	
/******/ 		// Flag the module as loaded
/******/ 		module.l = true;
/******/ 	
/******/ 		// Return the exports of the module
/******/ 		return module.exports;
/******/ 	}
/******/ 	
/******/ 	// expose the modules object (__webpack_modules__)
/******/ 	__webpack_require__.m = __webpack_modules__;
/******/ 	
/************************************************************************/
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
/******/ 			var def = {};
/******/ 			if(mode & 2 && typeof value == 'object' && value) {
/******/ 				for(const key in value) def[key] = () => value[key];
/******/ 			}
/******/ 			def['default'] = () => value;
/******/ 			__webpack_require__.d(ns, def);
/******/ 			return ns;
/******/ 		};
/******/ 	}();
/******/ 	
/******/ 	/* webpack/runtime/define property getters */
/******/ 	!function() {
/******/ 		// define getter functions for harmony exports
/******/ 		var hasOwnProperty = Object.prototype.hasOwnProperty;
/******/ 		__webpack_require__.d = (exports, definition) => {
/******/ 			for(var key in definition) {
/******/ 				if(hasOwnProperty.call(definition, key) && !hasOwnProperty.call(exports, key)) {
/******/ 					Object.defineProperty(exports, key, { enumerable: true, get: definition[key] });
/******/ 				}
/******/ 			}
/******/ 		};
/******/ 	}();
/******/ 	
/******/ 	/* webpack/runtime/ensure chunk */
/******/ 	!function() {
/******/ 		__webpack_require__.f = {};
/******/ 		// This file contains only the entry chunk.
/******/ 		// The chunk loading function for additional chunks
/******/ 		__webpack_require__.e = (chunkId) => {
/******/ 			return Promise.all(Object.keys(__webpack_require__.f).reduce((promises, key) => {
/******/ 				__webpack_require__.f[key](chunkId, promises);
/******/ 				return promises;
/******/ 			}, []));
/******/ 		};
/******/ 	}();
/******/ 	
/******/ 	/* webpack/runtime/get javascript chunk filename */
/******/ 	!function() {
/******/ 		// This function allow to reference async chunks
/******/ 		__webpack_require__.u = (chunkId) => {
/******/ 			// return url for filenames based on template
/******/ 			return "" + chunkId + ".chunk.js";
/******/ 		};
/******/ 	}();
/******/ 	
/******/ 	/* webpack/runtime/make namespace object */
/******/ 	!function() {
/******/ 		// define __esModule on exports
/******/ 		__webpack_require__.r = (exports) => {
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
/******/ 		
/******/ 		__webpack_require__.f.j = (chunkId, promises) => {
/******/ 				// JSONP chunk loading for javascript
/******/ 				var installedChunkData = Object.prototype.hasOwnProperty.call(installedChunks, chunkId) ? installedChunks[chunkId] : undefined;
/******/ 				if(installedChunkData !== 0) { // 0 means "already installed".
/******/ 		
/******/ 					// a Promise means "currently loading".
/******/ 					if(installedChunkData) {
/******/ 						promises.push(installedChunkData[2]);
/******/ 					} else {
/******/ 						if(true) { // all chunks have JS
/******/ 							// setup Promise in chunk cache
/******/ 							var promise = new Promise((resolve, reject) => {
/******/ 								installedChunkData = installedChunks[chunkId] = [resolve, reject];
/******/ 							});
/******/ 							promises.push(installedChunkData[2] = promise);
/******/ 		
/******/ 							// start chunk loading
/******/ 							var url = __webpack_require__.p + __webpack_require__.u(chunkId);
/******/ 							var loadingEnded = () => {
/******/ 								if(Object.prototype.hasOwnProperty.call(installedChunks, chunkId)) {
/******/ 									installedChunkData = installedChunks[chunkId];
/******/ 									if(installedChunkData !== 0) installedChunks[chunkId] = undefined;
/******/ 									if(installedChunkData) return installedChunkData[1];
/******/ 								}
/******/ 							};
/******/ 							var script = document.createElement('script');
/******/ 							var onScriptComplete;
/******/ 		
/******/ 							script.charset = 'utf-8';
/******/ 							script.timeout = 120;
/******/ 							if (__webpack_require__.nc) {
/******/ 								script.setAttribute("nonce", __webpack_require__.nc);
/******/ 							}
/******/ 							script.src = url;
/******/ 		
/******/ 							// create error before stack unwound to get useful stacktrace later
/******/ 							var error = new Error();
/******/ 							onScriptComplete = function (event) {
/******/ 								onScriptComplete = function() {};
/******/ 								// avoid mem leaks in IE.
/******/ 								script.onerror = script.onload = null;
/******/ 								clearTimeout(timeout);
/******/ 								var reportError = loadingEnded();
/******/ 								if(reportError) {
/******/ 									var errorType = event && (event.type === 'load' ? 'missing' : event.type);
/******/ 									var realSrc = event && event.target && event.target.src;
/******/ 									error.message = 'Loading chunk ' + chunkId + ' failed.\n(' + errorType + ': ' + realSrc + ')';
/******/ 									error.name = 'ChunkLoadError';
/******/ 									error.type = errorType;
/******/ 									error.request = realSrc;
/******/ 									reportError(error);
/******/ 								}
/******/ 							};
/******/ 							var timeout = setTimeout(function(){
/******/ 								onScriptComplete({ type: 'timeout', target: script });
/******/ 							}, 120000);
/******/ 							script.onerror = script.onload = onScriptComplete;
/******/ 							document.head.appendChild(script);
/******/ 						} else installedChunks[chunkId] = 0;
/******/ 		
/******/ 						// no HMR
/******/ 					}
/******/ 				}
/******/ 		
/******/ 				// no chunk preloading needed
/******/ 		};
/******/ 		
/******/ 		// no prefetching
/******/ 		
/******/ 		// no HMR
/******/ 		
/******/ 		// no HMR manifest
/******/ 		
/******/ 		var checkDeferredModules = () => {
/******/ 		
/******/ 		};
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
/******/ 			// no prefetch
/******/ 			return result;
/******/ 		}
/******/ 		__webpack_require__.x = () => {
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
/******/ 				if(Object.prototype.hasOwnProperty.call(installedChunks, chunkId) && installedChunks[chunkId]) {
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
/************************************************************************/
```

</details>

``` js
/******/ 	// run startup
/******/ 	return __webpack_require__.x();
/******/ })()
;
```

# dist/aPage.chunk.js

```javascript
(window["webpackJsonp"] = window["webpackJsonp"] || []).push([["aPage"],{

/***/ 2:
/*!******************!*\
  !*** ./aPage.js ***!
  \******************/
/*! exports [maybe provided (runtime-defined)] [no usage info] */
/*! runtime requirements: module */
/***/ ((module) => {

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
Version: webpack 5.0.0-beta.6
              Asset       Size
     aPage.chunk.js  354 bytes  [emitted]  [name: aPage]
     bPage.chunk.js  354 bytes  [emitted]  [name: bPage]
    pageA.bundle.js   11.2 KiB  [emitted]  [name: pageA]
    pageB.bundle.js   11.2 KiB  [emitted]  [name: pageB]
router_js.bundle.js   2.45 KiB  [emitted]
Entrypoint pageA = router_js.bundle.js aPage.chunk.js pageA.bundle.js
Entrypoint pageB = router_js.bundle.js bPage.chunk.js pageB.bundle.js
chunk aPage.chunk.js (aPage) 59 bytes [initial] [rendered] reused as split chunk (cache group: default)
    > ./aPage . lazy ^\.\/.*Page$ chunkName: [request] namespace object ./aPage
    > ./aEntry pageA
    > ./router pageA
 ./aPage.js 59 bytes [built]
     [used exports unknown]
     cjs require ./aPage ./aEntry.js 3:7-25
     context element ./aPage . lazy ^\.\/.*Page$ chunkName: [request] namespace object ./aPage
chunk bPage.chunk.js (bPage) 59 bytes [initial] [rendered] reused as split chunk (cache group: default)
    > ./bPage . lazy ^\.\/.*Page$ chunkName: [request] namespace object ./bPage
    > ./bEntry pageB
    > ./router pageB
 ./bPage.js 59 bytes [built]
     [used exports unknown]
     cjs require ./bPage ./bEntry.js 3:7-25
     context element ./bPage . lazy ^\.\/.*Page$ chunkName: [request] namespace object ./bPage
chunk pageA.bundle.js (pageA) 87 bytes (javascript) 6.5 KiB (runtime) [entry] [rendered]
    > ./aEntry pageA
    > ./router pageA
 ./aEntry.js 87 bytes [built]
     [used exports unknown]
     entry ./aEntry pageA
     + 7 hidden chunk modules
chunk pageB.bundle.js (pageB) 87 bytes (javascript) 6.5 KiB (runtime) [entry] [rendered]
    > ./bEntry pageB
    > ./router pageB
 ./bEntry.js 87 bytes [built]
     [used exports unknown]
     entry ./bEntry pageB
     + 7 hidden chunk modules
chunk router_js.bundle.js 950 bytes [initial] [rendered] split chunk (cache group: default)
    > ./aEntry pageA
    > ./router pageA
    > ./bEntry pageB
    > ./router pageB
 . lazy ^\.\/.*Page$ chunkName: [request] namespace object 160 bytes [built]
     [used exports unknown]
     import() context lazy . ./router.js 15:1-59
 ./render.js 58 bytes [built]
     [used exports unknown]
     cjs require ./render ./aEntry.js 2:13-32
     cjs require ./render ./bEntry.js 2:13-32
     cjs require ./render ./router.js 1:13-32
 ./router.js 732 bytes [built]
     [used exports unknown]
     entry ./router pageA
     entry ./router pageB
```

## Production mode

```
Hash: 0a1b2c3d4e5f6a7b8c9d
Version: webpack 5.0.0-beta.6
              Asset       Size
     aPage.chunk.js  121 bytes  [emitted]  [name: aPage]
     bPage.chunk.js  121 bytes  [emitted]  [name: bPage]
    pageA.bundle.js   2.29 KiB  [emitted]  [name: pageA]
    pageB.bundle.js   2.29 KiB  [emitted]  [name: pageB]
router_js.bundle.js  589 bytes  [emitted]
Entrypoint pageA = router_js.bundle.js aPage.chunk.js pageA.bundle.js
Entrypoint pageB = router_js.bundle.js bPage.chunk.js pageB.bundle.js
chunk aPage.chunk.js (aPage) 59 bytes [initial] [rendered] reused as split chunk (cache group: default)
    > ./aPage . lazy ^\.\/.*Page$ chunkName: [request] namespace object ./aPage
    > ./aEntry pageA
    > ./router pageA
 ./aPage.js 59 bytes [built]
     cjs require ./aPage ./aEntry.js 3:7-25
     context element ./aPage . lazy ^\.\/.*Page$ chunkName: [request] namespace object ./aPage
chunk bPage.chunk.js (bPage) 59 bytes [initial] [rendered] reused as split chunk (cache group: default)
    > ./bPage . lazy ^\.\/.*Page$ chunkName: [request] namespace object ./bPage
    > ./bEntry pageB
    > ./router pageB
 ./bPage.js 59 bytes [built]
     cjs require ./bPage ./bEntry.js 3:7-25
     context element ./bPage . lazy ^\.\/.*Page$ chunkName: [request] namespace object ./bPage
chunk pageA.bundle.js (pageA) 87 bytes (javascript) 6.5 KiB (runtime) [entry] [rendered]
    > ./aEntry pageA
    > ./router pageA
 ./aEntry.js 87 bytes [built]
     [no exports used]
     entry ./aEntry pageA
     + 7 hidden chunk modules
chunk pageB.bundle.js (pageB) 87 bytes (javascript) 6.5 KiB (runtime) [entry] [rendered]
    > ./bEntry pageB
    > ./router pageB
 ./bEntry.js 87 bytes [built]
     [no exports used]
     entry ./bEntry pageB
     + 7 hidden chunk modules
chunk router_js.bundle.js 950 bytes [initial] [rendered] split chunk (cache group: default)
    > ./aEntry pageA
    > ./router pageA
    > ./bEntry pageB
    > ./router pageB
 . lazy ^\.\/.*Page$ chunkName: [request] namespace object 160 bytes [built]
     import() context lazy . ./router.js 15:1-59
 ./render.js 58 bytes [built]
     cjs require ./render ./aEntry.js 2:13-32
     cjs require ./render ./bEntry.js 2:13-32
     cjs require ./render ./router.js 1:13-32
 ./router.js 732 bytes [built]
     [no exports used]
     entry ./router pageA
     entry ./router pageB
```
