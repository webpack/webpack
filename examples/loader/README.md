# example.js

``` javascript
// Polyfill require for node.js usage of loaders
require = require("enhanced-require")(module);

// use our loader
console.dir(require("./loader!./file"));

// use buildin json loader
console.dir(require("./test.json")); // default by extension
console.dir(require("json!./test.json")); // manual
```

# file.js

``` javascript
exports.foo = "bar";
```

# loader.js

``` javascript
module.exports = function(content) {
	return "exports.answer = 42;\n" + content;
}
```

# test.json

``` javascript
{
	"foobar": 1234
}
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

	/* WEBPACK VAR INJECTION */(function(module) {// Polyfill require for node.js usage of loaders
	require = require(/*! enhanced-require */ 3)(module);
	
	// use our loader
	console.dir(require(/*! ./loader!./file */ 4));
	
	// use buildin json loader
	console.dir(require((function webpackMissingModule() { throw new Error("Cannot find module \"./test.json\""); }()))); // default by extension
	console.dir(require(/*! json!./test.json */ 1)); // manual
	/* WEBPACK VAR INJECTION */}(require(/*! (webpack)/buildin/module.js */ 2)(module)))

/***/ },

/***/ 1:
/*!************************************************************************************!*\
  !*** C:/Users/Sokrates/Eigene Repos/webpack-development/~/json-loader!./test.json ***!
  \************************************************************************************/
/***/ function(module, exports, require) {

	module.exports = {
		"foobar": 1234
	}

/***/ },

/***/ 2:
/*!***********************************!*\
  !*** (webpack)/buildin/module.js ***!
  \***********************************/
/***/ function(module, exports, require) {

	module.exports = function(module) {
		if(!module.webpackPolyfill) {
			module.deprecate = function() {};
			module.paths = [];
			// module.parent = undefined by default
			module.children = [];
			module.webpackPolyfill = 1;
		}
		return module;
	}
	

/***/ },

/***/ 3:
/*!*******************************************!*\
  !*** (webpack)/buildin/return-require.js ***!
  \*******************************************/
/***/ function(module, exports, require) {

	module.exports = function() { return require; };

/***/ },

/***/ 4:
/*!*****************************!*\
  !*** ./loader.js!./file.js ***!
  \*****************************/
/***/ function(module, exports, require) {

	exports.answer = 42;
	exports.foo = "bar";

/***/ }
/******/ })

```

# Console output

Prints in node.js (`node example.js`) and in browser:

```
{ answer: 42, foo: 'bar' }
{ foobar: 1234 }
{ foobar: 1234 }
```

# Info

## Uncompressed

```
Hash: 62f35121ae16eff2526b8ac568437057
Time: 52ms
    Asset  Size  Chunks  Chunk Names
output.js  2853       0  main       
chunk    {0} output.js (main) 692
    [0] ./example.js 304 [built] {0}
    [1] C:/Users/Sokrates/Eigene Repos/webpack-development/~/json-loader!./test.json 36 [built] {0}
        cjs require json!./test.json [0] ./example.js 9:12-39
    [2] (webpack)/buildin/module.js 251 [built] {0}
        cjs require module [0] ./example.js 1:0-108
    [3] (webpack)/buildin/return-require.js 60 [built] {0}
        cjs require enhanced-require [0] ./example.js 2:10-37
    [4] ./loader.js!./file.js 41 [not cacheable] [built] {0}
        cjs require ./loader!./file [0] ./example.js 5:12-38

ERROR in .\test.json
Module parse failed: .\test.json Line 2: Unexpected token :
{
	"foobar": 1234
}
 @ ./example.js 8:12-34
```