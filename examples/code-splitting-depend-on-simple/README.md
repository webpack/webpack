This example shows how to use Code Splitting with entrypoint dependOn

# webpack.config.js

```javascript
module.exports = {
	entry: {
		app: { import: "./app.js", dependOn: ["react-vendors"] },
		"react-vendors": ["react", "react-dom", "prop-types"]
	},
	optimization: {
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
import react from "react";
import reactDOM from "react-dom";
import propTypes from "prop-types";

console.log(react, reactDOM, propTypes);
```

# dist/app.js

```javascript
"use strict";
(self["webpackChunk"] = self["webpackChunk"] || []).push([["app"],{

/***/ 3:
/*!****************!*\
  !*** ./app.js ***!
  \****************/
/*! namespace exports */
/*! exports [not provided] [no usage info] */
/*! runtime requirements: __webpack_require__, __webpack_require__.n, __webpack_require__.r, __webpack_exports__, __webpack_require__.* */
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

__webpack_require__.r(__webpack_exports__);
/* harmony import */ var react__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! react */ 0);
/* harmony import */ var react__WEBPACK_IMPORTED_MODULE_0___default = /*#__PURE__*/__webpack_require__.n(react__WEBPACK_IMPORTED_MODULE_0__);
/* harmony import */ var react_dom__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! react-dom */ 1);
/* harmony import */ var react_dom__WEBPACK_IMPORTED_MODULE_1___default = /*#__PURE__*/__webpack_require__.n(react_dom__WEBPACK_IMPORTED_MODULE_1__);
/* harmony import */ var prop_types__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! prop-types */ 2);
/* harmony import */ var prop_types__WEBPACK_IMPORTED_MODULE_2___default = /*#__PURE__*/__webpack_require__.n(prop_types__WEBPACK_IMPORTED_MODULE_2__);




console.log((react__WEBPACK_IMPORTED_MODULE_0___default()), (react_dom__WEBPACK_IMPORTED_MODULE_1___default()), (prop_types__WEBPACK_IMPORTED_MODULE_2___default()));


/***/ })

},
/******/ __webpack_require__ => { // webpackRuntimeModules
/******/ var __webpack_exec__ = (moduleId) => (__webpack_require__(__webpack_require__.s = moduleId))
/******/ var __webpack_exports__ = (__webpack_exec__(3));
/******/ }
]);
```

# dist/react-vendors.js

```javascript
/******/ (() => { // webpackBootstrap
/******/ 	var __webpack_modules__ = ([
/* 0 */
/*!*******************************!*\
  !*** ./node_modules/react.js ***!
  \*******************************/
/*! unknown exports (runtime-defined) */
/*! runtime requirements: module */
/*! CommonJS bailout: module.exports is used directly at 1:0-14 */
/***/ ((module) => {

module.exports = 'react';


/***/ }),
/* 1 */
/*!***********************************!*\
  !*** ./node_modules/react-dom.js ***!
  \***********************************/
/*! unknown exports (runtime-defined) */
/*! runtime requirements: module */
/*! CommonJS bailout: module.exports is used directly at 1:0-14 */
/***/ ((module) => {

module.exports = 'react-dom';


/***/ }),
/* 2 */
/*!************************************!*\
  !*** ./node_modules/prop-types.js ***!
  \************************************/
/*! unknown exports (runtime-defined) */
/*! runtime requirements: module */
/*! CommonJS bailout: module.exports is used directly at 1:0-14 */
/***/ ((module) => {

module.exports = 'prop-types';


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
/******/ 	/* webpack/runtime/chunk loaded */
/******/ 	(() => {
/******/ 		var deferred = [];
/******/ 		__webpack_require__.O = (result, chunkIds, fn, priority) => {
/******/ 			if(chunkIds) {
/******/ 				priority = priority || 0;
/******/ 				for(var i = deferred.length; i > 0 && deferred[i - 1][2] > priority; i--) deferred[i] = deferred[i - 1];
/******/ 				deferred[i] = [chunkIds, fn, priority];
/******/ 				return;
/******/ 			}
/******/ 			var notFulfilled = Infinity;
/******/ 			for (var i = 0; i < deferred.length; i++) {
/******/ 				var [chunkIds, fn, priority] = deferred[i];
/******/ 				var fulfilled = true;
/******/ 				for (var j = 0; j < chunkIds.length; j++) {
/******/ 					if ((priority & 1 === 0 || notFulfilled >= priority) && Object.keys(__webpack_require__.O).every((key) => (__webpack_require__.O[key](chunkIds[j])))) {
/******/ 						chunkIds.splice(j--, 1);
/******/ 					} else {
/******/ 						fulfilled = false;
/******/ 						if(priority < notFulfilled) notFulfilled = priority;
/******/ 					}
/******/ 				}
/******/ 				if(fulfilled) {
/******/ 					deferred.splice(i--, 1)
/******/ 					var r = fn();
/******/ 					if (r !== undefined) result = r;
/******/ 				}
/******/ 			}
/******/ 			return result;
/******/ 		};
/******/ 	})();
/******/ 	
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
/******/ 	/* webpack/runtime/hasOwnProperty shorthand */
/******/ 	(() => {
/******/ 		__webpack_require__.o = (obj, prop) => (Object.prototype.hasOwnProperty.call(obj, prop))
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
/******/ 	/* webpack/runtime/jsonp chunk loading */
/******/ 	(() => {
/******/ 		// no baseURI
/******/ 		
/******/ 		// object to store loaded and loading chunks
/******/ 		// undefined = chunk not loaded, null = chunk preloaded/prefetched
/******/ 		// [resolve, reject, Promise] = chunk loading, 0 = chunk loaded
/******/ 		var installedChunks = {
/******/ 			"react-vendors": 0
/******/ 		};
/******/ 		
/******/ 		// no chunk on demand loading
/******/ 		
/******/ 		// no prefetching
/******/ 		
/******/ 		// no preloaded
/******/ 		
/******/ 		// no HMR
/******/ 		
/******/ 		// no HMR manifest
/******/ 		
/******/ 		__webpack_require__.O.j = (chunkId) => (installedChunks[chunkId] === 0);
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
/******/ 			return __webpack_require__.O(result);
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
/******/ 	
/******/ 	// startup
/******/ 	// Load entry module and return exports
/******/ 	// This entry module is referenced by other modules so it can't be inlined
/******/ 	__webpack_require__(0);
/******/ 	__webpack_require__(1);
/******/ 	var __webpack_exports__ = __webpack_require__(2);
/******/ 	__webpack_exports__ = __webpack_require__.O(__webpack_exports__);
/******/ 	
/******/ })()
;
```

