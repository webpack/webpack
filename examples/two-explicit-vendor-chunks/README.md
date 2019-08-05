# webpack.config.js

```javascript
var path = require("path");
module.exports = {
	// mode: "development || "production",
	entry: {
		vendor1: ["./vendor1"],
		vendor2: ["./vendor2"],
		pageA: "./pageA",
		pageB: "./pageB",
		pageC: "./pageC"
	},
	output: {
		path: path.join(__dirname, "dist"),
		filename: "[name].js"
	},
	optimization: {
		splitChunks: {
			cacheGroups: {
				vendor1: {
					name: "vendor1",
					test: "vendor1",
					enforce: true
				},
				vendor2: {
					name: "vendor2",
					test: "vendor2",
					enforce: true
				}
			}
		}
	}
};
```

# dist/vendor1.js

<details><summary><code>/******/ (function(modules) { /* webpackBootstrap */ })</code></summary>

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
```

</details>

```javascript
/******/ ([
/* 0 */
/*!********************!*\
  !*** ./vendor1.js ***!
  \********************/
/*! exports [maybe provided (runtime-defined)] [no usage info] */
/*! runtime requirements: module */
/***/ (function(module) {

module.exports = "Vendor1";

/***/ })
/******/ ]);
```

# dist/vendor2.js

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
/******/ 		return __webpack_require__(1);
/******/ 	};
/******/
/******/ 	// run startup
/******/ 	return startup();
/******/ })
/************************************************************************/
/******/ ([
/* 0 */
/*!********************!*\
  !*** ./vendor1.js ***!
  \********************/
/*! exports [maybe provided (runtime-defined)] [no usage info] */
/*! runtime requirements: module */
/***/ (function(module) {

module.exports = "Vendor1";

/***/ }),
/* 1 */
/*!********************!*\
  !*** ./vendor2.js ***!
  \********************/
/*! exports [maybe provided (runtime-defined)] [no usage info] */
/*! runtime requirements: module, __webpack_require__ */
/***/ (function(module, __unusedexports, __webpack_require__) {

module.exports = "Vendor2";
__webpack_require__(/*! ./vendor1 */ 0);


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
/******/ 		return __webpack_require__(2);
/******/ 	};
/******/
/******/ 	// run startup
/******/ 	return startup();
/******/ })
/************************************************************************/
/******/ ([
/* 0 */
/*!********************!*\
  !*** ./vendor1.js ***!
  \********************/
/*! exports [maybe provided (runtime-defined)] [no usage info] */
/*! runtime requirements: module */
/***/ (function(module) {

module.exports = "Vendor1";

/***/ }),
/* 1 */
/*!********************!*\
  !*** ./vendor2.js ***!
  \********************/
/*! exports [maybe provided (runtime-defined)] [no usage info] */
/*! runtime requirements: module, __webpack_require__ */
/***/ (function(module, __unusedexports, __webpack_require__) {

module.exports = "Vendor2";
__webpack_require__(/*! ./vendor1 */ 0);


/***/ }),
/* 2 */
/*!******************!*\
  !*** ./pageA.js ***!
  \******************/
/*! exports [maybe provided (runtime-defined)] [no usage info] */
/*! runtime requirements: module, __webpack_require__ */
/***/ (function(module, __unusedexports, __webpack_require__) {

module.exports = "pageA";
__webpack_require__(/*! ./vendor1 */ 0);
__webpack_require__(/*! ./vendor2 */ 1);


/***/ })
/******/ ]);
```

# Info

## Unoptimized

