This example demonstrates Scope Hoisting in combination with Code Splitting.

This is the dependency graph for the example: (solid lines express sync imports, dashed lines async imports)

![](graph.png)

All modules except `cjs` are EcmaScript modules. `cjs` is a CommonJs module.

The interesting thing here is that putting all modules in single scope won't work, because of multiple reasons:

* Modules `lazy`, `c`, `d` and `cjs` need to be in a separate chunk
* Module `shared` is accessed by two chunks (different scopes)
* Module `cjs` is a CommonJs module

![](graph2.png)

webpack therefore uses a approach called **"Partial Scope Hoisting"** or "Module concatenation", which chooses the largest possible subsets of ES modules which can be scope hoisted and combines them with the default webpack primitives.

![](graph3.png)

While module concatenation identifiers in modules are renamed to avoid conflicts and internal imports are simplified. External imports and exports from the root module use the existing ESM constructs.

# example.js

``` javascript
import { a, x, y } from "a";
import * as b from "b";

import("./lazy").then(function(lazy) {
	console.log(a, b.a(), x, y, lazy.c, lazy.d.a, lazy.x, lazy.y);
});
```

# lazy.js

``` javascript
export * from "c";
import * as d from "d";
export { d };
```

# a.js

``` javascript
// module a
export var a = "a";
export * from "shared";
```

# b.js

``` javascript
// module b
export function a() {
	return "b";
};
```

# c.js

``` javascript
// module c
import { c as e } from "cjs";

export var c = String.fromCharCode(e.charCodeAt(0) - 2);

export { x, y } from "shared";
```

# d.js

``` javascript
// module d
export var a = "d";
```

# cjs.js

``` javascript
// module cjs (commonjs)
exports.c = "e";
```

# shared.js

``` javascript
// shared module
export var x = "x";
export * from "shared2";
```

# shared2.js

``` javascript
// shared2 module
export var y = "y";
```



# webpack.config.js

``` javascript
module.exports = {
	// mode: "development" || "production",
	optimization: {
		usedExports: true,
		concatenateModules: true,
		occurrenceOrder: true // To keep filename consistent between different modes (for example building only)
	}
};
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
/******/ 		1: 0
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
/******/ 	return __webpack_require__(__webpack_require__.s = 1);
/******/ })
/************************************************************************/
```

</details>

``` javascript
/******/ ([
/* 0 */
/*!********************************************!*\
  !*** ./node_modules/shared.js + 1 modules ***!
  \********************************************/
/*! exports provided: x, y */
/*! exports used: x, y */
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";

// CONCATENATED MODULE: ./node_modules/shared2.js
// shared2 module
var y = "y";

// CONCATENATED MODULE: ./node_modules/shared.js
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "a", function() { return x; });
/* concated harmony reexport */__webpack_require__.d(__webpack_exports__, "b", function() { return y; });
// shared module
var x = "x";



/***/ }),
/* 1 */
/*!********************************!*\
  !*** ./example.js + 2 modules ***!
  \********************************/
/*! no exports provided */
/*! all exports used */
/*! ModuleConcatenation bailout: Cannot concat with ./node_modules/a.js because of ./node_modules/c.js */
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
__webpack_require__.r(__webpack_exports__);

// EXTERNAL MODULE: ./node_modules/shared.js + 1 modules
var shared = __webpack_require__(0);

// CONCATENATED MODULE: ./node_modules/a.js
// module a
var a = "a";


// CONCATENATED MODULE: ./node_modules/b.js
// module b
function b_a() {
	return "b";
};

// CONCATENATED MODULE: ./example.js



__webpack_require__.e(/*! import() */ 0).then(__webpack_require__.bind(null, /*! ./lazy */ 3)).then(function(lazy) {
	console.log(a, b_a(), shared["a" /* x */], shared["b" /* y */], lazy.c, lazy.d.a, lazy.x, lazy.y);
});


/***/ })
/******/ ]);
```

# dist/0.output.js

``` javascript
(window["webpackJsonp"] = window["webpackJsonp"] || []).push([[0],[
/* 0 */,
/* 1 */,
/* 2 */
/*!*****************************!*\
  !*** ./node_modules/cjs.js ***!
  \*****************************/
/*! no static exports found */
/*! exports used: c */
/*! ModuleConcatenation bailout: Module is not an ECMAScript module */
/***/ (function(module, exports) {

// module cjs (commonjs)
exports.c = "e";


/***/ }),
/* 3 */
/*!*****************************!*\
  !*** ./lazy.js + 2 modules ***!
  \*****************************/
/*! exports provided: d, c, x, y */
/*! all exports used */
/*! ModuleConcatenation bailout: Cannot concat with ./node_modules/c.js because of ./node_modules/shared.js */
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
__webpack_require__.r(__webpack_exports__);
var d_namespaceObject = {};
__webpack_require__.d(d_namespaceObject, "a", function() { return a; });

// EXTERNAL MODULE: ./node_modules/cjs.js
var cjs = __webpack_require__(2);

// EXTERNAL MODULE: ./node_modules/shared.js + 1 modules
var shared = __webpack_require__(0);

// CONCATENATED MODULE: ./node_modules/c.js
// module c


var c = String.fromCharCode(cjs["c"].charCodeAt(0) - 2);



// CONCATENATED MODULE: ./node_modules/d.js
// module d
var a = "d";

// CONCATENATED MODULE: ./lazy.js
/* concated harmony reexport */__webpack_require__.d(__webpack_exports__, "c", function() { return c; });
/* concated harmony reexport */__webpack_require__.d(__webpack_exports__, "x", function() { return shared["a" /* x */]; });
/* concated harmony reexport */__webpack_require__.d(__webpack_exports__, "y", function() { return shared["b" /* y */]; });
/* concated harmony reexport */__webpack_require__.d(__webpack_exports__, "d", function() { return d_namespaceObject; });





/***/ })
]]);
```

