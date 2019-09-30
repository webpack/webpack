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
		occurrenceOrder: true // To keep filename consistent between different modes (for example building only)
	}
};
```

# dist/output.js

<details><summary><code>/******/ (function(modules) { /* webpackBootstrap */ })</code></summary>

```javascript
/******/ (function(modules) { // webpackBootstrap
/******/ 	// install a JSONP callback for chunk loading
/******/ 	function webpackJsonpCallback(data) {
/******/ 		var chunkIds = data[0];
/******/ 		var moreModules = data[1];
/******/
/******/
/******/ 		// add "moreModules" to the modules object,
/******/ 		// then flag all "chunkIds" as loaded and fire callback
/******/ 		var moduleId, chunkId, i = 0, resolves = [];
/******/ 		for(;i < chunkIds.length; i++) {
/******/ 			chunkId = chunkIds[i];
/******/ 			if(Object.prototype.hasOwnProperty.call(installedChunks, chunkId) && installedChunks[chunkId]) {
/******/ 				resolves.push(installedChunks[chunkId][0]);
/******/ 			}
/******/ 			installedChunks[chunkId] = 0;
/******/ 		}
/******/ 		for(moduleId in moreModules) {
/******/ 			if(Object.prototype.hasOwnProperty.call(moreModules, moduleId)) {
/******/ 				modules[moduleId] = moreModules[moduleId];
/******/ 			}
/******/ 		}
/******/ 		if(parentJsonpFunction) parentJsonpFunction(data);
/******/
/******/ 		while(resolves.length) {
/******/ 			resolves.shift()();
/******/ 		}
/******/
/******/ 	};
/******/
/******/
/******/ 	// The module cache
/******/ 	var installedModules = {};
/******/
/******/ 	// object to store loaded and loading chunks
/******/ 	// undefined = chunk not loaded, null = chunk preloaded/prefetched
/******/ 	// Promise = chunk loading, 0 = chunk loaded
/******/ 	var installedChunks = {
/******/ 		2: 0
/******/ 	};
/******/
/******/
/******/
/******/ 	// script path function
/******/ 	function jsonpScriptSrc(chunkId) {
/******/ 		return __webpack_require__.p + "" + chunkId + ".output.js"
/******/ 	}
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
/******/ 	// This file contains only the entry chunk.
/******/ 	// The chunk loading function for additional chunks
/******/ 	__webpack_require__.e = function requireEnsure(chunkId) {
/******/ 		var promises = [];
/******/
/******/
/******/ 		// JSONP chunk loading for javascript
/******/
/******/ 		var installedChunkData = installedChunks[chunkId];
/******/ 		if(installedChunkData !== 0) { // 0 means "already installed".
/******/
/******/ 			// a Promise means "currently loading".
/******/ 			if(installedChunkData) {
/******/ 				promises.push(installedChunkData[2]);
/******/ 			} else {
/******/ 				// setup Promise in chunk cache
/******/ 				var promise = new Promise(function(resolve, reject) {
/******/ 					installedChunkData = installedChunks[chunkId] = [resolve, reject];
/******/ 				});
/******/ 				promises.push(installedChunkData[2] = promise);
/******/
/******/ 				// start chunk loading
/******/ 				var script = document.createElement('script');
/******/ 				var onScriptComplete;
/******/
/******/ 				script.charset = 'utf-8';
/******/ 				script.timeout = 120;
/******/ 				if (__webpack_require__.nc) {
/******/ 					script.setAttribute("nonce", __webpack_require__.nc);
/******/ 				}
/******/ 				script.src = jsonpScriptSrc(chunkId);
/******/
/******/ 				// create error before stack unwound to get useful stacktrace later
/******/ 				var error = new Error();
/******/ 				onScriptComplete = function (event) {
/******/ 					// avoid mem leaks in IE.
/******/ 					script.onerror = script.onload = null;
/******/ 					clearTimeout(timeout);
/******/ 					var chunk = installedChunks[chunkId];
/******/ 					if(chunk !== 0) {
/******/ 						if(chunk) {
/******/ 							var errorType = event && (event.type === 'load' ? 'missing' : event.type);
/******/ 							var realSrc = event && event.target && event.target.src;
/******/ 							error.message = 'Loading chunk ' + chunkId + ' failed.\n(' + errorType + ': ' + realSrc + ')';
/******/ 							error.name = 'ChunkLoadError';
/******/ 							error.type = errorType;
/******/ 							error.request = realSrc;
/******/ 							chunk[1](error);
/******/ 						}
/******/ 						installedChunks[chunkId] = undefined;
/******/ 					}
/******/ 				};
/******/ 				var timeout = setTimeout(function(){
/******/ 					onScriptComplete({ type: 'timeout', target: script });
/******/ 				}, 120000);
/******/ 				script.onerror = script.onload = onScriptComplete;
/******/ 				document.head.appendChild(script);
/******/ 			}
/******/ 		}
/******/ 		return Promise.all(promises);
/******/ 	};
/******/
/******/ 	// expose the modules object (__webpack_modules__)
/******/ 	__webpack_require__.m = modules;
/******/
/******/ 	// expose the module cache
/******/ 	__webpack_require__.c = installedModules;
/******/
/******/ 	// define getter function for harmony exports
/******/ 	__webpack_require__.d = function(exports, name, getter) {
/******/ 		if(!__webpack_require__.o(exports, name)) {
/******/ 			Object.defineProperty(exports, name, { enumerable: true, get: getter });
/******/ 		}
/******/ 	};
/******/
/******/ 	// define __esModule on exports
/******/ 	__webpack_require__.r = function(exports) {
/******/ 		if(typeof Symbol !== 'undefined' && Symbol.toStringTag) {
/******/ 			Object.defineProperty(exports, Symbol.toStringTag, { value: 'Module' });
/******/ 		}
/******/ 		Object.defineProperty(exports, '__esModule', { value: true });
/******/ 	};
/******/
/******/ 	// create a fake namespace object
/******/ 	// mode & 1: value is a module id, require it
/******/ 	// mode & 2: merge all properties of value into the ns
/******/ 	// mode & 4: return value when already ns object
/******/ 	// mode & 8|1: behave like require
/******/ 	__webpack_require__.t = function(value, mode) {
/******/ 		if(mode & 1) value = __webpack_require__(value);
/******/ 		if(mode & 8) return value;
/******/ 		if((mode & 4) && typeof value === 'object' && value && value.__esModule) return value;
/******/ 		var ns = Object.create(null);
/******/ 		__webpack_require__.r(ns);
/******/ 		Object.defineProperty(ns, 'default', { enumerable: true, value: value });
/******/ 		if(mode & 2 && typeof value != 'string') for(var key in value) __webpack_require__.d(ns, key, function(key) { return value[key]; }.bind(null, key));
/******/ 		return ns;
/******/ 	};
/******/
/******/ 	// getDefaultExport function for compatibility with non-harmony modules
/******/ 	__webpack_require__.n = function(module) {
/******/ 		var getter = module && module.__esModule ?
/******/ 			function getDefault() { return module['default']; } :
/******/ 			function getModuleExports() { return module; };
/******/ 		__webpack_require__.d(getter, 'a', getter);
/******/ 		return getter;
/******/ 	};
/******/
/******/ 	// Object.prototype.hasOwnProperty.call
/******/ 	__webpack_require__.o = function(object, property) { return Object.prototype.hasOwnProperty.call(object, property); };
/******/
/******/ 	// __webpack_public_path__
/******/ 	__webpack_require__.p = "dist/";
/******/
/******/ 	// on error function for async loading
/******/ 	__webpack_require__.oe = function(err) { console.error(err); throw err; };
/******/
/******/ 	var jsonpArray = window["webpackJsonp"] = window["webpackJsonp"] || [];
/******/ 	var oldJsonpFunction = jsonpArray.push.bind(jsonpArray);
/******/ 	jsonpArray.push = webpackJsonpCallback;
/******/ 	jsonpArray = jsonpArray.slice();
/******/ 	for(var i = 0; i < jsonpArray.length; i++) webpackJsonpCallback(jsonpArray[i]);
/******/ 	var parentJsonpFunction = oldJsonpFunction;
/******/
/******/
/******/ 	// Load entry module and return exports
/******/ 	return __webpack_require__(__webpack_require__.s = 2);
/******/ })
/************************************************************************/
```

</details>

```javascript
/******/ ({

/***/ 2:
/*!********************!*\
  !*** ./example.js ***!
  \********************/
/*! no static exports found */
/***/ (function(module, exports, __webpack_require__) {

Promise.all(/*! AMD require */[__webpack_require__.e(0), __webpack_require__.e(1), __webpack_require__.e(3)]).then(function() { var __WEBPACK_AMD_REQUIRE_ARRAY__ = [__webpack_require__(/*! ./a */ 0), __webpack_require__(/*! ./b */ 1), __webpack_require__(/*! ./c */ 3)]; (function(a, b, c) {}).apply(null, __WEBPACK_AMD_REQUIRE_ARRAY__);}).catch(__webpack_require__.oe);

Promise.all(/*! require.ensure */[__webpack_require__.e(0), __webpack_require__.e(1), __webpack_require__.e(4)]).then((function(require) {
	__webpack_require__(/*! ./b */ 1);
	__webpack_require__(/*! ./d */ 4);
}).bind(null, __webpack_require__)).catch(__webpack_require__.oe);

Promise.all(/*! require.ensure */[__webpack_require__.e(1), __webpack_require__.e(5)]).then((function(require) {
	__webpack_require__(/*! ./a */ 0);
	Promise.all(/*! require.ensure */[__webpack_require__.e(0), __webpack_require__.e(6)]).then((function(require) {
		__webpack_require__(/*! ./f */ 6);
	}).bind(null, __webpack_require__)).catch(__webpack_require__.oe);
	Promise.all(/*! require.ensure */[__webpack_require__.e(0), __webpack_require__.e(7)]).then((function(require) {
		__webpack_require__(/*! ./g */ 7);
	}).bind(null, __webpack_require__)).catch(__webpack_require__.oe);
}).bind(null, __webpack_require__)).catch(__webpack_require__.oe);


/***/ })

/******/ });
```

# Info

## Unoptimized

```
Hash: 0a1b2c3d4e5f6a7b8c9d
Version: webpack 4.39.0
      Asset       Size  Chunks             Chunk Names
