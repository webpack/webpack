# example.js

```javascript
console.log(require("./index"));
```

# index.ts

```typescript
const myName: string = "Junya";
const age: number = 22;

function getArray<T>(...args: T[]): T[] {
	return [...args];
}

console.log(getArray("foo", "bar"));
console.log(getArray(1, 2, 3));
```

# dist/output.js

<details><summary><code>/******/ (function(modules) { /* webpackBootstrap */ })</code></summary>

```javascript
/******/ (function(modules, runtime) { // webpackBootstrap
/******/ 	"use strict";
/******/ 	// The module cache
/******/ 	var installedModules = {};
/******/
/******/ 	// The require function
/******/ 	function __webpack_require__(moduleId) {
/******/
/******/ 		// Check if module is in cache
/******/ 		if(installedModules[moduleId]) {
/******/ 			return installedModules[moduleId].exports;
/******/ 		}
/******/ 		// Create a new module (and put it into the cache)
/******/ 		var module = installedModules[moduleId] = {
/******/ 			i: moduleId,
/******/ 			l: false,
/******/ 			exports: {}
/******/ 		};
/******/
/******/ 		// Execute the module function
/******/ 		modules[moduleId].call(module.exports, module, module.exports, __webpack_require__);
/******/
/******/ 		// Flag the module as loaded
/******/ 		module.l = true;
/******/
/******/ 		// Return the exports of the module
/******/ 		return module.exports;
/******/ 	}
/******/
/******/
/******/
/******/ 	// the startup function
/******/ 	function startup() {
/******/ 		// Load entry module and return exports
/******/ 		return __webpack_require__(0);
/******/ 	};
/******/
/******/ 	// run startup
/******/ 	return startup();
/******/ })
/************************************************************************/
```

</details>

```javascript
/******/ ([
/* 0 */
/*!********************!*\
  !*** ./example.js ***!
  \********************/
/*! exports [maybe provided (runtime-defined)] [no usage info] */
/*! runtime requirements: __webpack_require__ */
/***/ (function(__unusedmodule, __unusedexports, __webpack_require__) {

console.log(__webpack_require__(/*! ./index */ 1));


/***/ }),
/* 1 */
/*!******************!*\
  !*** ./index.ts ***!
  \******************/
/*! exports [maybe provided (runtime-defined)] [no usage info] */
/*! runtime requirements:  */
/***/ (function() {

"use strict";

const myName = "Junya";
const age = 22;
function getArray(...args) {
    return [...args];
}
console.log(getArray("foo", "bar"));
console.log(getArray(1, 2, 3));


/***/ })
/******/ ]);
```

# Info

## Unoptimized

```
Hash: 0a1b2c3d4e5f6a7b8c9d
Version: webpack 5.0.0-alpha.16
    Asset      Size  Chunks             Chunk Names
output.js  1.99 KiB     {0}  [emitted]  main
Entrypoint main = output.js
chunk {0} output.js (main) 217 bytes [entry] [rendered]
    > ./example.js main
 [0] ./example.js 33 bytes {0} [built]
     [used exports unknown]
     entry ./example.js main
 [1] ./index.ts 184 bytes {0} [built]
     [used exports unknown]
     cjs require ./index [0] ./example.js 1:12-30
```

## Production mode

```
Hash: 0a1b2c3d4e5f6a7b8c9d
Version: webpack 5.0.0-alpha.16
    Asset       Size  Chunks             Chunk Names
output.js  332 bytes   {179}  [emitted]  main
Entrypoint main = output.js
chunk {179} output.js (main) 217 bytes [entry] [rendered]
    > ./example.js main
 [144] ./example.js 33 bytes {179} [built]
       entry ./example.js main
 [862] ./index.ts 184 bytes {179} [built]
       cjs require ./index [144] ./example.js 1:12-30
```
