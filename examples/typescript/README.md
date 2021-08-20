# example.js

```javascript
console.log(require("./index"));
```

# index.ts

```typescript
const myName: string = "Junya";
const age: number = 22;

function getArray<T>(...args: T[]): T[] {
	return [...args];
}

console.log(getArray("foo", "bar"));
console.log(getArray(1, 2, 3));
```

# webpack.config.js

```javascript
const ForkTsCheckerWebpackPlugin = require("fork-ts-checker-webpack-plugin");

module.exports = (env = "development") => ({
	mode: env,
	entry: {
		output: "./index.ts"
	},
	module: {
		rules: [
			{
				test: /\.tsx?$/,
				loader: "ts-loader",
				options: {
					transpileOnly: true
				}
			}
		]
	},
	resolve: {
		extensions: [".ts", ".js", ".json"]
	},
	plugins: [new ForkTsCheckerWebpackPlugin({ async: env === "production" })]
});
```

# dist/output.js

```javascript
/******/ (() => { // webpackBootstrap
/******/ 	var __webpack_modules__ = ([
/* 0 */,
/* 1 */
/*!******************!*\
  !*** ./index.ts ***!
  \******************/
/*! unknown exports (runtime-defined) */
/*! runtime requirements: top-level-this-exports */
/*! CommonJS bailout: this is used directly at 1:21-25 */
/***/ (function() {

var __spreadArray = (this && this.__spreadArray) || function (to, from) {
    for (var i = 0, il = from.length, j = to.length; i < il; i++, j++)
        to[j] = from[i];
    return to;
};
var myName = "Junya";
var age = 22;
function getArray() {
    var args = [];
    for (var _i = 0; _i < arguments.length; _i++) {
        args[_i] = arguments[_i];
    }
    return __spreadArray([], args);
}
console.log(getArray("foo", "bar"));
console.log(getArray(1, 2, 3));


/***/ })
/******/ 	]);
```

<details><summary><code>/* webpack runtime code */</code></summary>

``` js
/************************************************************************/
/******/ 	// The module cache
/******/ 	var __webpack_module_cache__ = {};
/******/ 	
/******/ 	// The require function
/******/ 	function __webpack_require__(moduleId) {
/******/ 		// Check if module is in cache
/******/ 		var cachedModule = __webpack_module_cache__[moduleId];
/******/ 		if (cachedModule !== undefined) {
/******/ 			return cachedModule.exports;
/******/ 		}
/******/ 		// Create a new module (and put it into the cache)
/******/ 		var module = __webpack_module_cache__[moduleId] = {
/******/ 			// no module.id needed
/******/ 			// no module.loaded needed
/******/ 			exports: {}
/******/ 		};
/******/ 	
/******/ 		// Execute the module function
/******/ 		__webpack_modules__[moduleId].call(module.exports, module, module.exports, __webpack_require__);
/******/ 	
/******/ 		// Return the exports of the module
/******/ 		return module.exports;
/******/ 	}
/******/ 	
/************************************************************************/
```

</details>

``` js
var __webpack_exports__ = {};
// This entry need to be wrapped in an IIFE because it need to be isolated against other modules in the chunk.
(() => {
/*!********************!*\
  !*** ./example.js ***!
  \********************/
/*! unknown exports (runtime-defined) */
/*! runtime requirements: __webpack_require__ */
console.log(__webpack_require__(/*! ./index */ 1));

})();

/******/ })()
;
```

# Info

## Unoptimized

```
asset output.js 2.22 KiB [emitted] (name: main)
chunk (runtime: main) output.js (main) 513 bytes [entry] [rendered]
  > ./example.js main
  dependent modules 480 bytes [dependent] 1 module
  ./example.js 33 bytes [built] [code generated]
    [used exports unknown]
    entry ./example.js main
webpack 5.51.1 compiled successfully
```

## Production mode

```
asset output.js 438 bytes [emitted] [minimized] (name: main)
chunk (runtime: main) output.js (main) 513 bytes [entry] [rendered]
  > ./example.js main
  dependent modules 480 bytes [dependent] 1 module
  ./example.js 33 bytes [built] [code generated]
    [no exports used]
    entry ./example.js main
webpack 5.51.1 compiled successfully
```
