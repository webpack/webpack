This is a simple example that shows the usage of CommonJS.

The three files `example.js`, `increment.js` and `math.js` form a dependency chain. They use `require(dependency)` to declare dependencies.

You can see the output file that webpack creates by bundling them together in one file. Keep in mind that webpack add comments to make reading this file easier. These comments are removed when minimizing the file.

You can also see the info messages that webpack prints to console (for both normal and minimized build).

# example.js

```javascript
const inc = require('./increment').increment;
const a = 1;
inc(a); // 2
```

# increment.js

```javascript
const add = require('./math').add;
exports.increment = function(val) {
    return add(val, 1);
};
```

# math.js

```javascript
exports.add = function() {
    var sum = 0, i = 0, args = arguments, l = args.length;
    while (i < l) {
        sum += args[i++];
    }
    return sum;
};
```

# dist/output.js

```javascript
/******/ (() => { // webpackBootstrap
/******/ 	var __webpack_modules__ = ([
/* 0 */,
/* 1 */
/*!**********************!*\
  !*** ./increment.js ***!
  \**********************/
/*! default exports */
/*! export increment [provided] [used] [could be renamed] */
/*! other exports [not provided] [unused] */
/*! runtime requirements: __webpack_require__, __webpack_exports__ */
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {

const add = __webpack_require__(/*! ./math */ 2).add;
exports.increment = function(val) {
    return add(val, 1);
};


/***/ }),
/* 2 */
/*!*****************!*\
  !*** ./math.js ***!
  \*****************/
/*! default exports */
/*! export add [provided] [used] [could be renamed] */
/*! other exports [not provided] [unused] */
/*! runtime requirements: __webpack_exports__ */
/***/ ((__unused_webpack_module, exports) => {

exports.add = function() {
    var sum = 0, i = 0, args = arguments, l = args.length;
    while (i < l) {
        sum += args[i++];
    }
    return sum;
};

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
(() => {
/*!********************!*\
  !*** ./example.js ***!
  \********************/
/*! unknown exports (runtime-defined) */
/*! exports [maybe provided (runtime-defined)] [unused] */
/*! runtime requirements: __webpack_require__ */
const inc = __webpack_require__(/*! ./increment */ 1).increment;
const a = 1;
inc(a); // 2

})();

/******/ })()
;
```

# Info

## Unoptimized

```
Hash: 0a1b2c3d4e5f6a7b8c9d
Version: webpack 5.0.0-beta.16
    Asset      Size
output.js  2.33 KiB  [emitted]  [name: main]
Entrypoint main = output.js
chunk output.js (main) 326 bytes [entry] [rendered]
    > ./example.js main
 ./example.js 72 bytes [built]
     [no exports used]
     entry ./example.js main
 ./increment.js 98 bytes [built]
     [exports: increment]
     [all exports used]
     cjs full require ./increment ./example.js 1:12-44
 ./math.js 156 bytes [built]
     [exports: add]
     [all exports used]
     cjs full require ./math ./increment.js 1:12-33
```

## Production mode

```
Hash: 0a1b2c3d4e5f6a7b8c9d
Version: webpack 5.0.0-beta.16
    Asset       Size
output.js  297 bytes  [emitted]  [name: main]
Entrypoint main = output.js
chunk output.js (main) 326 bytes [entry] [rendered]
    > ./example.js main
 ./example.js 72 bytes [built]
     [no exports used]
     entry ./example.js main
 ./increment.js 98 bytes [built]
     [exports: increment]
     [all exports used]
     cjs full require ./increment ./example.js 1:12-44
 ./math.js 156 bytes [built]
     [exports: add]
     [all exports used]
     cjs full require ./math ./increment.js 1:12-33
```
