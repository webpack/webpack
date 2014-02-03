
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
/******/ 	// shortcut for better minimizing
/******/ 	var exports = "exports";
/******/ 	
/******/ 	// The module cache
/******/ 	var installedModules = {};
/******/ 	
/******/ 	// The require function
/******/ 	function require(moduleId) {
/******/ 		// Check if module is in cache
/******/ 		if(installedModules[moduleId])
/******/ 			return installedModules[moduleId][exports];
/******/ 		
/******/ 		// Create a new module (and put it into the cache)
/******/ 		var module = installedModules[moduleId] = {
/******/ 			exports: {},
/******/ 			id: moduleId,
/******/ 			loaded: false
/******/ 		};
/******/ 		
/******/ 		// Execute the module function
/******/ 		modules[moduleId].call(module[exports], module, module[exports], require);
/******/ 		
/******/ 		// Flag the module as loaded
/******/ 		module.loaded = true;
/******/ 		
/******/ 		// Return the exports of the module
/******/ 		return module[exports];
/******/ 	}
/******/ 	
/******/ 	
/******/ 	// expose the modules object (__webpack_modules__)
/******/ 	require.modules = modules;
/******/ 	
/******/ 	// expose the module cache
/******/ 	require.cache = installedModules;
/******/ 	
/******/ 	// __webpack_public_path__
/******/ 	require.p = "js/";
/******/ 	
/******/ 	
/******/ 	// Load entry module and return exports
/******/ 	return require(0);
/******/ })
/************************************************************************/
/******/ ([
/* 0 */
/*!********************!*\
  !*** ./example.js ***!
  \********************/
/***/ function(module, exports, require) {

	console.log(require(/*! ./cup1 */ 2));

/***/ },
/* 1 */
/*!*********************!*\
  !*** ./cup2.coffee ***!
  \*********************/
/***/ function(module, exports, require) {

	console.log("yeah coffee-script");

	module.exports = 42;


/***/ },
/* 2 */
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
/******/ ])
```

# Info

## Uncompressed

```
Hash: c0e41294caebebf740e1
Version: webpack 1.0.0-rc1
Time: 158ms
    Asset  Size  Chunks             Chunk Names
output.js  2143       0  [emitted]  main       
chunk    {0} output.js (main) 206 [rendered]
    > main [0] ./example.js
    [0] ./example.js 31 {0} [built]
    [1] ./cup2.coffee 57 {0} [built]
        cjs require ./cup2.coffee [2] ./cup1.coffee 4:12-36
        cjs require ./cup2 [2] ./cup1.coffee 5:9-26
    [2] ./cup1.coffee 118 {0} [built]
        cjs require ./cup1 [0] ./example.js 1:12-29
```

## Minimized (uglify-js, no zip)

```
Hash: 5aad8c5ad018219d8bf0
Version: webpack 1.0.0-rc1
Time: 207ms
    Asset  Size  Chunks             Chunk Names
output.js   379       0  [emitted]  main       
chunk    {0} output.js (main) 206 [rendered]
    > main [0] ./example.js
    [0] ./example.js 31 {0} [built]
    [1] ./cup2.coffee 57 {0} [built]
        cjs require ./cup2.coffee [2] ./cup1.coffee 4:12-36
        cjs require ./cup2 [2] ./cup1.coffee 5:9-26
    [2] ./cup1.coffee 118 {0} [built]
        cjs require ./cup1 [0] ./example.js 1:12-29
```