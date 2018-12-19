# example.js

``` javascript
function getTemplate(templateName, callback) {
	require.ensure([], function(require) {
		callback(require("../require.context/templates/"+templateName)());
	});
}
getTemplate("a", function(a) {
	console.log(a);
});
getTemplate("b", function(b) {
	console.log(b);
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
/*! no static exports found */
/*! runtime requirements: __webpack_require__.e, __webpack_require__ */
/***/ (function(__unusedmodule, __unusedexports, __webpack_require__) {

function getTemplate(templateName, callback) {
	__webpack_require__.e(/*! require.ensure */ 925).then((function(require) {
		callback(__webpack_require__(1)("./"+templateName)());
	}).bind(null, __webpack_require__)).catch(__webpack_require__.oe);
}
getTemplate("a", function(a) {
	console.log(a);
});
getTemplate("b", function(b) {
	console.log(b);
});

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


# dist/925.output.js

``` javascript
(window["webpackJsonp"] = window["webpackJsonp"] || []).push([[925],[
/* 0 */,
/* 1 */
/*!**************************************************!*\
  !*** ../require.context/templates sync ^\.\/.*$ ***!
  \**************************************************/
/*! no static exports found */
/*! runtime requirements: module, __webpack_require__ */
/***/ (function(module, __unusedexports, __webpack_require__) {

var map = {
	"./a": 2,
	"./a.js": 2,
	"./b": 3,
	"./b.js": 3,
	"./c": 4,
	"./c.js": 4
};


function webpackContext(req) {
	var id = webpackContextResolve(req);
	return __webpack_require__(id);
}
function webpackContextResolve(req) {
	var id = map[req];
	if(!(id + 1)) { // check for number or string
		var e = new Error("Cannot find module '" + req + "'");
		e.code = 'MODULE_NOT_FOUND';
		throw e;
	}
	return id;
}
webpackContext.keys = function webpackContextKeys() {
	return Object.keys(map);
};
webpackContext.resolve = webpackContextResolve;
module.exports = webpackContext;
webpackContext.id = 1;

/***/ }),
/* 2 */
/*!*****************************************!*\
  !*** ../require.context/templates/a.js ***!
  \*****************************************/
/*! no static exports found */
/*! runtime requirements: module */
/***/ (function(module) {

module.exports = function() {
	return "This text was generated by template A";
}

/***/ }),
/* 3 */
/*!*****************************************!*\
  !*** ../require.context/templates/b.js ***!
  \*****************************************/
/*! no static exports found */
/*! runtime requirements: module */
/***/ (function(module) {

module.exports = function() {
	return "This text was generated by template B";
}

/***/ }),
/* 4 */
/*!*****************************************!*\
  !*** ../require.context/templates/c.js ***!
  \*****************************************/
/*! no static exports found */
/*! runtime requirements: module */
/***/ (function(module) {

module.exports = function() {
	return "This text was generated by template C";
}

/***/ })
]]);
```

# Info

## Unoptimized

```
Hash: 0a1b2c3d4e5f6a7b8c9d
Version: webpack 5.0.0-next
        Asset      Size  Chunks             Chunk Names
925.output.js  1.98 KiB   {925}  [emitted]
    output.js  7.27 KiB   {404}  [emitted]  main
Entrypoint main = output.js
chunk {404} output.js (main) 266 bytes (javascript) 3.55 KiB (runtime) >{925}< [entry] [rendered]
    > .\example.js main
 [0] ./example.js 266 bytes {404} [built]
     [used exports unknown]
     entry .\example.js main
     + 4 hidden chunk modules
chunk {925} 925.output.js 457 bytes <{404}> [rendered]
    > [0] ./example.js 2:1-4:3
 [1] ../require.context/templates sync ^\.\/.*$ 217 bytes {925} [built]
     [used exports unknown]
     cjs require context ../require.context/templates [0] ./example.js 3:11-64
 [2] ../require.context/templates/a.js 80 bytes {925} [optional] [built]
     [used exports unknown]
     context element ./a [1] ../require.context/templates sync ^\.\/.*$ ./a
     context element ./a.js [1] ../require.context/templates sync ^\.\/.*$ ./a.js
 [3] ../require.context/templates/b.js 80 bytes {925} [optional] [built]
     [used exports unknown]
     context element ./b [1] ../require.context/templates sync ^\.\/.*$ ./b
     context element ./b.js [1] ../require.context/templates sync ^\.\/.*$ ./b.js
 [4] ../require.context/templates/c.js 80 bytes {925} [optional] [built]
     [used exports unknown]
     context element ./c [1] ../require.context/templates sync ^\.\/.*$ ./c
     context element ./c.js [1] ../require.context/templates sync ^\.\/.*$ ./c.js
```

## Production mode

```
Hash: 0a1b2c3d4e5f6a7b8c9d
Version: webpack 5.0.0-next
        Asset       Size  Chunks             Chunk Names
925.output.js  651 bytes   {925}  [emitted]
    output.js   1.49 KiB   {404}  [emitted]  main
Entrypoint main = output.js
chunk {404} output.js (main) 266 bytes (javascript) 3.55 KiB (runtime) >{925}< [entry] [rendered]
    > .\example.js main
 [275] ./example.js 266 bytes {404} [built]
       entry .\example.js main
     + 4 hidden chunk modules
chunk {925} 925.output.js 457 bytes <{404}> [rendered]
    > [275] ./example.js 2:1-4:3
 [145] ../require.context/templates/a.js 80 bytes {925} [optional] [built]
       context element ./a [925] ../require.context/templates sync ^\.\/.*$ ./a
       context element ./a.js [925] ../require.context/templates sync ^\.\/.*$ ./a.js
 [221] ../require.context/templates/c.js 80 bytes {925} [optional] [built]
       context element ./c [925] ../require.context/templates sync ^\.\/.*$ ./c
       context element ./c.js [925] ../require.context/templates sync ^\.\/.*$ ./c.js
 [641] ../require.context/templates/b.js 80 bytes {925} [optional] [built]
       context element ./b [925] ../require.context/templates sync ^\.\/.*$ ./b
       context element ./b.js [925] ../require.context/templates sync ^\.\/.*$ ./b.js
 [925] ../require.context/templates sync ^\.\/.*$ 217 bytes {925} [built]
       cjs require context ../require.context/templates [275] ./example.js 3:11-64
```
