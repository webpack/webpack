This is a very simple example that shows the usage of the asset module type.

Files can be imported like other modules without file-loader.

# example.js

```javascript
// There are different ways to use files:

// 1. Using `import something from "./file.ext";`

// return URLs or Data URL, depends on your configuration
import png from "./images/file.png";
import jpg from "./images/file.jpg";
import svg from "./images/file.svg";

// 2. Using `import something from "./file.ext"; with { type: "text" }` or `import something from "./file.ext"; with { type: "bytes" }`
// You don't need extra options in your configuration for these imports, they work out of the box

// returns the content as text
import text from "./content/file.text" with { type: "text" };

// returns the content as `Uint8Array`
import bytes from "./content/bytes.svg" with { type: "bytes" };

// 3. Using `new URL("./file.ext", import.meta.url);`
// You don't need extra options in your configuration for `new URL(...)` construction, they work out of the box
const url = new URL("./images/url.svg", import.meta.url);

const container = document.createElement("div");

Object.assign(container.style, {
	display: "flex",
	flexWrap: "wrap",
	justifyContent: "center"
});
document.body.appendChild(container);

function createImageElement(div, data) {
	const img = document.createElement("img");
	img.setAttribute("src", data);
	img.setAttribute("width", "150");
	div.appendChild(img);

	container.appendChild(div);
}

function createTextElement(div, data) {
	const context = document.createElement("div");
	context.textContent = data;
	div.appendChild(context);

	container.appendChild(div);
}

function createBlobElement(div, data) {
	const blob = new Blob([data], { type: 'image/svg+xml' });
	const blobUrl = URL.createObjectURL(blob);

	const img = document.createElement("img");

	img.setAttribute("src", blobUrl);
	img.setAttribute("width", "150");
	div.appendChild(img);

	container.appendChild(div);

	img.addEventListener(
		'load',
		() => { URL.revokeObjectURL(blobUrl) },
		{ once: true }
	);
}

const files = [
	{
		title: "import png from \"./images/file.png\";",
		data: png,
		render: createImageElement,
	},
	{
		title: "import jpg from \"./images/file.jpg\";",
		data: jpg,
		render: createImageElement,
	},
	{
		title: "import svg from \"./images/file.svg\";",
		data: svg,
		render: createImageElement,
	},
	{
		title: "import text from \"./content/file.text\" with { type: \"text\" };",
		data: text,
		render: createTextElement,
	},
	{
		title: "import bytes from \"./content/file.text\" with { type: \"bytes\" };",
		data: bytes,
		render: createBlobElement,
	},
	{
		title: "new URL(\"./url.svg\", import.meta.url);",
		data: url,
		render: createImageElement,
	},
];


function render(title, data, fn) {
	const div = document.createElement("div");
	div.style.textAlign = "center";
	div.style.width = "50%";

	const h2 = document.createElement("h2");
	h2.textContent = title;
	div.appendChild(h2);

	fn(div, data)
}

files.forEach(item => {
	render(item.title, item.data, item.render);
});
```

# webpack.config.js

