This example demonstrates how to build a library with webpack that has dependencies to other libraries which should not be included in the compiled version.

We use the `libraryTarget: "umd"` option to build a UMD module that is consumable in CommonJs, AMD and with script tags. We don't specify the `library` option so the library is exported to the root namespace.

We use the `externals` option to define dependencies that should be resolved in the target environment.

In the simple case we just need to specify a string (`"add"`). Then it's resolved as `"add"` module in CommonJs and AMD, and as global `add` when used with script tag.

In the complex case we specify different values for each environment:

| environment        | config value             | resolved as                  |
|--------------------|--------------------------|------------------------------|
| CommonJs (strict)  | `["./math", "subtract"]` | `require("./math").subtract` |
| CommonJs (node.js) | `"./subtract"`           | `require("./subtract")`      |
| AMD                | `"subtract"`             | `define(["subtract"], ...)`  |
| script tag         | `"subtract"`             | `this.subtract`              |

# example.js

``` javascript
var add = require("add");
var subtract = require("subtract");

exports.exampleValue = subtract(add(42, 2), 2);
```

# webpack.config.js

``` javascript
module.exports = {
	// mode: "development || "production",
	output: {
		libraryTarget: "umd"
	},
	externals: [
		"add",
		{
			subtract: {
				root: "subtract",
				commonjs2: "./subtract",
				commonjs: ["./math", "subtract"],
				amd: "subtract"
			}
		}
	]
};
```

# dist/output.js

``` javascript
(function webpackUniversalModuleDefinition(root, factory) {
	if(typeof exports === 'object' && typeof module === 'object')
		module.exports = factory(require("add"), require("./subtract"));
	else if(typeof define === 'function' && define.amd)
		define(["add", "subtract"], factory);
	else {
		var a = typeof exports === 'object' ? factory(require("add"), require("./math")["subtract"]) : factory(root["add"], root["subtract"]);
		for(var i in a) (typeof exports === 'object' ? exports : root)[i] = a[i];
	}
})(window, function(__WEBPACK_EXTERNAL_MODULE__1__, __WEBPACK_EXTERNAL_MODULE__2__) {
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
/******/ 	// define __esModule on exports
/******/ 	__webpack_require__.r = function(exports) {
/******/ 		Object.defineProperty(exports, '__esModule', { value: true });
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
/******/ 	__webpack_require__.p = "dist/";
/******/
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
/*! no static exports found */
/***/ (function(module, exports, __webpack_require__) {

var add = __webpack_require__(/*! add */ 1);
var subtract = __webpack_require__(/*! subtract */ 2);

exports.exampleValue = subtract(add(42, 2), 2);

/***/ }),
/* 1 */
/*!**********************!*\
  !*** external "add" ***!
  \**********************/
/*! no static exports found */
/***/ (function(module, exports) {

module.exports = __WEBPACK_EXTERNAL_MODULE__1__;

/***/ }),
/* 2 */
/*!***************************************************************************************************************!*\
  !*** external {"root":"subtract","commonjs2":"./subtract","commonjs":["./math","subtract"],"amd":"subtract"} ***!
  \***************************************************************************************************************/
/*! no static exports found */
/***/ (function(module, exports) {

module.exports = __WEBPACK_EXTERNAL_MODULE__2__;

/***/ })
/******/ ]);
});
```

# Info

## Unoptimized

```
Hash: 0a1b2c3d4e5f6a7b8c9d
Version: webpack 4.8.0
    Asset      Size  Chunks             Chunk Names
output.js  4.17 KiB       0  [emitted]  main
Entrypoint main = output.js
chunk    {0} output.js (main) 197 bytes [entry] [rendered]
    > .\example.js main
 [0] ./example.js 113 bytes {0} [built]
     single entry .\example.js  main
 [1] external "add" 42 bytes {0} [built]
     cjs require add [0] ./example.js 1:10-24
 [2] external {"root":"subtract","commonjs2":"./subtract","commonjs":["./math","subtract"],"amd":"subtract"} 42 bytes {0} [built]
     cjs require subtract [0] ./example.js 2:15-34
```

## Production mode

```
Hash: 0a1b2c3d4e5f6a7b8c9d
Version: webpack 4.8.0
    Asset      Size  Chunks             Chunk Names
output.js  1.02 KiB       0  [emitted]  main
Entrypoint main = output.js
chunk    {0} output.js (main) 197 bytes [entry] [rendered]
    > .\example.js main
 [0] external {"root":"subtract","commonjs2":"./subtract","commonjs":["./math","subtract"],"amd":"subtract"} 42 bytes {0} [built]
     cjs require subtract [2] ./example.js 2:15-34
 [1] external "add" 42 bytes {0} [built]
     cjs require add [2] ./example.js 1:10-24
 [2] ./example.js 113 bytes {0} [built]
     single entry .\example.js  main
```