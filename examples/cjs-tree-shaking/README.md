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
/******/ (function() { // webpackBootstrap
/******/ 	var __webpack_modules__ = ([
/* 0 */,
/* 1 */
/*!**********************!*\
  !*** ./increment.js ***!
  \**********************/
/*! default exports */
/*! export decrement [provided] [unused] [renamed to Mj] */
/*! export increment [provided] [used in main] [renamed to nP] */
/*! export incrementBy2 [provided] [unused] [renamed to pN] */
/*! runtime requirements: __webpack_require__, __webpack_exports__ */
/***/ (function(__unused_webpack_module, exports, __webpack_require__) {

var __webpack_unused_export__;
const add = __webpack_require__(/*! ./math */ 2)/* .add */ .I;
exports.nP = function increment(val) {
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
/*! export add [provided] [used in main] [renamed to I] */
/*! export multiply [provided] [unused] [renamed to J] */
/*! runtime requirements: __webpack_exports__ */
/***/ (function(__unused_webpack_module, exports) {

var __webpack_unused_export__;
exports.I = function add() {
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
!function() {
/*!********************!*\
  !*** ./example.js ***!
  \********************/
/*! unknown exports (runtime-defined) */
/*! runtime requirements: __webpack_require__ */
const inc = __webpack_require__(/*! ./increment */ 1)/* .increment */ .nP;
var a = 1;
inc(a); // 2

}();
/******/ })()
;
```

# dist/output.js (production)

```javascript
/*! For license information please see output.js.LICENSE.txt */
!function(){var n=[,function(n,r,t){const o=t(2).I;r.nP=function(n){return o(n,1)}},function(n,r){r.I=function(){for(var n=0,r=0,t=arguments,o=t.length;r<o;)n+=t[r++];return n}}],r={};(0,function t(o){if(r[o])return r[o].exports;var u=r[o]={exports:{}};return n[o](u,u.exports,t),u.exports}(1).nP)(1)}();
```

# dist/without.js (same without tree shaking)

```javascript
/*! For license information please see without.js.LICENSE.txt */
!function(){var n=[,function(n,r,t){const e=t(2).add;r.increment=function(n){return e(n,1)},r.incrementBy2=function(n){return e(n,2)},r.decrement=function(n){return e(n,1)}},function(n,r){r.add=function(){for(var n=0,r=0,t=arguments,e=t.length;r<e;)n+=t[r++];return n},r.multiply=function(){for(var n=0,r=arguments,t=r.length;n<t;)sum*=r[n++];return sum}}],r={};(0,function t(e){if(r[e])return r[e].exports;var u=r[e]={exports:{}};return n[e](u,u.exports,t),u.exports}(1).increment)(1)}();
```

# Info

## Unoptimized

```
asset output.js 2.78 KiB [emitted] (name: main)
chunk (runtime: main) output.js (main) 634 bytes [entry] [rendered]
  > ./example.js main
  dependent modules 564 bytes [dependent] 2 modules
  ./example.js 70 bytes [built] [code generated]
    [no exports used]
    entry ./example.js main
webpack 5.0.0-rc.0 compiled successfully

asset without.js 2.92 KiB [emitted] (name: main)
chunk without.js (main) 634 bytes [entry] [rendered]
  > ./example.js main
  dependent modules 564 bytes [dependent] 2 modules
  ./example.js 70 bytes [built] [code generated]
    [used exports unknown]
    entry ./example.js main
webpack 5.0.0-rc.0 compiled successfully
```

## Production mode

```
asset output.js 368 bytes [emitted] [minimized] (name: main) 1 related asset
chunk (runtime: main) output.js (main) 634 bytes [entry] [rendered]
  > ./example.js main
  dependent modules 564 bytes [dependent] 2 modules
  ./example.js 70 bytes [built] [code generated]
    [no exports used]
    entry ./example.js main
webpack 5.0.0-rc.0 compiled successfully

asset without.js 554 bytes [emitted] [minimized] (name: main) 1 related asset
chunk without.js (main) 634 bytes [entry] [rendered]
  > ./example.js main
  dependent modules 564 bytes [dependent] 2 modules
  ./example.js 70 bytes [built] [code generated]
    [used exports unknown]
    entry ./example.js main
webpack 5.0.0-rc.0 compiled successfully
```
