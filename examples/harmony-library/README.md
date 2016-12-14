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
<details><summary>`return /******/ (function(modules) { /* webpackBootstrap */ })`</summary>
``` js
return /******/ (function(modules) { // webpackBootstrap
/******/ 	// The module cache
/******/ 	var installedModules = {};

/******/ 	// The require function
/******/ 	function __webpack_require__(moduleId) {

/******/ 		// Check if module is in cache
/******/ 		if(installedModules[moduleId])
/******/ 			return installedModules[moduleId].exports;

/******/ 		// Create a new module (and put it into the cache)
/******/ 		var module = installedModules[moduleId] = {
/******/ 			i: moduleId,
/******/ 			l: false,
/******/ 			exports: {}
/******/ 		};

/******/ 		// Execute the module function
/******/ 		modules[moduleId].call(module.exports, module, module.exports, __webpack_require__);

/******/ 		// Flag the module as loaded
/******/ 		module.l = true;

/******/ 		// Return the exports of the module
/******/ 		return module.exports;
/******/ 	}


/******/ 	// expose the modules object (__webpack_modules__)
/******/ 	__webpack_require__.m = modules;

/******/ 	// expose the module cache
/******/ 	__webpack_require__.c = installedModules;

/******/ 	// identity function for calling harmony imports with the correct context
/******/ 	__webpack_require__.i = function(value) { return value; };

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

/******/ 	// getDefaultExport function for compatibility with non-harmony modules
/******/ 	__webpack_require__.n = function(module) {
/******/ 		var getter = module && module.__esModule ?
/******/ 			function getDefault() { return module['default']; } :
/******/ 			function getModuleExports() { return module; };
/******/ 		__webpack_require__.d(getter, 'a', getter);
/******/ 		return getter;
/******/ 	};

/******/ 	// Object.prototype.hasOwnProperty.call
/******/ 	__webpack_require__.o = function(object, property) { return Object.prototype.hasOwnProperty.call(object, property); };

/******/ 	// __webpack_public_path__
/******/ 	__webpack_require__.p = "js/";

/******/ 	// Load entry module and return exports
/******/ 	return __webpack_require__(__webpack_require__.s = 0);
/******/ })
/************************************************************************/
```
</details>
``` js
/******/ ([
/* 0 */
/* exports provided: value, increment, default */
/* all exports used */
/*!********************!*\
  !*** ./example.js ***!
  \********************/
/***/ function(module, exports, __webpack_require__) {

"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
/* harmony export (binding) */ __webpack_require__.d(exports, "value", function() { return value; });
/* harmony export (immutable) */ exports["increment"] = increment;
var value = 0;
function increment() {
	value++;
}
/* harmony default export */ exports["default"] = "MyLibrary";


/***/ }
/******/ ]);
});
```

# Info

## Uncompressed

```
Hash: 0f7e47813bc19e17e857
Version: webpack 2.2.0-rc.2
           Asset     Size  Chunks             Chunk Names
MyLibrary.umd.js  3.42 kB       0  [emitted]  main
Entrypoint main = MyLibrary.umd.js
chunk    {0} MyLibrary.umd.js (main) 97 bytes [entry] [rendered]
    > main [0] ./example.js 
    [0] ./example.js 97 bytes {0} [built]
        [exports: value, increment, default]
```

## Minimized (uglify-js, no zip)

```
Hash: 0f7e47813bc19e17e857
Version: webpack 2.2.0-rc.2
           Asset       Size  Chunks             Chunk Names
MyLibrary.umd.js  898 bytes       0  [emitted]  main
Entrypoint main = MyLibrary.umd.js
chunk    {0} MyLibrary.umd.js (main) 97 bytes [entry] [rendered]
    > main [0] ./example.js 
    [0] ./example.js 97 bytes {0} [built]
        [exports: value, increment, default]
```
