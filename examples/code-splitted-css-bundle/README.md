
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
Hash: 13e867002fd5bc063445
Version: webpack 1.9.10
Time: 398ms
                               Asset       Size  Chunks             Chunk Names
ce21cbdd9b894e6af794813eb3fdaf60.png  119 bytes          [emitted]  
                           output.js    12.2 kB       0  [emitted]  main
                         1.output.js    2.03 kB       1  [emitted]  
                           style.css   71 bytes       0  [emitted]  main
chunk    {0} output.js, style.css (main) 7.69 kB [rendered]
    > main [0] ./example.js 
    [0] ./example.js 48 bytes {0} [built]
    [1] ./style.css 41 bytes {0} [built]
        cjs require ./style.css [0] ./example.js 1:0-22
    [3] (webpack)/~/css-loader/lib/css-base.js 1.51 kB {0} [built]
        cjs require ./../../node_modules/css-loader/lib/css-base.js [2] (webpack)/~/css-loader!./style.css 1:27-85
        cjs require ./../../node_modules/css-loader/lib/css-base.js [8] (webpack)/~/css-loader!./style2.css 1:27-85
    [5] (webpack)/~/style-loader/addStyles.js 6.09 kB {0} [built]
        cjs require !./../../node_modules/style-loader/addStyles.js [7] ./style2.css 7:13-71
chunk    {1} 1.output.js 1.22 kB {0} [rendered]
    > [0] ./example.js 2:0-20
    [6] ./chunk.js 26 bytes {1} [built]
        amd require ./chunk [0] ./example.js 2:0-20
    [7] ./style2.css 922 bytes {1} [built]
        cjs require ./style2.css [6] ./chunk.js 1:0-23
    [8] (webpack)/~/css-loader!./style2.css 189 bytes {1} [built]
        cjs require !!./../../node_modules/css-loader/index.js!./style2.css [7] ./style2.css 4:14-80
    [9] ./image2.png 81 bytes {1} [built]
        cjs require ./image2.png [8] (webpack)/~/css-loader!./style2.css 2:56-79
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
Hash: 3482165c2af27e982e7a
Version: webpack 1.9.10
Time: 773ms
                               Asset       Size  Chunks             Chunk Names
ce21cbdd9b894e6af794813eb3fdaf60.png  119 bytes          [emitted]  
                           output.js    3.92 kB       0  [emitted]  main
                         1.output.js  310 bytes       1  [emitted]  
                           style.css   61 bytes       0  [emitted]  main
chunk    {0} output.js, style.css (main) 7.69 kB [rendered]
    > main [0] ./example.js 
    [0] ./example.js 48 bytes {0} [built]
    [3] (webpack)/~/css-loader/lib/css-base.js 1.51 kB {0} [built]
        cjs require ./../../node_modules/css-loader/lib/css-base.js [2] (webpack)/~/css-loader!./style2.css 1:27-85
        cjs require ./../../node_modules/css-loader/lib/css-base.js [8] (webpack)/~/css-loader!./style.css 1:27-85
    [4] ./style.css 41 bytes {0} [built]
        cjs require ./style.css [0] ./example.js 1:0-22
    [7] (webpack)/~/style-loader/addStyles.js 6.09 kB {0} [built]
        cjs require !./../../node_modules/style-loader/addStyles.js [5] ./style2.css 7:13-71
chunk    {1} 1.output.js 1.2 kB {0} [rendered]
    > [0] ./example.js 2:0-20
    [1] ./chunk.js 26 bytes {1} [built]
        amd require ./chunk [0] ./example.js 2:0-20
    [2] (webpack)/~/css-loader!./style2.css 172 bytes {1} [built]
        cjs require !!./../../node_modules/css-loader/index.js!./style2.css [5] ./style2.css 4:14-80
    [5] ./style2.css 922 bytes {1} [built]
        cjs require ./style2.css [1] ./chunk.js 1:0-23
    [6] ./image2.png 81 bytes {1} [built]
        cjs require ./image2.png [2] (webpack)/~/css-loader!./style2.css 2:48-71

WARNING in output.js from UglifyJs
Side effects in initialization of unused variable sourceMap [(webpack)/~/style-loader/addStyles.js:185,0]
Side effects in initialization of unused variable media [(webpack)/~/style-loader/addStyles.js:203,0]
Condition always false [(webpack)/~/style-loader/addStyles.js:23,0]
Dropping unreachable code [(webpack)/~/style-loader/addStyles.js:24,0]

WARNING in 1.output.js from UglifyJs
Condition always false [(webpack)/~/extract-text-webpack-plugin/loader.js?{"omit":1,"extract":true,"remove":true}!(webpack)/~/style-loader!(webpack)/~/css-loader!./style2.css:10,0]
Dropping unreachable code [(webpack)/~/extract-text-webpack-plugin/loader.js?{"omit":1,"extract":true,"remove":true}!(webpack)/~/style-loader!(webpack)/~/css-loader!./style2.css:12,0]
Side effects in initialization of unused variable update [(webpack)/~/extract-text-webpack-plugin/loader.js?{"omit":1,"extract":true,"remove":true}!(webpack)/~/style-loader!(webpack)/~/css-loader!./style2.css:7,0]
Child extract-text-webpack-plugin:
    chunk    {0} extract-text-webpack-plugin-output-filename 1.76 kB [rendered]
        > [0] (webpack)/~/css-loader!./style.css 
        [0] (webpack)/~/css-loader!./style.css 171 bytes {0} [built]
        [1] (webpack)/~/css-loader/lib/css-base.js 1.51 kB {0} [built]
            cjs require ./../../node_modules/css-loader/lib/css-base.js [0] (webpack)/~/css-loader!./style.css 1:27-85
        [2] ./image.png 81 bytes {0} [built]
            cjs require ./image.png [0] (webpack)/~/css-loader!./style.css 2:48-70
```
