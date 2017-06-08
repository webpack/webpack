# WARNING
JsonpErrorHandlingPlugin breaks backward compatibility for require.ensure callback function.
function will be call always and first argument will be Error or null, the second argument is require.

You may simulate default behavior in runtime code:

``` javascript
var
    defaultEnsure = __webpack_require__.e;

if (defaultEnsure) {
    __webpack_require__.e = function (chunk, callback, name) {
        defaultEnsure.call(null, chunk, function (error, _require) {
            if (!error) callback(_require);
        }, name);
    }
}
```

# example.js

``` javascript
/**
 * MIT License http://www.opensource.org/licenses/mit-license.php
 * @author "Evgeny Reznichenko" <kusakyky@gmail.com>
 */


require.ensure(["./a.js"], function (error, require) {
    if (error) {
        // do something on error
        console.error(error);
    } else {
        require("./a.js");
    }
}, "a");
```

# a.js

``` javascript
/**
 * MIT License http://www.opensource.org/licenses/mit-license.php
 * @author "Evgeny Reznichenko" <kusakyky@gmail.com>
 */

console.log("a");
```

# webpack.config.js

``` javascript
var path = require('path');
var JsonpErrorHandlingPlugin = require("../../lib/JsonpErrorHandlingPlugin");

module.exports = {
	entry: "./example",
	output: {
		path: path.join(__dirname, "js"),
		filename: "output.js",
		chunkFilename: "[name].chunk.output.js",
		jsonpLoadTimeout: 10 * 1000 // default 60 sec
	},
	plugins: [
		new JsonpErrorHandlingPlugin()
	]
}
```

# js/output.js

``` javascript
/******/ (function(modules) { // webpackBootstrap
/******/ 	// install a JSONP callback for chunk loading
/******/ 	var parentJsonpFunction = window["webpackJsonp"];
/******/ 	window["webpackJsonp"] = function webpackJsonpCallback(chunkIds, moreModules) {
/******/ 		// add "moreModules" to the modules object,
/******/ 		// then flag all "chunkIds" as loaded and fire callback
/******/ 		var moduleId, chunkId, i = 0, callbacks = [];
/******/ 		for(;i < chunkIds.length; i++) {
/******/ 			chunkId = chunkIds[i];
/******/ 			if(installedChunks[chunkId])
/******/ 				callbacks.push.apply(callbacks, installedChunks[chunkId]);
/******/ 			installedChunks[chunkId] = 0;
/******/ 		}
/******/ 		for(moduleId in moreModules) {
/******/ 			modules[moduleId] = moreModules[moduleId];
/******/ 		}
/******/ 		if(parentJsonpFunction) parentJsonpFunction(chunkIds, moreModules);
/******/ 		while(callbacks.length)
/******/ 			callbacks.shift().call(null, null, __webpack_require__);
/******/
/******/ 	};
/******/
/******/ 	// setupScriptLoadErrorHandler
/******/ 	function setupScriptLoadErrorHandler(script, chunkId) {
/******/ 		var timeoutId;
/******/ 		var done = false;
/******/
/******/ 		function end(error) {
/******/ 			script.onerror = script.onload = script.onreadystatechange = null;
/******/ 			clearTimeout(timeoutId);
/******/ 			if (done) return;
/******/ 			if (error) {
/******/ 				installedChunks[chunkId] = -1;
/******/ 				chunkLoadErrors[chunkId] = error;
/******/ 				var callbacks = installedChunks[chunkId];
/******/ 				delete installedChunks[chunkId];
/******/
/******/ 				if (callbacks) while(callbacks.length) {
/******/ 					callbacks.shift().call(null, chunkLoadErrors[chunkId], __webpack_require__);
/******/ 				}
/******/ 			}
/******/ 			done = true;
/******/ 		}
/******/
/******/ 		script.onload = script.onreadystatechange = function() {
/******/ 			var readyState = this.readyState;
/******/ 			if (!readyState || readyState === "loaded" || readyState === "complete") {
/******/ 				end();
/******/ 			}
/******/ 		};
/******/
/******/ 		script.onerror = function () {
/******/ 			end(new Error("failed load chunk file: " + script.src));
/******/ 		};
/******/
/******/ 		timeoutId = setTimeout(function () {
/******/ 			end(new Error("timeout on load chunk file: " + script.src));
/******/ 		}, 10000);
/******/ 	}
/******/
/******/
/******/ 	// The module cache
/******/ 	var installedModules = {};
/******/
/******/ 	// object to store loaded and loading chunks
/******/ 	// "0" means "already loaded"
/******/ 	// Array means "loading", array contains callbacks
/******/ 	var installedChunks = {
/******/ 		0:0
/******/ 	};
/******/ 	// object to store chunk load error
/******/ 	var chunkLoadErrors = {};
/******/
/******/
/******/ 	// The require function
/******/ 	function __webpack_require__(moduleId) {
/******/
/******/ 		// Check if module is in cache
/******/ 		if(installedModules[moduleId])
/******/ 			return installedModules[moduleId].exports;
/******/
/******/ 		// Create a new module (and put it into the cache)
/******/ 		var module = installedModules[moduleId] = {
/******/ 			exports: {},
/******/ 			id: moduleId,
/******/ 			loaded: false
/******/ 		};
/******/
/******/ 		// Execute the module function
/******/ 		modules[moduleId].call(module.exports, module, module.exports, __webpack_require__);
/******/
/******/ 		// Flag the module as loaded
/******/ 		module.loaded = true;
/******/
/******/ 		// Return the exports of the module
/******/ 		return module.exports;
/******/ 	}
/******/
/******/ 	// This file contains only the entry chunk.
/******/ 	// The chunk loading function for additional chunks
/******/ 	__webpack_require__.e = function requireEnsure(chunkId, callback) {
/******/ 		// "0" is the signal for "already loaded"
/******/ 		// "-1" is the signal for "chunk load error"
/******/ 		if(installedChunks[chunkId] === 0 || installedChunks[chunkId] === -1)
/******/ 			return callback.call(null, chunkLoadErrors[chunkId], __webpack_require__);
/******/
/******/ 		// an array means "currently loading".
/******/ 		if(installedChunks[chunkId] !== undefined) {
/******/ 			installedChunks[chunkId].push(callback);
/******/ 		} else {
/******/ 			// start chunk loading
/******/ 			installedChunks[chunkId] = [callback];
/******/ 			var head = document.getElementsByTagName('head')[0];
/******/ 			var script = document.createElement('script');
/******/ 			script.type = 'text/javascript';
/******/ 			script.charset = 'utf-8';
/******/ 			script.async = true;
/******/ 			script.src = __webpack_require__.p + "" + ({"1":"a"}[chunkId]||chunkId) + ".chunk.output.js";
/******/ 			setupScriptLoadErrorHandler(script, chunkId);
/******/ 			head.appendChild(script);
/******/ 		}
/******/ 	};
/******/
/******/ 	// expose the modules object (__webpack_modules__)
/******/ 	__webpack_require__.m = modules;
/******/
/******/ 	// expose the module cache
/******/ 	__webpack_require__.c = installedModules;
/******/
/******/ 	// __webpack_public_path__
/******/ 	__webpack_require__.p = "js/";
/******/
/******/ 	// expose the chunk error
/******/ 	__webpack_require__.ce = chunkLoadErrors;
/******/
/******/
/******/ 	// Load entry module and return exports
/******/ 	return __webpack_require__(0);
/******/ })
/************************************************************************/
/******/ ([
/* 0 */
/*!********************!*\
  !*** ./example.js ***!
  \********************/
/***/ function(module, exports, __webpack_require__) {

	/**
	 * MIT License http://www.opensource.org/licenses/mit-license.php
	 * @author "Evgeny Reznichenko" <kusakyky@gmail.com>
	 */


	__webpack_require__.e/* nsure */(1/*! a */, function (error, require) {
	    if (error) {
	        // do something on error
	        console.error(error);
	    } else {
	        __webpack_require__(/*! ./a.js */ 1);
	    }
	});


/***/ }
/******/ ])
```

