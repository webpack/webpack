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
var vendor_8437ee63870abffcff70;vendor_8437ee63870abffcff70 =
/******/ (() => { // webpackBootstrap
/******/ 	var __webpack_modules__ = ([
/* 0 */
/*!****************!*\
  !*** dll main ***!
  \****************/
/*! unknown exports (runtime-defined) */
/*! exports [maybe provided (runtime-defined)] [maybe used (runtime-defined)] */
/*! runtime requirements: __webpack_require__, module */
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

module.exports = __webpack_require__;

/***/ }),
/* 1 */
/*!*******************!*\
  !*** ./vendor.js ***!
  \*******************/
/*! unknown exports (runtime-defined) */
/*! exports [maybe provided (runtime-defined)] [maybe used (runtime-defined)] */
/*! runtime requirements: module */
/***/ ((module) => {

module.exports = "Vendor";

/***/ }),
/* 2 */
/*!********************!*\
  !*** ./vendor2.js ***!
  \********************/
/*! unknown exports (runtime-defined) */
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
/*! exports [maybe provided (runtime-defined)] [maybe used (runtime-defined)] */
/*! runtime requirements: module, __webpack_require__ */
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

console.log(__webpack_require__(/*! ./vendor */ 1));
module.exports = "pageA";

/***/ }),
/* 1 */
/*!****************************************************************************!*\
  !*** delegated ./vendor.js from dll-reference vendor_8437ee63870abffcff70 ***!
  \****************************************************************************/
/*! unknown exports (runtime-defined) */
/*! exports [maybe provided (runtime-defined)] [maybe used (runtime-defined)] */
/*! runtime requirements: module, __webpack_require__ */
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

module.exports = (__webpack_require__(/*! dll-reference vendor_8437ee63870abffcff70 */ 2))(1);

/***/ }),
/* 2 */
/*!**********************************************!*\
  !*** external "vendor_8437ee63870abffcff70" ***!
  \**********************************************/
