
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
(function(modules) { // webpackBootstrap
// The module cache
var installedModules = {};

// The require function
function require(moduleId) {
	// Check if module is in cache
	if(installedModules[moduleId])
		return installedModules[moduleId].exports;
	
	// Create a new module (and put it into the cache)
	var module = installedModules[moduleId] = {
		exports: {},
		id: moduleId,
		loaded: false
	};
	
	// Execute the module function
	modules[moduleId].call(null, module, module.exports, require);
	
	// Flag the module as loaded
	module.loaded = true;
	
	// Return the exports of the module
	return module.exports;
}

require.e = function requireEnsure(_, callback) {
	callback.call(null, require);
};
require.modules = modules;
require.cache = installedModules;


// Load entry module and return exports
return require(0);
})
/************************************************************************/
({
// __webpack_public_path__

c: "",
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
})
```

# Info

## Uncompressed

```
Hash: 5394516f6bbce8cc020e6c170fd62636
Version: webpack 0.10.0-beta1
Time: 172ms
    Asset  Size  Chunks  Chunk Names
output.js  1601       0  main       
chunk    {0} output.js (main) 206
    [0] ./example.js 31 [built] {0}
    [1] ./cup2.coffee 57 [built] {0}
        cjs require ./cup2 [2] ./cup1.coffee 5:9-26
        cjs require ./cup2.coffee [2] ./cup1.coffee 4:12-36
    [2] ./cup1.coffee 118 [built] {0}
        cjs require ./cup1 [0] ./example.js 1:12-29
```

## Minimized (uglify-js, no zip)

```
Hash: 5394516f6bbce8cc020e6c170fd62636
Version: webpack 0.10.0-beta1
Time: 228ms
    Asset  Size  Chunks  Chunk Names
output.js   418       0  main       
chunk    {0} output.js (main) 206
    [0] ./example.js 31 [built] {0}
    [1] ./cup2.coffee 57 [built] {0}
        cjs require ./cup2 [2] ./cup1.coffee 5:9-26
        cjs require ./cup2.coffee [2] ./cup1.coffee 4:12-36
    [2] ./cup1.coffee 118 [built] {0}
        cjs require ./cup1 [0] ./example.js 1:12-29
```