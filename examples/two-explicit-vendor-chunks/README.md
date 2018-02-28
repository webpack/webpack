# webpack.config.js

``` javascript
var path = require("path");
module.exports = {
	// mode: "development || "production",
	entry: {
		vendor1: ["./vendor1"],
		vendor2: ["./vendor2"],
		pageA: "./pageA",
		pageB: "./pageB",
		pageC: "./pageC"
	},
	output: {
		path: path.join(__dirname, "dist"),
		filename: "[name].js"
	},
	optimization: {
		splitChunks: {
			cacheGroups: {
				vendor1: {
					name: "vendor1",
					test: "vendor1",
					enforce: true
				},
				vendor2: {
					name: "vendor2",
					test: "vendor2",
					enforce: true
				}
			}
		}
	}
};
```

# dist/vendor1.js

<details><summary><code>/******/ (function(modules) { /* webpackBootstrap */ })</code></summary>

``` javascript
/******/ (function(modules) { // webpackBootstrap
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
/******/
/******/ 	// Load entry module and return exports
/******/ 	return __webpack_require__(__webpack_require__.s = 0);
/******/ })
/************************************************************************/
```

</details>

``` javascript
/******/ ([
/* 0 */
/*!***********************!*\
  !*** multi ./vendor1 ***!
  \***********************/
/*! no static exports found */
/***/ (function(module, exports, __webpack_require__) {

module.exports = __webpack_require__(/*! ./vendor1 */1);


/***/ }),
/* 1 */
/*!********************!*\
  !*** ./vendor1.js ***!
  \********************/
/*! no static exports found */
/***/ (function(module, exports) {

module.exports = "Vendor1";

/***/ })
/******/ ]);
```

# dist/vendor2.js

``` javascript
/******/ (function(modules) { // webpackBootstrap
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
/******/
/******/ 	// Load entry module and return exports
/******/ 	return __webpack_require__(__webpack_require__.s = 2);
/******/ })
/************************************************************************/
/******/ ([
/* 0 */,
/* 1 */
/*!********************!*\
  !*** ./vendor1.js ***!
  \********************/
/*! no static exports found */
/***/ (function(module, exports) {

module.exports = "Vendor1";

/***/ }),
/* 2 */
/*!***********************!*\
  !*** multi ./vendor2 ***!
  \***********************/
/*! no static exports found */
/***/ (function(module, exports, __webpack_require__) {

module.exports = __webpack_require__(/*! ./vendor2 */3);


/***/ }),
/* 3 */
/*!********************!*\
  !*** ./vendor2.js ***!
  \********************/
/*! no static exports found */
/***/ (function(module, exports, __webpack_require__) {

module.exports = "Vendor2";
__webpack_require__(/*! ./vendor1 */ 1);


/***/ })
/******/ ]);
```

# dist/pageA.js

``` javascript
/******/ (function(modules) { // webpackBootstrap
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
/******/
/******/ 	// Load entry module and return exports
/******/ 	return __webpack_require__(__webpack_require__.s = 4);
/******/ })
/************************************************************************/
/******/ ([
/* 0 */,
/* 1 */
/*!********************!*\
  !*** ./vendor1.js ***!
  \********************/
/*! no static exports found */
/***/ (function(module, exports) {

module.exports = "Vendor1";

/***/ }),
/* 2 */,
/* 3 */
/*!********************!*\
  !*** ./vendor2.js ***!
  \********************/
/*! no static exports found */
/***/ (function(module, exports, __webpack_require__) {

module.exports = "Vendor2";
__webpack_require__(/*! ./vendor1 */ 1);


/***/ }),
/* 4 */
/*!******************!*\
  !*** ./pageA.js ***!
  \******************/
/*! no static exports found */
/***/ (function(module, exports, __webpack_require__) {

module.exports = "pageA";
__webpack_require__(/*! ./vendor1 */ 1);
__webpack_require__(/*! ./vendor2 */ 3);


/***/ })
/******/ ]);
```

# Info

## Unoptimized

