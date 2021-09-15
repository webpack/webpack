# example.js

```javascript
console.log(require("./cup1"));
```

# cup1.coffee

```coffee-script
module.exports =
	cool: "stuff"
	answer: 42
	external: require "./cup2.coffee"
	again: require "./cup2"
```

# cup2.coffee

```coffee-script
console.log "yeah coffee-script"

module.exports = 42
```

# dist/output.js

```javascript
/******/ (() => { // webpackBootstrap
/******/ 	var __webpack_modules__ = ([
/* 0 */,
/* 1 */
/*!*********************!*\
  !*** ./cup1.coffee ***!
  \*********************/
/*! unknown exports (runtime-defined) */
/*! runtime requirements: module, __webpack_require__ */
/*! CommonJS bailout: module.exports is used directly at 1:0-14 */
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

module.exports = {
  cool: "stuff",
  answer: 42,
  external: __webpack_require__(/*! ./cup2.coffee */ 2),
  again: __webpack_require__(/*! ./cup2 */ 2)
};


/***/ }),
/* 2 */
/*!*********************!*\
  !*** ./cup2.coffee ***!
  \*********************/
/*! unknown exports (runtime-defined) */
/*! runtime requirements: module */
/*! CommonJS bailout: module.exports is used directly at 3:0-14 */
/***/ ((module) => {

console.log("yeah coffee-script");

module.exports = 42;


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
var __webpack_exports__ = {};
// This entry need to be wrapped in an IIFE because it need to be isolated against other modules in the chunk.
(() => {
/*!********************!*\
  !*** ./example.js ***!
  \********************/
/*! unknown exports (runtime-defined) */
/*! runtime requirements: __webpack_require__ */
console.log(__webpack_require__(/*! ./cup1 */ 1));
})();

/******/ })()
;
```

# Info

## Unoptimized

```
asset output.js 2.27 KiB [emitted] (name: main)
chunk (runtime: main) output.js (main) 206 bytes [entry] [rendered]
  > ./example.js main
  dependent modules 175 bytes [dependent] 2 modules
  ./example.js 31 bytes [built] [code generated]
    [used exports unknown]
    entry ./example.js main
webpack 5.51.1 compiled successfully
```

## Production mode

```
asset output.js 294 bytes [emitted] [minimized] (name: main)
chunk (runtime: main) output.js (main) 206 bytes [entry] [rendered]
  > ./example.js main
  dependent modules 175 bytes [dependent] 2 modules
  ./example.js 31 bytes [built] [code generated]
    [no exports used]
    entry ./example.js main
webpack 5.51.1 compiled successfully
```
