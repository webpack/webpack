
# example.js

``` javascript
var add = require("add");

module.exports = add(40, 2);
```

# webpack.config.js

``` javascript
module.exports = {
	output: {
		libraryTarget: "this"
	},
	externals: {
		"add": true
	}
}
```

# js/output.js

``` javascript
(function(e, a) { for(var i in a) e[i] = a[i]; }(this, /******/ (function(modules) { // webpackBootstrap
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
/*!********************!*\
  !*** ./example.js ***!
  \********************/
/***/ function(module, exports, __webpack_require__) {

	var add = __webpack_require__(/*! add */ 1);

	module.exports = add(40, 2);

/***/ },
/* 1 */
/*!********************!*\
  !*** external add ***!
  \********************/
/***/ function(module, exports, __webpack_require__) {

	(function() { module.exports = this["add"]; }());

/***/ }
/******/ ])))
```

# Info

## Uncompressed

```
Hash: 4b1215a5724ebdb340c6
Version: webpack 1.1.0-beta1
Time: 213ms
    Asset  Size  Chunks             Chunk Names
output.js  1949       0  [emitted]  main       
chunk    {0} output.js (main) 99 [rendered]
    > main [0] ./example.js 
    [0] ./example.js 57 {0} [built]
```

## Minimized (uglify-js, no zip)

```
Hash: 9397fce116b2fe76bdb7
Version: webpack 1.1.0-beta1
Time: 293ms
    Asset  Size  Chunks             Chunk Names
output.js   344       0  [emitted]  main       
chunk    {0} output.js (main) 99 [rendered]
    > main [0] ./example.js 
    [0] ./example.js 57 {0} [built]
```