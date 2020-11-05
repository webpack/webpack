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
var vendor_39272dd5ebc95a6460c1;vendor_39272dd5ebc95a6460c1 =
/******/ (() => { // webpackBootstrap
/******/ 	var __webpack_modules__ = ([
/* 0 */
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

module.exports = __webpack_require__;

/***/ }),
/* 1 */
/***/ ((module) => {

module.exports = "Vendor";

/***/ }),
/* 2 */
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
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

console.log(__webpack_require__(1));
module.exports = "pageA";

/***/ }),
/* 1 */
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

module.exports = (__webpack_require__(2))(1);

/***/ }),
/* 2 */
/***/ ((module) => {

"use strict";
module.exports = vendor_39272dd5ebc95a6460c1;

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
  asset vendor.js 1.58 KiB [emitted] (name: main)
  dll main 12 bytes [built] [code generated]
  ./vendor.js 26 bytes [built] [code generated]
  ./vendor2.js 27 bytes [built] [code generated]
  vendor (webpack 5.4.0) compiled successfully

app:
  asset pageB.js 1.62 KiB [emitted] (name: pageB)
  asset pageA.js 1.61 KiB [emitted] (name: pageA)
  asset pageC.js 1.3 KiB [emitted] (name: pageC)
  cacheable modules 144 bytes
    ./pageA.js 59 bytes [built] [code generated]
    ./pageB.js 60 bytes [built] [code generated]
    ./pageC.js 25 bytes [built] [code generated]
  modules by path delegated ./*.js from dll-reference vendor_39272dd5ebc95a6460c1 84 bytes
    delegated ./vendor.js from dll-reference vendor_39272dd5ebc95a6460c1 42 bytes [built] [code generated]
    delegated ./vendor2.js from dll-reference vendor_39272dd5ebc95a6460c1 42 bytes [built] [code generated]
  external "vendor_39272dd5ebc95a6460c1" 42 bytes [built] [code generated]
  app (webpack 5.4.0) compiled successfully
```

## Production mode

```
vendor:
  asset vendor.js 283 bytes [emitted] [minimized] (name: main)
  dll main 12 bytes [built] [code generated]
  ./vendor.js 26 bytes [built] [code generated]
  ./vendor2.js 27 bytes [built] [code generated]
  vendor (webpack 5.4.0) compiled successfully

app:
  asset pageA.js 283 bytes [emitted] [minimized] (name: pageA)
  asset pageB.js 283 bytes [emitted] [minimized] (name: pageB)
  asset pageC.js 160 bytes [emitted] [minimized] (name: pageC)
  cacheable modules 144 bytes
    ./pageA.js 59 bytes [built] [code generated]
    ./pageB.js 60 bytes [built] [code generated]
    ./pageC.js 25 bytes [built] [code generated]
  modules by path delegated ./*.js from dll-reference vendor_1710817a0c4709e9bb9d 84 bytes
    delegated ./vendor.js from dll-reference vendor_1710817a0c4709e9bb9d 42 bytes [built] [code generated]
    delegated ./vendor2.js from dll-reference vendor_1710817a0c4709e9bb9d 42 bytes [built] [code generated]
  external "vendor_1710817a0c4709e9bb9d" 42 bytes [built] [code generated]
  app (webpack 5.4.0) compiled successfully
```
