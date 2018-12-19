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
/*!********************************!*\
  !*** ./example.js + 2 modules ***!
  \********************************/
/*! no exports provided */
/*! runtime requirements: __webpack_exports__, __webpack_require__.r, __webpack_require__.d, __webpack_require__.n, __webpack_require__.e, __webpack_require__ */
/*! all exports used */
/*! ModuleConcatenation bailout: Cannot concat with ./node_modules/shared.js (<- Module is referenced from different chunks by these modules: ./lazy.js + 2 modules) */
/***/ (function(__unusedmodule, __webpack_exports__, __webpack_require__) {

"use strict";
__webpack_require__.r(__webpack_exports__);

// EXTERNAL MODULE: ./node_modules/shared.js + 1 modules
var shared = __webpack_require__(1);

// CONCATENATED MODULE: ./node_modules/a.js
// module a
var a = "a";


// CONCATENATED MODULE: ./node_modules/b.js
// module b
function b_a() {
	return "b";
};

// CONCATENATED MODULE: ./example.js



__webpack_require__.e(/*! import() */ 78).then(__webpack_require__.bind(null, /*! ./lazy */ 2)).then(function(lazy) {
	console.log(a, b_a(), shared["a" /* x */], shared["b" /* y */], lazy.c, lazy.d.a, lazy.x, lazy.y);
});


/***/ }),
/* 1 */
/*!********************************************!*\
  !*** ./node_modules/shared.js + 1 modules ***!
  \********************************************/
