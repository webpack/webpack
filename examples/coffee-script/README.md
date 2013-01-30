
# example.js

``` javascript
console.log(require("./cup1.coffee"));
```

# cup1.coffee

``` coffee-script
module.exports =
	cool: "stuff"
	answer: 42
	external: require "./cup2.coffee"
	again: require "./cup2.coffee"
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

	console.log(require((function webpackMissingModule() { throw new Error("Cannot find module \"./cup1.coffee\""); }())));

/***/ }
/******/ })

```

# Info

## Uncompressed

```
Hash: a64a4902a56f0ef88c27e073807e4374
Time: 19ms
    Asset  Size  Chunks  Chunk Names
output.js  1150       0  main       
chunk    {0} output.js (main) 38
    [0] ./example.js 38 [built] {0}

ERROR in .\cup1.coffee
Module parse failed: .\cup1.coffee Line 2: Unexpected token :
module.exports =
	cool: "stuff"
	answer: 42
	external: require "./cup2.coffee"
	again: require "./cup2.coffee"
 @ ./example.js 1:12-36
```

## Minimized (uglify-js, no zip)

```
Hash: a64a4902a56f0ef88c27e073807e4374
Time: 54ms
    Asset  Size  Chunks  Chunk Names
output.js   403       0  main       
chunk    {0} output.js (main) 38
    [0] ./example.js 38 [built] {0}

ERROR in .\cup1.coffee
Module parse failed: .\cup1.coffee Line 2: Unexpected token :
module.exports =
	cool: "stuff"
	answer: 42
	external: require "./cup2.coffee"
	again: require "./cup2.coffee"
 @ ./example.js 1:12-36
```