# Info

## Unoptimized

```
asset react-vendors.js 7.62 KiB [emitted] (name: react-vendors)
asset app.js 1.63 KiB [emitted] (name: app)
chunk (runtime: react-vendors) app.js (app) 139 bytes <{react-vendors}> [initial] [rendered]
  > ./app.js app
  ./app.js 139 bytes [built] [code generated]
    [no exports]
    [used exports unknown]
    entry ./app.js app
chunk (runtime: react-vendors) react-vendors.js (react-vendors) 87 bytes (javascript) 3.3 KiB (runtime) >{app}< [entry] [rendered]
  > prop-types react-vendors
  > react react-vendors
  > react-dom react-vendors
  runtime modules 3.3 KiB 6 modules
  cacheable modules 87 bytes
    ./node_modules/prop-types.js 31 bytes [built] [code generated]
      [used exports unknown]
      from origin ./app.js
        harmony side effect evaluation prop-types ./app.js 3:0-35
        harmony import specifier prop-types ./app.js 5:29-38
      cjs self exports reference ./node_modules/prop-types.js 1:0-14
      entry prop-types react-vendors
    ./node_modules/react-dom.js 30 bytes [built] [code generated]
      [used exports unknown]
      from origin ./app.js
        harmony side effect evaluation react-dom ./app.js 2:0-33
        harmony import specifier react-dom ./app.js 5:19-27
      cjs self exports reference ./node_modules/react-dom.js 1:0-14
      entry react-dom react-vendors
    ./node_modules/react.js 26 bytes [built] [code generated]
      [used exports unknown]
      from origin ./app.js
        harmony side effect evaluation react ./app.js 1:0-26
        harmony import specifier react ./app.js 5:12-17
      cjs self exports reference ./node_modules/react.js 1:0-14
      entry react react-vendors
webpack 5.51.1 compiled successfully
```

## Production mode

```
asset react-vendors.js 1.15 KiB [emitted] [minimized] (name: react-vendors)
asset app.js 185 bytes [emitted] [minimized] (name: app)
chunk (runtime: react-vendors) app.js (app) 139 bytes <{react-vendors}> [initial] [rendered]
  > ./app.js app
  ./app.js 139 bytes [built] [code generated]
    [no exports]
    [no exports used]
    entry ./app.js app
chunk (runtime: react-vendors) react-vendors.js (react-vendors) 87 bytes (javascript) 3.03 KiB (runtime) >{app}< [entry] [rendered]
  > prop-types react-vendors
  > react react-vendors
  > react-dom react-vendors
  runtime modules 3.03 KiB 5 modules
  cacheable modules 87 bytes
    ./node_modules/prop-types.js 31 bytes [built] [code generated]
      [used exports unknown]
      from origin ./app.js
        harmony side effect evaluation prop-types ./app.js 3:0-35
        harmony import specifier prop-types ./app.js 5:29-38
      cjs self exports reference ./node_modules/prop-types.js 1:0-14
      entry prop-types react-vendors
    ./node_modules/react-dom.js 30 bytes [built] [code generated]
      [used exports unknown]
      from origin ./app.js
        harmony side effect evaluation react-dom ./app.js 2:0-33
        harmony import specifier react-dom ./app.js 5:19-27
      cjs self exports reference ./node_modules/react-dom.js 1:0-14
      entry react-dom react-vendors
    ./node_modules/react.js 26 bytes [built] [code generated]
      [used exports unknown]
      from origin ./app.js
        harmony side effect evaluation react ./app.js 1:0-26
        harmony import specifier react ./app.js 5:12-17
      cjs self exports reference ./node_modules/react.js 1:0-14
      entry react react-vendors
webpack 5.51.1 compiled successfully
```
