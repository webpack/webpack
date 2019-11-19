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
var vendor_57330e24282ed92fe266 =
/******/ (() => { // webpackBootstrap
/******/ 	var __webpack_modules__ = ([
/* 0 */
/*!****************!*\
  !*** dll main ***!
  \****************/
/*! exports [maybe provided (runtime-defined)] [maybe used (runtime-defined)] */
/*! runtime requirements: __webpack_require__, module */
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

module.exports = __webpack_require__;

/***/ }),
/* 1 */
/*!*******************!*\
  !*** ./vendor.js ***!
  \*******************/
/*! exports [maybe provided (runtime-defined)] [maybe used (runtime-defined)] */
/*! runtime requirements: module */
/***/ ((module) => {

module.exports = "Vendor";

/***/ }),
/* 2 */
/*!********************!*\
  !*** ./vendor2.js ***!
  \********************/
/*! exports [maybe provided (runtime-defined)] [maybe used (runtime-defined)] */
/*! runtime requirements: module */
/***/ ((module) => {

module.exports = "Vendor2";

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
/******/ 			i: moduleId,
/******/ 			l: false,
/******/ 			exports: {}
/******/ 		};
/******/ 	
/******/ 		// Execute the module function
/******/ 		__webpack_modules__[moduleId](module, module.exports, __webpack_require__);
/******/ 	
/******/ 		// Flag the module as loaded
/******/ 		module.l = true;
/******/ 	
/******/ 		// Return the exports of the module
/******/ 		return module.exports;
/******/ 	}
/******/ 	
/************************************************************************/
```

</details>

``` js
/******/ 	// module exports must be returned from runtime so entry inlining is disabled
/******/ 	// startup
/******/ 	// Load entry module and return exports
/******/ 	return __webpack_require__(0);
/******/ })()
;
```

# dist/pageA.js

```javascript
/******/ (() => { // webpackBootstrap
/******/ 	var __webpack_modules__ = ([
/* 0 */
/*!******************!*\
  !*** ./pageA.js ***!
  \******************/
/*! exports [maybe provided (runtime-defined)] [no usage info] */
/*! runtime requirements: __webpack_require__, module */
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

console.log(__webpack_require__(/*! ./vendor */ 1));
module.exports = "pageA";

/***/ }),
/* 1 */
/*!****************************************************************************!*\
  !*** delegated ./vendor.js from dll-reference vendor_57330e24282ed92fe266 ***!
  \****************************************************************************/
/*! exports [maybe provided (runtime-defined)] [no usage info] */
/*! runtime requirements: module, __webpack_require__ */
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

module.exports = (__webpack_require__(/*! dll-reference vendor_57330e24282ed92fe266 */ 2))(1);

/***/ }),
/* 2 */
/*!**********************************************!*\
  !*** external "vendor_57330e24282ed92fe266" ***!
  \**********************************************/
/*! exports [maybe provided (runtime-defined)] [no usage info] */
/*! runtime requirements: module */
/***/ ((module) => {

"use strict";
module.exports = vendor_57330e24282ed92fe266;

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
/******/ 			i: moduleId,
/******/ 			l: false,
/******/ 			exports: {}
/******/ 		};
/******/ 	
/******/ 		// Execute the module function
/******/ 		__webpack_modules__[moduleId](module, module.exports, __webpack_require__);
/******/ 	
/******/ 		// Flag the module as loaded
/******/ 		module.l = true;
/******/ 	
/******/ 		// Return the exports of the module
/******/ 		return module.exports;
/******/ 	}
/******/ 	
/************************************************************************/
```

</details>

``` js
/******/ 	// startup
/******/ 	// Load entry module
/******/ 	__webpack_require__(0);
/******/ 	// This entry module used 'module' so it can't be inlined
/******/ })()
;
```

# Info

## Unoptimized

```
Hash: 0a1b2c3d4e5f6a7b8c9d
Version: webpack 5.0.0-beta.6
Child vendor:
    Hash: 0a1b2c3d4e5f6a7b8c9d
        Asset      Size
    vendor.js  2.17 KiB  [emitted]  [name: main]
    Entrypoint main = vendor.js
    chunk vendor.js (main) 65 bytes [entry] [rendered]
        > main
     ./vendor.js 26 bytes [built]
         entry ./vendor dll main main[0]
         DllPlugin
     ./vendor2.js 27 bytes [built]
         entry ./vendor2 dll main main[1]
         DllPlugin
     dll main 12 bytes [built]
         dll entry
         used a library export
         DllPlugin
