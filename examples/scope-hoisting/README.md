This example demonstrates Scope Hoisting in combination with Code Splitting.

This is the dependency graph for the example: (solid lines express sync imports, dashed lines async imports)

![](graph.png)

All modules except `cjs` are EcmaScript modules. `cjs` is a CommonJs module.

The interesting thing here is that putting all modules in single scope won't work, because of multiple reasons:

- Modules `lazy`, `c`, `d` and `cjs` need to be in a separate chunk
- Module `shared` is accessed by two chunks (different scopes)
- Module `cjs` is a CommonJs module

![](graph2.png)

webpack therefore uses a approach called **"Partial Scope Hoisting"** or "Module concatenation", which chooses the largest possible subsets of ES modules which can be scope hoisted and combines them with the default webpack primitives.

![](graph3.png)

While module concatenation identifiers in modules are renamed to avoid conflicts and internal imports are simplified. External imports and exports from the root module use the existing ESM constructs.

# example.js

```javascript
import { a, x, y } from "a";
import * as b from "b";

import("./lazy").then(function(lazy) {
	console.log(a, b.a(), x, y, lazy.c, lazy.d.a, lazy.x, lazy.y);
});
```

# lazy.js

```javascript
export * from "c";
import * as d from "d";
export { d };
```

# a.js

```javascript
// module a
export var a = "a";
export * from "shared";
```

# b.js

```javascript
// module b
export function a() {
	return "b";
};
```

# c.js

```javascript
// module c
import { c as e } from "cjs";

export var c = String.fromCharCode(e.charCodeAt(0) - 2);

export { x, y } from "shared";
```

# d.js

```javascript
// module d
export var a = "d";
```

# cjs.js

```javascript
// module cjs (commonjs)
exports.c = "e";
```

# shared.js

```javascript
// shared module
export var x = "x";
export * from "shared2";
```

# shared2.js

```javascript
// shared2 module
export var y = "y";
```

# webpack.config.js

