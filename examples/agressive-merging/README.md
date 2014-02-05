# pageA.js

``` javascript
require(["./common"], function(common) {
	common(require("./a"));
});
```

# pageB.js

``` javascript
require(["./common"], function(common) {
	common(require("./b"));
});
```

# pageC.js

``` javascript
require(["./common"], function(common) {
	common(require("./b"));
});
```

# common.js

a big file...

# webpack.config.js

``` javascript
var path = require("path");
var AggressiveMergingPlugin = require("../../lib/optimize/AggressiveMergingPlugin");
module.exports = {
	entry: {
		pageA: "./pageA",
		pageB: "./pageB",
		pageC: "./pageC"
	},
	output: {
		path: path.join(__dirname, "js"),
		filename: "[name].bundle.js",
		chunkFilename: "[id].chunk.js"
	},
	plugins: [
		new AggressiveMergingPlugin({
			minSizeReduce: 1.5,
			moveToParents: true
		})
	]
}
```

# Info

## Uncompressed

```
Hash: 07a5b689b878ca0906e9
Version: webpack 1.0.0-rc1
Time: 88ms
          Asset  Size  Chunks             Chunk Names
pageB.bundle.js  3963       0  [emitted]  pageB      
pageA.bundle.js  3932       0  [emitted]  pageA      
pageC.bundle.js  3787       0  [emitted]  pageC      
     1.chunk.js  5725       1  [emitted]             
     2.chunk.js   317       2  [emitted]             
chunk    {0} pageB.bundle.js (pageB) 92 [rendered]
    > pageB [0] ./pageB.js
    [0] ./pageB.js 71 {0} [built]
    [2] ./b.js 21 {0} {2} [built]
        cjs require ./b [0] ./pageB.js 2:8-22
        cjs require ./b [0] ./pageC.js 2:17-31
chunk    {0} pageA.bundle.js (pageA) 92 [rendered]
    > pageA [0] ./pageA.js
    [0] ./pageA.js 71 {0} [built]
    [1] ./a.js 21 {0} {2} [built]
        cjs require ./a [0] ./pageA.js 2:8-22
        amd require ./a [0] ./pageC.js 1:0-3:2
chunk    {0} pageC.bundle.js (pageC) 70 [rendered]
    > pageC [0] ./pageC.js
    [0] ./pageC.js 70 {0} [built]
chunk    {1} 1.chunk.js 5553 {0} {0} [rendered]
    > [0] ./pageA.js 1:0-3:2
    > aggressive-merge [0] ./pageB.js 1:0-3:2
    [3] ./common.js 5553 {1} [built]
        amd require ./common [0] ./pageA.js 1:0-3:2
        amd require ./common [0] ./pageB.js 1:0-3:2
chunk    {2} 2.chunk.js 42 {0} [rendered]
    > [0] ./pageC.js 1:0-3:2
    [1] ./a.js 21 {0} {2} [built]
        cjs require ./a [0] ./pageA.js 2:8-22
        amd require ./a [0] ./pageC.js 1:0-3:2
    [2] ./b.js 21 {0} {2} [built]
        cjs require ./b [0] ./pageB.js 2:8-22
        cjs require ./b [0] ./pageC.js 2:17-31
```

## Minimized (uglify-js, no zip)

```
Hash: 384afad3b82b7d3b3f0d
Version: webpack 1.0.0-rc1
Time: 259ms
          Asset  Size  Chunks             Chunk Names
pageB.bundle.js   764       0  [emitted]  pageB      
pageA.bundle.js   763       0  [emitted]  pageA      
pageC.bundle.js   748       0  [emitted]  pageC      
     1.chunk.js    73       1  [emitted]             
     2.chunk.js    75       2  [emitted]             
chunk    {0} pageB.bundle.js (pageB) 92 [rendered]
    > pageB [0] ./pageB.js
    [0] ./pageB.js 71 {0} [built]
    [2] ./b.js 21 {0} {2} [built]
        cjs require ./b [0] ./pageB.js 2:8-22
        cjs require ./b [0] ./pageC.js 2:17-31
chunk    {0} pageA.bundle.js (pageA) 92 [rendered]
    > pageA [0] ./pageA.js
    [0] ./pageA.js 71 {0} [built]
    [1] ./a.js 21 {0} {2} [built]
        cjs require ./a [0] ./pageA.js 2:8-22
        amd require ./a [0] ./pageC.js 1:0-3:2
chunk    {0} pageC.bundle.js (pageC) 70 [rendered]
    > pageC [0] ./pageC.js
    [0] ./pageC.js 70 {0} [built]
chunk    {1} 1.chunk.js 5553 {0} {0} [rendered]
    > [0] ./pageA.js 1:0-3:2
    > aggressive-merge [0] ./pageB.js 1:0-3:2
    [3] ./common.js 5553 {1} [built]
        amd require ./common [0] ./pageA.js 1:0-3:2
        amd require ./common [0] ./pageB.js 1:0-3:2
chunk    {2} 2.chunk.js 42 {0} [rendered]
    > [0] ./pageC.js 1:0-3:2
    [1] ./a.js 21 {0} {2} [built]
        cjs require ./a [0] ./pageA.js 2:8-22
        amd require ./a [0] ./pageC.js 1:0-3:2
    [2] ./b.js 21 {0} {2} [built]
        cjs require ./b [0] ./pageB.js 2:8-22
        cjs require ./b [0] ./pageC.js 2:17-31

WARNING in 1.chunk.js from UglifyJs
Dropping unused variable justToBeABigFile [./common.js:4,0]
```
