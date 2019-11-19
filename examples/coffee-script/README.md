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
/*! exports [maybe provided (runtime-defined)] [no usage info] */
/*! runtime requirements: __webpack_require__, module */
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
/*! exports [maybe provided (runtime-defined)] [no usage info] */
/*! runtime requirements: module */
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
/******/ 		if(__webpack_module_cache__[moduleId]) {
/******/ 			return __webpack_module_cache__[moduleId].exports;
/******/ 		}
/******/ 		// Create a new module (and put it into the cache)
/******/ 		var module = __webpack_module_cache__[moduleId] = {
/******/ 			i: moduleId,
/******/ 			l: false,
/******/ 			exports: {}
/******/ 		};
/******/ 	
/******/ 		// Execute the module function
/******/ 		__webpack_modules__[moduleId](module, module.exports, __webpack_require__);
/******/ 	
/******/ 		// Flag the module as loaded
/******/ 		module.l = true;
/******/ 	
/******/ 		// Return the exports of the module
/******/ 		return module.exports;
/******/ 	}
/******/ 	
/************************************************************************/
```

</details>

``` js
!function() {
/*!********************!*\
  !*** ./example.js ***!
  \********************/
/*! exports [maybe provided (runtime-defined)] [no usage info] */
/*! runtime requirements: __webpack_require__ */
console.log(__webpack_require__(/*! ./cup1 */ 1));
}();
/******/ })()
;
```

# Info

## Unoptimized

```
Hash: 0a1b2c3d4e5f6a7b8c9d
Version: webpack 5.0.0-beta.6
    Asset      Size
output.js  2.09 KiB  [emitted]  [name: main]
Entrypoint main = output.js
chunk output.js (main) 206 bytes [entry] [rendered]
    > ./example.js main
 ./cup1.coffee 118 bytes [built]
     [used exports unknown]
     cjs require ./cup1 ./example.js 1:12-29
 ./cup2.coffee 57 bytes [built]
     [used exports unknown]
     cjs require ./cup2.coffee ./cup1.coffee 4:12-36
     cjs require ./cup2 ./cup1.coffee 5:9-26
 ./example.js 31 bytes [built]
     [used exports unknown]
     entry ./example.js main
```

## Production mode

```
Hash: 0a1b2c3d4e5f6a7b8c9d
Version: webpack 5.0.0-beta.6
    Asset       Size
output.js  294 bytes  [emitted]  [name: main]
Entrypoint main = output.js
chunk output.js (main) 206 bytes [entry] [rendered]
    > ./example.js main
 ./cup1.coffee 118 bytes [built]
     cjs require ./cup1 ./example.js 1:12-29
 ./cup2.coffee 57 bytes [built]
     cjs require ./cup2.coffee ./cup1.coffee 4:12-36
     cjs require ./cup2 ./cup1.coffee 5:9-26
 ./example.js 31 bytes [built]
     [no exports used]
     entry ./example.js main
```
