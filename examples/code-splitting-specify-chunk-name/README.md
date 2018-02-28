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
/******/ 	return __webpack_require__(__webpack_require__.s = 4);
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
/*!****************************************************!*\
  !*** ./templates lazy ^\.\/ba.*$ namespace object ***!
  \****************************************************/
/*! no static exports found */
/***/ (function(module, exports, __webpack_require__) {

var map = {
	"./bar": [
		2,
		1
	],
	"./bar.js": [
		2,
		1
	],
	"./baz": [
		1,
		0
	],
	"./baz.js": [
		1,
		0
	]
};
function webpackAsyncContext(req) {
	var ids = map[req];
	if(!ids) {
		return Promise.resolve().then(function() {
			var e = new Error('Cannot find module "' + req + '".');
			e.code = 'MODULE_NOT_FOUND';
			throw e;
		});
	}
	return __webpack_require__.e(ids[1]).then(function() {
		var module = __webpack_require__(ids[0]);
		return module;
	});
}
webpackAsyncContext.keys = function webpackAsyncContextKeys() {
	return Object.keys(map);
};
webpackAsyncContext.id = 3;
module.exports = webpackAsyncContext;

/***/ }),
/* 4 */
/*!********************!*\
  !*** ./example.js ***!
  \********************/
/*! no static exports found */
/***/ (function(module, exports, __webpack_require__) {

__webpack_require__.e(/*! import() | chunk-foo */ 2).then(__webpack_require__.bind(null, /*! ./templates/foo */ 0)).then(function(foo) {
	console.log('foo:', foo);
})

__webpack_require__.e(/*! require.ensure | chunk-foo1 */ 2).then((function(require) {
	var foo = __webpack_require__(/*! ./templates/foo */ 0);
	console.log('foo:', foo);
}).bind(null, __webpack_require__)).catch(__webpack_require__.oe);

var createContextVar = "r";
__webpack_require__(3)("./ba" + createContextVar).then(function(bar) {
	console.log('bar:', bar);
})




/***/ })
/******/ ]);
```

# Info

## Unoptimized

```
Hash: 0a1b2c3d4e5f6a7b8c9d
Version: webpack 4.0.0-beta.2
      Asset       Size  Chunks             Chunk Names
0.output.js  445 bytes       0  [emitted]  chunk-bar-baz2
1.output.js  439 bytes       1  [emitted]  chunk-bar-baz0
2.output.js  436 bytes       2  [emitted]  chunk-foo
  output.js   8.23 KiB       3  [emitted]  main
Entrypoint main = output.js
chunk    {0} 0.output.js (chunk-bar-baz2) 41 bytes <{3}> [rendered]
    > ./baz [3] ./templates lazy ^\.\/ba.*$ namespace object ./baz
    > ./baz.js [3] ./templates lazy ^\.\/ba.*$ namespace object ./baz.js
    [1] ./templates/baz.js 41 bytes {0} [optional] [built]
        [exports: default]
        context element ./baz.js [3] ./templates lazy ^\.\/ba.*$ namespace object ./baz.js
        context element ./baz [3] ./templates lazy ^\.\/ba.*$ namespace object ./baz
chunk    {1} 1.output.js (chunk-bar-baz0) 41 bytes <{3}> [rendered]
    > ./bar [3] ./templates lazy ^\.\/ba.*$ namespace object ./bar
    > ./bar.js [3] ./templates lazy ^\.\/ba.*$ namespace object ./bar.js
    [2] ./templates/bar.js 41 bytes {1} [optional] [built]
        [exports: default]
        context element ./bar.js [3] ./templates lazy ^\.\/ba.*$ namespace object ./bar.js
        context element ./bar [3] ./templates lazy ^\.\/ba.*$ namespace object ./bar
chunk    {2} 2.output.js (chunk-foo) 41 bytes <{3}> [rendered]
    > ./templates/foo [4] ./example.js 1:0-62
    > [4] ./example.js 5:0-8:16
    [0] ./templates/foo.js 41 bytes {2} [built]
        [exports: default]
        import() ./templates/foo [4] ./example.js 1:0-62
        cjs require ./templates/foo [4] ./example.js 6:11-37
chunk    {3} output.js (main) 580 bytes >{0}< >{1}< >{2}< [entry] [rendered]
    > .\example.js main
    [3] ./templates lazy ^\.\/ba.*$ namespace object 160 bytes {3} [built]
        import() context lazy ./templates [4] ./example.js 11:0-84
    [4] ./example.js 420 bytes {3} [built]
        single entry .\example.js  main
```

## Production mode

```
Hash: 0a1b2c3d4e5f6a7b8c9d
Version: webpack 4.0.0-beta.2
      Asset       Size  Chunks             Chunk Names
0.output.js  114 bytes       0  [emitted]  chunk-bar-baz2
1.output.js  115 bytes       1  [emitted]  chunk-bar-baz0
2.output.js  113 bytes       2  [emitted]  chunk-foo
  output.js   2.12 KiB       3  [emitted]  main
Entrypoint main = output.js
chunk    {0} 0.output.js (chunk-bar-baz2) 41 bytes <{3}> [rendered]
    > ./baz [3] ./templates lazy ^\.\/ba.*$ namespace object ./baz
    > ./baz.js [3] ./templates lazy ^\.\/ba.*$ namespace object ./baz.js
    [1] ./templates/baz.js 41 bytes {0} [optional] [built]
        [exports: default]
        context element ./baz.js [3] ./templates lazy ^\.\/ba.*$ namespace object ./baz.js
        context element ./baz [3] ./templates lazy ^\.\/ba.*$ namespace object ./baz
chunk    {1} 1.output.js (chunk-bar-baz0) 41 bytes <{3}> [rendered]
    > ./bar [3] ./templates lazy ^\.\/ba.*$ namespace object ./bar
    > ./bar.js [3] ./templates lazy ^\.\/ba.*$ namespace object ./bar.js
    [2] ./templates/bar.js 41 bytes {1} [optional] [built]
        [exports: default]
        context element ./bar.js [3] ./templates lazy ^\.\/ba.*$ namespace object ./bar.js
        context element ./bar [3] ./templates lazy ^\.\/ba.*$ namespace object ./bar
chunk    {2} 2.output.js (chunk-foo) 41 bytes <{3}> [rendered]
    > ./templates/foo [4] ./example.js 1:0-62
    > [4] ./example.js 5:0-8:16
    [0] ./templates/foo.js 41 bytes {2} [built]
        [exports: default]
        import() ./templates/foo [4] ./example.js 1:0-62
        cjs require ./templates/foo [4] ./example.js 6:11-37
chunk    {3} output.js (main) 580 bytes >{0}< >{1}< >{2}< [entry] [rendered]
    > .\example.js main
    [3] ./templates lazy ^\.\/ba.*$ namespace object 160 bytes {3} [built]
        import() context lazy ./templates [4] ./example.js 11:0-84
    [4] ./example.js 420 bytes {3} [built]
        single entry .\example.js  main
```
