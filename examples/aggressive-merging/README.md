# pageA.js

```javascript
require(["./common"], function(common) {
	common(require("./a"));
});
```

# pageB.js

```javascript
require(["./common"], function(common) {
	common(require("./b"));
});
```

# pageC.js

```javascript
require(["./a"], function(a) {
	console.log(a + require("./b"));
});
```

# common.js

a big file...

# webpack.config.js

```javascript
var path = require("path");
var { AggressiveMergingPlugin } = require("../../").optimize;

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
Version: webpack 5.0.0-beta.6
          Asset       Size
   394.chunk.js  526 bytes  [emitted]
   456.chunk.js   6.16 KiB  [emitted]
pageA.bundle.js   7.94 KiB  [emitted]  [name: pageA]
pageB.bundle.js   7.94 KiB  [emitted]  [name: pageB]
pageC.bundle.js   7.94 KiB  [emitted]  [name: pageC]
Entrypoint pageA = pageA.bundle.js
Entrypoint pageB = pageB.bundle.js
Entrypoint pageC = pageC.bundle.js
chunk pageB.bundle.js (pageB) 69 bytes (javascript) 4.23 KiB (runtime) [entry] [rendered]
    > ./pageB pageB
 ./pageB.js 69 bytes [built]
     [used exports unknown]
     entry ./pageB pageB
     + 4 hidden chunk modules
chunk pageC.bundle.js (pageC) 68 bytes (javascript) 4.23 KiB (runtime) [entry] [rendered]
    > ./pageC pageC
 ./pageC.js 68 bytes [built]
     [used exports unknown]
     entry ./pageC pageC
     + 4 hidden chunk modules
chunk 394.chunk.js 42 bytes [rendered]
    > ./a ./pageC.js 1:0-3:2
 ./a.js 21 bytes [built]
     [used exports unknown]
     cjs require ./a ./pageA.js 2:8-22
     amd require ./a ./pageC.js 1:0-3:2
 ./b.js 21 bytes [built]
     [used exports unknown]
     cjs require ./b ./pageB.js 2:8-22
     cjs require ./b ./pageC.js 2:17-31
chunk pageA.bundle.js (pageA) 69 bytes (javascript) 4.23 KiB (runtime) [entry] [rendered]
    > ./pageA pageA
 ./pageA.js 69 bytes [built]
     [used exports unknown]
     entry ./pageA pageA
     + 4 hidden chunk modules
chunk 456.chunk.js 5.45 KiB [rendered]
    > ./common ./pageA.js 1:0-3:2
    > ./common ./pageB.js 1:0-3:2
 ./a.js 21 bytes [built]
     [used exports unknown]
     cjs require ./a ./pageA.js 2:8-22
     amd require ./a ./pageC.js 1:0-3:2
 ./b.js 21 bytes [built]
     [used exports unknown]
     cjs require ./b ./pageB.js 2:8-22
     cjs require ./b ./pageC.js 2:17-31
 ./common.js 5.41 KiB [built]
     [used exports unknown]
     amd require ./common ./pageA.js 1:0-3:2
     amd require ./common ./pageB.js 1:0-3:2
```

## Production mode

```
Hash: 0a1b2c3d4e5f6a7b8c9d
Version: webpack 5.0.0-beta.6
          Asset       Size
   394.chunk.js  108 bytes  [emitted]
   456.chunk.js  159 bytes  [emitted]
pageA.bundle.js   1.47 KiB  [emitted]  [name: pageA]
pageB.bundle.js   1.47 KiB  [emitted]  [name: pageB]
pageC.bundle.js   1.49 KiB  [emitted]  [name: pageC]
Entrypoint pageA = pageA.bundle.js
Entrypoint pageB = pageB.bundle.js
Entrypoint pageC = pageC.bundle.js
chunk pageB.bundle.js (pageB) 69 bytes (javascript) 4.23 KiB (runtime) [entry] [rendered]
    > ./pageB pageB
 ./pageB.js 69 bytes [built]
     [no exports used]
     entry ./pageB pageB
     + 4 hidden chunk modules
chunk pageC.bundle.js (pageC) 68 bytes (javascript) 4.23 KiB (runtime) [entry] [rendered]
    > ./pageC pageC
 ./pageC.js 68 bytes [built]
     [no exports used]
     entry ./pageC pageC
     + 4 hidden chunk modules
chunk 394.chunk.js 42 bytes [rendered]
    > ./a ./pageC.js 1:0-3:2
 ./a.js 21 bytes [built]
     cjs require ./a ./pageA.js 2:8-22
     amd require ./a ./pageC.js 1:0-3:2
 ./b.js 21 bytes [built]
     cjs require ./b ./pageB.js 2:8-22
     cjs require ./b ./pageC.js 2:17-31
chunk pageA.bundle.js (pageA) 69 bytes (javascript) 4.23 KiB (runtime) [entry] [rendered]
    > ./pageA pageA
 ./pageA.js 69 bytes [built]
     [no exports used]
     entry ./pageA pageA
     + 4 hidden chunk modules
chunk 456.chunk.js 5.45 KiB [rendered]
    > ./common ./pageA.js 1:0-3:2
    > ./common ./pageB.js 1:0-3:2
 ./a.js 21 bytes [built]
     cjs require ./a ./pageA.js 2:8-22
     amd require ./a ./pageC.js 1:0-3:2
 ./b.js 21 bytes [built]
     cjs require ./b ./pageB.js 2:8-22
     cjs require ./b ./pageC.js 2:17-31
 ./common.js 5.41 KiB [built]
     amd require ./common ./pageA.js 1:0-3:2
     amd require ./common ./pageB.js 1:0-3:2
```
