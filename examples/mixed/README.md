This example shows how you can mix different module styles in webpack. Here CommonJS, AMD and Harmony Modules (ES6 Modules) are used. In addition to that there are different types of dynamic requires (`"../require.context/templates/"+amd1+".js"` and `Math.random() < 0.5 ? "./commonjs" : "./amd"`).

You see that everything is working nicely together.

# example.js

```javascript
// CommonJs-style requires
var commonjs1 = require("./commonjs");
var amd1 = require("./amd");
var harmony1 = require("./harmony");

// AMD-style requires (with all webpack features)
require([
	"./commonjs", "./amd",
	"../require.context/templates/"+amd1+".js",
	Math.random() < 0.5 ? "./commonjs" : "./amd"],
	function(commonjs2, amd2, template, randModule) {
		// Do something with it...
	}
);
```

# amd.js

```javascript
// AMD Module Format
define(
	"app/amd", // anonym is also supported
	["./commonjs", "./harmony"],
	function(commonjs1, harmony1) {
		// but you can use CommonJs-style requires:
		var commonjs2 = require("./commonjs");
		var harmony2 = require("./harmony");
		// Do something...
		return 456;
	}
);
```

# commonjs.js

```javascript
// CommonJs Module Format
module.exports = 123;

// but you can use amd style requires
require(
	["./amd", "./harmony"],
	function(amd1, harmony) {
		var amd2 = require("./amd");
		var harmony2 = require("./harmony");
	}
);
```

# dist/output.js