# js/a.chunk.output.js

``` javascript
webpackJsonp([1],[
/* 0 */,
/* 1 */
/*!**************!*\
  !*** ./a.js ***!
  \**************/
/***/ function(module, exports, __webpack_require__) {

	/**
	 * MIT License http://www.opensource.org/licenses/mit-license.php
	 * @author "Evgeny Reznichenko" <kusakyky@gmail.com>
	 */

	console.log("a");


/***/ }
]);
```

# Info

## Uncompressed

```
Hash: efdde79879eeaa63cef1
Version: webpack 1.4.15
Time: 55ms
            Asset  Size  Chunks             Chunk Names
        output.js  5892       0  [emitted]  main
a.chunk.output.js   315       1  [emitted]  a
chunk    {0} output.js (main) 319 [rendered]
    > main [0] ./example.js 
    [0] ./example.js 319 {0} [built]
chunk    {1} a.chunk.output.js (a) 146 {0} [rendered]
    > a [0] ./example.js 7:0-14:7
    [1] ./a.js 146 {1} [built]
        require.ensure item ./a.js [0] ./example.js 7:0-14:7
        cjs require ./a.js [0] ./example.js 12:8-25
```

## Minimized (uglify-js, no zip)

```
Hash: 1581304d4105098455aa
Version: webpack 1.4.15
Time: 235ms
            Asset  Size  Chunks             Chunk Names
        output.js  1277       0  [emitted]  main
a.chunk.output.js    50       1  [emitted]  a
chunk    {0} output.js (main) 319 [rendered]
    > main [0] ./example.js 
    [0] ./example.js 319 {0} [built]
chunk    {1} a.chunk.output.js (a) 146 {0} [rendered]
    > a [0] ./example.js 7:0-14:7
    [1] ./a.js 146 {1} [built]
        require.ensure item ./a.js [0] ./example.js 7:0-14:7
        cjs require ./a.js [0] ./example.js 12:8-25

WARNING in output.js from UglifyJs
Dropping unused function argument require [./example.js:7,0]
```
