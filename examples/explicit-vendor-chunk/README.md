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
var vendor_bc36e0cf64566447266b =
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
  !*** delegated ./vendor.js from dll-reference vendor_bc36e0cf64566447266b ***!
  \****************************************************************************/
/*! no static exports found */
/***/ (function(module, exports, __webpack_require__) {

module.exports = (__webpack_require__(2))(1);

/***/ }),
/* 2 */
/*!**********************************************!*\
  !*** external "vendor_bc36e0cf64566447266b" ***!
  \**********************************************/
/*! no static exports found */
/***/ (function(module, exports) {

module.exports = vendor_bc36e0cf64566447266b;

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
    pageA.js  3.47 KiB       0  [emitted]  pageA
    pageB.js  3.49 KiB       1  [emitted]  pageB
    pageC.js  2.73 KiB       2  [emitted]  pageC
    Entrypoint pageA = pageA.js
    Entrypoint pageB = pageB.js
    Entrypoint pageC = pageC.js
    chunk    {0} pageA.js (pageA) 144 bytes [entry] [rendered]
        > pageA [0] ./pageA.js 
        [0] ./pageA.js 60 bytes {0} [built]
            single entry ./pageA  pageA
        [1] delegated ./vendor.js from dll-reference vendor_bc36e0cf64566447266b 42 bytes {0} [built]
            cjs require ./vendor [0] ./pageA.js 1:12-31
        [2] external "vendor_bc36e0cf64566447266b" 42 bytes {0} {1} [built]
            delegated source dll-reference vendor_bc36e0cf64566447266b [1] delegated ./vendor.js from dll-reference vendor_bc36e0cf64566447266b
            delegated source dll-reference vendor_bc36e0cf64566447266b [4] delegated ./vendor2.js from dll-reference vendor_bc36e0cf64566447266b
    chunk    {1} pageB.js (pageB) 145 bytes [entry] [rendered]
        > pageB [3] ./pageB.js 
        [2] external "vendor_bc36e0cf64566447266b" 42 bytes {0} {1} [built]
            delegated source dll-reference vendor_bc36e0cf64566447266b [1] delegated ./vendor.js from dll-reference vendor_bc36e0cf64566447266b
            delegated source dll-reference vendor_bc36e0cf64566447266b [4] delegated ./vendor2.js from dll-reference vendor_bc36e0cf64566447266b
        [3] ./pageB.js 61 bytes {1} [built]
            single entry ./pageB  pageB
        [4] delegated ./vendor2.js from dll-reference vendor_bc36e0cf64566447266b 42 bytes {1} [built]
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
        > main [0] dll main 
        [0] dll main 12 bytes {0} [built]
            dll entry 
            
        [1] ./vendor.js 26 bytes {0} [built]
            
            single entry ./vendor [0] dll main main:0
        [2] ./vendor2.js 27 bytes {0} [built]
            
            single entry ./vendor2 [0] dll main main:1
Child app:
    Hash: 0a1b2c3d4e5f6a7b8c9d
       Asset       Size  Chunks             Chunk Names
    pageB.js  675 bytes       0  [emitted]  pageB
    pageA.js  673 bytes       1  [emitted]  pageA
    pageC.js  567 bytes       2  [emitted]  pageC
    Entrypoint pageA = pageA.js
    Entrypoint pageB = pageB.js
    Entrypoint pageC = pageC.js
    chunk    {0} pageB.js (pageB) 145 bytes [entry] [rendered]
        > pageB [3] ./pageB.js 
        [0] external "vendor_bc36e0cf64566447266b" 42 bytes {0} {1} [built]
            delegated source dll-reference vendor_bc36e0cf64566447266b [2] delegated ./vendor.js from dll-reference vendor_bc36e0cf64566447266b
            delegated source dll-reference vendor_bc36e0cf64566447266b [4] delegated ./vendor2.js from dll-reference vendor_bc36e0cf64566447266b
        [3] ./pageB.js 61 bytes {0} [built]
            single entry ./pageB  pageB
        [4] delegated ./vendor2.js from dll-reference vendor_bc36e0cf64566447266b 42 bytes {0} [built]
            cjs require ./vendor2 [3] ./pageB.js 1:12-32
    chunk    {1} pageA.js (pageA) 144 bytes [entry] [rendered]
        > pageA [1] ./pageA.js 
        [0] external "vendor_bc36e0cf64566447266b" 42 bytes {0} {1} [built]
            delegated source dll-reference vendor_bc36e0cf64566447266b [2] delegated ./vendor.js from dll-reference vendor_bc36e0cf64566447266b
            delegated source dll-reference vendor_bc36e0cf64566447266b [4] delegated ./vendor2.js from dll-reference vendor_bc36e0cf64566447266b
        [1] ./pageA.js 60 bytes {1} [built]
            single entry ./pageA  pageA
        [2] delegated ./vendor.js from dll-reference vendor_bc36e0cf64566447266b 42 bytes {1} [built]
            cjs require ./vendor [1] ./pageA.js 1:12-31
    chunk    {2} pageC.js (pageC) 25 bytes [entry] [rendered]
        > pageC [5] ./pageC.js 
        [5] ./pageC.js 25 bytes {2} [built]
            single entry ./pageC  pageC
```
