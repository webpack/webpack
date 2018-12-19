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
	// mode: "development" || "production",
	entry: {
		pageA: "./pageA",
		pageB: "./pageB",
		pageC: "./pageC"
	},
	output: {
		path: path.join(__dirname, "dist"),
		filename: "[name].bundle.js",
		chunkFilename: "[id].chunk.js"
	},
	plugins: [
		new AggressiveMergingPlugin({
			minSizeReduce: 1.5
		})
	],
	optimization: {
		chunkIds: "deterministic" // To keep filename consistent between different modes (for example building only)
	}
};
```

# Info

## Unoptimized

```
Hash: 0a1b2c3d4e5f6a7b8c9d
Version: webpack 5.0.0-next
          Asset       Size  Chunks             Chunk Names
   324.chunk.js  466 bytes   {324}  [emitted]
   864.chunk.js   6.07 KiB   {864}  [emitted]
pageA.bundle.js   7.22 KiB   {641}  [emitted]  pageA
pageB.bundle.js   7.23 KiB   {791}  [emitted]  pageB
pageC.bundle.js   7.22 KiB    {42}  [emitted]  pageC
Entrypoint pageA = pageA.bundle.js
Entrypoint pageB = pageB.bundle.js
Entrypoint pageC = pageC.bundle.js
chunk {42} pageC.bundle.js (pageC) 68 bytes (javascript) 3.55 KiB (runtime) >{324}< [entry] [rendered]
    > ./pageC pageC
 [2] ./pageC.js 68 bytes {42} [built]
     [used exports unknown]
     entry ./pageC pageC
     + 4 hidden chunk modules
chunk {324} 324.chunk.js 42 bytes <{42}> [rendered]
    > ./a [2] ./pageC.js 1:0-3:2
 [4] ./a.js 21 bytes {324} {864} [built]
     [used exports unknown]
     cjs require ./a [0] ./pageA.js 2:8-22
     amd require ./a [2] ./pageC.js 1:0-3:2
 [5] ./b.js 21 bytes {324} {864} [built]
     [used exports unknown]
     cjs require ./b [1] ./pageB.js 2:8-22
     cjs require ./b [2] ./pageC.js 2:17-31
chunk {641} pageA.bundle.js (pageA) 69 bytes (javascript) 3.55 KiB (runtime) >{864}< [entry] [rendered]
    > ./pageA pageA
 [0] ./pageA.js 69 bytes {641} [built]
     [used exports unknown]
     entry ./pageA pageA
     + 4 hidden chunk modules
chunk {791} pageB.bundle.js (pageB) 69 bytes (javascript) 3.55 KiB (runtime) >{864}< [entry] [rendered]
    > ./pageB pageB
 [1] ./pageB.js 69 bytes {791} [built]
     [used exports unknown]
     entry ./pageB pageB
     + 4 hidden chunk modules
chunk {864} 864.chunk.js 5.45 KiB <{641}> <{791}> [rendered]
    > ./common [0] ./pageA.js 1:0-3:2
    > ./common [1] ./pageB.js 1:0-3:2
 [3] ./common.js 5.41 KiB {864} [built]
     [used exports unknown]
     amd require ./common [0] ./pageA.js 1:0-3:2
     amd require ./common [1] ./pageB.js 1:0-3:2
 [4] ./a.js 21 bytes {324} {864} [built]
     [used exports unknown]
     cjs require ./a [0] ./pageA.js 2:8-22
     amd require ./a [2] ./pageC.js 1:0-3:2
 [5] ./b.js 21 bytes {324} {864} [built]
     [used exports unknown]
     cjs require ./b [1] ./pageB.js 2:8-22
     cjs require ./b [2] ./pageC.js 2:17-31
```

## Production mode

```
Hash: 0a1b2c3d4e5f6a7b8c9d
Version: webpack 5.0.0-next
          Asset       Size        Chunks             Chunk Names
   324.chunk.js  123 bytes         {324}  [emitted]
   864.chunk.js  182 bytes  {324}, {864}  [emitted]
pageA.bundle.js   1.42 KiB         {641}  [emitted]  pageA
pageB.bundle.js   1.42 KiB         {791}  [emitted]  pageB
pageC.bundle.js   1.43 KiB          {42}  [emitted]  pageC
Entrypoint pageA = pageA.bundle.js
Entrypoint pageB = pageB.bundle.js
Entrypoint pageC = pageC.bundle.js
chunk {42} pageC.bundle.js (pageC) 68 bytes (javascript) 3.55 KiB (runtime) >{324}< [entry] [rendered]
    > ./pageC pageC
 [912] ./pageC.js 68 bytes {42} [built]
       entry ./pageC pageC
     + 4 hidden chunk modules
chunk {324} 324.chunk.js 42 bytes <{42}> [rendered]
    > ./a [912] ./pageC.js 1:0-3:2
  [21] ./b.js 21 bytes {324} {864} [built]
       cjs require ./b [912] ./pageC.js 2:17-31
       cjs require ./b [954] ./pageB.js 2:8-22
 [162] ./a.js 21 bytes {324} {864} [built]
       amd require ./a [912] ./pageC.js 1:0-3:2
       cjs require ./a [953] ./pageA.js 2:8-22
chunk {641} pageA.bundle.js (pageA) 69 bytes (javascript) 3.55 KiB (runtime) >{864}< [entry] [rendered]
    > ./pageA pageA
 [953] ./pageA.js 69 bytes {641} [built]
       entry ./pageA pageA
     + 4 hidden chunk modules
chunk {791} pageB.bundle.js (pageB) 69 bytes (javascript) 3.55 KiB (runtime) >{864}< [entry] [rendered]
    > ./pageB pageB
 [954] ./pageB.js 69 bytes {791} [built]
       entry ./pageB pageB
     + 4 hidden chunk modules
chunk {864} 864.chunk.js 5.45 KiB <{641}> <{791}> [rendered]
    > ./common [953] ./pageA.js 1:0-3:2
    > ./common [954] ./pageB.js 1:0-3:2
  [21] ./b.js 21 bytes {324} {864} [built]
       cjs require ./b [912] ./pageC.js 2:17-31
       cjs require ./b [954] ./pageB.js 2:8-22
 [162] ./a.js 21 bytes {324} {864} [built]
       amd require ./a [912] ./pageC.js 1:0-3:2
       cjs require ./a [953] ./pageA.js 2:8-22
 [280] ./common.js 5.41 KiB {864} [built]
       amd require ./common [953] ./pageA.js 1:0-3:2
       amd require ./common [954] ./pageB.js 1:0-3:2
```
