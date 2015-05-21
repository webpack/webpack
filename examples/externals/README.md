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
})(this, function(__WEBPACK_EXTERNAL_MODULE_1__, __WEBPACK_EXTERNAL_MODULE_2__) {
return /******/ (function(modules) { // webpackBootstrap
/******/ 	// The module cache
/******/ 	var installedModules = {};
/******/
/******/ 	// The require function
/******/ 	function __webpack_require__(moduleId) {
/******/
/******/ 		// Check if module is in cache
/******/ 		if(installedModules[moduleId])
/******/ 			return installedModules[moduleId].exports;
/******/
/******/ 		// Create a new module (and put it into the cache)
/******/ 		var module = installedModules[moduleId] = {
/******/ 			exports: {},
/******/ 			id: moduleId,
/******/ 			loaded: false
/******/ 		};
/******/
/******/ 		// Execute the module function
/******/ 		modules[moduleId].call(module.exports, module, module.exports, __webpack_require__);
/******/
/******/ 		// Flag the module as loaded
/******/ 		module.loaded = true;
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
/******/ 	// __webpack_public_path__
/******/ 	__webpack_require__.p = "js/";
/******/
/******/ 	// Load entry module and return exports
/******/ 	return __webpack_require__(0);
/******/ })
/************************************************************************/
/******/ ([
/* 0 */
/*!********************!*\
  !*** ./example.js ***!
  \********************/
/***/ function(module, exports, __webpack_require__) {

	var add = __webpack_require__(/*! add */ 1);
	var subtract = __webpack_require__(/*! subtract */ 2);

	exports.exampleValue = subtract(add(42, 2), 2);

/***/ },
/* 1 */
/*!**********************!*\
  !*** external "add" ***!
  \**********************/
/***/ function(module, exports, __webpack_require__) {

	module.exports = __WEBPACK_EXTERNAL_MODULE_1__;

/***/ },
/* 2 */
/*!***************************************************************************************************************!*\
  !*** external {"root":"subtract","commonjs2":"./subtract","commonjs":["./math","subtract"],"amd":"subtract"} ***!
  \***************************************************************************************************************/
/***/ function(module, exports, __webpack_require__) {

	module.exports = __WEBPACK_EXTERNAL_MODULE_2__;

/***/ }
/******/ ])
});
```

# Info

## Uncompressed

```
Hash: 320ff2cedec78f734047
Version: webpack 1.5.0
Time: 32ms
    Asset  Size  Chunks             Chunk Names
output.js  3009       0  [emitted]  main
chunk    {0} output.js (main) 197 [rendered]
    > main [0] ./example.js 
    [0] ./example.js 113 {0} [built]
     + 2 hidden modules
```

## Minimized (uglify-js, no zip)

```
Hash: 61dea4cfa2544dc85e83
Version: webpack 1.5.0
Time: 86ms
    Asset  Size  Chunks             Chunk Names
output.js   706       0  [emitted]  main
chunk    {0} output.js (main) 197 [rendered]
    > main [0] ./example.js 
    [0] ./example.js 113 {0} [built]
     + 2 hidden modules
```