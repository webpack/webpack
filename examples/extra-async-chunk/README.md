This example shows automatically created async commons chunks.

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

Note: Actually the optimization compare size of chunk Z to some minimum value, but this is disabled from this example. In practice there is no configuration needed for this.

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
/******/ 		1: 0
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

// a chunks with a, b, c
Promise.all(/*! AMD require */[__webpack_require__.e(0), __webpack_require__.e(2)]).then(function() {[__webpack_require__(/*! ./a */ 0), __webpack_require__(/*! ./b */ 1), __webpack_require__(/*! ./c */ 3)];}).catch(__webpack_require__.oe);

// a chunk with a, b, d
Promise.all(/*! require.ensure */[__webpack_require__.e(0), __webpack_require__.e(3)]).then((function(require) {
	__webpack_require__(/*! ./b */ 1);
	__webpack_require__(/*! ./d */ 4);
}).bind(null, __webpack_require__)).catch(__webpack_require__.oe);


/***/ })

/******/ });
```

# dist/0.output.js

```javascript
(window["webpackJsonp"] = window["webpackJsonp"] || []).push([[0],[
/* 0 */
/*!**************!*\
  !*** ./a.js ***!
  \**************/
/*! no static exports found */
/***/ (function(module, exports) {

module.exports = "a";

/***/ }),
/* 1 */
/*!**************!*\
  !*** ./b.js ***!
  \**************/
/*! no static exports found */
/***/ (function(module, exports) {

module.exports = "b";

/***/ })
]]);
```

# dist/2.output.js

```javascript
(window["webpackJsonp"] = window["webpackJsonp"] || []).push([[2],{

/***/ 3:
/*!**************!*\
  !*** ./c.js ***!
  \**************/
/*! no static exports found */
/***/ (function(module, exports) {

module.exports = "c";

/***/ })

}]);
```

# dist/3.output.js

```javascript
(window["webpackJsonp"] = window["webpackJsonp"] || []).push([[3],{

/***/ 4:
/*!**************!*\
  !*** ./d.js ***!
  \**************/
/*! no static exports found */
/***/ (function(module, exports) {

module.exports = "d";

/***/ })

}]);
```

# Info

## Unoptimized

```
Hash: 0a1b2c3d4e5f6a7b8c9d
Version: webpack 4.39.0
      Asset       Size  Chunks             Chunk Names
0.output.js  405 bytes       0  [emitted]  
2.output.js  241 bytes       2  [emitted]  
3.output.js  241 bytes       3  [emitted]  
  output.js   8.76 KiB       1  [emitted]  main
Entrypoint main = output.js
chunk    {0} 0.output.js 42 bytes <{1}> ={2}= ={3}= [rendered] split chunk (cache group: default)
    > ./a ./b ./c [2] ./example.js 2:0-30
    > [2] ./example.js 5:0-8:2
 [0] ./a.js 21 bytes {0} [built]
     amd require ./a [2] ./example.js 2:0-30
     require.ensure item ./a [2] ./example.js 5:0-8:2
 [1] ./b.js 21 bytes {0} [built]
     amd require ./b [2] ./example.js 2:0-30
     cjs require ./b [2] ./example.js 6:1-15
chunk    {1} output.js (main) 164 bytes >{0}< >{2}< >{3}< [entry] [rendered]
    > ./example.js main
 [2] ./example.js 164 bytes {1} [built]
     single entry ./example.js  main
chunk    {2} 2.output.js 21 bytes <{1}> ={0}= [rendered]
    > ./a ./b ./c [2] ./example.js 2:0-30
 [3] ./c.js 21 bytes {2} [built]
     amd require ./c [2] ./example.js 2:0-30
chunk    {3} 3.output.js 21 bytes <{1}> ={0}= [rendered]
    > [2] ./example.js 5:0-8:2
 [4] ./d.js 21 bytes {3} [built]
     cjs require ./d [2] ./example.js 7:1-15
```

## Production mode

```
Hash: 0a1b2c3d4e5f6a7b8c9d
Version: webpack 4.39.0
      Asset       Size  Chunks             Chunk Names
0.output.js  118 bytes       0  [emitted]  
2.output.js   91 bytes       2  [emitted]  
3.output.js   91 bytes       3  [emitted]  
  output.js   2.18 KiB       1  [emitted]  main
Entrypoint main = output.js
chunk    {0} 0.output.js 42 bytes <{1}> ={2}= ={3}= [rendered] split chunk (cache group: default)
    > ./a ./b ./c [2] ./example.js 2:0-30
    > [2] ./example.js 5:0-8:2
 [0] ./a.js 21 bytes {0} [built]
     amd require ./a [2] ./example.js 2:0-30
     require.ensure item ./a [2] ./example.js 5:0-8:2
 [1] ./b.js 21 bytes {0} [built]
     amd require ./b [2] ./example.js 2:0-30
     cjs require ./b [2] ./example.js 6:1-15
chunk    {1} output.js (main) 164 bytes >{0}< >{2}< >{3}< [entry] [rendered]
    > ./example.js main
 [2] ./example.js 164 bytes {1} [built]
     single entry ./example.js  main
chunk    {2} 2.output.js 21 bytes <{1}> ={0}= [rendered]
    > ./a ./b ./c [2] ./example.js 2:0-30
 [3] ./c.js 21 bytes {2} [built]
     amd require ./c [2] ./example.js 2:0-30
chunk    {3} 3.output.js 21 bytes <{1}> ={0}= [rendered]
    > [2] ./example.js 5:0-8:2
 [4] ./d.js 21 bytes {3} [built]
     cjs require ./d [2] ./example.js 7:1-15
```
