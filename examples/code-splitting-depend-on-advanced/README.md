This example shows how to use Code Splitting with entrypoint dependOn

# webpack.config.js

```javascript
module.exports = {
	entry: {
		app: { import: "./app.js", dependOn: ["other-vendors"] },
		page1: { import: "./page1.js", dependOn: ["app", "react-vendors"] },
		"react-vendors": ["react", "react-dom", "prop-types"],
		"other-vendors": "./other-vendors"
	},
	optimization: {
		runtimeChunk: "single",
		chunkIds: "named" // To keep filename consistent between different modes (for example building only)
	},
	stats: {
		chunks: true,
		chunkRelations: true
	}
};
```

# app.js

```javascript
import isomorphicFetch from "isomorphic-fetch";
import lodash from "lodash";

console.log(isomorphicFetch, lodash);
```

# page1.js

```javascript
import isomorphicFetch from "isomorphic-fetch";
import react from "react";
import reactDOM from "react-dom";

console.log(isomorphicFetch, react, reactDOM);

import("./lazy");
```

# lazy.js

```javascript
import lodash from "lodash";
import propTypes from "prop-types";

console.log(lodash, propTypes);
```

# other-vendors.js

```javascript
import lodash from "lodash";
import isomorphicFetch from "isomorphic-fetch";

// Additional initializations
console.log(lodash, isomorphicFetch);
```

# dist/runtime.js

```javascript
/******/ (() => { // webpackBootstrap
/******/ 	"use strict";
/******/ 	var __webpack_modules__ = ({});
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
/******/ 	/* webpack/runtime/compat get default export */
/******/ 	(() => {
/******/ 		// getDefaultExport function for compatibility with non-harmony modules
/******/ 		__webpack_require__.n = (module) => {
/******/ 			var getter = module && module.__esModule ?
/******/ 				() => module['default'] :
/******/ 				() => module;
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
/******/ 			return "" + chunkId + ".js";
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
/******/ 			"runtime": 0
/******/ 		};
/******/ 		
/******/ 		var deferredModules = [
/******/ 		
/******/ 		];
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
/******/ 		var checkDeferredModules = () => {
/******/ 		
/******/ 		};
/******/ 		function checkDeferredModulesImpl() {
/******/ 			var result;
/******/ 			for(var i = 0; i < deferredModules.length; i++) {
/******/ 				var deferredModule = deferredModules[i];
/******/ 				var fulfilled = true;
/******/ 				for(var j = 1; j < deferredModule.length; j++) {
/******/ 					var depId = deferredModule[j];
/******/ 					if(installedChunks[depId] !== 0) fulfilled = false;
/******/ 				}
/******/ 				if(fulfilled) {
/******/ 					deferredModules.splice(i--, 1);
/******/ 					result = __webpack_require__(__webpack_require__.s = deferredModule[0]);
/******/ 				}
/******/ 			}
/******/ 			if(deferredModules.length === 0) {
/******/ 				__webpack_require__.x();
/******/ 				__webpack_require__.x = () => {
/******/ 		
/******/ 				}
/******/ 			}
/******/ 			return result;
/******/ 		}
/******/ 		__webpack_require__.x = () => {
/******/ 			// reset startup function so it can be called again when more startup code is added
/******/ 			__webpack_require__.x = () => {
/******/ 		
/******/ 			}
/******/ 			jsonpArray = jsonpArray.slice();
/******/ 			for(var i = 0; i < jsonpArray.length; i++) webpackJsonpCallback(jsonpArray[i]);
/******/ 			return (checkDeferredModules = checkDeferredModulesImpl)();
/******/ 		};
/******/ 		
/******/ 		// install a JSONP callback for chunk loading
/******/ 		function webpackJsonpCallback(data) {
/******/ 			var chunkIds = data[0];
/******/ 			var moreModules = data[1];
/******/ 			var executeModules = data[2];
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
/******/ 			// add entry modules from loaded chunk to deferred list
/******/ 			if(executeModules) deferredModules.push.apply(deferredModules, executeModules);
/******/ 		
/******/ 			// run deferred modules when all chunks ready
/******/ 			return checkDeferredModules();
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
/******/ 	// run startup
/******/ 	return __webpack_require__.x();
/******/ })()
;
```

