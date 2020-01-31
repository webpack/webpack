This example shows how to use Code Splitting with entrypoint dependOn

# webpack.config.js

```javascript
module.exports = {
	entry: {
		app: { import: "./app.js", dependOn: ["other-vendors"] },
		page1: { import: "./page1.js", dependOn: ["app", "react-vendors"] },
		"react-vendors": ["react", "react-dom", "prop-types"],
		"other-vendors": ["lodash", "isomorphic-fetch"]
	},
	optimization: {
		runtimeChunk: "single",
		chunkIds: "deterministic" // To keep filename consistent between different modes (for example building only)
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
import lodash from "lodash";
import react from "react";
import reactDOM from "react-dom";
import propTypes from "prop-types";

console.log(isomorphicFetch, lodash, react, reactDOM, propTypes);
```

# other-vendors.js

```javascript
export { default as lodash } from "lodash";
export { default as isomorphicFetch } from "isomorphic-fetch";
```

# react-vendors.js

```javascript
export { default as react } from "react";
export { default as reactDOM } from "react-dom";
export { default as propTypes } from "prop-types";
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
/******/ 	/* webpack/runtime/hasOwnProperty shorthand */
/******/ 	(() => {
/******/ 		__webpack_require__.o = (obj, prop) => Object.prototype.hasOwnProperty.call(obj, prop)
/******/ 	})();
/******/ 	
/******/ 	/* webpack/runtime/jsonp chunk loading */
/******/ 	(() => {
/******/ 		// object to store loaded and loading chunks
/******/ 		// undefined = chunk not loaded, null = chunk preloaded/prefetched
/******/ 		// Promise = chunk loading, 0 = chunk loaded
/******/ 		var installedChunks = {
/******/ 			666: 0
/******/ 		};
/******/ 		
/******/ 		var deferredModules = [
/******/ 		
/******/ 		];
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
(window["webpackJsonp"] = window["webpackJsonp"] || []).push([[143],[
/* 0 */
/*!****************!*\
  !*** ./app.js ***!
  \****************/
/*! namespace exports */
/*! exports [not provided] [unused] */
/*! runtime requirements: __webpack_require__, __webpack_require__.n, __webpack_require__.* */
/***/ ((__unused_webpack_module, __unused_webpack___webpack_exports__, __webpack_require__) => {

"use strict";
/* harmony import */ var isomorphic_fetch__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! isomorphic-fetch */ 1);
/* harmony import */ var isomorphic_fetch__WEBPACK_IMPORTED_MODULE_0___default = /*#__PURE__*/__webpack_require__.n(isomorphic_fetch__WEBPACK_IMPORTED_MODULE_0__);
/* harmony import */ var lodash__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! lodash */ 2);
/* harmony import */ var lodash__WEBPACK_IMPORTED_MODULE_1___default = /*#__PURE__*/__webpack_require__.n(lodash__WEBPACK_IMPORTED_MODULE_1__);



console.log((isomorphic_fetch__WEBPACK_IMPORTED_MODULE_0___default()), (lodash__WEBPACK_IMPORTED_MODULE_1___default()));


/***/ })
],[[0,666,205]]]);
```

# dist/page1.js

