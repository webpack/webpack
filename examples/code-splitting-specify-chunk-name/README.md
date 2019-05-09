# example.js

This example illustrates how to specify chunk name in `require.ensure()` and `import()` to separated modules into separate chunks manually.

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

<details><summary><code>/******/ (function(modules) { /* webpackBootstrap */ })</code></summary>

```javascript
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
/******/ 	// the startup function
/******/ 	function startup() {
/******/ 		// Load entry module and return exports
/******/ 		return __webpack_require__(0);
/******/ 	};
/******/ 	// initialize runtime
/******/ 	runtime(__webpack_require__);
/******/
/******/ 	// run startup
/******/ 	return startup();
/******/ })
/************************************************************************/
```

</details>

```javascript
/******/ ([
/* 0 */
/*!********************!*\
  !*** ./example.js ***!
  \********************/
/*! other exports [maybe provided (runtime-defined)] [no usage info] */
/*! runtime requirements: __webpack_require____webpack_require__.e,  */
/***/ (function(__unusedmodule, __unusedexports, __webpack_require__) {

__webpack_require__.e(/*! import() | chunk-foo */ 930).then(__webpack_require__.bind(null, /*! ./templates/foo */ 2)).then(function(foo) {
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




/***/ }),
/* 1 */
/*!****************************************************!*\
  !*** ./templates lazy ^\.\/ba.*$ namespace object ***!
  \****************************************************/
/*! other exports [maybe provided (runtime-defined)] [no usage info] */
/*! runtime requirements: module__webpack_require__, __webpack_require__.e,  */
/***/ (function(module, __unusedexports, __webpack_require__) {

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
	if(!Object.prototype.hasOwnProperty.call(map, req)) {
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
webpackAsyncContext.keys = function webpackAsyncContextKeys() {
	return Object.keys(map);
};
webpackAsyncContext.id = 1;
module.exports = webpackAsyncContext;

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
/******/ 		// This function allow to reference async chunks
/******/ 		__webpack_require__.u = function(chunkId) {
/******/ 			// return url for filenames based on template
/******/ 			return "" + chunkId + ".output.js";
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
/******/ 			179: 0
/******/ 		};
/******/ 		
/******/ 		
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
/******/ 		// no deferred startup
/******/ 		
/******/ 		// install a JSONP callback for chunk loading
/******/ 		function webpackJsonpCallback(data) {
/******/ 			var chunkIds = data[0];
/******/ 			var moreModules = data[1];
/******/ 		
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
/******/ 		};
/******/ 		
/******/ 		var jsonpArray = window["webpackJsonp"] = window["webpackJsonp"] || [];
/******/ 		var oldJsonpFunction = jsonpArray.push.bind(jsonpArray);
/******/ 		jsonpArray.push = webpackJsonpCallback;
/******/ 		
/******/ 		var parentJsonpFunction = oldJsonpFunction;
/******/ 	}();
/******/ 	
/******/ }
);
```

</details>


# Info

## Unoptimized

