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
var alpha_fdf65b7c8f44aa643c94 =
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
/******/ 			exports: {},
/******/ 			id: moduleId,
/******/ 			loaded: false
/******/ 		};

/******/ 		// Execute the module function
/******/ 		modules[moduleId].call(module.exports, module, module.exports, __webpack_require__);

/******/ 		// Flag the module as loaded
/******/ 		module.loaded = true;

/******/ 		// Return the exports of the module
/******/ 		return module.exports;
/******/ 	}


/******/ 	// expose the modules object (__webpack_modules__)
/******/ 	__webpack_require__.m = modules;

/******/ 	// expose the module cache
/******/ 	__webpack_require__.c = installedModules;

/******/ 	// __webpack_public_path__
/******/ 	__webpack_require__.p = "js/";

/******/ 	// Load entry module and return exports
/******/ 	return __webpack_require__(0);
/******/ })
/************************************************************************/
/******/ ([
/* 0 */
/*!*****************!*\
  !*** dll alpha ***!
  \*****************/
/***/ function(module, exports, __webpack_require__) {

	module.exports = __webpack_require__;

/***/ },
/* 1 */
/*!******************!*\
  !*** ./alpha.js ***!
  \******************/
/***/ function(module, exports) {

	module.exports = "alpha";

/***/ },
/* 2 */
/*!**************!*\
  !*** ./a.js ***!
  \**************/
/***/ function(module, exports) {

	module.exports = "a";

/***/ },
/* 3 */
/*!**********************!*\
  !*** ../~/module.js ***!
  \**********************/
/***/ function(module, exports) {

	module.exports = "module";

/***/ }
/******/ ]);
```

# js/alpha-manifest.json

``` javascript
{
  "name": "alpha_fdf65b7c8f44aa643c94",
  "content": {
    "./alpha.js": 1,
    "./a.js": 2,
    "../node_modules/module.js": 3
  }
}
```

# Info

## Uncompressed

```
Hash: fdf65b7c8f44aa643c94
Version: webpack 1.12.2
Time: 116ms
         Asset     Size  Chunks             Chunk Names
MyDll.alpha.js     2 kB       0  [emitted]  alpha
 MyDll.beta.js  1.85 kB       1  [emitted]  beta
chunk    {0} MyDll.alpha.js (alpha) 84 bytes [rendered]
    > alpha [0] dll alpha 
    [0] dll alpha 12 bytes {0} [built]
    [1] ./alpha.js 25 bytes {0} [built]
        single entry ./alpha [0] dll alpha
    [2] ./a.js 21 bytes {0} [built]
        single entry ./a [0] dll alpha
    [3] ../~/module.js 26 bytes {0} [built]
        single entry module [0] dll alpha
chunk    {1} MyDll.beta.js (beta) 57 bytes [rendered]
    > beta [0] dll beta 
    [0] dll beta 12 bytes {1} [built]
    [4] ./beta.js 24 bytes {1} [built]
        single entry ./beta [0] dll beta
    [5] ./b.js 21 bytes {1} [built]
        single entry ./b [0] dll beta
```

## Minimized (uglify-js, no zip)

```
Hash: 280629f3235a1e77e95f
Version: webpack 1.12.2
Time: 267ms
         Asset       Size  Chunks             Chunk Names
MyDll.alpha.js  362 bytes       0  [emitted]  alpha
 MyDll.beta.js  326 bytes       1  [emitted]  beta
chunk    {0} MyDll.alpha.js (alpha) 84 bytes [rendered]
    > alpha [0] dll alpha 
    [0] dll alpha 12 bytes {0} [built]
    [1] ./a.js 21 bytes {0} [built]
        single entry ./a [0] dll alpha
    [2] ./alpha.js 25 bytes {0} [built]
        single entry ./alpha [0] dll alpha
    [5] ../~/module.js 26 bytes {0} [built]
        single entry module [0] dll alpha
chunk    {1} MyDll.beta.js (beta) 57 bytes [rendered]
    > beta [0] dll beta 
    [0] dll beta 12 bytes {1} [built]
    [3] ./b.js 21 bytes {1} [built]
        single entry ./b [0] dll beta
    [4] ./beta.js 24 bytes {1} [built]
        single entry ./beta [0] dll beta
```