0.output.js  247 bytes       0  [emitted]  
1.output.js  238 bytes       1  [emitted]  
3.output.js  241 bytes       3  [emitted]  
4.output.js  241 bytes       4  [emitted]  
5.output.js  241 bytes       5  [emitted]  
6.output.js  241 bytes       6  [emitted]  
7.output.js  241 bytes       7  [emitted]  
  output.js    9.5 KiB       2  [emitted]  main
Entrypoint main = output.js
chunk    {0} 0.output.js 21 bytes <{1}> <{2}> <{5}> ={1}= ={3}= ={4}= ={6}= ={7}= [rendered] split chunk (cache group: default)
    > [2] ./example.js 10:1-12:3
    > [2] ./example.js 13:1-15:3
    > ./a ./b ./c [2] ./example.js 1:0-52
    > [2] ./example.js 3:0-6:2
 [1] ./b.js 21 bytes {0} [built]
     amd require ./b [2] ./example.js 1:0-52
     cjs require ./b [2] ./example.js 4:1-15
     require.ensure item ./b [2] ./example.js 10:1-12:3
     require.ensure item ./b [2] ./example.js 13:1-15:3
chunk    {1} 1.output.js 21 bytes <{2}> ={0}= ={3}= ={4}= ={5}= >{0}< >{6}< >{7}< [rendered] split chunk (cache group: default)
    > ./a ./b ./c [2] ./example.js 1:0-52
    > [2] ./example.js 3:0-6:2
    > [2] ./example.js 8:0-16:2
 [0] ./a.js 21 bytes {1} [built]
     amd require ./a [2] ./example.js 1:0-52
     require.ensure item ./a [2] ./example.js 3:0-6:2
     require.ensure item ./a [2] ./example.js 8:0-16:2
     cjs require ./a [2] ./example.js 9:1-15