/*! unknown exports (runtime-defined) */
/*! exports [maybe provided (runtime-defined)] [maybe used (runtime-defined)] */
/*! runtime requirements: module */
/***/ ((module) => {

"use strict";
module.exports = vendor_8437ee63870abffcff70;

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
Hash: 0a1b2c3d4e5f6a7b8c9d
Version: webpack 5.0.0-beta.16
Child vendor:
    Hash: 0a1b2c3d4e5f6a7b8c9d
        Asset      Size
    vendor.js  2.27 KiB  [emitted]  [name: main]
    Entrypoint main = vendor.js
    chunk vendor.js (main) 65 bytes [entry] [rendered]
        > main
     ./vendor.js 26 bytes [built]
         cjs self exports reference ./vendor.js 1:0-14
         entry ./vendor dll main main[0]
     ./vendor2.js 27 bytes [built]
         cjs self exports reference ./vendor2.js 1:0-14
         entry ./vendor2 dll main main[1]
     dll main 12 bytes [built]
         dll entry
         used as library export
Child app:
    Hash: 0a1b2c3d4e5f6a7b8c9d
       Asset      Size
    pageA.js  2.63 KiB  [emitted]  [name: pageA]
    pageB.js  2.66 KiB  [emitted]  [name: pageB]
    pageC.js  1.52 KiB  [emitted]  [name: pageC]
    Entrypoint pageA = pageA.js
    Entrypoint pageB = pageB.js
    Entrypoint pageC = pageC.js
    chunk pageA.js (pageA) 143 bytes [entry] [rendered]
        > ./pageA pageA
     ./pageA.js 59 bytes [built]
         cjs self exports reference ./pageA.js 2:0-14
         entry ./pageA pageA
     delegated ./vendor.js from dll-reference vendor_8437ee63870abffcff70 42 bytes [built]
         cjs require ./vendor ./pageA.js 1:12-31
     external "vendor_8437ee63870abffcff70" 42 bytes [built]
         delegated source dll-reference vendor_8437ee63870abffcff70 delegated ./vendor.js from dll-reference vendor_8437ee63870abffcff70
         delegated source dll-reference vendor_8437ee63870abffcff70 delegated ./vendor2.js from dll-reference vendor_8437ee63870abffcff70
    chunk pageB.js (pageB) 144 bytes [entry] [rendered]
        > ./pageB pageB
     ./pageB.js 60 bytes [built]
         cjs self exports reference ./pageB.js 2:0-14
         entry ./pageB pageB
     delegated ./vendor2.js from dll-reference vendor_8437ee63870abffcff70 42 bytes [built]
         cjs require ./vendor2 ./pageB.js 1:12-32
     external "vendor_8437ee63870abffcff70" 42 bytes [built]
         delegated source dll-reference vendor_8437ee63870abffcff70 delegated ./vendor.js from dll-reference vendor_8437ee63870abffcff70
         delegated source dll-reference vendor_8437ee63870abffcff70 delegated ./vendor2.js from dll-reference vendor_8437ee63870abffcff70
    chunk pageC.js (pageC) 25 bytes [entry] [rendered]
        > ./pageC pageC
     ./pageC.js 25 bytes [built]
         cjs self exports reference ./pageC.js 1:0-14
         entry ./pageC pageC
```

## Production mode

```
Hash: 0a1b2c3d4e5f6a7b8c9d
Version: webpack 5.0.0-beta.16
Child vendor:
    Hash: 0a1b2c3d4e5f6a7b8c9d
        Asset       Size
    vendor.js  283 bytes  [emitted]  [name: main]
    Entrypoint main = vendor.js
    chunk vendor.js (main) 65 bytes [entry] [rendered]
        > main
     ./vendor.js 26 bytes [built]
         cjs self exports reference ./vendor.js 1:0-14
         entry ./vendor dll main main[0]
     ./vendor2.js 27 bytes [built]
         cjs self exports reference ./vendor2.js 1:0-14
         entry ./vendor2 dll main main[1]
     dll main 12 bytes [built]
         dll entry
         used as library export
Child app:
    Hash: 0a1b2c3d4e5f6a7b8c9d
       Asset       Size
    pageA.js  283 bytes  [emitted]  [name: pageA]
    pageB.js  283 bytes  [emitted]  [name: pageB]
    pageC.js  160 bytes  [emitted]  [name: pageC]
    Entrypoint pageA = pageA.js
    Entrypoint pageB = pageB.js
    Entrypoint pageC = pageC.js
    chunk pageB.js (pageB) 144 bytes [entry] [rendered]
        > ./pageB pageB
     ./pageB.js 60 bytes [built]
         cjs self exports reference ./pageB.js 2:0-14
         entry ./pageB pageB
     delegated ./vendor2.js from dll-reference vendor_cd36378c41b73a2600dc 42 bytes [built]
         cjs require ./vendor2 ./pageB.js 1:12-32
     external "vendor_cd36378c41b73a2600dc" 42 bytes [built]
         delegated source dll-reference vendor_cd36378c41b73a2600dc delegated ./vendor2.js from dll-reference vendor_cd36378c41b73a2600dc
         delegated source dll-reference vendor_cd36378c41b73a2600dc delegated ./vendor.js from dll-reference vendor_cd36378c41b73a2600dc
    chunk pageC.js (pageC) 25 bytes [entry] [rendered]
        > ./pageC pageC
     ./pageC.js 25 bytes [built]
         cjs self exports reference ./pageC.js 1:0-14
         entry ./pageC pageC
    chunk pageA.js (pageA) 143 bytes [entry] [rendered]
        > ./pageA pageA
     ./pageA.js 59 bytes [built]
         cjs self exports reference ./pageA.js 2:0-14
         entry ./pageA pageA
     delegated ./vendor.js from dll-reference vendor_cd36378c41b73a2600dc 42 bytes [built]
         cjs require ./vendor ./pageA.js 1:12-31
     external "vendor_cd36378c41b73a2600dc" 42 bytes [built]
         delegated source dll-reference vendor_cd36378c41b73a2600dc delegated ./vendor2.js from dll-reference vendor_cd36378c41b73a2600dc
         delegated source dll-reference vendor_cd36378c41b73a2600dc delegated ./vendor.js from dll-reference vendor_cd36378c41b73a2600dc
```
