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
Hash: f4216735227bfe40c743
Version: webpack 1.9.10
Time: 89ms
          Asset       Size  Chunks             Chunk Names
pageA.bundle.js    4.05 kB       0  [emitted]  pageA
     1.chunk.js    5.72 kB       1  [emitted]  
pageB.bundle.js    4.08 kB       2  [emitted]  pageB
pageC.bundle.js     3.9 kB       3  [emitted]  pageC
     4.chunk.js  309 bytes       4  [emitted]  
chunk    {0} pageA.bundle.js (pageA) 92 bytes [rendered]
    > pageA [0] ./pageA.js 
    [0] ./pageA.js 71 bytes {0} [built]
    [2] ./a.js 21 bytes {0} {4} [built]
        cjs require ./a [0] ./pageA.js 2:8-22
        amd require ./a [0] ./pageC.js 1:0-3:2
chunk    {1} 1.chunk.js 5.55 kB {0} {2} [rendered]
    > [0] ./pageA.js 1:0-3:2
    > aggressive-merge [0] ./pageB.js 1:0-3:2
    [1] ./common.js 5.55 kB {1} [built]
        amd require ./common [0] ./pageB.js 1:0-3:2
        amd require ./common [0] ./pageA.js 1:0-3:2
chunk    {2} pageB.bundle.js (pageB) 92 bytes [rendered]
    > pageB [0] ./pageB.js 
    [0] ./pageB.js 71 bytes {2} [built]
    [3] ./b.js 21 bytes {2} {4} [built]
        cjs require ./b [0] ./pageB.js 2:8-22
        cjs require ./b [0] ./pageC.js 2:17-31
chunk    {3} pageC.bundle.js (pageC) 70 bytes [rendered]
    > pageC [0] ./pageC.js 
    [0] ./pageC.js 70 bytes {3} [built]
chunk    {4} 4.chunk.js 42 bytes {3} [rendered]
    > [0] ./pageC.js 1:0-3:2
    [2] ./a.js 21 bytes {0} {4} [built]
        cjs require ./a [0] ./pageA.js 2:8-22
        amd require ./a [0] ./pageC.js 1:0-3:2
    [3] ./b.js 21 bytes {2} {4} [built]
        cjs require ./b [0] ./pageB.js 2:8-22
        cjs require ./b [0] ./pageC.js 2:17-31
```

## Minimized (uglify-js, no zip)

```
Hash: 94cc89f2c74586df40ca
Version: webpack 1.9.10
Time: 328ms
          Asset       Size  Chunks             Chunk Names
     0.chunk.js   75 bytes       0  [emitted]  
pageB.bundle.js  814 bytes       1  [emitted]  pageB
pageA.bundle.js  813 bytes       2  [emitted]  pageA
     3.chunk.js   79 bytes       3  [emitted]  
pageC.bundle.js  796 bytes       4  [emitted]  pageC
chunk    {0} 0.chunk.js 5.55 kB {2} {1} [rendered]
    > [0] ./pageA.js 1:0-3:2
    > aggressive-merge [0] ./pageB.js 1:0-3:2
    [3] ./common.js 5.55 kB {0} [built]
        amd require ./common [0] ./pageA.js 1:0-3:2
        amd require ./common [0] ./pageB.js 1:0-3:2
chunk    {1} pageB.bundle.js (pageB) 92 bytes [rendered]
    > pageB [0] ./pageB.js 
    [0] ./pageB.js 71 bytes {1} [built]
    [2] ./b.js 21 bytes {1} {3} [built]
        cjs require ./b [0] ./pageB.js 2:8-22
        cjs require ./b [0] ./pageC.js 2:17-31
chunk    {2} pageA.bundle.js (pageA) 92 bytes [rendered]
    > pageA [0] ./pageA.js 
    [0] ./pageA.js 71 bytes {2} [built]
    [1] ./a.js 21 bytes {2} {3} [built]
        cjs require ./a [0] ./pageA.js 2:8-22
        amd require ./a [0] ./pageC.js 1:0-3:2
chunk    {3} 3.chunk.js 42 bytes {4} [rendered]
    > [0] ./pageC.js 1:0-3:2
    [1] ./a.js 21 bytes {2} {3} [built]
        cjs require ./a [0] ./pageA.js 2:8-22
        amd require ./a [0] ./pageC.js 1:0-3:2
    [2] ./b.js 21 bytes {1} {3} [built]
        cjs require ./b [0] ./pageB.js 2:8-22
        cjs require ./b [0] ./pageC.js 2:17-31
chunk    {4} pageC.bundle.js (pageC) 70 bytes [rendered]
    > pageC [0] ./pageC.js 
    [0] ./pageC.js 70 bytes {4} [built]

WARNING in 0.chunk.js from UglifyJs
Dropping unused variable justToBeABigFile [./common.js:4,0]
```