```javascript
(window["webpackJsonp"] = window["webpackJsonp"] || []).push([[484],{

/***/ 3:
/*!******************!*\
  !*** ./page1.js ***!
  \******************/
/*! namespace exports */
/*! exports [not provided] [unused] */
/*! runtime requirements: __webpack_require__, __webpack_require__.n, __webpack_require__.* */
/***/ ((__unused_webpack_module, __unused_webpack___webpack_exports__, __webpack_require__) => {

"use strict";
/* harmony import */ var isomorphic_fetch__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! isomorphic-fetch */ 1);
/* harmony import */ var isomorphic_fetch__WEBPACK_IMPORTED_MODULE_0___default = /*#__PURE__*/__webpack_require__.n(isomorphic_fetch__WEBPACK_IMPORTED_MODULE_0__);
/* harmony import */ var lodash__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! lodash */ 2);
/* harmony import */ var lodash__WEBPACK_IMPORTED_MODULE_1___default = /*#__PURE__*/__webpack_require__.n(lodash__WEBPACK_IMPORTED_MODULE_1__);
/* harmony import */ var react__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! react */ 4);
/* harmony import */ var react__WEBPACK_IMPORTED_MODULE_2___default = /*#__PURE__*/__webpack_require__.n(react__WEBPACK_IMPORTED_MODULE_2__);
/* harmony import */ var react_dom__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(/*! react-dom */ 5);
/* harmony import */ var react_dom__WEBPACK_IMPORTED_MODULE_3___default = /*#__PURE__*/__webpack_require__.n(react_dom__WEBPACK_IMPORTED_MODULE_3__);
/* harmony import */ var prop_types__WEBPACK_IMPORTED_MODULE_4__ = __webpack_require__(/*! prop-types */ 6);
/* harmony import */ var prop_types__WEBPACK_IMPORTED_MODULE_4___default = /*#__PURE__*/__webpack_require__.n(prop_types__WEBPACK_IMPORTED_MODULE_4__);






console.log((isomorphic_fetch__WEBPACK_IMPORTED_MODULE_0___default()), (lodash__WEBPACK_IMPORTED_MODULE_1___default()), (react__WEBPACK_IMPORTED_MODULE_2___default()), (react_dom__WEBPACK_IMPORTED_MODULE_3___default()), (prop_types__WEBPACK_IMPORTED_MODULE_4___default()));


/***/ })

},[[3,666,205,703]]]);
```

# dist/other-vendors.js

```javascript
(window["webpackJsonp"] = window["webpackJsonp"] || []).push([[205],[
/* 0 */,
/* 1 */
/*!******************************************!*\
  !*** ./node_modules/isomorphic-fetch.js ***!
  \******************************************/
/*! unknown exports (runtime-defined) */
/*! export default [maybe provided (runtime-defined)] [used] [usage and provision prevents renaming] */
/*! other exports [maybe provided (runtime-defined)] [maybe used (runtime-defined)] */
/*! runtime requirements: module */
/***/ ((module) => {

module.exports = "isomorphic-fetch";


/***/ }),
/* 2 */
/*!********************************!*\
  !*** ./node_modules/lodash.js ***!
  \********************************/
/*! unknown exports (runtime-defined) */
/*! export default [maybe provided (runtime-defined)] [used] [usage and provision prevents renaming] */
/*! other exports [maybe provided (runtime-defined)] [maybe used (runtime-defined)] */
/*! runtime requirements: module */
/***/ ((module) => {

module.exports = 'lodash';


/***/ })
],[[2,666],[1,666]]]);
```

# dist/react-vendors.js

```javascript
(window["webpackJsonp"] = window["webpackJsonp"] || []).push([[703],[
/* 0 */,
/* 1 */,
/* 2 */,
/* 3 */,
/* 4 */
/*!*******************************!*\
  !*** ./node_modules/react.js ***!
  \*******************************/
/*! unknown exports (runtime-defined) */
/*! export default [maybe provided (runtime-defined)] [used] [usage and provision prevents renaming] */
/*! other exports [maybe provided (runtime-defined)] [maybe used (runtime-defined)] */
/*! runtime requirements: module */
/***/ ((module) => {

module.exports = 'react';


/***/ }),
/* 5 */
/*!***********************************!*\
  !*** ./node_modules/react-dom.js ***!
  \***********************************/
/*! unknown exports (runtime-defined) */
/*! export default [maybe provided (runtime-defined)] [used] [usage and provision prevents renaming] */
/*! other exports [maybe provided (runtime-defined)] [maybe used (runtime-defined)] */
/*! runtime requirements: module */
/***/ ((module) => {

module.exports = 'react-dom';


/***/ }),
/* 6 */
/*!************************************!*\
  !*** ./node_modules/prop-types.js ***!
  \************************************/
/*! unknown exports (runtime-defined) */
/*! export default [maybe provided (runtime-defined)] [used] [usage and provision prevents renaming] */
/*! other exports [maybe provided (runtime-defined)] [maybe used (runtime-defined)] */
/*! runtime requirements: module */
/***/ ((module) => {

module.exports = 'react';


/***/ })
],[[4,666],[5,666],[6,666]]]);
```

