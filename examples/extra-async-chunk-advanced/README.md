

# example.js

``` javascript
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

``` javascript
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
/*! no static exports found */
/*! runtime requirements: __webpack_require__.e, __webpack_require__.oe, __webpack_require__ */
/***/ (function(__unusedmodule, __unusedexports, __webpack_require__) {

Promise.all(/*! AMD require */[__webpack_require__.e(21), __webpack_require__.e(162), __webpack_require__.e(911)]).then(function() { var __WEBPACK_AMD_REQUIRE_ARRAY__ = [__webpack_require__(/*! ./a */ 1), __webpack_require__(/*! ./b */ 2), __webpack_require__(/*! ./c */ 3)]; (function(a, b, c) {}).apply(null, __WEBPACK_AMD_REQUIRE_ARRAY__);}).catch(__webpack_require__.oe);

Promise.all(/*! require.ensure */[__webpack_require__.e(21), __webpack_require__.e(162), __webpack_require__.e(85)]).then((function(require) {
	__webpack_require__(/*! ./b */ 2);
	__webpack_require__(/*! ./d */ 4);
}).bind(null, __webpack_require__)).catch(__webpack_require__.oe);

Promise.all(/*! require.ensure */[__webpack_require__.e(162), __webpack_require__.e(601)]).then((function(require) {
	__webpack_require__(/*! ./a */ 1);
	Promise.all(/*! require.ensure */[__webpack_require__.e(21), __webpack_require__.e(153)]).then((function(require) {
		__webpack_require__(/*! ./f */ 6);
	}).bind(null, __webpack_require__)).catch(__webpack_require__.oe);
	Promise.all(/*! require.ensure */[__webpack_require__.e(21), __webpack_require__.e(780)]).then((function(require) {
		__webpack_require__(/*! ./g */ 7);
	}).bind(null, __webpack_require__)).catch(__webpack_require__.oe);
}).bind(null, __webpack_require__)).catch(__webpack_require__.oe);


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
153.output.js  270 bytes   {153}  [emitted]
162.output.js  276 bytes   {162}  [emitted]
 21.output.js  269 bytes    {21}  [emitted]
601.output.js  270 bytes   {601}  [emitted]
780.output.js  270 bytes   {780}  [emitted]
 85.output.js  269 bytes    {85}  [emitted]
911.output.js  270 bytes   {911}  [emitted]
    output.js   8.25 KiB   {404}  [emitted]  main
Entrypoint main = output.js
chunk {21} 21.output.js 21 bytes <{162}> <{404}> <{601}> ={85}= ={153}= ={162}= ={780}= ={911}= [rendered] split chunk (cache group: default)
    > [0] ./example.js 10:1-12:3
    > [0] ./example.js 13:1-15:3
    > ./a ./b ./c [0] ./example.js 1:0-52
    > [0] ./example.js 3:0-6:2
 [2] ./b.js 21 bytes {21} [built]
     [used exports unknown]
     amd require ./b [0] ./example.js 1:0-52
     cjs require ./b [0] ./example.js 4:1-15
     require.ensure item ./b [0] ./example.js 10:1-12:3
     require.ensure item ./b [0] ./example.js 13:1-15:3
chunk {85} 85.output.js 21 bytes <{404}> ={21}= ={162}= [rendered]
    > [0] ./example.js 3:0-6:2
 [4] ./d.js 21 bytes {85} [built]
     [used exports unknown]
     cjs require ./d [0] ./example.js 5:1-15
chunk {153} 153.output.js 21 bytes <{162}> <{601}> ={21}= [rendered]
    > [0] ./example.js 10:1-12:3
 [6] ./f.js 21 bytes {153} [built]
     [used exports unknown]
     cjs require ./f [0] ./example.js 11:2-16
chunk {162} 162.output.js 21 bytes <{404}> ={21}= ={85}= ={601}= ={911}= >{21}< >{153}< >{780}< [rendered] split chunk (cache group: default)
    > ./a ./b ./c [0] ./example.js 1:0-52
    > [0] ./example.js 3:0-6:2
    > [0] ./example.js 8:0-16:2
 [1] ./a.js 21 bytes {162} [built]
     [used exports unknown]
     amd require ./a [0] ./example.js 1:0-52
     require.ensure item ./a [0] ./example.js 3:0-6:2
     require.ensure item ./a [0] ./example.js 8:0-16:2
     cjs require ./a [0] ./example.js 9:1-15
chunk {404} output.js (main) 346 bytes (javascript) 3.55 KiB (runtime) >{21}< >{85}< >{162}< >{601}< >{911}< [entry] [rendered]
    > .\example.js main
 [0] ./example.js 346 bytes {404} [built]
     [used exports unknown]
     entry .\example.js main
     + 4 hidden chunk modules
chunk {601} 601.output.js 21 bytes <{404}> ={162}= >{21}< >{153}< >{780}< [rendered]
    > [0] ./example.js 8:0-16:2
 [5] ./e.js 21 bytes {601} [built]
     [used exports unknown]
     require.ensure item ./e [0] ./example.js 8:0-16:2
chunk {780} 780.output.js 21 bytes <{162}> <{601}> ={21}= [rendered]
    > [0] ./example.js 13:1-15:3
 [7] ./g.js 21 bytes {780} [built]
     [used exports unknown]
     cjs require ./g [0] ./example.js 14:2-16
chunk {911} 911.output.js 21 bytes <{404}> ={21}= ={162}= [rendered]
    > ./a ./b ./c [0] ./example.js 1:0-52
 [3] ./c.js 21 bytes {911} [built]
     [used exports unknown]
     amd require ./c [0] ./example.js 1:0-52
```

## Production mode

```
Hash: 0a1b2c3d4e5f6a7b8c9d
Version: webpack 5.0.0-next
        Asset      Size  Chunks             Chunk Names
153.output.js  93 bytes   {153}  [emitted]
162.output.js  93 bytes   {162}  [emitted]
 21.output.js  91 bytes    {21}  [emitted]
601.output.js  93 bytes   {601}  [emitted]
780.output.js  93 bytes   {780}  [emitted]
 85.output.js  91 bytes    {85}  [emitted]
911.output.js  93 bytes   {911}  [emitted]
    output.js   1.8 KiB   {404}  [emitted]  main
Entrypoint main = output.js
chunk {21} 21.output.js 21 bytes <{162}> <{404}> <{601}> ={85}= ={153}= ={162}= ={780}= ={911}= [rendered] split chunk (cache group: default)
    > [275] ./example.js 10:1-12:3
    > [275] ./example.js 13:1-15:3
    > ./a ./b ./c [275] ./example.js 1:0-52
    > [275] ./example.js 3:0-6:2
 [21] ./b.js 21 bytes {21} [built]
      amd require ./b [275] ./example.js 1:0-52
      cjs require ./b [275] ./example.js 4:1-15
      require.ensure item ./b [275] ./example.js 10:1-12:3
      require.ensure item ./b [275] ./example.js 13:1-15:3
chunk {85} 85.output.js 21 bytes <{404}> ={21}= ={162}= [rendered]
    > [275] ./example.js 3:0-6:2
 [85] ./d.js 21 bytes {85} [built]
      cjs require ./d [275] ./example.js 5:1-15
chunk {153} 153.output.js 21 bytes <{162}> <{601}> ={21}= [rendered]
    > [275] ./example.js 10:1-12:3
 [153] ./f.js 21 bytes {153} [built]
       cjs require ./f [275] ./example.js 11:2-16
chunk {162} 162.output.js 21 bytes <{404}> ={21}= ={85}= ={601}= ={911}= >{21}< >{153}< >{780}< [rendered] split chunk (cache group: default)
    > ./a ./b ./c [275] ./example.js 1:0-52
    > [275] ./example.js 3:0-6:2
    > [275] ./example.js 8:0-16:2
 [162] ./a.js 21 bytes {162} [built]
       amd require ./a [275] ./example.js 1:0-52
       require.ensure item ./a [275] ./example.js 3:0-6:2
       require.ensure item ./a [275] ./example.js 8:0-16:2
       cjs require ./a [275] ./example.js 9:1-15
chunk {404} output.js (main) 346 bytes (javascript) 3.55 KiB (runtime) >{21}< >{85}< >{162}< >{601}< >{911}< [entry] [rendered]
    > .\example.js main
 [275] ./example.js 346 bytes {404} [built]
       entry .\example.js main
     + 4 hidden chunk modules
chunk {601} 601.output.js 21 bytes <{404}> ={162}= >{21}< >{153}< >{780}< [rendered]
    > [275] ./example.js 8:0-16:2
 [601] ./e.js 21 bytes {601} [built]
       require.ensure item ./e [275] ./example.js 8:0-16:2
chunk {780} 780.output.js 21 bytes <{162}> <{601}> ={21}= [rendered]
    > [275] ./example.js 13:1-15:3
 [780] ./g.js 21 bytes {780} [built]
       cjs require ./g [275] ./example.js 14:2-16
chunk {911} 911.output.js 21 bytes <{404}> ={21}= ={162}= [rendered]
    > ./a ./b ./c [275] ./example.js 1:0-52
 [911] ./c.js 21 bytes {911} [built]
       amd require ./c [275] ./example.js 1:0-52
```