Child app:
    Hash: 0a1b2c3d4e5f6a7b8c9d
       Asset      Size
    pageA.js   2.5 KiB  [emitted]  [name: pageA]
    pageB.js  2.53 KiB  [emitted]  [name: pageB]
    pageC.js   1.5 KiB  [emitted]  [name: pageC]
    Entrypoint pageA = pageA.js
    Entrypoint pageB = pageB.js
    Entrypoint pageC = pageC.js
    chunk pageA.js (pageA) 143 bytes [entry] [rendered]
        > ./pageA pageA
     ./pageA.js 59 bytes [built]
         [used exports unknown]
         entry ./pageA pageA
     delegated ./vendor.js from dll-reference vendor_57330e24282ed92fe266 42 bytes [built]
         [used exports unknown]
         cjs require ./vendor ./pageA.js 1:12-31
     external "vendor_57330e24282ed92fe266" 42 bytes [built]
         [used exports unknown]
         delegated source dll-reference vendor_57330e24282ed92fe266 delegated ./vendor.js from dll-reference vendor_57330e24282ed92fe266
         delegated source dll-reference vendor_57330e24282ed92fe266 delegated ./vendor2.js from dll-reference vendor_57330e24282ed92fe266
    chunk pageB.js (pageB) 144 bytes [entry] [rendered]
        > ./pageB pageB
     ./pageB.js 60 bytes [built]
         [used exports unknown]
         entry ./pageB pageB
     delegated ./vendor2.js from dll-reference vendor_57330e24282ed92fe266 42 bytes [built]
         [used exports unknown]
         cjs require ./vendor2 ./pageB.js 1:12-32
     external "vendor_57330e24282ed92fe266" 42 bytes [built]
         [used exports unknown]
         delegated source dll-reference vendor_57330e24282ed92fe266 delegated ./vendor.js from dll-reference vendor_57330e24282ed92fe266
         delegated source dll-reference vendor_57330e24282ed92fe266 delegated ./vendor2.js from dll-reference vendor_57330e24282ed92fe266
    chunk pageC.js (pageC) 25 bytes [entry] [rendered]
        > ./pageC pageC
     ./pageC.js 25 bytes [built]
         [used exports unknown]
         entry ./pageC pageC
```

## Production mode

```
Hash: 0a1b2c3d4e5f6a7b8c9d
Version: webpack 5.0.0-beta.6
Child vendor:
    Hash: 0a1b2c3d4e5f6a7b8c9d
        Asset       Size
    vendor.js  271 bytes  [emitted]  [name: main]
    Entrypoint main = vendor.js
    chunk vendor.js (main) 65 bytes [entry] [rendered]
        > main
     ./vendor.js 26 bytes [built]
         entry ./vendor dll main main[0]
         DllPlugin
     ./vendor2.js 27 bytes [built]
         entry ./vendor2 dll main main[1]
         DllPlugin
     dll main 12 bytes [built]
         dll entry
         used a library export
         DllPlugin
Child app:
    Hash: 0a1b2c3d4e5f6a7b8c9d
       Asset       Size
    pageA.js  299 bytes  [emitted]  [name: pageA]
    pageB.js  297 bytes  [emitted]  [name: pageB]
    pageC.js  176 bytes  [emitted]  [name: pageC]
    Entrypoint pageA = pageA.js
    Entrypoint pageB = pageB.js
    Entrypoint pageC = pageC.js
    chunk pageB.js (pageB) 144 bytes [entry] [rendered]
        > ./pageB pageB
     ./pageB.js 60 bytes [built]
         [no exports used]
         entry ./pageB pageB
     delegated ./vendor2.js from dll-reference vendor_480562d40e553ce49bd3 42 bytes [built]
         cjs require ./vendor2 ./pageB.js 1:12-32
     external "vendor_480562d40e553ce49bd3" 42 bytes [built]
         delegated source dll-reference vendor_480562d40e553ce49bd3 delegated ./vendor2.js from dll-reference vendor_480562d40e553ce49bd3
         delegated source dll-reference vendor_480562d40e553ce49bd3 delegated ./vendor.js from dll-reference vendor_480562d40e553ce49bd3
    chunk pageC.js (pageC) 25 bytes [entry] [rendered]
        > ./pageC pageC
     ./pageC.js 25 bytes [built]
         [no exports used]
         entry ./pageC pageC
    chunk pageA.js (pageA) 143 bytes [entry] [rendered]
        > ./pageA pageA
     ./pageA.js 59 bytes [built]
         [no exports used]
         entry ./pageA pageA
     delegated ./vendor.js from dll-reference vendor_480562d40e553ce49bd3 42 bytes [built]
         cjs require ./vendor ./pageA.js 1:12-31
     external "vendor_480562d40e553ce49bd3" 42 bytes [built]
         delegated source dll-reference vendor_480562d40e553ce49bd3 delegated ./vendor2.js from dll-reference vendor_480562d40e553ce49bd3
         delegated source dll-reference vendor_480562d40e553ce49bd3 delegated ./vendor.js from dll-reference vendor_480562d40e553ce49bd3
```
