# example.js

This example illustrates how to specify the chunk name in `require.ensure()` and `import()` to separated modules into separate chunks manually.

```javascript
import("./templates/foo" /* webpackChunkName: "chunk-foo" */ ).then(function(foo) {
	console.log('foo:', foo);
})

require.ensure([], function(require) {
	var foo = require("./templates/foo");
	console.log('foo:', foo);
}, "chunk-foo1");

var createContextVar = "r";
import("./templates/ba" + createContextVar /* webpackChunkName: "chunk-bar-baz" */ ).then(function(bar) {
	console.log('bar:', bar);
})
```

# templates/

- foo.js
- baz.js
- bar.js

All templates are of this pattern:

```javascript
var foo = "foo";

export default foo;
```

# dist/output.js

```javascript
/******/ (function() { // webpackBootstrap
/******/ 	var __webpack_modules__ = ([
/* 0 */,
/* 1 */
/*!******************************************************************************!*\
  !*** ./templates/ lazy ^\.\/ba.*$ chunkName: chunk-bar-baz namespace object ***!
  \******************************************************************************/
/*! default exports */
/*! exports [not provided] [no usage info] */
/*! runtime requirements: module, __webpack_require__.o, __webpack_require__, __webpack_require__.e, __webpack_require__.* */
/***/ (function(module, __unused_webpack_exports, __webpack_require__) {

var map = {
	"./bar": [
		3,
		791
	],
	"./bar.js": [
		3,
		791
	],
	"./baz": [
		4,
		548
	],
	"./baz.js": [
		4,
		548
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
		return __webpack_require__(id);
	});
}
webpackAsyncContext.keys = function() { return Object.keys(map); };
webpackAsyncContext.id = 1;
module.exports = webpackAsyncContext;

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
/************************************************************************/
/******/ 	/* webpack/runtime/ensure chunk */
/******/ 	!function() {
/******/ 		__webpack_require__.f = {};
/******/ 		// This file contains only the entry chunk.
/******/ 		// The chunk loading function for additional chunks
/******/ 		__webpack_require__.e = function(chunkId) {
/******/ 			return Promise.all(Object.keys(__webpack_require__.f).reduce(function(promises, key) {
/******/ 				__webpack_require__.f[key](chunkId, promises);
/******/ 				return promises;
/******/ 			}, []));
/******/ 		};
/******/ 	}();
/******/ 	
/******/ 	/* webpack/runtime/get javascript chunk filename */
/******/ 	!function() {
/******/ 		// This function allow to reference async chunks
/******/ 		__webpack_require__.u = function(chunkId) {
/******/ 			// return url for filenames based on template
/******/ 			return "" + chunkId + ".output.js";
/******/ 		};
/******/ 	}();
/******/ 	
/******/ 	/* webpack/runtime/hasOwnProperty shorthand */
/******/ 	!function() {
/******/ 		__webpack_require__.o = function(obj, prop) { return Object.prototype.hasOwnProperty.call(obj, prop); }
/******/ 	}();
/******/ 	
/******/ 	/* webpack/runtime/load script */
/******/ 	!function() {
/******/ 		var inProgress = {};
/******/ 		// data-webpack is not used as build has no uniqueName
/******/ 		// loadScript function to load a script via script tag
/******/ 		__webpack_require__.l = function(url, done, key) {
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
/******/ 			var onScriptComplete = function(prev, event) {
/******/ 				// avoid mem leaks in IE.
/******/ 				script.onerror = script.onload = null;
/******/ 				clearTimeout(timeout);
/******/ 				var doneFns = inProgress[url];
/******/ 				delete inProgress[url];
/******/ 				script.parentNode && script.parentNode.removeChild(script);
/******/ 				doneFns && doneFns.forEach(function(fn) { return fn(event); });
/******/ 				if(prev) return prev(event);
/******/ 			}
/******/ 			;
/******/ 			var timeout = setTimeout(onScriptComplete.bind(null, undefined, { type: 'timeout', target: script }), 120000);
/******/ 			script.onerror = onScriptComplete.bind(null, script.onerror);
/******/ 			script.onload = onScriptComplete.bind(null, script.onload);
/******/ 			needAttach && document.head.appendChild(script);
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
/******/ 	/* webpack/runtime/jsonp chunk loading */
/******/ 	!function() {
/******/ 		// no baseURI
/******/ 		
/******/ 		// object to store loaded and loading chunks
/******/ 		// undefined = chunk not loaded, null = chunk preloaded/prefetched
/******/ 		// Promise = chunk loading, 0 = chunk loaded
/******/ 		var installedChunks = {
/******/ 			179: 0
/******/ 		};
/******/ 		
/******/ 		
/******/ 		__webpack_require__.f.j = function(chunkId, promises) {
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
/******/ 							var promise = new Promise(function(resolve, reject) {
/******/ 								installedChunkData = installedChunks[chunkId] = [resolve, reject];
/******/ 							});
/******/ 							promises.push(installedChunkData[2] = promise);
/******/ 		
/******/ 							// start chunk loading
/******/ 							var url = __webpack_require__.p + __webpack_require__.u(chunkId);
/******/ 							// create error before stack unwound to get useful stacktrace later
/******/ 							var error = new Error();
/******/ 							var loadingEnded = function(event) {
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
/******/ 		// no deferred startup
/******/ 		
/******/ 		// install a JSONP callback for chunk loading
/******/ 		var webpackJsonpCallback = function(data) {
/******/ 			var chunkIds = data[0];
/******/ 			var moreModules = data[1];
/******/ 			var runtime = data[2];
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
/******/ 			parentChunkLoadingFunction(data);
/******/ 			while(resolves.length) {
/******/ 				resolves.shift()();
/******/ 			}
/******/ 		
/******/ 		}
/******/ 		
/******/ 		var chunkLoadingGlobal = self["webpackChunk"] = self["webpackChunk"] || [];
/******/ 		var parentChunkLoadingFunction = chunkLoadingGlobal.push.bind(chunkLoadingGlobal);
/******/ 		chunkLoadingGlobal.push = webpackJsonpCallback;
/******/ 	}();
/******/ 	
/************************************************************************/
```

