This example show how to use Code Splitting with the ES6 module syntax.

The standard `import` is sync.

`import(module: string) -> Promise` can be used to load modules on demand. This acts as split point for webpack and creates a chunk.

Providing dynamic expressions to `import` is possible. The same limits as with dynamic expressions in `require` calls apply here. Each possible module creates an additional chunk. In this example `import("c/" + name)` creates two additional chunks (one for each file in `node_modules/c/`). This is called "async context".

# example.js

``` javascript
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
/******/ 	// Load entry module and return exports
/******/ 	return __webpack_require__(0);
/******/ })
/************************************************************************/
```

</details>

``` javascript
/******/ ([
/* 0 */
/*!********************!*\
  !*** ./example.js ***!
  \********************/
/*! no exports provided */
/*! runtime requirements: __webpack_require__.r, __webpack_exports__, __webpack_require__, __webpack_require__.n, __webpack_require__.e, __webpack_require__.t, __webpack_require__.d */
/***/ (function(__unusedmodule, __webpack_exports__, __webpack_require__) {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony import */ var a__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! a */ 1);
/* harmony import */ var a__WEBPACK_IMPORTED_MODULE_0___default = /*#__PURE__*/__webpack_require__.n(a__WEBPACK_IMPORTED_MODULE_0__);


__webpack_require__.e(/*! import() */ 215).then(__webpack_require__.t.bind(__webpack_require__, /*! b */ 3, 7)).then(function(b) {
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
/*! no static exports found */
/*! runtime requirements:  */
/***/ (function() {

// module a

/***/ }),
/* 2 */
/*!*******************************************************!*\
  !*** ./node_modules/c lazy ^\.\/.*$ namespace object ***!
  \*******************************************************/
/*! no static exports found */
/*! runtime requirements: module, __webpack_require__, __webpack_require__.e, __webpack_require__.t, __webpack_require__.d, __webpack_require__.r */
/***/ (function(module, __unusedexports, __webpack_require__) {

var map = {
	"./1": [
		4,
		742
	],
	"./1.js": [
		4,
		742
	],
	"./2": [
		5,
		666
	],
	"./2.js": [
		5,
		666
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
webpackAsyncContext.id = 2;
module.exports = webpackAsyncContext;

/***/ })
/******/ ],
```

<details><summary><code>function(__webpack_require__) { /* webpackRuntimeModules */ });</code></summary>

``` js
/******/ function(__webpack_require__) { // webpackRuntimeModules
/******/ 	"use strict";
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
/******/ 	/* webpack/runtime/compat get default export */
/******/ 	!function() {
/******/ 		// getDefaultExport function for compatibility with non-harmony modules
/******/ 		__webpack_require__.n = function(module) {
/******/ 			var getter = module && module.__esModule ?
/******/ 				function getDefault() { return module['default']; } :
/******/ 				function getModuleExports() { return module; };
/******/ 			__webpack_require__.d(getter, 'a', getter);
/******/ 			return getter;
/******/ 		};
/******/ 	}();
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
/******/ 	/* webpack/runtime/publicPath */
/******/ 	!function() {
/******/ 		__webpack_require__.p = "dist/";
/******/ 	}();
/******/ 	
/******/ 	/* webpack/runtime/get javascript chunk filename */
/******/ 	!function() {
/******/ 		__webpack_require__.u = function(chunkId) {
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
/******/ 			404: 0
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
Version: webpack 5.0.0-next
        Asset       Size  Chunks             Chunk Names
215.output.js  287 bytes   {215}  [emitted]
666.output.js  295 bytes   {666}  [emitted]
742.output.js  295 bytes   {742}  [emitted]
    output.js   11.3 KiB   {404}  [emitted]  main
Entrypoint main = output.js
chunk {215} 215.output.js 11 bytes <{404}> [rendered]
    > b [0] ./example.js 3:0-11
 [3] ./node_modules/b.js 11 bytes {215} [built]
     [used exports unknown]
     import() b [0] ./example.js 3:0-11
chunk {404} output.js (main) 414 bytes (javascript) 5.12 KiB (runtime) >{215}< >{666}< >{742}< [entry] [rendered]
    > .\example.js main
 [0] ./example.js 243 bytes {404} [built]
     [no exports]
     [used exports unknown]
     entry .\example.js main
 [1] ./node_modules/a.js 11 bytes {404} [built]
     [used exports unknown]
     harmony side effect evaluation a [0] ./example.js 1:0-18
 [2] ./node_modules/c lazy ^\.\/.*$ namespace object 160 bytes {404} [built]
     [used exports unknown]
     import() context lazy c [0] ./example.js 8:8-27
     + 8 hidden chunk modules
chunk {666} 666.output.js 13 bytes <{404}> [rendered]
    > ./2 [2] ./node_modules/c lazy ^\.\/.*$ namespace object ./2
    > ./2.js [2] ./node_modules/c lazy ^\.\/.*$ namespace object ./2.js
 [5] ./node_modules/c/2.js 13 bytes {666} [optional] [built]
     [used exports unknown]
     context element ./2 [2] ./node_modules/c lazy ^\.\/.*$ namespace object ./2
     context element ./2.js [2] ./node_modules/c lazy ^\.\/.*$ namespace object ./2.js
chunk {742} 742.output.js 13 bytes <{404}> [rendered]
    > ./1 [2] ./node_modules/c lazy ^\.\/.*$ namespace object ./1
    > ./1.js [2] ./node_modules/c lazy ^\.\/.*$ namespace object ./1.js
 [4] ./node_modules/c/1.js 13 bytes {742} [optional] [built]
     [used exports unknown]
     context element ./1 [2] ./node_modules/c lazy ^\.\/.*$ namespace object ./1
     context element ./1.js [2] ./node_modules/c lazy ^\.\/.*$ namespace object ./1.js
```

