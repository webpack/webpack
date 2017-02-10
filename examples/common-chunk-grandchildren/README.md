This example illustrates how common modules from deep ancestors of an entry point can be split into a seperate common chunk

* `pageA` and `pageB` are required normally
* `pageC` and `pageA` both require the `reusableComponent`
* `pageB` requires `PageC`

You can see that webpack outputs four files/chunks:

* `output.js` is the entry chunk and contains
  * the module system
  * chunk loading logic
  * the entry point `example.js`
  * module `reusableComponent`
* `0.output.js` is an additional chunk
  * module `pageC`
* `1.output.js` is an additional chunk
  * module `pageB`
* `2.output.js` is an additional chunk
  * module `pageA`


# example.js

``` javascript
var main = function() {
	console.log("Main class");
	require.ensure([], ()=>{
		const page = require("./pageA");
		page();
	});
	require.ensure([], ()=>{
		const page = require("./pageB");
		page();
	});
};

main();
```

# pageA.js

``` javascript
var reusableComponent = require("./reusableComponent");

module.exports = function() {
	console.log("Page A");
	reusableComponent();
};
```

# pageB.js

``` javascript
module.exports = function() {
	console.log("Page B");
	require.ensure([], ()=>{
		const page = require("./pageC");
		page();
	});
};
```

# pageC.js

``` javascript
var reusableComponent = require("./reusableComponent");

module.exports = function() {
	console.log("Page C");
	reusableComponent();
};
```

# reusableComponent.js

``` javascript
module.exports = function() {
	console.log("reusable Component");
};
```

# js/output.js

