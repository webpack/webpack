# example.js

``` javascript
var a = require("./a");

// get module id
var aId = require.resolve("./a.js");

// clear module in require.cache
delete require.cache[aId];

// require module again, it should be reexecuted
var a2 = require("./a");

// verify it
if(a == a2) throw new Error("Cache clear failed :(");
```

# a.js


``` javascript
module.exports = Math.random();
```

# dist/output.js

``` javascript
/******/ (() => { // webpackBootstrap
/******/ 	var __webpack_modules__ = ([
/* 0 */
/*!********************!*\
  !*** ./example.js ***!
  \********************/
/*! unknown exports (runtime-defined) */
/*! runtime requirements: __webpack_require__, __webpack_require__.c, module.id, module.loaded, __webpack_require__.*, module */
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

var a = __webpack_require__(/*! ./a */ 1);

// get module id
var aId = /*require.resolve*/(/*! ./a.js */ 1);

// clear module in require.cache
delete __webpack_require__.c[aId];

// require module again, it should be reexecuted
var a2 = __webpack_require__(/*! ./a */ 1);

// verify it
if(a == a2) throw new Error("Cache clear failed :(");

/***/ }),
/* 1 */
/*!**************!*\
  !*** ./a.js ***!
  \**************/
/*! unknown exports (runtime-defined) */
/*! runtime requirements: module */
/*! CommonJS bailout: module.exports is used directly at 1:0-14 */
/***/ ((module) => {

module.exports = Math.random();

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
/******/ 			id: moduleId,
/******/ 			loaded: false,
/******/ 			exports: {}
/******/ 		};
/******/ 	
/******/ 		// Execute the module function
/******/ 		__webpack_modules__[moduleId](module, module.exports, __webpack_require__);
/******/ 	
/******/ 		// Flag the module as loaded
/******/ 		module.loaded = true;
/******/ 	
/******/ 		// Return the exports of the module
/******/ 		return module.exports;
/******/ 	}
/******/ 	
/******/ 	// expose the module cache
/******/ 	__webpack_require__.c = __webpack_module_cache__;
/******/ 	
/************************************************************************/
```

</details>

``` js
/******/ 	// module cache are used so entry inlining is disabled
/******/ 	// startup
/******/ 	// Load entry module
/******/ 	__webpack_require__(0);
/******/ })()
;
```

# Info

## Unoptimized

```
asset output.js 2.31 KiB [emitted] (name: main)
chunk (runtime: main) output.js (main) 313 bytes [entry] [rendered]
  > ./example.js main
  dependent modules 31 bytes [dependent] 1 module
  ./example.js 282 bytes [built] [code generated]
    [used exports unknown]
    entry ./example.js main
webpack 5.11.1 compiled successfully
```

## Production mode

```
asset output.js 297 bytes [emitted] [minimized] (name: main)
chunk (runtime: main) output.js (main) 313 bytes [entry] [rendered]
  > ./example.js main
  dependent modules 31 bytes [dependent] 1 module
  ./example.js 282 bytes [built] [code generated]
    [no exports used]
    entry ./example.js main
webpack 5.11.1 compiled successfully
```
