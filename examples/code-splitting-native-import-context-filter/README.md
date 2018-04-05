# example.js

This example illustrates how to filter the ContextModule results of `import()` statements. only `.js` files that don't 
end in `.noimport.js` within the `templates` folder will be bundled.

``` javascript
async function getTemplate(templateName) {
	try {
		let template = await import(
			/* webpackInclude: /\.js$/ */
			/* webpackExclude: /\.noimport\.js$/ */
			`./templates/${templateName}`
		);
		console.log(template);
	} catch(err) {
		console.error(err);
		return new Error(err);
	}
}

getTemplate("foo");
getTemplate("bar");
getTemplate("baz");
getTemplate("foo.noimport");
getTemplate("bar.noimport");
getTemplate("baz.noimport");
```

# templates/

* foo.js
* foo.noimport.js
* baz.js
* foo.noimport.js
* bar.js
* foo.noimport.js

All templates are of this pattern:

``` javascript
var foo = "foo";

export default foo;
```

# dist/output.js

<details><summary><code>/******/ (function(modules) { /* webpackBootstrap */ })</code></summary>

``` javascript
/******/ (function(modules) { // webpackBootstrap
/******/ 	// install a JSONP callback for chunk loading
/******/ 	function webpackJsonpCallback(data) {
/******/ 		var chunkIds = data[0];
/******/ 		var moreModules = data[1];
/******/
/******/ 		// add "moreModules" to the modules object,
/******/ 		// then flag all "chunkIds" as loaded and fire callback
/******/ 		var moduleId, chunkId, i = 0, resolves = [];
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
/******/ 		if(parentJsonpFunction) parentJsonpFunction(data);
/******/ 		while(resolves.length) {
/******/ 			resolves.shift()();
/******/ 		}
/******/
/******/ 	};
/******/
/******/
/******/ 	// The module cache
/******/ 	var installedModules = {};
/******/
/******/ 	// object to store loaded and loading chunks
/******/ 	var installedChunks = {
/******/ 		3: 0
/******/ 	};
/******/
/******/
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
/******/ 		var promises = [];
/******/
/******/
/******/ 		// JSONP chunk loading for javascript
/******/
/******/ 		var installedChunkData = installedChunks[chunkId];
/******/ 		if(installedChunkData !== 0) { // 0 means "already installed".
/******/
/******/ 			// a Promise means "currently loading".
/******/ 			if(installedChunkData) {
/******/ 				promises.push(installedChunkData[2]);
/******/ 			} else {
/******/ 				// setup Promise in chunk cache
/******/ 				var promise = new Promise(function(resolve, reject) {
/******/ 					installedChunkData = installedChunks[chunkId] = [resolve, reject];
/******/ 				});
/******/ 				promises.push(installedChunkData[2] = promise);
/******/
/******/ 				// start chunk loading
/******/ 				var head = document.getElementsByTagName('head')[0];
/******/ 				var script = document.createElement('script');
/******/
/******/ 				script.charset = 'utf-8';
/******/ 				script.timeout = 120;
/******/
/******/ 				if (__webpack_require__.nc) {
/******/ 					script.setAttribute("nonce", __webpack_require__.nc);
/******/ 				}
/******/ 				script.src = __webpack_require__.p + "" + chunkId + ".output.js";
/******/ 				var timeout = setTimeout(function(){
/******/ 					onScriptComplete({ type: 'timeout', target: script });
/******/ 				}, 120000);
/******/ 				script.onerror = script.onload = onScriptComplete;
/******/ 				function onScriptComplete(event) {
/******/ 					// avoid mem leaks in IE.
/******/ 					script.onerror = script.onload = null;
/******/ 					clearTimeout(timeout);
/******/ 					var chunk = installedChunks[chunkId];
/******/ 					if(chunk !== 0) {
/******/ 						if(chunk) {
/******/ 							var errorType = event && (event.type === 'load' ? 'missing' : event.type);
/******/ 							var realSrc = event && event.target && event.target.src;
/******/ 							var error = new Error('Loading chunk ' + chunkId + ' failed.\n(' + errorType + ': ' + realSrc + ')');
/******/ 							error.type = errorType;
/******/ 							error.request = realSrc;
/******/ 							chunk[1](error);
/******/ 						}
/******/ 						installedChunks[chunkId] = undefined;
/******/ 					}
/******/ 				};
/******/ 				head.appendChild(script);
/******/ 			}
/******/ 		}
/******/ 		return Promise.all(promises);
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
/******/ 	// define __esModule on exports
/******/ 	__webpack_require__.r = function(exports) {
/******/ 		Object.defineProperty(exports, '__esModule', { value: true });
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
/******/ 	__webpack_require__.p = "dist/";
/******/
/******/ 	// on error function for async loading
/******/ 	__webpack_require__.oe = function(err) { console.error(err); throw err; };
/******/
/******/ 	var jsonpArray = window["webpackJsonp"] = window["webpackJsonp"] || [];
/******/ 	var oldJsonpFunction = jsonpArray.push.bind(jsonpArray);
/******/ 	jsonpArray.push = webpackJsonpCallback;
/******/ 	jsonpArray = jsonpArray.slice();
/******/ 	for(var i = 0; i < jsonpArray.length; i++) webpackJsonpCallback(jsonpArray[i]);
/******/ 	var parentJsonpFunction = oldJsonpFunction;
/******/
/******/
/******/ 	// Load entry module and return exports
/******/ 	return __webpack_require__(__webpack_require__.s = 4);
/******/ })
/************************************************************************/
```

