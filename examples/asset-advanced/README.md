This example shows the usage of the asset module type with asset generator options customization.

Files can be imported similar to other modules without file-loader or url-loader.

# example.js

```javascript
import svg from "./images/file.svg";

const container = document.createElement("div");
Object.assign(container.style, {
	display: "flex",
	justifyContent: "center"
});
document.body.appendChild(container);

function createImageElement(title, src) {
	const div = document.createElement("div");
	div.style.textAlign = "center";

	const h2 = document.createElement("h2");
	h2.textContent = title;
	div.appendChild(h2);

	const img = document.createElement("img");
	img.setAttribute("src", src);
	img.setAttribute("width", "150");
	div.appendChild(img);

	container.appendChild(div);
}

[svg].forEach(src => {
	createImageElement(src.split(".").pop(), src);
});
```

# webpack.config.js

```javascript
const svgToMiniDataURI = require("mini-svg-data-uri");

module.exports = {
	output: {
		assetModuleFilename: "images/[hash][ext]"
	},
	module: {
		rules: [
			{
				test: /\.(png|jpg)$/,
				type: "asset"
			},
			{
				test: /\.svg$/,
				type: "asset",
				generator: {
					dataUrl: content => {
						if (typeof content !== "string") {
							content = content.toString();
						}

						return svgToMiniDataURI(content);
					}
				}
			}
		]
	},
	experiments: {
		asset: true
	}
};
```

# js/output.js

```javascript
/******/ (() => { // webpackBootstrap
/******/ 	"use strict";
/******/ 	var __webpack_modules__ = ([
/* 0 */
/*!********************!*\
  !*** ./example.js ***!
  \********************/
/*! exports [not provided] [no usage info] */
/*! runtime requirements: __webpack_require__, __webpack_require__.r, __webpack_exports__, __webpack_require__.* */
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

__webpack_require__.r(__webpack_exports__);
/* harmony import */ var _images_file_svg__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ./images/file.svg */ 1);


const container = document.createElement("div");
Object.assign(container.style, {
	display: "flex",
	justifyContent: "center"
});
document.body.appendChild(container);

function createImageElement(title, src) {
	const div = document.createElement("div");
	div.style.textAlign = "center";

	const h2 = document.createElement("h2");
	h2.textContent = title;
	div.appendChild(h2);

	const img = document.createElement("img");
	img.setAttribute("src", src);
	img.setAttribute("width", "150");
	div.appendChild(img);

	container.appendChild(div);
}

[_images_file_svg__WEBPACK_IMPORTED_MODULE_0__/* .default */ ].forEach(src => {
	createImageElement(src.split(".").pop(), src);
});


/***/ }),
/* 1 */
/*!*************************!*\
  !*** ./images/file.svg ***!
  \*************************/
/*! export default [not provided] [no usage info] [no name, virtual] */
/*!   exports [not provided] [no usage info] */
/*! other exports [not provided] [no usage info] */
/*! runtime requirements: module */
/***/ ((module) => {

module.exports = "data:image/svg+xml,%3csvg xmlns='http://www.w3.or...3c/svg%3e";

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
Hash: 0a1b2c3d4e5f6a7b8c9d
Version: webpack 5.0.0-beta.7
    Asset      Size
output.js  4.01 KiB  [emitted]  [name: main]
Entrypoint main = output.js
chunk output.js (main) 1.54 KiB (javascript) 274 bytes (runtime) [entry] [rendered]
    > ./example.js main
 ./example.js 658 bytes [built]
     [no exports]
     [used exports unknown]
     entry ./example.js main
 ./images/file.svg 915 bytes [built]
     [no exports]
     [used exports unknown]
     harmony side effect evaluation ./images/file.svg ./example.js 1:0-36
     harmony import specifier ./images/file.svg ./example.js 26:1-4
     + 1 hidden chunk module
```
