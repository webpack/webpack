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
	mode: "production",
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
!function(e){function r(r){for(var n,c,i,f=r[0],s=r[1],l=r[2],p=0,d=[];p<f.length;p++)c=f[p],o[c]&&d.push(o[c][0]),o[c]=0;for(n in s)Object.prototype.hasOwnProperty.call(s,n)&&(e[n]=s[n]);for(u&&u(r);d.length;)d.shift()();for(a.push.apply(a,l||[]),p=0;p<a.length;p++){for(var h=a[p],b=!0,v=1;v<h.length;v++){var g=h[v];0!==o[g]&&(b=!1)}b&&(a.splice(p--,1),i=t(t.s=h[0]))}return i}function t(r){if(n[r])return n[r].exports;var o=n[r]={i:r,l:!1,exports:{}};return e[r].call(o.exports,o,o.exports,t),o.l=!0,o.exports}var n={},o={4:0},a=[];t.e=function(e){function r(r){i.onerror=i.onload=null,clearTimeout(f);var t=o[e];if(0!==t){if(t){var n=r&&("load"===r.type?"missing":r.type),a=r&&r.target&&r.target.src,c=new Error("Loading chunk "+e+" failed.\n("+n+": "+a+")");c.type=n,c.request=a,t[1](c)}o[e]=void 0}}var n=[],a=o[e];if(0!==a)if(a)n.push(a[2]);else{var c=new Promise(function(r,t){a=o[e]=[r,t]});n.push(a[2]=c);var u=document.getElementsByTagName("head")[0],i=document.createElement("script");i.charset="utf-8",i.timeout=12e4,t.nc&&i.setAttribute("nonce",t.nc),i.src=t.p+""+{0:"d384ba1bbf385fcafc99",1:"13604ac9ffd7d870f88b",2:"21bb96c534a4f1d84e54",3:"e5aa9efd1b127c0b8617"}[e]+".js";var f=setTimeout(function(){r({type:"timeout",target:i})},12e4);i.onerror=i.onload=r,u.appendChild(i)}return Promise.all(n)},t.m=e,t.c=n,t.d=function(e,r,n){t.o(e,r)||Object.defineProperty(e,r,{configurable:!1,enumerable:!0,get:n})},t.r=function(e){Object.defineProperty(e,"__esModule",{value:!0})},t.n=function(e){var r=e&&e.__esModule?function(){return e.default}:function(){return e};return t.d(r,"a",r),r},t.o=function(e,r){return Object.prototype.hasOwnProperty.call(e,r)},t.p="js/",t.oe=function(e){throw console.error(e),e};var c=window.webpackJsonp=window.webpackJsonp||[],u=c.push.bind(c);c.push=r,c=c.slice();for(var i=0;i<c.length;i++)r(c[i])}([]);
</script>

<!-- optional when using the CommonChunkPlugin for vendor modules -->
<script src="js/common.[chunkhash].js"></script>

<script src="js/main.[chunkhash].js"></script>

</body>
</html>
```

# js/common.[chunkhash].js

``` javascript
(window["webpackJsonp"] = window["webpackJsonp"] || []).push([[2],[
/* 0 */
/*!*******************!*\
  !*** ./vendor.js ***!
  \*******************/
/*! exports provided: default */
/*! all exports used */
/*! ModuleConcatenation bailout: Module is referenced from these modules with unsupported syntax: multi ./vendor (referenced with single entry) */
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
__webpack_require__.r(__webpack_exports__);
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
/*! ModuleConcatenation bailout: Module is not an ECMAScript module */
/***/ (function(module, exports, __webpack_require__) {

module.exports = __webpack_require__(/*! ./vendor */0);


/***/ })
],[[2,4,2]]]);
```

# js/main.[chunkhash].js

``` javascript
(window["webpackJsonp"] = window["webpackJsonp"] || []).push([[3],[
/* 0 */,
/* 1 */
/*!********************!*\
  !*** ./example.js ***!
  \********************/
/*! no exports provided */
/*! all exports used */
/*! ModuleConcatenation bailout: Module is an entry point */
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony import */ var _vendor__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ./vendor */0);

// some module
__webpack_require__.e/* import() */(1).then(function() { var module = __webpack_require__(/*! ./async1 */3); return typeof module === "object" && module && module.__esModule ? module : /* fake namespace object */ { "default": module }; });
__webpack_require__.e/* import() */(0).then(function() { var module = __webpack_require__(/*! ./async2 */4); return typeof module === "object" && module && module.__esModule ? module : /* fake namespace object */ { "default": module }; });


/***/ })
],[[1,4,2,3]]]);
```

# Info

## Uncompressed

```
Hash: 19d389fe665472aada46
Version: webpack next
                  Asset       Size  Chunks             Chunk Names
