This very simple example shows usage of the asset module type.

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
/* 0 */
/*!********************!*\
  !*** ./example.js ***!
  \********************/
/*! exports [not provided] [no usage info] */
/*! runtime requirements: __webpack_require__, __webpack_require__.n, __webpack_require__.r, __webpack_exports__, __webpack_require__.* */
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

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

[(_images_file_png__WEBPACK_IMPORTED_MODULE_0___default()), (_images_file_jpg__WEBPACK_IMPORTED_MODULE_1___default()), (_images_file_svg__WEBPACK_IMPORTED_MODULE_2___default())].forEach(src => {
	createImageElement(src.split(".").pop(), src);
});


/***/ }),
/* 1 */
/*!*************************!*\
  !*** ./images/file.png ***!
  \*************************/
/*! exports [maybe provided (runtime-defined)] [no usage info] */
/*! runtime requirements: module, __webpack_require__.p, __webpack_require__.* */
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

module.exports = __webpack_require__.p + "images/24e804317f239f7906e1.png";

/***/ }),
/* 2 */
/*!*************************!*\
  !*** ./images/file.jpg ***!
  \*************************/
/*! exports [maybe provided (runtime-defined)] [no usage info] */
/*! runtime requirements: module */
/***/ ((module) => {

module.exports = "data:image/jpeg;base64,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";

/***/ }),
/* 3 */
/*!*************************!*\
  !*** ./images/file.svg ***!
  \*************************/
/*! exports [maybe provided (runtime-defined)] [no usage info] */
/*! runtime requirements: module */
/***/ ((module) => {

module.exports = "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCA2MDAgNjAwIj48dGl0bGU+aWNvbi1zcXVhcmUtc21hbGw8L3RpdGxlPjxwYXRoIGZpbGw9IiNGRkYiIGQ9Ik0zMDAgLjFMNTY1IDE1MHYyOTkuOUwzMDAgNTk5LjggMzUgNDQ5LjlWMTUweiIvPjxwYXRoIGZpbGw9IiM4RUQ2RkIiIGQ9Ik01MTcuNyA0MzkuNUwzMDguOCA1NTcuOHYtOTJMNDM5IDM5NC4xbDc4LjcgNDUuNHptMTQuMy0xMi45VjE3OS40bC03Ni40IDQ0LjF2MTU5bDc2LjQgNDQuMXpNODEuNSA0MzkuNWwyMDguOSAxMTguMnYtOTJsLTEzMC4yLTcxLjYtNzguNyA0NS40em0tMTQuMy0xMi45VjE3OS40bDc2LjQgNDQuMXYxNTlsLTc2LjQgNDQuMXptOC45LTI2My4yTDI5MC40IDQyLjJ2ODlsLTEzNy4zIDc1LjUtMS4xLjYtNzUuOS00My45em00NDYuOSAwTDMwOC44IDQyLjJ2ODlMNDQ2IDIwNi44bDEuMS42IDc1LjktNDR6Ii8+PHBhdGggZmlsbD0iIzFDNzhDMCIgZD0iTTI5MC40IDQ0NC44TDE2MiAzNzQuMVYyMzQuMmwxMjguNCA3NC4xdjEzNi41em0xOC40IDBsMTI4LjQtNzAuNnYtMTQwbC0xMjguNCA3NC4xdjEzNi41ek0yOTkuNiAzMDN6bS0xMjktODVsMTI5LTcwLjlMNDI4LjUgMjE4bC0xMjguOSA3NC40LTEyOS03NC40eiIvPjwvc3ZnPgo=";

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
/******/ 	/* webpack/runtime/compat get default export */
/******/ 	!function() {
/******/ 		// getDefaultExport function for compatibility with non-harmony modules
/******/ 		__webpack_require__.n = (module) => {
/******/ 			var getter = module && module.__esModule ?
/******/ 				() => module['default'] :
/******/ 				() => module;
/******/ 			__webpack_require__.d(getter, { a: getter });
/******/ 			return getter;
/******/ 		};
/******/ 	}();
/******/ 	
/******/ 	/* webpack/runtime/define property getters */
/******/ 	!function() {
/******/ 		// define getter functions for harmony exports
/******/ 		var hasOwnProperty = Object.prototype.hasOwnProperty;
/******/ 		__webpack_require__.d = (exports, definition) => {
/******/ 			for(var key in definition) {
/******/ 				if(hasOwnProperty.call(definition, key) && !hasOwnProperty.call(exports, key)) {
/******/ 					Object.defineProperty(exports, key, { enumerable: true, get: definition[key] });
/******/ 				}
/******/ 			}
/******/ 		};
/******/ 	}();
/******/ 	
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
/******/ 	/* webpack/runtime/publicPath */
/******/ 	!function() {
/******/ 		__webpack_require__.p = "dist/";
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
images/24e804317f239f7906e1.png  14.6 KiB  [emitted] [immutable]  [name: (main)]
                      output.js  14.6 KiB  [emitted]              [name: main]
Entrypoint main = output.js (images/24e804317f239f7906e1.png)
chunk output.js (main) 10.6 KiB (javascript) 14.6 KiB (asset) 927 bytes (runtime) [entry] [rendered]
    > ./example.js main
 ./example.js 742 bytes [built]
     [no exports]
     [used exports unknown]
     entry ./example.js main
 ./images/file.jpg 8.83 KiB [built]
     [used exports unknown]
     harmony side effect evaluation ./images/file.jpg ./example.js 2:0-36
     harmony import specifier ./images/file.jpg ./example.js 28:6-9
 ./images/file.png 42 bytes (javascript) 14.6 KiB (asset) [built]
     [used exports unknown]
     harmony side effect evaluation ./images/file.png ./example.js 1:0-36
     harmony import specifier ./images/file.png ./example.js 28:1-4
 ./images/file.svg 984 bytes [built]
     [used exports unknown]
     harmony side effect evaluation ./images/file.svg ./example.js 3:0-36
     harmony import specifier ./images/file.svg ./example.js 28:11-14
     + 4 hidden chunk modules
```
