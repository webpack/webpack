# example.js

This example illustrates how to specify chunk name in `require.ensure()` and `import()` to separated modules into separate chunks manually.

``` javascript
import("./templates/foo" /* webpackChunkName: "chunk-foo" */ ).then(function(foo) {
	console.log('foo:', foo);
})

require.ensure([], function(require) {
	var foo = require("./templates/foo");
	console.log('foo:', foo);
}, "chunk-foo1");

var createContextVar = "r";
import("./templates/ba" + createContextVar /* webpackChunkName: "chunk-bar-baz" */ ).then(function(bar) {
	console.log('bar:', bar);
})
```

# templates/

* foo.js
* baz.js
* bar.js

All templates are of this pattern:

``` javascript
var foo = "foo";

export default foo;
```

# js/output.js

<details><summary><code>/******/ (function(modules) { /* webpackBootstrap */ })</code></summary>

``` javascript
/******/ (function(modules) { // webpackBootstrap
/******/ 	// install a JSONP callback for chunk loading
/******/ 	var parentJsonpFunction = window["webpackJsonp"];
/******/ 	window["webpackJsonp"] = function webpackJsonpCallback(chunkIds, moreModules, executeModules) {
/******/ 		// add "moreModules" to the modules object,
/******/ 		// then flag all "chunkIds" as loaded and fire callback
/******/ 		var moduleId, chunkId, i = 0, resolves = [], result;
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
/******/ 		if(parentJsonpFunction) parentJsonpFunction(chunkIds, moreModules, executeModules);
/******/ 		while(resolves.length) {
/******/ 			resolves.shift()();
/******/ 		}
/******/
/******/ 	};
/******/
/******/ 	// The module cache
/******/ 	var installedModules = {};
/******/
/******/ 	// objects to store loaded and loading chunks
/******/ 	var installedChunks = {
/******/ 		3: 0
/******/ 	};
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
/******/ 		var installedChunkData = installedChunks[chunkId];
/******/ 		if(installedChunkData === 0) {
/******/ 			return new Promise(function(resolve) { resolve(); });
/******/ 		}
/******/
/******/ 		// a Promise means "currently loading".
/******/ 		if(installedChunkData) {
/******/ 			return installedChunkData[2];
/******/ 		}
/******/
/******/ 		// setup Promise in chunk cache
/******/ 		var promise = new Promise(function(resolve, reject) {
/******/ 			installedChunkData = installedChunks[chunkId] = [resolve, reject];
/******/ 		});
/******/ 		installedChunkData[2] = promise;
/******/
/******/ 		// start chunk loading
/******/ 		var head = document.getElementsByTagName('head')[0];
/******/ 		var script = document.createElement('script');
/******/ 		script.type = 'text/javascript';
/******/ 		script.charset = 'utf-8';
/******/ 		script.async = true;
/******/ 		script.timeout = 120000;
/******/
/******/ 		if (__webpack_require__.nc) {
/******/ 			script.setAttribute("nonce", __webpack_require__.nc);
/******/ 		}
/******/ 		script.src = __webpack_require__.p + "" + chunkId + ".output.js";
/******/ 		var timeout = setTimeout(onScriptComplete, 120000);
/******/ 		script.onerror = script.onload = onScriptComplete;
/******/ 		function onScriptComplete() {
/******/ 			// avoid mem leaks in IE.
/******/ 			script.onerror = script.onload = null;
/******/ 			clearTimeout(timeout);
/******/ 			var chunk = installedChunks[chunkId];
/******/ 			if(chunk !== 0) {
/******/ 				if(chunk) {
/******/ 					chunk[1](new Error('Loading chunk ' + chunkId + ' failed.'));
/******/ 				}
/******/ 				installedChunks[chunkId] = undefined;
/******/ 			}
/******/ 		};
/******/ 		head.appendChild(script);
/******/
/******/ 		return promise;
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
/******/ 	__webpack_require__.p = "js/";
/******/
/******/ 	// on error function for async loading
/******/ 	__webpack_require__.oe = function(err) { console.error(err); throw err; };
/******/
/******/ 	// Load entry module and return exports
/******/ 	return __webpack_require__(__webpack_require__.s = 3);
/******/ })
/************************************************************************/
```

</details>

