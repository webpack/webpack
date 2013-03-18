
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
/******/ (function webpackBootstrap(modules) {
/******/ 	var installedModules = {};
/******/ 	function require(moduleId) {
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
Hash: 30dcf8e5b6f3a18a2eb8eab2188e0643
Time: 139ms
    Asset  Size  Chunks  Chunk Names
output.js  1465       0  main       
chunk    {0} output.js (main) 208
    [0] ./example.js 31 [built] {0}
    [1] ./cup2.coffee 58 [built] {0}
        cjs require ./cup2 [2] ./cup1.coffee 6:9-26
        cjs require ./cup2.coffee [2] ./cup1.coffee 5:12-36
    [2] ./cup1.coffee 119 [built] {0}
        cjs require ./cup1 [0] ./example.js 1:12-29
```

## Minimized (uglify-js, no zip)

```
Hash: 30dcf8e5b6f3a18a2eb8eab2188e0643
Time: 382ms
    Asset  Size  Chunks  Chunk Names
output.js   418       0  main       
chunk    {0} output.js (main) 208
    [0] ./example.js 31 [built] {0}
    [1] ./cup2.coffee 58 [built] {0}
        cjs require ./cup2 [2] ./cup1.coffee 6:9-26
        cjs require ./cup2.coffee [2] ./cup1.coffee 5:12-36
    [2] ./cup1.coffee 119 [built] {0}
        cjs require ./cup1 [0] ./example.js 1:12-29
```