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
var vendor_32199746b38d6e93b44b =
```
<details><summary>`/******/ (function(modules) { /* webpackBootstrap */ })`</summary>
``` js
/******/ (function(modules) { // webpackBootstrap
/******/ 	// The module cache
/******/ 	var installedModules = {};

/******/ 	// The require function
/******/ 	function __webpack_require__(moduleId) {

/******/ 		// Check if module is in cache
/******/ 		if(installedModules[moduleId])
/******/ 			return installedModules[moduleId].exports;

/******/ 		// Create a new module (and put it into the cache)
/******/ 		var module = installedModules[moduleId] = {
/******/ 			i: moduleId,
/******/ 			l: false,
/******/ 			exports: {}
/******/ 		};

/******/ 		// Execute the module function
/******/ 		modules[moduleId].call(module.exports, module, module.exports, __webpack_require__);

/******/ 		// Flag the module as loaded
/******/ 		module.l = true;

/******/ 		// Return the exports of the module
/******/ 		return module.exports;
/******/ 	}


/******/ 	// expose the modules object (__webpack_modules__)
/******/ 	__webpack_require__.m = modules;

/******/ 	// expose the module cache
/******/ 	__webpack_require__.c = installedModules;

/******/ 	// identity function for calling harmony imports with the correct context
/******/ 	__webpack_require__.i = function(value) { return value; };

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

/******/ 	// getDefaultExport function for compatibility with non-harmony modules
/******/ 	__webpack_require__.n = function(module) {
/******/ 		var getter = module && module.__esModule ?
/******/ 			function getDefault() { return module['default']; } :
/******/ 			function getModuleExports() { return module; };
/******/ 		__webpack_require__.d(getter, 'a', getter);
/******/ 		return getter;
/******/ 	};

/******/ 	// Object.prototype.hasOwnProperty.call
/******/ 	__webpack_require__.o = function(object, property) { return Object.prototype.hasOwnProperty.call(object, property); };

/******/ 	// __webpack_public_path__
/******/ 	__webpack_require__.p = "js/";

/******/ 	// Load entry module and return exports
/******/ 	return __webpack_require__(__webpack_require__.s = 2);
/******/ })
/************************************************************************/
```
</details>
``` js
/******/ ([
/* 0 */
/* unknown exports provided */
/* all exports used */
/*!*******************!*\
  !*** ./vendor.js ***!
  \*******************/
/***/ function(module, exports) {

module.exports = "Vendor";

/***/ },
/* 1 */
/* unknown exports provided */
/* all exports used */
/*!********************!*\
  !*** ./vendor2.js ***!
  \********************/
/***/ function(module, exports) {

module.exports = "Vendor2";

/***/ },
/* 2 */
/* unknown exports provided */
/* all exports used */
/*!****************!*\
  !*** dll main ***!
  \****************/
/***/ function(module, exports, __webpack_require__) {

module.exports = __webpack_require__;

/***/ }
/******/ ]);
```

# js/pageA.js

``` javascript
/******/ (function(modules) { // webpackBootstrap
/******/ 	// The module cache
/******/ 	var installedModules = {};

/******/ 	// The require function
/******/ 	function __webpack_require__(moduleId) {

/******/ 		// Check if module is in cache
/******/ 		if(installedModules[moduleId])
/******/ 			return installedModules[moduleId].exports;

/******/ 		// Create a new module (and put it into the cache)
/******/ 		var module = installedModules[moduleId] = {
/******/ 			i: moduleId,
/******/ 			l: false,
/******/ 			exports: {}
/******/ 		};

/******/ 		// Execute the module function
/******/ 		modules[moduleId].call(module.exports, module, module.exports, __webpack_require__);

/******/ 		// Flag the module as loaded
/******/ 		module.l = true;

/******/ 		// Return the exports of the module
/******/ 		return module.exports;
/******/ 	}


/******/ 	// expose the modules object (__webpack_modules__)
/******/ 	__webpack_require__.m = modules;

/******/ 	// expose the module cache
/******/ 	__webpack_require__.c = installedModules;

/******/ 	// identity function for calling harmony imports with the correct context
/******/ 	__webpack_require__.i = function(value) { return value; };

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

/******/ 	// getDefaultExport function for compatibility with non-harmony modules
/******/ 	__webpack_require__.n = function(module) {
/******/ 		var getter = module && module.__esModule ?
/******/ 			function getDefault() { return module['default']; } :
/******/ 			function getModuleExports() { return module; };
/******/ 		__webpack_require__.d(getter, 'a', getter);
/******/ 		return getter;
/******/ 	};

/******/ 	// Object.prototype.hasOwnProperty.call
/******/ 	__webpack_require__.o = function(object, property) { return Object.prototype.hasOwnProperty.call(object, property); };

/******/ 	// __webpack_public_path__
/******/ 	__webpack_require__.p = "js/";

/******/ 	// Load entry module and return exports
/******/ 	return __webpack_require__(__webpack_require__.s = 3);
/******/ })
/************************************************************************/
/******/ ([
/* 0 */
/* unknown exports provided */
/*!**********************************************!*\
  !*** external "vendor_32199746b38d6e93b44b" ***!
  \**********************************************/
/***/ function(module, exports) {

module.exports = vendor_32199746b38d6e93b44b;

/***/ },
/* 1 */
/* unknown exports provided */
/* all exports used */
/*!****************************************************************************!*\
  !*** delegated ./vendor.js from dll-reference vendor_32199746b38d6e93b44b ***!
  \****************************************************************************/
/***/ function(module, exports, __webpack_require__) {

module.exports = (__webpack_require__(0))(0);

/***/ },
/* 2 */,
/* 3 */
/* unknown exports provided */
/* all exports used */
/*!******************!*\
  !*** ./pageA.js ***!
  \******************/
/***/ function(module, exports, __webpack_require__) {

console.log(__webpack_require__(/*! ./vendor */ 1));
module.exports = "pageA";

/***/ }
/******/ ]);
```

# Info

## Uncompressed

```
Hash: 32199746b38d6e93b44b5135e2b2d565610f1fb4
Version: webpack 2.2.0-rc.2
Child vendor:
    Hash: 32199746b38d6e93b44b
    Version: webpack 2.2.0-rc.2
        Asset     Size  Chunks             Chunk Names
    vendor.js  3.14 kB       0  [emitted]  main
    Entrypoint main = vendor.js
    chunk    {0} vendor.js (main) 65 bytes [entry] [rendered]
        > main [2] dll main 
        [0] ./vendor.js 26 bytes {0} [built]
            single entry ./vendor [2] dll main
        [1] ./vendor2.js 27 bytes {0} [built]
            single entry ./vendor2 [2] dll main
        [2] dll main 12 bytes {0} [built]