```
Hash: 0a1b2c3d4e5f6a7b8c9d
Version: webpack 4.0.0-beta.2
     Asset      Size  Chunks             Chunk Names
vendor1.js  2.99 KiB       0  [emitted]  vendor1
vendor2.js  3.25 KiB       1  [emitted]  vendor2
  pageA.js   3.3 KiB       2  [emitted]  pageA
  pageB.js  2.74 KiB       3  [emitted]  pageB
  pageC.js  2.74 KiB       4  [emitted]  pageC
Entrypoint vendor1 = vendor1.js
Entrypoint vendor2 = vendor2.js
Entrypoint pageA = pageA.js
Entrypoint pageB = pageB.js
Entrypoint pageC = pageC.js
chunk    {0} vendor1.js (vendor1) 55 bytes [entry] [rendered]
    > vendor1
    [0] multi ./vendor1 28 bytes {0} [built]
        multi entry 
    [1] ./vendor1.js 27 bytes {0} {1} {2} [built]
        single entry ./vendor1 [0] multi ./vendor1 vendor1:100000
        cjs require ./vendor1 [3] ./vendor2.js 2:0-20
        cjs require ./vendor1 [4] ./pageA.js 2:0-20
chunk    {1} vendor2.js (vendor2) 107 bytes [entry] [rendered]
    > vendor2
    [1] ./vendor1.js 27 bytes {0} {1} {2} [built]
        single entry ./vendor1 [0] multi ./vendor1 vendor1:100000
        cjs require ./vendor1 [3] ./vendor2.js 2:0-20
        cjs require ./vendor1 [4] ./pageA.js 2:0-20
    [2] multi ./vendor2 28 bytes {1} [built]
        multi entry 
    [3] ./vendor2.js 52 bytes {1} {2} [built]
        single entry ./vendor2 [2] multi ./vendor2 vendor2:100000
        cjs require ./vendor2 [4] ./pageA.js 3:0-20
chunk    {2} pageA.js (pageA) 152 bytes [entry] [rendered]
    > ./pageA pageA
    [1] ./vendor1.js 27 bytes {0} {1} {2} [built]
        single entry ./vendor1 [0] multi ./vendor1 vendor1:100000
        cjs require ./vendor1 [3] ./vendor2.js 2:0-20
        cjs require ./vendor1 [4] ./pageA.js 2:0-20
    [3] ./vendor2.js 52 bytes {1} {2} [built]
        single entry ./vendor2 [2] multi ./vendor2 vendor2:100000
        cjs require ./vendor2 [4] ./pageA.js 3:0-20
    [4] ./pageA.js 73 bytes {2} [built]
        single entry ./pageA  pageA
chunk    {3} pageB.js (pageB) 25 bytes [entry] [rendered]
    > ./pageB pageB
    [5] ./pageB.js 25 bytes {3} [built]
        single entry ./pageB  pageB
chunk    {4} pageC.js (pageC) 25 bytes [entry] [rendered]
    > ./pageC pageC
    [6] ./pageC.js 25 bytes {4} [built]
        single entry ./pageC  pageC
```

## Production mode

```
Hash: 0a1b2c3d4e5f6a7b8c9d
Version: webpack 4.0.0-beta.2
     Asset       Size  Chunks             Chunk Names
  pageC.js  569 bytes       0  [emitted]  pageC
  pageB.js  569 bytes       1  [emitted]  pageB
  pageA.js  658 bytes       2  [emitted]  pageA
vendor2.js  646 bytes       3  [emitted]  vendor2
vendor1.js  605 bytes       4  [emitted]  vendor1
Entrypoint vendor1 = vendor1.js
Entrypoint vendor2 = vendor2.js
Entrypoint pageA = pageA.js
Entrypoint pageB = pageB.js
Entrypoint pageC = pageC.js
chunk    {0} pageC.js (pageC) 25 bytes [entry] [rendered]
    > ./pageC pageC
    [2] ./pageC.js 25 bytes {0} [built]
        single entry ./pageC  pageC
chunk    {1} pageB.js (pageB) 25 bytes [entry] [rendered]
    > ./pageB pageB
    [3] ./pageB.js 25 bytes {1} [built]
        single entry ./pageB  pageB
chunk    {2} pageA.js (pageA) 152 bytes [entry] [rendered]
    > ./pageA pageA
    [0] ./vendor1.js 27 bytes {2} {3} {4} [built]
        cjs require ./vendor1 [1] ./vendor2.js 2:0-20
        cjs require ./vendor1 [4] ./pageA.js 2:0-20
        single entry ./vendor1 [6] multi ./vendor1 vendor1:100000
    [1] ./vendor2.js 52 bytes {2} {3} [built]
        cjs require ./vendor2 [4] ./pageA.js 3:0-20
        single entry ./vendor2 [5] multi ./vendor2 vendor2:100000
    [4] ./pageA.js 73 bytes {2} [built]
        single entry ./pageA  pageA
chunk    {3} vendor2.js (vendor2) 107 bytes [entry] [rendered]
    > vendor2
    [0] ./vendor1.js 27 bytes {2} {3} {4} [built]
        cjs require ./vendor1 [1] ./vendor2.js 2:0-20
        cjs require ./vendor1 [4] ./pageA.js 2:0-20
        single entry ./vendor1 [6] multi ./vendor1 vendor1:100000
    [1] ./vendor2.js 52 bytes {2} {3} [built]
        cjs require ./vendor2 [4] ./pageA.js 3:0-20
        single entry ./vendor2 [5] multi ./vendor2 vendor2:100000
    [5] multi ./vendor2 28 bytes {3} [built]
        multi entry 
chunk    {4} vendor1.js (vendor1) 55 bytes [entry] [rendered]
    > vendor1
    [0] ./vendor1.js 27 bytes {2} {3} {4} [built]
        cjs require ./vendor1 [1] ./vendor2.js 2:0-20
        cjs require ./vendor1 [4] ./pageA.js 2:0-20
        single entry ./vendor1 [6] multi ./vendor1 vendor1:100000
    [6] multi ./vendor1 28 bytes {4} [built]
        multi entry 
```
