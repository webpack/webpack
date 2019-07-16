This very simple example shows usage of Url.

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

# js/output.js

<details><summary><code>/******/ (function(modules) { /* webpackBootstrap */ })</code></summary>

```javascript
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

```javascript
/******/ ([
/* 0 */
/*!********************!*\
  !*** ./example.js ***!
  \********************/
/*! exports [not provided] [no usage info] */
/*! runtime requirements: __webpack_require__.r, __webpack_exports__, __webpack_require__, __webpack_require__.n, __webpack_require__.d */
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
/*! exports [maybe provided (runtime-defined)] [no usage info] */
/*! runtime requirements: module, __webpack_require__.p, __webpack_require__ */
/***/ (function(module, __unusedexports, __webpack_require__) {

"use strict";
module.exports = __webpack_require__.p + "images/75f4aafa02fb853644d1.png";

/***/ }),
/* 2 */
/*!*************************!*\
  !*** ./images/file.jpg ***!
  \*************************/
/*! exports [maybe provided (runtime-defined)] [no usage info] */
/*! runtime requirements: module, __webpack_require__.p, __webpack_require__ */
/***/ (function(module, __unusedexports, __webpack_require__) {

"use strict";
module.exports = __webpack_require__.p + "images/7b0228d7110c654c8ba5.jpg";

/***/ }),
/* 3 */
/*!*************************!*\
  !*** ./images/file.svg ***!
  \*************************/
/*! exports [maybe provided (runtime-defined)] [no usage info] */
/*! runtime requirements: module, __webpack_require__.p, __webpack_require__ */
/***/ (function(module, __unusedexports, __webpack_require__) {

"use strict";
module.exports = __webpack_require__.p + "images/e3cb29185318970c0cbd.svg";

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
Version: webpack 5.0.0-alpha.18
                          Asset       Size  Chunks             Chunk Names
images/75f4aafa02fb853644d1.png   26.1 KiB     {0}  [emitted]  main
images/7b0228d7110c654c8ba5.jpg   10.9 KiB     {0}  [emitted]  main
images/e3cb29185318970c0cbd.svg  656 bytes     {0}  [emitted]  main
                      output.js   6.23 KiB     {0}  [emitted]  main
Entrypoint main = output.js images/75f4aafa02fb853644d1.png images/7b0228d7110c654c8ba5.jpg images/e3cb29185318970c0cbd.svg
chunk {0} output.js, images/75f4aafa02fb853644d1.png, images/7b0228d7110c654c8ba5.jpg, images/e3cb29185318970c0cbd.svg (main) 868 bytes (javascript) 37.6 KiB (asset) 920 bytes (runtime) [entry] [rendered]
    > ./example.js main
 [0] ./example.js 742 bytes {0} [built]
     [no exports]
     [used exports unknown]
     entry ./example.js main
 [1] ./images/file.png 26.1 KiB (asset) 42 bytes (javascript) {0} [built]
     [used exports unknown]
     harmony side effect evaluation ./images/file.png [0] ./example.js 1:0-36
     harmony import specifier ./images/file.png [0] ./example.js 28:1-4
 [2] ./images/file.jpg 10.9 KiB (asset) 42 bytes (javascript) {0} [built]
     [used exports unknown]
     harmony side effect evaluation ./images/file.jpg [0] ./example.js 2:0-36
     harmony import specifier ./images/file.jpg [0] ./example.js 28:6-9
 [3] ./images/file.svg 656 bytes (asset) 42 bytes (javascript) {0} [built]
     [used exports unknown]
     harmony side effect evaluation ./images/file.svg [0] ./example.js 3:0-36
     harmony import specifier ./images/file.svg [0] ./example.js 28:11-14
     + 4 hidden chunk modules
```
