# webpack.config.js

``` javascript
var path = require("path");
var webpack = require("../../");
module.exports = [
	{
		name: "vendor",
		// mode: "development || "production",
		entry: ["./vendor", "./vendor2"],
		output: {
			path: path.resolve(__dirname, "js"),
			filename: "vendor.js",
			library: "vendor_[hash]"
		},
		plugins: [
			new webpack.DllPlugin({
				name: "vendor_[hash]",
				path: path.resolve(__dirname, "js/manifest.json")
			})
		]
	},
	{
		name: "app",
		// mode: "development || "production",
		dependencies: ["vendor"],
		entry: {
			pageA: "./pageA",
			pageB: "./pageB",
			pageC: "./pageC"
		},
		output: {
			path: path.join(__dirname, "js"),
			filename: "[name].js"
		},
		plugins: [
			new webpack.DllReferencePlugin({
				manifest: path.resolve(__dirname, "js/manifest.json")
			})
		]
	}
];
```

# js/vendor.js

``` javascript
var vendor_29cbd7a62aad73543161 =
```
<details><summary><code>/******/ (function(modules) { /* webpackBootstrap */ })</code></summary>

``` js
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
/******/ 	__webpack_require__.p = "js/";
/******/
/******/ 	// Load entry module and return exports
/******/ 	return __webpack_require__(__webpack_require__.s = 0);
/******/ })
/************************************************************************/
```

</details>

``` js
/******/ ([
/* 0 */
/*!****************!*\
  !*** dll main ***!
  \****************/
/*! no static exports found */
/*! all exports used */
/***/ (function(module, exports, __webpack_require__) {

module.exports = __webpack_require__;

/***/ }),
/* 1 */
/*!*******************!*\
  !*** ./vendor.js ***!
  \*******************/
/*! no static exports found */
/*! all exports used */
/***/ (function(module, exports) {

module.exports = "Vendor";

/***/ }),
/* 2 */
/*!********************!*\
  !*** ./vendor2.js ***!
  \********************/
/*! no static exports found */
/*! all exports used */
/***/ (function(module, exports) {

module.exports = "Vendor2";

/***/ })
/******/ ]);
```

# js/pageA.js

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
/******/ 	__webpack_require__.p = "js/";
/******/
/******/ 	// Load entry module and return exports
/******/ 	return __webpack_require__(__webpack_require__.s = 0);
/******/ })
/************************************************************************/
/******/ ([
/* 0 */
/*!******************!*\
  !*** ./pageA.js ***!
  \******************/
/*! no static exports found */
/***/ (function(module, exports, __webpack_require__) {

console.log(__webpack_require__(/*! ./vendor */ 1));
module.exports = "pageA";

/***/ }),
/* 1 */
/*!****************************************************************************!*\
  !*** delegated ./vendor.js from dll-reference vendor_29cbd7a62aad73543161 ***!
  \****************************************************************************/
/*! no static exports found */
/***/ (function(module, exports, __webpack_require__) {

module.exports = (__webpack_require__(/*! dll-reference vendor_29cbd7a62aad73543161 */ 2))(1);

/***/ }),
/* 2 */
/*!**********************************************!*\
  !*** external "vendor_29cbd7a62aad73543161" ***!
  \**********************************************/
/*! no static exports found */
/***/ (function(module, exports) {

module.exports = vendor_29cbd7a62aad73543161;

/***/ })
/******/ ]);
```

# Info

## Unoptimized

```
Hash: 0a1b2c3d4e5f6a7b8c9d
Version: webpack next
Child vendor:
    Hash: 0a1b2c3d4e5f6a7b8c9d
        Asset      Size  Chunks             Chunk Names
    vendor.js  3.23 KiB       0  [emitted]  main
    Entrypoint main = vendor.js
    chunk    {0} vendor.js (main) 65 bytes [entry] [rendered]
        > main [0] dll main 
        [0] dll main 12 bytes {0} [built]
            dll entry 
            
        [1] ./vendor.js 26 bytes {0} [built]
            
            single entry ./vendor [0] dll main main:0
        [2] ./vendor2.js 27 bytes {0} [built]
            
            single entry ./vendor2 [0] dll main main:1
