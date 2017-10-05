This example illustrates how common modules from deep ancestors of an entry point can be split into a seperate common chunk

* `pageA` and `pageB` are dynamically required
* `pageC` and `pageA` both require the `reusableComponent`
* `pageB` dynamically requires `PageC`

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
	require.ensure([], () => {
		const page = require("./pageA");
		page();
	});
	require.ensure([], () => {
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

# webpack.config.js

``` javascript
var webpack = require("../../");

module.exports = {
	entry: {
		main: ["./example.js"]
	},
	plugins: [
		new webpack.optimize.CommonsChunkPlugin({
			name: "main",
			minChunks: 2,
			children: true,
			deepChildren: true,
		})
	]
};
```

# js/output.js

<details><summary><code>/******/ (function(modules) { /* webpackBootstrap */ })</code></summary>

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
/******/ 			if(installedChunks[chunkId]) {
/******/ 				resolves.push(installedChunks[chunkId][0]);
/******/ 			}
/******/ 			installedChunks[chunkId] = 0;
/******/ 		}
/******/ 		for(moduleId in moreModules) {
/******/ 			if(Object.prototype.hasOwnProperty.call(moreModules, moduleId)) {
/******/ 				modules[moduleId] = moreModules[moduleId];
/******/ 			}
/******/ 		}
/******/ 		if(parentJsonpFunction) parentJsonpFunction(chunkIds, moreModules, executeModules);
/******/ 		while(resolves.length) {
/******/ 			resolves.shift()();
/******/ 		}
/******/
/******/ 	};
/******/
/******/ 	// The module cache
/******/ 	var installedModules = {};
/******/
/******/ 	// objects to store loaded and loading chunks
/******/ 	var installedChunks = {
/******/ 		3: 0
/******/ 	};
/******/
/******/ 	// The require function
/******/ 	function __webpack_require__(moduleId) {
/******/
/******/ 		// Check if module is in cache
/******/ 		if(installedModules[moduleId]) {
/******/ 			return installedModules[moduleId].exports;
/******/ 		}
/******/ 		// Create a new module (and put it into the cache)
/******/ 		var module = installedModules[moduleId] = {
/******/ 			i: moduleId,
/******/ 			l: false,
/******/ 			exports: {}
/******/ 		};
/******/
/******/ 		// Execute the module function
/******/ 		modules[moduleId].call(module.exports, module, module.exports, __webpack_require__);
/******/
/******/ 		// Flag the module as loaded
/******/ 		module.l = true;
/******/
/******/ 		// Return the exports of the module
/******/ 		return module.exports;
/******/ 	}
/******/
/******/ 	// This file contains only the entry chunk.
/******/ 	// The chunk loading function for additional chunks
/******/ 	__webpack_require__.e = function requireEnsure(chunkId) {
/******/ 		var installedChunkData = installedChunks[chunkId];
/******/ 		if(installedChunkData === 0) {
/******/ 			return new Promise(function(resolve) { resolve(); });
/******/ 		}
/******/
/******/ 		// a Promise means "currently loading".
/******/ 		if(installedChunkData) {
/******/ 			return installedChunkData[2];
/******/ 		}
/******/
/******/ 		// setup Promise in chunk cache
/******/ 		var promise = new Promise(function(resolve, reject) {
/******/ 			installedChunkData = installedChunks[chunkId] = [resolve, reject];
/******/ 		});
/******/ 		installedChunkData[2] = promise;
/******/
/******/ 		// start chunk loading
/******/ 		var head = document.getElementsByTagName('head')[0];
/******/ 		var script = document.createElement('script');
/******/ 		script.type = 'text/javascript';
/******/ 		script.charset = 'utf-8';
/******/ 		script.async = true;
/******/ 		script.timeout = 120000;
/******/
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
/******/ 				if(chunk) {
/******/ 					chunk[1](new Error('Loading chunk ' + chunkId + ' failed.'));
/******/ 				}
/******/ 				installedChunks[chunkId] = undefined;
/******/ 			}
/******/ 		};
/******/ 		head.appendChild(script);
/******/
/******/ 		return promise;
/******/ 	};
/******/
/******/ 	// expose the modules object (__webpack_modules__)
/******/ 	__webpack_require__.m = modules;
/******/
/******/ 	// expose the module cache
/******/ 	__webpack_require__.c = installedModules;
/******/
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
/******/
/******/ 	// getDefaultExport function for compatibility with non-harmony modules
/******/ 	__webpack_require__.n = function(module) {
/******/ 		var getter = module && module.__esModule ?
/******/ 			function getDefault() { return module['default']; } :
/******/ 			function getModuleExports() { return module; };
/******/ 		__webpack_require__.d(getter, 'a', getter);
/******/ 		return getter;
/******/ 	};
/******/
/******/ 	// Object.prototype.hasOwnProperty.call
/******/ 	__webpack_require__.o = function(object, property) { return Object.prototype.hasOwnProperty.call(object, property); };
/******/
/******/ 	// __webpack_public_path__
/******/ 	__webpack_require__.p = "js/";
/******/
/******/ 	// on error function for async loading
/******/ 	__webpack_require__.oe = function(err) { console.error(err); throw err; };
/******/
/******/ 	// Load entry module and return exports
/******/ 	return __webpack_require__(__webpack_require__.s = 1);
/******/ })
/************************************************************************/
```

</details>

``` javascript
/******/ ([
/* 0 */
/*!********************!*\
  !*** ./example.js ***!
  \********************/
/*! no static exports found */
/*! all exports used */
/***/ (function(module, exports, __webpack_require__) {

var main = function() {
	console.log("Main class");
	__webpack_require__.e/* require.ensure */(2).then((() => {
		const page = __webpack_require__(/*! ./pageA */ 3);
		page();
	}).bind(null, __webpack_require__)).catch(__webpack_require__.oe);
	__webpack_require__.e/* require.ensure */(1).then((() => {
		const page = __webpack_require__(/*! ./pageB */ 4);
		page();
	}).bind(null, __webpack_require__)).catch(__webpack_require__.oe);
};

main();


/***/ }),
/* 1 */
/*!***************************************!*\
  !*** multi ./example.js ./example.js ***!
  \***************************************/
/*! no static exports found */
/*! all exports used */
/***/ (function(module, exports, __webpack_require__) {

__webpack_require__(/*! ./example.js */0);
module.exports = __webpack_require__(/*! .\example.js */0);


/***/ }),
/* 2 */
/*!******************************!*\
  !*** ./reusableComponent.js ***!
  \******************************/
/*! no static exports found */
/*! all exports used */
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
/*!******************!*\
  !*** ./pageC.js ***!
  \******************/
/*! no static exports found */
/*! all exports used */
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
/*!******************!*\
  !*** ./pageB.js ***!
  \******************/
/*! no static exports found */
/*! all exports used */
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
/*!******************!*\
  !*** ./pageA.js ***!
  \******************/
/*! no static exports found */
/*! all exports used */
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
Hash: [1mfd4796594a8274a0759b[39m[22m
Version: webpack [1m3.6.0[39m[22m
Time: [1m91[39m[22mms
      [1mAsset[39m[22m       [1mSize[39m[22m  [1mChunks[39m[22m  [1m[39m[22m           [1m[39m[22m[1mChunk Names[39m[22m
[1m[32m0.output.js[39m[22m  388 bytes       [1m0[39m[22m  [1m[32m[emitted][39m[22m  
[1m[32m1.output.js[39m[22m  481 bytes       [1m1[39m[22m  [1m[32m[emitted][39m[22m  
[1m[32m2.output.js[39m[22m  388 bytes       [1m2[39m[22m  [1m[32m[emitted][39m[22m  
  [1m[32moutput.js[39m[22m    7.08 kB       [1m3[39m[22m  [1m[32m[emitted][39m[22m  main
Entrypoint [1mmain[39m[22m = [1m[32moutput.js[39m[22m
chunk    {[1m[33m0[39m[22m} [1m[32m0.output.js[39m[22m 142 bytes {[1m[33m3[39m[22m}[1m[32m [rendered][39m[22m
    > [4] [1m./pageB.js[39m[22m 3:1-6:3
    [5] [1m./pageC.js[39m[22m 142 bytes {[1m[33m0[39m[22m}[1m[32m [built][39m[22m
        cjs require [1m[36m./pageC[39m[22m [4] [1m[35m./pageB.js[39m[22m 4:15-33
chunk    {[1m[33m1[39m[22m} [1m[32m1.output.js[39m[22m 140 bytes {[1m[33m3[39m[22m}[1m[32m [rendered][39m[22m
    > [0] [1m./example.js[39m[22m 7:1-10:3
    [4] [1m./pageB.js[39m[22m 140 bytes {[1m[33m1[39m[22m}[1m[32m [built][39m[22m
        cjs require [1m[36m./pageB[39m[22m [0] [1m[35m./example.js[39m[22m 8:15-33
chunk    {[1m[33m2[39m[22m} [1m[32m2.output.js[39m[22m 142 bytes {[1m[33m3[39m[22m}[1m[32m [rendered][39m[22m
    > [0] [1m./example.js[39m[22m 3:1-6:3
    [3] [1m./pageA.js[39m[22m 142 bytes {[1m[33m2[39m[22m}[1m[32m [built][39m[22m
        cjs require [1m[36m./pageA[39m[22m [0] [1m[35m./example.js[39m[22m 4:15-33
chunk    {[1m[33m3[39m[22m} [1m[32moutput.js[39m[22m (main) 345 bytes[1m[33m [entry][39m[22m[1m[32m [rendered][39m[22m
    > main [1] [1mmulti ./example.js ./example.js[39m[22m 
    [0] [1m./example.js[39m[22m 233 bytes {[1m[33m3[39m[22m}[1m[32m [built][39m[22m
        single entry [1m[36m./example.js[39m[22m [1] [1m[35mmulti ./example.js ./example.js[39m[22m main:100000
        single entry [1m[36m.\example.js[39m[22m [1] [1m[35mmulti ./example.js ./example.js[39m[22m main:100001
    [1] [1mmulti ./example.js ./example.js[39m[22m 40 bytes {[1m[33m3[39m[22m}[1m[32m [built][39m[22m
    [2] [1m./reusableComponent.js[39m[22m 72 bytes {[1m[33m3[39m[22m}[1m[32m [built][39m[22m
        cjs require [1m[36m./reusableComponent[39m[22m [3] [1m[35m./pageA.js[39m[22m 1:24-54
        cjs require [1m[36m./reusableComponent[39m[22m [5] [1m[35m./pageC.js[39m[22m 1:24-54
```

## Minimized (uglify-js, no zip)

```
Hash: [1mfd4796594a8274a0759b[39m[22m
Version: webpack [1m3.6.0[39m[22m
Time: [1m150[39m[22mms
      [1mAsset[39m[22m       [1mSize[39m[22m  [1mChunks[39m[22m  [1m[39m[22m           [1m[39m[22m[1mChunk Names[39m[22m
[1m[32m0.output.js[39m[22m   98 bytes       [1m0[39m[22m  [1m[32m[emitted][39m[22m  
[1m[32m1.output.js[39m[22m  340 bytes       [1m1[39m[22m  [1m[32m[emitted][39m[22m  
[1m[32m2.output.js[39m[22m   98 bytes       [1m2[39m[22m  [1m[32m[emitted][39m[22m  
  [1m[32moutput.js[39m[22m    6.48 kB       [1m3[39m[22m  [1m[32m[emitted][39m[22m  main
Entrypoint [1mmain[39m[22m = [1m[32moutput.js[39m[22m
chunk    {[1m[33m0[39m[22m} [1m[32m0.output.js[39m[22m 142 bytes {[1m[33m3[39m[22m}[1m[32m [rendered][39m[22m
    > [4] [1m./pageB.js[39m[22m 3:1-6:3
    [5] [1m./pageC.js[39m[22m 142 bytes {[1m[33m0[39m[22m}[1m[32m [built][39m[22m
        cjs require [1m[36m./pageC[39m[22m [4] [1m[35m./pageB.js[39m[22m 4:15-33
chunk    {[1m[33m1[39m[22m} [1m[32m1.output.js[39m[22m 140 bytes {[1m[33m3[39m[22m}[1m[32m [rendered][39m[22m
    > [0] [1m./example.js[39m[22m 7:1-10:3
    [4] [1m./pageB.js[39m[22m 140 bytes {[1m[33m1[39m[22m}[1m[32m [built][39m[22m
        cjs require [1m[36m./pageB[39m[22m [0] [1m[35m./example.js[39m[22m 8:15-33
chunk    {[1m[33m2[39m[22m} [1m[32m2.output.js[39m[22m 142 bytes {[1m[33m3[39m[22m}[1m[32m [rendered][39m[22m
    > [0] [1m./example.js[39m[22m 3:1-6:3
    [3] [1m./pageA.js[39m[22m 142 bytes {[1m[33m2[39m[22m}[1m[32m [built][39m[22m
        cjs require [1m[36m./pageA[39m[22m [0] [1m[35m./example.js[39m[22m 4:15-33
chunk    {[1m[33m3[39m[22m} [1m[32moutput.js[39m[22m (main) 345 bytes[1m[33m [entry][39m[22m[1m[32m [rendered][39m[22m
    > main [1] [1mmulti ./example.js ./example.js[39m[22m 
    [0] [1m./example.js[39m[22m 233 bytes {[1m[33m3[39m[22m}[1m[32m [built][39m[22m
        single entry [1m[36m./example.js[39m[22m [1] [1m[35mmulti ./example.js ./example.js[39m[22m main:100000
        single entry [1m[36m.\example.js[39m[22m [1] [1m[35mmulti ./example.js ./example.js[39m[22m main:100001
    [1] [1mmulti ./example.js ./example.js[39m[22m 40 bytes {[1m[33m3[39m[22m}[1m[32m [built][39m[22m
    [2] [1m./reusableComponent.js[39m[22m 72 bytes {[1m[33m3[39m[22m}[1m[32m [built][39m[22m
        cjs require [1m[36m./reusableComponent[39m[22m [3] [1m[35m./pageA.js[39m[22m 1:24-54
        cjs require [1m[36m./reusableComponent[39m[22m [5] [1m[35m./pageC.js[39m[22m 1:24-54

[1m[31mERROR in 1.output.js from UglifyJs
Unexpected token: punc ()) [1.output.js:8,53][39m[22m

[1m[31mERROR in output.js from UglifyJs
Unexpected token: punc ()) [output.js:154,53][39m[22m
```
