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
/*! exports [not provided] [no usage info] */
/*! runtime requirements: module, __webpack_require__.p, __webpack_require__.* */
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

module.exports = __webpack_require__.p + "images/89a353e9c515885abd8e.png";

/***/ }),
/* 2 */
/*!*************************!*\
  !*** ./images/file.jpg ***!
  \*************************/
/*! default exports */
/*! exports [not provided] [no usage info] */
/*! runtime requirements: module */
/***/ ((module) => {

module.exports = "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAASABIAA...4CD/9M//Z";

/***/ }),
/* 3 */
/*!*************************!*\
  !*** ./images/file.svg ***!
  \*************************/
/*! default exports */
/*! exports [not provided] [no usage info] */
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
/******/ 		__webpack_modules__[moduleId](module, module.exports, __webpack_require__);
/******/ 	
/******/ 		// Return the exports of the module
/******/ 		return module.exports;
/******/ 	}
/******/ 	
/************************************************************************/
/******/ 	/* webpack/runtime/make namespace object */
/******/ 	(() => {
/******/ 		// define __esModule on exports
/******/ 		__webpack_require__.r = (exports) => {
/******/ 			if(typeof Symbol !== 'undefined' && Symbol.toStringTag) {
/******/ 				Object.defineProperty(exports, Symbol.toStringTag, { value: 'Module' });
/******/ 			}
/******/ 			Object.defineProperty(exports, '__esModule', { value: true });
/******/ 		};
/******/ 	})();
/******/ 	
/******/ 	/* webpack/runtime/publicPath */
/******/ 	(() => {
/******/ 		__webpack_require__.p = "dist/";
/******/ 	})();
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
/*! namespace exports */
/*! exports [not provided] [no usage info] */
/*! runtime requirements: __webpack_require__, __webpack_require__.r, __webpack_exports__, __webpack_require__.* */
__webpack_require__.r(__webpack_exports__);
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
asset images/89a353e9c515885abd8e.png 14.6 KiB [emitted] [immutable] [from: images/file.png] (auxiliary name: main)
asset output.js 13 KiB [emitted] (name: main)
chunk (runtime: main) output.js (main) 9.58 KiB (javascript) 14.6 KiB (asset) 306 bytes (runtime) [entry] [rendered]
  > ./example.js main
  dependent modules 8.86 KiB (javascript) 14.6 KiB (asset) [dependent] 3 modules
  runtime modules 306 bytes 2 modules
  ./example.js 742 bytes [built] [code generated]
    [no exports]
    [used exports unknown]
    entry ./example.js main
webpack 5.51.1 compiled successfully
```
