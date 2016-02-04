
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
				loader: ExtractTextPlugin.extract("style-loader", "css-loader")
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
		new ExtractTextPlugin("[name].css"),
	]
};
```

# js/A.js

``` javascript
webpackJsonp([3],[
/* 0 */,
/* 1 */
/*!********************!*\
  !*** ./styleA.css ***!
  \********************/
/***/ function(module, exports) {

	// removed by extract-text-webpack-plugin

/***/ },
/* 2 */,
/* 3 */,
/* 4 */
/*!**************!*\
  !*** ./a.js ***!
  \**************/
/***/ function(module, exports, __webpack_require__) {

	__webpack_require__(/*! ./style.css */ 0);
	__webpack_require__(/*! ./styleA.css */ 1);


/***/ }
],[4]);
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
Hash: a27b5cbc25b7ed54ea02
Version: webpack 2.0.6-beta
Time: 801ms
                               Asset       Size  Chunks             Chunk Names
                                B.js  428 bytes       2  [emitted]  B
d090b6fba0f6d326d282a19146ff54a7.png  120 bytes          [emitted]  
ce21cbdd9b894e6af794813eb3fdaf60.png  119 bytes          [emitted]  
c2a2f62d69330b7d787782f5010f9d13.png  120 bytes          [emitted]  
                                C.js    1.72 kB       0  [emitted]  C
                          commons.js    4.27 kB       1  [emitted]  commons
16155c689e517682064c99893cb832cc.png  120 bytes          [emitted]  
                                A.js  450 bytes       3  [emitted]  A
                               A.css   69 bytes       3  [emitted]  A
                               B.css   69 bytes       2  [emitted]  B
                               C.css  140 bytes       0  [emitted]  C
                         commons.css   71 bytes       1  [emitted]  commons
chunk    {0} C.js, C.css (C) 67 bytes [rendered]
    > C [6] ./c.js 
    [3] ./styleC.css 41 bytes {0} [built]
        cjs require ./styleC.css [6] ./c.js 1:0-23
    [6] ./c.js 26 bytes {0} [built]
chunk    {1} commons.js, commons.css (commons) 41 bytes [rendered]
    [0] ./style.css 41 bytes {1} [built]
        cjs require ./style.css [4] ./a.js 1:0-22
        cjs require ./style.css [5] ./b.js 1:0-22
chunk    {2} B.js, B.css (B) 92 bytes {1} [rendered]
    > B [5] ./b.js 
    [2] ./styleB.css 41 bytes {2} [built]
        cjs require ./styleB.css [5] ./b.js 2:0-23
    [5] ./b.js 51 bytes {2} [built]
chunk    {3} A.js, A.css (A) 92 bytes {1} [rendered]
    > A [4] ./a.js 
    [1] ./styleA.css 41 bytes {3} [built]
        cjs require ./styleA.css [4] ./a.js 2:0-23
    [4] ./a.js 51 bytes {3} [built]
Child extract-text-webpack-plugin:
    chunk    {0} extract-text-webpack-plugin-output-filename 1.81 kB [rendered]
        > [2] (webpack)/~/css-loader!./styleA.css 
        [0] (webpack)/~/css-loader/lib/css-base.js 1.51 kB {0} [built]
            cjs require ./../../node_modules/css-loader/lib/css-base.js [2] (webpack)/~/css-loader!./styleA.css 1:27-85
        [1] ./imageA.png 82 bytes {0} [built]
            cjs require ./imageA.png [2] (webpack)/~/css-loader!./styleA.css 6:56-79
        [2] (webpack)/~/css-loader!./styleA.css 227 bytes {0} [built]
