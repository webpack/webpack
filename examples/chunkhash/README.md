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
	// mode: "development || "production",
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
!function(e){function r(r){for(var n,u,i,s=r[0],l=r[1],p=r[2],f=0,d=[];f<s.length;f++)u=s[f],o[u]&&d.push(o[u][0]),o[u]=0;for(n in l)Object.prototype.hasOwnProperty.call(l,n)&&(e[n]=l[n]);for(c&&c(r);d.length;)d.shift()();for(a.push.apply(a,p||[]),f=0;f<a.length;f++){for(var b=a[f],h=!0,v=1;v<b.length;v++){var g=b[v];0!==o[g]&&(h=!1)}h&&(a.splice(f--,1),i=t(t.s=b[0]))}return i}function t(r){if(n[r])return n[r].exports;var o=n[r]={i:r,l:!1,exports:{}};return e[r].call(o.exports,o,o.exports,t),o.l=!0,o.exports}var n={},o={4:0},a=[];t.e=function(e){var r=[],n=o[e];if(0!==n)if(n)r.push(n[2]);else{var a=new Promise(function(r,t){n=o[e]=[r,t]});r.push(n[2]=a);var u=document.getElementsByTagName("head")[0],c=document.createElement("script");c.charset="utf-8",c.timeout=12e4,t.nc&&c.setAttribute("nonce",t.nc),c.src=t.p+""+{0:"5bb7dd73af69328b52b2",1:"b8ec80633785d373ba39",2:"4940b8b48ba3c90e30eb",3:"7809203ce12a49ce1b59"}[e]+".js";var i=setTimeout(function(){s({type:"timeout",target:c})},12e4);c.onerror=c.onload=s;function s(r){c.onerror=c.onload=null,clearTimeout(i);var t=o[e];if(0!==t){if(t){var n=r&&("load"===r.type?"missing":r.type),a=r&&r.target&&r.target.src,u=new Error("Loading chunk "+e+" failed.\n("+n+": "+a+")");u.type=n,u.request=a,t[1](u)}o[e]=void 0}}u.appendChild(c)}return Promise.all(r)},t.m=e,t.c=n,t.d=function(e,r,n){t.o(e,r)||Object.defineProperty(e,r,{configurable:!1,enumerable:!0,get:n})},t.r=function(e){Object.defineProperty(e,"__esModule",{value:!0})},t.n=function(e){var r=e&&e.__esModule?function(){return e.default}:function(){return e};return t.d(r,"a",r),r},t.o=function(e,r){return Object.prototype.hasOwnProperty.call(e,r)},t.p="js/",t.oe=function(e){throw console.error(e),e};var u=window.webpackJsonp=window.webpackJsonp||[],c=u.push.bind(u);u.push=r,u=u.slice();for(var i=0;i<u.length;i++)r(u[i])}([]);
</script>

<!-- optional when using the CommonChunkPlugin for vendor modules -->
<script src="js/common.[chunkhash].js"></script>

<script src="js/main.[chunkhash].js"></script>

