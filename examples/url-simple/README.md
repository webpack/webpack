This very simple example shows usage of Url.

Files can be imported like other modules without file-loader.

<!-- prettier-ignore-start -->

# example.js

``` javascript
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

# js/output.js

<details><summary><code>/******/ (function(modules) { /* webpackBootstrap */ })</code></summary>

``` javascript
/******/ (function(modules, runtime) { // webpackBootstrap
/******/ 	"use strict";
/******/ 	// The module cache
/******/ 	var installedModules = {};
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
/******/
/******/
/******/ 	// the startup function
/******/ 	function startup() {
/******/ 		// Load entry module and return exports
/******/ 		return __webpack_require__(0);
/******/ 	};
/******/ 	// initialize runtime
/******/ 	runtime(__webpack_require__);
/******/
/******/ 	// run startup
/******/ 	return startup();
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
/*! other exports [not provided] [no usage info] */
/*! runtime requirements: __webpack_require__.r__webpack_exports__, __webpack_require__, __webpack_require__.n, __webpack_require__.d,  */
/***/ (function(__unusedmodule, __webpack_exports__, __webpack_require__) {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony import */ var _images_file_png__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ./images/file.png */ 1);
/* harmony import */ var _images_file_png__WEBPACK_IMPORTED_MODULE_0___default = /*#__PURE__*/__webpack_require__.n(_images_file_png__WEBPACK_IMPORTED_MODULE_0__);
/* harmony import */ var _images_file_jpg__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ./images/file.jpg */ 2);
/* harmony import */ var _images_file_jpg__WEBPACK_IMPORTED_MODULE_1___default = /*#__PURE__*/__webpack_require__.n(_images_file_jpg__WEBPACK_IMPORTED_MODULE_1__);
/* harmony import */ var _images_file_svg__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! ./images/file.svg */ 3);
/* harmony import */ var _images_file_svg__WEBPACK_IMPORTED_MODULE_2___default = /*#__PURE__*/__webpack_require__.n(_images_file_svg__WEBPACK_IMPORTED_MODULE_2__);




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

[_images_file_png__WEBPACK_IMPORTED_MODULE_0___default.a, _images_file_jpg__WEBPACK_IMPORTED_MODULE_1___default.a, _images_file_svg__WEBPACK_IMPORTED_MODULE_2___default.a].forEach(src => {
	createImageElement(src.split(".").pop(), src);
});


/***/ }),
/* 1 */
/*!*************************!*\
  !*** ./images/file.png ***!
  \*************************/
/*! export default [maybe provided (runtime-defined)] [no usage info] [provision prevents renaming (no use info)] */
/*! other exports [maybe provided (runtime-defined)] [no usage info] */
/*! runtime requirements: module__webpack_exports__, __webpack_require__, __webpack_require__.p,  */
/***/ (function(module, exports, __webpack_require__) {

"use strict";
module.exports = __webpack_require__.p + "images/70ec02dc99d98fcf8f72.png";

/***/ }),
/* 2 */
/*!*************************!*\
  !*** ./images/file.jpg ***!
  \*************************/
/*! export default [maybe provided (runtime-defined)] [no usage info] [provision prevents renaming (no use info)] */
/*! other exports [maybe provided (runtime-defined)] [no usage info] */
/*! runtime requirements: module__webpack_exports__, __webpack_require__, __webpack_require__.p,  */
/***/ (function(module, exports, __webpack_require__) {

"use strict";
module.exports = __webpack_require__.p + "images/e9b63ac8925810c74a43.jpg";

/***/ }),
/* 3 */
/*!*************************!*\
  !*** ./images/file.svg ***!
  \*************************/