Child app:
    Hash: 0a1b2c3d4e5f6a7b8c9d
       Asset      Size  Chunks             Chunk Names
    pageA.js  3.52 KiB       0  [emitted]  pageA
    pageB.js  3.54 KiB       1  [emitted]  pageB
    pageC.js  2.73 KiB       2  [emitted]  pageC
    Entrypoint pageA = pageA.js
    Entrypoint pageB = pageB.js
    Entrypoint pageC = pageC.js
    chunk    {0} pageA.js (pageA) 144 bytes [entry] [rendered]
        > pageA [0] ./pageA.js 
        [0] ./pageA.js 60 bytes {0} [built]
            single entry ./pageA  pageA
        [1] delegated ./vendor.js from dll-reference vendor_29cbd7a62aad73543161 42 bytes {0} [built]
            cjs require ./vendor [0] ./pageA.js 1:12-31
        [2] external "vendor_29cbd7a62aad73543161" 42 bytes {0} {1} [built]
            delegated source dll-reference vendor_29cbd7a62aad73543161 [1] delegated ./vendor.js from dll-reference vendor_29cbd7a62aad73543161
            delegated source dll-reference vendor_29cbd7a62aad73543161 [4] delegated ./vendor2.js from dll-reference vendor_29cbd7a62aad73543161
    chunk    {1} pageB.js (pageB) 145 bytes [entry] [rendered]
        > pageB [3] ./pageB.js 
        [2] external "vendor_29cbd7a62aad73543161" 42 bytes {0} {1} [built]
            delegated source dll-reference vendor_29cbd7a62aad73543161 [1] delegated ./vendor.js from dll-reference vendor_29cbd7a62aad73543161
            delegated source dll-reference vendor_29cbd7a62aad73543161 [4] delegated ./vendor2.js from dll-reference vendor_29cbd7a62aad73543161
        [3] ./pageB.js 61 bytes {1} [built]
            single entry ./pageB  pageB
        [4] delegated ./vendor2.js from dll-reference vendor_29cbd7a62aad73543161 42 bytes {1} [built]
            cjs require ./vendor2 [3] ./pageB.js 1:12-32
    chunk    {2} pageC.js (pageC) 25 bytes [entry] [rendered]
        > pageC [5] ./pageC.js 
        [5] ./pageC.js 25 bytes {2} [built]
            single entry ./pageC  pageC
```

## Production mode

```
Hash: 0a1b2c3d4e5f6a7b8c9d
Version: webpack next
Child vendor:
    Hash: 0a1b2c3d4e5f6a7b8c9d
        Asset       Size  Chunks             Chunk Names
    vendor.js  668 bytes       0  [emitted]  main
    Entrypoint main = vendor.js
    chunk    {0} vendor.js (main) 65 bytes [entry] [rendered]
        > main [2] dll main 
        [0] ./vendor2.js 27 bytes {0} [built]
            
            single entry ./vendor2 [2] dll main main:1
        [1] ./vendor.js 26 bytes {0} [built]
            
            single entry ./vendor [2] dll main main:0
        [2] dll main 12 bytes {0} [built]
            dll entry 
            
Child app:
    Hash: 0a1b2c3d4e5f6a7b8c9d
       Asset       Size  Chunks             Chunk Names
    pageC.js  566 bytes       0  [emitted]  pageC
    pageB.js  674 bytes       1  [emitted]  pageB
    pageA.js  676 bytes       2  [emitted]  pageA
    Entrypoint pageA = pageA.js
    Entrypoint pageB = pageB.js
    Entrypoint pageC = pageC.js
    chunk    {0} pageC.js (pageC) 25 bytes [entry] [rendered]
        > pageC [1] ./pageC.js 
        [1] ./pageC.js 25 bytes {0} [built]
            single entry ./pageC  pageC
    chunk    {1} pageB.js (pageB) 145 bytes [entry] [rendered]
        > pageB [3] ./pageB.js 
        [0] external "vendor_6b1d14c4fe9298d3969e" 42 bytes {1} {2} [built]
            delegated source dll-reference vendor_6b1d14c4fe9298d3969e [2] delegated ./vendor2.js from dll-reference vendor_6b1d14c4fe9298d3969e
            delegated source dll-reference vendor_6b1d14c4fe9298d3969e [4] delegated ./vendor.js from dll-reference vendor_6b1d14c4fe9298d3969e
        [2] delegated ./vendor2.js from dll-reference vendor_6b1d14c4fe9298d3969e 42 bytes {1} [built]
            cjs require ./vendor2 [3] ./pageB.js 1:12-32
        [3] ./pageB.js 61 bytes {1} [built]
            single entry ./pageB  pageB
    chunk    {2} pageA.js (pageA) 144 bytes [entry] [rendered]
        > pageA [5] ./pageA.js 
        [0] external "vendor_6b1d14c4fe9298d3969e" 42 bytes {1} {2} [built]
            delegated source dll-reference vendor_6b1d14c4fe9298d3969e [2] delegated ./vendor2.js from dll-reference vendor_6b1d14c4fe9298d3969e
            delegated source dll-reference vendor_6b1d14c4fe9298d3969e [4] delegated ./vendor.js from dll-reference vendor_6b1d14c4fe9298d3969e
        [4] delegated ./vendor.js from dll-reference vendor_6b1d14c4fe9298d3969e 42 bytes {2} [built]
            cjs require ./vendor [5] ./pageA.js 1:12-31
        [5] ./pageA.js 60 bytes {2} [built]
            single entry ./pageA  pageA
```
