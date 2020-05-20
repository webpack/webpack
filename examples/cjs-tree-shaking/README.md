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
/*! export decrement [provided] [unused] [renamed to Mj] */
/*! export increment [provided] [used] [renamed to nP] */
/*! export incrementBy2 [provided] [unused] [renamed to pN] */
/*! other exports [not provided] [unused] */
/*! runtime requirements: __webpack_require__, __webpack_exports__ */
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {

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
/*! export add [provided] [used] [renamed to I] */
/*! export multiply [provided] [unused] [renamed to J] */
/*! other exports [not provided] [unused] */
/*! runtime requirements: __webpack_exports__ */
/***/ ((__unused_webpack_module, exports) => {

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
(() => {
/*!********************!*\
  !*** ./example.js ***!
  \********************/
/*! unknown exports (runtime-defined) */
/*! exports [maybe provided (runtime-defined)] [unused] */
/*! runtime requirements: __webpack_require__ */
const inc = __webpack_require__(/*! ./increment */ 1)/* .increment */ .nP;
var a = 1;
inc(a); // 2

})();

/******/ })()
;
```

# dist/output.js (production)

```javascript
/*! For license information please see output.js.LICENSE.txt */
(()=>{var r=[,(r,n,t)=>{const e=t(2).I;n.nP=function(r){return e(r,1)}},(r,n)=>{n.I=function(){for(var r=0,n=0,t=arguments,e=t.length;n<e;)r+=t[n++];return r}}],n={};function t(e){if(n[e])return n[e].exports;var o=n[e]={exports:{}};return r[e](o,o.exports,t),o.exports}(0,t(1).nP)(1)})();
```

# dist/without.js (same without tree shaking)

```javascript
/*! For license information please see without.js.LICENSE.txt */
(()=>{var n=[,(n,r,t)=>{const e=t(2).add;r.increment=function(n){return e(n,1)},r.incrementBy2=function(n){return e(n,2)},r.decrement=function(n){return e(n,1)}},(n,r)=>{r.add=function(){for(var n=0,r=0,t=arguments,e=t.length;r<e;)n+=t[r++];return n},r.multiply=function(){for(var n=0,r=arguments,t=r.length;n<t;)sum*=r[n++];return sum}}],r={};function t(e){if(r[e])return r[e].exports;var u=r[e]={exports:{}};return n[e](u,u.exports,t),u.exports}(0,t(1).increment)(1)})();
```

# Info

## Unoptimized

```
Hash: 0a1b2c3d4e5f6a7b8c9d
Version: webpack 5.0.0-beta.16
Child
    Hash: 0a1b2c3d4e5f6a7b8c9d
        Asset      Size
    output.js  2.89 KiB  [emitted]  [name: main]
    Entrypoint main = output.js
    chunk output.js (main) 634 bytes [entry] [rendered]
        > ./example.js main
     ./example.js 70 bytes [built]
         [no exports used]
         entry ./example.js main
     ./increment.js 251 bytes [built]
         [exports: decrement, increment, incrementBy2]
         [only some exports used: increment]
         cjs full require ./increment ./example.js 1:12-44
     ./math.js 313 bytes [built]
         [exports: add, multiply]
         [only some exports used: add]
         cjs full require ./math ./increment.js 1:12-33
Child
    Hash: 0a1b2c3d4e5f6a7b8c9d
         Asset      Size
    without.js  2.97 KiB  [emitted]  [name: main]
    Entrypoint main = without.js
    chunk without.js (main) 634 bytes [entry] [rendered]
        > ./example.js main
     ./example.js 70 bytes [built]
         [used exports unknown]
         entry ./example.js main
     ./increment.js 251 bytes [built]
         [exports: decrement, increment, incrementBy2]
         [used exports unknown]
         cjs full require ./increment ./example.js 1:12-44
     ./math.js 313 bytes [built]
         [exports: add, multiply]
         [used exports unknown]
         cjs full require ./math ./increment.js 1:12-33
```

## Production mode

```
Hash: 0a1b2c3d4e5f6a7b8c9d
Version: webpack 5.0.0-beta.16
Child
    Hash: 0a1b2c3d4e5f6a7b8c9d
                    Asset       Size
                output.js  352 bytes  [emitted]  [name: main]
    output.js.LICENSE.txt  745 bytes  [emitted]
    Entrypoint main = output.js
    chunk output.js (main) 634 bytes [entry] [rendered]
        > ./example.js main
     ./example.js 70 bytes [built]
         [no exports used]
         entry ./example.js main
     ./increment.js 251 bytes [built]
         [exports: decrement, increment, incrementBy2]
         [only some exports used: increment]
         cjs full require ./increment ./example.js 1:12-44
     ./math.js 313 bytes [built]
         [exports: add, multiply]
         [only some exports used: add]
         cjs full require ./math ./increment.js 1:12-33
Child
    Hash: 0a1b2c3d4e5f6a7b8c9d
                     Asset       Size
                without.js  538 bytes  [emitted]  [name: main]
    without.js.LICENSE.txt  908 bytes  [emitted]
    Entrypoint main = without.js
    chunk without.js (main) 634 bytes [entry] [rendered]
        > ./example.js main
     ./example.js 70 bytes [built]
         [used exports unknown]
         entry ./example.js main
     ./increment.js 251 bytes [built]
         [exports: decrement, increment, incrementBy2]
         [used exports unknown]
         cjs full require ./increment ./example.js 1:12-44
     ./math.js 313 bytes [built]
         [exports: add, multiply]
         [used exports unknown]
         cjs full require ./math ./increment.js 1:12-33
```
