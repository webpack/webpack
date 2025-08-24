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
"use strict";

const path = require("path");
const { AggressiveMergingPlugin } = require("../..").optimize;

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
asset pageA.bundle.js 8.81 KiB [emitted] (name: pageA)
asset pageB.bundle.js 8.81 KiB [emitted] (name: pageB)
asset pageC.bundle.js 8.81 KiB [emitted] (name: pageC)
asset 531.chunk.js 6.28 KiB [emitted]
asset 78.chunk.js 605 bytes [emitted]
chunk (runtime: pageC) 78.chunk.js 42 bytes [rendered]
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
chunk (runtime: pageB) pageB.bundle.js (pageB) 69 bytes (javascript) 4.91 KiB (runtime) [entry] [rendered]
  > ./pageB pageB
  runtime modules 4.91 KiB 6 modules
  ./pageB.js 69 bytes [built] [code generated]
    [used exports unknown]
    entry ./pageB pageB
chunk (runtime: pageA) pageA.bundle.js (pageA) 69 bytes (javascript) 4.91 KiB (runtime) [entry] [rendered]
  > ./pageA pageA
  runtime modules 4.91 KiB 6 modules
  ./pageA.js 69 bytes [built] [code generated]
    [used exports unknown]
    entry ./pageA pageA
chunk (runtime: pageA, pageB) 531.chunk.js 5.45 KiB [rendered]
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
chunk (runtime: pageC) pageC.bundle.js (pageC) 68 bytes (javascript) 4.91 KiB (runtime) [entry] [rendered]
  > ./pageC pageC
  runtime modules 4.91 KiB 6 modules
  ./pageC.js 68 bytes [built] [code generated]
    [used exports unknown]
    entry ./pageC pageC
webpack X.X.X compiled successfully
```

## Production mode

```
asset pageC.bundle.js 1.71 KiB [emitted] [minimized] (name: pageC)
asset pageA.bundle.js 1.7 KiB [emitted] [minimized] (name: pageA)
asset pageB.bundle.js 1.7 KiB [emitted] [minimized] (name: pageB)
asset 531.chunk.js 154 bytes [emitted] [minimized]
asset 78.chunk.js 103 bytes [emitted] [minimized]
chunk (runtime: pageC) 78.chunk.js 42 bytes [rendered]
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
chunk (runtime: pageB) pageB.bundle.js (pageB) 69 bytes (javascript) 4.91 KiB (runtime) [entry] [rendered]
  > ./pageB pageB
  runtime modules 4.91 KiB 6 modules
  ./pageB.js 69 bytes [built] [code generated]
    [no exports used]
    entry ./pageB pageB
chunk (runtime: pageA) pageA.bundle.js (pageA) 69 bytes (javascript) 4.91 KiB (runtime) [entry] [rendered]
  > ./pageA pageA
  runtime modules 4.91 KiB 6 modules
  ./pageA.js 69 bytes [built] [code generated]
    [no exports used]
    entry ./pageA pageA
chunk (runtime: pageA, pageB) 531.chunk.js 5.45 KiB [rendered]
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
chunk (runtime: pageC) pageC.bundle.js (pageC) 68 bytes (javascript) 4.91 KiB (runtime) [entry] [rendered]
  > ./pageC pageC
  runtime modules 4.91 KiB 6 modules
  ./pageC.js 68 bytes [built] [code generated]
    [no exports used]
    entry ./pageC pageC
webpack X.X.X compiled successfully
```
