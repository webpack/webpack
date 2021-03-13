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
var vendor_7d1747242b2946e98b24;vendor_7d1747242b2946e98b24 =
/******/ (() => { // webpackBootstrap
/******/ 	var __webpack_modules__ = ([
/* 0 */
/*!****************!*\
  !*** dll main ***!
  \****************/
/*! unknown exports (runtime-defined) */
/*! runtime requirements: __webpack_require__, module */
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

module.exports = __webpack_require__;

/***/ }),
/* 1 */
/*!*******************!*\
  !*** ./vendor.js ***!
  \*******************/
/*! unknown exports (runtime-defined) */
/*! runtime requirements: module */
/*! CommonJS bailout: module.exports is used directly at 1:0-14 */
/***/ ((module) => {

module.exports = "Vendor";

/***/ }),
/* 2 */
/*!********************!*\
  !*** ./vendor2.js ***!
  \********************/
/*! unknown exports (runtime-defined) */
/*! runtime requirements: module */
/*! CommonJS bailout: module.exports is used directly at 1:0-14 */
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
/*! unknown exports (runtime-defined) */
/*! runtime requirements: module, __webpack_require__ */
/*! CommonJS bailout: module.exports is used directly at 2:0-14 */
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

console.log(__webpack_require__(/*! ./vendor */ 1));
module.exports = "pageA";

/***/ }),
/* 1 */
/*!****************************************************************************!*\
  !*** delegated ./vendor.js from dll-reference vendor_7d1747242b2946e98b24 ***!
  \****************************************************************************/
/*! unknown exports (runtime-defined) */
/*! runtime requirements: module, __webpack_require__ */
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

module.exports = (__webpack_require__(/*! dll-reference vendor_7d1747242b2946e98b24 */ 2))(1);

/***/ }),
/* 2 */
/*!**********************************************!*\
  !*** external "vendor_7d1747242b2946e98b24" ***!
  \**********************************************/
/*! dynamic exports */
/*! exports [maybe provided (runtime-defined)] [no usage info] */
/*! runtime requirements: module */
/***/ ((module) => {

"use strict";
module.exports = vendor_7d1747242b2946e98b24;

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
/************************************************************************/
```

</details>

``` js
/******/ 	// startup
/******/ 	// Load entry module
/******/ 	// This entry module is referenced by other modules so it can't be inlined
/******/ 	__webpack_require__(0);
/******/ })()
;
```

# Info

## Unoptimized

```
vendor:
  asset vendor.js 2.16 KiB [emitted] (name: main)
  chunk (runtime: main) vendor.js (main) 65 bytes [entry] [rendered]
    > main
    dependent modules 53 bytes [dependent] 2 modules
    dll main 12 bytes [built] [code generated]
      [used exports unknown]
      dll entry
      used as library export
  vendor (webpack 5.11.1) compiled successfully

app:
  asset pageB.js 2.53 KiB [emitted] (name: pageB)
  asset pageA.js 2.51 KiB [emitted] (name: pageA)
  asset pageC.js 1.51 KiB [emitted] (name: pageC)
  chunk (runtime: pageA) pageA.js (pageA) 143 bytes [entry] [rendered]
    > ./pageA pageA
    dependent modules 84 bytes [dependent] 2 modules
    ./pageA.js 59 bytes [built] [code generated]
      [used exports unknown]
      cjs self exports reference ./pageA.js 2:0-14
      entry ./pageA pageA
  chunk (runtime: pageB) pageB.js (pageB) 144 bytes [entry] [rendered]
    > ./pageB pageB
    dependent modules 84 bytes [dependent] 2 modules
    ./pageB.js 60 bytes [built] [code generated]
      [used exports unknown]
      cjs self exports reference ./pageB.js 2:0-14
      entry ./pageB pageB
  chunk (runtime: pageC) pageC.js (pageC) 25 bytes [entry] [rendered]
    > ./pageC pageC
    ./pageC.js 25 bytes [built] [code generated]
      [used exports unknown]
      cjs self exports reference ./pageC.js 1:0-14
      entry ./pageC pageC
  app (webpack 5.11.1) compiled successfully
```

## Production mode

```
vendor:
  asset vendor.js 283 bytes [emitted] [minimized] (name: main)
  chunk (runtime: main) vendor.js (main) 65 bytes [entry] [rendered]
    > main
    dependent modules 53 bytes [dependent] 2 modules
    dll main 12 bytes [built] [code generated]
      dll entry
      used as library export
  vendor (webpack 5.11.1) compiled successfully

app:
  asset pageA.js 283 bytes [emitted] [minimized] (name: pageA)
  asset pageB.js 283 bytes [emitted] [minimized] (name: pageB)
  asset pageC.js 160 bytes [emitted] [minimized] (name: pageC)
  chunk (runtime: pageB) pageB.js (pageB) 144 bytes [entry] [rendered]
    > ./pageB pageB
    dependent modules 84 bytes [dependent] 2 modules
    ./pageB.js 60 bytes [built] [code generated]
      [used exports unknown]
      cjs self exports reference ./pageB.js 2:0-14
      entry ./pageB pageB
  chunk (runtime: pageC) pageC.js (pageC) 25 bytes [entry] [rendered]
    > ./pageC pageC
    ./pageC.js 25 bytes [built] [code generated]
      [used exports unknown]
      cjs self exports reference ./pageC.js 1:0-14
      entry ./pageC pageC
  chunk (runtime: pageA) pageA.js (pageA) 143 bytes [entry] [rendered]
    > ./pageA pageA
    dependent modules 84 bytes [dependent] 2 modules
    ./pageA.js 59 bytes [built] [code generated]
      [used exports unknown]
      cjs self exports reference ./pageA.js 2:0-14
      entry ./pageA pageA
  app (webpack 5.11.1) compiled successfully
```