</body>
</html>
```

# js/common.[chunkhash].js

``` javascript
(window["webpackJsonp"] = window["webpackJsonp"] || []).push([[1],[
/* 0 */,
/* 1 */
/*!*******************!*\
  !*** ./vendor.js ***!
  \*******************/
/*! exports provided: default */
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
__webpack_require__.r(__webpack_exports__);
// some vendor lib (should be in common chunk)
/* harmony default export */ __webpack_exports__["default"] = (123);


/***/ }),
/* 2 */,
/* 3 */,
/* 4 */
/*!**********************!*\
  !*** multi ./vendor ***!
  \**********************/
/*! no static exports found */
/***/ (function(module, exports, __webpack_require__) {

module.exports = __webpack_require__(/*! ./vendor */1);


/***/ })
],[[4,4,1]]]);
```

# js/main.[chunkhash].js

``` javascript
(window["webpackJsonp"] = window["webpackJsonp"] || []).push([[0],[
/* 0 */
/*!********************!*\
  !*** ./example.js ***!
  \********************/
/*! no exports provided */
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony import */ var _vendor__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ./vendor */1);

// some module
__webpack_require__.e/* import() */(2).then(function() { var module = __webpack_require__(/*! ./async1 */2); return typeof module === "object" && module && module.__esModule ? module : /* fake namespace object */ { "default": module }; });
__webpack_require__.e/* import() */(3).then(function() { var module = __webpack_require__(/*! ./async2 */3); return typeof module === "object" && module && module.__esModule ? module : /* fake namespace object */ { "default": module }; });


/***/ })
],[[0,4,1,0]]]);
```

# Info

## Unoptimized

```
Hash: 0a1b2c3d4e5f6a7b8c9d
Version: webpack next
                  Asset       Size  Chunks             Chunk Names
      main.[chunkhash].js  937 bytes       0  [emitted]  main
    common.[chunkhash].js  727 bytes       1  [emitted]  common
4c5791c50ea66d4b3b9c.js  264 bytes       2  [emitted]  
c1ddc8b0bb58306497fd.js  264 bytes       3  [emitted]  
  manifest.[chunkhash].js   7.14 KiB       4  [emitted]  manifest
Entrypoint main = manifest.[chunkhash].js common.[chunkhash].js main.[chunkhash].js
Entrypoint common = manifest.[chunkhash].js common.[chunkhash].js
chunk    {0} main.[chunkhash].js (main) 90 bytes {1} [initial] [rendered]
    > main [0] ./example.js 
    [0] ./example.js 90 bytes {0} [built]
        [no exports]
        single entry ./example  main
chunk    {1} common.[chunkhash].js (common) 97 bytes {4} [initial] [rendered]
    > common [4] multi ./vendor 
    [1] ./vendor.js 69 bytes {1} [built]
        [exports: default]
        harmony side effect evaluation ./vendor [0] ./example.js 1:0-30
        single entry ./vendor [4] multi ./vendor common:100000
    [4] multi ./vendor 28 bytes {1} [built]
        multi entry 
chunk    {2} 4c5791c50ea66d4b3b9c.js 29 bytes {0} [rendered]
    > [0] ./example.js 3:0-18
    [2] ./async1.js 29 bytes {2} [built]
        import() ./async1 [0] ./example.js 3:0-18
chunk    {3} c1ddc8b0bb58306497fd.js 29 bytes {0} [rendered]
    > [0] ./example.js 4:0-18
    [3] ./async2.js 29 bytes {3} [built]
        import() ./async2 [0] ./example.js 4:0-18
chunk    {4} manifest.[chunkhash].js (manifest) 0 bytes [entry] [rendered]
```

## Production mode

```
Hash: 0a1b2c3d4e5f6a7b8c9d
Version: webpack next
                  Asset       Size  Chunks             Chunk Names
5bb7dd73af69328b52b2.js   78 bytes       0  [emitted]  
b8ec80633785d373ba39.js   78 bytes       1  [emitted]  
    common.[chunkhash].js  154 bytes       2  [emitted]  common
      main.[chunkhash].js  299 bytes       3  [emitted]  main
  manifest.[chunkhash].js   1.81 KiB       4  [emitted]  manifest
Entrypoint main = manifest.[chunkhash].js common.[chunkhash].js main.[chunkhash].js
Entrypoint common = manifest.[chunkhash].js common.[chunkhash].js
chunk    {0} 5bb7dd73af69328b52b2.js 29 bytes {3} [rendered]
    > [1] ./example.js 4:0-18
    [4] ./async2.js 29 bytes {0} [built]
        import() ./async2 [1] ./example.js 4:0-18
chunk    {1} b8ec80633785d373ba39.js 29 bytes {3} [rendered]
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
