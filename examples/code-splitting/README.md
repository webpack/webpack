# example.js

``` javascript
var a = require("a");
var b = require("b");
require.ensure(["c"], function(require) {
    require("b").xyz();
    var d = require("d");
});
```


# js/output.js

``` javascript
/******/ (function webpackBootstrap(modules) {
/******/ 	var installedModules = {};
/******/ 	var installedChunks = {0:0};
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
/******/ 		if(installedChunks[chunkId] === 0) return callback.call(null, require);
/******/ 		if(installedChunks[chunkId] !== undefined)
/******/ 			installedChunks[chunkId].push(callback);
/******/ 		else {
/******/ 			installedChunks[chunkId] = [callback];
/******/ 			var head = document.getElementsByTagName('head')[0];
/******/ 			var script = document.createElement('script');
/******/ 			script.type = 'text/javascript';
/******/ 			script.charset = 'utf-8';
/******/ 			script.src = modules.c+""+chunkId+".output.js";
/******/ 			head.appendChild(script);
/******/ 		}
/******/ 	};
/******/ 	require.modules = modules;
/******/ 	require.cache = installedModules;
/******/ 	window["webpackJsonp"] = function webpackJsonpCallback(chunkIds, moreModules) {
/******/ 		var moduleId, chunkId, callbacks = [];
/******/ 		while(chunkIds.length) {
/******/ 			chunkId = chunkIds.shift();
/******/ 			if(installedChunks[chunkId]) callbacks.push.apply(callbacks, installedChunks[chunkId]);
/******/ 			installedChunks[chunkId] = 0;
/******/ 		}
/******/ 		for(moduleId in moreModules)
/******/ 			modules[moduleId] = moreModules[moduleId];
/******/ 		while(callbacks.length)
/******/ 			callbacks.shift().call(null, require);
/******/ 	};
/******/ 	return require(0);
/******/ })({
/******/ c: "",

/***/ 0:
/*!********************!*\
  !*** ./example.js ***!
  \********************/
/***/ function(module, exports, require) {

	var a = require(/*! a */ 2);
	var b = require(/*! b */ 1);
	require.e/*nsure*/(1, function(require) {
	    require(/*! b */ 1).xyz();
	    var d = require(/*! d */ 4);
	});

/***/ },

/***/ 1:
/*!****************!*\
  !*** ./~/b.js ***!
  \****************/
/***/ function(module, exports, require) {

	// module b

/***/ },

/***/ 2:
/*!****************!*\
  !*** ./~/a.js ***!
  \****************/
/***/ function(module, exports, require) {

	// module a

/***/ }
/******/ })

```

# js/1.output.js

``` javascript
webpackJsonp([1], {

/***/ 3:
/*!****************!*\
  !*** ./~/c.js ***!
  \****************/
/***/ function(module, exports, require) {

	// module c

/***/ },

/***/ 4:
/*!****************!*\
  !*** ./~/d.js ***!
  \****************/
/***/ function(module, exports, require) {

	// module d

/***/ }

})
```

Minimized

``` javascript
webpackJsonp([1],{3:function(){},4:function(){}});
```

# Info

## Uncompressed

```
Hash: 3d676be1f90fd9a9422053e02c1982e7
Time: 38ms
      Asset  Size  Chunks  Chunk Names
  output.js  2529       0  main       
1.output.js   306       1             
chunk    {0} output.js (main) 166
    [0] ./example.js 144 [built] {0}
    [1] ./~/b.js 11 [built] {0}
        cjs require b [0] ./example.js 2:8-20
        cjs require b [0] ./example.js 4:4-16
    [2] ./~/a.js 11 [built] {0}
        cjs require a [0] ./example.js 1:8-20
chunk    {1} 1.output.js 22 {0} 
    [3] ./~/c.js 11 [built] {1}
        require.ensure item c [0] ./example.js 3:0-6:2
    [4] ./~/d.js 11 [built] {1}
        cjs require d [0] ./example.js 5:12-24
```

## Minimized (uglify-js, no zip)

```
Hash: 3d676be1f90fd9a9422053e02c1982e7
Time: 128ms
      Asset  Size  Chunks  Chunk Names
  output.js   744       0  main       
1.output.js    50       1             
chunk    {0} output.js (main) 166
    [0] ./example.js 144 [built] {0}
    [1] ./~/b.js 11 [built] {0}
        cjs require b [0] ./example.js 2:8-20
        cjs require b [0] ./example.js 4:4-16
    [2] ./~/a.js 11 [built] {0}
        cjs require a [0] ./example.js 1:8-20
chunk    {1} 1.output.js 22 {0} 
    [3] ./~/c.js 11 [built] {1}
        require.ensure item c [0] ./example.js 3:0-6:2
    [4] ./~/d.js 11 [built] {1}
        cjs require d [0] ./example.js 5:12-24
```
