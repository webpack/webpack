
# a.js

``` javascript
require("./style.css");
require("./styleA.css");
```

# b.js

``` javascript
require("./style.css");
require("./styleB.css");
```

# c.js

``` javascript
require("./styleC.css");
```

# style.css

``` css
body {
	background: url(image.png);
}
```

# styleA.css

``` css
.a {
	background: url(imageA.png);
}
```

# styleB.css

``` css
.b {
	background: url(imageB.png);
}
```

# styleC.css

``` css
@import "style.css";
.c {
	background: url(imageC.png);
}
```

# webpack.config.js

``` javascript
var path = require("path");
var CommonsChunkPlugin = require("../../lib/optimize/CommonsChunkPlugin");
var ExtractTextPlugin = require("extract-text-webpack-plugin");
module.exports = {
	entry: {
		A: "./a",
		B: "./b",
		C: "./c",
	},
	output: {
		path: path.join(__dirname, "js"),
		filename: "[name].js"
	},
	module: {
		loaders: [
			{
				test: /\.css$/,
				use: ExtractTextPlugin.extract({
					fallback: "style-loader",
					use: "css-loader"
				})
			},
			{ test: /\.png$/, loader: "file-loader" }
		]
	},
	plugins: [
		new CommonsChunkPlugin({
			name: "commons",
			filename: "commons.js",
			chunks: ["A", "B"]
		}),
		new ExtractTextPlugin({
			filename: "[name].css"
		}),
	]
};
```

# js/A.js

``` javascript
webpackJsonp([1],[
/* 0 */,
/* 1 */
/*!**************!*\
  !*** ./a.js ***!
  \**************/
/*! no static exports found */
/*! all exports used */
/***/ (function(module, exports, __webpack_require__) {

__webpack_require__(/*! ./style.css */ 0);
__webpack_require__(/*! ./styleA.css */ 2);


/***/ }),
/* 2 */
/*!********************!*\
  !*** ./styleA.css ***!
  \********************/
/*! no static exports found */
/*! all exports used */
/***/ (function(module, exports) {

// removed by extract-text-webpack-plugin

/***/ })
],[1]);
```

# js/commons.css

``` css
body {
	background: url(js/ce21cbdd9b894e6af794813eb3fdaf60.png);
}
```

# js/A.css

``` css
.a {
	background: url(js/d090b6fba0f6d326d282a19146ff54a7.png);
}
```

# js/B.css

``` css
.b {
	background: url(js/16155c689e517682064c99893cb832cc.png);
}
```

# js/B.css (Minimized)

``` css
.b{background:url(js/16155c689e517682064c99893cb832cc.png)}
```

# js/C.css

``` css
body {
	background: url(js/ce21cbdd9b894e6af794813eb3fdaf60.png);
}
.c {
	background: url(js/c2a2f62d69330b7d787782f5010f9d13.png);
}
```

# js/C.css (Minimized)

``` css
body{background:url(js/ce21cbdd9b894e6af794813eb3fdaf60.png)}.c{background:url(js/c2a2f62d69330b7d787782f5010f9d13.png)}
```

# Info

## Uncompressed

