# example.js

```javascript
require(["./a", "./b", "./c"], function(a, b, c) {});

require.ensure(["./a"], function(require) {
	require("./b");
	require("./d");
});

require.ensure(["./a", "./e"], function(require) {
	require("./a");
	require.ensure(["./b"], function(require) {
		require("./f");
	});
	require.ensure(["./b"], function(require) {
		require("./g");
	});
});
```

# webpack.config.js

```javascript
module.exports = {
	// mode: "development || "production",
	optimization: {
		splitChunks: {
			minSize: 0 // This example is too small
		},
		chunkIds: "deterministic" // To keep filename consistent between different modes (for example building only)
	}
};
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
/******/ 			return "" + chunkId + ".output.js";
/******/ 		};
/******/ 	})();
/******/ 	
/******/ 	/* webpack/runtime/hasOwnProperty shorthand */
/******/ 	(() => {
/******/ 		__webpack_require__.o = (obj, prop) => Object.prototype.hasOwnProperty.call(obj, prop)
/******/ 	})();
/******/ 	
/******/ 	/* webpack/runtime/publicPath */
/******/ 	(() => {
/******/ 		__webpack_require__.p = "dist/";
/******/ 	})();
/******/ 	
/******/ 	/* webpack/runtime/jsonp chunk loading */
/******/ 	(() => {
/******/ 		// object to store loaded and loading chunks
/******/ 		// undefined = chunk not loaded, null = chunk preloaded/prefetched
/******/ 		// Promise = chunk loading, 0 = chunk loaded
/******/ 		var installedChunks = {
/******/ 			179: 0
/******/ 		};
/******/ 		
/******/ 		
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
/******/ 							var loadingEnded = () => {
/******/ 								if(__webpack_require__.o(installedChunks, chunkId)) {
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
/******/ 							onScriptComplete = (event) => {
/******/ 								onScriptComplete = () => {
/******/ 		
/******/ 								}
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
/******/ 							}
/******/ 							;
/******/ 							var timeout = setTimeout(() => {
/******/ 								onScriptComplete({ type: 'timeout', target: script })
/******/ 							}, 120000);
/******/ 							script.onerror = script.onload = onScriptComplete;
/******/ 							document.head.appendChild(script);
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
/******/ 		function webpackJsonpCallback(data) {
/******/ 			var chunkIds = data[0];
/******/ 			var moreModules = data[1];
/******/ 		
/******/ 			var runtime = data[3];
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
/******/ 			if(parentJsonpFunction) parentJsonpFunction(data);
/******/ 			while(resolves.length) {
/******/ 				resolves.shift()();
/******/ 			}
/******/ 		
/******/ 		};
/******/ 		
/******/ 		var jsonpArray = window["webpackJsonp"] = window["webpackJsonp"] || [];
/******/ 		var oldJsonpFunction = jsonpArray.push.bind(jsonpArray);
/******/ 		jsonpArray.push = webpackJsonpCallback;
/******/ 		var parentJsonpFunction = oldJsonpFunction;
/******/ 	})();
/******/ 	
/************************************************************************/
```

</details>

``` js
/*!********************!*\
  !*** ./example.js ***!
  \********************/
/*! unknown exports (runtime-defined) */
/*! exports [maybe provided (runtime-defined)] [unused] */
/*! runtime requirements: __webpack_require__, __webpack_require__.e, __webpack_require__.oe, __webpack_require__.* */
Promise.all(/*! AMD require */[__webpack_require__.e(996), __webpack_require__.e(847), __webpack_require__.e(460)]).then(function() { var __WEBPACK_AMD_REQUIRE_ARRAY__ = [__webpack_require__(/*! ./a */ 1), __webpack_require__(/*! ./b */ 2), __webpack_require__(/*! ./c */ 3)]; (function(a, b, c) {}).apply(null, __WEBPACK_AMD_REQUIRE_ARRAY__);}).catch(__webpack_require__.oe);

Promise.all(/*! require.ensure */[__webpack_require__.e(996), __webpack_require__.e(847), __webpack_require__.e(767)]).then((function(require) {
	__webpack_require__(/*! ./b */ 2);
	__webpack_require__(/*! ./d */ 4);
}).bind(null, __webpack_require__)).catch(__webpack_require__.oe);

Promise.all(/*! require.ensure */[__webpack_require__.e(847), __webpack_require__.e(390)]).then((function(require) {
	__webpack_require__(/*! ./a */ 1);
	Promise.all(/*! require.ensure */[__webpack_require__.e(996), __webpack_require__.e(568)]).then((function(require) {
		__webpack_require__(/*! ./f */ 6);
	}).bind(null, __webpack_require__)).catch(__webpack_require__.oe);
	Promise.all(/*! require.ensure */[__webpack_require__.e(996), __webpack_require__.e(785)]).then((function(require) {
		__webpack_require__(/*! ./g */ 7);
	}).bind(null, __webpack_require__)).catch(__webpack_require__.oe);
}).bind(null, __webpack_require__)).catch(__webpack_require__.oe);

/******/ })()
;
```

# Info

## Unoptimized

