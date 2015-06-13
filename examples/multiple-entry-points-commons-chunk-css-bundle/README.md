
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
		new CommonsChunkPlugin("commons", "commons.js", ["A", "B"]),
		new ExtractTextPlugin("[name].css"),
	]
};
```

# js/A.js

``` javascript
webpackJsonp([0],{

/***/ 0:
/*!**************!*\
  !*** ./a.js ***!
  \**************/
/***/ function(module, exports, __webpack_require__) {

	__webpack_require__(/*! ./style.css */ 1);
	__webpack_require__(/*! ./styleA.css */ 6);


/***/ },

/***/ 6:
/*!********************!*\
  !*** ./styleA.css ***!
  \********************/
/***/ function(module, exports) {

	// removed by extract-text-webpack-plugin

/***/ }

});
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
Hash: e472dd55323cb31ba6bd
Version: webpack 1.9.10
Time: 467ms
                               Asset       Size  Chunks             Chunk Names
                                C.js     1.7 kB       2  [emitted]  C
d090b6fba0f6d326d282a19146ff54a7.png  120 bytes          [emitted]  
ce21cbdd9b894e6af794813eb3fdaf60.png  119 bytes          [emitted]  
c2a2f62d69330b7d787782f5010f9d13.png  120 bytes          [emitted]  
                                A.js  424 bytes       0  [emitted]  A
                                B.js  424 bytes       1  [emitted]  B
16155c689e517682064c99893cb832cc.png  120 bytes          [emitted]  
                          commons.js    3.74 kB       3  [emitted]  commons
                               A.css   69 bytes       0  [emitted]  A
                               B.css   69 bytes       1  [emitted]  B
                               C.css  142 bytes       2  [emitted]  C
                         commons.css   71 bytes       3  [emitted]  commons
chunk    {0} A.js, A.css (A) 92 bytes {3} [rendered]
    > A [0] ./a.js 
    [0] ./a.js 51 bytes {0} [built]
    [6] ./styleA.css 41 bytes {0} [built]
        cjs require ./styleA.css [0] ./a.js 2:0-23
chunk    {1} B.js, B.css (B) 92 bytes {3} [rendered]
    > B [0] ./b.js 
    [0] ./b.js 51 bytes {1} [built]
    [9] ./styleB.css 41 bytes {1} [built]
        cjs require ./styleB.css [0] ./b.js 2:0-23
chunk    {2} C.js, C.css (C) 67 bytes [rendered]
    > C [0] ./c.js 
    [0] ./c.js 26 bytes {2} [built]
   [12] ./styleC.css 41 bytes {2} [built]
        cjs require ./styleC.css [0] ./c.js 1:0-23
chunk    {3} commons.js, commons.css (commons) 41 bytes [rendered]
    [1] ./style.css 41 bytes {3} [built]
        cjs require ./style.css [0] ./b.js 1:0-22
        cjs require ./style.css [0] ./a.js 1:0-22
Child extract-text-webpack-plugin:
    chunk    {0} extract-text-webpack-plugin-output-filename 1.77 kB [rendered]
        > [0] (webpack)/~/css-loader!./styleA.css 
        [0] (webpack)/~/css-loader!./styleA.css 187 bytes {0} [built]
        [1] (webpack)/~/css-loader/lib/css-base.js 1.51 kB {0} [built]
            cjs require ./../../node_modules/css-loader/lib/css-base.js [0] (webpack)/~/css-loader!./styleA.css 1:27-85
        [2] ./imageA.png 81 bytes {0} [built]
            cjs require ./imageA.png [0] (webpack)/~/css-loader!./styleA.css 2:54-77
