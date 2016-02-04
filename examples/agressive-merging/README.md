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
Hash: 042a9d90b141419e1b34
Version: webpack 2.0.6-beta
Time: 116ms
          Asset       Size  Chunks             Chunk Names
     0.chunk.js    5.72 kB       0  [emitted]  
pageB.bundle.js    4.72 kB       1  [emitted]  pageB
pageA.bundle.js    4.69 kB       2  [emitted]  pageA
     3.chunk.js  291 bytes       3  [emitted]  
pageC.bundle.js    4.54 kB       4  [emitted]  pageC
chunk    {0} 0.chunk.js 5.55 kB {2} {1} [rendered]
    > [3] ./pageA.js 1:0-3:2
    > aggressive-merge [4] ./pageB.js 1:0-3:2
    [2] ./common.js 5.55 kB {0} [built]
        amd require ./common [3] ./pageA.js 1:0-3:2
        amd require ./common [4] ./pageB.js 1:0-3:2
chunk    {1} pageB.bundle.js (pageB) 92 bytes [rendered]
    > pageB [4] ./pageB.js 
    [1] ./b.js 21 bytes {1} {3} [built]
        cjs require ./b [4] ./pageB.js 2:8-22
        cjs require ./b [5] ./pageC.js 2:17-31
    [4] ./pageB.js 71 bytes {1} [built]
chunk    {2} pageA.bundle.js (pageA) 92 bytes [rendered]
    > pageA [3] ./pageA.js 
    [0] ./a.js 21 bytes {2} {3} [built]
        cjs require ./a [3] ./pageA.js 2:8-22
        amd require ./a [5] ./pageC.js 1:0-3:2
    [3] ./pageA.js 71 bytes {2} [built]
chunk    {3} 3.chunk.js 42 bytes {4} [rendered]
    > [5] ./pageC.js 1:0-3:2
    [0] ./a.js 21 bytes {2} {3} [built]
        cjs require ./a [3] ./pageA.js 2:8-22
        amd require ./a [5] ./pageC.js 1:0-3:2
    [1] ./b.js 21 bytes {1} {3} [built]
        cjs require ./b [4] ./pageB.js 2:8-22
        cjs require ./b [5] ./pageC.js 2:17-31
chunk    {4} pageC.bundle.js (pageC) 70 bytes [rendered]
    > pageC [5] ./pageC.js 
    [5] ./pageC.js 70 bytes {4} [built]
```

## Minimized (uglify-js, no zip)

```
Hash: 042a9d90b141419e1b34
Version: webpack 2.0.6-beta
Time: 317ms
          Asset      Size  Chunks             Chunk Names
     0.chunk.js  75 bytes       0  [emitted]  
pageB.bundle.js    1.1 kB       1  [emitted]  pageB
pageA.bundle.js    1.1 kB       2  [emitted]  pageA
     3.chunk.js  78 bytes       3  [emitted]  
pageC.bundle.js   1.09 kB       4  [emitted]  pageC
chunk    {0} 0.chunk.js 5.55 kB {2} {1} [rendered]
    > [3] ./pageA.js 1:0-3:2
    > aggressive-merge [4] ./pageB.js 1:0-3:2
    [2] ./common.js 5.55 kB {0} [built]
        amd require ./common [3] ./pageA.js 1:0-3:2
        amd require ./common [4] ./pageB.js 1:0-3:2
chunk    {1} pageB.bundle.js (pageB) 92 bytes [rendered]
    > pageB [4] ./pageB.js 
    [1] ./b.js 21 bytes {1} {3} [built]
        cjs require ./b [4] ./pageB.js 2:8-22
        cjs require ./b [5] ./pageC.js 2:17-31
    [4] ./pageB.js 71 bytes {1} [built]
chunk    {2} pageA.bundle.js (pageA) 92 bytes [rendered]
    > pageA [3] ./pageA.js 
    [0] ./a.js 21 bytes {2} {3} [built]
        cjs require ./a [3] ./pageA.js 2:8-22
        amd require ./a [5] ./pageC.js 1:0-3:2
    [3] ./pageA.js 71 bytes {2} [built]
chunk    {3} 3.chunk.js 42 bytes {4} [rendered]
    > [5] ./pageC.js 1:0-3:2
    [0] ./a.js 21 bytes {2} {3} [built]
        cjs require ./a [3] ./pageA.js 2:8-22
        amd require ./a [5] ./pageC.js 1:0-3:2
    [1] ./b.js 21 bytes {1} {3} [built]
        cjs require ./b [4] ./pageB.js 2:8-22
        cjs require ./b [5] ./pageC.js 2:17-31
chunk    {4} pageC.bundle.js (pageC) 70 bytes [rendered]
    > pageC [5] ./pageC.js 
    [5] ./pageC.js 70 bytes {4} [built]

WARNING in 0.chunk.js from UglifyJs
Dropping unused variable justToBeABigFile [./common.js:4,0]
```
