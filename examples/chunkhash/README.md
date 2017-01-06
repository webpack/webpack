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
System.import("./async1");
System.import("./async2");
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
		filename: "[name].chunkhash.js",
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
!function(e){function r(n){if(t[n])return t[n].exports;var o=t[n]={i:n,l:!1,exports:{}};return e[n].call(o.exports,o,o.exports,r),o.l=!0,o.exports}var n=window.webpackJsonp;window.webpackJsonp=function(t,a,c){for(var u,i,f,s=0,l=[];s<t.length;s++)i=t[s],o[i]&&l.push(o[i][0]),o[i]=0;for(u in a)Object.prototype.hasOwnProperty.call(a,u)&&(e[u]=a[u]);for(n&&n(t,a,c);l.length;)l.shift()();if(c)for(s=0;s<c.length;s++)f=r(r.s=c[s]);return f};var t={},o={4:0};r.e=function(e){function n(){a.onerror=a.onload=null,clearTimeout(c);var r=o[e];0!==r&&(r&&r[1](new Error("Loading chunk "+e+" failed.")),o[e]=void 0)}if(0===o[e])return Promise.resolve();if(o[e])return o[e][2];var t=document.getElementsByTagName("head")[0],a=document.createElement("script");a.type="text/javascript",a.charset="utf-8",a.async=!0,a.timeout=12e4,r.nc&&a.setAttribute("nonce",r.nc),a.src=r.p+""+{0:"d8d9958181fae97ba27d",1:"36e4c03aa77bd58b0abc",2:"28b8ea2c1cc4eaebd919",3:"14bf1a160bee78ea17f7"}[e]+".js";var c=setTimeout(n,12e4);a.onerror=a.onload=n;var u=new Promise(function(r,n){o[e]=[r,n]});return o[e][2]=u,t.appendChild(a),u},r.m=e,r.c=t,r.i=function(e){return e},r.d=function(e,n,t){r.o(e,n)||Object.defineProperty(e,n,{configurable:!1,enumerable:!0,get:t})},r.n=function(e){var n=e&&e.__esModule?function(){return e.default}:function(){return e};return r.d(n,"a",n),n},r.o=function(e,r){return Object.prototype.hasOwnProperty.call(e,r)},r.p="js/",r.oe=function(e){throw console.error(e),e}}([]);
</script>

<!-- optional when using the CommonChunkPlugin for vendor modules -->
<script src="js/common.[chunkhash].js"></script>

<script src="js/main.[chunkhash].js"></script>

</body>
</html>
```

# js/common.[chunkhash].js

``` javascript
webpackJsonp([2,4],[
/* 0 */
/* exports provided: default */
/* all exports used */
/*!*******************!*\
  !*** ./vendor.js ***!
  \*******************/
/***/ function(module, exports, __webpack_require__) {

"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// some vendor lib (should be in common chunk)
/* harmony default export */ exports["default"] = 123;


/***/ },
/* 1 */,
/* 2 */,
/* 3 */,
/* 4 */
/* unknown exports provided */
/* all exports used */
/*!********************!*\
  !*** multi common ***!
  \********************/
/***/ function(module, exports, __webpack_require__) {

module.exports = __webpack_require__(/*! ./vendor */0);


/***/ }
],[4]);
```

# js/main.[chunkhash].js

``` javascript
webpackJsonp([3,4],{

/***/ 3:
/* unknown exports provided */
/* all exports used */
/*!********************!*\
  !*** ./example.js ***!
  \********************/
/***/ function(module, exports, __webpack_require__) {

"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_0__vendor__ = __webpack_require__(/*! ./vendor */ 0);

// some module
__webpack_require__.e/* import() */(1).then(__webpack_require__.bind(null, /*! ./async1 */ 1));
__webpack_require__.e/* import() */(0).then(__webpack_require__.bind(null, /*! ./async2 */ 2));


/***/ }

},[3]);
```

# Info

## Uncompressed

```
Hash: 7b7e514d1f86a946849f
Version: webpack 2.2.0-rc.2
                  Asset       Size  Chunks             Chunk Names
d8d9958181fae97ba27d.js  237 bytes    0, 4  [emitted]  
36e4c03aa77bd58b0abc.js  243 bytes    1, 4  [emitted]  
    common.chunkhash.js  701 bytes    2, 4  [emitted]  common
      main.chunkhash.js  630 bytes    3, 4  [emitted]  main
  manifest.chunkhash.js    5.66 kB       4  [emitted]  manifest
Entrypoint main = manifest.chunkhash.js common.chunkhash.js main.chunkhash.js
Entrypoint common = manifest.chunkhash.js common.chunkhash.js
chunk    {0} d8d9958181fae97ba27d.js 29 bytes {3} [rendered]
    > [3] ./example.js 4:0-25
    [2] ./async2.js 29 bytes {0} [built]
        import() ./async2 [3] ./example.js 4:0-25
chunk    {1} 36e4c03aa77bd58b0abc.js 29 bytes {3} [rendered]
    > [3] ./example.js 3:0-25
    [1] ./async1.js 29 bytes {1} [built]
        import() ./async1 [3] ./example.js 3:0-25
chunk    {2} common.chunkhash.js (common) 97 bytes {4} [initial] [rendered]
    > common [4] multi common 
    [0] ./vendor.js 69 bytes {2} [built]
        [exports: default]
        harmony import ./vendor [3] ./example.js 1:0-30
        single entry ./vendor [4] multi common
    [4] multi common 28 bytes {2} [built]
chunk    {3} main.chunkhash.js (main) 104 bytes {2} [initial] [rendered]
    > main [3] ./example.js 
    [3] ./example.js 104 bytes {3} [built]
chunk    {4} manifest.chunkhash.js (manifest) 0 bytes [entry] [rendered]
```

## Minimized (uglify-js, no zip)

```
Hash: 7b7e514d1f86a946849f
Version: webpack 2.2.0-rc.2
                  Asset       Size  Chunks             Chunk Names
d8d9958181fae97ba27d.js   40 bytes    0, 4  [emitted]  
36e4c03aa77bd58b0abc.js   39 bytes    1, 4  [emitted]  
    common.chunkhash.js  154 bytes    2, 4  [emitted]  common
      main.chunkhash.js  168 bytes    3, 4  [emitted]  main
  manifest.chunkhash.js    1.48 kB       4  [emitted]  manifest
Entrypoint main = manifest.chunkhash.js common.chunkhash.js main.chunkhash.js
Entrypoint common = manifest.chunkhash.js common.chunkhash.js
chunk    {0} d8d9958181fae97ba27d.js 29 bytes {3} [rendered]
    > [3] ./example.js 4:0-25
    [2] ./async2.js 29 bytes {0} [built]
        import() ./async2 [3] ./example.js 4:0-25
chunk    {1} 36e4c03aa77bd58b0abc.js 29 bytes {3} [rendered]
    > [3] ./example.js 3:0-25
    [1] ./async1.js 29 bytes {1} [built]
        import() ./async1 [3] ./example.js 3:0-25
chunk    {2} common.chunkhash.js (common) 97 bytes {4} [initial] [rendered]
    > common [4] multi common 
    [0] ./vendor.js 69 bytes {2} [built]
        [exports: default]
        harmony import ./vendor [3] ./example.js 1:0-30
        single entry ./vendor [4] multi common
    [4] multi common 28 bytes {2} [built]
chunk    {3} main.chunkhash.js (main) 104 bytes {2} [initial] [rendered]
    > main [3] ./example.js 
    [3] ./example.js 104 bytes {3} [built]
chunk    {4} manifest.chunkhash.js (manifest) 0 bytes [entry] [rendered]
```