```javascript
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

```javascript
/******/ (() => { // webpackBootstrap
/******/ 	"use strict";
/******/ 	var __webpack_modules__ = ([
/* 0 */,
/* 1 */
/*!********************************************!*\
  !*** ./node_modules/shared.js + 1 modules ***!
  \********************************************/
/*! namespace exports */
/*! export x [provided] [used] [could be renamed] */
/*! export y [provided] [used] [could be renamed] */
/*! other exports [not provided] [unused] */
/*! runtime requirements: __webpack_exports__, __webpack_require__.d, __webpack_require__.* */
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {


// EXPORTS
__webpack_require__.d(__webpack_exports__, {
  "x": () => /* binding */ x,
  "y": () => /* reexport */ y
});

// CONCATENATED MODULE: ./node_modules/shared2.js
// shared2 module
var y = "y";

// CONCATENATED MODULE: ./node_modules/shared.js
// shared module
var x = "x";



/***/ })
/******/ 	]);
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
/******/ 	/* webpack/runtime/define property getters */
/******/ 	(() => {
/******/ 		// define getter functions for harmony exports
/******/ 		__webpack_require__.d = (exports, definition) => {
/******/ 			for(var key in definition) {
/******/ 				if(__webpack_require__.o(definition, key) && !__webpack_require__.o(exports, key)) {
/******/ 					Object.defineProperty(exports, key, { enumerable: true, get: definition[key] });
/******/ 				}
/******/ 			}
/******/ 		};
/******/ 	})();
/******/ 	
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
/******/ 	/* webpack/runtime/make namespace object */
/******/ 	(() => {
/******/ 		// define __esModule on exports
/******/ 		__webpack_require__.r = (exports) => {
/******/ 			if(typeof Symbol !== 'undefined' && Symbol.toStringTag) {
/******/ 				Object.defineProperty(exports, Symbol.toStringTag, { value: 'Module' });
/******/ 			}
/******/ 			Object.defineProperty(exports, '__esModule', { value: true });
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
/******/ 							var loadingEnded = () => {
/******/ 								if(__webpack_require__.o(installedChunks, chunkId)) {
/******/ 									installedChunkData = installedChunks[chunkId];
/******/ 									if(installedChunkData !== 0) installedChunks[chunkId] = undefined;
/******/ 									if(installedChunkData) return installedChunkData[1];
/******/ 								}
/******/ 							};
/******/ 							var script = document.createElement('script');
/******/ 							var onScriptComplete;
/******/ 		
/******/ 							script.charset = 'utf-8';
/******/ 							script.timeout = 120;
/******/ 							if (__webpack_require__.nc) {
/******/ 								script.setAttribute("nonce", __webpack_require__.nc);
/******/ 							}
/******/ 							script.src = url;
/******/ 		
/******/ 							// create error before stack unwound to get useful stacktrace later
/******/ 							var error = new Error();
/******/ 							onScriptComplete = (event) => {
/******/ 								onScriptComplete = () => {
/******/ 		
/******/ 								}
/******/ 								// avoid mem leaks in IE.
/******/ 								script.onerror = script.onload = null;
/******/ 								clearTimeout(timeout);
/******/ 								var reportError = loadingEnded();
/******/ 								if(reportError) {
/******/ 									var errorType = event && (event.type === 'load' ? 'missing' : event.type);
/******/ 									var realSrc = event && event.target && event.target.src;
/******/ 									error.message = 'Loading chunk ' + chunkId + ' failed.\n(' + errorType + ': ' + realSrc + ')';
/******/ 									error.name = 'ChunkLoadError';
/******/ 									error.type = errorType;
/******/ 									error.request = realSrc;
/******/ 									reportError(error);
/******/ 								}
/******/ 							}
/******/ 							;
/******/ 							var timeout = setTimeout(() => {
/******/ 								onScriptComplete({ type: 'timeout', target: script })
/******/ 							}, 120000);
/******/ 							script.onerror = script.onload = onScriptComplete;
/******/ 							document.head.appendChild(script);
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
/******/ 		function webpackJsonpCallback(data) {
/******/ 			var chunkIds = data[0];
/******/ 			var moreModules = data[1];
/******/ 		
/******/ 			var runtime = data[3];
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
/******/ 			if(parentJsonpFunction) parentJsonpFunction(data);
/******/ 			while(resolves.length) {
/******/ 				resolves.shift()();
/******/ 			}
/******/ 		
/******/ 		};
/******/ 		
/******/ 		var jsonpArray = window["webpackJsonp"] = window["webpackJsonp"] || [];
/******/ 		var oldJsonpFunction = jsonpArray.push.bind(jsonpArray);
/******/ 		jsonpArray.push = webpackJsonpCallback;
/******/ 		var parentJsonpFunction = oldJsonpFunction;
/******/ 	})();
/******/ 	
/************************************************************************/
```

</details>

``` js
(() => {
/*!********************************!*\
  !*** ./example.js + 2 modules ***!
  \********************************/
/*! namespace exports */
/*! exports [not provided] [unused] */
/*! runtime requirements: __webpack_require__, __webpack_require__.e, __webpack_require__.* */
/*! ModuleConcatenation bailout: Cannot concat with ./node_modules/shared.js (<- Module is referenced from different chunks by these modules: ./lazy.js + 2 modules) */

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



__webpack_require__.e(/*! import() */ 262).then(__webpack_require__.bind(__webpack_require__, /*! ./lazy */ 2)).then(function(lazy) {
	console.log(a, b_a(), shared.x, shared.y, lazy.c, lazy.d.a, lazy.x, lazy.y);
});

})();

/******/ })()
;
```

# dist/262.output.js

```javascript
(window["webpackJsonp"] = window["webpackJsonp"] || []).push([[262],[
/* 0 */,
/* 1 */,
/* 2 */
/*!*****************************!*\
  !*** ./lazy.js + 2 modules ***!
  \*****************************/
/*! namespace exports */
/*! export c [provided] [maybe used (runtime-defined)] [usage prevents renaming] */
/*! export d [provided] [maybe used (runtime-defined)] [usage prevents renaming] */
/*!   export a [provided] [maybe used (runtime-defined)] [usage prevents renaming] */
/*!   other exports [not provided] [maybe used (runtime-defined)] */
/*! export x [provided] [maybe used (runtime-defined)] [usage prevents renaming] */
/*! export y [provided] [maybe used (runtime-defined)] [usage prevents renaming] */
/*! other exports [not provided] [maybe used (runtime-defined)] */
/*! runtime requirements: __webpack_require__.r, __webpack_exports__, __webpack_require__.d, __webpack_require__, __webpack_require__.* */
/*! ModuleConcatenation bailout: Cannot concat with ./node_modules/cjs.js (<- Module is not an ECMAScript module) */
/*! ModuleConcatenation bailout: Cannot concat with ./node_modules/shared.js (<- Module is referenced from different chunks by these modules: ./lazy.js + 2 modules) */
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

"use strict";
// ESM COMPAT FLAG
__webpack_require__.r(__webpack_exports__);

// EXPORTS
__webpack_require__.d(__webpack_exports__, {
  "c": () => /* reexport */ c,
  "x": () => /* reexport */ shared.x,
  "y": () => /* reexport */ shared.y,
  "d": () => /* reexport */ d_namespaceObject
});

// NAMESPACE OBJECT: ./node_modules/d.js
var d_namespaceObject = {};
__webpack_require__.r(d_namespaceObject);
__webpack_require__.d(d_namespaceObject, {
  "a": () => a
});

// EXTERNAL MODULE: ./node_modules/cjs.js
var cjs = __webpack_require__(3);

// EXTERNAL MODULE: ./node_modules/shared.js + 1 modules
var shared = __webpack_require__(1);

// CONCATENATED MODULE: ./node_modules/c.js
// module c


var c = String.fromCharCode(cjs.c.charCodeAt(0) - 2);



// CONCATENATED MODULE: ./node_modules/d.js
// module d
var a = "d";

// CONCATENATED MODULE: ./lazy.js





/***/ }),
/* 3 */
/*!*****************************!*\
  !*** ./node_modules/cjs.js ***!
  \*****************************/
/*! default exports */
/*! export c [provided] [used] [could be renamed] */
/*! other exports [not provided] [unused] */
/*! runtime requirements: __webpack_exports__ */
/*! ModuleConcatenation bailout: Module is not an ECMAScript module */
/***/ ((__unused_webpack_module, exports) => {

// module cjs (commonjs)
exports.c = "e";


/***/ })
]]);
```

Minimized

```javascript
(window.webpackJsonp=window.webpackJsonp||[]).push([[262],{262:(r,d,a)=>{"use strict";a.r(d),a.d(d,{c:()=>w,x:()=>e.x,y:()=>e.y,d:()=>c});var c={};a.r(c),a.d(c,{a:()=>n});var o=a(75),e=a(350),w=String.fromCharCode(o.c.charCodeAt(0)-2),n="d"},75:(r,d)=>{d.c="e"}}]);
```

# Info

## Unoptimized

```
Hash: 0a1b2c3d4e5f6a7b8c9d
Version: webpack 5.0.0-beta.16
        Asset      Size
