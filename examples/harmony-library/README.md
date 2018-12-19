# webpack.config.js

``` javascript
var path = require("path");
module.exports = {
	// mode: "development || "production",
	entry: "./example",
	output: {
		path: path.join(__dirname, "dist"),
		filename: "MyLibrary.umd.js",
		library: "MyLibrary",
		libraryTarget: "umd"
	}
};
```

# dist/MyLibrary.umd.js

``` javascript
(function webpackUniversalModuleDefinition(root, factory) {
	if(typeof exports === 'object' && typeof module === 'object')
		module.exports = factory();
	else if(typeof define === 'function' && define.amd)
		define([], factory);
	else if(typeof exports === 'object')
		exports["MyLibrary"] = factory();
	else
		root["MyLibrary"] = factory();
})(window, function() {
```
<details><summary><code>return /******/ (function(modules) { /* webpackBootstrap */ })</code></summary>

``` js
return /******/ (function(modules, runtime) { // webpackBootstrap
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
/******/ 	// initialize runtime
/******/ 	runtime(__webpack_require__);
/******/
/******/ 	// Load entry module and return exports
/******/ 	return __webpack_require__(0);
/******/ })
/************************************************************************/
```

</details>

``` js
/******/ ([
/* 0 */
/*!********************!*\
  !*** ./example.js ***!
  \********************/
/*! exports provided: value, increment, default */
/*! runtime requirements: __webpack_require__.r, __webpack_exports__, __webpack_require__.d, __webpack_require__ */
/***/ (function(__unusedmodule, __webpack_exports__, __webpack_require__) {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "value", function() { return value; });
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "increment", function() { return increment; });
var value = 0;
function increment() {
	value++;
}
/* harmony default export */ __webpack_exports__["default"] = ("MyLibrary");


/***/ })
/******/ ],
/******/ function(__webpack_require__) { // webpackRuntimeModules
/******/ 	"use strict";
/******/ 
/******/ 	/* webpack/runtime/make namespace object */
/******/ 	!function() {
/******/ 		// define __esModule on exports
/******/ 		__webpack_require__.r = function(exports) {
/******/ 			if(typeof Symbol !== 'undefined' && Symbol.toStringTag) {
/******/ 				Object.defineProperty(exports, Symbol.toStringTag, { value: 'Module' });
/******/ 			}
/******/ 			Object.defineProperty(exports, '__esModule', { value: true });
/******/ 		};
/******/ 	}();
/******/ 	
/******/ 	/* webpack/runtime/define property getter */
/******/ 	!function() {
/******/ 		// define getter function for harmony exports
/******/ 		var hasOwnProperty = Object.prototype.hasOwnProperty;
/******/ 		__webpack_require__.d = function(exports, name, getter) {
/******/ 			if(!hasOwnProperty.call(exports, name)) {
/******/ 				Object.defineProperty(exports, name, { enumerable: true, get: getter });
/******/ 			}
/******/ 		};
/******/ 	}();
/******/ 	
/******/ }
);
});
```

# Info

## Unoptimized

```
Hash: 0a1b2c3d4e5f6a7b8c9d
Version: webpack 5.0.0-next
           Asset      Size  Chunks             Chunk Names
MyLibrary.umd.js  3.34 KiB     {0}  [emitted]  main
Entrypoint main = MyLibrary.umd.js
chunk {0} MyLibrary.umd.js (main) 92 bytes (javascript) 560 bytes (runtime) [entry] [rendered]
    > ./example main
 [0] ./example.js 92 bytes {0} [built]
     [exports: value, increment, default]
     [used exports unknown]
     entry ./example main
     + 2 hidden chunk modules
```

## Production mode

```
Hash: 0a1b2c3d4e5f6a7b8c9d
Version: webpack 5.0.0-next
           Asset       Size  Chunks             Chunk Names
MyLibrary.umd.js  892 bytes   {404}  [emitted]  main
Entrypoint main = MyLibrary.umd.js
chunk {404} MyLibrary.umd.js (main) 92 bytes (javascript) 560 bytes (runtime) [entry] [rendered]
    > ./example main
 [275] ./example.js 92 bytes {404} [built]
       [exports: value, increment, default]
       entry ./example main
     + 2 hidden chunk modules
```
