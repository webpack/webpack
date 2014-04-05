
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
		define(factory);
	else if(typeof exports === 'object')
		exports["alpha"] = factory();
	else
		root["MyLibrary"] = root["MyLibrary"] || {}, root["MyLibrary"]["alpha"] = factory();
})(this, function() {
return /******/ (function(modules) { // webpackBootstrap
/******/ 	
/******/ 	// The module cache
/******/ 	var installedModules = {};
/******/ 	
/******/ 	// The require function
/******/ 	function __webpack_require__(moduleId) {
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
/******/ 	
/******/ 	// Load entry module and return exports
/******/ 	return __webpack_require__(0);
/******/ })
/************************************************************************/
/******/ ([
/* 0 */
/*!******************!*\
  !*** ./alpha.js ***!
  \******************/
/***/ function(module, exports, __webpack_require__) {

	module.exports = "alpha";

/***/ }
/******/ ])
})

```

# js/MyLibrary.beta.js

``` javascript
(function webpackUniversalModuleDefinition(root, factory) {
	if(typeof exports === 'object' && typeof module === 'object')
		module.exports = factory();
	else if(typeof define === 'function' && define.amd)
		define(factory);
	else if(typeof exports === 'object')
		exports["beta"] = factory();
	else
		root["MyLibrary"] = root["MyLibrary"] || {}, root["MyLibrary"]["beta"] = factory();
})(this, function() {
return /******/ (function(modules) { // webpackBootstrap
/******/ 	
/******/ 	// The module cache
/******/ 	var installedModules = {};
/******/ 	
/******/ 	// The require function
/******/ 	function __webpack_require__(moduleId) {
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
/******/ 	
/******/ 	// Load entry module and return exports
/******/ 	return __webpack_require__(0);
/******/ })
/************************************************************************/
/******/ ([
/* 0 */
/*!*****************!*\
  !*** ./beta.js ***!
  \*****************/
/***/ function(module, exports, __webpack_require__) {

	module.exports = "beta";

/***/ }
/******/ ])
})

```

# Info

## Uncompressed

```
Hash: 188fa9bfc8c26494bc09
Version: webpack 1.1.3
Time: 126ms
             Asset  Size  Chunks             Chunk Names
 MyLibrary.beta.js  2047       0  [emitted]  beta       
MyLibrary.alpha.js  2053       1  [emitted]  alpha      
chunk    {0} MyLibrary.beta.js (beta) 24 [rendered]
    > beta [0] ./beta.js 
    [0] ./beta.js 24 {0} [built]
chunk    {1} MyLibrary.alpha.js (alpha) 25 [rendered]
    > alpha [0] ./alpha.js 
    [0] ./alpha.js 25 {1} [built]
```

## Minimized (uglify-js, no zip)

```
Hash: 7ddebca59251e5368cb3
Version: webpack 1.1.3
Time: 380ms
             Asset  Size  Chunks             Chunk Names
 MyLibrary.beta.js   485       0  [emitted]  beta       
MyLibrary.alpha.js   488       1  [emitted]  alpha      
chunk    {0} MyLibrary.beta.js (beta) 24 [rendered]
    > beta [0] ./beta.js 
    [0] ./beta.js 24 {0} [built]
chunk    {1} MyLibrary.alpha.js (alpha) 25 [rendered]
    > alpha [0] ./alpha.js 
    [0] ./alpha.js 25 {1} [built]
```