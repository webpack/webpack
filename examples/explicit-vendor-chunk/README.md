# webpack.config.js

```javascript
"use strict";

const path = require("path");
const webpack = require("../../");

/** @type {import("webpack").Configuration[]} */
const config = [
	{
		name: "vendor",
		// mode: "development" || "production",
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
		// mode: "development" || "production",
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

module.exports = config;
```

# dist/vendor.js

```javascript
var vendor_19a5eb797fd6f4980c5d;
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
/******/ 		var cachedModule = __webpack_module_cache__[moduleId];
/******/ 		if (cachedModule !== undefined) {
/******/ 			return cachedModule.exports;
/******/ 		}
/******/ 		// Create a new module (and put it into the cache)
/******/ 		var module = __webpack_module_cache__[moduleId] = {
/******/ 			// no module.id needed
/******/ 			// no module.loaded needed
/******/ 			exports: {}
/******/ 		};
/******/ 	
/******/ 		// Execute the module function
/******/ 		if (!(moduleId in __webpack_modules__)) {
/******/ 			delete __webpack_module_cache__[moduleId];
/******/ 			var e = new Error("Cannot find module '" + moduleId + "'");
/******/ 			e.code = 'MODULE_NOT_FOUND';
/******/ 			throw e;
/******/ 		}
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
/******/ 	
/******/ 	// startup
/******/ 	// Load entry module and return exports
/******/ 	// This entry module doesn't tell about it's top-level declarations so it can't be inlined
/******/ 	var __webpack_exports__ = __webpack_require__(0);
/******/ 	vendor_19a5eb797fd6f4980c5d = __webpack_exports__;
/******/ 	
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
  !*** delegated ./vendor.js from dll-reference vendor_19a5eb797fd6f4980c5d ***!
  \****************************************************************************/
/*! unknown exports (runtime-defined) */
/*! runtime requirements: module, __webpack_require__ */
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

module.exports = (__webpack_require__(/*! dll-reference vendor_19a5eb797fd6f4980c5d */ 2))(1);

/***/ }),
/* 2 */
/*!**********************************************!*\
  !*** external "vendor_19a5eb797fd6f4980c5d" ***!
  \**********************************************/
/*! dynamic exports */
/*! exports [maybe provided (runtime-defined)] [no usage info] */
/*! runtime requirements: module */
/***/ ((module) => {

"use strict";
module.exports = vendor_19a5eb797fd6f4980c5d;

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
/******/ 		var cachedModule = __webpack_module_cache__[moduleId];
/******/ 		if (cachedModule !== undefined) {
/******/ 			return cachedModule.exports;
/******/ 		}
/******/ 		// Create a new module (and put it into the cache)
/******/ 		var module = __webpack_module_cache__[moduleId] = {
/******/ 			// no module.id needed
/******/ 			// no module.loaded needed
/******/ 			exports: {}
/******/ 		};
/******/ 	
/******/ 		// Execute the module function
/******/ 		if (!(moduleId in __webpack_modules__)) {
/******/ 			delete __webpack_module_cache__[moduleId];
/******/ 			var e = new Error("Cannot find module '" + moduleId + "'");
/******/ 			e.code = 'MODULE_NOT_FOUND';
/******/ 			throw e;
/******/ 		}
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
/******/ 	
/******/ 	// startup
/******/ 	// Load entry module and return exports
/******/ 	// This entry module is referenced by other modules so it can't be inlined
/******/ 	var __webpack_exports__ = __webpack_require__(0);
/******/ 	
/******/ })()
;
```

# Info

## Unoptimized

```
vendor:
  asset vendor.js 2.53 KiB [emitted] (name: main)
  dll main 12 bytes [built] [code generated]
  ./vendor.js 26 bytes [built] [code generated]
  ./vendor2.js 27 bytes [built] [code generated]
  vendor (webpack X.X.X) compiled successfully

app:
  asset pageB.js 2.88 KiB [emitted] (name: pageB)
  asset pageA.js 2.86 KiB [emitted] (name: pageA)
  asset pageC.js 1.85 KiB [emitted] (name: pageC)
  cacheable modules 146 bytes
    ./pageA.js 60 bytes [built] [code generated]
    ./pageB.js 61 bytes [built] [code generated]
    ./pageC.js 25 bytes [built] [code generated]
  modules by path delegated ./*.js from dll-reference vendor_19a5eb797fd6f4980c5d 84 bytes
    delegated ./vendor.js from dll-reference vendor_19a5eb797fd6f4980c5d 42 bytes [built] [code generated]
    delegated ./vendor2.js from dll-reference vendor_19a5eb797fd6f4980c5d 42 bytes [built] [code generated]
  external "vendor_19a5eb797fd6f4980c5d" 42 bytes [built] [code generated]
  app (webpack X.X.X) compiled successfully
```

## Production mode

```
vendor:
  asset vendor.js 289 bytes [emitted] [minimized] (name: main)
  dll main 12 bytes [built] [code generated]
  ./vendor.js 26 bytes [built] [code generated]
  ./vendor2.js 27 bytes [built] [code generated]
  vendor (webpack X.X.X) compiled successfully

app:
  asset pageB.js 290 bytes [emitted] [minimized] (name: pageB)
  asset pageA.js 288 bytes [emitted] [minimized] (name: pageA)
  asset pageC.js 173 bytes [emitted] [minimized] (name: pageC)
  cacheable modules 146 bytes
    ./pageA.js 60 bytes [built] [code generated]
    ./pageB.js 61 bytes [built] [code generated]
    ./pageC.js 25 bytes [built] [code generated]
  modules by path delegated ./*.js from dll-reference vendor_85fc90c14a32958b9c55 84 bytes
    delegated ./vendor.js from dll-reference vendor_85fc90c14a32958b9c55 42 bytes [built] [code generated]
    delegated ./vendor2.js from dll-reference vendor_85fc90c14a32958b9c55 42 bytes [built] [code generated]
  external "vendor_85fc90c14a32958b9c55" 42 bytes [built] [code generated]
  app (webpack X.X.X) compiled successfully
```