```
Hash: b6d05f310264e74bb969
Version: webpack 3.5.1
                               Asset       Size  Chunks             Chunk Names
                                C.js    2.89 kB       2  [emitted]  C
d090b6fba0f6d326d282a19146ff54a7.png  120 bytes          [emitted]  
ce21cbdd9b894e6af794813eb3fdaf60.png  119 bytes          [emitted]  
c2a2f62d69330b7d787782f5010f9d13.png  120 bytes          [emitted]  
                                B.js  561 bytes       0  [emitted]  B
                                A.js  543 bytes       1  [emitted]  A
16155c689e517682064c99893cb832cc.png  120 bytes          [emitted]  
                          commons.js    6.01 kB       3  [emitted]  commons
                               A.css   69 bytes       1  [emitted]  A
                               B.css   69 bytes       0  [emitted]  B
                               C.css  140 bytes       2  [emitted]  C
                         commons.css   71 bytes       3  [emitted]  commons
Entrypoint A = commons.js commons.css A.js A.css
Entrypoint B = commons.js commons.css B.js B.css
Entrypoint C = C.js C.css
chunk    {0} B.js, B.css (B) 92 bytes {3} [initial] [rendered]
    > B [3] ./b.js 
    [3] ./b.js 51 bytes {0} [built]
    [4] ./styleB.css 41 bytes {0} [built]
        cjs require ./styleB.css [3] ./b.js 2:0-23
chunk    {1} A.js, A.css (A) 92 bytes {3} [initial] [rendered]
    > A [1] ./a.js 
    [1] ./a.js 51 bytes {1} [built]
    [2] ./styleA.css 41 bytes {1} [built]
        cjs require ./styleA.css [1] ./a.js 2:0-23
chunk    {2} C.js, C.css (C) 67 bytes [entry] [rendered]
    > C [5] ./c.js 
    [5] ./c.js 26 bytes {2} [built]
    [6] ./styleC.css 41 bytes {2} [built]
        cjs require ./styleC.css [5] ./c.js 1:0-23
chunk    {3} commons.js, commons.css (commons) 41 bytes [entry] [rendered]
    [0] ./style.css 41 bytes {3} [built]
        cjs require ./style.css [1] ./a.js 1:0-22
        cjs require ./style.css [3] ./b.js 1:0-22
Child extract-text-webpack-plugin ../../node_modules/extract-text-webpack-plugin/dist ../../node_modules/css-loader/index.js!styleA.css:
     1 asset
    Entrypoint undefined = extract-text-webpack-plugin-output-filename
    chunk    {0} extract-text-webpack-plugin-output-filename 2.58 kB [entry] [rendered]
        > [0] (webpack)/node_modules/css-loader!./styleA.css 
        [0] (webpack)/node_modules/css-loader!./styleA.css 234 bytes {0} [built]
        [2] ./imageA.png 82 bytes {0} [built]
            cjs require ./imageA.png [0] (webpack)/node_modules/css-loader!./styleA.css 6:56-79
         + 1 hidden module
Child extract-text-webpack-plugin ../../node_modules/extract-text-webpack-plugin/dist ../../node_modules/css-loader/index.js!styleB.css:
     1 asset
    Entrypoint undefined = extract-text-webpack-plugin-output-filename
    chunk    {0} extract-text-webpack-plugin-output-filename 2.58 kB [entry] [rendered]
        > [0] (webpack)/node_modules/css-loader!./styleB.css 
        [0] (webpack)/node_modules/css-loader!./styleB.css 234 bytes {0} [built]
        [2] ./imageB.png 82 bytes {0} [built]
            cjs require ./imageB.png [0] (webpack)/node_modules/css-loader!./styleB.css 6:56-79
         + 1 hidden module
Child extract-text-webpack-plugin ../../node_modules/extract-text-webpack-plugin/dist ../../node_modules/css-loader/index.js!style.css:
     1 asset
    Entrypoint undefined = extract-text-webpack-plugin-output-filename
    chunk    {0} extract-text-webpack-plugin-output-filename 2.58 kB [entry] [rendered]
        > [0] (webpack)/node_modules/css-loader!./style.css 
        [0] (webpack)/node_modules/css-loader!./style.css 235 bytes {0} [built]
        [2] ./image.png 82 bytes {0} [built]
            cjs require ./image.png [0] (webpack)/node_modules/css-loader!./style.css 6:58-80
         + 1 hidden module
Child extract-text-webpack-plugin ../../node_modules/extract-text-webpack-plugin/dist ../../node_modules/css-loader/index.js!styleC.css:
     2 assets
    Entrypoint undefined = extract-text-webpack-plugin-output-filename
    chunk    {0} extract-text-webpack-plugin-output-filename 2.97 kB [entry] [rendered]
        > [1] (webpack)/node_modules/css-loader!./styleC.css 
        [1] (webpack)/node_modules/css-loader!./styleC.css 313 bytes {0} [built]
        [2] (webpack)/node_modules/css-loader!./style.css 235 bytes {0} [built]
            cjs require -!../../node_modules/css-loader/index.js!./style.css [1] (webpack)/node_modules/css-loader!./styleC.css 3:10-73
        [3] ./image.png 82 bytes {0} [built]
            cjs require ./image.png [2] (webpack)/node_modules/css-loader!./style.css 6:58-80
        [4] ./imageC.png 82 bytes {0} [built]
            cjs require ./imageC.png [1] (webpack)/node_modules/css-loader!./styleC.css 6:56-79
         + 1 hidden module
```

## Minimized (uglify-js, no zip)

