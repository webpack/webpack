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
(function(modules) { // webpackBootstrap
	// The module cache
	var installedModules = {};
	
	// object to store loaded and loading chunks
	// "0" means "already loaded"
	// Array means "loading", array contains callbacks
	var installedChunks = {0:0};
	
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
	
	// The bundle contains no chunks. A empty chunk loading function.
	require.e = function requireEnsure(chunkId, callback) {
		// "0" is the signal for "already loaded"
		if(installedChunks[chunkId] === 0)
			return callback.call(null, require);
		
		// an array means "currently loading".
		if(installedChunks[chunkId] !== undefined) {
			installedChunks[chunkId].push(callback);
		} else {
			// start chunk loading
			installedChunks[chunkId] = [callback];
			var head = document.getElementsByTagName('head')[0];
			var script = document.createElement('script');
			script.type = 'text/javascript';
			script.charset = 'utf-8';
			script.src = modules.c + "" + chunkId + ".output.js";
			head.appendChild(script);
		}
	};
	
	// expose the modules object (__webpack_modules__)
	require.modules = modules;
	
	// expose the module cache
	require.cache = installedModules;
	
	// install a JSONP callback for chunk loading
	window["webpackJsonp"] = function webpackJsonpCallback(chunkIds, moreModules) {
		// add "moreModules" to the modules object,
		// then flag all "chunkIds" as loaded and fire callback
		var moduleId, chunkId, callbacks = [];
		while(chunkIds.length) {
			chunkId = chunkIds.shift();
			if(installedChunks[chunkId])
				callbacks.push.apply(callbacks, installedChunks[chunkId]);
			installedChunks[chunkId] = 0;
		}
		for(moduleId in moreModules)
			modules[moduleId] = moreModules[moduleId];
		while(callbacks.length)
			callbacks.shift().call(null, require);
	};
	
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

require(/*! bundle!./file.js */ 1)(function(fileJsExports) {
	console.log(fileJsExports);
});

/***/ },

/***/ 1:
/*!************************************************************************************!*\
  !*** (webpack)/~/bundle-loader!./file.js ***!
  \************************************************************************************/
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
})
```

# js/1.output.js

``` javascript
webpackJsonp([1],
{

/***/ 2:
/*!*****************!*\
  !*** ./file.js ***!
  \*****************/
/***/ function(module, exports, require) {

module.exports = "It works";

/***/ }

}
)
```

# Info

## Uncompressed

```
Hash: d75e46ac811b482356205a47ab1dc1c0
Version: webpack 0.10.0-beta3
Time: 71ms
      Asset  Size  Chunks  Chunk Names
  output.js  3332       0  main       
1.output.js   184       1             
chunk    {0} output.js (main) 486
    [0] ./example.js 88 [built] {0}
    [1] (webpack)/~/bundle-loader!./file.js 398 [built] {0}
        cjs require bundle!./file.js [0] ./example.js 1:0-27
chunk    {1} 1.output.js 28 {0} 
    [2] ./file.js 28 [built] {1}
        cjs require !!.\file.js [1] (webpack)/~/bundle-loader!./file.js 8:8-147
```

## Minimized (uglify-js, no zip)

```
Hash: d75e46ac811b482356205a47ab1dc1c0
Version: webpack 0.10.0-beta3
Time: 156ms
      Asset  Size  Chunks  Chunk Names
  output.js   853       0  main       
1.output.js    56       1             
chunk    {0} output.js (main) 486
    [0] ./example.js 88 [built] {0}
    [1] (webpack)/~/bundle-loader!./file.js 398 [built] {0}
        cjs require bundle!./file.js [0] ./example.js 1:0-27
chunk    {1} 1.output.js 28 {0} 
    [2] ./file.js 28 [built] {1}
        cjs require !!.\file.js [1] (webpack)/~/bundle-loader!./file.js 8:8-147
```
