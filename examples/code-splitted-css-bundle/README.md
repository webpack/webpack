
# example.js

``` javascript
require("./style.css");
require(["./chunk"]);
```

# style.css

``` css
body {
	background: url(image.png);
}
```

# chunk.js

``` javascript
require("./style2.css");
```

# style2.css

``` css
.xyz {
	background: url(image2.png);
}
```

# webpack.config.js

``` javascript
var ExtractTextPlugin = require("extract-text-webpack-plugin");
module.exports = {
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
		new ExtractTextPlugin("style.css")
	]
};
```

# js/style.css

``` javascript
body {
	background: url(js/ce21cbdd9b894e6af794813eb3fdaf60.png);
}
```

# Info

## Uncompressed

```
Hash: eef5d1aa6f7b7111aa13
Version: webpack 1.5.0
Time: 196ms
                               Asset   Size  Chunks             Chunk Names
ce21cbdd9b894e6af794813eb3fdaf60.png    119          [emitted]  
                         0.output.js   2163       0  [emitted]  
                           output.js  10626       1  [emitted]  main
                           style.css     71       1  [emitted]  main
chunk    {0} 0.output.js 1482 {1} [rendered]
    > [0] ./example.js 2:0-20
    [2] (webpack)/~/css-loader!./style2.css 205 {0} [built]
        cjs require !!(webpack)/~\css-loader\index.js!.\style2.css [4] ./style2.css 4:14-177
    [4] ./style2.css 1170 {0} [built]
        cjs require ./style2.css [5] ./chunk.js 1:0-23
    [5] ./chunk.js 26 {0} [built]
        amd require ./chunk [0] ./example.js 2:0-20
    [6] ./image2.png 81 {0} [built]
        cjs require ./image2.png [2] (webpack)/~/css-loader!./style2.css 2:56-79
chunk    {1} output.js, style.css (main) 5948 [rendered]
    > main [0] ./example.js 
    [0] ./example.js 48 {1} [built]
    [1] (webpack)/~/css-loader/cssToString.js 352 {1} [built]
        cjs require (webpack)/~\css-loader\cssToString.js [2] (webpack)/~/css-loader!./style2.css 1:27-101
        cjs require (webpack)/~\css-loader\cssToString.js [8] (webpack)/~/css-loader!./style.css 1:27-101
    [3] ./style.css 41 {1} [built]
        cjs require ./style.css [0] ./example.js 1:0-22
    [7] (webpack)/~/style-loader/addStyles.js 5507 {1} [built]
        cjs require !(webpack)\node_modules\style-loader\addStyles.js [4] ./style2.css 7:13-111
Child extract-text-webpack-plugin:
    chunk    {0} (webpack)/~\extract-text-webpack-plugin (webpack)/~\css-loader\index.js!.\style.css 637 [rendered]
        > [0] (webpack)/~/css-loader!./style.css 
        [0] (webpack)/~/css-loader!./style.css 204 {0} [built]
        [1] (webpack)/~/css-loader/cssToString.js 352 {0} [built]
            cjs require (webpack)/~\css-loader\cssToString.js [0] (webpack)/~/css-loader!./style.css 1:27-101
        [2] ./image.png 81 {0} [built]
            cjs require ./image.png [0] (webpack)/~/css-loader!./style.css 2:56-78
```

## Minimized (uglify-js, no zip)

```
Hash: 7fc8a453077654aaa032
Version: webpack 1.5.0
Time: 377ms
                               Asset  Size  Chunks             Chunk Names
ce21cbdd9b894e6af794813eb3fdaf60.png   119          [emitted]  
                         0.output.js   279       0  [emitted]  
                           output.js  3299       1  [emitted]  main
                           style.css    61       1  [emitted]  main
chunk    {0} 0.output.js 1465 {1} [rendered]
    > [0] ./example.js 2:0-20
    [2] (webpack)/~/css-loader!./style2.css 188 {0} [built]
        cjs require !!(webpack)/~\css-loader\index.js!.\style2.css [4] ./style2.css 4:14-177
    [4] ./style2.css 1170 {0} [built]
        cjs require ./style2.css [5] ./chunk.js 1:0-23
    [5] ./chunk.js 26 {0} [built]
        amd require ./chunk [0] ./example.js 2:0-20
    [6] ./image2.png 81 {0} [built]
        cjs require ./image2.png [2] (webpack)/~/css-loader!./style2.css 2:48-71
chunk    {1} output.js, style.css (main) 5948 [rendered]
    > main [0] ./example.js 
    [0] ./example.js 48 {1} [built]
    [1] (webpack)/~/css-loader/cssToString.js 352 {1} [built]
        cjs require (webpack)/~\css-loader\cssToString.js [2] (webpack)/~/css-loader!./style2.css 1:27-101
        cjs require (webpack)/~\css-loader\cssToString.js [8] (webpack)/~/css-loader!./style.css 1:27-101
    [3] ./style.css 41 {1} [built]
        cjs require ./style.css [0] ./example.js 1:0-22
    [7] (webpack)/~/style-loader/addStyles.js 5507 {1} [built]
        cjs require !(webpack)\node_modules\style-loader\addStyles.js [4] ./style2.css 7:13-111

WARNING in 0.output.js from UglifyJs
Condition always false [(webpack)/~/extract-text-webpack-plugin/loader.js?{"omit":1,"extract":true,"remove":true}!(webpack)/~/style-loader!(webpack)/~/css-loader!./style2.css:9,0]
Dropping unreachable code [(webpack)/~/extract-text-webpack-plugin/loader.js?{"omit":1,"extract":true,"remove":true}!(webpack)/~/style-loader!(webpack)/~/css-loader!./style2.css:11,0]
Side effects in initialization of unused variable update [(webpack)/~/extract-text-webpack-plugin/loader.js?{"omit":1,"extract":true,"remove":true}!(webpack)/~/style-loader!(webpack)/~/css-loader!./style2.css:7,0]

WARNING in output.js from UglifyJs
Condition always false [(webpack)/~/style-loader/addStyles.js:23,0]
Dropping unreachable code [(webpack)/~/style-loader/addStyles.js:24,0]
Child extract-text-webpack-plugin:
    chunk    {0} (webpack)/~\extract-text-webpack-plugin (webpack)/~\css-loader\index.js!.\style.css 620 [rendered]
        > [0] (webpack)/~/css-loader!./style.css 
        [0] (webpack)/~/css-loader!./style.css 187 {0} [built]
        [1] (webpack)/~/css-loader/cssToString.js 352 {0} [built]
            cjs require (webpack)/~\css-loader\cssToString.js [0] (webpack)/~/css-loader!./style.css 1:27-101
        [2] ./image.png 81 {0} [built]
            cjs require ./image.png [0] (webpack)/~/css-loader!./style.css 2:48-70
```
