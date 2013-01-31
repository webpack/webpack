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
/******/ (function webpackBootstrap(modules) {
/******/ 	var installedModules = {};
/******/ 	function require(moduleId) {
/******/ 		if(typeof moduleId !== "number") throw new Error("Cannot find module '"+moduleId+"'");
/******/ 		if(installedModules[moduleId])
/******/ 			return installedModules[moduleId].exports;
/******/ 		var module = installedModules[moduleId] = {
/******/ 			exports: {},
/******/ 			id: moduleId,
/******/ 			loaded: false
/******/ 		};
/******/ 		modules[moduleId].call(null, module, module.exports, require);
/******/ 		module.loaded = true;
/******/ 		return module.exports;
/******/ 	}
/******/ 	require.e = function requireEnsure(chunkId, callback) {
/******/ 		callback.call(null, require);
/******/ 	};
/******/ 	require.modules = modules;
/******/ 	require.cache = installedModules;
/******/ 	return require(0);
/******/ })({
/******/ c: "",

/***/ 0:
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

/***/ 1:
/*!**************!*\
  !*** ./a.js ***!
  \**************/
/***/ function(module, exports, require) {

	module.exports = Math.random();

/***/ }
/******/ })

```

# Info

## Uncompressed

```
Hash: c2d1386ba6213eab5cc76f848bd7dc78
Time: 21ms
    Asset  Size  Chunks  Chunk Names
output.js  1507       0  main       
chunk    {0} output.js (main) 326
    [0] ./example.js 295 [built] {0}
    [1] ./a.js 31 [built] {0}
        require.resolve ./a.js [0] ./example.js 4:10-35
        cjs require ./a [0] ./example.js 1:8-22
        cjs require ./a [0] ./example.js 10:9-23
```

## Minimized (uglify-js, no zip)

```
Hash: c2d1386ba6213eab5cc76f848bd7dc78
Time: 60ms
    Asset  Size  Chunks  Chunk Names
output.js   451       0  main       
chunk    {0} output.js (main) 326
    [0] ./example.js 295 [built] {0}
    [1] ./a.js 31 [built] {0}
        require.resolve ./a.js [0] ./example.js 4:10-35
        cjs require ./a [0] ./example.js 1:8-22
        cjs require ./a [0] ./example.js 10:9-23
```