</details>

``` javascript
/******/ ([
/* 0 */,
/* 1 */,
/* 2 */,
/* 3 */
/*!******************************************************************************************!*\
  !*** ./templates lazy ^\.\/.*$ include: \.js$ exclude: \.noimport\.js$ namespace object ***!
  \******************************************************************************************/
/*! no static exports found */
/***/ (function(module, exports, __webpack_require__) {

var map = {
	"./bar": [
		2,
		2
	],
	"./bar.js": [
		2,
		2
	],
	"./baz": [
		1,
		1
	],
	"./baz.js": [
		1,
		1
	],
	"./foo": [
		0,
		0
	],
	"./foo.js": [
		0,
		0
	]
};
function webpackAsyncContext(req) {
	var ids = map[req];
	if(!ids) {
		return Promise.resolve().then(function() {
			var e = new Error('Cannot find module "' + req + '".');
			e.code = 'MODULE_NOT_FOUND';
			throw e;
		});
	}
	return __webpack_require__.e(ids[1]).then(function() {
		var module = __webpack_require__(ids[0]);
		return module;
	});
}
webpackAsyncContext.keys = function webpackAsyncContextKeys() {
	return Object.keys(map);
};
webpackAsyncContext.id = 3;
module.exports = webpackAsyncContext;

/***/ }),
/* 4 */
/*!********************!*\
  !*** ./example.js ***!
  \********************/
/*! no static exports found */
/***/ (function(module, exports, __webpack_require__) {

async function getTemplate(templateName) {
	try {
		let template = await __webpack_require__(3)(`./${templateName}`);
		console.log(template);
	} catch(err) {
		console.error(err);
		return new Error(err);
	}
}

getTemplate("foo");
getTemplate("bar");
getTemplate("baz");
getTemplate("foo.noimport");
getTemplate("bar.noimport");
getTemplate("baz.noimport");



/***/ })
/******/ ]);
```

# Info

## Unoptimized

```
Hash: 0a1b2c3d4e5f6a7b8c9d
Version: webpack 4.5.0
      Asset       Size  Chunks             Chunk Names
0.output.js  433 bytes       0  [emitted]  
1.output.js  442 bytes       1  [emitted]  
2.output.js  436 bytes       2  [emitted]  
  output.js   8.21 KiB       3  [emitted]  main
Entrypoint main = output.js
chunk    {0} 0.output.js 38 bytes <{3}> [rendered]
    > ./foo [3] ./templates lazy ^\.\/.*$ include: \.js$ exclude: \.noimport\.js$ namespace object ./foo
    > ./foo.js [3] ./templates lazy ^\.\/.*$ include: \.js$ exclude: \.noimport\.js$ namespace object ./foo.js
    [0] ./templates/foo.js 38 bytes {0} [optional] [built]
        [exports: default]
        context element ./foo.js [3] ./templates lazy ^\.\/.*$ include: \.js$ exclude: \.noimport\.js$ namespace object ./foo.js
        context element ./foo [3] ./templates lazy ^\.\/.*$ include: \.js$ exclude: \.noimport\.js$ namespace object ./foo
chunk    {1} 1.output.js 38 bytes <{3}> [rendered]
    > ./baz [3] ./templates lazy ^\.\/.*$ include: \.js$ exclude: \.noimport\.js$ namespace object ./baz
    > ./baz.js [3] ./templates lazy ^\.\/.*$ include: \.js$ exclude: \.noimport\.js$ namespace object ./baz.js
    [1] ./templates/baz.js 38 bytes {1} [optional] [built]
        [exports: default]
        context element ./baz.js [3] ./templates lazy ^\.\/.*$ include: \.js$ exclude: \.noimport\.js$ namespace object ./baz.js
        context element ./baz [3] ./templates lazy ^\.\/.*$ include: \.js$ exclude: \.noimport\.js$ namespace object ./baz
chunk    {2} 2.output.js 38 bytes <{3}> [rendered]
    > ./bar [3] ./templates lazy ^\.\/.*$ include: \.js$ exclude: \.noimport\.js$ namespace object ./bar
    > ./bar.js [3] ./templates lazy ^\.\/.*$ include: \.js$ exclude: \.noimport\.js$ namespace object ./bar.js
    [2] ./templates/bar.js 38 bytes {2} [optional] [built]
        [exports: default]
        context element ./bar.js [3] ./templates lazy ^\.\/.*$ include: \.js$ exclude: \.noimport\.js$ namespace object ./bar.js
        context element ./bar [3] ./templates lazy ^\.\/.*$ include: \.js$ exclude: \.noimport\.js$ namespace object ./bar
chunk    {3} output.js (main) 597 bytes >{0}< >{1}< >{2}< [entry] [rendered]
    > .\example.js main
    [3] ./templates lazy ^\.\/.*$ include: \.js$ exclude: \.noimport\.js$ namespace object 160 bytes {3} [optional] [built]
        import() context lazy ./templates [4] ./example.js 3:23-7:3
    [4] ./example.js 437 bytes {3} [built]
        single entry .\example.js  main
```

