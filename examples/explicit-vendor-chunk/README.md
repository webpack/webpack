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
			library: "vendor_[fullhash]"
		},
		plugins: [
			new webpack.DllPlugin({
				name: "vendor_[fullhash]",
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
var vendor_c995a9b4fab8e98d0184 =
```
<details><summary><code>/******/ (function(modules) { /* webpackBootstrap */ })</code></summary>

``` js
/******/ (function(modules, runtime) { // webpackBootstrap
/******/ 	"use strict";
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
/******/
/******/ 	// the startup function
/******/ 	function startup() {
/******/ 		// Load entry module and return exports
/******/ 		return __webpack_require__(0);
/******/ 	};
/******/
/******/ 	// run startup
/******/ 	return startup();
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
/*! exports [maybe provided (runtime-defined)] [maybe used (runtime-defined)] */
/*! runtime requirements: __webpack_require__, module */
/***/ (function(module, __unusedexports, __webpack_require__) {

module.exports = __webpack_require__;

/***/ }),
/* 1 */
/*!*******************!*\
  !*** ./vendor.js ***!
  \*******************/
/*! exports [maybe provided (runtime-defined)] [maybe used (runtime-defined)] */
/*! runtime requirements: module */
/***/ (function(module) {

module.exports = "Vendor";

/***/ }),
/* 2 */
/*!********************!*\
  !*** ./vendor2.js ***!
  \********************/
/*! exports [maybe provided (runtime-defined)] [maybe used (runtime-defined)] */
/*! runtime requirements: module */
/***/ (function(module) {

module.exports = "Vendor2";

/***/ })
/******/ ]);
```

# dist/pageA.js

```javascript
/******/ (function(modules, runtime) { // webpackBootstrap
/******/ 	"use strict";
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
/******/
/******/ 	// the startup function
/******/ 	function startup() {
/******/ 		// Load entry module and return exports
/******/ 		return __webpack_require__(0);
/******/ 	};
/******/
/******/ 	// run startup
/******/ 	return startup();
/******/ })
/************************************************************************/
/******/ ([
/* 0 */
/*!******************!*\
  !*** ./pageA.js ***!
  \******************/
/*! exports [maybe provided (runtime-defined)] [no usage info] */
/*! runtime requirements: __webpack_require__, module */
/***/ (function(module, __unusedexports, __webpack_require__) {

console.log(__webpack_require__(/*! ./vendor */ 1));
module.exports = "pageA";

/***/ }),
/* 1 */
/*!****************************************************************************!*\
  !*** delegated ./vendor.js from dll-reference vendor_c995a9b4fab8e98d0184 ***!
  \****************************************************************************/
/*! exports [maybe provided (runtime-defined)] [no usage info] */
/*! runtime requirements: module, __webpack_require__ */
/***/ (function(module, __unusedexports, __webpack_require__) {

module.exports = (__webpack_require__(/*! dll-reference vendor_c995a9b4fab8e98d0184 */ 2))(1);

/***/ }),
/* 2 */
/*!**********************************************!*\
  !*** external "vendor_c995a9b4fab8e98d0184" ***!
  \**********************************************/
/*! exports [maybe provided (runtime-defined)] [no usage info] */
/*! runtime requirements: module */
/***/ (function(module) {

module.exports = vendor_c995a9b4fab8e98d0184;

/***/ })
/******/ ]);
```

# Info

## Unoptimized

```
Hash: 0a1b2c3d4e5f6a7b8c9d
Version: webpack 5.0.0-alpha.18
Child vendor:
    Hash: 0a1b2c3d4e5f6a7b8c9d
        Asset      Size  Chunks             Chunk Names
    vendor.js  2.14 KiB     {0}  [emitted]  main
    Entrypoint main = vendor.js
    chunk {0} vendor.js (main) 65 bytes [entry] [rendered]
        > main
     [0] dll main 12 bytes {0} [built]
         dll entry
         DllPlugin
     [1] ./vendor.js 26 bytes {0} [built]
         entry ./vendor [0] dll main main[0]
         DllPlugin
     [2] ./vendor2.js 27 bytes {0} [built]
         entry ./vendor2 [0] dll main main[1]
         DllPlugin
Child app:
    Hash: 0a1b2c3d4e5f6a7b8c9d
       Asset      Size  Chunks             Chunk Names
    pageA.js   2.5 KiB     {0}  [emitted]  pageA
    pageB.js  2.52 KiB     {1}  [emitted]  pageB
    pageC.js  1.52 KiB     {2}  [emitted]  pageC
    Entrypoint pageA = pageA.js
    Entrypoint pageB = pageB.js
    Entrypoint pageC = pageC.js
    chunk {0} pageA.js (pageA) 143 bytes [entry] [rendered]
        > ./pageA pageA
     [0] ./pageA.js 59 bytes {0} [built]
         [used exports unknown]
         entry ./pageA pageA
     [1] delegated ./vendor.js from dll-reference vendor_c995a9b4fab8e98d0184 42 bytes {0} [built]
         [used exports unknown]
         cjs require ./vendor [0] ./pageA.js 1:12-31
     [2] external "vendor_c995a9b4fab8e98d0184" 42 bytes {0} {1} [built]
         [used exports unknown]
         delegated source dll-reference vendor_c995a9b4fab8e98d0184 [1] delegated ./vendor.js from dll-reference vendor_c995a9b4fab8e98d0184
         delegated source dll-reference vendor_c995a9b4fab8e98d0184 [4] delegated ./vendor2.js from dll-reference vendor_c995a9b4fab8e98d0184
    chunk {1} pageB.js (pageB) 144 bytes [entry] [rendered]
        > ./pageB pageB
     [2] external "vendor_c995a9b4fab8e98d0184" 42 bytes {0} {1} [built]
         [used exports unknown]
         delegated source dll-reference vendor_c995a9b4fab8e98d0184 [1] delegated ./vendor.js from dll-reference vendor_c995a9b4fab8e98d0184
         delegated source dll-reference vendor_c995a9b4fab8e98d0184 [4] delegated ./vendor2.js from dll-reference vendor_c995a9b4fab8e98d0184
     [3] ./pageB.js 60 bytes {1} [built]
         [used exports unknown]
         entry ./pageB pageB
     [4] delegated ./vendor2.js from dll-reference vendor_c995a9b4fab8e98d0184 42 bytes {1} [built]
         [used exports unknown]
         cjs require ./vendor2 [3] ./pageB.js 1:12-32
    chunk {2} pageC.js (pageC) 25 bytes [entry] [rendered]
        > ./pageC pageC
     [5] ./pageC.js 25 bytes {2} [built]
         [used exports unknown]
         entry ./pageC pageC
```

## Production mode

```
Hash: 0a1b2c3d4e5f6a7b8c9d
Version: webpack 5.0.0-alpha.18
Child vendor:
    Hash: 0a1b2c3d4e5f6a7b8c9d
        Asset       Size  Chunks             Chunk Names
    vendor.js  326 bytes   {179}  [emitted]  main
    Entrypoint main = vendor.js
    chunk {179} vendor.js (main) 65 bytes [entry] [rendered]
        > main
     [117] ./vendor2.js 27 bytes {179} [built]
           entry ./vendor2 [550] dll main main[1]
           DllPlugin
     [550] dll main 12 bytes {179} [built]
           dll entry
           DllPlugin
     [965] ./vendor.js 26 bytes {179} [built]
           entry ./vendor [550] dll main main[0]
           DllPlugin
Child app:
    Hash: 0a1b2c3d4e5f6a7b8c9d
       Asset       Size  Chunks             Chunk Names
    pageA.js  339 bytes   {424}  [emitted]  pageA
    pageB.js  339 bytes   {121}  [emitted]  pageB
    pageC.js  217 bytes   {178}  [emitted]  pageC
    Entrypoint pageA = pageA.js
    Entrypoint pageB = pageB.js
    Entrypoint pageC = pageC.js
    chunk {121} pageB.js (pageB) 144 bytes [entry] [rendered]
        > ./pageB pageB
     [418] delegated ./vendor2.js from dll-reference vendor_8deec81e2e745f2ed7e1 42 bytes {121} [built]
           cjs require ./vendor2 [588] ./pageB.js 1:12-32
     [588] ./pageB.js 60 bytes {121} [built]
           entry ./pageB pageB
     [827] external "vendor_8deec81e2e745f2ed7e1" 42 bytes {121} {424} [built]
           delegated source dll-reference vendor_8deec81e2e745f2ed7e1 [418] delegated ./vendor2.js from dll-reference vendor_8deec81e2e745f2ed7e1
           delegated source dll-reference vendor_8deec81e2e745f2ed7e1 [903] delegated ./vendor.js from dll-reference vendor_8deec81e2e745f2ed7e1
    chunk {178} pageC.js (pageC) 25 bytes [entry] [rendered]
        > ./pageC pageC
     [145] ./pageC.js 25 bytes {178} [built]
           entry ./pageC pageC
    chunk {424} pageA.js (pageA) 143 bytes [entry] [rendered]
        > ./pageA pageA
     [366] ./pageA.js 59 bytes {424} [built]
           entry ./pageA pageA
     [827] external "vendor_8deec81e2e745f2ed7e1" 42 bytes {121} {424} [built]
           delegated source dll-reference vendor_8deec81e2e745f2ed7e1 [418] delegated ./vendor2.js from dll-reference vendor_8deec81e2e745f2ed7e1
           delegated source dll-reference vendor_8deec81e2e745f2ed7e1 [903] delegated ./vendor.js from dll-reference vendor_8deec81e2e745f2ed7e1
     [903] delegated ./vendor.js from dll-reference vendor_8deec81e2e745f2ed7e1 42 bytes {424} [built]
           cjs require ./vendor [366] ./pageA.js 1:12-31
```