``` javascript
/******/ ([
/* 0 */,
/* 1 */,
/* 2 */,
/* 3 */
/*!********************!*\
  !*** ./example.js ***!
  \********************/
/*! no static exports found */
/*! all exports used */
/***/ (function(module, exports, __webpack_require__) {

__webpack_require__.e/* import() */(0/*! chunk-foo */).then(__webpack_require__.bind(null, /*! ./templates/foo */ 2)).then(function(foo) {
	console.log('foo:', foo);
})

__webpack_require__.e/* require.ensure */(0/*! chunk-foo1 *//* duplicate */).then((function(require) {
	var foo = __webpack_require__(/*! ./templates/foo */ 2);
	console.log('foo:', foo);
}).bind(null, __webpack_require__)).catch(__webpack_require__.oe);

var createContextVar = "r";
__webpack_require__(/*! ./templates */ 4)("./ba" + createContextVar).then(function(bar) {
	console.log('bar:', bar);
})




/***/ }),
/* 4 */
/*!***********************************!*\
  !*** ./templates lazy ^\.\/ba.*$ ***!
  \***********************************/
/*! no static exports found */
/*! all exports used */
/***/ (function(module, exports, __webpack_require__) {

var map = {
	"./bar": [
		0,
		2
	],
	"./bar.js": [
		0,
		2
	],
	"./baz": [
		1,
		1
	],
	"./baz.js": [
		1,
		1
	]
};
function webpackAsyncContext(req) {
	var ids = map[req];
	if(!ids)
		return Promise.reject(new Error("Cannot find module '" + req + "'."));
	return __webpack_require__.e(ids[1]).then(function() {
		return __webpack_require__(ids[0]);
	});
};
webpackAsyncContext.keys = function webpackAsyncContextKeys() {
	return Object.keys(map);
};
webpackAsyncContext.id = 4;
module.exports = webpackAsyncContext;

/***/ })
/******/ ]);
```

# Info

## Uncompressed

```
Hash: 9d034b3ada38a1291aa9
Version: webpack 3.5.1
      Asset       Size  Chunks             Chunk Names
0.output.js  444 bytes       0  [emitted]  chunk-foo
1.output.js  450 bytes       1  [emitted]  chunk-bar-baz2
2.output.js  441 bytes       2  [emitted]  chunk-bar-baz0
  output.js     7.3 kB       3  [emitted]  main
Entrypoint main = output.js
chunk    {0} 0.output.js (chunk-foo) 41 bytes {3} [rendered]
    > duplicate chunk-foo [3] ./example.js 1:0-62
    > duplicate chunk-foo1 [3] ./example.js 5:0-8:16
    [2] ./templates/foo.js 41 bytes {0} [built]
        [exports: default]
        import() ./templates/foo [3] ./example.js 1:0-62
        cjs require ./templates/foo [3] ./example.js 6:11-37
chunk    {1} 1.output.js (chunk-bar-baz2) 41 bytes {3} [rendered]
    [1] ./templates/baz.js 41 bytes {1} [optional] [built]
        [exports: default]
        context element ./baz.js [4] ./templates lazy ^\.\/ba.*$ ./baz.js
        context element ./baz [4] ./templates lazy ^\.\/ba.*$ ./baz
chunk    {2} 2.output.js (chunk-bar-baz0) 41 bytes {3} [rendered]
    [0] ./templates/bar.js 41 bytes {2} [optional] [built]
        [exports: default]
        context element ./bar.js [4] ./templates lazy ^\.\/ba.*$ ./bar.js
        context element ./bar [4] ./templates lazy ^\.\/ba.*$ ./bar
chunk    {3} output.js (main) 580 bytes [entry] [rendered]
    > main [3] ./example.js 
    [3] ./example.js 420 bytes {3} [built]
    [4] ./templates lazy ^\.\/ba.*$ 160 bytes {3} [built]
        import() context lazy ./templates [3] ./example.js 11:0-84
```

## Minimized (uglify-js, no zip)

```
Hash: 9d034b3ada38a1291aa9
Version: webpack 3.5.1
      Asset       Size  Chunks             Chunk Names
0.output.js  117 bytes       0  [emitted]  chunk-foo
1.output.js  116 bytes       1  [emitted]  chunk-bar-baz2
2.output.js  115 bytes       2  [emitted]  chunk-bar-baz0
  output.js    1.83 kB       3  [emitted]  main
Entrypoint main = output.js
chunk    {0} 0.output.js (chunk-foo) 41 bytes {3} [rendered]
    > duplicate chunk-foo [3] ./example.js 1:0-62
    > duplicate chunk-foo1 [3] ./example.js 5:0-8:16
    [2] ./templates/foo.js 41 bytes {0} [built]
        [exports: default]
        import() ./templates/foo [3] ./example.js 1:0-62
        cjs require ./templates/foo [3] ./example.js 6:11-37
chunk    {1} 1.output.js (chunk-bar-baz2) 41 bytes {3} [rendered]
    [1] ./templates/baz.js 41 bytes {1} [optional] [built]
        [exports: default]
        context element ./baz.js [4] ./templates lazy ^\.\/ba.*$ ./baz.js
        context element ./baz [4] ./templates lazy ^\.\/ba.*$ ./baz
chunk    {2} 2.output.js (chunk-bar-baz0) 41 bytes {3} [rendered]
    [0] ./templates/bar.js 41 bytes {2} [optional] [built]
        [exports: default]
        context element ./bar.js [4] ./templates lazy ^\.\/ba.*$ ./bar.js
        context element ./bar [4] ./templates lazy ^\.\/ba.*$ ./bar
chunk    {3} output.js (main) 580 bytes [entry] [rendered]
    > main [3] ./example.js 
    [3] ./example.js 420 bytes {3} [built]
    [4] ./templates lazy ^\.\/ba.*$ 160 bytes {3} [built]
        import() context lazy ./templates [3] ./example.js 11:0-84
```
