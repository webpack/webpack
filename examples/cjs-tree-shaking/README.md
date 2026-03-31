This example demonstrates how Webpack performs tree shaking for CommonJS modules.

# example.js

```javascript
// Property access pattern
const inc = require("./increment").increment;
var a = 1;
inc(a); // 2

// Destructuring assignment pattern
const { add } = require("./math");
add(a, 2); // 3

// Aliased destructuring
const { increment: inc2 } = require("./increment");
inc2(a); // 2
```

# increment.js

```javascript
const add = require("./math").add;
exports.increment = function increment(val) {
	return add(val, 1);
};
exports.incrementBy2 = function incrementBy2(val) {
	return add(val, 2);
};
exports.decrement = function decrement(val) {
	return add(val, 1);
};
```

# math.js

```javascript
exports.add = function add() {
	var sum = 0,
		i = 0,
		args = arguments,
		l = args.length;
	while (i < l) {
		sum += args[i++];
	}
	return sum;
};

exports.multiply = function multiply() {
	var product = 0,
		i = 0,
		args = arguments,
		l = args.length;
	while (i < l) {
		sum *= args[i++];
	}
	return sum;
};
```

# dist/output.js

```javascript
/******/ (() => { // webpackBootstrap
/******/ 	var __webpack_modules__ = ([
/* 0 */
/*!*****************!*\
  !*** ./math.js ***!
  \*****************/
/*! default exports */
/*! export add [provided] [used in main] [usage prevents renaming] */
/*! export multiply [provided] [unused] [renamed to l] */
/*! runtime requirements: __webpack_exports__ */
/***/ ((__unused_webpack_module, exports) => {

var __webpack_unused_export__;
exports.add = function add() {
	var sum = 0,
		i = 0,
		args = arguments,
		l = args.length;
	while (i < l) {
		sum += args[i++];
	}
	return sum;
};

__webpack_unused_export__ = function multiply() {
	var product = 0,
		i = 0,
		args = arguments,
		l = args.length;
	while (i < l) {
		sum *= args[i++];
	}
	return sum;
};


/***/ }),
/* 1 */
/*!**********************!*\
  !*** ./increment.js ***!
  \**********************/
/*! default exports */
/*! export decrement [provided] [unused] [renamed to K] */
/*! export increment [provided] [used in main] [usage prevents renaming] */
/*! export incrementBy2 [provided] [unused] [renamed to B] */
/*! runtime requirements: __webpack_require__, __webpack_exports__ */
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {

var __webpack_unused_export__;
const add = (__webpack_require__(/*! ./math */ 0).add);
exports.increment = function increment(val) {
	return add(val, 1);
};
__webpack_unused_export__ = function incrementBy2(val) {
	return add(val, 2);
};
__webpack_unused_export__ = function decrement(val) {
	return add(val, 1);
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
var __webpack_exports__ = {};
// This entry needs to be wrapped in an IIFE because it needs to be isolated against other modules in the chunk.
(() => {
/*!********************!*\
  !*** ./example.js ***!
  \********************/
/*! unknown exports (runtime-defined) */
/*! runtime requirements: __webpack_require__ */
// Property access pattern
const inc = (__webpack_require__(/*! ./increment */ 1).increment);
var a = 1;
inc(a); // 2

// Destructuring assignment pattern
const { add } = __webpack_require__(/*! ./math */ 0);
add(a, 2); // 3

// Aliased destructuring
const { increment: inc2 } = __webpack_require__(/*! ./increment */ 1);
inc2(a); // 2

})();

/******/ })()
;
```

# dist/output.js (production)

```javascript
/*! For license information please see output.js.LICENSE.txt */
(()=>{var n=[(n,r)=>{r.add=function(){for(var n=0,r=0,e=arguments,t=e.length;r<t;)n+=e[r++];return n}},(n,r,e)=>{const t=e(0).add;r.increment=function(n){return t(n,1)}}],r={};function e(t){var o=r[t];if(void 0!==o)return o.exports;var d=r[t]={exports:{}};if(!(t in n)){delete r[t];var i=new Error("Cannot find module '"+t+"'");throw i.code="MODULE_NOT_FOUND",i}return n[t](d,d.exports,e),d.exports}(0,e(1).increment)(1);const{add:t}=e(0);t(1,2);const{increment:o}=e(1);o(1)})();
```

# dist/without.js (same without tree shaking)

```javascript
/*! For license information please see without.js.LICENSE.txt */
(()=>{var n=[(n,r)=>{r.add=function(){for(var n=0,r=0,t=arguments,e=t.length;r<e;)n+=t[r++];return n},r.multiply=function(){for(var n=0,r=arguments,t=r.length;n<t;)sum*=r[n++];return sum}},(n,r,t)=>{const e=t(0).add;r.increment=function(n){return e(n,1)},r.incrementBy2=function(n){return e(n,2)},r.decrement=function(n){return e(n,1)}}],r={};function t(e){var o=r[e];if(void 0!==o)return o.exports;var u=r[e]={exports:{}};if(!(e in n)){delete r[e];var i=new Error("Cannot find module '"+e+"'");throw i.code="MODULE_NOT_FOUND",i}return n[e](u,u.exports,t),u.exports}(0,t(1).increment)(1);const{add:e}=t(0);e(1,2);const{increment:o}=t(1);o(1)})();
```

# Info

## Unoptimized

```
asset output.js 3.47 KiB [emitted] (name: main)
./example.js 289 bytes [built] [code generated]
./increment.js 261 bytes [built] [code generated]
./math.js 334 bytes [built] [code generated]
webpack X.X.X compiled successfully

asset without.js 3.61 KiB [emitted] (name: main)
./example.js 289 bytes [built] [code generated]
./increment.js 261 bytes [built] [code generated]
./math.js 334 bytes [built] [code generated]
webpack X.X.X compiled successfully
```

## Production mode

```
asset output.js 543 bytes [emitted] [minimized] (name: main) 1 related asset
./example.js 289 bytes [built] [code generated]
./increment.js 261 bytes [built] [code generated]
./math.js 334 bytes [built] [code generated]
webpack X.X.X compiled successfully

asset without.js 711 bytes [emitted] [minimized] (name: main) 1 related asset
./example.js 289 bytes [built] [code generated]
./increment.js 261 bytes [built] [code generated]
./math.js 334 bytes [built] [code generated]
webpack X.X.X compiled successfully
```
