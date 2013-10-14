
# example.js

``` javascript
console.log(require("./cup1"));
```

# cup1.coffee

``` coffee-script
module.exports =
	cool: "stuff"
	answer: 42
	external: require "./cup2.coffee"
	again: require "./cup2"
```

# cup2.coffee

``` coffee-script
console.log "yeah coffee-script"

module.exports = 42
```

# js/output.js

``` javascript
/******/ (function(modules) { // webpackBootstrap
/******/ 	// The module cache
/******/ 	var installedModules = {};
/******/ 	
/******/ 	// The require function
/******/ 	function require(moduleId) {
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
/******/ 		modules[moduleId].call(module.exports, module, module.exports, require);
/******/ 		
/******/ 		// Flag the module as loaded
/******/ 		module.loaded = true;
/******/ 		
/******/ 		// Return the exports of the module
/******/ 		return module.exports;
/******/ 	}
/******/ 	
/******/ 	// The bundle contains no chunks. A empty chunk loading function.
/******/ 	require.e = function requireEnsure(_, callback) {
/******/ 		callback.call(null, this);
/******/ 	};
/******/ 	
/******/ 	// expose the modules object (__webpack_modules__)
/******/ 	require.modules = modules;
/******/ 	
/******/ 	// expose the module cache
/******/ 	require.cache = installedModules;
/******/ 	
/******/ 	
/******/ 	// Load entry module and return exports
/******/ 	return require(0);
/******/ })
/************************************************************************/
/******/ ({
/******/ // __webpack_public_path__
/******/ c: "",

/***/ 0:
/*!********************!*\
  !*** ./example.js ***!
  \********************/
/***/ function(module, exports, require) {

	console.log(require(/*! ./cup1 */ 2));

/***/ },

/***/ 1:
/*!*********************!*\
  !*** ./cup2.coffee ***!
  \*********************/
/***/ function(module, exports, require) {

	console.log("yeah coffee-script");
	
	module.exports = 42;
	

/***/ },

/***/ 2:
/*!*********************!*\
  !*** ./cup1.coffee ***!
  \*********************/
/***/ function(module, exports, require) {

	module.exports = {
	  cool: "stuff",
	  answer: 42,
	  external: require(/*! ./cup2.coffee */ 1),
	  again: require(/*! ./cup2 */ 1)
	};
	

/***/ }
/******/ })
```

# Info

## Uncompressed

```
Hash: 9a0f1fb7751394ed51be
Version: webpack 0.11.0-beta27
Time: 198ms
    Asset  Size  Chunks             Chunk Names
output.js  2220       0  [emitted]  main       
chunk    {0} output.js (main) 206 [rendered]
    [0] ./example.js 31 {0} [built]
    [1] ./cup2.coffee 57 {0} [built]
        cjs require ./cup2.coffee [2] ./cup1.coffee 4:12-36
        cjs require ./cup2 [2] ./cup1.coffee 5:9-26
    [2] ./cup1.coffee 118 {0} [built]
        cjs require ./cup1 [0] ./example.js 1:12-29
```

## Minimized (uglify-js, no zip)

```
Hash: 9a0f1fb7751394ed51be
Version: webpack 0.11.0-beta27
Time: 242ms
    Asset  Size  Chunks             Chunk Names
output.js   426       0  [emitted]  main       
chunk    {0} output.js (main) 206 [rendered]
    [0] ./example.js 31 {0} [built]
    [1] ./cup2.coffee 57 {0} [built]
        cjs require ./cup2.coffee [2] ./cup1.coffee 4:12-36
        cjs require ./cup2 [2] ./cup1.coffee 5:9-26
    [2] ./cup1.coffee 118 {0} [built]
        cjs require ./cup1 [0] ./example.js 1:12-29
```