Child extract-text-webpack-plugin:
    chunk    {0} extract-text-webpack-plugin-output-filename 1.77 kB [rendered]
        > [0] (webpack)/~/css-loader!./styleB.css 
        [0] (webpack)/~/css-loader!./styleB.css 187 bytes {0} [built]
        [1] (webpack)/~/css-loader/lib/css-base.js 1.51 kB {0} [built]
            cjs require ./../../node_modules/css-loader/lib/css-base.js [0] (webpack)/~/css-loader!./styleB.css 1:27-85
        [2] ./imageB.png 81 bytes {0} [built]
            cjs require ./imageB.png [0] (webpack)/~/css-loader!./styleB.css 2:54-77
Child extract-text-webpack-plugin:
    chunk    {0} extract-text-webpack-plugin-output-filename 2.13 kB [rendered]
        > [0] (webpack)/~/css-loader!./styleC.css 
        [0] (webpack)/~/css-loader!./styleC.css 273 bytes {0} [built]
        [1] (webpack)/~/css-loader/lib/css-base.js 1.51 kB {0} [built]
            cjs require ./../../node_modules/css-loader/lib/css-base.js [0] (webpack)/~/css-loader!./styleC.css 1:27-85
            cjs require ./../../node_modules/css-loader/lib/css-base.js [2] (webpack)/~/css-loader!./style.css 1:27-85
        [2] (webpack)/~/css-loader!./style.css 188 bytes {0} [built]
            cjs require -!./../../node_modules/css-loader/index.js!./style.css [0] (webpack)/~/css-loader!./styleC.css 2:10-75
        [3] ./image.png 81 bytes {0} [built]
            cjs require ./image.png [2] (webpack)/~/css-loader!./style.css 2:56-78
        [4] ./imageC.png 81 bytes {0} [built]
            cjs require ./imageC.png [0] (webpack)/~/css-loader!./styleC.css 3:58-81
Child extract-text-webpack-plugin:
    chunk    {0} extract-text-webpack-plugin-output-filename 1.77 kB [rendered]
        > [0] (webpack)/~/css-loader!./style.css 
        [0] (webpack)/~/css-loader!./style.css 188 bytes {0} [built]
        [1] (webpack)/~/css-loader/lib/css-base.js 1.51 kB {0} [built]
            cjs require ./../../node_modules/css-loader/lib/css-base.js [0] (webpack)/~/css-loader!./style.css 1:27-85
        [2] ./image.png 81 bytes {0} [built]
            cjs require ./image.png [0] (webpack)/~/css-loader!./style.css 2:56-78
```

## Minimized (uglify-js, no zip)

```
Hash: 38d8b93152fcfe6923ba
Version: webpack 1.9.10
Time: 737ms
                               Asset       Size  Chunks             Chunk Names
                                B.js   65 bytes       2  [emitted]  B
d090b6fba0f6d326d282a19146ff54a7.png  120 bytes          [emitted]  
ce21cbdd9b894e6af794813eb3fdaf60.png  119 bytes          [emitted]  
c2a2f62d69330b7d787782f5010f9d13.png  120 bytes          [emitted]  
                                C.js  246 bytes       0  [emitted]  C
                          commons.js  755 bytes       1  [emitted]  commons
16155c689e517682064c99893cb832cc.png  120 bytes          [emitted]  
                                A.js   64 bytes       3  [emitted]  A
                               A.css   59 bytes       3  [emitted]  A
                               B.css   59 bytes       2  [emitted]  B
                               C.css  120 bytes       0  [emitted]  C
                         commons.css   61 bytes       1  [emitted]  commons
chunk    {0} C.js, C.css (C) 67 bytes [rendered]
    > C [0] ./c.js 
    [0] ./c.js 26 bytes {0} [built]
    [4] ./styleC.css 41 bytes {0} [built]
        cjs require ./styleC.css [0] ./c.js 1:0-23
chunk    {1} commons.js, commons.css (commons) 41 bytes [rendered]
    [1] ./style.css 41 bytes {1} [built]
        cjs require ./style.css [0] ./b.js 1:0-22
        cjs require ./style.css [0] ./a.js 1:0-22