# Info

## Unoptimized

```
Hash: 0a1b2c3d4e5f6a7b8c9d
Version: webpack 5.0.0-beta.13
           Asset      Size
          app.js  1.07 KiB  [emitted]  [name: app]
other-vendors.js  1.02 KiB  [emitted]  [name: other-vendors]
        page1.js  1.98 KiB  [emitted]  [name: page1]
react-vendors.js  1.47 KiB  [emitted]  [name: react-vendors]
      runtime.js  6.07 KiB  [emitted]  [name: runtime]
Entrypoint app = runtime.js app.js other-vendors.js
Entrypoint page1 = runtime.js page1.js other-vendors.js react-vendors.js
Entrypoint react-vendors = runtime.js react-vendors.js
Entrypoint other-vendors = runtime.js other-vendors.js
chunk app.js (app) 116 bytes [initial] [rendered]
    > ./app.js app
 ./app.js 116 bytes [built]
     [no exports]
     [no exports used]
     entry ./app.js app
chunk other-vendors.js (other-vendors) 64 bytes [initial] [rendered]
    > ./app.js app
    > isomorphic-fetch other-vendors
    > lodash other-vendors
    > ./page1.js page1
 ./node_modules/isomorphic-fetch.js 37 bytes [built]
     harmony side effect evaluation isomorphic-fetch ./app.js 1:0-47
     harmony import specifier isomorphic-fetch ./app.js 4:12-27
     cjs self exports reference ./node_modules/isomorphic-fetch.js 1:0-14
     harmony side effect evaluation isomorphic-fetch ./page1.js 1:0-47
     harmony import specifier isomorphic-fetch ./page1.js 7:12-27
     entry isomorphic-fetch other-vendors
 ./node_modules/lodash.js 27 bytes [built]
     harmony side effect evaluation lodash ./app.js 2:0-28
     harmony import specifier lodash ./app.js 4:29-35
     cjs self exports reference ./node_modules/lodash.js 1:0-14
     harmony side effect evaluation lodash ./page1.js 2:0-28
     harmony import specifier lodash ./page1.js 7:29-35
     entry lodash other-vendors
chunk page1.js (page1) 241 bytes [initial] [rendered]
    > ./page1.js page1
 ./page1.js 241 bytes [built]
     [no exports]
     [no exports used]
     entry ./page1.js page1
chunk runtime.js (runtime) 3.15 KiB [entry] [rendered]
    > ./app.js app
    > isomorphic-fetch other-vendors
    > lodash other-vendors
    > ./page1.js page1
    > prop-types react-vendors
    > react react-vendors
    > react-dom react-vendors
    4 chunk modules
chunk react-vendors.js (react-vendors) 82 bytes [initial] [rendered]
    > ./page1.js page1
    > prop-types react-vendors
    > react react-vendors
    > react-dom react-vendors
 ./node_modules/prop-types.js 26 bytes [built]
     cjs self exports reference ./node_modules/prop-types.js 1:0-14
     harmony side effect evaluation prop-types ./page1.js 5:0-35
     harmony import specifier prop-types ./page1.js 7:54-63
     entry prop-types react-vendors
 ./node_modules/react-dom.js 30 bytes [built]
     cjs self exports reference ./node_modules/react-dom.js 1:0-14
     harmony side effect evaluation react-dom ./page1.js 4:0-33
     harmony import specifier react-dom ./page1.js 7:44-52
     entry react-dom react-vendors
 ./node_modules/react.js 26 bytes [built]
     cjs self exports reference ./node_modules/react.js 1:0-14
     harmony side effect evaluation react ./page1.js 3:0-26
     harmony import specifier react ./page1.js 7:37-42
     entry react react-vendors
```