Child extract-text-webpack-plugin:
    chunk    {0} extract-text-webpack-plugin-output-filename 1.81 kB [rendered]
        > [2] (webpack)/~/css-loader!./styleB.css 
        [0] (webpack)/~/css-loader/lib/css-base.js 1.51 kB {0} [built]
            cjs require ./../../node_modules/css-loader/lib/css-base.js [2] (webpack)/~/css-loader!./styleB.css 1:27-85
        [1] ./imageB.png 82 bytes {0} [built]
            cjs require ./imageB.png [2] (webpack)/~/css-loader!./styleB.css 6:56-79
        [2] (webpack)/~/css-loader!./styleB.css 227 bytes {0} [built]
Child extract-text-webpack-plugin:
    chunk    {0} extract-text-webpack-plugin-output-filename 1.82 kB [rendered]
        > [2] (webpack)/~/css-loader!./style.css 
        [0] (webpack)/~/css-loader/lib/css-base.js 1.51 kB {0} [built]
            cjs require ./../../node_modules/css-loader/lib/css-base.js [2] (webpack)/~/css-loader!./style.css 1:27-85
        [1] ./image.png 82 bytes {0} [built]
            cjs require ./image.png [2] (webpack)/~/css-loader!./style.css 6:58-80
        [2] (webpack)/~/css-loader!./style.css 228 bytes {0} [built]
Child extract-text-webpack-plugin:
    chunk    {0} extract-text-webpack-plugin-output-filename 2.21 kB [rendered]
        > [3] (webpack)/~/css-loader!./styleC.css 
        [0] (webpack)/~/css-loader/lib/css-base.js 1.51 kB {0} [built]
            cjs require ./../../node_modules/css-loader/lib/css-base.js [1] (webpack)/~/css-loader!./style.css 1:27-85
            cjs require ./../../node_modules/css-loader/lib/css-base.js [3] (webpack)/~/css-loader!./styleC.css 1:27-85
        [1] (webpack)/~/css-loader!./style.css 228 bytes {0} [built]
            cjs require -!./../../node_modules/css-loader/index.js!./style.css [3] (webpack)/~/css-loader!./styleC.css 3:10-75
        [2] ./imageC.png 82 bytes {0} [built]
            cjs require ./imageC.png [3] (webpack)/~/css-loader!./styleC.css 6:56-79
        [3] (webpack)/~/css-loader!./styleC.css 308 bytes {0} [built]
        [4] ./image.png 82 bytes {0} [built]
            cjs require ./image.png [1] (webpack)/~/css-loader!./style.css 6:58-80
```

## Minimized (uglify-js, no zip)

```
Hash: feee54d8663ea06f8e31
Version: webpack 2.0.6-beta
Time: 1071ms
                               Asset       Size  Chunks             Chunk Names
                                B.js   71 bytes       2  [emitted]  B
d090b6fba0f6d326d282a19146ff54a7.png  120 bytes          [emitted]  
ce21cbdd9b894e6af794813eb3fdaf60.png  119 bytes          [emitted]  
c2a2f62d69330b7d787782f5010f9d13.png  120 bytes          [emitted]  
                                C.js  251 bytes       0  [emitted]  C
                          commons.js  967 bytes       1  [emitted]  commons
16155c689e517682064c99893cb832cc.png  120 bytes          [emitted]  
                                A.js   70 bytes       3  [emitted]  A
                               A.css   59 bytes       3  [emitted]  A
                               B.css   59 bytes       2  [emitted]  B
                               C.css  120 bytes       0  [emitted]  C
                         commons.css   61 bytes       1  [emitted]  commons
chunk    {0} C.js, C.css (C) 67 bytes [rendered]
    > C [6] ./c.js 
    [3] ./styleC.css 41 bytes {0} [built]
        cjs require ./styleC.css [6] ./c.js 1:0-23
    [6] ./c.js 26 bytes {0} [built]
chunk    {1} commons.js, commons.css (commons) 41 bytes [rendered]
    [0] ./style.css 41 bytes {1} [built]
        cjs require ./style.css [4] ./a.js 1:0-22
        cjs require ./style.css [5] ./b.js 1:0-22