```javascript
"use strict";

/** @type {import("webpack").Configuration} */
const config = {
	output: {
		assetModuleFilename: "images/[hash][ext]"
	},
	module: {
		rules: [
			{
				test: /file\.(png|jpg|svg)$/,
				type: "asset"
			}
		]
	}
};

module.exports = config;
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
/*! export default [not provided] [no usage info] [missing usage info prevents renaming] */
/*! other exports [not provided] [no usage info] */
/*! runtime requirements: __webpack_require__.p, module, __webpack_require__.* */
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

module.exports = __webpack_require__.p + "images/89a353e9c515885abd8e.png";

/***/ }),
/* 2 */
/*!*************************!*\
  !*** ./images/file.jpg ***!
  \*************************/
/*! default exports */
/*! export default [not provided] [no usage info] [missing usage info prevents renaming] */
/*! other exports [not provided] [no usage info] */
/*! runtime requirements: module */
/***/ ((module) => {

module.exports = "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAASABIAA...4CD/9M//Z";

/***/ }),
/* 3 */
/*!*************************!*\
  !*** ./images/file.svg ***!
  \*************************/
/*! default exports */
/*! export default [not provided] [no usage info] [missing usage info prevents renaming] */
/*! other exports [not provided] [no usage info] */
/*! runtime requirements: module */
/***/ ((module) => {

module.exports = "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDo...vc3ZnPgo=";

/***/ }),
/* 4 */
/*!************************!*\
  !*** ./images/url.svg ***!
  \************************/
/*! default exports */
/*! exports [not provided] [no usage info] */
/*! runtime requirements: __webpack_require__.p, module, __webpack_require__.* */
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

module.exports = __webpack_require__.p + "images/afc10c70ed4ce2b33593.svg";

/***/ }),
/* 5 */
/*!***************************!*\
  !*** ./content/file.text ***!
  \***************************/
/*! default exports */
/*! export default [not provided] [no usage info] [missing usage info prevents renaming] */
/*! other exports [not provided] [no usage info] */
/*! runtime requirements: module */
/***/ ((module) => {

module.exports = "a Ā 𐀀 文 🦄 Text\n";

/***/ }),
/* 6 */
/*!***************************!*\
  !*** ./content/bytes.svg ***!
  \***************************/
/*! default exports */
/*! export default [not provided] [no usage info] [missing usage info prevents renaming] */
/*! other exports [not provided] [no usage info] */
/*! runtime requirements: __webpack_require__.*, __webpack_require__.tb, module */
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

module.exports = __webpack_require__.tb("PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCA2MDAgNjAwIj48dGl0bGU+aWNvbi1zcXVhcmUtc21hbGw8L3RpdGxlPjxwYXRoIGZpbGw9IiNGRkYiIGQ9Ik0zMDAgLjFMNTY1IDE1MHYyOTkuOUwzMDAgNTk5LjggMzUgNDQ5LjlWMTUweiIvPjxwYXRoIGZpbGw9IiM4RUQ2RkIiIGQ9Ik01MTcuNyA0MzkuNUwzMDguOCA1NTcuOHYtOTJMNDM5IDM5NC4xbDc4LjcgNDUuNHptMTQuMy0xMi45VjE3OS40bC03Ni40IDQ0LjF2MTU5bDc2LjQgNDQuMXpNODEuNSA0MzkuNWwyMDguOSAxMTguMnYtOTJsLTEzMC4yLTcxLjYtNzguNyA0NS40em0tMTQuMy0xMi45VjE3OS40bDc2LjQgNDQuMXYxNTlsLTc2LjQgNDQuMXptOC45LTI2My4yTDI5MC40IDQyLjJ2ODlsLTEzNy4zIDc1LjUtMS4xLjYtNzUuOS00My45em00NDYuOSAwTDMwOC44IDQyLjJ2ODlMNDQ2IDIwNi44bDEuMS42IDc1LjktNDR6Ii8+PHBhdGggZmlsbD0iIzFDNzhDMCIgZD0iTTI5MC40IDQ0NC44TDE2MiAzNzQuMVYyMzQuMmwxMjguNCA3NC4xdjEzNi41em0xOC40IDBsMTI4LjQtNzAuNnYtMTQwbC0xMjguNCA3NC4xdjEzNi41ek0yOTkuNiAzMDN6bS0xMjktODVsMTI5LTcwLjlMNDI4LjUgMjE4bC0xMjguOSA3NC40LTEyOS03NC40eiIvPjwvc3ZnPgo=");

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
/******/ 		// Check if module exists (development only)
/******/ 		if (__webpack_modules__[moduleId] === undefined) {
/******/ 			var e = new Error("Cannot find module '" + moduleId + "'");
/******/ 			e.code = 'MODULE_NOT_FOUND';
/******/ 			throw e;
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
/******/ 	// expose the modules object (__webpack_modules__)
/******/ 	__webpack_require__.m = __webpack_modules__;
/******/ 	
/************************************************************************/
/******/ 	/* webpack/runtime/hasOwnProperty shorthand */
/******/ 	(() => {
/******/ 		__webpack_require__.o = (obj, prop) => (Object.prototype.hasOwnProperty.call(obj, prop))
/******/ 	})();
/******/ 	
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
/******/ 	/* webpack/runtime/to binary */
/******/ 	(() => {
/******/ 		// define to binary helper
/******/ 		__webpack_require__.tb =  (() => {
/******/ 			var table = new Uint8Array(128);
/******/ 			for (var i = 0; i < 64; i++) table[i < 26 ? i + 65 : i < 52 ? i + 71 : i < 62 ? i - 4 : i * 4 - 205] = i;
/******/ 			return (base64) => {
/******/ 				var n = base64.length, bytes = new Uint8Array((n - (base64[n - 1] == '=') - (base64[n - 2] == '=')) * 3 / 4 | 0);
/******/ 				for (var i = 0, j = 0; i < n;) {
/******/ 					var c0 = table[base64.charCodeAt(i++)], c1 = table[base64.charCodeAt(i++)];
/******/ 					var c2 = table[base64.charCodeAt(i++)], c3 = table[base64.charCodeAt(i++)];
/******/ 					bytes[j++] = (c0 << 2) | (c1 >> 4);
/******/ 					bytes[j++] = (c1 << 4) | (c2 >> 2);
/******/ 					bytes[j++] = (c2 << 6) | c3;
/******/ 				}
/******/ 				return bytes
/******/ 			}
/******/ 		})();
/******/ 	})();
/******/ 	
/******/ 	/* webpack/runtime/publicPath */
/******/ 	(() => {
/******/ 		__webpack_require__.p = "dist/";
/******/ 	})();
/******/ 	
/******/ 	/* webpack/runtime/jsonp chunk loading */
/******/ 	(() => {
/******/ 		__webpack_require__.b = (typeof document !== 'undefined' && document.baseURI) || self.location.href;
/******/ 		
/******/ 		// object to store loaded and loading chunks
/******/ 		// undefined = chunk not loaded, null = chunk preloaded/prefetched
/******/ 		// [resolve, reject, Promise] = chunk loading, 0 = chunk loaded
/******/ 		var installedChunks = {
/******/ 			0: 0
/******/ 		};
/******/ 		
/******/ 		// no chunk on demand loading
/******/ 		
/******/ 		// no prefetching
/******/ 		
/******/ 		// no preloaded
/******/ 		
/******/ 		// no HMR
/******/ 		
/******/ 		// no HMR manifest
/******/ 		
/******/ 		// no on chunks loaded
/******/ 		
/******/ 		// no jsonp function
/******/ 	})();
/******/ 	
/************************************************************************/
```

