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
/*! export increment [provided] [no usage info] [missing usage info prevents renaming] */
/*! other exports [not provided] [no usage info] */
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
/*! export add [provided] [no usage info] [missing usage info prevents renaming] */
/*! other exports [not provided] [no usage info] */
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
asset output.js 2.34 KiB [emitted] (name: main)
chunk (runtime: main) output.js (main) 326 bytes [entry] [rendered]
  > ./example.js main
  dependent modules 254 bytes [dependent] 2 modules
  ./example.js 72 bytes [built] [code generated]
    [used exports unknown]
    entry ./example.js main
webpack 5.11.1 compiled successfully
```

## Production mode

```
asset output.js 296 bytes [emitted] [minimized] (name: main)
chunk (runtime: main) output.js (main) 326 bytes [entry] [rendered]
  > ./example.js main
  dependent modules 254 bytes [dependent] 2 modules
  ./example.js 72 bytes [built] [code generated]
    [no exports used]
    entry ./example.js main
webpack 5.11.1 compiled successfully
```