</details>

``` js
!function() {
/*!********************!*\
  !*** ./example.js ***!
  \********************/
/*! unknown exports (runtime-defined) */
/*! runtime requirements: __webpack_require__, __webpack_require__.e, __webpack_require__.* */
__webpack_require__.e(/*! import() | chunk-foo */ 930).then(__webpack_require__.bind(__webpack_require__, /*! ./templates/foo */ 2)).then(function(foo) {
	console.log('foo:', foo);
})

__webpack_require__.e(/*! require.ensure | chunk-foo1 */ 930).then((function(require) {
	var foo = __webpack_require__(/*! ./templates/foo */ 2);
	console.log('foo:', foo);
}).bind(null, __webpack_require__)).catch(__webpack_require__.oe);

var createContextVar = "r";
__webpack_require__(1)("./ba" + createContextVar).then(function(bar) {
	console.log('bar:', bar);
})



}();
/******/ })()
;
```

# Info

## Unoptimized

```
asset output.js 10.8 KiB [emitted] (name: main)
asset 548.output.js 678 bytes [emitted] (name: chunk-bar-baz2)
asset 791.output.js 678 bytes [emitted] (name: chunk-bar-baz0)
asset 930.output.js 678 bytes [emitted] (name: chunk-foo)
chunk output.js (main) 565 bytes (javascript) 5.23 KiB (runtime) [entry] [rendered]
  > ./example.js main
  runtime modules 5.23 KiB 7 modules
  dependent modules 160 bytes [dependent] 1 module
  ./example.js 405 bytes [built] [code generated]
    [used exports unknown]
    entry ./example.js main
chunk 548.output.js (chunk-bar-baz2) 38 bytes [rendered]
  > ./baz ./templates/ lazy ^\.\/ba.*$ chunkName: chunk-bar-baz namespace object ./baz
  > ./baz.js ./templates/ lazy ^\.\/ba.*$ chunkName: chunk-bar-baz namespace object ./baz.js
  ./templates/baz.js 38 bytes [optional] [built] [code generated]
    [exports: default]
    [used exports unknown]
    context element ./baz ./templates/ lazy ^\.\/ba.*$ chunkName: chunk-bar-baz namespace object ./baz
    context element ./baz.js ./templates/ lazy ^\.\/ba.*$ chunkName: chunk-bar-baz namespace object ./baz.js
chunk 791.output.js (chunk-bar-baz0) 38 bytes [rendered]
  > ./bar ./templates/ lazy ^\.\/ba.*$ chunkName: chunk-bar-baz namespace object ./bar
  > ./bar.js ./templates/ lazy ^\.\/ba.*$ chunkName: chunk-bar-baz namespace object ./bar.js
  ./templates/bar.js 38 bytes [optional] [built] [code generated]
    [exports: default]
    [used exports unknown]
    context element ./bar ./templates/ lazy ^\.\/ba.*$ chunkName: chunk-bar-baz namespace object ./bar
    context element ./bar.js ./templates/ lazy ^\.\/ba.*$ chunkName: chunk-bar-baz namespace object ./bar.js
chunk 930.output.js (chunk-foo) 38 bytes [rendered]
  > ./templates/foo ./example.js 1:0-62
  > ./example.js 5:0-8:16
  ./templates/foo.js 38 bytes [built] [code generated]
    [exports: default]
    [used exports unknown]
    import() ./templates/foo ./example.js 1:0-62
    cjs require ./templates/foo ./example.js 6:11-37
webpack 5.0.0-rc.0 compiled successfully
```