## Production mode

```
Hash: 0a1b2c3d4e5f6a7b8c9d
Version: webpack 5.0.0-next
        Asset      Size  Chunks             Chunk Names
215.output.js  79 bytes   {215}  [emitted]
666.output.js  79 bytes   {666}  [emitted]
742.output.js  79 bytes   {742}  [emitted]
    output.js  2.61 KiB   {404}  [emitted]  main
Entrypoint main = output.js
chunk {215} 215.output.js 11 bytes <{404}> [rendered]
    > b [275] ./example.js 3:0-11
 [215] ./node_modules/b.js 11 bytes {215} [built]
       import() b [275] ./example.js 3:0-11
chunk {404} output.js (main) 414 bytes (javascript) 5.12 KiB (runtime) >{215}< >{666}< >{742}< [entry] [rendered]
    > .\example.js main
  [54] ./node_modules/a.js 11 bytes {404} [built]
       [no exports used]
       harmony side effect evaluation a [275] ./example.js 1:0-18
 [212] ./node_modules/c lazy ^\.\/.*$ namespace object 160 bytes {404} [built]
       import() context lazy c [275] ./example.js 8:8-27
 [275] ./example.js 243 bytes {404} [built]
       [no exports]
       entry .\example.js main
     + 8 hidden chunk modules
chunk {666} 666.output.js 13 bytes <{404}> [rendered]
    > ./2 [212] ./node_modules/c lazy ^\.\/.*$ namespace object ./2
    > ./2.js [212] ./node_modules/c lazy ^\.\/.*$ namespace object ./2.js
 [666] ./node_modules/c/2.js 13 bytes {666} [optional] [built]
       context element ./2 [212] ./node_modules/c lazy ^\.\/.*$ namespace object ./2
       context element ./2.js [212] ./node_modules/c lazy ^\.\/.*$ namespace object ./2.js
chunk {742} 742.output.js 13 bytes <{404}> [rendered]
    > ./1 [212] ./node_modules/c lazy ^\.\/.*$ namespace object ./1
    > ./1.js [212] ./node_modules/c lazy ^\.\/.*$ namespace object ./1.js
 [742] ./node_modules/c/1.js 13 bytes {742} [optional] [built]
       context element ./1 [212] ./node_modules/c lazy ^\.\/.*$ namespace object ./1
       context element ./1.js [212] ./node_modules/c lazy ^\.\/.*$ namespace object ./1.js
```
