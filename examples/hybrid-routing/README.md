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

```javascript
(self["webpackChunk"] = self["webpackChunk"] || []).push([["router_js"],[
/* 0 */,
/* 1 */
/*!*******************!*\
  !*** ./render.js ***!
  \*******************/
/*! unknown exports (runtime-defined) */
/*! runtime requirements: module */
/*! CommonJS bailout: module.exports is used directly at 1:0-14 */
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
/*! unknown exports (runtime-defined) */
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
/*!*******************************************************************!*\
  !*** .// lazy ^\.\/.*Page$ chunkName: [request] namespace object ***!
  \*******************************************************************/
/*! default exports */
/*! exports [not provided] [no usage info] */
/*! runtime requirements: module, __webpack_require__.o, __webpack_require__, __webpack_require__.e, __webpack_require__.t, __webpack_require__.* */
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
	if(!__webpack_require__.o(map, req)) {
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
webpackAsyncContext.keys = () => Object.keys(map);
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
/*! unknown exports (runtime-defined) */
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
/******/ 			// no module.id needed
/******/ 			// no module.loaded needed
/******/ 			exports: {}
/******/ 		};
/******/ 	
/******/ 		// Execute the module function
/******/ 		__webpack_modules__[moduleId](module, module.exports, __webpack_require__);
/******/ 	
/******/ 		// Return the exports of the module
/******/ 		return module.exports;
/******/ 	}
/******/ 	
/******/ 	// expose the modules object (__webpack_modules__)
/******/ 	__webpack_require__.m = __webpack_modules__;
/******/ 	
/******/ 	// the startup function
/******/ 	// It's empty as some runtime module handles the default behavior
/******/ 	__webpack_require__.x = x => {}
/************************************************************************/
/******/ 	/* webpack/runtime/create fake namespace object */
/******/ 	(() => {
/******/ 		var getProto = Object.getPrototypeOf ? (obj) => Object.getPrototypeOf(obj) : (obj) => obj.__proto__;
/******/ 		var leafPrototypes;
/******/ 		// create a fake namespace object
/******/ 		// mode & 1: value is a module id, require it
/******/ 		// mode & 2: merge all properties of value into the ns
/******/ 		// mode & 4: return value when already ns object
/******/ 		// mode & 16: return value when it's Promise-like
/******/ 		// mode & 8|1: behave like require
/******/ 		__webpack_require__.t = function(value, mode) {
/******/ 			if(mode & 1) value = this(value);
/******/ 			if(mode & 8) return value;
/******/ 			if(typeof value === 'object' && value) {
/******/ 				if((mode & 4) && value.__esModule) return value;
/******/ 				if((mode & 16) && typeof value.then === 'function') return value;
/******/ 			}
/******/ 			var ns = Object.create(null);
/******/ 			__webpack_require__.r(ns);
/******/ 			var def = {};
/******/ 			leafPrototypes = leafPrototypes || [null, getProto({}), getProto([]), getProto(getProto)];
/******/ 			for(var current = mode & 2 && value; typeof current == 'object' && !~leafPrototypes.indexOf(current); current = getProto(current)) {
/******/ 				Object.getOwnPropertyNames(current).forEach(key => def[key] = () => value[key]);
/******/ 			}
/******/ 			def['default'] = () => value;
/******/ 			__webpack_require__.d(ns, def);
/******/ 			return ns;
/******/ 		};
/******/ 	})();
/******/ 	
/******/ 	/* webpack/runtime/define property getters */
/******/ 	(() => {
/******/ 		// define getter functions for harmony exports
/******/ 		__webpack_require__.d = (exports, definition) => {
/******/ 			for(var key in definition) {
/******/ 				if(__webpack_require__.o(definition, key) && !__webpack_require__.o(exports, key)) {
/******/ 					Object.defineProperty(exports, key, { enumerable: true, get: definition[key] });
/******/ 				}
/******/ 			}
/******/ 		};
/******/ 	})();
/******/ 	
/******/ 	/* webpack/runtime/ensure chunk */
/******/ 	(() => {
/******/ 		__webpack_require__.f = {};
/******/ 		// This file contains only the entry chunk.
/******/ 		// The chunk loading function for additional chunks
/******/ 		__webpack_require__.e = (chunkId) => {
/******/ 			return Promise.all(Object.keys(__webpack_require__.f).reduce((promises, key) => {
/******/ 				__webpack_require__.f[key](chunkId, promises);
/******/ 				return promises;
/******/ 			}, []));
/******/ 		};
/******/ 	})();
/******/ 	
/******/ 	/* webpack/runtime/get javascript chunk filename */
/******/ 	(() => {
/******/ 		// This function allow to reference async chunks
/******/ 		__webpack_require__.u = (chunkId) => {
/******/ 			// return url for filenames based on template
/******/ 			return "" + chunkId + ".bundle.js";
/******/ 		};
/******/ 	})();
/******/ 	
/******/ 	/* webpack/runtime/hasOwnProperty shorthand */
/******/ 	(() => {
/******/ 		__webpack_require__.o = (obj, prop) => Object.prototype.hasOwnProperty.call(obj, prop)
/******/ 	})();
/******/ 	
/******/ 	/* webpack/runtime/load script */
/******/ 	(() => {
/******/ 		var inProgress = {};
/******/ 		// data-webpack is not used as build has no uniqueName
/******/ 		// loadScript function to load a script via script tag
/******/ 		__webpack_require__.l = (url, done, key) => {
/******/ 			if(inProgress[url]) { inProgress[url].push(done); return; }
/******/ 			var script, needAttach;
/******/ 			if(key !== undefined) {
/******/ 				var scripts = document.getElementsByTagName("script");
/******/ 				for(var i = 0; i < scripts.length; i++) {
/******/ 					var s = scripts[i];
/******/ 					if(s.getAttribute("src") == url) { script = s; break; }
/******/ 				}
/******/ 			}
/******/ 			if(!script) {
/******/ 				needAttach = true;
/******/ 				script = document.createElement('script');
/******/ 		
/******/ 				script.charset = 'utf-8';
/******/ 				script.timeout = 120;
/******/ 				if (__webpack_require__.nc) {
/******/ 					script.setAttribute("nonce", __webpack_require__.nc);
/******/ 				}
/******/ 		
/******/ 				script.src = url;
/******/ 			}
/******/ 			inProgress[url] = [done];
/******/ 			var onScriptComplete = (prev, event) => {
/******/ 				// avoid mem leaks in IE.
/******/ 				script.onerror = script.onload = null;
/******/ 				clearTimeout(timeout);
/******/ 				var doneFns = inProgress[url];
/******/ 				delete inProgress[url];
/******/ 				script.parentNode && script.parentNode.removeChild(script);
/******/ 				doneFns && doneFns.forEach((fn) => fn(event));
/******/ 				if(prev) return prev(event);
/******/ 			}
/******/ 			;
/******/ 			var timeout = setTimeout(onScriptComplete.bind(null, undefined, { type: 'timeout', target: script }), 120000);
/******/ 			script.onerror = onScriptComplete.bind(null, script.onerror);
/******/ 			script.onload = onScriptComplete.bind(null, script.onload);
/******/ 			needAttach && document.head.appendChild(script);
/******/ 		};
/******/ 	})();
/******/ 	
/******/ 	/* webpack/runtime/make namespace object */
/******/ 	(() => {
/******/ 		// define __esModule on exports
/******/ 		__webpack_require__.r = (exports) => {
/******/ 			if(typeof Symbol !== 'undefined' && Symbol.toStringTag) {
/******/ 				Object.defineProperty(exports, Symbol.toStringTag, { value: 'Module' });
/******/ 			}
/******/ 			Object.defineProperty(exports, '__esModule', { value: true });
/******/ 		};
/******/ 	})();
/******/ 	
/******/ 	/* webpack/runtime/publicPath */
/******/ 	(() => {
/******/ 		__webpack_require__.p = "dist/";
/******/ 	})();
/******/ 	
/******/ 	/* webpack/runtime/jsonp chunk loading */
/******/ 	(() => {
/******/ 		// no baseURI
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
/******/ 		__webpack_require__.f.j = (chunkId, promises) => {
/******/ 				// JSONP chunk loading for javascript
/******/ 				var installedChunkData = __webpack_require__.o(installedChunks, chunkId) ? installedChunks[chunkId] : undefined;
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
/******/ 							// create error before stack unwound to get useful stacktrace later
/******/ 							var error = new Error();
/******/ 							var loadingEnded = (event) => {
/******/ 								if(__webpack_require__.o(installedChunks, chunkId)) {
/******/ 									installedChunkData = installedChunks[chunkId];
/******/ 									if(installedChunkData !== 0) installedChunks[chunkId] = undefined;
/******/ 									if(installedChunkData) {
/******/ 										var errorType = event && (event.type === 'load' ? 'missing' : event.type);
/******/ 										var realSrc = event && event.target && event.target.src;
/******/ 										error.message = 'Loading chunk ' + chunkId + ' failed.\n(' + errorType + ': ' + realSrc + ')';
/******/ 										error.name = 'ChunkLoadError';
/******/ 										error.type = errorType;
/******/ 										error.request = realSrc;
/******/ 										installedChunkData[1](error);
/******/ 									}
/******/ 								}
/******/ 							};
/******/ 							__webpack_require__.l(url, loadingEnded, "chunk-" + chunkId);
/******/ 						} else installedChunks[chunkId] = 0;
/******/ 					}
/******/ 				}
/******/ 		};
/******/ 		
/******/ 		// no prefetching
/******/ 		
/******/ 		// no preloaded
/******/ 		
/******/ 		// no HMR
/******/ 		
/******/ 		// no HMR manifest
/******/ 		
/******/ 		var checkDeferredModules = x => {};
/******/ 		
/******/ 		// install a JSONP callback for chunk loading
/******/ 		var webpackJsonpCallback = (parentChunkLoadingFunction, data) => {
/******/ 			var [chunkIds, moreModules, runtime, executeModules] = data;
/******/ 			// add "moreModules" to the modules object,
/******/ 			// then flag all "chunkIds" as loaded and fire callback
/******/ 			var moduleId, chunkId, i = 0, resolves = [];
/******/ 			for(;i < chunkIds.length; i++) {
/******/ 				chunkId = chunkIds[i];
/******/ 				if(__webpack_require__.o(installedChunks, chunkId) && installedChunks[chunkId]) {
/******/ 					resolves.push(installedChunks[chunkId][0]);
/******/ 				}
/******/ 				installedChunks[chunkId] = 0;
/******/ 			}
/******/ 			for(moduleId in moreModules) {
/******/ 				if(__webpack_require__.o(moreModules, moduleId)) {
/******/ 					__webpack_require__.m[moduleId] = moreModules[moduleId];
/******/ 				}
/******/ 			}
/******/ 			if(runtime) runtime(__webpack_require__);
/******/ 			if(parentChunkLoadingFunction) parentChunkLoadingFunction(data);
/******/ 			while(resolves.length) {
/******/ 				resolves.shift()();
/******/ 			}
/******/ 		
/******/ 			// add entry modules from loaded chunk to deferred list
/******/ 			if(executeModules) deferredModules.push.apply(deferredModules, executeModules);
/******/ 		
/******/ 			// run deferred modules when all chunks ready
/******/ 			return checkDeferredModules();
/******/ 		}
/******/ 		
/******/ 		var chunkLoadingGlobal = self["webpackChunk"] = self["webpackChunk"] || [];
/******/ 		chunkLoadingGlobal.forEach(webpackJsonpCallback.bind(null, 0));
/******/ 		chunkLoadingGlobal.push = webpackJsonpCallback.bind(null, chunkLoadingGlobal.push.bind(chunkLoadingGlobal));
/******/ 		
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
/******/ 			if(deferredModules.length === 0) {
/******/ 				__webpack_require__.x();
/******/ 				__webpack_require__.x = x => {};
/******/ 			}
/******/ 			return result;
/******/ 		}
/******/ 		var startup = __webpack_require__.x;
/******/ 		__webpack_require__.x = () => {
/******/ 			// reset startup function so it can be called again when more startup code is added
/******/ 			__webpack_require__.x = startup || (x => {});
/******/ 			return (checkDeferredModules = checkDeferredModulesImpl)();
/******/ 		};
/******/ 	})();
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

# dist/aPage.bundle.js

```javascript
(self["webpackChunk"] = self["webpackChunk"] || []).push([["aPage"],{

/***/ 2:
/*!******************!*\
  !*** ./aPage.js ***!
  \******************/
/*! unknown exports (runtime-defined) */
/*! runtime requirements: module */
/*! CommonJS bailout: module.exports is used directly at 1:0-14 */
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
asset pageB.bundle.js 12.9 KiB [emitted] (name: pageB)
asset pageA.bundle.js 12.9 KiB [emitted] (name: pageA)
asset router_js.bundle.js 2.44 KiB [emitted]
asset aPage.bundle.js 392 bytes [emitted] (name: aPage)
asset bPage.bundle.js 392 bytes [emitted] (name: bPage)
Entrypoint pageA 15.7 KiB = router_js.bundle.js 2.44 KiB aPage.bundle.js 392 bytes pageA.bundle.js 12.9 KiB
Entrypoint pageB 15.7 KiB = router_js.bundle.js 2.44 KiB bPage.bundle.js 392 bytes pageB.bundle.js 12.9 KiB
chunk (runtime: pageA, pageB) aPage.bundle.js (aPage) 59 bytes [initial] [rendered] reused as split chunk (cache group: default)
  > ./aPage .// lazy ^\.\/.*Page$ chunkName: [request] namespace object ./aPage
  > ./aEntry pageA
  > ./router pageA
  ./aPage.js 59 bytes [built] [code generated]
    [used exports unknown]
    cjs require ./aPage ./aEntry.js 3:7-25
    cjs self exports reference ./aPage.js 1:0-14
    context element ./aPage .// lazy ^\.\/.*Page$ chunkName: [request] namespace object ./aPage
chunk (runtime: pageA, pageB) bPage.bundle.js (bPage) 59 bytes [initial] [rendered] reused as split chunk (cache group: default)
  > ./bPage .// lazy ^\.\/.*Page$ chunkName: [request] namespace object ./bPage
  > ./bEntry pageB
  > ./router pageB
  ./bPage.js 59 bytes [built] [code generated]
    [used exports unknown]
    cjs require ./bPage ./bEntry.js 3:7-25
    cjs self exports reference ./bPage.js 1:0-14
    context element ./bPage .// lazy ^\.\/.*Page$ chunkName: [request] namespace object ./bPage
chunk (runtime: pageA) pageA.bundle.js (pageA) 87 bytes (javascript) 7.75 KiB (runtime) [entry] [rendered]
  > ./aEntry pageA
  > ./router pageA
  runtime modules 7.75 KiB 9 modules
  ./aEntry.js 87 bytes [built] [code generated]
    [used exports unknown]
    entry ./aEntry pageA
chunk (runtime: pageB) pageB.bundle.js (pageB) 87 bytes (javascript) 7.75 KiB (runtime) [entry] [rendered]
  > ./bEntry pageB
  > ./router pageB
  runtime modules 7.75 KiB 9 modules
  ./bEntry.js 87 bytes [built] [code generated]
    [used exports unknown]
    entry ./bEntry pageB
chunk (runtime: pageA, pageB) router_js.bundle.js 951 bytes [initial] [rendered] split chunk (cache group: default)
  > ./aEntry pageA
  > ./router pageA
  > ./bEntry pageB
  > ./router pageB
  dependent modules 218 bytes [dependent] 2 modules
  ./router.js 733 bytes [built] [code generated]
    [used exports unknown]
    entry ./router pageA
    entry ./router pageB
webpack 5.11.1 compiled successfully
```

## Production mode

```
asset pageA.bundle.js 2.69 KiB [emitted] [minimized] (name: pageA)
asset pageB.bundle.js 2.69 KiB [emitted] [minimized] (name: pageB)
asset router_js.bundle.js 543 bytes [emitted] [minimized]
asset aPage.bundle.js 117 bytes [emitted] [minimized] (name: aPage)
asset bPage.bundle.js 117 bytes [emitted] [minimized] (name: bPage)
Entrypoint pageA 3.34 KiB = router_js.bundle.js 543 bytes aPage.bundle.js 117 bytes pageA.bundle.js 2.69 KiB
Entrypoint pageB 3.34 KiB = router_js.bundle.js 543 bytes bPage.bundle.js 117 bytes pageB.bundle.js 2.69 KiB
chunk (runtime: pageA, pageB) aPage.bundle.js (aPage) 59 bytes [initial] [rendered] reused as split chunk (cache group: default)
  > ./aPage .// lazy ^\.\/.*Page$ chunkName: [request] namespace object ./aPage
  > ./aEntry pageA
  > ./router pageA
  ./aPage.js 59 bytes [built] [code generated]
    [used exports unknown]
    cjs require ./aPage ./aEntry.js 3:7-25
    cjs self exports reference ./aPage.js 1:0-14
    context element ./aPage .// lazy ^\.\/.*Page$ chunkName: [request] namespace object ./aPage
chunk (runtime: pageA, pageB) bPage.bundle.js (bPage) 59 bytes [initial] [rendered] reused as split chunk (cache group: default)
  > ./bPage .// lazy ^\.\/.*Page$ chunkName: [request] namespace object ./bPage
  > ./bEntry pageB
  > ./router pageB
  ./bPage.js 59 bytes [built] [code generated]
    [used exports unknown]
    cjs require ./bPage ./bEntry.js 3:7-25
    cjs self exports reference ./bPage.js 1:0-14
    context element ./bPage .// lazy ^\.\/.*Page$ chunkName: [request] namespace object ./bPage
chunk (runtime: pageA) pageA.bundle.js (pageA) 87 bytes (javascript) 7.76 KiB (runtime) [entry] [rendered]
  > ./aEntry pageA
  > ./router pageA
  runtime modules 7.76 KiB 9 modules
  ./aEntry.js 87 bytes [built] [code generated]
    [no exports used]
    entry ./aEntry pageA
chunk (runtime: pageB) pageB.bundle.js (pageB) 87 bytes (javascript) 7.76 KiB (runtime) [entry] [rendered]
  > ./bEntry pageB
  > ./router pageB
  runtime modules 7.76 KiB 9 modules
  ./bEntry.js 87 bytes [built] [code generated]
    [no exports used]
    entry ./bEntry pageB
chunk (runtime: pageA, pageB) router_js.bundle.js 951 bytes [initial] [rendered] split chunk (cache group: default)
  > ./aEntry pageA
  > ./router pageA
  > ./bEntry pageB
  > ./router pageB
  dependent modules 218 bytes [dependent] 2 modules
  ./router.js 733 bytes [built] [code generated]
    [no exports used]
    entry ./router pageA
    entry ./router pageB
webpack 5.11.1 compiled successfully
```