```javascript
/******/ (() => { // webpackBootstrap
/******/ 	var __webpack_modules__ = ([
/* 0 */,
/* 1 */
/*!*********************!*\
  !*** ./commonjs.js ***!
  \*********************/
/*! unknown exports (runtime-defined) */
/*! runtime requirements: module, __webpack_require__, __webpack_require__.oe, __webpack_require__.* */
/*! CommonJS bailout: module.exports is used directly at 2:0-14 */
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

// CommonJs Module Format
module.exports = 123;

// but you can use amd style requires
Promise.resolve(/*! AMD require */).then(function() { var __WEBPACK_AMD_REQUIRE_ARRAY__ = [__webpack_require__(/*! ./amd */ 2), __webpack_require__(/*! ./harmony */ 3)]; (function(amd1, harmony) {
		var amd2 = __webpack_require__(/*! ./amd */ 2);
		var harmony2 = __webpack_require__(/*! ./harmony */ 3);
	}).apply(null, __WEBPACK_AMD_REQUIRE_ARRAY__);}).catch(__webpack_require__.oe);

/***/ }),
/* 2 */
/*!****************!*\
  !*** ./amd.js ***!
  \****************/
/*! unknown exports (runtime-defined) */
/*! runtime requirements: __webpack_require__, __webpack_exports__, module */
/***/ ((module, exports, __webpack_require__) => {

var __WEBPACK_AMD_DEFINE_ARRAY__, __WEBPACK_AMD_DEFINE_RESULT__;// AMD Module Format
!(__WEBPACK_AMD_DEFINE_ARRAY__ = [__webpack_require__(/*! ./commonjs */ 1), __webpack_require__(/*! ./harmony */ 3)], __WEBPACK_AMD_DEFINE_RESULT__ = (function(commonjs1, harmony1) {
		// but you can use CommonJs-style requires:
		var commonjs2 = __webpack_require__(/*! ./commonjs */ 1);
		var harmony2 = __webpack_require__(/*! ./harmony */ 3);
		// Do something...
		return 456;
	}).apply(exports, __WEBPACK_AMD_DEFINE_ARRAY__),
		__WEBPACK_AMD_DEFINE_RESULT__ !== undefined && (module.exports = __WEBPACK_AMD_DEFINE_RESULT__));

/***/ }),
/* 3 */
/*!********************!*\
  !*** ./harmony.js ***!
  \********************/
/*! namespace exports */
/*! export default [provided] [no usage info] [missing usage info prevents renaming] */
/*! other exports [not provided] [no usage info] */
/*! runtime requirements: __webpack_require__, __webpack_require__.n, __webpack_exports__, __webpack_require__.r, __webpack_require__.d, __webpack_require__.* */
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "default": () => (__WEBPACK_DEFAULT_EXPORT__)
/* harmony export */ });
/* harmony import */ var _commonjs__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ./commonjs */ 1);
/* harmony import */ var _commonjs__WEBPACK_IMPORTED_MODULE_0___default = /*#__PURE__*/__webpack_require__.n(_commonjs__WEBPACK_IMPORTED_MODULE_0__);
/* harmony import */ var _amd__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ./amd */ 2);
/* harmony import */ var _amd__WEBPACK_IMPORTED_MODULE_1___default = /*#__PURE__*/__webpack_require__.n(_amd__WEBPACK_IMPORTED_MODULE_1__);
// ES6 Modules



/* harmony default export */ const __WEBPACK_DEFAULT_EXPORT__ = (456);


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
/******/ 		var cachedModule = __webpack_module_cache__[moduleId];
/******/ 		if (cachedModule !== undefined) {
/******/ 			return cachedModule.exports;
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
/******/ 	/* webpack/runtime/compat get default export */
/******/ 	(() => {
/******/ 		// getDefaultExport function for compatibility with non-harmony modules
/******/ 		__webpack_require__.n = (module) => {
/******/ 			var getter = module && module.__esModule ?
/******/ 				() => (module['default']) :
/******/ 				() => (module);
/******/ 			__webpack_require__.d(getter, { a: getter });
/******/ 			return getter;
/******/ 		};
/******/ 	})();
/******/ 	
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
/******/ 		__webpack_require__.o = (obj, prop) => (Object.prototype.hasOwnProperty.call(obj, prop))
/******/ 	})();
/******/ 	
/******/ 	/* webpack/runtime/load script */
/******/ 	(() => {
/******/ 		var inProgress = {};
/******/ 		// data-webpack is not used as build has no uniqueName
/******/ 		// loadScript function to load a script via script tag
/******/ 		__webpack_require__.l = (url, done, key, chunkId) => {
/******/ 			if(inProgress[url]) { inProgress[url].push(done); return; }
/******/ 			var script, needAttach;
/******/ 			if(key !== undefined) {
/******/ 				var scripts = document.getElementsByTagName("script");
/******/ 				for(var i = 0; i < scripts.length; i++) {
/******/ 					var s = scripts[i];
/******/ 					if(s.getAttribute("src") == url) { script = s; break; }
/******/ 				}
/******/ 			}
/******/ 			if(!script) {
/******/ 				needAttach = true;
/******/ 				script = document.createElement('script');
/******/ 		
/******/ 				script.charset = 'utf-8';
/******/ 				script.timeout = 120;
/******/ 				if (__webpack_require__.nc) {
/******/ 					script.setAttribute("nonce", __webpack_require__.nc);
/******/ 				}
/******/ 		
/******/ 				script.src = url;
/******/ 			}
/******/ 			inProgress[url] = [done];
/******/ 			var onScriptComplete = (prev, event) => {
/******/ 				// avoid mem leaks in IE.
/******/ 				script.onerror = script.onload = null;
/******/ 				clearTimeout(timeout);
/******/ 				var doneFns = inProgress[url];
/******/ 				delete inProgress[url];
/******/ 				script.parentNode && script.parentNode.removeChild(script);
/******/ 				doneFns && doneFns.forEach((fn) => (fn(event)));
/******/ 				if(prev) return prev(event);
/******/ 			}
/******/ 			;
/******/ 			var timeout = setTimeout(onScriptComplete.bind(null, undefined, { type: 'timeout', target: script }), 120000);
/******/ 			script.onerror = onScriptComplete.bind(null, script.onerror);
/******/ 			script.onload = onScriptComplete.bind(null, script.onload);
/******/ 			needAttach && document.head.appendChild(script);
/******/ 		};
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
/******/ 		// no baseURI
/******/ 		
/******/ 		// object to store loaded and loading chunks
/******/ 		// undefined = chunk not loaded, null = chunk preloaded/prefetched
/******/ 		// [resolve, reject, Promise] = chunk loading, 0 = chunk loaded
/******/ 		var installedChunks = {
/******/ 			179: 0
/******/ 		};
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
/******/ 							var promise = new Promise((resolve, reject) => (installedChunkData = installedChunks[chunkId] = [resolve, reject]));
/******/ 							promises.push(installedChunkData[2] = promise);
/******/ 		
/******/ 							// start chunk loading
/******/ 							var url = __webpack_require__.p + __webpack_require__.u(chunkId);
/******/ 							// create error before stack unwound to get useful stacktrace later
/******/ 							var error = new Error();
/******/ 							var loadingEnded = (event) => {
/******/ 								if(__webpack_require__.o(installedChunks, chunkId)) {
/******/ 									installedChunkData = installedChunks[chunkId];
/******/ 									if(installedChunkData !== 0) installedChunks[chunkId] = undefined;
/******/ 									if(installedChunkData) {
/******/ 										var errorType = event && (event.type === 'load' ? 'missing' : event.type);
/******/ 										var realSrc = event && event.target && event.target.src;
/******/ 										error.message = 'Loading chunk ' + chunkId + ' failed.\n(' + errorType + ': ' + realSrc + ')';
/******/ 										error.name = 'ChunkLoadError';
/******/ 										error.type = errorType;
/******/ 										error.request = realSrc;
/******/ 										installedChunkData[1](error);
/******/ 									}
/******/ 								}
/******/ 							};
/******/ 							__webpack_require__.l(url, loadingEnded, "chunk-" + chunkId, chunkId);
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
/******/ 		// no on chunks loaded
/******/ 		
/******/ 		// install a JSONP callback for chunk loading
/******/ 		var webpackJsonpCallback = (parentChunkLoadingFunction, data) => {
/******/ 			var [chunkIds, moreModules, runtime] = data;
/******/ 			// add "moreModules" to the modules object,
/******/ 			// then flag all "chunkIds" as loaded and fire callback
/******/ 			var moduleId, chunkId, i = 0;
/******/ 			if(chunkIds.some((id) => (installedChunks[id] !== 0))) {
/******/ 				for(moduleId in moreModules) {
/******/ 					if(__webpack_require__.o(moreModules, moduleId)) {
/******/ 						__webpack_require__.m[moduleId] = moreModules[moduleId];
/******/ 					}
/******/ 				}
/******/ 				if(runtime) var result = runtime(__webpack_require__);
/******/ 			}
/******/ 			if(parentChunkLoadingFunction) parentChunkLoadingFunction(data);
/******/ 			for(;i < chunkIds.length; i++) {
/******/ 				chunkId = chunkIds[i];
/******/ 				if(__webpack_require__.o(installedChunks, chunkId) && installedChunks[chunkId]) {
/******/ 					installedChunks[chunkId][0]();
/******/ 				}
/******/ 				installedChunks[chunkIds[i]] = 0;
/******/ 			}
/******/ 		
/******/ 		}
/******/ 		
/******/ 		var chunkLoadingGlobal = self["webpackChunk"] = self["webpackChunk"] || [];
/******/ 		chunkLoadingGlobal.forEach(webpackJsonpCallback.bind(null, 0));
/******/ 		chunkLoadingGlobal.push = webpackJsonpCallback.bind(null, chunkLoadingGlobal.push.bind(chunkLoadingGlobal));
/******/ 	})();
/******/ 	
/************************************************************************/
```

