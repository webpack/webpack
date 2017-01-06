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
	output: {
		libraryTarget: "umd"
	},
	externals: [
		"add",
		{
			"subtract": {
				root: "subtract",
				commonjs2: "./subtract",
				commonjs: ["./math", "subtract"],
				amd: "subtract"
			}
		}
	]
}
```

# js/output.js

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
})(this, function(__WEBPACK_EXTERNAL_MODULE_0__, __WEBPACK_EXTERNAL_MODULE_1__) {
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
/******/ 	return __webpack_require__(__webpack_require__.s = 2);
/******/ })
/************************************************************************/
```
</details>
``` js
/******/ ([
/* 0 */
/* unknown exports provided */
/* all exports used */
/*!**********************!*\
  !*** external "add" ***!
  \**********************/
/***/ function(module, exports) {

module.exports = __WEBPACK_EXTERNAL_MODULE_0__;

/***/ },
/* 1 */
/* unknown exports provided */
/* all exports used */
/*!***************************************************************************************************************!*\
  !*** external {"root":"subtract","commonjs2":"./subtract","commonjs":["./math","subtract"],"amd":"subtract"} ***!
  \***************************************************************************************************************/
/***/ function(module, exports) {

module.exports = __WEBPACK_EXTERNAL_MODULE_1__;

/***/ },
/* 2 */
/* unknown exports provided */
/* all exports used */
/*!********************!*\
  !*** ./example.js ***!
  \********************/
/***/ function(module, exports, __webpack_require__) {

var add = __webpack_require__(/*! add */ 0);
var subtract = __webpack_require__(/*! subtract */ 1);

exports.exampleValue = subtract(add(42, 2), 2);

/***/ }
/******/ ]);
});
```

# Info

## Uncompressed

```
Hash: db7da8a5fdfceab24e67
Version: webpack 2.2.0-rc.2
    Asset     Size  Chunks             Chunk Names
output.js  4.16 kB       0  [emitted]  main
Entrypoint main = output.js
chunk    {0} output.js (main) 197 bytes [entry] [rendered]
    > main [2] ./example.js 
    [2] ./example.js 113 bytes {0} [built]
     + 2 hidden modules
```

## Minimized (uglify-js, no zip)

```
Hash: db7da8a5fdfceab24e67
Version: webpack 2.2.0-rc.2
    Asset  Size  Chunks             Chunk Names
output.js  1 kB       0  [emitted]  main
Entrypoint main = output.js
chunk    {0} output.js (main) 197 bytes [entry] [rendered]
    > main [2] ./example.js 
    [2] ./example.js 113 bytes {0} [built]
     + 2 hidden modules
```