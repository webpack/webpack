# webpack.config.js

``` javascript
var path = require("path");
var webpack = require("../../");
module.exports = {
	entry: {
		alpha: ["./alpha", "./a", "module"],
		beta: ["./beta", "./b"]
	},
	output: {
		path: path.join(__dirname, "js"),
		filename: "MyDll.[name].js",
		library: "[name]_[hash]"
	},
	plugins: [
		new webpack.DllPlugin({
			path: path.join(__dirname, "js", "[name]-manifest.json"),
			name: "[name]_[hash]"
		})
	]
};
```

# js/MyDll.alpha.js

``` javascript
var alpha_54a556952b9e02f550d5 =
/******/ (function(modules) { // webpackBootstrap
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

/******/ 	// identity function for calling harmory imports with the correct context
/******/ 	__webpack_require__.i = function(value) { return value; };

/******/ 	// __webpack_public_path__
/******/ 	__webpack_require__.p = "js/";

/******/ 	// Load entry module and return exports
/******/ 	return __webpack_require__(__webpack_require__.s = 5);
/******/ })
/************************************************************************/
/******/ ([
/* 0 */
/*!**************!*\
  !*** ./a.js ***!
  \**************/
/***/ function(module, exports) {

	module.exports = "a";

/***/ },
/* 1 */
/*!******************!*\
  !*** ./alpha.js ***!
  \******************/
/***/ function(module, exports) {

	module.exports = "alpha";

/***/ },
/* 2 */,
/* 3 */,
/* 4 */
/*!**********************!*\
  !*** ../~/module.js ***!
  \**********************/
/***/ function(module, exports) {

	module.exports = "module";

/***/ },
/* 5 */
/*!*****************!*\
  !*** dll alpha ***!
  \*****************/
/***/ function(module, exports, __webpack_require__) {

	module.exports = __webpack_require__;

/***/ }
/******/ ]);
```

# js/alpha-manifest.json

``` javascript
{
  "name": "alpha_54a556952b9e02f550d5",
  "content": {
    "./a.js": 0,
    "./alpha.js": 1,
    "../node_modules/module.js": 4
  }
}
```

# Info

## Uncompressed

```
Hash: 54a556952b9e02f550d5
Version: webpack 2.1.0-beta.11
Time: 76ms
         Asset     Size  Chunks             Chunk Names
MyDll.alpha.js  2.19 kB       0  [emitted]  alpha
 MyDll.beta.js  2.03 kB       1  [emitted]  beta
chunk    {0} MyDll.alpha.js (alpha) 84 bytes [rendered]
    > alpha [5] dll alpha 
    [0] ./a.js 21 bytes {0} [built]
        single entry ./a [5] dll alpha
    [1] ./alpha.js 25 bytes {0} [built]
        single entry ./alpha [5] dll alpha
    [4] ../~/module.js 26 bytes {0} [built]
        single entry module [5] dll alpha
    [5] dll alpha 12 bytes {0} [built]
chunk    {1} MyDll.beta.js (beta) 57 bytes [rendered]
    > beta [6] dll beta 
    [2] ./b.js 21 bytes {1} [built]
        single entry ./b [6] dll beta
    [3] ./beta.js 24 bytes {1} [built]
        single entry ./beta [6] dll beta
    [6] dll beta 12 bytes {1} [built]
```

## Minimized (uglify-js, no zip)

```
Hash: 54a556952b9e02f550d5
Version: webpack 2.1.0-beta.11
Time: 119ms
         Asset       Size  Chunks             Chunk Names
MyDll.alpha.js  381 bytes       0  [emitted]  alpha
 MyDll.beta.js  347 bytes       1  [emitted]  beta
chunk    {0} MyDll.alpha.js (alpha) 84 bytes [rendered]
    > alpha [5] dll alpha 
    [0] ./a.js 21 bytes {0} [built]
        single entry ./a [5] dll alpha
    [1] ./alpha.js 25 bytes {0} [built]
        single entry ./alpha [5] dll alpha
    [4] ../~/module.js 26 bytes {0} [built]
        single entry module [5] dll alpha
    [5] dll alpha 12 bytes {0} [built]
chunk    {1} MyDll.beta.js (beta) 57 bytes [rendered]
    > beta [6] dll beta 
    [2] ./b.js 21 bytes {1} [built]
        single entry ./b [6] dll beta
    [3] ./beta.js 24 bytes {1} [built]
        single entry ./beta [6] dll beta
    [6] dll beta 12 bytes {1} [built]
```