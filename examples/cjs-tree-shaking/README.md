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
/******/ 	const __webpack_module_cache__ = {};
/******/ 	
/******/ 	// The require function
/******/ 	function __webpack_require__(moduleId) {
/******/ 		// Check if module is in cache
/******/ 		const cachedModule = __webpack_module_cache__[moduleId];
/******/ 		if (cachedModule !== undefined) {
/******/ 			return cachedModule.exports;
/******/ 		}
/******/ 		// Create a new module (and put it into the cache)
/******/ 		const module = __webpack_module_cache__[moduleId] = {
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
let __webpack_exports__ = {};
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
(()=>{var n=[(n,t)=>{t.add=function(){for(var n=0,t=0,r=arguments,e=r.length;t<e;)n+=r[t++];return n}},(n,t,r)=>{const e=r(0).add;t.increment=function(n){return e(n,1)}}];const t={};function r(e){const o=t[e];if(void 0!==o)return o.exports;const c=t[e]={exports:{}};return n[e](c,c.exports,r),c.exports}(0,r(1).increment)(1);const{add:e}=r(0);e(1,2);const{increment:o}=r(1);o(1)})();
```

# dist/without.js (same without tree shaking)

```javascript
/*! For license information please see without.js.LICENSE.txt */
(()=>{var n=[(n,t)=>{t.add=function(){for(var n=0,t=0,r=arguments,e=r.length;t<e;)n+=r[t++];return n},t.multiply=function(){for(var n=0,t=arguments,r=t.length;n<r;)sum*=t[n++];return sum}},(n,t,r)=>{const e=r(0).add;t.increment=function(n){return e(n,1)},t.incrementBy2=function(n){return e(n,2)},t.decrement=function(n){return e(n,1)}}];const t={};function r(e){const o=t[e];if(void 0!==o)return o.exports;const c=t[e]={exports:{}};return n[e](c,c.exports,r),c.exports}(0,r(1).increment)(1);const{add:e}=r(0);e(1,2);const{increment:o}=r(1);o(1)})();
```

# Info

## Unoptimized

```
asset output.js 3.18 KiB [emitted] (name: main)
chunk (runtime: main) output.js (main) 841 bytes [entry] [rendered]
  > ./example.js main
  dependent modules 564 bytes [dependent] 2 modules
  ./example.js 277 bytes [built] [code generated]
    [no exports used]
    entry ./example.js main
webpack X.X.X compiled successfully

asset without.js 3.32 KiB [emitted] (name: main)
chunk (runtime: main) without.js (main) 841 bytes [entry] [rendered]
  > ./example.js main
  dependent modules 564 bytes [dependent] 2 modules
  ./example.js 277 bytes [built] [code generated]
    [used exports unknown]
    entry ./example.js main
webpack X.X.X compiled successfully
```

## Production mode

```
asset output.js 447 bytes [emitted] [minimized] (name: main) 1 related asset
chunk (runtime: main) output.js (main) 841 bytes [entry] [rendered]
  > ./example.js main
  dependent modules 564 bytes [dependent] 2 modules
  ./example.js 277 bytes [built] [code generated]
    [no exports used]
    entry ./example.js main
webpack X.X.X compiled successfully

asset without.js 615 bytes [emitted] [minimized] (name: main) 1 related asset
chunk (runtime: main) without.js (main) 841 bytes [entry] [rendered]
  > ./example.js main
  dependent modules 564 bytes [dependent] 2 modules
  ./example.js 277 bytes [built] [code generated]
    [used exports unknown]
    entry ./example.js main
webpack X.X.X compiled successfully
```