<details><summary>`/******/ (function(modules) { /* webpackBootstrap */ })`</summary>
``` javascript
/******/ (function(modules) { // webpackBootstrap
/******/ 	// install a JSONP callback for chunk loading
/******/ 	var parentJsonpFunction = window["webpackJsonp"];
/******/ 	window["webpackJsonp"] = function webpackJsonpCallback(chunkIds, moreModules, executeModules) {
/******/ 		// add "moreModules" to the modules object,
/******/ 		// then flag all "chunkIds" as loaded and fire callback
/******/ 		var moduleId, chunkId, i = 0, resolves = [], result;
/******/ 		for(;i < chunkIds.length; i++) {
/******/ 			chunkId = chunkIds[i];
/******/ 			if(installedChunks[chunkId])
/******/ 				resolves.push(installedChunks[chunkId][0]);
/******/ 			installedChunks[chunkId] = 0;
/******/ 		}
/******/ 		for(moduleId in moreModules) {
/******/ 			if(Object.prototype.hasOwnProperty.call(moreModules, moduleId)) {
/******/ 				modules[moduleId] = moreModules[moduleId];
/******/ 			}
/******/ 		}
/******/ 		if(parentJsonpFunction) parentJsonpFunction(chunkIds, moreModules, executeModules);
/******/ 		while(resolves.length)
/******/ 			resolves.shift()();

/******/ 	};

/******/ 	// The module cache
/******/ 	var installedModules = {};

/******/ 	// objects to store loaded and loading chunks
/******/ 	var installedChunks = {
/******/ 		3: 0
/******/ 	};

/******/ 	// The require function
/******/ 	function __webpack_require__(moduleId) {

/******/ 		// Check if module is in cache
/******/ 		if(installedModules[moduleId])
/******/ 			return installedModules[moduleId].exports;

/******/ 		// Create a new module (and put it into the cache)
/******/ 		var module = installedModules[moduleId] = {
/******/ 			i: moduleId,
/******/ 			l: false,
/******/ 			exports: {}
/******/ 		};

/******/ 		// Execute the module function
/******/ 		modules[moduleId].call(module.exports, module, module.exports, __webpack_require__);

/******/ 		// Flag the module as loaded
/******/ 		module.l = true;

/******/ 		// Return the exports of the module
/******/ 		return module.exports;
/******/ 	}

/******/ 	// This file contains only the entry chunk.
/******/ 	// The chunk loading function for additional chunks
/******/ 	__webpack_require__.e = function requireEnsure(chunkId) {
/******/ 		if(installedChunks[chunkId] === 0)
/******/ 			return Promise.resolve();

/******/ 		// a Promise means "currently loading".
/******/ 		if(installedChunks[chunkId]) {
/******/ 			return installedChunks[chunkId][2];
/******/ 		}
/******/ 		// start chunk loading
/******/ 		var head = document.getElementsByTagName('head')[0];
/******/ 		var script = document.createElement('script');
/******/ 		script.type = 'text/javascript';
/******/ 		script.charset = 'utf-8';
/******/ 		script.async = true;
/******/ 		script.timeout = 120000;

/******/ 		if (__webpack_require__.nc) {
/******/ 			script.setAttribute("nonce", __webpack_require__.nc);
/******/ 		}
/******/ 		script.src = __webpack_require__.p + "" + chunkId + ".output.js";
/******/ 		var timeout = setTimeout(onScriptComplete, 120000);
/******/ 		script.onerror = script.onload = onScriptComplete;
/******/ 		function onScriptComplete() {
/******/ 			// avoid mem leaks in IE.
/******/ 			script.onerror = script.onload = null;
/******/ 			clearTimeout(timeout);
/******/ 			var chunk = installedChunks[chunkId];
/******/ 			if(chunk !== 0) {
/******/ 				if(chunk) chunk[1](new Error('Loading chunk ' + chunkId + ' failed.'));
/******/ 				installedChunks[chunkId] = undefined;
/******/ 			}
/******/ 		};

/******/ 		var promise = new Promise(function(resolve, reject) {
/******/ 			installedChunks[chunkId] = [resolve, reject];
/******/ 		});
/******/ 		installedChunks[chunkId][2] = promise;

/******/ 		head.appendChild(script);
/******/ 		return promise;
/******/ 	};

/******/ 	// expose the modules object (__webpack_modules__)
/******/ 	__webpack_require__.m = modules;

/******/ 	// expose the module cache
/******/ 	__webpack_require__.c = installedModules;

/******/ 	// identity function for calling harmony imports with the correct context
/******/ 	__webpack_require__.i = function(value) { return value; };

/******/ 	// define getter function for harmony exports
/******/ 	__webpack_require__.d = function(exports, name, getter) {
/******/ 		if(!__webpack_require__.o(exports, name)) {
/******/ 			Object.defineProperty(exports, name, {
/******/ 				configurable: false,
/******/ 				enumerable: true,
/******/ 				get: getter
/******/ 			});
/******/ 		}
/******/ 	};

/******/ 	// getDefaultExport function for compatibility with non-harmony modules
/******/ 	__webpack_require__.n = function(module) {
/******/ 		var getter = module && module.__esModule ?
/******/ 			function getDefault() { return module['default']; } :
/******/ 			function getModuleExports() { return module; };
/******/ 		__webpack_require__.d(getter, 'a', getter);
/******/ 		return getter;
/******/ 	};

/******/ 	// Object.prototype.hasOwnProperty.call
/******/ 	__webpack_require__.o = function(object, property) { return Object.prototype.hasOwnProperty.call(object, property); };

/******/ 	// __webpack_public_path__
/******/ 	__webpack_require__.p = "js/";

/******/ 	// on error function for async loading
/******/ 	__webpack_require__.oe = function(err) { console.error(err); throw err; };

/******/ 	// Load entry module and return exports
/******/ 	return __webpack_require__(__webpack_require__.s = 1);
/******/ })
/************************************************************************/
```
</details>
``` javascript
/******/ ([
/* 0 */
/* unknown exports provided */
/* all exports used */
/*!********************!*\
  !*** ./example.js ***!
  \********************/
/***/ (function(module, exports, __webpack_require__) {

var main = function() {
	console.log("Main class");
	__webpack_require__.e/* require.ensure */(2).then((()=>{
		const page = __webpack_require__(/*! ./pageA */ 3);
		page();
	}).bind(null, __webpack_require__)).catch(__webpack_require__.oe);
	__webpack_require__.e/* require.ensure */(1).then((()=>{
		const page = __webpack_require__(/*! ./pageB */ 4);
		page();
	}).bind(null, __webpack_require__)).catch(__webpack_require__.oe);
};

main();


/***/ }),
/* 1 */
/* unknown exports provided */
/* all exports used */
/*!***************************************!*\
  !*** multi ./example.js ./example.js ***!
  \***************************************/
/***/ (function(module, exports, __webpack_require__) {

__webpack_require__(/*! ./example.js */0);
module.exports = __webpack_require__(/*! ./example.js */0);


/***/ }),
/* 2 */
/* unknown exports provided */
/* all exports used */
/*!******************************!*\
  !*** ./reusableComponent.js ***!
  \******************************/
/***/ (function(module, exports) {

module.exports = function() {
	console.log("reusable Component");
};


/***/ })
/******/ ]);
```

# js/0.output.js

``` javascript
webpackJsonp([0],{

/***/ 5:
/* unknown exports provided */
/* all exports used */
/*!******************!*\
  !*** ./pageC.js ***!
  \******************/
/***/ (function(module, exports, __webpack_require__) {

var reusableComponent = __webpack_require__(/*! ./reusableComponent */ 2);

module.exports = function() {
	console.log("Page C");
	reusableComponent();
};


/***/ })

});
```

# js/1.output.js