# dist/app.js

```javascript
(window["webpackJsonp"] = window["webpackJsonp"] || []).push([["app"],{

/***/ 7:
/*!****************!*\
  !*** ./app.js ***!
  \****************/
/*! namespace exports */
/*! exports [not provided] [unused] */
/*! runtime requirements: __webpack_require__, __webpack_require__.n, __webpack_require__.* */
/***/ ((__unused_webpack_module, __unused_webpack___webpack_exports__, __webpack_require__) => {

"use strict";
/* harmony import */ var isomorphic_fetch__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! isomorphic-fetch */ 5);
/* harmony import */ var isomorphic_fetch__WEBPACK_IMPORTED_MODULE_0___default = /*#__PURE__*/__webpack_require__.n(isomorphic_fetch__WEBPACK_IMPORTED_MODULE_0__);
/* harmony import */ var lodash__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! lodash */ 4);
/* harmony import */ var lodash__WEBPACK_IMPORTED_MODULE_1___default = /*#__PURE__*/__webpack_require__.n(lodash__WEBPACK_IMPORTED_MODULE_1__);



console.log((isomorphic_fetch__WEBPACK_IMPORTED_MODULE_0___default()), (lodash__WEBPACK_IMPORTED_MODULE_1___default()));


/***/ })

},[[7,"runtime","other-vendors"]]]);
```

# dist/page1.js

```javascript
(window["webpackJsonp"] = window["webpackJsonp"] || []).push([["page1"],{

/***/ 6:
/*!******************!*\
  !*** ./page1.js ***!
  \******************/
/*! namespace exports */
/*! exports [not provided] [unused] */
/*! runtime requirements: __webpack_require__, __webpack_require__.n, __webpack_require__.e, __webpack_require__.* */
/***/ ((__unused_webpack_module, __unused_webpack___webpack_exports__, __webpack_require__) => {

"use strict";
/* harmony import */ var isomorphic_fetch__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! isomorphic-fetch */ 5);
/* harmony import */ var isomorphic_fetch__WEBPACK_IMPORTED_MODULE_0___default = /*#__PURE__*/__webpack_require__.n(isomorphic_fetch__WEBPACK_IMPORTED_MODULE_0__);
/* harmony import */ var react__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! react */ 0);
/* harmony import */ var react__WEBPACK_IMPORTED_MODULE_1___default = /*#__PURE__*/__webpack_require__.n(react__WEBPACK_IMPORTED_MODULE_1__);
/* harmony import */ var react_dom__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! react-dom */ 1);
/* harmony import */ var react_dom__WEBPACK_IMPORTED_MODULE_2___default = /*#__PURE__*/__webpack_require__.n(react_dom__WEBPACK_IMPORTED_MODULE_2__);




console.log((isomorphic_fetch__WEBPACK_IMPORTED_MODULE_0___default()), (react__WEBPACK_IMPORTED_MODULE_1___default()), (react_dom__WEBPACK_IMPORTED_MODULE_2___default()));

__webpack_require__.e(/*! import() */ "lazy_js").then(__webpack_require__.bind(__webpack_require__, /*! ./lazy */ 8));


/***/ })

},[[6,"app","runtime","react-vendors","other-vendors"]]]);
```

# dist/other-vendors.js