chunk    {2} output.js (main) 346 bytes >{0}< >{1}< >{3}< >{4}< >{5}< [entry] [rendered]
    > ./example.js main
 [2] ./example.js 346 bytes {2} [built]
     single entry ./example.js  main
chunk    {3} 3.output.js 21 bytes <{2}> ={0}= ={1}= [rendered]
    > ./a ./b ./c [2] ./example.js 1:0-52
 [3] ./c.js 21 bytes {3} [built]
     amd require ./c [2] ./example.js 1:0-52
chunk    {4} 4.output.js 21 bytes <{2}> ={0}= ={1}= [rendered]
    > [2] ./example.js 3:0-6:2
 [4] ./d.js 21 bytes {4} [built]
     cjs require ./d [2] ./example.js 5:1-15
chunk    {5} 5.output.js 21 bytes <{2}> ={1}= >{0}< >{6}< >{7}< [rendered]
    > [2] ./example.js 8:0-16:2
 [5] ./e.js 21 bytes {5} [built]
     require.ensure item ./e [2] ./example.js 8:0-16:2
chunk    {6} 6.output.js 21 bytes <{1}> <{5}> ={0}= [rendered]
    > [2] ./example.js 10:1-12:3
 [6] ./f.js 21 bytes {6} [built]
     cjs require ./f [2] ./example.js 11:2-16