</details>

``` js
var __webpack_exports__ = {};
// This entry need to be wrapped in an IIFE because it need to be isolated against other modules in the chunk.
(() => {
/*!********************!*\
  !*** ./example.js ***!
  \********************/
/*! unknown exports (runtime-defined) */
/*! runtime requirements: __webpack_require__, __webpack_require__.e, __webpack_require__.oe, __webpack_require__.* */
// CommonJs-style requires
var commonjs1 = __webpack_require__(/*! ./commonjs */ 1);
var amd1 = __webpack_require__(/*! ./amd */ 2);
var harmony1 = __webpack_require__(/*! ./harmony */ 3);

// AMD-style requires (with all webpack features)
__webpack_require__.e(/*! AMD require */ 635).then(function() { var __WEBPACK_AMD_REQUIRE_ARRAY__ = [
	__webpack_require__(/*! ./commonjs */ 1), __webpack_require__(/*! ./amd */ 2),
	__webpack_require__(4)("./"+amd1+".js"),
	Math.random() < 0.5 ? __webpack_require__(/*! ./commonjs */ 1) : __webpack_require__(/*! ./amd */ 2)]; (function(commonjs2, amd2, template, randModule) {
		// Do something with it...
	}).apply(null, __WEBPACK_AMD_REQUIRE_ARRAY__);}).catch(__webpack_require__.oe);

})();

/******/ })()
;
```