``` javascript
webpackJsonp([1],{

/***/ 4:
/* unknown exports provided */
/* all exports used */
/*!******************!*\
  !*** ./pageB.js ***!
  \******************/
/***/ (function(module, exports, __webpack_require__) {

module.exports = function() {
	console.log("Page B");
	__webpack_require__.e/* require.ensure */(0).then((()=>{
		const page = __webpack_require__(/*! ./pageC */ 5);
		page();
	}).bind(null, __webpack_require__)).catch(__webpack_require__.oe);
};


/***/ })

});
```

# js/2.output.js

``` javascript
webpackJsonp([2],{

/***/ 3:
/* unknown exports provided */
/* all exports used */
/*!******************!*\
  !*** ./pageA.js ***!
  \******************/
/***/ (function(module, exports, __webpack_require__) {

var reusableComponent = __webpack_require__(/*! ./reusableComponent */ 2);

module.exports = function() {
	console.log("Page A");
	reusableComponent();
};


/***/ })

});
```

# Info

## Uncompressed

```
Hash: a6ea92119553ae2a781b
Version: webpack 2.2.1
      Asset       Size  Chunks             Chunk Names
0.output.js  381 bytes       0  [emitted]  
1.output.js  473 bytes       1  [emitted]  
2.output.js  381 bytes       2  [emitted]  
  output.js    6.84 kB       3  [emitted]  main
Entrypoint main = output.js
chunk    {0} 0.output.js 136 bytes {3} [rendered]
    > [4] ./pageB.js 3:1-6:3
    [5] ./pageC.js 136 bytes {0} [built]
        cjs require ./pageC [4] ./pageB.js 4:15-33
chunk    {1} 1.output.js 133 bytes {3} [rendered]
    > [0] ./example.js 7:1-10:3
    [4] ./pageB.js 133 bytes {1} [built]
        cjs require ./pageB [0] ./example.js 8:15-33
chunk    {2} 2.output.js 136 bytes {3} [rendered]
    > [0] ./example.js 3:1-6:3
    [3] ./pageA.js 136 bytes {2} [built]
        cjs require ./pageA [0] ./example.js 4:15-33
chunk    {3} output.js (main) 325 bytes [entry] [rendered]
    > main [1] multi ./example.js ./example.js 
    [0] ./example.js 216 bytes {3} [built]
        single entry ./example.js [1] multi ./example.js ./example.js main:100000
        single entry ./example.js [1] multi ./example.js ./example.js main:100001
    [1] multi ./example.js ./example.js 40 bytes {3} [built]
    [2] ./reusableComponent.js 69 bytes {3} [built]
        cjs require ./reusableComponent [3] ./pageA.js 1:24-54
        cjs require ./reusableComponent [5] ./pageC.js 1:24-54
```

## Minimized (uglify-js, no zip)

```
Hash: a6ea92119553ae2a781b
Version: webpack 2.2.1
      Asset       Size  Chunks             Chunk Names
0.output.js   98 bytes       0  [emitted]  
1.output.js  333 bytes       1  [emitted]  
2.output.js   98 bytes       2  [emitted]  
  output.js    6.21 kB       3  [emitted]  main
Entrypoint main = output.js
chunk    {0} 0.output.js 136 bytes {3} [rendered]
    > [4] ./pageB.js 3:1-6:3
    [5] ./pageC.js 136 bytes {0} [built]
        cjs require ./pageC [4] ./pageB.js 4:15-33
chunk    {1} 1.output.js 133 bytes {3} [rendered]
    > [0] ./example.js 7:1-10:3
    [4] ./pageB.js 133 bytes {1} [built]
        cjs require ./pageB [0] ./example.js 8:15-33
chunk    {2} 2.output.js 136 bytes {3} [rendered]
    > [0] ./example.js 3:1-6:3
    [3] ./pageA.js 136 bytes {2} [built]
        cjs require ./pageA [0] ./example.js 4:15-33
chunk    {3} output.js (main) 325 bytes [entry] [rendered]
    > main [1] multi ./example.js ./example.js 
    [0] ./example.js 216 bytes {3} [built]
        single entry ./example.js [1] multi ./example.js ./example.js main:100000
        single entry ./example.js [1] multi ./example.js ./example.js main:100001
    [1] multi ./example.js ./example.js 40 bytes {3} [built]
    [2] ./reusableComponent.js 69 bytes {3} [built]
        cjs require ./reusableComponent [3] ./pageA.js 1:24-54
        cjs require ./reusableComponent [5] ./pageC.js 1:24-54

ERROR in 1.output.js from UglifyJs
SyntaxError: Unexpected token: punc ()) [1.output.js:8,53]

ERROR in output.js from UglifyJs
SyntaxError: Unexpected token: punc ()) [output.js:149,53]
```