```javascript
(window["webpackJsonp"] = window["webpackJsonp"] || []).push([["other-vendors"],[
/* 0 */,
/* 1 */,
/* 2 */,
/* 3 */
/*!**************************!*\
  !*** ./other-vendors.js ***!
  \**************************/
/*! namespace exports */
/*! exports [not provided] [unused] */
/*! runtime requirements: __webpack_require__, __webpack_require__.n, __webpack_require__.* */
/***/ ((__unused_webpack_module, __unused_webpack___webpack_exports__, __webpack_require__) => {

"use strict";
/* harmony import */ var lodash__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! lodash */ 4);
/* harmony import */ var lodash__WEBPACK_IMPORTED_MODULE_0___default = /*#__PURE__*/__webpack_require__.n(lodash__WEBPACK_IMPORTED_MODULE_0__);
/* harmony import */ var isomorphic_fetch__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! isomorphic-fetch */ 5);
/* harmony import */ var isomorphic_fetch__WEBPACK_IMPORTED_MODULE_1___default = /*#__PURE__*/__webpack_require__.n(isomorphic_fetch__WEBPACK_IMPORTED_MODULE_1__);



// Additional initializations
console.log((lodash__WEBPACK_IMPORTED_MODULE_0___default()), (isomorphic_fetch__WEBPACK_IMPORTED_MODULE_1___default()));


/***/ }),
/* 4 */
/*!********************************!*\
  !*** ./node_modules/lodash.js ***!
  \********************************/
/*! unknown exports (runtime-defined) */
/*! exports [maybe provided (runtime-defined)] [maybe used (runtime-defined)] */
/*! runtime requirements: module */
/***/ ((module) => {

module.exports = 'lodash';


/***/ }),
/* 5 */
/*!******************************************!*\
  !*** ./node_modules/isomorphic-fetch.js ***!
  \******************************************/
/*! unknown exports (runtime-defined) */
/*! exports [maybe provided (runtime-defined)] [maybe used (runtime-defined)] */
/*! runtime requirements: module */
/***/ ((module) => {

module.exports = "isomorphic-fetch";


/***/ })
],[[3,"runtime"]]]);
```

# dist/react-vendors.js

```javascript
(window["webpackJsonp"] = window["webpackJsonp"] || []).push([["react-vendors"],[
/* 0 */
/*!*******************************!*\
  !*** ./node_modules/react.js ***!
  \*******************************/
/*! unknown exports (runtime-defined) */
/*! exports [maybe provided (runtime-defined)] [maybe used (runtime-defined)] */
/*! runtime requirements: module */
/***/ ((module) => {

module.exports = 'react';


/***/ }),
/* 1 */
/*!***********************************!*\
  !*** ./node_modules/react-dom.js ***!
  \***********************************/
/*! unknown exports (runtime-defined) */
/*! exports [maybe provided (runtime-defined)] [maybe used (runtime-defined)] */
/*! runtime requirements: module */
/***/ ((module) => {

module.exports = 'react-dom';


/***/ }),
/* 2 */
/*!************************************!*\
  !*** ./node_modules/prop-types.js ***!
  \************************************/
/*! unknown exports (runtime-defined) */
/*! exports [maybe provided (runtime-defined)] [maybe used (runtime-defined)] */
/*! runtime requirements: module */
/***/ ((module) => {

module.exports = 'prop-types';


/***/ })
],[[0,"runtime"],[1,"runtime"],[2,"runtime"]]]);
```

# Info

## Unoptimized

