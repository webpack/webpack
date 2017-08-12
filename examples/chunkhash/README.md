A common challenge with combining `[chunkhash]` and Code Splitting is that the entry chunk includes the webpack runtime and with it the chunkhash mappings. This means it's always updated and the `[chunkhash]` is pretty useless, because this chunk won't be cached.

A very simple solution to this problem is to create another chunk which contains only the webpack runtime (including chunkhash map). This can be achieved by the CommonsChunkPlugin (or if the CommonsChunkPlugin is already used by passing multiple names to the CommonChunkPlugin). To avoid the additional request for another chunk, this pretty small chunk can be inlined into the HTML page.

The configuration required for this is:

* use `[chunkhash]` in `output.filename` (Note that this example doesn't do this because of the example generator infrastructure, but you should)
* use `[chunkhash]` in `output.chunkFilename`
* `CommonsChunkPlugin`

# example.js

``` javascript
import vendor from "./vendor";
// some module
import("./async1");
import("./async2");
```

# vendor.js

``` javascript
// some vendor lib (should be in common chunk)
export default 123;
```

# webpack.config.js

``` javascript
var path = require("path");
var webpack = require("../../");
module.exports = {
	entry: {
		main: "./example",
		common: ["./vendor"] // optional
	},
	output: {
		path: path.join(__dirname, "js"),
		filename: "[name].[chunkhash].js",
		chunkFilename: "[chunkhash].js"
	},
	plugins: [
		new webpack.optimize.CommonsChunkPlugin({
			names: ["common", "manifest"]
		})
		/* without the "common" chunk:
		new webpack.optimize.CommonsChunkPlugin({
			name: "manifest"
		})
		*/
	]
};
```

# index.html

``` html
<html>
<head>
</head>
<body>

<!-- inlined minimized file "manifest.[chunkhash].js" -->
<script>
!function(e){function n(r){if(t[r])return t[r].exports;var o=t[r]={i:r,l:!1,exports:{}};return e[r].call(o.exports,o,o.exports,n),o.l=!0,o.exports}var r=window.webpackJsonp;window.webpackJsonp=function(t,c,a){for(var u,i,f,d=0,s=[];d<t.length;d++)i=t[d],o[i]&&s.push(o[i][0]),o[i]=0;for(u in c)Object.prototype.hasOwnProperty.call(c,u)&&(e[u]=c[u]);for(r&&r(t,c,a);s.length;)s.shift()();if(a)for(d=0;d<a.length;d++)f=n(n.s=a[d]);return f};var t={},o={4:0};n.e=function(e){function r(){u.onerror=u.onload=null,clearTimeout(i);var n=o[e];0!==n&&(n&&n[1](new Error("Loading chunk "+e+" failed.")),o[e]=void 0)}var t=o[e];if(0===t)return new Promise(function(e){e()});if(t)return t[2];var c=new Promise(function(n,r){t=o[e]=[n,r]});t[2]=c;var a=document.getElementsByTagName("head")[0],u=document.createElement("script");u.type="text/javascript",u.charset="utf-8",u.async=!0,u.timeout=12e4,n.nc&&u.setAttribute("nonce",n.nc),u.src=n.p+""+{0:"3db3fdaf96bbdadce99a",1:"7c1138cf80dd374c367e",2:"543257d0ba12aefbc71b",3:"15bdf078724c793dc604"}[e]+".js";var i=setTimeout(r,12e4);return u.onerror=u.onload=r,a.appendChild(u),c},n.m=e,n.c=t,n.d=function(e,r,t){n.o(e,r)||Object.defineProperty(e,r,{configurable:!1,enumerable:!0,get:t})},n.n=function(e){var r=e&&e.__esModule?function(){return e.default}:function(){return e};return n.d(r,"a",r),r},n.o=function(e,n){return Object.prototype.hasOwnProperty.call(e,n)},n.p="js/",n.oe=function(e){throw console.error(e),e}}([]);
</script>

<!-- optional when using the CommonChunkPlugin for vendor modules -->
<script src="js/common.[chunkhash].js"></script>

<script src="js/main.[chunkhash].js"></script>

</body>
</html>
```

# js/common.[chunkhash].js

``` javascript
webpackJsonp([2],[
/* 0 */
/*!*******************!*\
  !*** ./vendor.js ***!
  \*******************/
/*! exports provided: default */
/*! all exports used */
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
Object.defineProperty(__webpack_exports__, "__esModule", { value: true });
// some vendor lib (should be in common chunk)
/* harmony default export */ __webpack_exports__["default"] = (123);


/***/ }),
/* 1 */,
/* 2 */
/*!**********************!*\
  !*** multi ./vendor ***!
  \**********************/
/*! no static exports found */
/*! all exports used */
/***/ (function(module, exports, __webpack_require__) {

module.exports = __webpack_require__(/*! ./vendor */0);


/***/ })
],[2]);
```

# js/main.[chunkhash].js

``` javascript
webpackJsonp([3],[
/* 0 */,
/* 1 */
/*!********************!*\
  !*** ./example.js ***!
  \********************/
/*! exports provided:  */
/*! all exports used */
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
Object.defineProperty(__webpack_exports__, "__esModule", { value: true });
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_0__vendor__ = __webpack_require__(/*! ./vendor */ 0);

// some module
__webpack_require__.e/* import() */(1).then(__webpack_require__.bind(null, /*! ./async1 */ 3));
__webpack_require__.e/* import() */(0).then(__webpack_require__.bind(null, /*! ./async2 */ 4));


/***/ })
],[1]);
```

# Info

## Uncompressed

```
Hash: 49023fec553882c3285c
Version: webpack 3.5.1
                  Asset       Size  Chunks             Chunk Names
3db3fdaf96bbdadce99a.js  238 bytes       0  [emitted]  
7c1138cf80dd374c367e.js  238 bytes       1  [emitted]  
    common.[chunkhash].js  732 bytes       2  [emitted]  common
      main.[chunkhash].js  656 bytes       3  [emitted]  main
  manifest.[chunkhash].js    5.89 kB       4  [emitted]  manifest
Entrypoint main = manifest.[chunkhash].js common.[chunkhash].js main.[chunkhash].js
Entrypoint common = manifest.[chunkhash].js common.[chunkhash].js
chunk    {0} 3db3fdaf96bbdadce99a.js 29 bytes {3} [rendered]
    > [1] ./example.js 4:0-18
    [4] ./async2.js 29 bytes {0} [built]
        import() ./async2 [1] ./example.js 4:0-18
chunk    {1} 7c1138cf80dd374c367e.js 29 bytes {3} [rendered]
    > [1] ./example.js 3:0-18
    [3] ./async1.js 29 bytes {1} [built]
        import() ./async1 [1] ./example.js 3:0-18
chunk    {2} common.[chunkhash].js (common) 97 bytes {4} [initial] [rendered]
    > common [2] multi ./vendor 
    [0] ./vendor.js 69 bytes {2} [built]
        [exports: default]
        harmony import ./vendor [1] ./example.js 1:0-30
        single entry ./vendor [2] multi ./vendor common:100000
    [2] multi ./vendor 28 bytes {2} [built]
chunk    {3} main.[chunkhash].js (main) 90 bytes {2} [initial] [rendered]
    > main [1] ./example.js 
    [1] ./example.js 90 bytes {3} [built]
        [no exports]
chunk    {4} manifest.[chunkhash].js (manifest) 0 bytes [entry] [rendered]
```

## Minimized (uglify-js, no zip)

```
Hash: 49023fec553882c3285c
Version: webpack 3.5.1
                  Asset       Size  Chunks             Chunk Names
3db3fdaf96bbdadce99a.js   38 bytes       0  [emitted]  
7c1138cf80dd374c367e.js   38 bytes       1  [emitted]  
    common.[chunkhash].js  150 bytes       2  [emitted]  common
      main.[chunkhash].js  165 bytes       3  [emitted]  main
  manifest.[chunkhash].js    1.46 kB       4  [emitted]  manifest
Entrypoint main = manifest.[chunkhash].js common.[chunkhash].js main.[chunkhash].js
Entrypoint common = manifest.[chunkhash].js common.[chunkhash].js
chunk    {0} 3db3fdaf96bbdadce99a.js 29 bytes {3} [rendered]
    > [1] ./example.js 4:0-18
    [4] ./async2.js 29 bytes {0} [built]
        import() ./async2 [1] ./example.js 4:0-18
chunk    {1} 7c1138cf80dd374c367e.js 29 bytes {3} [rendered]
    > [1] ./example.js 3:0-18
    [3] ./async1.js 29 bytes {1} [built]
        import() ./async1 [1] ./example.js 3:0-18
chunk    {2} common.[chunkhash].js (common) 97 bytes {4} [initial] [rendered]
    > common [2] multi ./vendor 
    [0] ./vendor.js 69 bytes {2} [built]
        [exports: default]
        harmony import ./vendor [1] ./example.js 1:0-30
        single entry ./vendor [2] multi ./vendor common:100000
    [2] multi ./vendor 28 bytes {2} [built]
chunk    {3} main.[chunkhash].js (main) 90 bytes {2} [initial] [rendered]
    > main [1] ./example.js 
    [1] ./example.js 90 bytes {3} [built]
        [no exports]
chunk    {4} manifest.[chunkhash].js (manifest) 0 bytes [entry] [rendered]
```