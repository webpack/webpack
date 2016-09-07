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
!function(e){function r(n){if(t[n])return t[n].exports;var o=t[n]={i:n,l:!1,exports:{}};return e[n].call(o.exports,o,o.exports,r),o.l=!0,o.exports}var n=window.webpackJsonp;window.webpackJsonp=function(t,a,c){for(var u,i,f,l=0,s=[];l<t.length;l++)i=t[l],o[i]&&s.push(o[i][0]),o[i]=0;for(u in a)Object.prototype.hasOwnProperty.call(a,u)&&(e[u]=a[u]);for(n&&n(t,a,c);s.length;)s.shift()();if(c)for(l=0;l<c.length;l++)f=r(r.s=c[l]);return f};var t={},o={4:0};r.e=function(e){function n(){a.onerror=a.onload=null,clearTimeout(c);var r=o[e];0!==r&&(r&&r[1](new Error("Loading chunk "+e+" failed.")),o[e]=void 0)}if(0===o[e])return Promise.resolve();if(o[e])return o[e][2];var t=document.getElementsByTagName("head")[0],a=document.createElement("script");a.type="text/javascript",a.charset="utf-8",a.async=!0,a.timeout=12e4,a.src=r.p+""+{0:"d8d9958181fae97ba27d",1:"36e4c03aa77bd58b0abc",2:"1437a149014dcc6cefbb",3:"388c9e54384a6129e3bd"}[e]+".js";var c=setTimeout(n,12e4);a.onerror=a.onload=n,t.appendChild(a);var u=new Promise(function(r,n){o[e]=[r,n]});return o[e][2]=u},r.m=e,r.c=t,r.i=function(e){return e},r.d=function(e,r,n){Object.defineProperty(e,r,{configurable:!1,enumerable:!0,get:n})},r.n=function(e){var n=e&&e.__esModule?function(){return e["default"]}:function(){return e};return r.d(n,"a",n),n},r.o=function(e,r){return Object.prototype.hasOwnProperty.call(e,r)},r.p="js/",r.oe=function(e){throw console.error(e),e}}([]);
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
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_0__vendor__ = __webpack_require__(/*! ./vendor */ 0);

// some module
__webpack_require__.e/* System.import */(1).then(__webpack_require__.bind(null, /*! ./async1 */ 1));
__webpack_require__.e/* System.import */(0).then(__webpack_require__.bind(null, /*! ./async2 */ 2));


/***/ }

},[3]);
```

# Info

## Uncompressed

```
Hash: a04360b4818d1203b9bf
Version: webpack 2.1.0-beta.22
Time: 150ms
                  Asset       Size  Chunks             Chunk Names
d8d9958181fae97ba27d.js  237 bytes    0, 4  [emitted]  
36e4c03aa77bd58b0abc.js  243 bytes    1, 4  [emitted]  
    common.chunkhash.js  638 bytes    2, 4  [emitted]  common
      main.chunkhash.js  577 bytes    3, 4  [emitted]  main
  manifest.chunkhash.js    5.45 kB       4  [emitted]  manifest
Entrypoint common = manifest.chunkhash.js common.chunkhash.js
Entrypoint main = manifest.chunkhash.js common.chunkhash.js main.chunkhash.js
chunk    {0} d8d9958181fae97ba27d.js 29 bytes {3} [rendered]
    > [3] ./example.js 4:0-25
    [2] ./async2.js 29 bytes {0} [built]
        System.import ./async2 [3] ./example.js 4:0-25
chunk    {1} 36e4c03aa77bd58b0abc.js 29 bytes {3} [rendered]
    > [3] ./example.js 3:0-25
    [1] ./async1.js 29 bytes {1} [built]
        System.import ./async1 [3] ./example.js 3:0-25
chunk    {2} common.chunkhash.js (common) 97 bytes {4} [initial] [rendered]
    > common [4] multi common 
    [0] ./vendor.js 69 bytes {2} [built]
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
Hash: a04360b4818d1203b9bf
Version: webpack 2.1.0-beta.22
Time: 319ms
                  Asset       Size  Chunks             Chunk Names
d8d9958181fae97ba27d.js   40 bytes    0, 4  [emitted]  
36e4c03aa77bd58b0abc.js   39 bytes    1, 4  [emitted]  
    common.chunkhash.js  108 bytes    2, 4  [emitted]  common
      main.chunkhash.js  119 bytes    3, 4  [emitted]  main
  manifest.chunkhash.js    1.43 kB       4  [emitted]  manifest
Entrypoint common = manifest.chunkhash.js common.chunkhash.js
Entrypoint main = manifest.chunkhash.js common.chunkhash.js main.chunkhash.js
chunk    {0} d8d9958181fae97ba27d.js 29 bytes {3} [rendered]
    > [3] ./example.js 4:0-25
    [2] ./async2.js 29 bytes {0} [built]
        System.import ./async2 [3] ./example.js 4:0-25
chunk    {1} 36e4c03aa77bd58b0abc.js 29 bytes {3} [rendered]
    > [3] ./example.js 3:0-25
    [1] ./async1.js 29 bytes {1} [built]
        System.import ./async1 [3] ./example.js 3:0-25
chunk    {2} common.chunkhash.js (common) 97 bytes {4} [initial] [rendered]
    > common [4] multi common 
    [0] ./vendor.js 69 bytes {2} [built]
        harmony import ./vendor [3] ./example.js 1:0-30
        single entry ./vendor [4] multi common
    [4] multi common 28 bytes {2} [built]
chunk    {3} main.chunkhash.js (main) 104 bytes {2} [initial] [rendered]
    > main [3] ./example.js 
    [3] ./example.js 104 bytes {3} [built]
chunk    {4} manifest.chunkhash.js (manifest) 0 bytes [entry] [rendered]
```