```
Hash: 0a1b2c3d4e5f6a7b8c9d
Version: webpack 5.0.0-beta.16
           Asset      Size
          app.js  1.09 KiB  [emitted]  [name: app]
      lazy_js.js  1.13 KiB  [emitted]
other-vendors.js  1.87 KiB  [emitted]  [name: other-vendors]
        page1.js  1.56 KiB  [emitted]  [name: page1]
react-vendors.js  1.15 KiB  [emitted]  [name: react-vendors]
      runtime.js  10.4 KiB  [emitted]  [name: runtime]
Entrypoint app = app.js
Entrypoint page1 = page1.js
Entrypoint react-vendors = runtime.js react-vendors.js
Entrypoint other-vendors = runtime.js other-vendors.js
chunk app.js (app) 116 bytes <{other-vendors}> <{runtime}> >{page1}< [initial] [rendered]
    > ./app.js app
 ./app.js 116 bytes [built]
     [no exports]
     [no exports used]
     entry ./app.js app
chunk lazy_js.js 98 bytes <{page1}> [rendered]
    > ./lazy ./page1.js 7:0-16
 ./lazy.js 98 bytes [built]
     [no exports]
     import() ./lazy ./page1.js 7:0-16
chunk other-vendors.js (other-vendors) 210 bytes ={runtime}= >{app}< [initial] [rendered]
    > ./other-vendors other-vendors
 ./node_modules/isomorphic-fetch.js 37 bytes [built]
     harmony side effect evaluation isomorphic-fetch ./app.js 1:0-47
     harmony import specifier isomorphic-fetch ./app.js 4:12-27
     cjs self exports reference ./node_modules/isomorphic-fetch.js 1:0-14
     harmony side effect evaluation isomorphic-fetch ./other-vendors.js 2:0-47
     harmony import specifier isomorphic-fetch ./other-vendors.js 5:20-35
     harmony side effect evaluation isomorphic-fetch ./page1.js 1:0-47
     harmony import specifier isomorphic-fetch ./page1.js 5:12-27
 ./node_modules/lodash.js 27 bytes [built]
     harmony side effect evaluation lodash ./app.js 2:0-28
     harmony import specifier lodash ./app.js 4:29-35
     harmony side effect evaluation lodash ./lazy.js 1:0-28
     harmony import specifier lodash ./lazy.js 4:12-18
     cjs self exports reference ./node_modules/lodash.js 1:0-14
     harmony side effect evaluation lodash ./other-vendors.js 1:0-28
     harmony import specifier lodash ./other-vendors.js 5:12-18
 ./other-vendors.js 146 bytes [built]
     [no exports]
     [no exports used]
     entry ./other-vendors other-vendors
chunk page1.js (page1) 176 bytes <{app}> <{react-vendors}> <{runtime}> >{lazy_js}< [initial] [rendered]
    > ./page1.js page1
 ./page1.js 176 bytes [built]
     [no exports]
     [no exports used]
     entry ./page1.js page1
chunk react-vendors.js (react-vendors) 87 bytes ={runtime}= >{page1}< [initial] [rendered]
    > prop-types react-vendors
    > react react-vendors
    > react-dom react-vendors
 ./node_modules/prop-types.js 31 bytes [built]
     harmony side effect evaluation prop-types ./lazy.js 2:0-35
     harmony import specifier prop-types ./lazy.js 4:20-29
     cjs self exports reference ./node_modules/prop-types.js 1:0-14
     entry prop-types react-vendors
 ./node_modules/react-dom.js 30 bytes [built]
     cjs self exports reference ./node_modules/react-dom.js 1:0-14
     harmony side effect evaluation react-dom ./page1.js 3:0-33
     harmony import specifier react-dom ./page1.js 5:36-44
     entry react-dom react-vendors
 ./node_modules/react.js 26 bytes [built]
     cjs self exports reference ./node_modules/react.js 1:0-14
     harmony side effect evaluation react ./page1.js 2:0-26
     harmony import specifier react ./page1.js 5:29-34
     entry react react-vendors
chunk runtime.js (runtime) 6.18 KiB ={other-vendors}= ={react-vendors}= >{app}< >{page1}< [entry] [rendered]
    > ./other-vendors other-vendors
    > prop-types react-vendors
    > react react-vendors
    > react-dom react-vendors
    8 chunk modules
```

## Production mode

