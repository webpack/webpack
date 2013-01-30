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
/******/ 		if(installedChunks[chunkId] === 1) return callback.call(null, require);
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
/******/ 	var installedChunks = {0:1};
/******/ 	window["webpackJsonp"] = function webpackJsonpCallback(chunkId, moreModules) {
/******/ 		for(var moduleId in moreModules)
/******/ 			modules[moduleId] = moreModules[moduleId];
/******/ 		var callbacks = installedChunks[chunkId];
/******/ 		installedChunks[chunkId] = 1;
/******/ 		for(var i = 0; i < callbacks.length; i++)
/******/ 			callbacks[i].call(null, require);
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
webpackJsonp(1, {

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
webpackJsonp(1,{3:function(){},4:function(){}});
```

# Info

## Uncompressed

```
Hash: e3da5eef20b37553da43a1d3e38f42f5
Time: 39ms
      Asset  Size  Chunks  Chunk Names
  output.js  2456       0  main       
1.output.js   304       1             
chunk    {0} output.js (main) 161
    [0] ./example.js 139 [built] {0}
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
Hash: e3da5eef20b37553da43a1d3e38f42f5
Time: 107ms
      Asset  Size  Chunks  Chunk Names
  output.js   768       0  main       
1.output.js    48       1             
chunk    {0} output.js (main) 161
    [0] ./example.js 139 [built] {0}
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

## Graph

![webpack-graph](http://webpack.github.com/webpack/examples/code-splitting/graph.svg)