Child app:
    Hash: 5135e2b2d565610f1fb4
    Version: webpack 2.2.0-rc.2
       Asset     Size  Chunks             Chunk Names
    pageB.js  3.46 kB       0  [emitted]  pageB
    pageA.js  3.45 kB       1  [emitted]  pageA
    pageC.js  2.66 kB       2  [emitted]  pageC
    Entrypoint pageA = pageA.js
    Entrypoint pageB = pageB.js
    Entrypoint pageC = pageC.js
    chunk    {0} pageB.js (pageB) 145 bytes [entry] [rendered]
        > pageB [4] ./pageB.js 
        [2] delegated ./vendor2.js from dll-reference vendor_32199746b38d6e93b44b 42 bytes {0} [not cacheable] [built]
            cjs require ./vendor2 [4] ./pageB.js 1:12-32
        [4] ./pageB.js 61 bytes {0} [built]
         + 1 hidden modules
    chunk    {1} pageA.js (pageA) 144 bytes [entry] [rendered]
        > pageA [3] ./pageA.js 
        [1] delegated ./vendor.js from dll-reference vendor_32199746b38d6e93b44b 42 bytes {1} [not cacheable] [built]
            cjs require ./vendor [3] ./pageA.js 1:12-31
        [3] ./pageA.js 60 bytes {1} [built]
         + 1 hidden modules
    chunk    {2} pageC.js (pageC) 25 bytes [entry] [rendered]
        > pageC [5] ./pageC.js 
        [5] ./pageC.js 25 bytes {2} [built]
```

## Minimized (uglify-js, no zip)

```
Hash: 32199746b38d6e93b44b5135e2b2d565610f1fb4
Version: webpack 2.2.0-rc.2
Child vendor:
    Hash: 32199746b38d6e93b44b
    Version: webpack 2.2.0-rc.2
        Asset       Size  Chunks             Chunk Names
    vendor.js  628 bytes       0  [emitted]  main
    Entrypoint main = vendor.js
    chunk    {0} vendor.js (main) 65 bytes [entry] [rendered]
        > main [2] dll main 
        [0] ./vendor.js 26 bytes {0} [built]
            single entry ./vendor [2] dll main
        [1] ./vendor2.js 27 bytes {0} [built]
            single entry ./vendor2 [2] dll main
        [2] dll main 12 bytes {0} [built]
Child app:
    Hash: 5135e2b2d565610f1fb4
    Version: webpack 2.2.0-rc.2
       Asset       Size  Chunks             Chunk Names
    pageB.js  642 bytes       0  [emitted]  pageB
    pageA.js  641 bytes       1  [emitted]  pageA
    pageC.js  534 bytes       2  [emitted]  pageC
    Entrypoint pageA = pageA.js
    Entrypoint pageB = pageB.js
    Entrypoint pageC = pageC.js
    chunk    {0} pageB.js (pageB) 145 bytes [entry] [rendered]
        > pageB [4] ./pageB.js 
        [2] delegated ./vendor2.js from dll-reference vendor_32199746b38d6e93b44b 42 bytes {0} [not cacheable] [built]
            cjs require ./vendor2 [4] ./pageB.js 1:12-32
        [4] ./pageB.js 61 bytes {0} [built]
         + 1 hidden modules
    chunk    {1} pageA.js (pageA) 144 bytes [entry] [rendered]
        > pageA [3] ./pageA.js 
        [1] delegated ./vendor.js from dll-reference vendor_32199746b38d6e93b44b 42 bytes {1} [not cacheable] [built]
            cjs require ./vendor [3] ./pageA.js 1:12-31
        [3] ./pageA.js 60 bytes {1} [built]
         + 1 hidden modules
    chunk    {2} pageC.js (pageC) 25 bytes [entry] [rendered]
        > pageC [5] ./pageC.js 
        [5] ./pageC.js 25 bytes {2} [built]
```