chunk    {7} 7.output.js 21 bytes <{1}> <{5}> ={0}= [rendered]
    > [2] ./example.js 13:1-15:3
 [7] ./g.js 21 bytes {7} [built]
     cjs require ./g [2] ./example.js 14:2-16
```

## Production mode

```
Hash: 0a1b2c3d4e5f6a7b8c9d
Version: webpack 4.39.0
      Asset      Size  Chunks             Chunk Names
0.output.js  90 bytes       0  [emitted]  
1.output.js  89 bytes       1  [emitted]  
3.output.js  91 bytes       3  [emitted]  
4.output.js  91 bytes       4  [emitted]  
5.output.js  91 bytes       5  [emitted]  
6.output.js  91 bytes       6  [emitted]  
7.output.js  91 bytes       7  [emitted]  
  output.js  2.46 KiB       2  [emitted]  main
Entrypoint main = output.js
chunk    {0} 0.output.js 21 bytes <{1}> <{2}> <{5}> ={1}= ={3}= ={4}= ={6}= ={7}= [rendered] split chunk (cache group: default)
    > [2] ./example.js 10:1-12:3
    > [2] ./example.js 13:1-15:3
    > ./a ./b ./c [2] ./example.js 1:0-52
    > [2] ./example.js 3:0-6:2
 [1] ./b.js 21 bytes {0} [built]
     amd require ./b [2] ./example.js 1:0-52
     cjs require ./b [2] ./example.js 4:1-15
     require.ensure item ./b [2] ./example.js 10:1-12:3
     require.ensure item ./b [2] ./example.js 13:1-15:3
chunk    {1} 1.output.js 21 bytes <{2}> ={0}= ={3}= ={4}= ={5}= >{0}< >{6}< >{7}< [rendered] split chunk (cache group: default)
    > ./a ./b ./c [2] ./example.js 1:0-52
    > [2] ./example.js 3:0-6:2
    > [2] ./example.js 8:0-16:2
 [0] ./a.js 21 bytes {1} [built]
     amd require ./a [2] ./example.js 1:0-52
     require.ensure item ./a [2] ./example.js 3:0-6:2
     require.ensure item ./a [2] ./example.js 8:0-16:2
     cjs require ./a [2] ./example.js 9:1-15
chunk    {2} output.js (main) 346 bytes >{0}< >{1}< >{3}< >{4}< >{5}< [entry] [rendered]
    > ./example.js main
 [2] ./example.js 346 bytes {2} [built]
     single entry ./example.js  main
chunk    {3} 3.output.js 21 bytes <{2}> ={0}= ={1}= [rendered]
    > ./a ./b ./c [2] ./example.js 1:0-52
 [3] ./c.js 21 bytes {3} [built]
     amd require ./c [2] ./example.js 1:0-52
chunk    {4} 4.output.js 21 bytes <{2}> ={0}= ={1}= [rendered]
    > [2] ./example.js 3:0-6:2
 [4] ./d.js 21 bytes {4} [built]
     cjs require ./d [2] ./example.js 5:1-15
chunk    {5} 5.output.js 21 bytes <{2}> ={1}= >{0}< >{6}< >{7}< [rendered]
    > [2] ./example.js 8:0-16:2
 [5] ./e.js 21 bytes {5} [built]
     require.ensure item ./e [2] ./example.js 8:0-16:2
chunk    {6} 6.output.js 21 bytes <{1}> <{5}> ={0}= [rendered]
    > [2] ./example.js 10:1-12:3
 [6] ./f.js 21 bytes {6} [built]
     cjs require ./f [2] ./example.js 11:2-16
chunk    {7} 7.output.js 21 bytes <{1}> <{5}> ={0}= [rendered]
    > [2] ./example.js 13:1-15:3
 [7] ./g.js 21 bytes {7} [built]
     cjs require ./g [2] ./example.js 14:2-16
```
