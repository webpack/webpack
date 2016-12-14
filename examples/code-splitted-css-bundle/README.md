
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
				loader: ExtractTextPlugin.extract({
					notExtractLoader: "style-loader",
					loader: "css-loader"
				})
			},
			{ test: /\.png$/, loader: "file-loader" }
		]
	},
	plugins: [
		new ExtractTextPlugin({
			filename: "style.css"
		})
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
Hash: 69987b2d59e4b1a136b3
Version: webpack 2.2.0-rc.2
                               Asset       Size  Chunks             Chunk Names
ce21cbdd9b894e6af794813eb3fdaf60.png  119 bytes          [emitted]  
                         0.output.js    1.04 kB       0  [emitted]  
                           output.js    7.84 kB       1  [emitted]  main
                           style.css   71 bytes       1  [emitted]  main
Entrypoint main = output.js style.css
chunk    {0} 0.output.js 337 bytes {1} [rendered]
    > [2] ./example.js 2:0-20
    [1] ./chunk.js 26 bytes {0} [built]
        amd require ./chunk [2] ./example.js 2:0-20
    [4] ./style2.css 229 bytes {0} [built]
        cjs require ./style2.css [1] ./chunk.js 1:0-23
    [5] ./image2.png 82 bytes {0} [built]
        cjs require ./image2.png [4] ./style2.css 6:58-81
chunk    {1} output.js, style.css (main) 1.59 kB [entry] [rendered]
    > main [2] ./example.js 
    [0] ./style.css 41 bytes {1} [built]
        cjs require ./style.css [2] ./example.js 1:0-22
    [2] ./example.js 48 bytes {1} [built]
    [3] (webpack)/~/css-loader/lib/css-base.js 1.51 kB {1} [built]
        cjs require ./../../node_modules/css-loader/lib/css-base.js [4] ./style2.css 1:27-85
Child extract-text-webpack-plugin:
    Entrypoint undefined = extract-text-webpack-plugin-output-filename
    chunk    {0} extract-text-webpack-plugin-output-filename 1.82 kB [entry] [rendered]
        > [2] (webpack)/~/css-loader!./style.css 
        [0] (webpack)/~/css-loader/lib/css-base.js 1.51 kB {0} [built]
            cjs require ./../../node_modules/css-loader/lib/css-base.js [2] (webpack)/~/css-loader!./style.css 1:27-85
        [1] ./image.png 82 bytes {0} [built]
            cjs require ./image.png [2] (webpack)/~/css-loader!./style.css 6:58-80
        [2] (webpack)/~/css-loader!./style.css 228 bytes {0} [built]
```

## Minimized (uglify-js, no zip)

```
Hash: 1f1b0ebfddb5b6f81a44
Version: webpack 2.2.0-rc.2
                               Asset       Size  Chunks             Chunk Names
ce21cbdd9b894e6af794813eb3fdaf60.png  119 bytes          [emitted]  
                         0.output.js  201 bytes       0  [emitted]  
                           output.js     1.9 kB       1  [emitted]  main
                           style.css   61 bytes       1  [emitted]  main
Entrypoint main = output.js style.css
chunk    {0} 0.output.js 320 bytes {1} [rendered]
    > [2] ./example.js 2:0-20
    [1] ./chunk.js 26 bytes {0} [built]
        amd require ./chunk [2] ./example.js 2:0-20
    [4] ./style2.css 212 bytes {0} [built]
        cjs require ./style2.css [1] ./chunk.js 1:0-23
    [5] ./image2.png 82 bytes {0} [built]
        cjs require ./image2.png [4] ./style2.css 6:50-73
chunk    {1} output.js, style.css (main) 1.59 kB [entry] [rendered]
    > main [2] ./example.js 
    [0] ./style.css 41 bytes {1} [built]
        cjs require ./style.css [2] ./example.js 1:0-22
    [2] ./example.js 48 bytes {1} [built]
    [3] (webpack)/~/css-loader/lib/css-base.js 1.51 kB {1} [built]
        cjs require ./../../node_modules/css-loader/lib/css-base.js [4] ./style2.css 1:27-85
Child extract-text-webpack-plugin:
    Entrypoint undefined = extract-text-webpack-plugin-output-filename
    chunk    {0} extract-text-webpack-plugin-output-filename 1.8 kB [entry] [rendered]
        > [2] (webpack)/~/css-loader!./style.css 
        [0] (webpack)/~/css-loader/lib/css-base.js 1.51 kB {0} [built]
            cjs require ./../../node_modules/css-loader/lib/css-base.js [2] (webpack)/~/css-loader!./style.css 1:27-85
        [1] ./image.png 82 bytes {0} [built]
            cjs require ./image.png [2] (webpack)/~/css-loader!./style.css 6:50-72
        [2] (webpack)/~/css-loader!./style.css 211 bytes {0} [built]
```
