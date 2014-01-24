# example.js

``` javascript
var a = require("./a");

// get module id
var aId = require.resolve("./a.js");

// clear module in require.cache
delete require.cache[aId];

// require module again, it should be reexecuted
var a2 = require("./a");

// vertify it
if(a == a2) throw new Error("Cache clear failed :(");
```

# a.js


``` javascript
module.exports = Math.random();
```

# js/output.js

``` javascript
/******/ (function(modules) { // webpackBootstrap
/******/ 	
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

	var a = require(/*! ./a */ 1);

	// get module id
	var aId = /*require.resolve*/(/*! ./a.js */ 1);

	// clear module in require.cache
	delete require.cache[aId];

	// require module again, it should be reexecuted
	var a2 = require(/*! ./a */ 1);

	// vertify it
	if(a == a2) throw new Error("Cache clear failed :(");

/***/ },
/* 1 */
/*!**************!*\
  !*** ./a.js ***!
  \**************/
/***/ function(module, exports, require) {

	module.exports = Math.random();

/***/ }
/******/ ])
```

# Info

## Uncompressed

```
Hash: c2fdaa4ec2268af6ce80
Version: webpack 1.0.0-beta8
Time: 55ms
    Asset  Size  Chunks             Chunk Names
output.js  2208       0  [emitted]  main       
chunk    {0} output.js (main) 326 [rendered]
    > main [0] ./example.js
    [0] ./example.js 295 {0} [built]
    [1] ./a.js 31 {0} [built]
        cjs require ./a [0] ./example.js 1:8-22
        cjs require ./a [0] ./example.js 10:9-23
        require.resolve ./a.js [0] ./example.js 4:10-35
```

## Minimized (uglify-js, no zip)

```
Hash: 9035669d7274300bd13b
Version: webpack 1.0.0-beta8
Time: 124ms
    Asset  Size  Chunks             Chunk Names
output.js   399       0  [emitted]  main       
chunk    {0} output.js (main) 326 [rendered]
    > main [0] ./example.js
    [0] ./example.js 295 {0} [built]
    [1] ./a.js 31 {0} [built]
        cjs require ./a [0] ./example.js 1:8-22
        cjs require ./a [0] ./example.js 10:9-23
        require.resolve ./a.js [0] ./example.js 4:10-35
```
