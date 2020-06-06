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
(window["webpackJsonp"] = window["webpackJsonp"] || []).push([["app"],{

/***/ 3:
/*!****************!*\
  !*** ./app.js ***!
  \****************/
/*! namespace exports */
/*! exports [not provided] [unused] */
/*! runtime requirements: __webpack_require__, __webpack_require__.n, __webpack_require__.* */
/***/ ((__unused_webpack_module, __unused_webpack___webpack_exports__, __webpack_require__) => {

"use strict";
/* harmony import */ var react__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! react */ 0);
/* harmony import */ var react__WEBPACK_IMPORTED_MODULE_0___default = /*#__PURE__*/__webpack_require__.n(react__WEBPACK_IMPORTED_MODULE_0__);
/* harmony import */ var react_dom__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! react-dom */ 1);
/* harmony import */ var react_dom__WEBPACK_IMPORTED_MODULE_1___default = /*#__PURE__*/__webpack_require__.n(react_dom__WEBPACK_IMPORTED_MODULE_1__);
/* harmony import */ var prop_types__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! prop-types */ 2);
/* harmony import */ var prop_types__WEBPACK_IMPORTED_MODULE_2___default = /*#__PURE__*/__webpack_require__.n(prop_types__WEBPACK_IMPORTED_MODULE_2__);




console.log((react__WEBPACK_IMPORTED_MODULE_0___default()), (react_dom__WEBPACK_IMPORTED_MODULE_1___default()), (prop_types__WEBPACK_IMPORTED_MODULE_2___default()));


/***/ })

},[[3,"react-vendors"]]]);
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
/******/ 			"react-vendors": 0
/******/ 		};
/******/ 		
/******/ 		var deferredModules = [
/******/ 			[0],
/******/ 			[1],
/******/ 			[2]
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

# Info

## Unoptimized

```
Hash: 0a1b2c3d4e5f6a7b8c9d
Version: webpack 5.0.0-beta.16
           Asset      Size
          app.js  1.35 KiB  [emitted]  [name: app]
react-vendors.js  7.12 KiB  [emitted]  [name: react-vendors]
Entrypoint app = app.js
Entrypoint react-vendors = react-vendors.js
chunk app.js (app) 139 bytes <{react-vendors}> [initial] [rendered]
    > ./app.js app
 ./app.js 139 bytes [built]
     [no exports]
     [no exports used]
     entry ./app.js app
chunk react-vendors.js (react-vendors) 87 bytes (javascript) 3.17 KiB (runtime) >{app}< [entry] [rendered]
    > prop-types react-vendors
    > react react-vendors
    > react-dom react-vendors
 ./node_modules/prop-types.js 31 bytes [built]
     harmony side effect evaluation prop-types ./app.js 3:0-35
     harmony import specifier prop-types ./app.js 5:29-38
     cjs self exports reference ./node_modules/prop-types.js 1:0-14
     entry prop-types react-vendors
 ./node_modules/react-dom.js 30 bytes [built]
     harmony side effect evaluation react-dom ./app.js 2:0-33
     harmony import specifier react-dom ./app.js 5:19-27
     cjs self exports reference ./node_modules/react-dom.js 1:0-14
     entry react-dom react-vendors
 ./node_modules/react.js 26 bytes [built]
     harmony side effect evaluation react ./app.js 1:0-26
     harmony import specifier react ./app.js 5:12-17
     cjs self exports reference ./node_modules/react.js 1:0-14
     entry react react-vendors
     + 4 hidden chunk modules
```

## Production mode

```
Hash: 0a1b2c3d4e5f6a7b8c9d
Version: webpack 5.0.0-beta.16
           Asset       Size
          app.js  197 bytes  [emitted]  [name: app]
react-vendors.js   1.08 KiB  [emitted]  [name: react-vendors]
Entrypoint app = app.js
Entrypoint react-vendors = react-vendors.js
chunk app.js (app) 139 bytes <{react-vendors}> [initial] [rendered]
    > ./app.js app
 ./app.js 139 bytes [built]
     [no exports]
     [no exports used]
     entry ./app.js app
chunk react-vendors.js (react-vendors) 87 bytes (javascript) 3.18 KiB (runtime) >{app}< [entry] [rendered]
    > prop-types react-vendors
    > react react-vendors
    > react-dom react-vendors
 ./node_modules/prop-types.js 31 bytes [built]
     harmony side effect evaluation prop-types ./app.js 3:0-35
     harmony import specifier prop-types ./app.js 5:29-38
     cjs self exports reference ./node_modules/prop-types.js 1:0-14
     entry prop-types react-vendors
 ./node_modules/react-dom.js 30 bytes [built]
     harmony side effect evaluation react-dom ./app.js 2:0-33
     harmony import specifier react-dom ./app.js 5:19-27
     cjs self exports reference ./node_modules/react-dom.js 1:0-14
     entry react-dom react-vendors
 ./node_modules/react.js 26 bytes [built]
     harmony side effect evaluation react ./app.js 1:0-26
     harmony import specifier react ./app.js 5:12-17
     cjs self exports reference ./node_modules/react.js 1:0-14
     entry react react-vendors
     + 4 hidden chunk modules
```
