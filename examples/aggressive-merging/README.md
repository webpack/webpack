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
asset pageA.bundle.js 8.91 KiB [emitted] (name: pageA)
asset pageB.bundle.js 8.91 KiB [emitted] (name: pageB)
asset pageC.bundle.js 8.91 KiB [emitted] (name: pageC)
asset 456.chunk.js 6.28 KiB [emitted]
asset 394.chunk.js 606 bytes [emitted]
chunk (runtime: pageB) pageB.bundle.js (pageB) 69 bytes (javascript) 4.97 KiB (runtime) [entry] [rendered]
  > ./pageB pageB
  runtime modules 4.97 KiB 6 modules
  ./pageB.js 69 bytes [built] [code generated]
    [used exports unknown]
    entry ./pageB pageB
chunk (runtime: pageC) pageC.bundle.js (pageC) 68 bytes (javascript) 4.97 KiB (runtime) [entry] [rendered]
  > ./pageC pageC
  runtime modules 4.97 KiB 6 modules
  ./pageC.js 68 bytes [built] [code generated]
    [used exports unknown]
    entry ./pageC pageC
chunk (runtime: pageC) 394.chunk.js 42 bytes [rendered]
  > ./a ./pageC.js 1:0-3:2
  ./a.js 21 bytes [built] [code generated]
    [used exports unknown]
    cjs self exports reference ./a.js 1:0-14
    cjs require ./a ./pageA.js 2:8-22
    amd require ./a ./pageC.js 1:0-3:2
  ./b.js 21 bytes [built] [code generated]
    [used exports unknown]
    cjs self exports reference ./b.js 1:0-14
    cjs require ./b ./pageB.js 2:8-22
    cjs require ./b ./pageC.js 2:17-31
chunk (runtime: pageA) pageA.bundle.js (pageA) 69 bytes (javascript) 4.97 KiB (runtime) [entry] [rendered]
  > ./pageA pageA
  runtime modules 4.97 KiB 6 modules
  ./pageA.js 69 bytes [built] [code generated]
    [used exports unknown]
    entry ./pageA pageA
chunk (runtime: pageA, pageB) 456.chunk.js 5.45 KiB [rendered]
  > ./common ./pageA.js 1:0-3:2
  > ./common ./pageB.js 1:0-3:2
  ./a.js 21 bytes [built] [code generated]
    [used exports unknown]
    cjs self exports reference ./a.js 1:0-14
    cjs require ./a ./pageA.js 2:8-22
    amd require ./a ./pageC.js 1:0-3:2
  ./b.js 21 bytes [built] [code generated]
    [used exports unknown]
    cjs self exports reference ./b.js 1:0-14
    cjs require ./b ./pageB.js 2:8-22
    cjs require ./b ./pageC.js 2:17-31
  ./common.js 5.41 KiB [built] [code generated]
    [used exports unknown]
    cjs self exports reference ./common.js 1:0-14
    amd require ./common ./pageA.js 1:0-3:2
    amd require ./common ./pageB.js 1:0-3:2
webpack 5.11.1 compiled successfully
```

## Production mode

```
asset pageC.bundle.js 1.73 KiB [emitted] [minimized] (name: pageC)
asset pageA.bundle.js 1.72 KiB [emitted] [minimized] (name: pageA)
asset pageB.bundle.js 1.72 KiB [emitted] [minimized] (name: pageB)
asset 456.chunk.js 155 bytes [emitted] [minimized]
asset 394.chunk.js 104 bytes [emitted] [minimized]
chunk (runtime: pageB) pageB.bundle.js (pageB) 69 bytes (javascript) 4.97 KiB (runtime) [entry] [rendered]
  > ./pageB pageB
  runtime modules 4.97 KiB 6 modules
  ./pageB.js 69 bytes [built] [code generated]
    [no exports used]
    entry ./pageB pageB
chunk (runtime: pageC) pageC.bundle.js (pageC) 68 bytes (javascript) 4.97 KiB (runtime) [entry] [rendered]
  > ./pageC pageC
  runtime modules 4.97 KiB 6 modules
  ./pageC.js 68 bytes [built] [code generated]
    [no exports used]
    entry ./pageC pageC
chunk (runtime: pageC) 394.chunk.js 42 bytes [rendered]
  > ./a ./pageC.js 1:0-3:2
  ./a.js 21 bytes [built] [code generated]
    [used exports unknown]
    cjs self exports reference ./a.js 1:0-14
    cjs require ./a ./pageA.js 2:8-22
    amd require ./a ./pageC.js 1:0-3:2
  ./b.js 21 bytes [built] [code generated]
    [used exports unknown]
    cjs self exports reference ./b.js 1:0-14
    cjs require ./b ./pageB.js 2:8-22
    cjs require ./b ./pageC.js 2:17-31
chunk (runtime: pageA) pageA.bundle.js (pageA) 69 bytes (javascript) 4.97 KiB (runtime) [entry] [rendered]
  > ./pageA pageA
  runtime modules 4.97 KiB 6 modules
  ./pageA.js 69 bytes [built] [code generated]
    [no exports used]
    entry ./pageA pageA
chunk (runtime: pageA, pageB) 456.chunk.js 5.45 KiB [rendered]
  > ./common ./pageA.js 1:0-3:2
  > ./common ./pageB.js 1:0-3:2
  ./a.js 21 bytes [built] [code generated]
    [used exports unknown]
    cjs self exports reference ./a.js 1:0-14
    cjs require ./a ./pageA.js 2:8-22
    amd require ./a ./pageC.js 1:0-3:2
  ./b.js 21 bytes [built] [code generated]
    [used exports unknown]
    cjs self exports reference ./b.js 1:0-14
    cjs require ./b ./pageB.js 2:8-22
    cjs require ./b ./pageC.js 2:17-31
  ./common.js 5.41 KiB [built] [code generated]
    [used exports unknown]
    cjs self exports reference ./common.js 1:0-14
    amd require ./common ./pageA.js 1:0-3:2
    amd require ./common ./pageB.js 1:0-3:2
webpack 5.11.1 compiled successfully
```
