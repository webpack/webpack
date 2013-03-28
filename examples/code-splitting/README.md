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
/******/(function(modules) { // webpackBootstrap
/******/	// The module cache
/******/	var installedModules = {};
/******/	
/******/	// object to store loaded and loading chunks
/******/	// "0" means "already loaded"
/******/	// Array means "loading", array contains callbacks
/******/	var installedChunks = {0:0};
/******/	
/******/	// The require function
/******/	function require(moduleId) {
/******/		// Check if module is in cache
/******/		if(installedModules[moduleId])
/******/			return installedModules[moduleId].exports;
/******/		
/******/		// Create a new module (and put it into the cache)
/******/		var module = installedModules[moduleId] = {
/******/			exports: {},
/******/			id: moduleId,
/******/			loaded: false
/******/		};
/******/		
/******/		// Execute the module function
/******/		modules[moduleId].call(null, module, module.exports, require);
/******/		
/******/		// Flag the module as loaded
/******/		module.loaded = true;
/******/		
/******/		// Return the exports of the module
/******/		return module.exports;
/******/	}
/******/	
/******/	// The bundle contains no chunks. A empty chunk loading function.
/******/	require.e = function requireEnsure(chunkId, callback) {
/******/		// "0" is the signal for "already loaded"
/******/		if(installedChunks[chunkId] === 0)
/******/			return callback.call(null, require);
/******/		
/******/		// an array means "currently loading".
/******/		if(installedChunks[chunkId] !== undefined) {
/******/			installedChunks[chunkId].push(callback);
/******/		} else {
/******/			// start chunk loading
/******/			installedChunks[chunkId] = [callback];
/******/			var head = document.getElementsByTagName('head')[0];
/******/			var script = document.createElement('script');
/******/			script.type = 'text/javascript';
/******/			script.charset = 'utf-8';
/******/			script.src = modules.c + "" + chunkId + ".output.js";
/******/			head.appendChild(script);
/******/		}
/******/	};
/******/	
/******/	// expose the modules object (__webpack_modules__)
/******/	require.modules = modules;
/******/	
/******/	// expose the module cache
/******/	require.cache = installedModules;
/******/	
/******/	// install a JSONP callback for chunk loading
/******/	window["webpackJsonp"] = function webpackJsonpCallback(chunkIds, moreModules) {
/******/		// add "moreModules" to the modules object,
/******/		// then flag all "chunkIds" as loaded and fire callback
/******/		var moduleId, chunkId, callbacks = [];
/******/		while(chunkIds.length) {
/******/			chunkId = chunkIds.shift();
/******/			if(installedChunks[chunkId])
/******/				callbacks.push.apply(callbacks, installedChunks[chunkId]);
/******/			installedChunks[chunkId] = 0;
/******/		}
/******/		for(moduleId in moreModules)
/******/			modules[moduleId] = moreModules[moduleId];
/******/		while(callbacks.length)
/******/			callbacks.shift().call(null, require);
/******/	};
/******/	
/******/	// Load entry module and return exports
/******/	return require(0);
/******/})
/************************************************************************/
({
// __webpack_public_path__
c: "",

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
})
```

# js/1.output.js

``` javascript
webpackJsonp([1],
{

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

}
)
```

Minimized

``` javascript
webpackJsonp([1],{3:function(){},4:function(){}});
```

# Info

## Uncompressed

```
Hash: 5543ff7619209e2d2e8aeebc12be7462
Version: webpack 0.10.0-beta4
Time: 45ms
      Asset  Size  Chunks  Chunk Names
  output.js  3707       0  main       
1.output.js   307       1             
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
Hash: 5543ff7619209e2d2e8aeebc12be7462
Version: webpack 0.10.0-beta4
Time: 132ms
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
