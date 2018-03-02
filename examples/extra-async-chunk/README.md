This example shows automatically created async commons chunks.

The example entry references two chunks:

* entry chunk
  * async require -> chunk X
  * async require -> chunk Y
* chunk X
  * module `a`
  * module `b`
  * module `c`
* chunk Y
  * module `a`
  * module `b`
  * module `d`

These chunks share modules `a` and `b`. The optimization extract these into chunk Z:

Note: Actually the optimization compare size of chunk Z to some minimum value, but this is disabled from this example. In practice there is no configuration needed for this.

* entry chunk
  * async require -> chunk X & Z
  * async require -> chunk Y & Z
* chunk X
  * module `c`
* chunk Y
  * module `d`
* chunk Z
  * module `a`
  * module `b`

Pretty useful for a router in a SPA.


# example.js

``` javascript
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

``` javascript
/******/ (function(modules) { // webpackBootstrap
/******/ 	// install a JSONP callback for chunk loading
/******/ 	function webpackJsonpCallback(data) {
/******/ 		var chunkIds = data[0];
/******/ 		var moreModules = data[1]
/******/
/******/ 		// add "moreModules" to the modules object,
/******/ 		// then flag all "chunkIds" as loaded and fire callback
/******/ 		var moduleId, chunkId, i = 0, resolves = [];
/******/ 		for(;i < chunkIds.length; i++) {
/******/ 			chunkId = chunkIds[i];
/******/ 			if(installedChunks[chunkId]) {
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
/******/ 	var installedChunks = {
/******/ 		3: 0
/******/ 	};
/******/
/******/
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
/******/ 				var head = document.getElementsByTagName('head')[0];
/******/ 				var script = document.createElement('script');
/******/
/******/ 				script.charset = 'utf-8';
/******/ 				script.timeout = 120000;
/******/
/******/ 				if (__webpack_require__.nc) {
/******/ 					script.setAttribute("nonce", __webpack_require__.nc);
/******/ 				}
/******/ 				script.src = __webpack_require__.p + "" + chunkId + ".output.js";
/******/ 				var timeout = setTimeout(function(){
/******/ 					onScriptComplete({ type: 'timeout', target: script });
/******/ 				}, 120000);
/******/ 				script.onerror = script.onload = onScriptComplete;
/******/ 				function onScriptComplete(event) {
/******/ 					// avoid mem leaks in IE.
/******/ 					script.onerror = script.onload = null;
/******/ 					clearTimeout(timeout);
/******/ 					var chunk = installedChunks[chunkId];
/******/ 					if(chunk !== 0) {
/******/ 						if(chunk) {
/******/ 							var errorType = event && (event.type === 'load' ? 'missing' : event.type);
/******/ 							var realSrc = event && event.target && event.target.src;
/******/ 							var error = new Error('Loading chunk ' + chunkId + ' failed.\n(' + errorType + ': ' + realSrc + ')');
/******/ 							error.type = errorType;
/******/ 							error.request = realSrc;
/******/ 							chunk[1](error);
/******/ 						}
/******/ 						installedChunks[chunkId] = undefined;
/******/ 					}
/******/ 				};
/******/ 				head.appendChild(script);
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
/******/ 			Object.defineProperty(exports, name, {
/******/ 				configurable: false,
/******/ 				enumerable: true,
/******/ 				get: getter
/******/ 			});
/******/ 		}
/******/ 	};
/******/
/******/ 	// define __esModule on exports
/******/ 	__webpack_require__.r = function(exports) {
/******/ 		Object.defineProperty(exports, '__esModule', { value: true });
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

``` javascript
/******/ ({

/***/ 2:
/*!********************!*\
  !*** ./example.js ***!
  \********************/
/*! no static exports found */
/***/ (function(module, exports, __webpack_require__) {

// a chunks with a, b, c
Promise.all(/*! AMD require */[__webpack_require__.e(0), __webpack_require__.e(2)]).then(function() {[__webpack_require__(/*! ./a */ 1), __webpack_require__(/*! ./b */ 0), __webpack_require__(/*! ./c */ 4)];}).catch(__webpack_require__.oe);

// a chunk with a, b, d
Promise.all(/*! require.ensure */[__webpack_require__.e(0), __webpack_require__.e(1)]).then((function(require) {
	__webpack_require__(/*! ./b */ 0);
	__webpack_require__(/*! ./d */ 3);
}).bind(null, __webpack_require__)).catch(__webpack_require__.oe);


/***/ })

/******/ });
```

# dist/0.output.js

``` javascript
(window["webpackJsonp"] = window["webpackJsonp"] || []).push([[0],[
/* 0 */
/*!**************!*\
  !*** ./b.js ***!
  \**************/
/*! no static exports found */
/***/ (function(module, exports) {

module.exports = "b";

/***/ }),
/* 1 */
/*!**************!*\
  !*** ./a.js ***!
  \**************/
/*! no static exports found */
/***/ (function(module, exports) {

module.exports = "a";

/***/ })
]]);
```

# dist/1.output.js

``` javascript
(window["webpackJsonp"] = window["webpackJsonp"] || []).push([[1],{

/***/ 3:
/*!**************!*\
  !*** ./d.js ***!
  \**************/
/*! no static exports found */
/***/ (function(module, exports) {

module.exports = "d";

/***/ })

}]);
```

# dist/2.output.js

``` javascript
(window["webpackJsonp"] = window["webpackJsonp"] || []).push([[2],{

/***/ 4:
/*!**************!*\
  !*** ./c.js ***!
  \**************/
/*! no static exports found */
/***/ (function(module, exports) {

module.exports = "c";

/***/ })

}]);
```

# Info

## Unoptimized

```
Hash: 0a1b2c3d4e5f6a7b8c9d
Version: webpack 4.0.0-beta.2
      Asset       Size  Chunks             Chunk Names
0.output.js  405 bytes       0  [emitted]  
1.output.js  241 bytes       1  [emitted]  
2.output.js  241 bytes       2  [emitted]  
  output.js   7.32 KiB       3  [emitted]  main
Entrypoint main = output.js
chunk    {0} 0.output.js 42 bytes <{3}> ={1}= ={2}= [rendered] split chunk (cache group: default)
    > ./a ./b ./c [2] ./example.js 2:0-30
    > [2] ./example.js 5:0-8:2
    [0] ./b.js 21 bytes {0} [built]
        amd require ./b [2] ./example.js 2:0-30
        cjs require ./b [2] ./example.js 6:1-15
    [1] ./a.js 21 bytes {0} [built]
        amd require ./a [2] ./example.js 2:0-30
        require.ensure item ./a [2] ./example.js 5:0-8:2
chunk    {1} 1.output.js 21 bytes <{3}> ={0}= [rendered]
    > [2] ./example.js 5:0-8:2
    [3] ./d.js 21 bytes {1} [built]
        cjs require ./d [2] ./example.js 7:1-15
chunk    {2} 2.output.js 21 bytes <{3}> ={0}= [rendered]
    > ./a ./b ./c [2] ./example.js 2:0-30
    [4] ./c.js 21 bytes {2} [built]
        amd require ./c [2] ./example.js 2:0-30
chunk    {3} output.js (main) 172 bytes >{0}< >{1}< >{2}< [entry] [rendered]
    > .\example.js main
    [2] ./example.js 172 bytes {3} [built]
        single entry .\example.js  main
```

## Production mode

```
Hash: 0a1b2c3d4e5f6a7b8c9d
Version: webpack 4.0.0-beta.2
      Asset       Size  Chunks             Chunk Names
0.output.js  118 bytes       0  [emitted]  
1.output.js   91 bytes       1  [emitted]  
2.output.js   91 bytes       2  [emitted]  
  output.js   1.73 KiB       3  [emitted]  main
Entrypoint main = output.js
chunk    {0} 0.output.js 42 bytes <{3}> ={1}= ={2}= [rendered] split chunk (cache group: default)
    > ./a ./b ./c [2] ./example.js 2:0-30
    > [2] ./example.js 5:0-8:2
    [0] ./b.js 21 bytes {0} [built]
        amd require ./b [2] ./example.js 2:0-30
        cjs require ./b [2] ./example.js 6:1-15
    [1] ./a.js 21 bytes {0} [built]
        amd require ./a [2] ./example.js 2:0-30
        require.ensure item ./a [2] ./example.js 5:0-8:2
chunk    {1} 1.output.js 21 bytes <{3}> ={0}= [rendered]
    > [2] ./example.js 5:0-8:2
    [3] ./d.js 21 bytes {1} [built]
        cjs require ./d [2] ./example.js 7:1-15
chunk    {2} 2.output.js 21 bytes <{3}> ={0}= [rendered]
    > ./a ./b ./c [2] ./example.js 2:0-30
    [4] ./c.js 21 bytes {2} [built]
        amd require ./c [2] ./example.js 2:0-30
chunk    {3} output.js (main) 172 bytes >{0}< >{1}< >{2}< [entry] [rendered]
    > .\example.js main
    [2] ./example.js 172 bytes {3} [built]
        single entry .\example.js  main
```