## Production mode

```
Hash: 0a1b2c3d4e5f6a7b8c9d
Version: webpack 5.0.0-beta.13
           Asset        Size
          app.js   166 bytes  [emitted]  [name: app]
other-vendors.js   148 bytes  [emitted]  [name: other-vendors]
        page1.js   234 bytes  [emitted]  [name: page1]
react-vendors.js   175 bytes  [emitted]  [name: react-vendors]
      runtime.js  1000 bytes  [emitted]  [name: runtime]
Entrypoint app = runtime.js app.js other-vendors.js
Entrypoint page1 = runtime.js page1.js other-vendors.js react-vendors.js
Entrypoint react-vendors = runtime.js react-vendors.js
Entrypoint other-vendors = runtime.js other-vendors.js
chunk app.js (app) 116 bytes [initial] [rendered]
    > ./app.js app
 ./app.js 116 bytes [built]
     [no exports]
     [no exports used]
     entry ./app.js app
chunk other-vendors.js (other-vendors) 64 bytes [initial] [rendered]
    > ./app.js app
    > isomorphic-fetch other-vendors
    > lodash other-vendors
    > ./page1.js page1
 ./node_modules/isomorphic-fetch.js 37 bytes [built]
     harmony side effect evaluation isomorphic-fetch ./app.js 1:0-47
     harmony import specifier isomorphic-fetch ./app.js 4:12-27
     cjs self exports reference ./node_modules/isomorphic-fetch.js 1:0-14
     harmony side effect evaluation isomorphic-fetch ./page1.js 1:0-47
     harmony import specifier isomorphic-fetch ./page1.js 7:12-27
     entry isomorphic-fetch other-vendors
 ./node_modules/lodash.js 27 bytes [built]
     harmony side effect evaluation lodash ./app.js 2:0-28
     harmony import specifier lodash ./app.js 4:29-35
     cjs self exports reference ./node_modules/lodash.js 1:0-14
     harmony side effect evaluation lodash ./page1.js 2:0-28
     harmony import specifier lodash ./page1.js 7:29-35
     entry lodash other-vendors
chunk page1.js (page1) 241 bytes [initial] [rendered]
    > ./page1.js page1
 ./page1.js 241 bytes [built]
     [no exports]
     [no exports used]
     entry ./page1.js page1
chunk runtime.js (runtime) 3.15 KiB [entry] [rendered]
    > ./app.js app
    > isomorphic-fetch other-vendors
    > lodash other-vendors
    > ./page1.js page1
    > prop-types react-vendors
    > react react-vendors
    > react-dom react-vendors
    4 chunk modules
chunk react-vendors.js (react-vendors) 82 bytes [initial] [rendered]
    > ./page1.js page1
    > prop-types react-vendors
    > react react-vendors
    > react-dom react-vendors
 ./node_modules/prop-types.js 26 bytes [built]
     cjs self exports reference ./node_modules/prop-types.js 1:0-14
     harmony side effect evaluation prop-types ./page1.js 5:0-35
     harmony import specifier prop-types ./page1.js 7:54-63
     entry prop-types react-vendors
 ./node_modules/react-dom.js 30 bytes [built]
     cjs self exports reference ./node_modules/react-dom.js 1:0-14
     harmony side effect evaluation react-dom ./page1.js 4:0-33
     harmony import specifier react-dom ./page1.js 7:44-52
     entry react-dom react-vendors
 ./node_modules/react.js 26 bytes [built]
     cjs self exports reference ./node_modules/react.js 1:0-14
     harmony side effect evaluation react ./page1.js 3:0-26
     harmony import specifier react ./page1.js 7:37-42
     entry react react-vendors
```
