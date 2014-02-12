# example.js

``` javascript
// use our loader
console.dir(require("./loader!./file"));

// use buildin json loader
console.dir(require("./test.json")); // default by extension
console.dir(require("!json!./test.json")); // manual
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

	// use our loader
	console.dir(require(/*! ./loader!./file */ 2));

	// use buildin json loader
	console.dir(require(/*! ./test.json */ 1)); // default by extension
	console.dir(require(/*! json!./test.json */ 1)); // manual

/***/ },
/* 1 */
/*!*******************************************!*\
  !*** (webpack)/~/json-loader!./test.json ***!
  \*******************************************/
/***/ function(module, exports, require) {

	module.exports = {
		"foobar": 1234
	}

/***/ },
/* 2 */
/*!*****************************!*\
  !*** ./loader.js!./file.js ***!
  \*****************************/
/***/ function(module, exports, require) {

	exports.answer = 42;
	exports.foo = "bar";

/***/ }
/******/ ])
```

# Console output

Prints in node.js (`enhanced-require example.js`) and in browser:

```
{ answer: 42, foo: 'bar' }
{ foobar: 1234 }
{ foobar: 1234 }
```

# Info

## Uncompressed

```
Hash: 547826c0f7b5903a42b6
Version: webpack 1.0.0-rc5
Time: 78ms
    Asset  Size  Chunks             Chunk Names
output.js  2309       0  [emitted]  main       
chunk    {0} output.js (main) 282 [rendered]
    > main [0] ./example.js
    [0] ./example.js 205 {0} [built]
    [1] (webpack)/~/json-loader!./test.json 36 {0} [built]
        cjs require !json!./test.json [0] ./example.js 6:12-40
        cjs require ./test.json [0] ./example.js 5:12-34
    [2] ./loader.js!./file.js 41 {0} [not cacheable] [built]
        cjs require ./loader!./file [0] ./example.js 2:12-38
```

## Minimized (uglify-js, no zip)

```
Hash: 7c660ac3e0efcdac24e2
Version: webpack 1.0.0-rc5
Time: 149ms
    Asset  Size  Chunks             Chunk Names
output.js   354       0  [emitted]  main       
chunk    {0} output.js (main) 282 [rendered]
    > main [0] ./example.js
    [0] ./example.js 205 {0} [built]
    [1] (webpack)/~/json-loader!./test.json 36 {0} [built]
        cjs require !json!./test.json [0] ./example.js 6:12-40
        cjs require ./test.json [0] ./example.js 5:12-34
    [2] ./loader.js!./file.js 41 {0} [not cacheable] [built]
        cjs require ./loader!./file [0] ./example.js 2:12-38
```