262.output.js  2.56 KiB  [emitted]
    output.js  10.1 KiB  [emitted]  [name: main]
Entrypoint main = output.js
chunk output.js (main) 372 bytes (javascript) 4.76 KiB (runtime) [entry] [rendered]
    > ./example.js main
 ./example.js + 2 modules 272 bytes [built]
     [no exports]
     [no exports used]
     entry ./example.js main
 ./node_modules/shared.js + 1 modules 100 bytes [built]
     [exports: x, y]
     [all exports used]
     harmony side effect evaluation shared ./example.js + 2 modules ./node_modules/a.js 3:0-23
     harmony export imported specifier shared ./example.js + 2 modules ./node_modules/a.js 3:0-23
     harmony side effect evaluation shared ./lazy.js + 2 modules ./node_modules/c.js 6:0-30
     harmony export imported specifier shared ./lazy.js + 2 modules ./node_modules/c.js 6:0-30
     harmony export imported specifier shared ./lazy.js + 2 modules ./node_modules/c.js 6:0-30
     + 7 hidden chunk modules
chunk 262.output.js 273 bytes [rendered]
    > ./lazy ./example.js 4:0-16
 ./lazy.js + 2 modules 231 bytes [built]
     [exports: c, d, x, y]
     import() ./lazy ./example.js + 2 modules ./example.js 4:0-16
 ./node_modules/cjs.js 42 bytes [built]
     [exports: c]
     [all exports used]
     harmony side effect evaluation cjs ./lazy.js + 2 modules ./node_modules/c.js 2:0-29
     harmony import specifier cjs ./lazy.js + 2 modules ./node_modules/c.js 4:35-47
```

## Production mode

```
Hash: 0a1b2c3d4e5f6a7b8c9d
Version: webpack 5.0.0-beta.16
        Asset       Size
262.output.js  265 bytes  [emitted]
    output.js    1.7 KiB  [emitted]  [name: main]
Entrypoint main = output.js
chunk output.js (main) 372 bytes (javascript) 4.76 KiB (runtime) [entry] [rendered]
    > ./example.js main
 ./example.js + 2 modules 272 bytes [built]
     [no exports]
     [no exports used]
     entry ./example.js main
 ./node_modules/shared.js + 1 modules 100 bytes [built]
     [exports: x, y]
     [all exports used]
     harmony side effect evaluation shared ./example.js + 2 modules ./node_modules/a.js 3:0-23
     harmony export imported specifier shared ./example.js + 2 modules ./node_modules/a.js 3:0-23
     harmony side effect evaluation shared ./lazy.js + 2 modules ./node_modules/c.js 6:0-30
     harmony export imported specifier shared ./lazy.js + 2 modules ./node_modules/c.js 6:0-30
     harmony export imported specifier shared ./lazy.js + 2 modules ./node_modules/c.js 6:0-30
     + 7 hidden chunk modules
chunk 262.output.js 273 bytes [rendered]
    > ./lazy ./example.js 4:0-16
 ./lazy.js + 2 modules 231 bytes [built]
     [exports: c, d, x, y]
     import() ./lazy ./example.js + 2 modules ./example.js 4:0-16
 ./node_modules/cjs.js 42 bytes [built]
     [exports: c]
     [all exports used]
     harmony side effect evaluation cjs ./lazy.js + 2 modules ./node_modules/c.js 2:0-29
     harmony import specifier cjs ./lazy.js + 2 modules ./node_modules/c.js 4:35-47
```
