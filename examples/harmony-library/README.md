# webpack.config.js

``` javascript
var path = require("path");
module.exports = {
	entry: "./example",
	output: {
		path: path.join(__dirname, "js"),
		filename: "MyLibrary.umd.js",
		library: "MyLibrary",
		libraryTarget: "umd"
	}
};
```

# js/MyLibrary.umd.js

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
})(this, function() {
```
<details><summary><code>return /******/ (function(modules) { /* webpackBootstrap */ })</code></summary>

``` js
return /******/ (function(modules) { // webpackBootstrap
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
/******/ 	// expose the modules object (__webpack_modules__)
/******/ 	__webpack_require__.m = modules;
/******/
/******/ 	// expose the module cache
/******/ 	__webpack_require__.c = installedModules;
/******/
/******/ 	// define getter function for harmony exports
/******/ 	__webpack_require__.d = function(exports, name, getter) {
/******/ 		if(!__webpack_require__.o(exports, name)) {
/******/ 			Object.defineProperty(exports, name, {
/******/ 				configurable: false,
/******/ 				enumerable: true,
/******/ 				get: getter
/******/ 			});
/******/ 		}
/******/ 	};
/******/
/******/ 	// getDefaultExport function for compatibility with non-harmony modules
/******/ 	__webpack_require__.n = function(module) {
/******/ 		var getter = module && module.__esModule ?
/******/ 			function getDefault() { return module['default']; } :
/******/ 			function getModuleExports() { return module; };
/******/ 		__webpack_require__.d(getter, 'a', getter);
/******/ 		return getter;
/******/ 	};
/******/
/******/ 	// Object.prototype.hasOwnProperty.call
/******/ 	__webpack_require__.o = function(object, property) { return Object.prototype.hasOwnProperty.call(object, property); };
/******/
/******/ 	// __webpack_public_path__
/******/ 	__webpack_require__.p = "js/";
/******/
/******/ 	// Load entry module and return exports
/******/ 	return __webpack_require__(__webpack_require__.s = 0);
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
/*! all exports used */
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
Object.defineProperty(__webpack_exports__, "__esModule", { value: true });
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "value", function() { return value; });
/* harmony export (immutable) */ __webpack_exports__["increment"] = increment;
var value = 0;
function increment() {
	value++;
}
/* harmony default export */ __webpack_exports__["default"] = ("MyLibrary");


/***/ })
/******/ ]);
});
```

# Info

## Uncompressed

```
Hash: 0b2bf5443af50d14e1e0
Version: webpack 3.5.1
           Asset     Size  Chunks             Chunk Names
MyLibrary.umd.js  3.45 kB       0  [emitted]  main
Entrypoint main = MyLibrary.umd.js
chunk    {0} MyLibrary.umd.js (main) 97 bytes [entry] [rendered]
    > main [0] ./example.js 
    [0] ./example.js 97 bytes {0} [built]
        [exports: value, increment, default]
```

## Minimized (uglify-js, no zip)

```
Hash: 0b2bf5443af50d14e1e0
Version: webpack 3.5.1
           Asset       Size  Chunks             Chunk Names
MyLibrary.umd.js  872 bytes       0  [emitted]  main
Entrypoint main = MyLibrary.umd.js
chunk    {0} MyLibrary.umd.js (main) 97 bytes [entry] [rendered]
    > main [0] ./example.js 
    [0] ./example.js 97 bytes {0} [built]
        [exports: value, increment, default]
```
