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

```javascript
/******/ (() => { // webpackBootstrap
/******/ 	var __webpack_modules__ = ([
/* 0 */
/*!********************!*\
  !*** ./vendor1.js ***!
  \********************/
/*! unknown exports (runtime-defined) */
/*! exports [maybe provided (runtime-defined)] [maybe used (runtime-defined)] */
/*! runtime requirements: module */
/***/ ((module) => {

module.exports = "Vendor1";

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

# dist/vendor2.js

```javascript
/******/ (() => { // webpackBootstrap
/******/ 	var __webpack_modules__ = ([
/* 0 */
/*!********************!*\
  !*** ./vendor1.js ***!
  \********************/
/*! unknown exports (runtime-defined) */
/*! exports [maybe provided (runtime-defined)] [maybe used (runtime-defined)] */
/*! runtime requirements: module */
/***/ ((module) => {

module.exports = "Vendor1";

/***/ }),
/* 1 */
/*!********************!*\
  !*** ./vendor2.js ***!
  \********************/
/*! unknown exports (runtime-defined) */
/*! exports [maybe provided (runtime-defined)] [maybe used (runtime-defined)] */
/*! runtime requirements: module, __webpack_require__ */
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

module.exports = "Vendor2";
__webpack_require__(/*! ./vendor1 */ 0);


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
/******/ 	__webpack_require__(1);
/******/ })()
;
```

# dist/pageA.js

```javascript
/******/ (() => { // webpackBootstrap
/******/ 	var __webpack_modules__ = ([
/* 0 */
/*!********************!*\
  !*** ./vendor1.js ***!
  \********************/
/*! unknown exports (runtime-defined) */
/*! exports [maybe provided (runtime-defined)] [maybe used (runtime-defined)] */
/*! runtime requirements: module */
/***/ ((module) => {

module.exports = "Vendor1";

/***/ }),
/* 1 */
/*!********************!*\
  !*** ./vendor2.js ***!
  \********************/
/*! unknown exports (runtime-defined) */
/*! exports [maybe provided (runtime-defined)] [maybe used (runtime-defined)] */
/*! runtime requirements: module, __webpack_require__ */
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

module.exports = "Vendor2";
__webpack_require__(/*! ./vendor1 */ 0);


/***/ }),
/* 2 */
/*!******************!*\
  !*** ./pageA.js ***!
  \******************/
/*! unknown exports (runtime-defined) */
/*! exports [maybe provided (runtime-defined)] [maybe used (runtime-defined)] */
/*! runtime requirements: module, __webpack_require__ */
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

module.exports = "pageA";
__webpack_require__(/*! ./vendor1 */ 0);
__webpack_require__(/*! ./vendor2 */ 1);


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
/******/ 	__webpack_require__(2);
/******/ })()
;
```

# Info

## Unoptimized

```
Hash: 0a1b2c3d4e5f6a7b8c9d
Version: webpack 5.0.0-beta.16
     Asset      Size
  pageA.js  2.37 KiB  [emitted]  [name: pageA]
  pageB.js  1.52 KiB  [emitted]  [name: pageB]
  pageC.js  1.52 KiB  [emitted]  [name: pageC]
vendor1.js  1.53 KiB  [emitted]  [name: vendor1]
vendor2.js  1.93 KiB  [emitted]  [name: vendor2]
Entrypoint vendor1 = vendor1.js
Entrypoint vendor2 = vendor2.js
Entrypoint pageA = pageA.js
Entrypoint pageB = pageB.js
Entrypoint pageC = pageC.js
chunk vendor1.js (vendor1) 27 bytes [entry] [rendered]
    > ./vendor1 vendor1
 ./vendor1.js 27 bytes [built]
     cjs require ./vendor1 ./pageA.js 2:0-20
     cjs self exports reference ./vendor1.js 1:0-14
     cjs require ./vendor1 ./vendor2.js 2:0-20
     entry ./vendor1 vendor1
chunk vendor2.js (vendor2) 77 bytes [entry] [rendered]
    > ./vendor2 vendor2
 ./vendor1.js 27 bytes [built]
     cjs require ./vendor1 ./pageA.js 2:0-20
     cjs self exports reference ./vendor1.js 1:0-14
     cjs require ./vendor1 ./vendor2.js 2:0-20
     entry ./vendor1 vendor1
 ./vendor2.js 50 bytes [built]
     cjs require ./vendor2 ./pageA.js 3:0-20
     cjs self exports reference ./vendor2.js 1:0-14
     entry ./vendor2 vendor2
chunk pageA.js (pageA) 147 bytes [entry] [rendered]
    > ./pageA pageA
 ./pageA.js 70 bytes [built]
     cjs self exports reference ./pageA.js 1:0-14
     entry ./pageA pageA
 ./vendor1.js 27 bytes [built]
     cjs require ./vendor1 ./pageA.js 2:0-20
     cjs self exports reference ./vendor1.js 1:0-14
     cjs require ./vendor1 ./vendor2.js 2:0-20
     entry ./vendor1 vendor1
 ./vendor2.js 50 bytes [built]
     cjs require ./vendor2 ./pageA.js 3:0-20
     cjs self exports reference ./vendor2.js 1:0-14
     entry ./vendor2 vendor2
chunk pageB.js (pageB) 25 bytes [entry] [rendered]
    > ./pageB pageB
 ./pageB.js 25 bytes [built]
     cjs self exports reference ./pageB.js 1:0-14
     entry ./pageB pageB
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
     Asset       Size
  pageA.js  251 bytes  [emitted]  [name: pageA]
  pageB.js  160 bytes  [emitted]  [name: pageB]
  pageC.js  160 bytes  [emitted]  [name: pageC]
vendor1.js  162 bytes  [emitted]  [name: vendor1]
vendor2.js  204 bytes  [emitted]  [name: vendor2]
Entrypoint vendor1 = vendor1.js
Entrypoint vendor2 = vendor2.js
Entrypoint pageA = pageA.js
Entrypoint pageB = pageB.js
Entrypoint pageC = pageC.js
chunk pageB.js (pageB) 25 bytes [entry] [rendered]
    > ./pageB pageB
 ./pageB.js 25 bytes [built]
     cjs self exports reference ./pageB.js 1:0-14
     entry ./pageB pageB
chunk pageC.js (pageC) 25 bytes [entry] [rendered]
    > ./pageC pageC
 ./pageC.js 25 bytes [built]
     cjs self exports reference ./pageC.js 1:0-14
     entry ./pageC pageC
chunk vendor2.js (vendor2) 77 bytes [entry] [rendered]
    > ./vendor2 vendor2
 ./vendor1.js 27 bytes [built]
     cjs require ./vendor1 ./pageA.js 2:0-20
     cjs self exports reference ./vendor1.js 1:0-14
     cjs require ./vendor1 ./vendor2.js 2:0-20
     entry ./vendor1 vendor1
 ./vendor2.js 50 bytes [built]
     cjs require ./vendor2 ./pageA.js 3:0-20
     cjs self exports reference ./vendor2.js 1:0-14
     entry ./vendor2 vendor2
chunk pageA.js (pageA) 147 bytes [entry] [rendered]
    > ./pageA pageA
 ./pageA.js 70 bytes [built]
     cjs self exports reference ./pageA.js 1:0-14
     entry ./pageA pageA
 ./vendor1.js 27 bytes [built]
     cjs require ./vendor1 ./pageA.js 2:0-20
     cjs self exports reference ./vendor1.js 1:0-14
     cjs require ./vendor1 ./vendor2.js 2:0-20
     entry ./vendor1 vendor1
 ./vendor2.js 50 bytes [built]
     cjs require ./vendor2 ./pageA.js 3:0-20
     cjs self exports reference ./vendor2.js 1:0-14
     entry ./vendor2 vendor2
chunk vendor1.js (vendor1) 27 bytes [entry] [rendered]
    > ./vendor1 vendor1
 ./vendor1.js 27 bytes [built]
     cjs require ./vendor1 ./pageA.js 2:0-20
     cjs self exports reference ./vendor1.js 1:0-14
     cjs require ./vendor1 ./vendor2.js 2:0-20
     entry ./vendor1 vendor1
```