```
Hash: 0a1b2c3d4e5f6a7b8c9d
Version: webpack 5.0.0-alpha.11
        Asset       Size  Chunks             Chunk Names
548.output.js  646 bytes   {548}  [emitted]  chunk-bar-baz2
791.output.js  646 bytes   {791}  [emitted]  chunk-bar-baz0
930.output.js  646 bytes   {930}  [emitted]  chunk-foo
    output.js   9.24 KiB   {179}  [emitted]  main
Entrypoint main = output.js
chunk {179} output.js (main) 565 bytes (javascript) 3.92 KiB (runtime) [entry] [rendered]
    > ./example.js main
 [0] ./example.js 405 bytes {179} [built]
     [used exports unknown]
     entry ./example.js main
 [1] ./templates lazy ^\.\/ba.*$ namespace object 160 bytes {179} [built]
     [used exports unknown]
     import() context lazy ./templates [0] ./example.js 11:0-84
     + 5 hidden chunk modules
chunk {548} 548.output.js (chunk-bar-baz2) 38 bytes [rendered]
    > ./baz [1] ./templates lazy ^\.\/ba.*$ namespace object ./baz
    > ./baz.js [1] ./templates lazy ^\.\/ba.*$ namespace object ./baz.js
 [4] ./templates/baz.js 38 bytes {548} [optional] [built]
     [exports: default]
     [used exports unknown]
     context element ./baz [1] ./templates lazy ^\.\/ba.*$ namespace object ./baz
     context element ./baz.js [1] ./templates lazy ^\.\/ba.*$ namespace object ./baz.js
chunk {791} 791.output.js (chunk-bar-baz0) 38 bytes [rendered]
    > ./bar [1] ./templates lazy ^\.\/ba.*$ namespace object ./bar
    > ./bar.js [1] ./templates lazy ^\.\/ba.*$ namespace object ./bar.js
 [3] ./templates/bar.js 38 bytes {791} [optional] [built]
     [exports: default]
     [used exports unknown]
     context element ./bar [1] ./templates lazy ^\.\/ba.*$ namespace object ./bar
     context element ./bar.js [1] ./templates lazy ^\.\/ba.*$ namespace object ./bar.js
chunk {930} 930.output.js (chunk-foo) 38 bytes [rendered]
    > ./templates/foo [0] ./example.js 1:0-62
    > [0] ./example.js 5:0-8:16
 [2] ./templates/foo.js 38 bytes {930} [built]
     [exports: default]
     [used exports unknown]
     import() ./templates/foo [0] ./example.js 1:0-62
     cjs require ./templates/foo [0] ./example.js 6:11-37
```

## Production mode

```
Hash: 0a1b2c3d4e5f6a7b8c9d
Version: webpack 5.0.0-alpha.11
        Asset       Size  Chunks             Chunk Names
548.output.js  119 bytes   {548}  [emitted]  chunk-bar-baz2
791.output.js  119 bytes   {791}  [emitted]  chunk-bar-baz0
930.output.js  119 bytes   {930}  [emitted]  chunk-foo
    output.js   2.13 KiB   {179}  [emitted]  main
Entrypoint main = output.js
chunk {179} output.js (main) 565 bytes (javascript) 3.92 KiB (runtime) [entry] [rendered]
    > ./example.js main
 [144] ./example.js 405 bytes {179} [built]
       entry ./example.js main
 [996] ./templates lazy ^\.\/ba.*$ namespace object 160 bytes {179} [built]
       import() context lazy ./templates [144] ./example.js 11:0-84
     + 5 hidden chunk modules
chunk {548} 548.output.js (chunk-bar-baz2) 38 bytes [rendered]
    > ./baz [996] ./templates lazy ^\.\/ba.*$ namespace object ./baz
    > ./baz.js [996] ./templates lazy ^\.\/ba.*$ namespace object ./baz.js
 [544] ./templates/baz.js 38 bytes {548} [optional] [built]
       [exports: default]
       context element ./baz [996] ./templates lazy ^\.\/ba.*$ namespace object ./baz
       context element ./baz.js [996] ./templates lazy ^\.\/ba.*$ namespace object ./baz.js
chunk {791} 791.output.js (chunk-bar-baz0) 38 bytes [rendered]
    > ./bar [996] ./templates lazy ^\.\/ba.*$ namespace object ./bar
    > ./bar.js [996] ./templates lazy ^\.\/ba.*$ namespace object ./bar.js
 [398] ./templates/bar.js 38 bytes {791} [optional] [built]
       [exports: default]
       context element ./bar [996] ./templates lazy ^\.\/ba.*$ namespace object ./bar
       context element ./bar.js [996] ./templates lazy ^\.\/ba.*$ namespace object ./bar.js
chunk {930} 930.output.js (chunk-foo) 38 bytes [rendered]
    > ./templates/foo [144] ./example.js 1:0-62
    > [144] ./example.js 5:0-8:16
 [718] ./templates/foo.js 38 bytes {930} [built]
       [exports: default]
       import() ./templates/foo [144] ./example.js 1:0-62
       cjs require ./templates/foo [144] ./example.js 6:11-37
```