/*! exports provided: x, y */
/*! runtime requirements: __webpack_exports__, __webpack_require__.r, __webpack_require__.d, __webpack_require__ */
/*! exports used: x, y */
/***/ (function(__unusedmodule, __webpack_exports__, __webpack_require__) {

"use strict";

// CONCATENATED MODULE: ./node_modules/shared2.js
// shared2 module
var y = "y";

// CONCATENATED MODULE: ./node_modules/shared.js
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "a", function() { return x; });
/* concated harmony reexport */ __webpack_require__.d(__webpack_exports__, "b", function() { return y; });
// shared module
var x = "x";



/***/ })
/******/ ],
```

<details><summary><code>function(__webpack_require__) { /* webpackRuntimeModules */ });</code></summary>

``` js
/******/ function(__webpack_require__) { // webpackRuntimeModules
/******/ 	"use strict";
/******/ 
/******/ 	/* webpack/runtime/make namespace object */
/******/ 	!function() {
/******/ 		// define __esModule on exports
/******/ 		__webpack_require__.r = function(exports) {
/******/ 			if(typeof Symbol !== 'undefined' && Symbol.toStringTag) {
/******/ 				Object.defineProperty(exports, Symbol.toStringTag, { value: 'Module' });
/******/ 			}
/******/ 			Object.defineProperty(exports, '__esModule', { value: true });
/******/ 		};
/******/ 	}();
/******/ 	
/******/ 	/* webpack/runtime/define property getter */
/******/ 	!function() {
/******/ 		// define getter function for harmony exports
/******/ 		var hasOwnProperty = Object.prototype.hasOwnProperty;
/******/ 		__webpack_require__.d = function(exports, name, getter) {
/******/ 			if(!hasOwnProperty.call(exports, name)) {
/******/ 				Object.defineProperty(exports, name, { enumerable: true, get: getter });
/******/ 			}
/******/ 		};
/******/ 	}();
/******/ 	
/******/ 	/* webpack/runtime/compat get default export */
/******/ 	!function() {
/******/ 		// getDefaultExport function for compatibility with non-harmony modules
/******/ 		__webpack_require__.n = function(module) {
/******/ 			var getter = module && module.__esModule ?
/******/ 				function getDefault() { return module['default']; } :
/******/ 				function getModuleExports() { return module; };
/******/ 			__webpack_require__.d(getter, 'a', getter);
/******/ 			return getter;
/******/ 		};
/******/ 	}();
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
/******/ 	/* webpack/runtime/create fake namespace object */
/******/ 	!function() {
/******/ 		// create a fake namespace object
/******/ 		// mode & 1: value is a module id, require it
/******/ 		// mode & 2: merge all properties of value into the ns
/******/ 		// mode & 4: return value when already ns object
/******/ 		// mode & 8|1: behave like require
/******/ 		__webpack_require__.t = function(value, mode) {
/******/ 			if(mode & 1) value = this(value);
/******/ 			if(mode & 8) return value;
/******/ 			if((mode & 4) && typeof value === 'object' && value && value.__esModule) return value;
/******/ 			var ns = Object.create(null);
/******/ 			__webpack_require__.r(ns);
/******/ 			Object.defineProperty(ns, 'default', { enumerable: true, value: value });
/******/ 			if(mode & 2 && typeof value != 'string') for(var key in value) __webpack_require__.d(ns, key, function(key) { return value[key]; }.bind(null, key));
/******/ 			return ns;
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


# dist/78.output.js

``` javascript
(window["webpackJsonp"] = window["webpackJsonp"] || []).push([[78],[
/* 0 */,
/* 1 */,
/* 2 */
/*!*****************************!*\
  !*** ./lazy.js + 2 modules ***!
  \*****************************/
/*! exports provided: d, c, x, y */
/*! runtime requirements: __webpack_exports__, __webpack_require__.r, __webpack_require__.d, __webpack_require__.t, __webpack_require__.n, __webpack_require__ */
/*! all exports used */
/*! ModuleConcatenation bailout: Cannot concat with ./node_modules/cjs.js (<- Module is not an ECMAScript module) */
/*! ModuleConcatenation bailout: Cannot concat with ./node_modules/shared.js (<- Module is referenced from different chunks by these modules: ./lazy.js + 2 modules) */
/***/ (function(__unusedmodule, __webpack_exports__, __webpack_require__) {

"use strict";
__webpack_require__.r(__webpack_exports__);
var d_namespaceObject = {};
__webpack_require__.r(d_namespaceObject);
__webpack_require__.d(d_namespaceObject, "a", function() { return a; });

// EXTERNAL MODULE: ./node_modules/cjs.js
var cjs = __webpack_require__(3);

// EXTERNAL MODULE: ./node_modules/shared.js + 1 modules
var shared = __webpack_require__(1);

// CONCATENATED MODULE: ./node_modules/c.js
// module c


var c = String.fromCharCode(cjs["c"].charCodeAt(0) - 2);



// CONCATENATED MODULE: ./node_modules/d.js
// module d
var a = "d";

// CONCATENATED MODULE: ./lazy.js
/* concated harmony reexport */ __webpack_require__.d(__webpack_exports__, "c", function() { return c; });
/* concated harmony reexport */ __webpack_require__.d(__webpack_exports__, "x", function() { return shared["a" /* x */]; });
/* concated harmony reexport */ __webpack_require__.d(__webpack_exports__, "y", function() { return shared["b" /* y */]; });
/* concated harmony reexport */ __webpack_require__.d(__webpack_exports__, "d", function() { return d_namespaceObject; });





/***/ }),
/* 3 */
/*!*****************************!*\
  !*** ./node_modules/cjs.js ***!
  \*****************************/
/*! no static exports found */
/*! runtime requirements: __webpack_exports__ */
/*! exports used: c */
/*! ModuleConcatenation bailout: Module is not an ECMAScript module */
/***/ (function(__unusedmodule, exports) {

// module cjs (commonjs)
exports.c = "e";


/***/ })
]]);
```

Minimized

``` javascript
(window.webpackJsonp=window.webpackJsonp||[]).push([[78],{719:function(n,r){r.c="e"},78:function(n,r,t){"use strict";t.r(r);var c={};t.r(c),t.d(c,"a",function(){return e});var o=t(719),u=t(852),d=String.fromCharCode(o.c.charCodeAt(0)-2),e="d";t.d(r,"c",function(){return d}),t.d(r,"x",function(){return u.a}),t.d(r,"y",function(){return u.b}),t.d(r,"d",function(){return c})}}]);
```

# Info

## Unoptimized

```
Hash: 0a1b2c3d4e5f6a7b8c9d
Version: webpack 5.0.0-next
       Asset      Size  Chunks             Chunk Names
78.output.js  2.21 KiB    {78}  [emitted]
   output.js    11 KiB   {404}  [emitted]  main
Entrypoint main = output.js
chunk {78} 78.output.js 273 bytes <{404}> [rendered]
    > ./lazy ./example.js 4:0-16
 [2] ./lazy.js + 2 modules 231 bytes {78} [built]
     [exports: d, c, x, y]
     import() ./lazy [0] ./example.js + 2 modules 4:0-16
 [3] ./node_modules/cjs.js 42 bytes {78} [built]
     [only some exports used: c]
     harmony side effect evaluation cjs [2] ./lazy.js + 2 modules 2:0-29
     harmony import specifier cjs [2] ./lazy.js + 2 modules 4:35-36
chunk {404} output.js (main) 372 bytes (javascript) 5.12 KiB (runtime) >{78}< [entry] [rendered]
    > .\example.js main
 [0] ./example.js + 2 modules 272 bytes {404} [built]
     [no exports]
     entry .\example.js main
 [1] ./node_modules/shared.js + 1 modules 100 bytes {404} [built]
     [exports: x, y]
     [all exports used]
     harmony side effect evaluation shared [0] ./example.js + 2 modules 3:0-23
     harmony export imported specifier shared [0] ./example.js + 2 modules 3:0-23
     harmony side effect evaluation shared [2] ./lazy.js + 2 modules 6:0-30
     harmony export imported specifier shared [2] ./lazy.js + 2 modules 6:0-30
     harmony export imported specifier shared [2] ./lazy.js + 2 modules 6:0-30
     + 8 hidden chunk modules
```

## Production mode

```
Hash: 0a1b2c3d4e5f6a7b8c9d
Version: webpack 5.0.0-next
       Asset       Size  Chunks             Chunk Names
78.output.js  379 bytes    {78}  [emitted]
   output.js   2.25 KiB   {404}  [emitted]  main
Entrypoint main = output.js
chunk {78} 78.output.js 273 bytes <{404}> [rendered]
    > ./lazy ./example.js 4:0-16
  [78] ./lazy.js + 2 modules 231 bytes {78} [built]
       [exports: d, c, x, y]
       import() ./lazy [258] ./example.js + 2 modules 4:0-16
 [719] ./node_modules/cjs.js 42 bytes {78} [built]
       [only some exports used: c]
       harmony side effect evaluation cjs [78] ./lazy.js + 2 modules 2:0-29
       harmony import specifier cjs [78] ./lazy.js + 2 modules 4:35-36
chunk {404} output.js (main) 372 bytes (javascript) 5.12 KiB (runtime) >{78}< [entry] [rendered]
    > .\example.js main
 [258] ./example.js + 2 modules 272 bytes {404} [built]
       [no exports]
       entry .\example.js main
 [852] ./node_modules/shared.js + 1 modules 100 bytes {404} [built]
       [exports: x, y]
       [all exports used]
       harmony side effect evaluation shared [78] ./lazy.js + 2 modules 6:0-30
       harmony export imported specifier shared [78] ./lazy.js + 2 modules 6:0-30
       harmony export imported specifier shared [78] ./lazy.js + 2 modules 6:0-30
       harmony side effect evaluation shared [258] ./example.js + 2 modules 3:0-23
       harmony export imported specifier shared [258] ./example.js + 2 modules 3:0-23
     + 8 hidden chunk modules
```