```
Hash: 71684330ef0116733460
Version: webpack 3.5.1
                               Asset       Size  Chunks             Chunk Names
                                C.js  508 bytes       2  [emitted]  C
d090b6fba0f6d326d282a19146ff54a7.png  120 bytes          [emitted]  
ce21cbdd9b894e6af794813eb3fdaf60.png  119 bytes          [emitted]  
c2a2f62d69330b7d787782f5010f9d13.png  120 bytes          [emitted]  
                                B.js   70 bytes       0  [emitted]  B
                                A.js   68 bytes       1  [emitted]  A
16155c689e517682064c99893cb832cc.png  120 bytes          [emitted]  
                          commons.js    1.38 kB       3  [emitted]  commons
                               A.css   59 bytes       1  [emitted]  A
                               B.css   59 bytes       0  [emitted]  B
                               C.css  120 bytes       2  [emitted]  C
                         commons.css   61 bytes       3  [emitted]  commons
Entrypoint A = commons.js commons.css A.js A.css
Entrypoint B = commons.js commons.css B.js B.css
Entrypoint C = C.js C.css
chunk    {0} B.js, B.css (B) 92 bytes {3} [initial] [rendered]
    > B [3] ./b.js 
    [3] ./b.js 51 bytes {0} [built]
    [4] ./styleB.css 41 bytes {0} [built]
        cjs require ./styleB.css [3] ./b.js 2:0-23
chunk    {1} A.js, A.css (A) 92 bytes {3} [initial] [rendered]
    > A [1] ./a.js 
    [1] ./a.js 51 bytes {1} [built]
    [2] ./styleA.css 41 bytes {1} [built]
        cjs require ./styleA.css [1] ./a.js 2:0-23
chunk    {2} C.js, C.css (C) 67 bytes [entry] [rendered]
    > C [5] ./c.js 
    [5] ./c.js 26 bytes {2} [built]
    [6] ./styleC.css 41 bytes {2} [built]
        cjs require ./styleC.css [5] ./c.js 1:0-23
chunk    {3} commons.js, commons.css (commons) 41 bytes [entry] [rendered]
    [0] ./style.css 41 bytes {3} [built]
        cjs require ./style.css [1] ./a.js 1:0-22
        cjs require ./style.css [3] ./b.js 1:0-22
Child extract-text-webpack-plugin ../../node_modules/extract-text-webpack-plugin/dist ../../node_modules/css-loader/index.js!styleA.css:
     1 asset
    Entrypoint undefined = extract-text-webpack-plugin-output-filename
    chunk    {0} extract-text-webpack-plugin-output-filename 2.56 kB [entry] [rendered]
        > [0] (webpack)/node_modules/css-loader!./styleA.css 
        [0] (webpack)/node_modules/css-loader!./styleA.css 217 bytes {0} [built]
        [2] ./imageA.png 82 bytes {0} [built]
            cjs require ./imageA.png [0] (webpack)/node_modules/css-loader!./styleA.css 6:48-71
         + 1 hidden module
Child extract-text-webpack-plugin ../../node_modules/extract-text-webpack-plugin/dist ../../node_modules/css-loader/index.js!styleB.css:
     1 asset
    Entrypoint undefined = extract-text-webpack-plugin-output-filename
    chunk    {0} extract-text-webpack-plugin-output-filename 2.56 kB [entry] [rendered]
        > [0] (webpack)/node_modules/css-loader!./styleB.css 
        [0] (webpack)/node_modules/css-loader!./styleB.css 217 bytes {0} [built]
        [2] ./imageB.png 82 bytes {0} [built]
            cjs require ./imageB.png [0] (webpack)/node_modules/css-loader!./styleB.css 6:48-71
         + 1 hidden module
Child extract-text-webpack-plugin ../../node_modules/extract-text-webpack-plugin/dist ../../node_modules/css-loader/index.js!style.css:
     1 asset
    Entrypoint undefined = extract-text-webpack-plugin-output-filename
    chunk    {0} extract-text-webpack-plugin-output-filename 2.56 kB [entry] [rendered]
        > [0] (webpack)/node_modules/css-loader!./style.css 
        [0] (webpack)/node_modules/css-loader!./style.css 218 bytes {0} [built]
        [2] ./image.png 82 bytes {0} [built]
            cjs require ./image.png [0] (webpack)/node_modules/css-loader!./style.css 6:50-72
         + 1 hidden module
Child extract-text-webpack-plugin ../../node_modules/extract-text-webpack-plugin/dist ../../node_modules/css-loader/index.js!styleC.css:
     2 assets
    Entrypoint undefined = extract-text-webpack-plugin-output-filename
    chunk    {0} extract-text-webpack-plugin-output-filename 2.94 kB [entry] [rendered]
        > [1] (webpack)/node_modules/css-loader!./styleC.css 
        [1] (webpack)/node_modules/css-loader!./styleC.css 296 bytes {0} [built]
        [2] (webpack)/node_modules/css-loader!./style.css 218 bytes {0} [built]
            cjs require -!../../node_modules/css-loader/index.js!./style.css [1] (webpack)/node_modules/css-loader!./styleC.css 3:10-73
        [3] ./image.png 82 bytes {0} [built]
            cjs require ./image.png [2] (webpack)/node_modules/css-loader!./style.css 6:50-72
        [4] ./imageC.png 82 bytes {0} [built]
            cjs require ./imageC.png [1] (webpack)/node_modules/css-loader!./styleC.css 6:48-71
         + 1 hidden module
```
