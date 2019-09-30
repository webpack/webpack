# webpack.config.js

```javascript
var path = require("path");
var webpack = require("../../");
module.exports = [
	{
		name: "vendor",
		// mode: "development || "production",
		entry: ["./vendor", "./vendor2"],
		output: {
			path: path.resolve(__dirname, "dist"),
			filename: "vendor.js",
			library: "vendor_[hash]"
		},
		plugins: [
			new webpack.DllPlugin({
				name: "vendor_[hash]",
				path: path.resolve(__dirname, "dist/manifest.json")
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
			path: path.join(__dirname, "dist"),
			filename: "[name].js"
		},
		plugins: [
			new webpack.DllReferencePlugin({
				manifest: path.resolve(__dirname, "dist/manifest.json")
			})
		]
	}
];
```

# dist/vendor.js

```javascript
var vendor_d9f5eab93a0e9010218f =
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
/******/ 			Object.defineProperty(exports, name, { enumerable: true, get: getter });
/******/ 		}
/******/ 	};
/******/
/******/ 	// define __esModule on exports
/******/ 	__webpack_require__.r = function(exports) {
/******/ 		if(typeof Symbol !== 'undefined' && Symbol.toStringTag) {
/******/ 			Object.defineProperty(exports, Symbol.toStringTag, { value: 'Module' });
/******/ 		}
/******/ 		Object.defineProperty(exports, '__esModule', { value: true });
/******/ 	};
/******/
/******/ 	// create a fake namespace object
/******/ 	// mode & 1: value is a module id, require it
/******/ 	// mode & 2: merge all properties of value into the ns
/******/ 	// mode & 4: return value when already ns object
/******/ 	// mode & 8|1: behave like require
/******/ 	__webpack_require__.t = function(value, mode) {
/******/ 		if(mode & 1) value = __webpack_require__(value);
/******/ 		if(mode & 8) return value;
/******/ 		if((mode & 4) && typeof value === 'object' && value && value.__esModule) return value;
/******/ 		var ns = Object.create(null);
/******/ 		__webpack_require__.r(ns);
/******/ 		Object.defineProperty(ns, 'default', { enumerable: true, value: value });
/******/ 		if(mode & 2 && typeof value != 'string') for(var key in value) __webpack_require__.d(ns, key, function(key) { return value[key]; }.bind(null, key));
/******/ 		return ns;
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

# dist/pageA.js

```javascript
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
/******/ 			Object.defineProperty(exports, name, { enumerable: true, get: getter });
/******/ 		}
/******/ 	};
/******/
/******/ 	// define __esModule on exports
/******/ 	__webpack_require__.r = function(exports) {
/******/ 		if(typeof Symbol !== 'undefined' && Symbol.toStringTag) {
/******/ 			Object.defineProperty(exports, Symbol.toStringTag, { value: 'Module' });
/******/ 		}
/******/ 		Object.defineProperty(exports, '__esModule', { value: true });
/******/ 	};
/******/
/******/ 	// create a fake namespace object
/******/ 	// mode & 1: value is a module id, require it
/******/ 	// mode & 2: merge all properties of value into the ns
/******/ 	// mode & 4: return value when already ns object
/******/ 	// mode & 8|1: behave like require
/******/ 	__webpack_require__.t = function(value, mode) {
/******/ 		if(mode & 1) value = __webpack_require__(value);
/******/ 		if(mode & 8) return value;
/******/ 		if((mode & 4) && typeof value === 'object' && value && value.__esModule) return value;
/******/ 		var ns = Object.create(null);
/******/ 		__webpack_require__.r(ns);
/******/ 		Object.defineProperty(ns, 'default', { enumerable: true, value: value });
/******/ 		if(mode & 2 && typeof value != 'string') for(var key in value) __webpack_require__.d(ns, key, function(key) { return value[key]; }.bind(null, key));
/******/ 		return ns;
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
  !*** delegated ./vendor.js from dll-reference vendor_d9f5eab93a0e9010218f ***!
  \****************************************************************************/
/*! no static exports found */
/***/ (function(module, exports, __webpack_require__) {

module.exports = (__webpack_require__(/*! dll-reference vendor_d9f5eab93a0e9010218f */ 2))(1);

/***/ }),
/* 2 */
/*!**********************************************!*\
  !*** external "vendor_d9f5eab93a0e9010218f" ***!
  \**********************************************/
/*! no static exports found */
/***/ (function(module, exports) {

module.exports = vendor_d9f5eab93a0e9010218f;

/***/ })
/******/ ]);
```

# Info

## Unoptimized

```
Hash: 0a1b2c3d4e5f6a7b8c9d
Version: webpack 4.39.0
Child vendor:
    Hash: 0a1b2c3d4e5f6a7b8c9d
        Asset     Size  Chunks             Chunk Names
    vendor.js  4.2 KiB       0  [emitted]  main
    Entrypoint main = vendor.js
    chunk    {0} vendor.js (main) 65 bytes [entry] [rendered]
        > main
     [0] dll main 12 bytes {0} [built]
         dll entry 
          DllPlugin
     [1] ./vendor.js 26 bytes {0} [built]
         single entry ./vendor [0] dll main main[0]
          DllPlugin
     [2] ./vendor2.js 27 bytes {0} [built]
         single entry ./vendor2 [0] dll main main[1]
          DllPlugin
