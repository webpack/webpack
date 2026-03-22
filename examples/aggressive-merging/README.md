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

/** @type {import("webpack").Configuration} */
const config = {
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

module.exports = config;
```

# Info

## Unoptimized

```
asset pageA.bundle.js 9.06 KiB [emitted] (name: pageA)
asset pageB.bundle.js 9.06 KiB [emitted] (name: pageB)
asset pageC.bundle.js 9.06 KiB [emitted] (name: pageC)
asset 531.chunk.js 6.28 KiB [emitted]
asset 78.chunk.js 581 bytes [emitted]
runtime modules 14.7 KiB 18 modules
cacheable modules 5.65 KiB
  ./pageA.js 69 bytes [built] [code generated]
  ./pageB.js 69 bytes [built] [code generated]
  ./pageC.js 68 bytes [built] [code generated]
  ./common.js 5.41 KiB [built] [code generated]
  ./a.js 21 bytes [built] [code generated]
  ./b.js 21 bytes [built] [code generated]
webpack X.X.X compiled successfully
```

## Production mode

```
asset pageC.bundle.js 1.71 KiB [emitted] [minimized] (name: pageC)
asset pageA.bundle.js 1.7 KiB [emitted] [minimized] (name: pageA)
asset pageB.bundle.js 1.7 KiB [emitted] [minimized] (name: pageB)
asset 531.chunk.js 151 bytes [emitted] [minimized]
asset 78.chunk.js 101 bytes [emitted] [minimized]
runtime modules 14.7 KiB 18 modules
cacheable modules 5.65 KiB
  ./pageA.js 69 bytes [built] [code generated]
  ./pageB.js 69 bytes [built] [code generated]
  ./pageC.js 68 bytes [built] [code generated]
  ./common.js 5.41 KiB [built] [code generated]
  ./a.js 21 bytes [built] [code generated]
  ./b.js 21 bytes [built] [code generated]
webpack X.X.X compiled successfully
```
