# example.js

``` javascript
require("bundle!./file.js")(function(fileJsExports) {
	console.log(fileJsExports);
});
```

# file.js

``` javascript
module.exports = "It works";
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

	require(/*! bundle!./file.js */ 1)(function(fileJsExports) {
		console.log(fileJsExports);
	});

/***/ },

/***/ 1:
/*!*******************************************!*\
  !*** (webpack)/~/bundle-loader!./file.js ***!
  \*******************************************/
/***/ function(module, exports, require) {

	var cbs = [], 
		data;
	module.exports = function(cb) {
		if(cbs) cbs.push(cb);
		else cb(data);
	}
	require.e/*nsure*/(1, function(require) {
		data = require(/*! !./file.js */ 2);
		var callbacks = cbs;
		cbs = null;
		for(var i = 0, l = callbacks.length; i < l; i++) {
			callbacks[i](data);
		}
	});

/***/ }
/******/ })

```

# js/1.output.js

``` javascript
webpackJsonp(1, {

/***/ 2:
/*!*****************!*\
  !*** ./file.js ***!
  \*****************/
/***/ function(module, exports, require) {

	module.exports = "It works";

/***/ }

})
```

# Info

## Uncompressed

```
Hash: cc24cfb25787184810a9e9dd0e4c4999
Time: 57ms
      Asset  Size  Chunks  Chunk Names
  output.js  2610       0  main       
1.output.js   182       1             
chunk    {0} output.js (main) 508
    [0] ./example.js 86 [built] {0}
    [1] (webpack)/~/bundle-loader!./file.js 422 [built] {0}
        cjs require bundle!./file.js [0] ./example.js 1:0-27
chunk    {1} 1.output.js 28 {0} 
    [2] ./file.js 28 [built] {1}
        cjs require !!.\file.js [1] (webpack)/~/bundle-loader!./file.js 8:8-171
```

## Minimized (uglify-js, no zip)

```
Hash: cc24cfb25787184810a9e9dd0e4c4999
Time: 146ms
      Asset  Size  Chunks  Chunk Names
  output.js   877       0  main       
1.output.js    54       1             
chunk    {0} output.js (main) 508
    [0] ./example.js 86 [built] {0}
    [1] (webpack)/~/bundle-loader!./file.js 422 [built] {0}
        cjs require bundle!./file.js [0] ./example.js 1:0-27
chunk    {1} 1.output.js 28 {0} 
    [2] ./file.js 28 [built] {1}
        cjs require !!.\file.js [1] (webpack)/~/bundle-loader!./file.js 8:8-171
```

## Graph

![webpack-graph](http://webpack.github.com/webpack/examples/code-splitting-bundle-loader/graph.svg)
