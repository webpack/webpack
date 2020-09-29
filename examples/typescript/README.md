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
/*! CommonJS bailout: this is used directly at 1:22-26 */
/***/ (function() {

var __spreadArrays = (this && this.__spreadArrays) || function () {
    for (var s = 0, i = 0, il = arguments.length; i < il; i++) s += arguments[i].length;
    for (var r = Array(s), k = 0, i = 0; i < il; i++)
        for (var a = arguments[i], j = 0, jl = a.length; j < jl; j++, k++)
            r[k] = a[j];
    return r;
};
var myName = "Junya";
var age = 22;
function getArray() {
    var args = [];
    for (var _i = 0; _i < arguments.length; _i++) {
        args[_i] = arguments[_i];
    }
    return __spreadArrays(args);
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
/******/ 		if(__webpack_module_cache__[moduleId]) {
/******/ 			return __webpack_module_cache__[moduleId].exports;
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
Starting type checking service...
Using 1 worker with 2048MB memory limit
asset output.js 2.18 KiB [emitted] (name: main)
chunk output.js (main) 652 bytes [entry] [rendered]
  > ./example.js main
  dependent modules 619 bytes [dependent] 1 module
  ./example.js 33 bytes [built] [code generated]
    [used exports unknown]
    entry ./example.js main

ERROR in (webpack)/node_modules/@types/babel__core/index.d.ts
ERROR in (webpack)/node_modules/@types/babel__core/index.d.ts(14,20):
TS2307: Cannot find module '@babel/types' or its corresponding type declarations.

ERROR in (webpack)/node_modules/@types/babel__core/index.d.ts
ERROR in (webpack)/node_modules/@types/babel__core/index.d.ts(15,31):
TS2307: Cannot find module '@babel/parser' or its corresponding type declarations.

ERROR in (webpack)/node_modules/@types/babel__generator/index.d.ts
ERROR in (webpack)/node_modules/@types/babel__generator/index.d.ts(11,20):
TS2307: Cannot find module '@babel/types' or its corresponding type declarations.

ERROR in (webpack)/node_modules/@types/babel__template/index.d.ts
ERROR in (webpack)/node_modules/@types/babel__template/index.d.ts(9,31):
TS2307: Cannot find module '@babel/parser' or its corresponding type declarations.

ERROR in (webpack)/node_modules/@types/babel__template/index.d.ts
ERROR in (webpack)/node_modules/@types/babel__template/index.d.ts(10,54):
TS2307: Cannot find module '@babel/types' or its corresponding type declarations.

ERROR in (webpack)/node_modules/@types/babel__traverse/index.d.ts
ERROR in (webpack)/node_modules/@types/babel__traverse/index.d.ts(12,20):
TS2307: Cannot find module '@babel/types' or its corresponding type declarations.

ERROR in (webpack)/node_modules/@types/babel__traverse/index.d.ts
ERROR in (webpack)/node_modules/@types/babel__traverse/index.d.ts(40,5):
TS2411: Property 'scope' of type 'Scope' is not assignable to string index type '(VisitNodeFunction<S, any> & VisitNodeFunction<S, any>) | (VisitNodeFunction<S, any> & VisitNodeObject<S, any>) | (VisitNodeObject<...> & VisitNodeFunction<...>) | (VisitNodeObject<...> & VisitNodeObject<...>)'.

ERROR in (webpack)/node_modules/@types/babel__traverse/index.d.ts
ERROR in (webpack)/node_modules/@types/babel__traverse/index.d.ts(41,5):
TS2411: Property 'noScope' of type 'boolean' is not assignable to string index type '(VisitNodeFunction<S, any> & VisitNodeFunction<S, any>) | (VisitNodeFunction<S, any> & VisitNodeObject<S, any>) | (VisitNodeObject<...> & VisitNodeFunction<...>) | (VisitNodeObject<...> & VisitNodeObject<...>)'.

ERROR in (webpack)/node_modules/@types/jest/index.d.ts
ERROR in (webpack)/node_modules/@types/jest/index.d.ts(486,51):
TS2307: Cannot find module 'jest-diff' or its corresponding type declarations.

ERROR in (webpack)/node_modules/@types/jest/index.d.ts
ERROR in (webpack)/node_modules/@types/jest/index.d.ts(540,44):
TS2307: Cannot find module 'pretty-format' or its corresponding type declarations.

webpack 5.0.0-beta.32 compiled with 10 errors
```

## Production mode

```
Starting type checking service...
Using 1 worker with 2048MB memory limit
asset output.js 524 bytes [emitted] [minimized] (name: main)
chunk (runtime: main) output.js (main) 652 bytes [entry] [rendered]
  > ./example.js main
  dependent modules 619 bytes [dependent] 1 module
  ./example.js 33 bytes [built] [code generated]
    [no exports used]
    entry ./example.js main

ERROR in (webpack)/node_modules/@types/babel__core/index.d.ts
ERROR in (webpack)/node_modules/@types/babel__core/index.d.ts(14,20):
TS2307: Cannot find module '@babel/types' or its corresponding type declarations.

ERROR in (webpack)/node_modules/@types/babel__core/index.d.ts
ERROR in (webpack)/node_modules/@types/babel__core/index.d.ts(15,31):
TS2307: Cannot find module '@babel/parser' or its corresponding type declarations.

ERROR in (webpack)/node_modules/@types/babel__generator/index.d.ts
ERROR in (webpack)/node_modules/@types/babel__generator/index.d.ts(11,20):
TS2307: Cannot find module '@babel/types' or its corresponding type declarations.

ERROR in (webpack)/node_modules/@types/babel__template/index.d.ts
ERROR in (webpack)/node_modules/@types/babel__template/index.d.ts(9,31):
TS2307: Cannot find module '@babel/parser' or its corresponding type declarations.

ERROR in (webpack)/node_modules/@types/babel__template/index.d.ts
ERROR in (webpack)/node_modules/@types/babel__template/index.d.ts(10,54):
TS2307: Cannot find module '@babel/types' or its corresponding type declarations.

ERROR in (webpack)/node_modules/@types/babel__traverse/index.d.ts
ERROR in (webpack)/node_modules/@types/babel__traverse/index.d.ts(12,20):
TS2307: Cannot find module '@babel/types' or its corresponding type declarations.

ERROR in (webpack)/node_modules/@types/babel__traverse/index.d.ts
ERROR in (webpack)/node_modules/@types/babel__traverse/index.d.ts(40,5):
TS2411: Property 'scope' of type 'Scope' is not assignable to string index type '(VisitNodeFunction<S, any> & VisitNodeFunction<S, any>) | (VisitNodeFunction<S, any> & VisitNodeObject<S, any>) | (VisitNodeObject<...> & VisitNodeFunction<...>) | (VisitNodeObject<...> & VisitNodeObject<...>)'.

ERROR in (webpack)/node_modules/@types/babel__traverse/index.d.ts
ERROR in (webpack)/node_modules/@types/babel__traverse/index.d.ts(41,5):
TS2411: Property 'noScope' of type 'boolean' is not assignable to string index type '(VisitNodeFunction<S, any> & VisitNodeFunction<S, any>) | (VisitNodeFunction<S, any> & VisitNodeObject<S, any>) | (VisitNodeObject<...> & VisitNodeFunction<...>) | (VisitNodeObject<...> & VisitNodeObject<...>)'.

ERROR in (webpack)/node_modules/@types/jest/index.d.ts
ERROR in (webpack)/node_modules/@types/jest/index.d.ts(486,51):
TS2307: Cannot find module 'jest-diff' or its corresponding type declarations.

ERROR in (webpack)/node_modules/@types/jest/index.d.ts
ERROR in (webpack)/node_modules/@types/jest/index.d.ts(540,44):
TS2307: Cannot find module 'pretty-format' or its corresponding type declarations.

webpack 5.0.0-beta.32 compiled with 10 errors
```