```
Hash: 0a1b2c3d4e5f6a7b8c9d
Version: webpack 5.0.0-beta.16
           Asset       Size
          app.js  186 bytes  [emitted]  [name: app]
      lazy_js.js  163 bytes  [emitted]
other-vendors.js  245 bytes  [emitted]  [name: other-vendors]
        page1.js  266 bytes  [emitted]  [name: page1]
react-vendors.js  210 bytes  [emitted]  [name: react-vendors]
      runtime.js   1.94 KiB  [emitted]  [name: runtime]
Entrypoint app = app.js
Entrypoint page1 = page1.js
Entrypoint react-vendors = runtime.js react-vendors.js
Entrypoint other-vendors = runtime.js other-vendors.js
chunk app.js (app) 116 bytes <{other-vendors}> <{runtime}> >{page1}< [initial] [rendered]
    > ./app.js app
 ./app.js 116 bytes [built]
     [no exports]
     [no exports used]
     entry ./app.js app
chunk lazy_js.js 98 bytes <{page1}> [rendered]
    > ./lazy ./page1.js 7:0-16
 ./lazy.js 98 bytes [built]
     [no exports]
     import() ./lazy ./page1.js 7:0-16
chunk other-vendors.js (other-vendors) 210 bytes ={runtime}= >{app}< [initial] [rendered]
    > ./other-vendors other-vendors
 ./node_modules/isomorphic-fetch.js 37 bytes [built]
     harmony side effect evaluation isomorphic-fetch ./app.js 1:0-47
     harmony import specifier isomorphic-fetch ./app.js 4:12-27
     cjs self exports reference ./node_modules/isomorphic-fetch.js 1:0-14
     harmony side effect evaluation isomorphic-fetch ./other-vendors.js 2:0-47
     harmony import specifier isomorphic-fetch ./other-vendors.js 5:20-35
     harmony side effect evaluation isomorphic-fetch ./page1.js 1:0-47
     harmony import specifier isomorphic-fetch ./page1.js 5:12-27
 ./node_modules/lodash.js 27 bytes [built]
     harmony side effect evaluation lodash ./app.js 2:0-28
     harmony import specifier lodash ./app.js 4:29-35
     harmony side effect evaluation lodash ./lazy.js 1:0-28
     harmony import specifier lodash ./lazy.js 4:12-18
     cjs self exports reference ./node_modules/lodash.js 1:0-14
     harmony side effect evaluation lodash ./other-vendors.js 1:0-28
     harmony import specifier lodash ./other-vendors.js 5:12-18
 ./other-vendors.js 146 bytes [built]
     [no exports]
     [no exports used]
     entry ./other-vendors other-vendors
chunk page1.js (page1) 176 bytes <{app}> <{react-vendors}> <{runtime}> >{lazy_js}< [initial] [rendered]
    > ./page1.js page1
 ./page1.js 176 bytes [built]
     [no exports]
     [no exports used]
     entry ./page1.js page1
chunk react-vendors.js (react-vendors) 87 bytes ={runtime}= >{page1}< [initial] [rendered]
    > prop-types react-vendors
    > react react-vendors
    > react-dom react-vendors
 ./node_modules/prop-types.js 31 bytes [built]
     harmony side effect evaluation prop-types ./lazy.js 2:0-35
     harmony import specifier prop-types ./lazy.js 4:20-29
     cjs self exports reference ./node_modules/prop-types.js 1:0-14
     entry prop-types react-vendors
 ./node_modules/react-dom.js 30 bytes [built]
     cjs self exports reference ./node_modules/react-dom.js 1:0-14
     harmony side effect evaluation react-dom ./page1.js 3:0-33
     harmony import specifier react-dom ./page1.js 5:36-44
     entry react-dom react-vendors
 ./node_modules/react.js 26 bytes [built]
     cjs self exports reference ./node_modules/react.js 1:0-14
     harmony side effect evaluation react ./page1.js 2:0-26
     harmony import specifier react ./page1.js 5:29-34
     entry react react-vendors
chunk runtime.js (runtime) 6.18 KiB ={other-vendors}= ={react-vendors}= >{app}< >{page1}< [entry] [rendered]
    > ./other-vendors other-vendors
    > prop-types react-vendors
    > react react-vendors
    > react-dom react-vendors
    8 chunk modules
```
