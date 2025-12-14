# example.js

```javascript
const inc = require("./increment").increment;
var a = 1;
inc(a); // 2
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
/* 0 */,
/* 1 */
/*!**********************!*\
  !*** ./increment.js ***!
  \**********************/
/*! default exports */
/*! export decrement [provided] [unused] [renamed to Kt] */
/*! export increment [provided] [used in main] [renamed to GV] */
/*! export incrementBy2 [provided] [unused] [renamed to Bd] */
/*! runtime requirements: __webpack_require__, __webpack_exports__ */
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {

var __webpack_unused_export__;
const add = (__webpack_require__(/*! ./math */ 2)/* .add */ .W);
exports.GV = function increment(val) {
	return add(val, 1);
};
__webpack_unused_export__ = function incrementBy2(val) {
	return add(val, 2);
};
__webpack_unused_export__ = function decrement(val) {
	return add(val, 1);
};


/***/ }),
/* 2 */
/*!*****************!*\
  !*** ./math.js ***!
  \*****************/
/*! default exports */
/*! export add [provided] [used in main] [renamed to W] */
/*! export multiply [provided] [unused] [renamed to l] */
/*! runtime requirements: __webpack_exports__ */
/***/ ((__unused_webpack_module, exports) => {

var __webpack_unused_export__;
exports.W = function add() {
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
/******/ 		// Check if module exists (development only)
/******/ 		if (__webpack_modules__[moduleId] === undefined) {
/******/ 			var e = new Error("Cannot find module '" + moduleId + "'");
/******/ 			e.code = 'MODULE_NOT_FOUND';
/******/ 			throw e;
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
// This entry needs to be wrapped in an IIFE because it needs to be isolated against other modules in the chunk.
(() => {
/*!********************!*\
  !*** ./example.js ***!
  \********************/
/*! unknown exports (runtime-defined) */
/*! runtime requirements: __webpack_require__ */
const inc = (__webpack_require__(/*! ./increment */ 1)/* .increment */ .GV);
var a = 1;
inc(a); // 2

})();

/******/ })()
;
```

# dist/output.js (production)

```javascript
/*! For license information please see output.js.LICENSE.txt */
(()=>{var r=[,(r,n,o)=>{const t=o(2).W;n.GV=function(r){return t(r,1)}},(r,n)=>{n.W=function(){for(var r=0,n=0,o=arguments,t=o.length;n<t;)r+=o[n++];return r}}],n={};(0,function o(t){var e=n[t];if(void 0!==e)return e.exports;if(void 0===r[t]){var i=new Error("Cannot find module '"+t+"'");throw i.code="MODULE_NOT_FOUND",i}var u=n[t]={exports:{}};return r[t](u,u.exports,o),u.exports}(1).GV)(1)})();
```

# dist/without.js (same without tree shaking)

```javascript
/*! For license information please see without.js.LICENSE.txt */
(()=>{var r=[,(r,n,t)=>{const e=t(2).add;n.increment=function(r){return e(r,1)},n.incrementBy2=function(r){return e(r,2)},n.decrement=function(r){return e(r,1)}},(r,n)=>{n.add=function(){for(var r=0,n=0,t=arguments,e=t.length;n<e;)r+=t[n++];return r},n.multiply=function(){for(var r=0,n=arguments,t=n.length;r<t;)sum*=n[r++];return sum}}],n={};(0,function t(e){var o=n[e];if(void 0!==o)return o.exports;if(void 0===r[e]){var u=new Error("Cannot find module '"+e+"'");throw u.code="MODULE_NOT_FOUND",u}var i=n[e]={exports:{}};return r[e](i,i.exports,t),i.exports}(1).increment)(1)})();
```

# Info

## Unoptimized

```
asset output.js 3.2 KiB [emitted] (name: main)
chunk (runtime: main) output.js (main) 634 bytes [entry] [rendered]
  > ./example.js main
  dependent modules 564 bytes [dependent] 2 modules
  ./example.js 70 bytes [built] [code generated]
    [no exports used]
    entry ./example.js main
webpack X.X.X compiled successfully

asset without.js 3.34 KiB [emitted] (name: main)
chunk (runtime: main) without.js (main) 634 bytes [entry] [rendered]
  > ./example.js main
  dependent modules 564 bytes [dependent] 2 modules
  ./example.js 70 bytes [built] [code generated]
    [used exports unknown]
    entry ./example.js main
webpack X.X.X compiled successfully
```

## Production mode

```
asset output.js 463 bytes [emitted] [minimized] (name: main) 1 related asset
chunk (runtime: main) output.js (main) 634 bytes [entry] [rendered]
  > ./example.js main
  dependent modules 564 bytes [dependent] 2 modules
  ./example.js 70 bytes [built] [code generated]
    [no exports used]
    entry ./example.js main
webpack X.X.X compiled successfully

asset without.js 649 bytes [emitted] [minimized] (name: main) 1 related asset
chunk (runtime: main) without.js (main) 634 bytes [entry] [rendered]
  > ./example.js main
  dependent modules 564 bytes [dependent] 2 modules
  ./example.js 70 bytes [built] [code generated]
    [used exports unknown]
    entry ./example.js main
webpack X.X.X compiled successfully
```
