This very simple example shows usage of a custom parser for json-modules.

Toml files can be imported like other modules without toml-loader.

# data.toml

```toml
title = "TOML Example"

[owner]
name = "Tom Preston-Werner"
organization = "GitHub"
bio = "GitHub Cofounder & CEO\nLikes tater tots and beer."
dob = 1979-05-27T07:32:00Z
```

# example.js

```javascript
import data from "./data.toml";

document.querySelector('#app').innerHTML = `
  <h1>${data.title}</h1>
  <div>${data.owner.name}</div>
  <div>${data.owner.organization}</div>
  <div>${data.owner.bio}</div>
  <div>${data.owner.dob}</div>
`;
```

# webpack.config.js

```javascript
const toml = require("toml");

module.exports = {
	module: {
		rules: [
			{
				test: /\.toml$/,
				type: "json",
				parser: {
					parse(input) {
						return toml.parse(input);
					}
				}
			}
		]
	}
};
```

# js/output.js

```javascript
/******/ (() => { // webpackBootstrap
/******/ 	var __webpack_modules__ = ([
/* 0 */
/*!********************!*\
  !*** ./example.js ***!
  \********************/
/*! exports [not provided] [no usage info] */
/*! runtime requirements: __webpack_require__, __webpack_require__.r, __webpack_exports__, __webpack_require__.* */
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony import */ var _data_toml__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ./data.toml */ 1);


document.querySelector('#app').innerHTML = `
  <h1>${_data_toml__WEBPACK_IMPORTED_MODULE_0__/* .default.title */ .title}</h1>
  <div>${_data_toml__WEBPACK_IMPORTED_MODULE_0__/* .default.owner.name */ .owner.name}</div>
  <div>${_data_toml__WEBPACK_IMPORTED_MODULE_0__/* .default.owner.organization */ .owner.organization}</div>
  <div>${_data_toml__WEBPACK_IMPORTED_MODULE_0__/* .default.owner.bio */ .owner.bio}</div>
  <div>${_data_toml__WEBPACK_IMPORTED_MODULE_0__/* .default.owner.dob */ .owner.dob}</div>
`;


/***/ }),
/* 1 */
/*!*******************!*\
  !*** ./data.toml ***!
  \*******************/
/*! export default [provided] [no usage info] [no name, virtual] */
/*!   export owner [provided] [no usage info] [missing usage info prevents renaming] */
/*!     export bio [provided] [no usage info] [missing usage info prevents renaming] */
/*!     export dob [provided] [no usage info] [missing usage info prevents renaming] */
/*!       exports [not provided] [no usage info] */
/*!     export name [provided] [no usage info] [missing usage info prevents renaming] */
/*!     export organization [provided] [no usage info] [missing usage info prevents renaming] */
/*!     other exports [not provided] [no usage info] */
/*!   export title [provided] [no usage info] [missing usage info prevents renaming] */
/*!   other exports [not provided] [no usage info] */
/*! export owner [provided] [no usage info] [missing usage info prevents renaming] */
/*!   export bio [provided] [no usage info] [missing usage info prevents renaming] */
/*!   export dob [provided] [no usage info] [missing usage info prevents renaming] */
/*!     exports [not provided] [no usage info] */
/*!   export name [provided] [no usage info] [missing usage info prevents renaming] */
/*!   export organization [provided] [no usage info] [missing usage info prevents renaming] */
/*!   other exports [not provided] [no usage info] */
/*! export title [provided] [no usage info] [missing usage info prevents renaming] */
/*! other exports [not provided] [no usage info] */
/*! runtime requirements: module */
/***/ ((module) => {

module.exports = JSON.parse("{\"title\":\"TOML Example\",\"owner\":{\"name\":\"Tom Preston-Werner\",\"organization\":\"GitHub\",\"bio\":\"GitHub Cofounder & CEO\\nLikes tater tots and beer.\",\"dob\":\"1979-05-27T07:32:00.000Z\"}}");

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
/******/ 			i: moduleId,
/******/ 			l: false,
/******/ 			exports: {}
/******/ 		};
/******/ 	
/******/ 		// Execute the module function
/******/ 		__webpack_modules__[moduleId](module, module.exports, __webpack_require__);
/******/ 	
/******/ 		// Flag the module as loaded
/******/ 		module.l = true;
/******/ 	
/******/ 		// Return the exports of the module
/******/ 		return module.exports;
/******/ 	}
/******/ 	
/************************************************************************/
/******/ 	/* webpack/runtime/make namespace object */
/******/ 	!function() {
/******/ 		// define __esModule on exports
/******/ 		__webpack_require__.r = (exports) => {
/******/ 			if(typeof Symbol !== 'undefined' && Symbol.toStringTag) {
/******/ 				Object.defineProperty(exports, Symbol.toStringTag, { value: 'Module' });
/******/ 			}
/******/ 			Object.defineProperty(exports, '__esModule', { value: true });
/******/ 		};
/******/ 	}();
/******/ 	
/************************************************************************/
```

</details>

``` js
/******/ 	// startup
/******/ 	// Load entry module
/******/ 	__webpack_require__(0);
/******/ 	// This entry module used 'exports' so it can't be inlined
/******/ })()
;
```

# Info

## webpack output

```
Hash: [1m05de32641bf6fbad9390[39m[22m
Version: webpack [1m5.0.0-beta.7[39m[22m
Time: [1m145[39m[22mms
    [1mAsset[39m[22m      [1mSize[39m[22m
[1m[32moutput.js[39m[22m  4.57 KiB  [1m[32m[emitted][39m[22m  [name: main]
Entrypoint [1mmain[39m[22m = [1m[32moutput.js[39m[22m
chunk [1m[32moutput.js[39m[22m (main) 428 bytes (javascript) 274 bytes (runtime) [1m[33m[entry][39m[22m [1m[32m[rendered][39m[22m
    > ./example.js [1m[39m[22m main
 [1m./data.toml[39m[22m 188 bytes [1m[32m[built][39m[22m
     [1m[36m[exports: default, owner, title][39m[22m
     [1m[36m[used exports unknown][39m[22m
     harmony side effect evaluation [1m[36m./data.toml[39m[22m [1m[35m./example.js[39m[22m 1:0-31 [1m[36m[39m[22m
     harmony import specifier [1m[36m./data.toml[39m[22m [1m[35m./example.js[39m[22m 4:8-18 [1m[36m[39m[22m
     harmony import specifier [1m[36m./data.toml[39m[22m [1m[35m./example.js[39m[22m 5:9-24 [1m[36m[39m[22m
     harmony import specifier [1m[36m./data.toml[39m[22m [1m[35m./example.js[39m[22m 6:9-32 [1m[36m[39m[22m
     harmony import specifier [1m[36m./data.toml[39m[22m [1m[35m./example.js[39m[22m 7:9-23 [1m[36m[39m[22m
     harmony import specifier [1m[36m./data.toml[39m[22m [1m[35m./example.js[39m[22m 8:9-23 [1m[36m[39m[22m
 [1m./example.js[39m[22m 240 bytes [1m[32m[built][39m[22m
     [1m[36m[no exports][39m[22m
     [1m[36m[used exports unknown][39m[22m
     entry [1m[36m./example.js[39m[22m [1m[35mnull[39m[22m main [1m[36m[39m[22m
     + 1 hidden chunk module
```