chunk    {2} B.js, B.css (B) 92 bytes {1} [rendered]
    > B [5] ./b.js 
    [2] ./styleB.css 41 bytes {2} [built]
        cjs require ./styleB.css [5] ./b.js 2:0-23
    [5] ./b.js 51 bytes {2} [built]
chunk    {3} A.js, A.css (A) 92 bytes {1} [rendered]
    > A [4] ./a.js 
    [1] ./styleA.css 41 bytes {3} [built]
        cjs require ./styleA.css [4] ./a.js 2:0-23
    [4] ./a.js 51 bytes {3} [built]
Child extract-text-webpack-plugin:
    chunk    {0} extract-text-webpack-plugin-output-filename 1.8 kB [rendered]
        > [2] (webpack)/~/css-loader!./styleA.css 
        [0] (webpack)/~/css-loader/lib/css-base.js 1.51 kB {0} [built]
            cjs require ./../../node_modules/css-loader/lib/css-base.js [2] (webpack)/~/css-loader!./styleA.css 1:27-85
        [1] ./imageA.png 82 bytes {0} [built]
            cjs require ./imageA.png [2] (webpack)/~/css-loader!./styleA.css 6:48-71
        [2] (webpack)/~/css-loader!./styleA.css 210 bytes {0} [built]
Child extract-text-webpack-plugin:
    chunk    {0} extract-text-webpack-plugin-output-filename 1.8 kB [rendered]
        > [2] (webpack)/~/css-loader!./styleB.css 
        [0] (webpack)/~/css-loader/lib/css-base.js 1.51 kB {0} [built]
            cjs require ./../../node_modules/css-loader/lib/css-base.js [2] (webpack)/~/css-loader!./styleB.css 1:27-85
        [1] ./imageB.png 82 bytes {0} [built]
            cjs require ./imageB.png [2] (webpack)/~/css-loader!./styleB.css 6:48-71
        [2] (webpack)/~/css-loader!./styleB.css 210 bytes {0} [built]
Child extract-text-webpack-plugin:
    chunk    {0} extract-text-webpack-plugin-output-filename 1.8 kB [rendered]
        > [2] (webpack)/~/css-loader!./style.css 
        [0] (webpack)/~/css-loader/lib/css-base.js 1.51 kB {0} [built]
            cjs require ./../../node_modules/css-loader/lib/css-base.js [2] (webpack)/~/css-loader!./style.css 1:27-85
        [1] ./image.png 82 bytes {0} [built]
            cjs require ./image.png [2] (webpack)/~/css-loader!./style.css 6:50-72
        [2] (webpack)/~/css-loader!./style.css 211 bytes {0} [built]
Child extract-text-webpack-plugin:
    chunk    {0} extract-text-webpack-plugin-output-filename 2.17 kB [rendered]
        > [3] (webpack)/~/css-loader!./styleC.css 
        [0] (webpack)/~/css-loader/lib/css-base.js 1.51 kB {0} [built]
            cjs require ./../../node_modules/css-loader/lib/css-base.js [1] (webpack)/~/css-loader!./style.css 1:27-85
            cjs require ./../../node_modules/css-loader/lib/css-base.js [3] (webpack)/~/css-loader!./styleC.css 1:27-85
        [1] (webpack)/~/css-loader!./style.css 211 bytes {0} [built]
            cjs require -!./../../node_modules/css-loader/index.js!./style.css [3] (webpack)/~/css-loader!./styleC.css 3:10-75
        [2] ./imageC.png 82 bytes {0} [built]
            cjs require ./imageC.png [3] (webpack)/~/css-loader!./styleC.css 6:48-71
        [3] (webpack)/~/css-loader!./styleC.css 291 bytes {0} [built]
        [4] ./image.png 82 bytes {0} [built]
            cjs require ./image.png [1] (webpack)/~/css-loader!./style.css 6:50-72
```
