# webpack.config.js

``` javascript
var path = require("path");
var webpack = require("../../");
module.exports = [
	{
		name: "vendor",
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
var vendor_3e23dee019354f6a37c0 =
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
/******/ 	return __webpack_require__(__webpack_require__.s = 1);
/******/ })
/************************************************************************/
/******/ ([
/* 0 */
/*!**********************************************!*\
  !*** external "vendor_3e23dee019354f6a37c0" ***!
  \**********************************************/
/*! no static exports found */
/*! all exports used */
/***/ (function(module, exports) {

module.exports = vendor_3e23dee019354f6a37c0;

/***/ }),
/* 1 */
/*!******************!*\
  !*** ./pageA.js ***!
  \******************/
/*! no static exports found */
/*! all exports used */
/***/ (function(module, exports, __webpack_require__) {

console.log(__webpack_require__(/*! ./vendor */ 2));
module.exports = "pageA";

/***/ }),
/* 2 */
/*!****************************************************************************!*\
  !*** delegated ./vendor.js from dll-reference vendor_3e23dee019354f6a37c0 ***!
  \****************************************************************************/
/*! no static exports found */
/*! all exports used */
/***/ (function(module, exports, __webpack_require__) {

module.exports = (__webpack_require__(0))(1);

/***/ })
/******/ ]);
```

# Info

## Uncompressed

```
Hash: 3e23dee019354f6a37c0873a025592bd40b1b4d6
Version: webpack 3.5.1
Child vendor:
    Hash: 3e23dee019354f6a37c0
        Asset     Size  Chunks             Chunk Names
    vendor.js  3.11 kB       0  [emitted]  main
    Entrypoint main = vendor.js
    chunk    {0} vendor.js (main) 65 bytes [entry] [rendered]
        > main [0] dll main 
        [0] dll main 12 bytes {0} [built]
        [1] ./vendor.js 26 bytes {0} [built]
            single entry ./vendor [0] dll main main:0
        [2] ./vendor2.js 27 bytes {0} [built]
            single entry ./vendor2 [0] dll main main:1
Child app:
    Hash: 873a025592bd40b1b4d6
       Asset     Size  Chunks             Chunk Names
    pageB.js  3.46 kB       0  [emitted]  pageB
    pageA.js  3.44 kB       1  [emitted]  pageA
    pageC.js  2.63 kB       2  [emitted]  pageC
    Entrypoint pageA = pageA.js
    Entrypoint pageB = pageB.js
    Entrypoint pageC = pageC.js
    chunk    {0} pageB.js (pageB) 145 bytes [entry] [rendered]
        > pageB [3] ./pageB.js 
        [3] ./pageB.js 61 bytes {0} [built]
        [4] delegated ./vendor2.js from dll-reference vendor_3e23dee019354f6a37c0 42 bytes {0} [built]
            cjs require ./vendor2 [3] ./pageB.js 1:12-32
         + 1 hidden module
    chunk    {1} pageA.js (pageA) 144 bytes [entry] [rendered]
        > pageA [1] ./pageA.js 
        [1] ./pageA.js 60 bytes {1} [built]
        [2] delegated ./vendor.js from dll-reference vendor_3e23dee019354f6a37c0 42 bytes {1} [built]
            cjs require ./vendor [1] ./pageA.js 1:12-31
         + 1 hidden module
    chunk    {2} pageC.js (pageC) 25 bytes [entry] [rendered]
        > pageC [5] ./pageC.js 
        [5] ./pageC.js 25 bytes {2} [built]
```

## Minimized (uglify-js, no zip)

```
Hash: 3e23dee019354f6a37c0873a025592bd40b1b4d6
Version: webpack 3.5.1
Child vendor:
    Hash: 3e23dee019354f6a37c0
        Asset       Size  Chunks             Chunk Names
    vendor.js  602 bytes       0  [emitted]  main
    Entrypoint main = vendor.js
    chunk    {0} vendor.js (main) 65 bytes [entry] [rendered]
        > main [0] dll main 
        [0] dll main 12 bytes {0} [built]
        [1] ./vendor.js 26 bytes {0} [built]
            single entry ./vendor [0] dll main main:0
        [2] ./vendor2.js 27 bytes {0} [built]
            single entry ./vendor2 [0] dll main main:1
Child app:
    Hash: 873a025592bd40b1b4d6
       Asset       Size  Chunks             Chunk Names
    pageB.js  609 bytes       0  [emitted]  pageB
    pageA.js  607 bytes       1  [emitted]  pageA
    pageC.js  501 bytes       2  [emitted]  pageC
    Entrypoint pageA = pageA.js
    Entrypoint pageB = pageB.js
    Entrypoint pageC = pageC.js
    chunk    {0} pageB.js (pageB) 145 bytes [entry] [rendered]
        > pageB [3] ./pageB.js 
        [3] ./pageB.js 61 bytes {0} [built]
        [4] delegated ./vendor2.js from dll-reference vendor_3e23dee019354f6a37c0 42 bytes {0} [built]
            cjs require ./vendor2 [3] ./pageB.js 1:12-32
         + 1 hidden module
    chunk    {1} pageA.js (pageA) 144 bytes [entry] [rendered]
        > pageA [1] ./pageA.js 
        [1] ./pageA.js 60 bytes {1} [built]
        [2] delegated ./vendor.js from dll-reference vendor_3e23dee019354f6a37c0 42 bytes {1} [built]
            cjs require ./vendor [1] ./pageA.js 1:12-31
         + 1 hidden module
    chunk    {2} pageC.js (pageC) 25 bytes [entry] [rendered]
        > pageC [5] ./pageC.js 
        [5] ./pageC.js 25 bytes {2} [built]
```