## Production mode

```
asset output.js 2.48 KiB [emitted] [minimized] (name: main)
asset 548.output.js 115 bytes [emitted] [minimized] (name: chunk-bar-baz2)
asset 791.output.js 115 bytes [emitted] [minimized] (name: chunk-bar-baz0)
asset 930.output.js 115 bytes [emitted] [minimized] (name: chunk-foo)
chunk (runtime: main) output.js (main) 565 bytes (javascript) 5.23 KiB (runtime) [entry] [rendered]
  > ./example.js main
  runtime modules 5.23 KiB 7 modules
  dependent modules 160 bytes [dependent] 1 module
  ./example.js 405 bytes [built] [code generated]
    [no exports used]
    entry ./example.js main
chunk (runtime: main) 548.output.js (chunk-bar-baz2) 38 bytes [rendered]
  > ./baz ./templates/ lazy ^\.\/ba.*$ chunkName: chunk-bar-baz namespace object ./baz
  > ./baz.js ./templates/ lazy ^\.\/ba.*$ chunkName: chunk-bar-baz namespace object ./baz.js
  ./templates/baz.js 38 bytes [optional] [built] [code generated]
    [exports: default]
    context element ./baz ./templates/ lazy ^\.\/ba.*$ chunkName: chunk-bar-baz namespace object ./baz
    context element ./baz.js ./templates/ lazy ^\.\/ba.*$ chunkName: chunk-bar-baz namespace object ./baz.js
chunk (runtime: main) 791.output.js (chunk-bar-baz0) 38 bytes [rendered]
  > ./bar ./templates/ lazy ^\.\/ba.*$ chunkName: chunk-bar-baz namespace object ./bar
  > ./bar.js ./templates/ lazy ^\.\/ba.*$ chunkName: chunk-bar-baz namespace object ./bar.js
  ./templates/bar.js 38 bytes [optional] [built] [code generated]
    [exports: default]
    context element ./bar ./templates/ lazy ^\.\/ba.*$ chunkName: chunk-bar-baz namespace object ./bar
    context element ./bar.js ./templates/ lazy ^\.\/ba.*$ chunkName: chunk-bar-baz namespace object ./bar.js
chunk (runtime: main) 930.output.js (chunk-foo) 38 bytes [rendered]
  > ./templates/foo ./example.js 1:0-62
  > ./example.js 5:0-8:16
  ./templates/foo.js 38 bytes [built] [code generated]
    [exports: default]
    import() ./templates/foo ./example.js 1:0-62
    cjs require ./templates/foo ./example.js 6:11-37
webpack 5.0.0-rc.0 compiled successfully
```