Minimized

``` javascript
(window.webpackJsonp=window.webpackJsonp||[]).push([[0],[,,function(n,r){r.c="e"},function(n,r,t){"use strict";t.r(r);var c={};t.d(c,"a",function(){return e});var o=t(2),u=t(0),d=String.fromCharCode(o.c.charCodeAt(0)-2),e="d";t.d(r,"c",function(){return d}),t.d(r,"x",function(){return u.a}),t.d(r,"y",function(){return u.b}),t.d(r,"d",function(){return c})}]]);
```

# Info

## Unoptimized

```
Hash: 0a1b2c3d4e5f6a7b8c9d
Version: webpack 4.0.0-beta.2
      Asset      Size  Chunks             Chunk Names
0.output.js  1.78 KiB       0  [emitted]  
  output.js   8.2 KiB       1  [emitted]  main
Entrypoint main = output.js
chunk    {0} 0.output.js 286 bytes <{1}> [rendered]
    > ./lazy [] 4:0-16
    [3] ./lazy.js + 2 modules 242 bytes {0} [built]
        [exports: d, c, x, y]
        import() ./lazy  ./example.js 4:0-16
        | ./lazy.js 60 bytes [built]
        |    [exports: d, c, x, y]
        |    import() ./lazy  ./example.js 4:0-16
        |     + 2 hidden modules
     + 1 hidden module
chunk    {1} output.js (main) 390 bytes >{0}< [entry] [rendered]
    > .\example.js main
    [0] ./node_modules/shared.js + 1 modules 105 bytes {1} [built]
        [exports: x, y]
        [only some exports used: x, y]
        harmony side effect evaluation shared [1] ./example.js + 2 modules 3:0-23
        harmony export imported specifier shared [1] ./example.js + 2 modules 3:0-23
        harmony side effect evaluation shared [3] ./lazy.js + 2 modules 6:0-30
        harmony export imported specifier shared [3] ./lazy.js + 2 modules 6:0-30
        harmony export imported specifier shared [3] ./lazy.js + 2 modules 6:0-30
        |    2 modules
    [1] ./example.js + 2 modules 285 bytes {1} [built]
        [no exports]
        single entry .\example.js  main
        | ./example.js 167 bytes [built]
        |    [no exports]
        |    single entry .\example.js  main
        |     + 2 hidden modules
```

## Production mode

```
Hash: 0a1b2c3d4e5f6a7b8c9d
Version: webpack 4.0.0-beta.2
      Asset       Size  Chunks             Chunk Names
0.output.js  362 bytes       0  [emitted]  
  output.js    1.8 KiB       1  [emitted]  main
Entrypoint main = output.js
chunk    {0} 0.output.js 286 bytes <{1}> [rendered]
    > ./lazy [] 4:0-16
    [3] ./lazy.js + 2 modules 242 bytes {0} [built]
        [exports: d, c, x, y]
        import() ./lazy  ./example.js 4:0-16
        | ./lazy.js 60 bytes [built]
        |    [exports: d, c, x, y]
        |    import() ./lazy  ./example.js 4:0-16
        |     + 2 hidden modules
     + 1 hidden module
chunk    {1} output.js (main) 390 bytes >{0}< [entry] [rendered]
    > .\example.js main
    [0] ./node_modules/shared.js + 1 modules 105 bytes {1} [built]
        [exports: x, y]
        [only some exports used: x, y]
        harmony side effect evaluation shared [1] ./example.js + 2 modules 3:0-23
        harmony export imported specifier shared [1] ./example.js + 2 modules 3:0-23
        harmony side effect evaluation shared [3] ./lazy.js + 2 modules 6:0-30
        harmony export imported specifier shared [3] ./lazy.js + 2 modules 6:0-30
        harmony export imported specifier shared [3] ./lazy.js + 2 modules 6:0-30
        |    2 modules
    [1] ./example.js + 2 modules 285 bytes {1} [built]
        [no exports]
        single entry .\example.js  main
        | ./example.js 167 bytes [built]
        |    [no exports]
        |    single entry .\example.js  main
        |     + 2 hidden modules
```
