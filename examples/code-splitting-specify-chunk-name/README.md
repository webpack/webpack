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
/******/ (() => { // webpackBootstrap
/******/ 	var __webpack_modules__ = ([
/* 0 */,
/* 1 */
/*!*****************************************************************************!*\
  !*** ./templates lazy ^\.\/ba.*$ chunkName: chunk-bar-baz namespace object ***!
  \*****************************************************************************/
/*! exports [maybe provided (runtime-defined)] [no usage info] */
/*! runtime requirements: module, __webpack_require__, __webpack_require__.e, __webpack_require__.* */
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

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
		return Promise.resolve().then(() => {
			var e = new Error("Cannot find module '" + req + "'");
			e.code = 'MODULE_NOT_FOUND';
			throw e;
		});
	}

	var ids = map[req], id = ids[0];
	return __webpack_require__.e(ids[1]).then(() => {
		return __webpack_require__(id);
	});
}
webpackAsyncContext.keys = function webpackAsyncContextKeys() {
	return Object.keys(map);
};
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
/******/ 			return "" + chunkId + ".output.js";
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
/******/ 			179: 0
/******/ 		};
/******/ 		
/******/ 		
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
/******/ 		// no deferred startup or startup prefetching
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
/******/ 		};
/******/ 		
/******/ 		var jsonpArray = window["webpackJsonp"] = window["webpackJsonp"] || [];
/******/ 		var oldJsonpFunction = jsonpArray.push.bind(jsonpArray);
/******/ 		jsonpArray.push = webpackJsonpCallback;
/******/ 		
/******/ 		var parentJsonpFunction = oldJsonpFunction;
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
/*! exports [maybe provided (runtime-defined)] [no usage info] */
/*! runtime requirements: __webpack_require__, __webpack_require__.e, __webpack_require__.* */
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



}();
/******/ })()
;
```

# Info

## Unoptimized

```
Hash: 0a1b2c3d4e5f6a7b8c9d
Version: webpack 5.0.0-beta.6
        Asset       Size
548.output.js  835 bytes  [emitted]  [name: chunk-bar-baz2]
791.output.js  835 bytes  [emitted]  [name: chunk-bar-baz0]
930.output.js  835 bytes  [emitted]  [name: chunk-foo]
    output.js   10.3 KiB  [emitted]  [name: main]
Entrypoint main = output.js
chunk output.js (main) 565 bytes (javascript) 4.85 KiB (runtime) [entry] [rendered]
    > ./example.js main
 ./example.js 405 bytes [built]
     [used exports unknown]
     entry ./example.js main
 ./templates lazy ^\.\/ba.*$ chunkName: chunk-bar-baz namespace object 160 bytes [built]
     [used exports unknown]
     import() context lazy ./templates ./example.js 11:0-84
     + 6 hidden chunk modules
chunk 548.output.js (chunk-bar-baz2) 38 bytes [rendered]
    > ./baz ./templates lazy ^\.\/ba.*$ chunkName: chunk-bar-baz namespace object ./baz
    > ./baz.js ./templates lazy ^\.\/ba.*$ chunkName: chunk-bar-baz namespace object ./baz.js
 ./templates/baz.js 38 bytes [optional] [built]
     [exports: default]
     [used exports unknown]
     context element ./baz ./templates lazy ^\.\/ba.*$ chunkName: chunk-bar-baz namespace object ./baz
     context element ./baz.js ./templates lazy ^\.\/ba.*$ chunkName: chunk-bar-baz namespace object ./baz.js
chunk 791.output.js (chunk-bar-baz0) 38 bytes [rendered]
    > ./bar ./templates lazy ^\.\/ba.*$ chunkName: chunk-bar-baz namespace object ./bar
    > ./bar.js ./templates lazy ^\.\/ba.*$ chunkName: chunk-bar-baz namespace object ./bar.js
 ./templates/bar.js 38 bytes [optional] [built]
     [exports: default]
     [used exports unknown]
     context element ./bar ./templates lazy ^\.\/ba.*$ chunkName: chunk-bar-baz namespace object ./bar
     context element ./bar.js ./templates lazy ^\.\/ba.*$ chunkName: chunk-bar-baz namespace object ./bar.js
chunk 930.output.js (chunk-foo) 38 bytes [rendered]
    > ./templates/foo ./example.js 1:0-62
    > ./example.js 5:0-8:16
 ./templates/foo.js 38 bytes [built]
     [exports: default]
     [used exports unknown]
     import() ./templates/foo ./example.js 1:0-62
     cjs require ./templates/foo ./example.js 6:11-37
```

## Production mode

```
Hash: 0a1b2c3d4e5f6a7b8c9d
Version: webpack 5.0.0-beta.6
        Asset       Size
548.output.js  134 bytes  [emitted]  [name: chunk-bar-baz2]
791.output.js  134 bytes  [emitted]  [name: chunk-bar-baz0]
930.output.js  134 bytes  [emitted]  [name: chunk-foo]
    output.js   2.31 KiB  [emitted]  [name: main]
Entrypoint main = output.js
chunk output.js (main) 565 bytes (javascript) 4.85 KiB (runtime) [entry] [rendered]
    > ./example.js main
 ./example.js 405 bytes [built]
     [no exports used]
     entry ./example.js main
 ./templates lazy ^\.\/ba.*$ chunkName: chunk-bar-baz namespace object 160 bytes [built]
     import() context lazy ./templates ./example.js 11:0-84
     + 6 hidden chunk modules
chunk 548.output.js (chunk-bar-baz2) 38 bytes [rendered]
    > ./baz ./templates lazy ^\.\/ba.*$ chunkName: chunk-bar-baz namespace object ./baz
    > ./baz.js ./templates lazy ^\.\/ba.*$ chunkName: chunk-bar-baz namespace object ./baz.js
 ./templates/baz.js 38 bytes [optional] [built]
     [exports: default]
     context element ./baz ./templates lazy ^\.\/ba.*$ chunkName: chunk-bar-baz namespace object ./baz
     context element ./baz.js ./templates lazy ^\.\/ba.*$ chunkName: chunk-bar-baz namespace object ./baz.js
chunk 791.output.js (chunk-bar-baz0) 38 bytes [rendered]
    > ./bar ./templates lazy ^\.\/ba.*$ chunkName: chunk-bar-baz namespace object ./bar
    > ./bar.js ./templates lazy ^\.\/ba.*$ chunkName: chunk-bar-baz namespace object ./bar.js
 ./templates/bar.js 38 bytes [optional] [built]
     [exports: default]
     context element ./bar ./templates lazy ^\.\/ba.*$ chunkName: chunk-bar-baz namespace object ./bar
     context element ./bar.js ./templates lazy ^\.\/ba.*$ chunkName: chunk-bar-baz namespace object ./bar.js
chunk 930.output.js (chunk-foo) 38 bytes [rendered]
    > ./templates/foo ./example.js 1:0-62
    > ./example.js 5:0-8:16
 ./templates/foo.js 38 bytes [built]
     [exports: default]
     import() ./templates/foo ./example.js 1:0-62
     cjs require ./templates/foo ./example.js 6:11-37
```
