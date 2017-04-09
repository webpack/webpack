A common challenge with combining `[chunkhash]` and Code Splitting is that the entry chunk includes the webpack runtime and with it the chunkhash mappings. This means it's always updated and the `[chunkhash]` is pretty useless, because this chunk won't be cached.

A very simple solution to this problem is to create another chunk which contains only the webpack runtime (including chunkhash map). This can be archieved by the CommonsChunkPlugin (or if the CommonsChunkPlugin is already used by passing multiple names to the CommonChunkPlugin). To avoid the additional request for another chunk, this pretty small chunk can be inlined into the HTML page.

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
!function(e){function r(n){if(t[n])return t[n].exports;var o=t[n]={i:n,l:!1,exports:{}};return e[n].call(o.exports,o,o.exports,r),o.l=!0,o.exports}var n=window.webpackJsonp;window.webpackJsonp=function(t,c,u){for(var a,i,f,s=0,l=[];s<t.length;s++)i=t[s],o[i]&&l.push(o[i][0]),o[i]=0;for(a in c)Object.prototype.hasOwnProperty.call(c,a)&&(e[a]=c[a]);for(n&&n(t,c,u);l.length;)l.shift()();if(u)for(s=0;s<u.length;s++)f=r(r.s=u[s]);return f};var t={},o={4:0};r.e=function(e){function n(){u.onerror=u.onload=null,clearTimeout(a);var r=o[e];0!==r&&(r&&r[1](new Error("Loading chunk "+e+" failed.")),o[e]=void 0)}if(0===o[e])return Promise.resolve();if(o[e])return o[e][2];var t=new Promise(function(r,n){o[e]=[r,n]});o[e][2]=t;var c=document.getElementsByTagName("head")[0],u=document.createElement("script");u.type="text/javascript",u.charset="utf-8",u.async=!0,u.timeout=12e4,r.nc&&u.setAttribute("nonce",r.nc),u.src=r.p+""+{0:"d1359b519c10df30787b",1:"06459c375ec851b0e2ae",2:"4d752abc2fcf569f13fc",3:"8d8564a703e7631bff4b"}[e]+".js";var a=setTimeout(n,12e4);return u.onerror=u.onload=n,c.appendChild(u),t},r.m=e,r.c=t,r.i=function(e){return e},r.d=function(e,n,t){r.o(e,n)||Object.defineProperty(e,n,{configurable:!1,enumerable:!0,get:t})},r.n=function(e){var n=e&&e.__esModule?function(){return e.default}:function(){return e};return r.d(n,"a",n),n},r.o=function(e,r){return Object.prototype.hasOwnProperty.call(e,r)},r.p="js/",r.oe=function(e){throw console.error(e),e}}([]);
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
/* exports provided: default */
/* all exports used */
/*!*******************!*\
  !*** ./vendor.js ***!
  \*******************/
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
Object.defineProperty(__webpack_exports__, "__esModule", { value: true });
// some vendor lib (should be in common chunk)
/* harmony default export */ __webpack_exports__["default"] = (123);


/***/ }),
/* 1 */,
/* 2 */,
/* 3 */,
/* 4 */
/* unknown exports provided */
/* all exports used */
/*!**********************!*\
  !*** multi ./vendor ***!
  \**********************/
/***/ (function(module, exports, __webpack_require__) {

module.exports = __webpack_require__(/*! ./vendor */0);


/***/ })
],[4]);
```

# js/main.[chunkhash].js

``` javascript
webpackJsonp([3],{

/***/ 3:
/* unknown exports provided */
/* all exports used */
/*!********************!*\
  !*** ./example.js ***!
  \********************/
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
Object.defineProperty(__webpack_exports__, "__esModule", { value: true });
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_0__vendor__ = __webpack_require__(/*! ./vendor */ 0);

// some module
__webpack_require__.e/* import() */(1).then(__webpack_require__.bind(null, /*! ./async1 */ 1));
__webpack_require__.e/* import() */(0).then(__webpack_require__.bind(null, /*! ./async2 */ 2));


/***/ })

},[3]);
```

# Info

## Uncompressed

```
Hash: ea635224271deb1b32d9
Version: webpack 2.3.3
                  Asset       Size  Chunks             Chunk Names
