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
/******/ 		// no deferred startup
/******/ 		
/******/ 		// install a JSONP callback for chunk loading
/******/ 		var webpackJsonpCallback = (parentChunkLoadingFunction, data) => {
/******/ 			var [chunkIds, moreModules, runtime] = data;
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
/******/ 		}
/******/ 		
/******/ 		var chunkLoadingGlobal = self["webpackChunk"] = self["webpackChunk"] || [];
/******/ 		chunkLoadingGlobal.forEach(webpackJsonpCallback.bind(null, 0));
/******/ 		chunkLoadingGlobal.push = webpackJsonpCallback.bind(null, chunkLoadingGlobal.push.bind(chunkLoadingGlobal));
/******/ 		
/******/ 		// no deferred startup
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
(self["webpackChunk"] = self["webpackChunk"] || []).push([[394],[
/* 0 */,
/* 1 */
/*!**************!*\
  !*** ./a.js ***!
  \**************/
/*! unknown exports (runtime-defined) */
/*! runtime requirements: module */
/*! CommonJS bailout: module.exports is used directly at 1:0-14 */
/***/ ((module) => {

module.exports = "a";

/***/ }),
/* 2 */
/*!**************!*\
  !*** ./b.js ***!
  \**************/
/*! unknown exports (runtime-defined) */
/*! runtime requirements: module */
/*! CommonJS bailout: module.exports is used directly at 1:0-14 */
/***/ ((module) => {

module.exports = "b";

/***/ })
]]);
```

# dist/460.output.js

```javascript
(self["webpackChunk"] = self["webpackChunk"] || []).push([[460],{

/***/ 3:
/*!**************!*\
  !*** ./c.js ***!
  \**************/
/*! unknown exports (runtime-defined) */
/*! runtime requirements: module */
/*! CommonJS bailout: module.exports is used directly at 1:0-14 */
/***/ ((module) => {

module.exports = "c";

/***/ })

}]);
```

# dist/767.output.js

```javascript
(self["webpackChunk"] = self["webpackChunk"] || []).push([[767],{

/***/ 4:
/*!**************!*\
  !*** ./d.js ***!
  \**************/
/*! unknown exports (runtime-defined) */
/*! runtime requirements: module */
/*! CommonJS bailout: module.exports is used directly at 1:0-14 */
/***/ ((module) => {

module.exports = "d";

/***/ })

}]);
```

# Info

## Unoptimized

```
asset output.js 9.17 KiB [emitted] (name: main)
asset 394.output.js 610 bytes [emitted]
asset 460.output.js 338 bytes [emitted]
asset 767.output.js 338 bytes [emitted]
chunk (runtime: main) output.js (main) 164 bytes (javascript) 4.97 KiB (runtime) [entry] [rendered]
  > ./example.js main
  runtime modules 4.97 KiB 6 modules
  ./example.js 164 bytes [built] [code generated]
    [used exports unknown]
    entry ./example.js main
chunk (runtime: main) 394.output.js 42 bytes [rendered] split chunk (cache group: default)
  > ./a ./b ./c ./example.js 2:0-30
  > ./example.js 5:0-8:2
  ./a.js 21 bytes [built] [code generated]
    [used exports unknown]
    cjs self exports reference ./a.js 1:0-14
    amd require ./a ./example.js 2:0-30
    require.ensure item ./a ./example.js 5:0-8:2
  ./b.js 21 bytes [built] [code generated]
    [used exports unknown]
    cjs self exports reference ./b.js 1:0-14
    amd require ./b ./example.js 2:0-30
    cjs require ./b ./example.js 6:1-15
chunk (runtime: main) 460.output.js 21 bytes [rendered]
  > ./a ./b ./c ./example.js 2:0-30
  ./c.js 21 bytes [built] [code generated]
    [used exports unknown]
    cjs self exports reference ./c.js 1:0-14
    amd require ./c ./example.js 2:0-30
chunk (runtime: main) 767.output.js 21 bytes [rendered]
  > ./example.js 5:0-8:2
  ./d.js 21 bytes [built] [code generated]
    [used exports unknown]
    cjs self exports reference ./d.js 1:0-14
    cjs require ./d ./example.js 7:1-15
webpack 5.11.1 compiled successfully
```

## Production mode

```
asset output.js 1.8 KiB [emitted] [minimized] (name: main)
asset 394.output.js 104 bytes [emitted] [minimized]
asset 460.output.js 81 bytes [emitted] [minimized]
asset 767.output.js 81 bytes [emitted] [minimized]
chunk (runtime: main) output.js (main) 164 bytes (javascript) 4.97 KiB (runtime) [entry] [rendered]
  > ./example.js main
  runtime modules 4.97 KiB 6 modules
  ./example.js 164 bytes [built] [code generated]
    [no exports used]
    entry ./example.js main
chunk (runtime: main) 394.output.js 42 bytes [rendered] split chunk (cache group: default)
  > ./a ./b ./c ./example.js 2:0-30
  > ./example.js 5:0-8:2
  ./a.js 21 bytes [built] [code generated]
    [used exports unknown]
    cjs self exports reference ./a.js 1:0-14
    amd require ./a ./example.js 2:0-30
    require.ensure item ./a ./example.js 5:0-8:2
  ./b.js 21 bytes [built] [code generated]
    [used exports unknown]
    cjs self exports reference ./b.js 1:0-14
    amd require ./b ./example.js 2:0-30
    cjs require ./b ./example.js 6:1-15
chunk (runtime: main) 460.output.js 21 bytes [rendered]
  > ./a ./b ./c ./example.js 2:0-30
  ./c.js 21 bytes [built] [code generated]
    [used exports unknown]
    cjs self exports reference ./c.js 1:0-14
    amd require ./c ./example.js 2:0-30
chunk (runtime: main) 767.output.js 21 bytes [rendered]
  > ./example.js 5:0-8:2
  ./d.js 21 bytes [built] [code generated]
    [used exports unknown]
    cjs self exports reference ./d.js 1:0-14
    cjs require ./d ./example.js 7:1-15
webpack 5.11.1 compiled successfully
```
