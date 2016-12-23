This example demonstrates how to build a complex library with webpack. The library consist of multiple parts that are usable on its own and together.

When using this library with script tags it exports itself to the namespace `MyLibrary` and each part to a property in this namespace (`MyLibrary.alpha` and `MyLibrary.beta`). When consuming the library with CommonsJs or AMD it just export each part.

We are using multiple entry points (`entry` option) to build every part of the library as separate output file. The `output.filename` option contains `[name]` to give each output file a different name.

We are using the `libraryTarget` option to generate a UMD ([Universal Module Definition](https://github.com/umdjs/umd)) module that is consumable in CommonsJs, AMD and with script tags. The `library` option defines the namespace. We are using `[name]` in the `library` option to give every entry a different namespace.

You can see that webpack automatically wraps your module so that it is consumable in every enviroment. All you need is this simple config.

Note: You can also use the `library` and `libraryTarget` options without multiple entry points. Then you don't need `[name]`.

Note: When your library has dependencies that should not be included in the compiled version, you can use the `externals` option. See [externals example](https://github.com/webpack/webpack/tree/master/examples/externals).

# webpack.config.js

``` javascript
var path = require("path");
module.exports = {
	entry: {
		alpha: "./alpha",
		beta: "./beta"
	},
	output: {
		path: path.join(__dirname, "js"),
		filename: "MyLibrary.[name].js",
		library: ["MyLibrary", "[name]"],
		libraryTarget: "umd"
	}
}
```

# js/MyLibrary.alpha.js

``` javascript
(function webpackUniversalModuleDefinition(root, factory) {
	if(typeof exports === 'object' && typeof module === 'object')
		module.exports = factory();
	else if(typeof define === 'function' && define.amd)
		define([], factory);
	else if(typeof exports === 'object')
		exports["alpha"] = factory();
	else
		root["MyLibrary"] = root["MyLibrary"] || {}, root["MyLibrary"]["alpha"] = factory();
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
/* unknown exports provided */
/* all exports used */
/*!******************!*\
  !*** ./alpha.js ***!
  \******************/
/***/ function(module, exports) {

module.exports = "alpha";

/***/ }
/******/ ]);
});
```

# js/MyLibrary.beta.js

``` javascript
(function webpackUniversalModuleDefinition(root, factory) {
	if(typeof exports === 'object' && typeof module === 'object')
		module.exports = factory();
	else if(typeof define === 'function' && define.amd)
		define([], factory);
	else if(typeof exports === 'object')
		exports["beta"] = factory();
	else
		root["MyLibrary"] = root["MyLibrary"] || {}, root["MyLibrary"]["beta"] = factory();
})(this, function() {
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
/******/ 	return __webpack_require__(__webpack_require__.s = 1);
/******/ })
/************************************************************************/
/******/ ([
/* 0 */,
/* 1 */
/* unknown exports provided */
/* all exports used */
/*!*****************!*\
  !*** ./beta.js ***!
  \*****************/
/***/ function(module, exports) {

module.exports = "beta";

/***/ }
/******/ ]);
});
```

# Info

## Uncompressed

```
Hash: 082bbeea226fa367215b
Version: webpack 2.2.0-rc.2
             Asset     Size  Chunks             Chunk Names
 MyLibrary.beta.js  3.09 kB       0  [emitted]  beta
MyLibrary.alpha.js  3.08 kB       1  [emitted]  alpha
Entrypoint alpha = MyLibrary.alpha.js
Entrypoint beta = MyLibrary.beta.js
chunk    {0} MyLibrary.beta.js (beta) 24 bytes [entry] [rendered]
    > beta [1] ./beta.js 
    [1] ./beta.js 24 bytes {0} [built]
chunk    {1} MyLibrary.alpha.js (alpha) 25 bytes [entry] [rendered]
    > alpha [0] ./alpha.js 
    [0] ./alpha.js 25 bytes {1} [built]
```

## Minimized (uglify-js, no zip)

```
Hash: 082bbeea226fa367215b
Version: webpack 2.2.0-rc.2
             Asset       Size  Chunks             Chunk Names
 MyLibrary.beta.js  785 bytes       0  [emitted]  beta
MyLibrary.alpha.js  787 bytes       1  [emitted]  alpha
Entrypoint alpha = MyLibrary.alpha.js
Entrypoint beta = MyLibrary.beta.js
chunk    {0} MyLibrary.beta.js (beta) 24 bytes [entry] [rendered]
    > beta [1] ./beta.js 
    [1] ./beta.js 24 bytes {0} [built]
chunk    {1} MyLibrary.alpha.js (alpha) 25 bytes [entry] [rendered]
    > alpha [0] ./alpha.js 
    [0] ./alpha.js 25 bytes {1} [built]
```
