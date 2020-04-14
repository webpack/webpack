This example shows the automatically created async commons chunks.

The example entry references two chunks:

- entry chunk
  - async require -> chunk X
  - async require -> chunk Y
- chunk X
  - module `a`
  - module `b`
  - module `c`
- chunk Y
  - module `a`
  - module `b`
  - module `d`

These chunks share modules `a` and `b`. The optimization extract these into chunk Z:

Note: The optimization compares the size of chunk Z to some minimum value, but this is disabled from this example. In practice, there is no configuration needed for this.

- entry chunk
  - async require -> chunk X & Z
  - async require -> chunk Y & Z
- chunk X
  - module `c`
- chunk Y
  - module `d`
- chunk Z
  - module `a`
  - module `b`

Pretty useful for a router in a SPA.

# example.js

```javascript
// a chunks with a, b, c
require(["./a", "./b", "./c"]);

// a chunk with a, b, d
require.ensure(["./a"], function(require) {
	require("./b");
	require("./d");
});
```

# dist/output.js

```javascript
/******/ (() => { // webpackBootstrap
/******/ 	var __webpack_modules__ = ({});
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
/*!********************!*\
  !*** ./example.js ***!
  \********************/
/*! exports [maybe provided (runtime-defined)] [no usage info] */
/*! runtime requirements: __webpack_require__, __webpack_require__.e, __webpack_require__.oe, __webpack_require__.* */
// a chunks with a, b, c
Promise.all(/*! AMD require */[__webpack_require__.e(394), __webpack_require__.e(460)]).then(function() {[__webpack_require__(/*! ./a */ 1), __webpack_require__(/*! ./b */ 2), __webpack_require__(/*! ./c */ 3)];}).catch(__webpack_require__.oe);

// a chunk with a, b, d
Promise.all(/*! require.ensure */[__webpack_require__.e(394), __webpack_require__.e(767)]).then((function(require) {
	__webpack_require__(/*! ./b */ 2);
	__webpack_require__(/*! ./d */ 4);
}).bind(null, __webpack_require__)).catch(__webpack_require__.oe);

/******/ })()
;
```

# dist/394.output.js

```javascript
(window["webpackJsonp"] = window["webpackJsonp"] || []).push([[394],[
/* 0 */,
/* 1 */
/*!**************!*\
  !*** ./a.js ***!
  \**************/
/*! exports [maybe provided (runtime-defined)] [no usage info] */
/*! runtime requirements: module */
/***/ ((module) => {

module.exports = "a";

/***/ }),
/* 2 */
/*!**************!*\
  !*** ./b.js ***!
  \**************/
/*! exports [maybe provided (runtime-defined)] [no usage info] */
/*! runtime requirements: module */
/***/ ((module) => {

module.exports = "b";

/***/ })
]]);
```

# dist/460.output.js

```javascript
(window["webpackJsonp"] = window["webpackJsonp"] || []).push([[460],{

/***/ 3:
/*!**************!*\
  !*** ./c.js ***!
  \**************/
/*! exports [maybe provided (runtime-defined)] [no usage info] */
/*! runtime requirements: module */
/***/ ((module) => {

module.exports = "c";

/***/ })

}]);
```

# dist/767.output.js

```javascript
(window["webpackJsonp"] = window["webpackJsonp"] || []).push([[767],{

/***/ 4:
/*!**************!*\
  !*** ./d.js ***!
  \**************/
/*! exports [maybe provided (runtime-defined)] [no usage info] */
/*! runtime requirements: module */
/***/ ((module) => {

module.exports = "d";

/***/ })

}]);
```

# Info

## Unoptimized

```
Hash: 0a1b2c3d4e5f6a7b8c9d
Version: webpack 5.0.0-beta.6
        Asset       Size
394.output.js  530 bytes  [emitted]
460.output.js  300 bytes  [emitted]
767.output.js  300 bytes  [emitted]
    output.js    8.2 KiB  [emitted]  [name: main]
Entrypoint main = output.js
chunk output.js (main) 164 bytes (javascript) 4.23 KiB (runtime) [entry] [rendered]
    > ./example.js main
 ./example.js 164 bytes [built]
     [used exports unknown]
     entry ./example.js main
     + 4 hidden chunk modules
chunk 394.output.js 42 bytes [rendered] split chunk (cache group: default)
    > ./a ./b ./c ./example.js 2:0-30
    > ./example.js 5:0-8:2
 ./a.js 21 bytes [built]
     [used exports unknown]
     amd require ./a ./example.js 2:0-30
     require.ensure item ./a ./example.js 5:0-8:2
 ./b.js 21 bytes [built]
     [used exports unknown]
     amd require ./b ./example.js 2:0-30
     cjs require ./b ./example.js 6:1-15
chunk 460.output.js 21 bytes [rendered]
    > ./a ./b ./c ./example.js 2:0-30
 ./c.js 21 bytes [built]
     [used exports unknown]
     amd require ./c ./example.js 2:0-30
chunk 767.output.js 21 bytes [rendered]
    > ./example.js 5:0-8:2
 ./d.js 21 bytes [built]
     [used exports unknown]
     cjs require ./d ./example.js 7:1-15
```

## Production mode

```
Hash: 0a1b2c3d4e5f6a7b8c9d
Version: webpack 5.0.0-beta.6
        Asset       Size
394.output.js  108 bytes  [emitted]
460.output.js   85 bytes  [emitted]
767.output.js   85 bytes  [emitted]
    output.js   1.56 KiB  [emitted]  [name: main]
Entrypoint main = output.js
chunk output.js (main) 164 bytes (javascript) 4.23 KiB (runtime) [entry] [rendered]
    > ./example.js main
 ./example.js 164 bytes [built]
     [no exports used]
     entry ./example.js main
     + 4 hidden chunk modules
chunk 394.output.js 42 bytes [rendered] split chunk (cache group: default)
    > ./a ./b ./c ./example.js 2:0-30
    > ./example.js 5:0-8:2
 ./a.js 21 bytes [built]
     amd require ./a ./example.js 2:0-30
     require.ensure item ./a ./example.js 5:0-8:2
 ./b.js 21 bytes [built]
     amd require ./b ./example.js 2:0-30
     cjs require ./b ./example.js 6:1-15
chunk 460.output.js 21 bytes [rendered]
    > ./a ./b ./c ./example.js 2:0-30
 ./c.js 21 bytes [built]
     amd require ./c ./example.js 2:0-30
chunk 767.output.js 21 bytes [rendered]
    > ./example.js 5:0-8:2
 ./d.js 21 bytes [built]
     cjs require ./d ./example.js 7:1-15
```