/*! export default [maybe provided (runtime-defined)] [no usage info] [provision prevents renaming (no use info)] */
/*! other exports [maybe provided (runtime-defined)] [no usage info] */
/*! runtime requirements: module__webpack_exports__, __webpack_require__, __webpack_require__.p,  */
/***/ (function(module, exports, __webpack_require__) {

"use strict";
module.exports = __webpack_require__.p + "images/c901b8d6b02637aa9af7.svg";

/***/ })
/******/ ],
```

<details><summary><code>function(__webpack_require__) { /* webpackRuntimeModules */ });</code></summary>

``` js
/******/ function(__webpack_require__) { // webpackRuntimeModules
/******/ 	"use strict";
/******/ 
/******/ 	/* webpack/runtime/make namespace object */
/******/ 	!function() {
/******/ 		// define __esModule on exports
/******/ 		__webpack_require__.r = function(exports) {
/******/ 			if(typeof Symbol !== 'undefined' && Symbol.toStringTag) {
/******/ 				Object.defineProperty(exports, Symbol.toStringTag, { value: 'Module' });
/******/ 			}
/******/ 			Object.defineProperty(exports, '__esModule', { value: true });
/******/ 		};
/******/ 	}();
/******/ 	
/******/ 	/* webpack/runtime/compat get default export */
/******/ 	!function() {
/******/ 		// getDefaultExport function for compatibility with non-harmony modules
/******/ 		__webpack_require__.n = function(module) {
/******/ 			var getter = module && module.__esModule ?
/******/ 				function getDefault() { return module['default']; } :
/******/ 				function getModuleExports() { return module; };
/******/ 			__webpack_require__.d(getter, 'a', getter);
/******/ 			return getter;
/******/ 		};
/******/ 	}();
/******/ 	
/******/ 	/* webpack/runtime/define property getter */
/******/ 	!function() {
/******/ 		// define getter function for harmony exports
/******/ 		var hasOwnProperty = Object.prototype.hasOwnProperty;
/******/ 		__webpack_require__.d = function(exports, name, getter) {
/******/ 			if(!hasOwnProperty.call(exports, name)) {
/******/ 				Object.defineProperty(exports, name, { enumerable: true, get: getter });
/******/ 			}
/******/ 		};
/******/ 	}();
/******/ 	
/******/ 	/* webpack/runtime/publicPath */
/******/ 	!function() {
/******/ 		__webpack_require__.p = "dist/";
/******/ 	}();
/******/ 	
/******/ }
);
```

</details>


# Info

## webpack output

```
Hash: 0a1b2c3d4e5f6a7b8c9d
Version: webpack 5.0.0-alpha.11
                          Asset       Size  Chunks             Chunk Names
images/70ec02dc99d98fcf8f72.png   14.6 KiB     {0}  [emitted]  main
images/c901b8d6b02637aa9af7.svg  656 bytes     {0}  [emitted]  main
images/e9b63ac8925810c74a43.jpg   5.89 KiB     {0}  [emitted]  main
                      output.js   6.63 KiB     {0}  [emitted]  main
Entrypoint main = output.js images/70ec02dc99d98fcf8f72.png images/e9b63ac8925810c74a43.jpg images/c901b8d6b02637aa9af7.svg
chunk {0} output.js, images/70ec02dc99d98fcf8f72.png, images/e9b63ac8925810c74a43.jpg, images/c901b8d6b02637aa9af7.svg (main) 21.8 KiB (javascript) 21.1 KiB (url) 920 bytes (runtime) [entry] [rendered]
    > ./example.js main
 [0] ./example.js 742 bytes {0} [built]
     [no exports]
     [used exports unknown]
     entry ./example.js main
 [1] ./images/file.png 14.6 KiB (url) 14.6 KiB (javascript) {0} [built]
     [used exports unknown]
     harmony side effect evaluation ./images/file.png [0] ./example.js 1:0-36
     harmony import specifier ./images/file.png [0] ./example.js 28:1-4
 [2] ./images/file.jpg 5.89 KiB (url) 5.89 KiB (javascript) {0} [built]
     [used exports unknown]
     harmony side effect evaluation ./images/file.jpg [0] ./example.js 2:0-36
     harmony import specifier ./images/file.jpg [0] ./example.js 28:6-9
 [3] ./images/file.svg 656 bytes (url) 656 bytes (javascript) {0} [built]
     [used exports unknown]
     harmony side effect evaluation ./images/file.svg [0] ./example.js 3:0-36
     harmony import specifier ./images/file.svg [0] ./example.js 28:11-14
     + 4 hidden chunk modules
```

<!-- prettier-ignore-end -->