```
Hash: 0a1b2c3d4e5f6a7b8c9d
Version: webpack 5.0.0-beta.16
        Asset       Size
390.output.js  356 bytes  [emitted]
460.output.js  356 bytes  [emitted]
568.output.js  356 bytes  [emitted]
767.output.js  356 bytes  [emitted]
785.output.js  356 bytes  [emitted]
847.output.js  362 bytes  [emitted]
996.output.js  356 bytes  [emitted]
    output.js   8.94 KiB  [emitted]  [name: main]
Entrypoint main = output.js
chunk output.js (main) 346 bytes (javascript) 4.19 KiB (runtime) [entry] [rendered]
    > ./example.js main
 ./example.js 346 bytes [built]
     [no exports used]
     entry ./example.js main
     + 5 hidden chunk modules
chunk 390.output.js 21 bytes [rendered]
    > ./example.js 8:0-16:2
 ./e.js 21 bytes [built]
     cjs self exports reference ./e.js 1:0-14
     require.ensure item ./e ./example.js 8:0-16:2
chunk 460.output.js 21 bytes [rendered]
    > ./a ./b ./c ./example.js 1:0-52
 ./c.js 21 bytes [built]
     cjs self exports reference ./c.js 1:0-14
     amd require ./c ./example.js 1:0-52
chunk 568.output.js 21 bytes [rendered]
    > ./example.js 10:1-12:3
 ./f.js 21 bytes [built]
     cjs require ./f ./example.js 11:2-16
     cjs self exports reference ./f.js 1:0-14
chunk 767.output.js 21 bytes [rendered]
    > ./example.js 3:0-6:2
 ./d.js 21 bytes [built]
     cjs self exports reference ./d.js 1:0-14
     cjs require ./d ./example.js 5:1-15
chunk 785.output.js 21 bytes [rendered]
    > ./example.js 13:1-15:3
 ./g.js 21 bytes [built]
     cjs require ./g ./example.js 14:2-16
     cjs self exports reference ./g.js 1:0-14
chunk 847.output.js 21 bytes [rendered] split chunk (cache group: default)
    > ./a ./b ./c ./example.js 1:0-52
    > ./example.js 3:0-6:2
    > ./example.js 8:0-16:2
 ./a.js 21 bytes [built]
     cjs self exports reference ./a.js 1:0-14
     amd require ./a ./example.js 1:0-52
     require.ensure item ./a ./example.js 3:0-6:2
     require.ensure item ./a ./example.js 8:0-16:2
     cjs require ./a ./example.js 9:1-15
chunk 996.output.js 21 bytes [rendered] split chunk (cache group: default)
    > ./example.js 10:1-12:3
    > ./example.js 13:1-15:3
    > ./a ./b ./c ./example.js 1:0-52
    > ./example.js 3:0-6:2
 ./b.js 21 bytes [built]
     cjs self exports reference ./b.js 1:0-14
     amd require ./b ./example.js 1:0-52
     cjs require ./b ./example.js 4:1-15
     require.ensure item ./b ./example.js 10:1-12:3
     require.ensure item ./b ./example.js 13:1-15:3
```

## Production mode

```
Hash: 0a1b2c3d4e5f6a7b8c9d
Version: webpack 5.0.0-beta.16
        Asset      Size
390.output.js  85 bytes  [emitted]
460.output.js  85 bytes  [emitted]
568.output.js  85 bytes  [emitted]
767.output.js  85 bytes  [emitted]
785.output.js  85 bytes  [emitted]
847.output.js  85 bytes  [emitted]
996.output.js  85 bytes  [emitted]
    output.js  1.74 KiB  [emitted]  [name: main]
Entrypoint main = output.js
chunk output.js (main) 346 bytes (javascript) 4.19 KiB (runtime) [entry] [rendered]
    > ./example.js main
 ./example.js 346 bytes [built]
     [no exports used]
     entry ./example.js main
     + 5 hidden chunk modules
chunk 390.output.js 21 bytes [rendered]
    > ./example.js 8:0-16:2
 ./e.js 21 bytes [built]
     cjs self exports reference ./e.js 1:0-14
     require.ensure item ./e ./example.js 8:0-16:2
chunk 460.output.js 21 bytes [rendered]
    > ./a ./b ./c ./example.js 1:0-52
 ./c.js 21 bytes [built]
     cjs self exports reference ./c.js 1:0-14
     amd require ./c ./example.js 1:0-52
chunk 568.output.js 21 bytes [rendered]
    > ./example.js 10:1-12:3
 ./f.js 21 bytes [built]
     cjs require ./f ./example.js 11:2-16
     cjs self exports reference ./f.js 1:0-14
chunk 767.output.js 21 bytes [rendered]
    > ./example.js 3:0-6:2
 ./d.js 21 bytes [built]
     cjs self exports reference ./d.js 1:0-14
     cjs require ./d ./example.js 5:1-15
chunk 785.output.js 21 bytes [rendered]
    > ./example.js 13:1-15:3
 ./g.js 21 bytes [built]
     cjs require ./g ./example.js 14:2-16
     cjs self exports reference ./g.js 1:0-14
chunk 847.output.js 21 bytes [rendered] split chunk (cache group: default)
    > ./a ./b ./c ./example.js 1:0-52
    > ./example.js 3:0-6:2
    > ./example.js 8:0-16:2
 ./a.js 21 bytes [built]
     cjs self exports reference ./a.js 1:0-14
     amd require ./a ./example.js 1:0-52
     require.ensure item ./a ./example.js 3:0-6:2
     require.ensure item ./a ./example.js 8:0-16:2
     cjs require ./a ./example.js 9:1-15
chunk 996.output.js 21 bytes [rendered] split chunk (cache group: default)
    > ./example.js 10:1-12:3
    > ./example.js 13:1-15:3
    > ./a ./b ./c ./example.js 1:0-52
    > ./example.js 3:0-6:2
 ./b.js 21 bytes [built]
     cjs self exports reference ./b.js 1:0-14
     amd require ./b ./example.js 1:0-52
     cjs require ./b ./example.js 4:1-15
     require.ensure item ./b ./example.js 10:1-12:3
     require.ensure item ./b ./example.js 13:1-15:3
```
