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
require(["./a"], function(a) {
	console.log(a + require("./b"));
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
Hash: f0835194a2e3ae886763
Version: webpack 1.0.0-rc5
Time: 75ms
          Asset  Size  Chunks             Chunk Names
     0.chunk.js  5725       0  [emitted]             
pageB.bundle.js  3941       1  [emitted]  pageB      
pageA.bundle.js  3954       2  [emitted]  pageA      
     3.chunk.js   317       3  [emitted]             
pageC.bundle.js  3787       4  [emitted]  pageC      
chunk    {0} 0.chunk.js 5553 {1} {2} [rendered]
    > [0] ./pageB.js 1:0-3:2
    > aggressive-merge [0] ./pageA.js 1:0-3:2
    [3] ./common.js 5553 {0} [built]
        amd require ./common [0] ./pageA.js 1:0-3:2
        amd require ./common [0] ./pageB.js 1:0-3:2
chunk    {1} pageB.bundle.js (pageB) 92 [rendered]
    > pageB [0] ./pageB.js
    [0] ./pageB.js 71 {1} [built]
    [2] ./b.js 21 {1} {3} [built]
        cjs require ./b [0] ./pageC.js 2:17-31
        cjs require ./b [0] ./pageB.js 2:8-22
chunk    {2} pageA.bundle.js (pageA) 92 [rendered]
    > pageA [0] ./pageA.js
    [0] ./pageA.js 71 {2} [built]
    [1] ./a.js 21 {2} {3} [built]
        cjs require ./a [0] ./pageA.js 2:8-22
        amd require ./a [0] ./pageC.js 1:0-3:2
chunk    {3} 3.chunk.js 42 {4} [rendered]
    > [0] ./pageC.js 1:0-3:2
    [1] ./a.js 21 {2} {3} [built]
        cjs require ./a [0] ./pageA.js 2:8-22
        amd require ./a [0] ./pageC.js 1:0-3:2
    [2] ./b.js 21 {1} {3} [built]
        cjs require ./b [0] ./pageC.js 2:17-31
        cjs require ./b [0] ./pageB.js 2:8-22
chunk    {4} pageC.bundle.js (pageC) 70 [rendered]
    > pageC [0] ./pageC.js
    [0] ./pageC.js 70 {4} [built]
```

## Minimized (uglify-js, no zip)

```
Hash: a86f91e236069373c65a
Version: webpack 1.0.0-rc5
Time: 298ms
          Asset  Size  Chunks             Chunk Names
     0.chunk.js    73       0  [emitted]             
pageB.bundle.js   764       1  [emitted]  pageB      
pageA.bundle.js   763       2  [emitted]  pageA      
     3.chunk.js    75       3  [emitted]             
pageC.bundle.js   748       4  [emitted]  pageC      
chunk    {0} 0.chunk.js 5553 {2} {1} [rendered]
    > [0] ./pageA.js 1:0-3:2
    > aggressive-merge [0] ./pageB.js 1:0-3:2
    [3] ./common.js 5553 {0} [built]
        amd require ./common [0] ./pageA.js 1:0-3:2
        amd require ./common [0] ./pageB.js 1:0-3:2
chunk    {1} pageB.bundle.js (pageB) 92 [rendered]
    > pageB [0] ./pageB.js
    [0] ./pageB.js 71 {1} [built]
    [2] ./b.js 21 {1} {3} [built]
        cjs require ./b [0] ./pageB.js 2:8-22
        cjs require ./b [0] ./pageC.js 2:17-31
chunk    {2} pageA.bundle.js (pageA) 92 [rendered]
    > pageA [0] ./pageA.js
    [0] ./pageA.js 71 {2} [built]
    [1] ./a.js 21 {2} {3} [built]
        cjs require ./a [0] ./pageA.js 2:8-22
        amd require ./a [0] ./pageC.js 1:0-3:2
chunk    {3} 3.chunk.js 42 {4} [rendered]
    > [0] ./pageC.js 1:0-3:2
    [1] ./a.js 21 {2} {3} [built]
        cjs require ./a [0] ./pageA.js 2:8-22
        amd require ./a [0] ./pageC.js 1:0-3:2
    [2] ./b.js 21 {1} {3} [built]
        cjs require ./b [0] ./pageB.js 2:8-22
        cjs require ./b [0] ./pageC.js 2:17-31
chunk    {4} pageC.bundle.js (pageC) 70 [rendered]
    > pageC [0] ./pageC.js
    [0] ./pageC.js 70 {4} [built]

WARNING in 0.chunk.js from UglifyJs
Dropping unused variable justToBeABigFile [./common.js:4,0]
```