chunk    {2} B.js, B.css (B) 92 bytes {1} [rendered]
    > B [0] ./b.js 
    [0] ./b.js 51 bytes {2} [built]
    [3] ./styleB.css 41 bytes {2} [built]
        cjs require ./styleB.css [0] ./b.js 2:0-23
chunk    {3} A.js, A.css (A) 92 bytes {1} [rendered]
    > A [0] ./a.js 
    [0] ./a.js 51 bytes {3} [built]
    [2] ./styleA.css 41 bytes {3} [built]
        cjs require ./styleA.css [0] ./a.js 2:0-23
Child extract-text-webpack-plugin:
    chunk    {0} extract-text-webpack-plugin-output-filename 1.76 kB [rendered]
        > [0] (webpack)/~/css-loader!./styleA.css 
        [0] (webpack)/~/css-loader!./styleA.css 170 bytes {0} [built]
        [1] (webpack)/~/css-loader/lib/css-base.js 1.51 kB {0} [built]
            cjs require ./../../node_modules/css-loader/lib/css-base.js [0] (webpack)/~/css-loader!./styleA.css 1:27-85
        [2] ./imageA.png 81 bytes {0} [built]
            cjs require ./imageA.png [0] (webpack)/~/css-loader!./styleA.css 2:46-69
Child extract-text-webpack-plugin:
    chunk    {0} extract-text-webpack-plugin-output-filename 1.76 kB [rendered]
        > [0] (webpack)/~/css-loader!./styleB.css 
        [0] (webpack)/~/css-loader!./styleB.css 170 bytes {0} [built]
        [1] (webpack)/~/css-loader/lib/css-base.js 1.51 kB {0} [built]
            cjs require ./../../node_modules/css-loader/lib/css-base.js [0] (webpack)/~/css-loader!./styleB.css 1:27-85
        [2] ./imageB.png 81 bytes {0} [built]
            cjs require ./imageB.png [0] (webpack)/~/css-loader!./styleB.css 2:46-69
Child extract-text-webpack-plugin:
    chunk    {0} extract-text-webpack-plugin-output-filename 2.09 kB [rendered]
        > [0] (webpack)/~/css-loader!./styleC.css 
        [0] (webpack)/~/css-loader!./styleC.css 252 bytes {0} [built]
        [1] (webpack)/~/css-loader/lib/css-base.js 1.51 kB {0} [built]
            cjs require ./../../node_modules/css-loader/lib/css-base.js [0] (webpack)/~/css-loader!./styleC.css 1:27-85
            cjs require ./../../node_modules/css-loader/lib/css-base.js [2] (webpack)/~/css-loader!./style.css 1:27-85
        [2] (webpack)/~/css-loader!./style.css 171 bytes {0} [built]
            cjs require -!./../../node_modules/css-loader/index.js!./style.css [0] (webpack)/~/css-loader!./styleC.css 2:10-75
        [3] ./image.png 81 bytes {0} [built]
            cjs require ./image.png [2] (webpack)/~/css-loader!./style.css 2:48-70
        [4] ./imageC.png 81 bytes {0} [built]
            cjs require ./imageC.png [0] (webpack)/~/css-loader!./styleC.css 3:46-69
Child extract-text-webpack-plugin:
    chunk    {0} extract-text-webpack-plugin-output-filename 1.76 kB [rendered]
        > [0] (webpack)/~/css-loader!./style.css 
        [0] (webpack)/~/css-loader!./style.css 171 bytes {0} [built]
        [1] (webpack)/~/css-loader/lib/css-base.js 1.51 kB {0} [built]
            cjs require ./../../node_modules/css-loader/lib/css-base.js [0] (webpack)/~/css-loader!./style.css 1:27-85
        [2] ./image.png 81 bytes {0} [built]
            cjs require ./image.png [0] (webpack)/~/css-loader!./style.css 2:48-70
```
