This example shows how to use Code Splitting with the ES6 module syntax.

The standard `import` is sync.

`import(module: string) -> Promise` can be used to load modules on demand. This acts as a split point for webpack and creates a chunk.

Providing dynamic expressions to `import` is possible. The same limits as with dynamic expressions in `require` calls apply here. Each possible module creates an additional chunk. In this example `import("c/" + name)` creates two additional chunks (one for each file in `node_modules/c/`). This is called "async context".

# example.js

```javascript
import a from "a";

import("b").then(function(b) {
	console.log("b loaded", b);
})

function loadC(name) {
	return import("c/" + name);
}

Promise.all([loadC("1"), loadC("2")]).then(function(arr) {
	console.log("c/1 and c/2 loaded", arr);
});
```

# dist/output.js

```javascript
/******/ (() => { // webpackBootstrap
/******/ 	var __webpack_modules__ = ([
/* 0 */
/*!********************!*\
  !*** ./example.js ***!
  \********************/
/*! exports [not provided] [no usage info] */
/*! runtime requirements: __webpack_require__, __webpack_require__.n, __webpack_require__.r, __webpack_exports__, __webpack_require__.e, __webpack_require__.t, __webpack_require__.* */
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony import */ var a__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! a */ 1);
/* harmony import */ var a__WEBPACK_IMPORTED_MODULE_0___default = /*#__PURE__*/__webpack_require__.n(a__WEBPACK_IMPORTED_MODULE_0__);


__webpack_require__.e(/*! import() */ 644).then(__webpack_require__.t.bind(__webpack_require__, /*! b */ 3, 7)).then(function(b) {
	console.log("b loaded", b);
})

function loadC(name) {
	return __webpack_require__(2)("./" + name);
}

Promise.all([loadC("1"), loadC("2")]).then(function(arr) {
	console.log("c/1 and c/2 loaded", arr);
});


/***/ }),
/* 1 */
/*!***************************!*\
  !*** ./node_modules/a.js ***!
  \***************************/
/*! exports [maybe provided (runtime-defined)] [no usage info] */
/*! runtime requirements:  */
/***/ (() => {

// module a

/***/ }),
/* 2 */
/*!*******************************************************!*\
  !*** ./node_modules/c lazy ^\.\/.*$ namespace object ***!
  \*******************************************************/
/*! exports [maybe provided (runtime-defined)] [no usage info] */
/*! runtime requirements: module, __webpack_require__, __webpack_require__.e, __webpack_require__.t, __webpack_require__.* */
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

var map = {
	"./1": [
		4,
		346
	],
	"./1.js": [
		4,
		346
	],
	"./2": [
		5,
		98
	],
	"./2.js": [
		5,
		98
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
webpackAsyncContext.id = 2;
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
/******/ 	/* webpack/runtime/compat get default export */
/******/ 	!function() {
/******/ 		// getDefaultExport function for compatibility with non-harmony modules
/******/ 		__webpack_require__.n = (module) => {
/******/ 			var getter = module && module.__esModule ?
/******/ 				() => module['default'] :
/******/ 				() => module;
/******/ 			__webpack_require__.d(getter, { a: getter });
/******/ 			return getter;
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
/******/ 	// startup
/******/ 	// Load entry module
/******/ 	__webpack_require__(0);
/******/ 	// This entry module used 'exports' so it can't be inlined
/******/ })()
;
```

# Info

## Unoptimized

```
Hash: 0a1b2c3d4e5f6a7b8c9d
Version: webpack 5.0.0-beta.6
        Asset       Size
346.output.js  325 bytes  [emitted]
644.output.js  317 bytes  [emitted]
 98.output.js  324 bytes  [emitted]
    output.js   12.3 KiB  [emitted]  [name: main]
Entrypoint main = output.js
chunk 98.output.js 13 bytes [rendered]
    > ./2 ./node_modules/c lazy ^\.\/.*$ namespace object ./2
    > ./2.js ./node_modules/c lazy ^\.\/.*$ namespace object ./2.js
 ./node_modules/c/2.js 13 bytes [optional] [built]
     [used exports unknown]
     context element ./2 ./node_modules/c lazy ^\.\/.*$ namespace object ./2
     context element ./2.js ./node_modules/c lazy ^\.\/.*$ namespace object ./2.js
chunk output.js (main) 414 bytes (javascript) 5.77 KiB (runtime) [entry] [rendered]
    > ./example.js main
 ./example.js 243 bytes [built]
     [no exports]
     [used exports unknown]
     entry ./example.js main
 ./node_modules/a.js 11 bytes [built]
     [used exports unknown]
     harmony side effect evaluation a ./example.js 1:0-18
 ./node_modules/c lazy ^\.\/.*$ namespace object 160 bytes [built]
     [used exports unknown]
     import() context lazy c ./example.js 8:8-27
     + 8 hidden chunk modules
chunk 346.output.js 13 bytes [rendered]
    > ./1 ./node_modules/c lazy ^\.\/.*$ namespace object ./1
    > ./1.js ./node_modules/c lazy ^\.\/.*$ namespace object ./1.js
 ./node_modules/c/1.js 13 bytes [optional] [built]
     [used exports unknown]
     context element ./1 ./node_modules/c lazy ^\.\/.*$ namespace object ./1
     context element ./1.js ./node_modules/c lazy ^\.\/.*$ namespace object ./1.js
chunk 644.output.js 11 bytes [rendered]
    > b ./example.js 3:0-11
 ./node_modules/b.js 11 bytes [built]
     [used exports unknown]
     import() b ./example.js 3:0-11
```

## Production mode

```
Hash: 0a1b2c3d4e5f6a7b8c9d
Version: webpack 5.0.0-beta.6
        Asset      Size
346.output.js  73 bytes  [emitted]
644.output.js  73 bytes  [emitted]
 98.output.js  71 bytes  [emitted]
    output.js  2.62 KiB  [emitted]  [name: main]
Entrypoint main = output.js
chunk 98.output.js 13 bytes [rendered]
    > ./2 ./node_modules/c lazy ^\.\/.*$ namespace object ./2
    > ./2.js ./node_modules/c lazy ^\.\/.*$ namespace object ./2.js
 ./node_modules/c/2.js 13 bytes [optional] [built]
     context element ./2 ./node_modules/c lazy ^\.\/.*$ namespace object ./2
     context element ./2.js ./node_modules/c lazy ^\.\/.*$ namespace object ./2.js
chunk output.js (main) 414 bytes (javascript) 5.77 KiB (runtime) [entry] [rendered]
    > ./example.js main
 ./example.js 243 bytes [built]
     [no exports]
     [no exports used]
     entry ./example.js main
 ./node_modules/a.js 11 bytes [built]
     [no exports used]
     harmony side effect evaluation a ./example.js 1:0-18
 ./node_modules/c lazy ^\.\/.*$ namespace object 160 bytes [built]
     import() context lazy c ./example.js 8:8-27
     + 8 hidden chunk modules
chunk 346.output.js 13 bytes [rendered]
    > ./1 ./node_modules/c lazy ^\.\/.*$ namespace object ./1
    > ./1.js ./node_modules/c lazy ^\.\/.*$ namespace object ./1.js
 ./node_modules/c/1.js 13 bytes [optional] [built]
     context element ./1 ./node_modules/c lazy ^\.\/.*$ namespace object ./1
     context element ./1.js ./node_modules/c lazy ^\.\/.*$ namespace object ./1.js
chunk 644.output.js 11 bytes [rendered]
    > b ./example.js 3:0-11
 ./node_modules/b.js 11 bytes [built]
     import() b ./example.js 3:0-11
```
