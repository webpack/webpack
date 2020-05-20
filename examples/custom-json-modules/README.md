This is a simple example that shows the usage of a custom parser for json-modules.

Toml, yaml and json5 files can be imported like other modules without toml-loader.

# data.toml

```toml
title = "TOML Example"

[owner]
name = "Tom Preston-Werner"
organization = "GitHub"
bio = "GitHub Cofounder & CEO\nLikes tater tots and beer."
dob = 1979-05-27T07:32:00Z
```

# data.yaml

```yaml
title: YAML Example
owner:
  name: Tom Preston-Werner
  organization: GitHub
  bio: |-
    GitHub Cofounder & CEO
    Likes tater tots and beer.
  dob: 1979-05-27T07:32:00.000Z
```

# data.json5

```json5
{
  // comment
  title: "JSON5 Example",
  owner: {
    name: "Tom Preston-Werner",
    organization: "GitHub",
    bio: "GitHub Cofounder & CEO\n\
Likes tater tots and beer.",
    dob: "1979-05-27T07:32:00.000Z"
  }
}
```

# example.js

```javascript
import toml from "./data.toml";
import yaml from "./data.yaml";
import json from "./data.json5";

document.querySelector('#app').innerHTML = [toml, yaml, json].map(data => `
  <h1>${data.title}</h1>
  <div>${data.owner.name}</div>
  <div>${data.owner.organization}</div>
  <div>${data.owner.bio}</div>
  <div>${data.owner.dob}</div>
`).join('<br><br>');
```

# webpack.config.js

```javascript
const toml = require("toml");
const json5 = require("json5");
const yaml = require("yamljs");

module.exports = {
	module: {
		rules: [
			{
				test: /\.toml$/,
				type: "json",
				parser: {
					parse: toml.parse
				}
			},
			{
				test: /\.json5$/,
				type: "json",
				parser: {
					parse: json5.parse
				}
			},
			{
				test: /\.yaml$/,
				type: "json",
				parser: {
					parse: yaml.parse
				}
			}
		]
	}
};
```

# js/output.js

```javascript
/******/ (() => { // webpackBootstrap
/******/ 	"use strict";
/******/ 	var __webpack_modules__ = ([
/* 0 */,
/* 1 */
/*!*******************!*\
  !*** ./data.toml ***!
  \*******************/
/*! default exports */
/*! export owner [provided] [maybe used (runtime-defined)] [usage prevents renaming] */
/*!   export bio [provided] [unused] [could be renamed] */
/*!   export dob [provided] [unused] [could be renamed] */
/*!     exports [not provided] [unused] */
/*!   export name [provided] [unused] [could be renamed] */
/*!   export organization [provided] [unused] [could be renamed] */
/*!   other exports [not provided] [unused] */
/*! export title [provided] [maybe used (runtime-defined)] [usage prevents renaming] */
/*! other exports [not provided] [maybe used (runtime-defined)] */
/*! runtime requirements: module */
/***/ ((module) => {

module.exports = JSON.parse("{\"title\":\"TOML Example\",\"owner\":{\"name\":\"Tom Preston-Werner\",\"organization\":\"GitHub\",\"bio\":\"GitHub Cofounder & CEO\\nLikes tater tots and beer.\",\"dob\":\"1979-05-27T07:32:00.000Z\"}}");

/***/ }),
/* 2 */
/*!*******************!*\
  !*** ./data.yaml ***!
  \*******************/
/*! default exports */
/*! export owner [provided] [maybe used (runtime-defined)] [usage prevents renaming] */
/*!   export bio [provided] [unused] [could be renamed] */
/*!   export dob [provided] [unused] [could be renamed] */
/*!     exports [not provided] [unused] */
/*!   export name [provided] [unused] [could be renamed] */
/*!   export organization [provided] [unused] [could be renamed] */
/*!   other exports [not provided] [unused] */
/*! export title [provided] [maybe used (runtime-defined)] [usage prevents renaming] */
/*! other exports [not provided] [maybe used (runtime-defined)] */
/*! runtime requirements: module */
/***/ ((module) => {

module.exports = JSON.parse("{\"title\":\"YAML Example\",\"owner\":{\"name\":\"Tom Preston-Werner\",\"organization\":\"GitHub\",\"bio\":\"GitHub Cofounder & CEO\\nLikes tater tots and beer.\",\"dob\":\"1979-05-27T07:32:00.000Z\"}}");

/***/ }),
/* 3 */
/*!********************!*\
  !*** ./data.json5 ***!
  \********************/
/*! default exports */
/*! export owner [provided] [maybe used (runtime-defined)] [usage prevents renaming] */
/*!   export bio [provided] [unused] [could be renamed] */
/*!   export dob [provided] [unused] [could be renamed] */
/*!   export name [provided] [unused] [could be renamed] */
/*!   export organization [provided] [unused] [could be renamed] */
/*!   other exports [not provided] [unused] */
/*! export title [provided] [maybe used (runtime-defined)] [usage prevents renaming] */
/*! other exports [not provided] [maybe used (runtime-defined)] */
/*! runtime requirements: module */
/***/ ((module) => {

module.exports = JSON.parse("{\"title\":\"JSON5 Example\",\"owner\":{\"name\":\"Tom Preston-Werner\",\"organization\":\"GitHub\",\"bio\":\"GitHub Cofounder & CEO\\nLikes tater tots and beer.\",\"dob\":\"1979-05-27T07:32:00.000Z\"}}");

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
/******/ 		__webpack_modules__[moduleId](module, module.exports, __webpack_require__);
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
/*! namespace exports */
/*! exports [not provided] [unused] */
/*! runtime requirements: __webpack_require__ */
/* harmony import */ var _data_toml__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ./data.toml */ 1);
/* harmony import */ var _data_yaml__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ./data.yaml */ 2);
/* harmony import */ var _data_json5__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! ./data.json5 */ 3);




document.querySelector('#app').innerHTML = [_data_toml__WEBPACK_IMPORTED_MODULE_0__, _data_yaml__WEBPACK_IMPORTED_MODULE_1__, _data_json5__WEBPACK_IMPORTED_MODULE_2__].map(data => `
  <h1>${data.title}</h1>
  <div>${data.owner.name}</div>
  <div>${data.owner.organization}</div>
  <div>${data.owner.bio}</div>
  <div>${data.owner.dob}</div>
`).join('<br><br>');

})();

/******/ })()
;
```

# Info

## webpack output

```
Hash: 0a1b2c3d4e5f6a7b8c9d
Version: webpack 5.0.0-beta.16
    Asset      Size
output.js  4.83 KiB  [emitted]  [name: main]
Entrypoint main = output.js
chunk output.js (main) 919 bytes [entry] [rendered]
    > ./example.js main
 ./data.json5 189 bytes [built]
     [exports: owner, title]
     harmony side effect evaluation ./data.json5 ./example.js 3:0-32
     harmony import specifier ./data.json5 ./example.js 5:56-60
 ./data.toml 188 bytes [built]
     [exports: owner, title]
     harmony side effect evaluation ./data.toml ./example.js 1:0-31
     harmony import specifier ./data.toml ./example.js 5:44-48
 ./data.yaml 188 bytes [built]
     [exports: owner, title]
     harmony side effect evaluation ./data.yaml ./example.js 2:0-31
     harmony import specifier ./data.yaml ./example.js 5:50-54
 ./example.js 354 bytes [built]
     [no exports]
     [no exports used]
     entry ./example.js main
```