## Production mode

```
Hash: 0a1b2c3d4e5f6a7b8c9d
Version: webpack 4.5.0
      Asset       Size  Chunks             Chunk Names
0.output.js  113 bytes       0  [emitted]  
1.output.js  114 bytes       1  [emitted]  
2.output.js  115 bytes       2  [emitted]  
  output.js   2.13 KiB       3  [emitted]  main
Entrypoint main = output.js
chunk    {0} 0.output.js 38 bytes <{3}> [rendered]
    > ./foo [3] ./templates lazy ^\.\/.*$ include: \.js$ exclude: \.noimport\.js$ namespace object ./foo
    > ./foo.js [3] ./templates lazy ^\.\/.*$ include: \.js$ exclude: \.noimport\.js$ namespace object ./foo.js
    [0] ./templates/foo.js 38 bytes {0} [optional] [built]
        [exports: default]
        context element ./foo.js [3] ./templates lazy ^\.\/.*$ include: \.js$ exclude: \.noimport\.js$ namespace object ./foo.js
        context element ./foo [3] ./templates lazy ^\.\/.*$ include: \.js$ exclude: \.noimport\.js$ namespace object ./foo
chunk    {1} 1.output.js 38 bytes <{3}> [rendered]
    > ./baz [3] ./templates lazy ^\.\/.*$ include: \.js$ exclude: \.noimport\.js$ namespace object ./baz
    > ./baz.js [3] ./templates lazy ^\.\/.*$ include: \.js$ exclude: \.noimport\.js$ namespace object ./baz.js
    [1] ./templates/baz.js 38 bytes {1} [optional] [built]
        [exports: default]
        context element ./baz.js [3] ./templates lazy ^\.\/.*$ include: \.js$ exclude: \.noimport\.js$ namespace object ./baz.js
        context element ./baz [3] ./templates lazy ^\.\/.*$ include: \.js$ exclude: \.noimport\.js$ namespace object ./baz
chunk    {2} 2.output.js 38 bytes <{3}> [rendered]
    > ./bar [3] ./templates lazy ^\.\/.*$ include: \.js$ exclude: \.noimport\.js$ namespace object ./bar
    > ./bar.js [3] ./templates lazy ^\.\/.*$ include: \.js$ exclude: \.noimport\.js$ namespace object ./bar.js
    [2] ./templates/bar.js 38 bytes {2} [optional] [built]
        [exports: default]
        context element ./bar.js [3] ./templates lazy ^\.\/.*$ include: \.js$ exclude: \.noimport\.js$ namespace object ./bar.js
        context element ./bar [3] ./templates lazy ^\.\/.*$ include: \.js$ exclude: \.noimport\.js$ namespace object ./bar
chunk    {3} output.js (main) 597 bytes >{0}< >{1}< >{2}< [entry] [rendered]
    > .\example.js main
    [3] ./templates lazy ^\.\/.*$ include: \.js$ exclude: \.noimport\.js$ namespace object 160 bytes {3} [optional] [built]
        import() context lazy ./templates [4] ./example.js 3:23-7:3
    [4] ./example.js 437 bytes {3} [built]
        single entry .\example.js  main
```