d1359b519c10df30787b.js  237 bytes       0  [emitted]  
06459c375ec851b0e2ae.js  243 bytes       1  [emitted]  
    common.[chunkhash].js  747 bytes       2  [emitted]  common
      main.[chunkhash].js  654 bytes       3  [emitted]  main
  manifest.[chunkhash].js    5.88 kB       4  [emitted]  manifest
Entrypoint main = manifest.[chunkhash].js common.[chunkhash].js main.[chunkhash].js
Entrypoint common = manifest.[chunkhash].js common.[chunkhash].js
chunk    {0} d1359b519c10df30787b.js 29 bytes {3} [rendered]
    > [3] ./example.js 4:0-18
    [2] ./async2.js 29 bytes {0} [built]
        import() ./async2 [3] ./example.js 4:0-18
chunk    {1} 06459c375ec851b0e2ae.js 29 bytes {3} [rendered]
    > [3] ./example.js 3:0-18
    [1] ./async1.js 29 bytes {1} [built]
        import() ./async1 [3] ./example.js 3:0-18
chunk    {2} common.[chunkhash].js (common) 97 bytes {4} [initial] [rendered]
    > common [4] multi ./vendor 
    [0] ./vendor.js 69 bytes {2} [built]
        [exports: default]
        harmony import ./vendor [3] ./example.js 1:0-30
        single entry ./vendor [4] multi ./vendor common:100000
    [4] multi ./vendor 28 bytes {2} [built]
chunk    {3} main.[chunkhash].js (main) 90 bytes {2} [initial] [rendered]
    > main [3] ./example.js 
    [3] ./example.js 90 bytes {3} [built]
chunk    {4} manifest.[chunkhash].js (manifest) 0 bytes [entry] [rendered]
```

## Minimized (uglify-js, no zip)

```
Hash: ea635224271deb1b32d9
Version: webpack 2.3.3
                  Asset       Size  Chunks             Chunk Names
d1359b519c10df30787b.js   38 bytes       0  [emitted]  
06459c375ec851b0e2ae.js   37 bytes       1  [emitted]  
    common.[chunkhash].js  152 bytes       2  [emitted]  common
      main.[chunkhash].js  166 bytes       3  [emitted]  main
  manifest.[chunkhash].js    1.48 kB       4  [emitted]  manifest
Entrypoint main = manifest.[chunkhash].js common.[chunkhash].js main.[chunkhash].js
Entrypoint common = manifest.[chunkhash].js common.[chunkhash].js
chunk    {0} d1359b519c10df30787b.js 29 bytes {3} [rendered]
    > [3] ./example.js 4:0-18
    [2] ./async2.js 29 bytes {0} [built]
        import() ./async2 [3] ./example.js 4:0-18
chunk    {1} 06459c375ec851b0e2ae.js 29 bytes {3} [rendered]
    > [3] ./example.js 3:0-18
    [1] ./async1.js 29 bytes {1} [built]
        import() ./async1 [3] ./example.js 3:0-18
chunk    {2} common.[chunkhash].js (common) 97 bytes {4} [initial] [rendered]
    > common [4] multi ./vendor 
    [0] ./vendor.js 69 bytes {2} [built]
        [exports: default]
        harmony import ./vendor [3] ./example.js 1:0-30
        single entry ./vendor [4] multi ./vendor common:100000
    [4] multi ./vendor 28 bytes {2} [built]
chunk    {3} main.[chunkhash].js (main) 90 bytes {2} [initial] [rendered]
    > main [3] ./example.js 
    [3] ./example.js 90 bytes {3} [built]
chunk    {4} manifest.[chunkhash].js (manifest) 0 bytes [entry] [rendered]
```