d384ba1bbf385fcafc99.js  359 bytes       0  [emitted]  
13604ac9ffd7d870f88b.js  359 bytes       1  [emitted]  
    common.[chunkhash].js  975 bytes       2  [emitted]  common
      main.[chunkhash].js   1.01 KiB       3  [emitted]  main
  manifest.[chunkhash].js   7.14 KiB       4  [emitted]  manifest
Entrypoint main = manifest.[chunkhash].js common.[chunkhash].js main.[chunkhash].js
Entrypoint common = manifest.[chunkhash].js common.[chunkhash].js
chunk    {0} d384ba1bbf385fcafc99.js 29 bytes {3} [rendered]
    > [1] ./example.js 4:0-18
    [4] ./async2.js 29 bytes {0} [built]
        import() ./async2 [1] ./example.js 4:0-18
chunk    {1} 13604ac9ffd7d870f88b.js 29 bytes {3} [rendered]
    > [1] ./example.js 3:0-18
    [3] ./async1.js 29 bytes {1} [built]
        import() ./async1 [1] ./example.js 3:0-18
chunk    {2} common.[chunkhash].js (common) 97 bytes {4} [initial] [rendered]
    > common [2] multi ./vendor 
    [0] ./vendor.js 69 bytes {2} [built]
        [exports: default]
        harmony side effect evaluation ./vendor [1] ./example.js 1:0-30
        single entry ./vendor [2] multi ./vendor common:100000
    [2] multi ./vendor 28 bytes {2} [built]
        multi entry 
chunk    {3} main.[chunkhash].js (main) 90 bytes {2} [initial] [rendered]
    > main [1] ./example.js 
    [1] ./example.js 90 bytes {3} [built]
        [no exports]
        single entry ./example  main
chunk    {4} manifest.[chunkhash].js (manifest) 0 bytes [entry] [rendered]
```

## Minimized (uglify-js, no zip)

```
Hash: 19d389fe665472aada46
Version: webpack next
                  Asset       Size  Chunks             Chunk Names
d384ba1bbf385fcafc99.js   78 bytes       0  [emitted]  
13604ac9ffd7d870f88b.js   78 bytes       1  [emitted]  
    common.[chunkhash].js  154 bytes       2  [emitted]  common
      main.[chunkhash].js  299 bytes       3  [emitted]  main
  manifest.[chunkhash].js   1.81 KiB       4  [emitted]  manifest
Entrypoint main = manifest.[chunkhash].js common.[chunkhash].js main.[chunkhash].js
Entrypoint common = manifest.[chunkhash].js common.[chunkhash].js
chunk    {0} d384ba1bbf385fcafc99.js 29 bytes {3} [rendered]
    > [1] ./example.js 4:0-18
    [4] ./async2.js 29 bytes {0} [built]
        import() ./async2 [1] ./example.js 4:0-18
chunk    {1} 13604ac9ffd7d870f88b.js 29 bytes {3} [rendered]
    > [1] ./example.js 3:0-18
    [3] ./async1.js 29 bytes {1} [built]
        import() ./async1 [1] ./example.js 3:0-18
chunk    {2} common.[chunkhash].js (common) 97 bytes {4} [initial] [rendered]
    > common [2] multi ./vendor 
    [0] ./vendor.js 69 bytes {2} [built]
        [exports: default]
        harmony side effect evaluation ./vendor [1] ./example.js 1:0-30
        single entry ./vendor [2] multi ./vendor common:100000
    [2] multi ./vendor 28 bytes {2} [built]
        multi entry 
chunk    {3} main.[chunkhash].js (main) 90 bytes {2} [initial] [rendered]
    > main [1] ./example.js 
    [1] ./example.js 90 bytes {3} [built]
        [no exports]
        single entry ./example  main
chunk    {4} manifest.[chunkhash].js (manifest) 0 bytes [entry] [rendered]
```