
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
				loader: ExtractTextPlugin.extract({
					notExtractLoader: "style-loader",
					loader: "css-loader"
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
/* unknown exports provided */
/* all exports used */
/*!********************!*\
  !*** ./styleA.css ***!
  \********************/
/***/ function(module, exports) {

// removed by extract-text-webpack-plugin

/***/ },
/* 2 */,
/* 3 */,
/* 4 */
/* unknown exports provided */
/* all exports used */
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
Hash: b69f00fe012298ef7773
Version: webpack 2.2.0-rc.2
                               Asset       Size  Chunks             Chunk Names
                                C.js    2.92 kB       2  [emitted]  C
d090b6fba0f6d326d282a19146ff54a7.png  120 bytes          [emitted]  
ce21cbdd9b894e6af794813eb3fdaf60.png  119 bytes          [emitted]  
c2a2f62d69330b7d787782f5010f9d13.png  120 bytes          [emitted]  
                                B.js  533 bytes       0  [emitted]  B
                                A.js  555 bytes       1  [emitted]  A
16155c689e517682064c99893cb832cc.png  120 bytes          [emitted]  
                          commons.js    5.78 kB       3  [emitted]  commons
                               A.css   69 bytes       1  [emitted]  A
                               B.css   69 bytes       0  [emitted]  B
                               C.css  140 bytes       2  [emitted]  C
                         commons.css   71 bytes       3  [emitted]  commons
Entrypoint A = commons.js commons.css A.js A.css
Entrypoint B = commons.js commons.css B.js B.css
Entrypoint C = C.js C.css
chunk    {0} B.js, B.css (B) 92 bytes {3} [initial] [rendered]
    > B [5] ./b.js 
    [2] ./styleB.css 41 bytes {0} [built]
        cjs require ./styleB.css [5] ./b.js 2:0-23
    [5] ./b.js 51 bytes {0} [built]
chunk    {1} A.js, A.css (A) 92 bytes {3} [initial] [rendered]
    > A [4] ./a.js 
    [1] ./styleA.css 41 bytes {1} [built]
        cjs require ./styleA.css [4] ./a.js 2:0-23
    [4] ./a.js 51 bytes {1} [built]
chunk    {2} C.js, C.css (C) 67 bytes [entry] [rendered]
    > C [6] ./c.js 
    [3] ./styleC.css 41 bytes {2} [built]
        cjs require ./styleC.css [6] ./c.js 1:0-23
    [6] ./c.js 26 bytes {2} [built]
chunk    {3} commons.js, commons.css (commons) 41 bytes [entry] [rendered]
    [0] ./style.css 41 bytes {3} [built]
        cjs require ./style.css [4] ./a.js 1:0-22
        cjs require ./style.css [5] ./b.js 1:0-22
Child extract-text-webpack-plugin:
    Entrypoint undefined = extract-text-webpack-plugin-output-filename
    chunk    {0} extract-text-webpack-plugin-output-filename 1.81 kB [entry] [rendered]
        > [2] (webpack)/~/css-loader!./styleA.css 
        [0] (webpack)/~/css-loader/lib/css-base.js 1.51 kB {0} [built]
            cjs require ./../../node_modules/css-loader/lib/css-base.js [2] (webpack)/~/css-loader!./styleA.css 1:27-85
        [1] ./imageA.png 82 bytes {0} [built]
            cjs require ./imageA.png [2] (webpack)/~/css-loader!./styleA.css 6:56-79
        [2] (webpack)/~/css-loader!./styleA.css 227 bytes {0} [built]
Child extract-text-webpack-plugin:
    Entrypoint undefined = extract-text-webpack-plugin-output-filename
    chunk    {0} extract-text-webpack-plugin-output-filename 1.81 kB [entry] [rendered]
        > [2] (webpack)/~/css-loader!./styleB.css 
        [0] (webpack)/~/css-loader/lib/css-base.js 1.51 kB {0} [built]
            cjs require ./../../node_modules/css-loader/lib/css-base.js [2] (webpack)/~/css-loader!./styleB.css 1:27-85
        [1] ./imageB.png 82 bytes {0} [built]
            cjs require ./imageB.png [2] (webpack)/~/css-loader!./styleB.css 6:56-79
        [2] (webpack)/~/css-loader!./styleB.css 227 bytes {0} [built]
Child extract-text-webpack-plugin:
    Entrypoint undefined = extract-text-webpack-plugin-output-filename
    chunk    {0} extract-text-webpack-plugin-output-filename 1.82 kB [entry] [rendered]
        > [2] (webpack)/~/css-loader!./style.css 
        [0] (webpack)/~/css-loader/lib/css-base.js 1.51 kB {0} [built]
            cjs require ./../../node_modules/css-loader/lib/css-base.js [2] (webpack)/~/css-loader!./style.css 1:27-85
        [1] ./image.png 82 bytes {0} [built]
            cjs require ./image.png [2] (webpack)/~/css-loader!./style.css 6:58-80
        [2] (webpack)/~/css-loader!./style.css 228 bytes {0} [built]
Child extract-text-webpack-plugin:
    Entrypoint undefined = extract-text-webpack-plugin-output-filename
    chunk    {0} extract-text-webpack-plugin-output-filename 2.21 kB [entry] [rendered]
        > [4] (webpack)/~/css-loader!./styleC.css 
        [0] (webpack)/~/css-loader/lib/css-base.js 1.51 kB {0} [built]
            cjs require ./../../node_modules/css-loader/lib/css-base.js [1] (webpack)/~/css-loader!./style.css 1:27-85
            cjs require ./../../node_modules/css-loader/lib/css-base.js [4] (webpack)/~/css-loader!./styleC.css 1:27-85
        [1] (webpack)/~/css-loader!./style.css 228 bytes {0} [built]
            cjs require -!./../../node_modules/css-loader/index.js!./style.css [4] (webpack)/~/css-loader!./styleC.css 3:10-75
        [2] ./imageC.png 82 bytes {0} [built]
            cjs require ./imageC.png [4] (webpack)/~/css-loader!./styleC.css 6:56-79
        [3] ./image.png 82 bytes {0} [built]
            cjs require ./image.png [1] (webpack)/~/css-loader!./style.css 6:58-80
        [4] (webpack)/~/css-loader!./styleC.css 308 bytes {0} [built]
```

## Minimized (uglify-js, no zip)

```
Hash: b69f00fe012298ef7773
Version: webpack 2.2.0-rc.2
                               Asset       Size  Chunks             Chunk Names
                                C.js  541 bytes       2  [emitted]  C
d090b6fba0f6d326d282a19146ff54a7.png  120 bytes          [emitted]  
ce21cbdd9b894e6af794813eb3fdaf60.png  119 bytes          [emitted]  
c2a2f62d69330b7d787782f5010f9d13.png  120 bytes          [emitted]  
                                B.js   71 bytes       0  [emitted]  B
                                A.js   70 bytes       1  [emitted]  A
16155c689e517682064c99893cb832cc.png  120 bytes          [emitted]  
                          commons.js    1.39 kB       3  [emitted]  commons
                               A.css   59 bytes       1  [emitted]  A
                               B.css   59 bytes       0  [emitted]  B
                               C.css  120 bytes       2  [emitted]  C
                         commons.css   61 bytes       3  [emitted]  commons
Entrypoint A = commons.js commons.css A.js A.css
Entrypoint B = commons.js commons.css B.js B.css
Entrypoint C = C.js C.css
chunk    {0} B.js, B.css (B) 92 bytes {3} [initial] [rendered]
    > B [5] ./b.js 
    [2] ./styleB.css 41 bytes {0} [built]
        cjs require ./styleB.css [5] ./b.js 2:0-23
    [5] ./b.js 51 bytes {0} [built]
chunk    {1} A.js, A.css (A) 92 bytes {3} [initial] [rendered]
    > A [4] ./a.js 
    [1] ./styleA.css 41 bytes {1} [built]
        cjs require ./styleA.css [4] ./a.js 2:0-23
    [4] ./a.js 51 bytes {1} [built]
chunk    {2} C.js, C.css (C) 67 bytes [entry] [rendered]
    > C [6] ./c.js 
    [3] ./styleC.css 41 bytes {2} [built]
        cjs require ./styleC.css [6] ./c.js 1:0-23
    [6] ./c.js 26 bytes {2} [built]
chunk    {3} commons.js, commons.css (commons) 41 bytes [entry] [rendered]
    [0] ./style.css 41 bytes {3} [built]
        cjs require ./style.css [4] ./a.js 1:0-22
        cjs require ./style.css [5] ./b.js 1:0-22
Child extract-text-webpack-plugin:
    Entrypoint undefined = extract-text-webpack-plugin-output-filename
    chunk    {0} extract-text-webpack-plugin-output-filename 1.8 kB [entry] [rendered]
        > [2] (webpack)/~/css-loader!./styleA.css 
        [0] (webpack)/~/css-loader/lib/css-base.js 1.51 kB {0} [built]
            cjs require ./../../node_modules/css-loader/lib/css-base.js [2] (webpack)/~/css-loader!./styleA.css 1:27-85
        [1] ./imageA.png 82 bytes {0} [built]
            cjs require ./imageA.png [2] (webpack)/~/css-loader!./styleA.css 6:48-71
        [2] (webpack)/~/css-loader!./styleA.css 210 bytes {0} [built]
Child extract-text-webpack-plugin:
    Entrypoint undefined = extract-text-webpack-plugin-output-filename
    chunk    {0} extract-text-webpack-plugin-output-filename 1.8 kB [entry] [rendered]
        > [2] (webpack)/~/css-loader!./styleB.css 
        [0] (webpack)/~/css-loader/lib/css-base.js 1.51 kB {0} [built]
            cjs require ./../../node_modules/css-loader/lib/css-base.js [2] (webpack)/~/css-loader!./styleB.css 1:27-85
        [1] ./imageB.png 82 bytes {0} [built]
            cjs require ./imageB.png [2] (webpack)/~/css-loader!./styleB.css 6:48-71
        [2] (webpack)/~/css-loader!./styleB.css 210 bytes {0} [built]
Child extract-text-webpack-plugin:
    Entrypoint undefined = extract-text-webpack-plugin-output-filename
    chunk    {0} extract-text-webpack-plugin-output-filename 1.8 kB [entry] [rendered]
        > [2] (webpack)/~/css-loader!./style.css 
        [0] (webpack)/~/css-loader/lib/css-base.js 1.51 kB {0} [built]
            cjs require ./../../node_modules/css-loader/lib/css-base.js [2] (webpack)/~/css-loader!./style.css 1:27-85
        [1] ./image.png 82 bytes {0} [built]
            cjs require ./image.png [2] (webpack)/~/css-loader!./style.css 6:50-72
        [2] (webpack)/~/css-loader!./style.css 211 bytes {0} [built]
Child extract-text-webpack-plugin:
    Entrypoint undefined = extract-text-webpack-plugin-output-filename
    chunk    {0} extract-text-webpack-plugin-output-filename 2.17 kB [entry] [rendered]
        > [4] (webpack)/~/css-loader!./styleC.css 
        [0] (webpack)/~/css-loader/lib/css-base.js 1.51 kB {0} [built]
            cjs require ./../../node_modules/css-loader/lib/css-base.js [1] (webpack)/~/css-loader!./style.css 1:27-85
            cjs require ./../../node_modules/css-loader/lib/css-base.js [4] (webpack)/~/css-loader!./styleC.css 1:27-85
        [1] (webpack)/~/css-loader!./style.css 211 bytes {0} [built]
            cjs require -!./../../node_modules/css-loader/index.js!./style.css [4] (webpack)/~/css-loader!./styleC.css 3:10-75
        [2] ./imageC.png 82 bytes {0} [built]
            cjs require ./imageC.png [4] (webpack)/~/css-loader!./styleC.css 6:48-71
        [3] ./image.png 82 bytes {0} [built]
            cjs require ./image.png [1] (webpack)/~/css-loader!./style.css 6:50-72
        [4] (webpack)/~/css-loader!./styleC.css 291 bytes {0} [built]
```
