This example demonstrates how to build a complex library with webpack. The library consist of multiple parts that are usable on its own and together.

When using this library with script tags it exports itself to the namespace `MyLibrary` and each part to a property in this namespace (`MyLibrary.alpha` and `MyLibrary.beta`). When consuming the library with CommonsJs or AMD it just export each part.

We are using multiple entry points (`entry` option) to build every part of the library as separate output file. The `output.filename` option contains `[name]` to give each output file a different name.

We are using the `libraryTarget` option to generate a UMD ([Universal Module Definition](https://github.com/umdjs/umd)) module that is consumable in CommonsJs, AMD and with script tags. The `library` option defines the namespace. We are using `[name]` in the `library` option to give every entry a different namespace.

You can see that webpack automatically wraps your module so that it is consumable in every environment. All you need is this simple config.

Note: You can also use the `library` and `libraryTarget` options without multiple entry points. Then you don't need `[name]`.

Note: When your library has dependencies that should not be included in the compiled version, you can use the `externals` option. See [externals example](https://github.com/webpack/webpack/tree/master/examples/externals).

# webpack.config.js

``` javascript
var path = require("path");
module.exports = {
	// mode: "development || "production",
	entry: {
		alpha: "./alpha",
		beta: "./beta"
	},
	output: {
		path: path.join(__dirname, "dist"),
		filename: "MyLibrary.[name].js",
		library: ["MyLibrary", "[name]"],
		libraryTarget: "umd"
	}
};
```

# dist/MyLibrary.alpha.js

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
/*!******************!*\
  !*** ./alpha.js ***!
  \******************/
/*! no static exports found */
/*! runtime requirements: module */
/***/ (function(module) {

module.exports = "alpha";

/***/ })
/******/ ]);
});
```

# dist/MyLibrary.beta.js

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
})(window, function() {
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
/******/
/******/ 	// Load entry module and return exports
/******/ 	return __webpack_require__(1);
/******/ })
/************************************************************************/
/******/ ([
/* 0 */,
/* 1 */
/*!*****************!*\
  !*** ./beta.js ***!
  \*****************/
/*! no static exports found */
/*! runtime requirements: module */
/***/ (function(module) {

module.exports = "beta";

/***/ })
/******/ ]);
});
```

# Info

## Unoptimized

```
Hash: 0a1b2c3d4e5f6a7b8c9d
Version: webpack 5.0.0-next
             Asset      Size  Chunks             Chunk Names
MyLibrary.alpha.js  1.77 KiB     {0}  [emitted]  alpha
 MyLibrary.beta.js  1.77 KiB     {1}  [emitted]  beta
Entrypoint alpha = MyLibrary.alpha.js
Entrypoint beta = MyLibrary.beta.js
chunk {0} MyLibrary.alpha.js (alpha) 25 bytes [entry] [rendered]
    > ./alpha alpha
 [0] ./alpha.js 25 bytes {0} [built]
     [used exports unknown]
     entry ./alpha alpha
chunk {1} MyLibrary.beta.js (beta) 24 bytes [entry] [rendered]
    > ./beta beta
 [1] ./beta.js 24 bytes {1} [built]
     [used exports unknown]
     entry ./beta beta
```

## Production mode

```
Hash: 0a1b2c3d4e5f6a7b8c9d
Version: webpack 5.0.0-next
             Asset       Size  Chunks             Chunk Names
MyLibrary.alpha.js  480 bytes   {963}  [emitted]  alpha
 MyLibrary.beta.js  477 bytes   {188}  [emitted]  beta
Entrypoint alpha = MyLibrary.alpha.js
Entrypoint beta = MyLibrary.beta.js
chunk {188} MyLibrary.beta.js (beta) 24 bytes [entry] [rendered]
    > ./beta beta
 [145] ./beta.js 24 bytes {188} [built]
       entry ./beta beta
chunk {963} MyLibrary.alpha.js (alpha) 25 bytes [entry] [rendered]
    > ./alpha alpha
 [930] ./alpha.js 25 bytes {963} [built]
       entry ./alpha alpha
```