Child app:
    Hash: 0a1b2c3d4e5f6a7b8c9d
       Asset      Size  Chunks             Chunk Names
    pageA.js  4.49 KiB       0  [emitted]  pageA
    pageB.js  4.51 KiB       1  [emitted]  pageB
    pageC.js  3.71 KiB       2  [emitted]  pageC
    Entrypoint pageA = pageA.js
    Entrypoint pageB = pageB.js
    Entrypoint pageC = pageC.js
    chunk    {0} pageA.js (pageA) 143 bytes [entry] [rendered]
        > ./pageA pageA
     [0] ./pageA.js 59 bytes {0} [built]
         single entry ./pageA  pageA
     [1] delegated ./vendor.js from dll-reference vendor_d9f5eab93a0e9010218f 42 bytes {0} [built]
         cjs require ./vendor [0] ./pageA.js 1:12-31
     [2] external "vendor_d9f5eab93a0e9010218f" 42 bytes {0} {1} [built]
         delegated source dll-reference vendor_d9f5eab93a0e9010218f [1] delegated ./vendor.js from dll-reference vendor_d9f5eab93a0e9010218f
         delegated source dll-reference vendor_d9f5eab93a0e9010218f [4] delegated ./vendor2.js from dll-reference vendor_d9f5eab93a0e9010218f
    chunk    {1} pageB.js (pageB) 144 bytes [entry] [rendered]
        > ./pageB pageB
     [2] external "vendor_d9f5eab93a0e9010218f" 42 bytes {0} {1} [built]
         delegated source dll-reference vendor_d9f5eab93a0e9010218f [1] delegated ./vendor.js from dll-reference vendor_d9f5eab93a0e9010218f
         delegated source dll-reference vendor_d9f5eab93a0e9010218f [4] delegated ./vendor2.js from dll-reference vendor_d9f5eab93a0e9010218f
     [3] ./pageB.js 60 bytes {1} [built]
         single entry ./pageB  pageB
     [4] delegated ./vendor2.js from dll-reference vendor_d9f5eab93a0e9010218f 42 bytes {1} [built]
         cjs require ./vendor2 [3] ./pageB.js 1:12-32
    chunk    {2} pageC.js (pageC) 25 bytes [entry] [rendered]
        > ./pageC pageC
     [5] ./pageC.js 25 bytes {2} [built]
         single entry ./pageC  pageC
```

## Production mode

```
Hash: 0a1b2c3d4e5f6a7b8c9d
Version: webpack 4.39.0
Child vendor:
    Hash: 0a1b2c3d4e5f6a7b8c9d
        Asset      Size  Chunks             Chunk Names
    vendor.js  1.03 KiB       0  [emitted]  main
    Entrypoint main = vendor.js
    chunk    {0} vendor.js (main) 65 bytes [entry] [rendered]
        > main
     [0] dll main 12 bytes {0} [built]
         dll entry 
          DllPlugin
     [1] ./vendor.js 26 bytes {0} [built]
         single entry ./vendor [0] dll main main[0]
          DllPlugin
     [2] ./vendor2.js 27 bytes {0} [built]
         single entry ./vendor2 [0] dll main main[1]
          DllPlugin
Child app:
    Hash: 0a1b2c3d4e5f6a7b8c9d
       Asset       Size  Chunks             Chunk Names
    pageA.js   1.04 KiB       0  [emitted]  pageA
    pageB.js   1.04 KiB       1  [emitted]  pageB
    pageC.js  954 bytes       2  [emitted]  pageC
    Entrypoint pageA = pageA.js
    Entrypoint pageB = pageB.js
    Entrypoint pageC = pageC.js
    chunk    {0} pageA.js (pageA) 143 bytes [entry] [rendered]
        > ./pageA pageA
     [0] external "vendor_303963d1ea8561847951" 42 bytes {0} {1} [built]
         delegated source dll-reference vendor_303963d1ea8561847951 [2] delegated ./vendor.js from dll-reference vendor_303963d1ea8561847951
         delegated source dll-reference vendor_303963d1ea8561847951 [4] delegated ./vendor2.js from dll-reference vendor_303963d1ea8561847951
     [1] ./pageA.js 59 bytes {0} [built]
         single entry ./pageA  pageA
     [2] delegated ./vendor.js from dll-reference vendor_303963d1ea8561847951 42 bytes {0} [built]
         cjs require ./vendor [1] ./pageA.js 1:12-31
    chunk    {1} pageB.js (pageB) 144 bytes [entry] [rendered]
        > ./pageB pageB
     [0] external "vendor_303963d1ea8561847951" 42 bytes {0} {1} [built]
         delegated source dll-reference vendor_303963d1ea8561847951 [2] delegated ./vendor.js from dll-reference vendor_303963d1ea8561847951
         delegated source dll-reference vendor_303963d1ea8561847951 [4] delegated ./vendor2.js from dll-reference vendor_303963d1ea8561847951
     [3] ./pageB.js 60 bytes {1} [built]
         single entry ./pageB  pageB
     [4] delegated ./vendor2.js from dll-reference vendor_303963d1ea8561847951 42 bytes {1} [built]
         cjs require ./vendor2 [3] ./pageB.js 1:12-32
    chunk    {2} pageC.js (pageC) 25 bytes [entry] [rendered]
        > ./pageC pageC
     [5] ./pageC.js 25 bytes {2} [built]
         single entry ./pageC  pageC
```