```
Hash: 0a1b2c3d4e5f6a7b8c9d
Version: webpack 5.0.0-alpha.18
     Asset      Size  Chunks             Chunk Names
  pageA.js  2.25 KiB     {2}  [emitted]  pageA
  pageB.js  1.52 KiB     {3}  [emitted]  pageB
  pageC.js  1.52 KiB     {4}  [emitted]  pageC
vendor1.js  1.52 KiB     {0}  [emitted]  vendor1
vendor2.js  1.87 KiB     {1}  [emitted]  vendor2
Entrypoint vendor1 = vendor1.js
Entrypoint vendor2 = vendor2.js
Entrypoint pageA = pageA.js
Entrypoint pageB = pageB.js
Entrypoint pageC = pageC.js
chunk {0} vendor1.js (vendor1) 27 bytes [entry] [rendered]
    > ./vendor1 vendor1
 [0] ./vendor1.js 27 bytes {0} {1} {2} [built]
     [used exports unknown]
     cjs require ./vendor1 [1] ./vendor2.js 2:0-20
     cjs require ./vendor1 [2] ./pageA.js 2:0-20
     entry ./vendor1 vendor1
chunk {1} vendor2.js (vendor2) 77 bytes [entry] [rendered]
    > ./vendor2 vendor2
 [0] ./vendor1.js 27 bytes {0} {1} {2} [built]
     [used exports unknown]
     cjs require ./vendor1 [1] ./vendor2.js 2:0-20
     cjs require ./vendor1 [2] ./pageA.js 2:0-20
     entry ./vendor1 vendor1
 [1] ./vendor2.js 50 bytes {1} {2} [built]
     [used exports unknown]
     cjs require ./vendor2 [2] ./pageA.js 3:0-20
     entry ./vendor2 vendor2
chunk {2} pageA.js (pageA) 147 bytes [entry] [rendered]
    > ./pageA pageA
 [0] ./vendor1.js 27 bytes {0} {1} {2} [built]
     [used exports unknown]
     cjs require ./vendor1 [1] ./vendor2.js 2:0-20
     cjs require ./vendor1 [2] ./pageA.js 2:0-20
     entry ./vendor1 vendor1
 [1] ./vendor2.js 50 bytes {1} {2} [built]
     [used exports unknown]
     cjs require ./vendor2 [2] ./pageA.js 3:0-20
     entry ./vendor2 vendor2
 [2] ./pageA.js 70 bytes {2} [built]
     [used exports unknown]
     entry ./pageA pageA
chunk {3} pageB.js (pageB) 25 bytes [entry] [rendered]
    > ./pageB pageB
 [3] ./pageB.js 25 bytes {3} [built]
     [used exports unknown]
     entry ./pageB pageB
chunk {4} pageC.js (pageC) 25 bytes [entry] [rendered]
    > ./pageC pageC
 [4] ./pageC.js 25 bytes {4} [built]
     [used exports unknown]
     entry ./pageC pageC
```

## Production mode

```
Hash: 0a1b2c3d4e5f6a7b8c9d
Version: webpack 5.0.0-alpha.18
     Asset       Size               Chunks             Chunk Names
  pageA.js  320 bytes  {374}, {424}, {971}  [emitted]  pageA
  pageB.js  217 bytes                {121}  [emitted]  pageB
  pageC.js  217 bytes                {178}  [emitted]  pageC
vendor1.js  219 bytes                {971}  [emitted]  vendor1
vendor2.js  267 bytes         {374}, {971}  [emitted]  vendor2
Entrypoint vendor1 = vendor1.js
Entrypoint vendor2 = vendor2.js
Entrypoint pageA = pageA.js
Entrypoint pageB = pageB.js
Entrypoint pageC = pageC.js
chunk {121} pageB.js (pageB) 25 bytes [entry] [rendered]
    > ./pageB pageB
 [588] ./pageB.js 25 bytes {121} [built]
       entry ./pageB pageB
chunk {178} pageC.js (pageC) 25 bytes [entry] [rendered]
    > ./pageC pageC
 [145] ./pageC.js 25 bytes {178} [built]
       entry ./pageC pageC
chunk {374} vendor2.js (vendor2) 77 bytes [entry] [rendered]
    > ./vendor2 vendor2
 [117] ./vendor2.js 50 bytes {374} {424} [built]
       cjs require ./vendor2 [366] ./pageA.js 3:0-20
       entry ./vendor2 vendor2
 [466] ./vendor1.js 27 bytes {374} {424} {971} [built]
       cjs require ./vendor1 [117] ./vendor2.js 2:0-20
       cjs require ./vendor1 [366] ./pageA.js 2:0-20
       entry ./vendor1 vendor1
chunk {424} pageA.js (pageA) 147 bytes [entry] [rendered]
    > ./pageA pageA
 [117] ./vendor2.js 50 bytes {374} {424} [built]
       cjs require ./vendor2 [366] ./pageA.js 3:0-20
       entry ./vendor2 vendor2
 [366] ./pageA.js 70 bytes {424} [built]
       entry ./pageA pageA
 [466] ./vendor1.js 27 bytes {374} {424} {971} [built]
       cjs require ./vendor1 [117] ./vendor2.js 2:0-20
       cjs require ./vendor1 [366] ./pageA.js 2:0-20
       entry ./vendor1 vendor1
chunk {971} vendor1.js (vendor1) 27 bytes [entry] [rendered]
    > ./vendor1 vendor1
 [466] ./vendor1.js 27 bytes {374} {424} {971} [built]
       cjs require ./vendor1 [117] ./vendor2.js 2:0-20
       cjs require ./vendor1 [366] ./pageA.js 2:0-20
       entry ./vendor1 vendor1
```
