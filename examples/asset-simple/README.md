This is a very simple example that shows the usage of the asset module type.

Files can be imported like other modules without file-loader.

# example.js

```javascript
import png from "./images/file.png";
import jpg from "./images/file.jpg";
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

[png, jpg, svg].forEach(src => {
	createImageElement(src.split(".").pop(), src);
});
```

# webpack.config.js

```javascript
module.exports = {
	output: {
		assetModuleFilename: "images/[hash][ext]"
	},
	module: {
		rules: [
			{
				test: /\.(png|jpg|svg)$/,
				type: "asset"
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
/* 0 */,
/* 1 */
/*!*************************!*\
  !*** ./images/file.png ***!
  \*************************/
/*! default exports */
/*! exports [not provided] [maybe used (runtime-defined)] */
/*! runtime requirements: module, __webpack_require__.p, __webpack_require__.* */
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

module.exports = __webpack_require__.p + "images/11744e207f673e90d075.png";

/***/ }),
/* 2 */
/*!*************************!*\
  !*** ./images/file.jpg ***!
  \*************************/
/*! default exports */
/*! exports [not provided] [maybe used (runtime-defined)] */
/*! runtime requirements: module */
/***/ ((module) => {

module.exports = "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAASABIAA...4CD/9M//Z";

/***/ }),
/* 3 */
/*!*************************!*\
  !*** ./images/file.svg ***!
  \*************************/
/*! default exports */
/*! exports [not provided] [maybe used (runtime-defined)] */
/*! runtime requirements: module */
/***/ ((module) => {

module.exports = "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDo...vc3ZnPgo=";

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
/******/ 	/* webpack/runtime/publicPath */
/******/ 	(() => {
/******/ 		__webpack_require__.p = "dist/";
/******/ 	})();
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
/* harmony import */ var _images_file_png__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ./images/file.png */ 1);
/* harmony import */ var _images_file_jpg__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ./images/file.jpg */ 2);
/* harmony import */ var _images_file_svg__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! ./images/file.svg */ 3);




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

[_images_file_png__WEBPACK_IMPORTED_MODULE_0__, _images_file_jpg__WEBPACK_IMPORTED_MODULE_1__, _images_file_svg__WEBPACK_IMPORTED_MODULE_2__].forEach(src => {
	createImageElement(src.split(".").pop(), src);
});

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
images/11744e207f673e90d075.png  14.6 KiB  [emitted] [immutable]  [name: (main)]
                      output.js  12.3 KiB  [emitted]              [name: main]
Entrypoint main = output.js (images/11744e207f673e90d075.png)
chunk output.js (main) 9.58 KiB (javascript) 14.6 KiB (asset) 32 bytes (runtime) [entry] [rendered]
    > ./example.js main
 ./example.js 742 bytes [built]
     [no exports]
     [no exports used]
     entry ./example.js main
 ./images/file.jpg 7.92 KiB [built]
     [no exports]
     harmony side effect evaluation ./images/file.jpg ./example.js 2:0-36
     harmony import specifier ./images/file.jpg ./example.js 28:6-9
 ./images/file.png 42 bytes (javascript) 14.6 KiB (asset) [built]
     [no exports]
     harmony side effect evaluation ./images/file.png ./example.js 1:0-36
     harmony import specifier ./images/file.png ./example.js 28:1-4
 ./images/file.svg 915 bytes [built]
     [no exports]
     harmony side effect evaluation ./images/file.svg ./example.js 3:0-36
     harmony import specifier ./images/file.svg ./example.js 28:11-14
     + 1 hidden chunk module
```