# dist/635.output.js

```javascript
(self["webpackChunk"] = self["webpackChunk"] || []).push([[635],[
/* 0 */,
/* 1 */,
/* 2 */,
/* 3 */,
/* 4 */
/*!*******************************************************!*\
  !*** ../require.context/templates/ sync ^\.\/.*\.js$ ***!
  \*******************************************************/
/*! default exports */
/*! exports [not provided] [no usage info] */
/*! runtime requirements: module, __webpack_require__.o, __webpack_require__ */
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

var map = {
	"./a.js": 5,
	"./b.js": 6,
	"./c.js": 7
};


function webpackContext(req) {
	var id = webpackContextResolve(req);
	return __webpack_require__(id);
}
function webpackContextResolve(req) {
	if(!__webpack_require__.o(map, req)) {
		var e = new Error("Cannot find module '" + req + "'");
		e.code = 'MODULE_NOT_FOUND';
		throw e;
	}
	return map[req];
}
webpackContext.keys = function webpackContextKeys() {
	return Object.keys(map);
};
webpackContext.resolve = webpackContextResolve;
module.exports = webpackContext;
webpackContext.id = 4;

/***/ }),
/* 5 */
/*!*****************************************!*\
  !*** ../require.context/templates/a.js ***!
  \*****************************************/
/*! unknown exports (runtime-defined) */
/*! runtime requirements: module */
/*! CommonJS bailout: module.exports is used directly at 1:0-14 */
/***/ ((module) => {

module.exports = function() {
	return "This text was generated by template A";
}

/***/ }),
/* 6 */
/*!*****************************************!*\
  !*** ../require.context/templates/b.js ***!
  \*****************************************/
/*! unknown exports (runtime-defined) */
/*! runtime requirements: module */
/*! CommonJS bailout: module.exports is used directly at 1:0-14 */
/***/ ((module) => {

module.exports = function() {
	return "This text was generated by template B";
}

/***/ }),
/* 7 */
/*!*****************************************!*\
  !*** ../require.context/templates/c.js ***!
  \*****************************************/
/*! unknown exports (runtime-defined) */
/*! runtime requirements: module */
/*! CommonJS bailout: module.exports is used directly at 1:0-14 */
/***/ ((module) => {

module.exports = function() {
	return "This text was generated by template C";
}

/***/ })
]]);
```

# Info

## Unoptimized

```
asset output.js 13.8 KiB [emitted] (name: main)
asset 635.output.js 2.24 KiB [emitted]
chunk (runtime: main) output.js (main) 1010 bytes (javascript) 5.81 KiB (runtime) [entry] [rendered]
  > ./example.js main
  runtime modules 5.81 KiB 9 modules
  dependent modules 617 bytes [dependent] 3 modules
  ./example.js 396 bytes [built] [code generated]
    [used exports unknown]
    entry ./example.js main
chunk (runtime: main) 635.output.js 433 bytes [rendered]
  > ./example.js 7:0-14:1
  dependent modules 240 bytes [dependent] 3 modules
  ../require.context/templates/ sync ^\.\/.*\.js$ 193 bytes [built] [code generated]
    [no exports]
    [used exports unknown]
    amd require context ./example.js 7:0-14:1
webpack 5.51.1 compiled successfully
```

## Production mode

```
asset output.js 2.5 KiB [emitted] [minimized] (name: main)
asset 635.output.js 580 bytes [emitted] [minimized]
chunk (runtime: main) output.js (main) 1010 bytes (javascript) 5.81 KiB (runtime) [entry] [rendered]
  > ./example.js main
  runtime modules 5.81 KiB 9 modules
  dependent modules 617 bytes [dependent] 3 modules
  ./example.js 396 bytes [built] [code generated]
    [no exports used]
    entry ./example.js main
chunk (runtime: main) 635.output.js 433 bytes [rendered]
  > ./example.js 7:0-14:1
  dependent modules 240 bytes [dependent] 3 modules
  ../require.context/templates/ sync ^\.\/.*\.js$ 193 bytes [built] [code generated]
    [no exports]
    amd require context ./example.js 7:0-14:1
webpack 5.51.1 compiled successfully
```