</details>

``` js
var __webpack_exports__ = {};
// This entry needs to be wrapped in an IIFE because it needs to be isolated against other modules in the chunk.
(() => {
/*!********************!*\
  !*** ./example.js ***!
  \********************/
/*! namespace exports */
/*! exports [not provided] [no usage info] */
/*! runtime requirements: __webpack_require__, __webpack_require__.b, __webpack_require__.r, __webpack_exports__, __webpack_require__.* */
__webpack_require__.r(__webpack_exports__);
/* harmony import */ var _images_file_png__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ./images/file.png */ 1);
/* harmony import */ var _images_file_jpg__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ./images/file.jpg */ 2);
/* harmony import */ var _images_file_svg__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! ./images/file.svg */ 3);
/* harmony import */ var _content_file_text__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(/*! ./content/file.text */ 5);
/* harmony import */ var _content_bytes_svg__WEBPACK_IMPORTED_MODULE_4__ = __webpack_require__(/*! ./content/bytes.svg */ 6);
// There are different ways to use files:

// 1. Using `import something from "./file.ext";`

// return URLs or Data URL, depends on your configuration




// 2. Using `import something from "./file.ext"; with { type: "text" }` or `import something from "./file.ext"; with { type: "bytes" }`
// You don't need extra options in your configuration for these imports, they work out of the box

// returns the content as text


// returns the content as `Uint8Array`


// 3. Using `new URL("./file.ext", import.meta.url);`
// You don't need extra options in your configuration for `new URL(...)` construction, they work out of the box
const url = new URL(/* asset import */ __webpack_require__(/*! ./images/url.svg */ 4), __webpack_require__.b);

const container = document.createElement("div");

Object.assign(container.style, {
	display: "flex",
	flexWrap: "wrap",
	justifyContent: "center"
});
document.body.appendChild(container);

function createImageElement(div, data) {
	const img = document.createElement("img");
	img.setAttribute("src", data);
	img.setAttribute("width", "150");
	div.appendChild(img);

	container.appendChild(div);
}

function createTextElement(div, data) {
	const context = document.createElement("div");
	context.textContent = data;
	div.appendChild(context);

	container.appendChild(div);
}

function createBlobElement(div, data) {
	const blob = new Blob([data], { type: 'image/svg+xml' });
	const blobUrl = URL.createObjectURL(blob);

	const img = document.createElement("img");

	img.setAttribute("src", blobUrl);
	img.setAttribute("width", "150");
	div.appendChild(img);

	container.appendChild(div);

	img.addEventListener(
		'load',
		() => { URL.revokeObjectURL(blobUrl) },
		{ once: true }
	);
}

const files = [
	{
		title: "import png from \"./images/file.png\";",
		data: _images_file_png__WEBPACK_IMPORTED_MODULE_0__,
		render: createImageElement,
	},
	{
		title: "import jpg from \"./images/file.jpg\";",
		data: _images_file_jpg__WEBPACK_IMPORTED_MODULE_1__,
		render: createImageElement,
	},
	{
		title: "import svg from \"./images/file.svg\";",
		data: _images_file_svg__WEBPACK_IMPORTED_MODULE_2__,
		render: createImageElement,
	},
	{
		title: "import text from \"./content/file.text\" with { type: \"text\" };",
		data: _content_file_text__WEBPACK_IMPORTED_MODULE_3__,
		render: createTextElement,
	},
	{
		title: "import bytes from \"./content/file.text\" with { type: \"bytes\" };",
		data: _content_bytes_svg__WEBPACK_IMPORTED_MODULE_4__,
		render: createBlobElement,
	},
	{
		title: "new URL(\"./url.svg\", import.meta.url);",
		data: url,
		render: createImageElement,
	},
];


function render(title, data, fn) {
	const div = document.createElement("div");
	div.style.textAlign = "center";
	div.style.width = "50%";

	const h2 = document.createElement("h2");
	h2.textContent = title;
	div.appendChild(h2);

	fn(div, data)
}

files.forEach(item => {
	render(item.title, item.data, item.render);
});

})();

/******/ })()
;
```

# Info

## webpack output

```
asset output.js 20 KiB [emitted] (name: main)
asset images/89a353e9c515885abd8e.png 14.6 KiB [emitted] [immutable] [from: images/file.png] (auxiliary name: main)
asset images/afc10c70ed4ce2b33593.svg 656 bytes [emitted] [immutable] [from: images/url.svg] (auxiliary name: main)
chunk (runtime: main) output.js (main) 12.4 KiB (javascript) 15.2 KiB (asset) 1.48 KiB (runtime) [entry] [rendered]
  > ./example.js main
  dependent modules 9.59 KiB (javascript) 15.2 KiB (asset) [dependent] 6 modules
  runtime modules 1.48 KiB 5 modules
  ./example.js 2.85 KiB [built] [code generated]
    [no exports]
    [used exports unknown]
    entry ./example.js main
webpack X.X.X compiled successfully
```
