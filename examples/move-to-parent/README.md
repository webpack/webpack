This example shows example of using the CommonsChunkPlugin for moving modules from child-chunks to the parent chunk.

The `CommonsChunkPlugin` is used with `selectedChunks = false` argument to check for common modules in the child-chunks.

Without the plugin the pages would have this chunks:

* page
  * chunk: a
  * chunk: a, b
  * chunk: a, b, c
  * chunk: a, b, c, d

Using the `CommonsChunkPlugin` without `minChunks` argument only moves modules which are shared by all children (here only module `a`):

* pageA: a
  * chunk: b
  * chunk: b, c
  * chunk: b, c, d

With `minChunks = 3`:

* pageB: a, b
  * chunk: c
  * chunk: c, d

It's also possible to provide a function instead of a number for `minChunks`. The function is called for each module to decide if the module should be moved or not (see pageC and pageD).

# page.js

``` javascript
require(["./a"]);
require(["./a", "./b"]);
require(["./a", "./b", "./c"]);
require(["./a", "./b", "./c", "./d"]);
```

# webpack.config.js

``` javascript
var path = require("path");
var CommonsChunkPlugin = require("../../lib/optimize/CommonsChunkPlugin");
module.exports = {
	entry: {
		pageA: "./page?A",
		pageB: "./page?B",
		pageC: "./page?C",
		pageD: "./page?D"
	},
	output: {
		path: path.join(__dirname, "js"),
		filename: "[name].bundle.js",
		chunkFilename: "[id].chunk.js"
	},
	plugins: [
		// check for common modules in children of pageA and move them to the parent
		new CommonsChunkPlugin({
			name: "pageA",
			children: true
		}),

		// the same for pageB but move them if at least 3 children share the module
		new CommonsChunkPlugin({
			name: "pageB",
			children: true,
			minChunks: 3
		}),

		// the same for pageC and pageD but with a custom logic for moving
		new CommonsChunkPlugin({
			names: ["pageC", "pageD"],
			children: true,
			minChunks: function(module, count) {
				// move only module "b"
				return /b\.js$/.test(module.identifier());
			}
		})
	]
}
```

# Info

## Uncompressed

```
Hash: cc02f492e44f68d8c237
Version: webpack 2.2.0-rc.2
          Asset       Size      Chunks             Chunk Names
     0.chunk.js  779 bytes  0, 1, 2, 3  [emitted]  
     1.chunk.js  589 bytes     1, 2, 3  [emitted]  
     2.chunk.js  399 bytes        2, 3  [emitted]  
     3.chunk.js  209 bytes           3  [emitted]  
pageD.bundle.js    6.44 kB           4  [emitted]  pageD
pageC.bundle.js    6.44 kB           5  [emitted]  pageC
pageB.bundle.js    6.44 kB           6  [emitted]  pageB
pageA.bundle.js    6.38 kB           7  [emitted]  pageA
Entrypoint pageA = pageA.bundle.js
Entrypoint pageB = pageB.bundle.js
Entrypoint pageC = pageC.bundle.js
Entrypoint pageD = pageD.bundle.js
chunk    {0} 0.chunk.js 84 bytes {4} {5} {6} {7} [rendered]
    > duplicate [4] ./page.js?A 4:0-37
    > duplicate [5] ./page.js?B 4:0-37
    > duplicate [6] ./page.js?C 4:0-37
    > duplicate [7] ./page.js?D 4:0-37
    [0] ./a.js 21 bytes {0} {1} {2} {3} [built]
    [1] ./b.js 21 bytes {0} {1} {2} [built]
    [2] ./c.js 21 bytes {0} {1} [built]
    [3] ./d.js 21 bytes {0} [built]
chunk    {1} 1.chunk.js 63 bytes {4} {5} {6} {7} [rendered]
    > duplicate [4] ./page.js?A 3:0-30
    > duplicate [5] ./page.js?B 3:0-30
    > duplicate [6] ./page.js?C 3:0-30
    > duplicate [7] ./page.js?D 3:0-30
    [0] ./a.js 21 bytes {0} {1} {2} {3} [built]
    [1] ./b.js 21 bytes {0} {1} {2} [built]
    [2] ./c.js 21 bytes {0} {1} [built]
chunk    {2} 2.chunk.js 42 bytes {4} {5} {6} {7} [rendered]
    > duplicate [4] ./page.js?A 2:0-23
    > duplicate [5] ./page.js?B 2:0-23
    > duplicate [6] ./page.js?C 2:0-23
    > duplicate [7] ./page.js?D 2:0-23
    [0] ./a.js 21 bytes {0} {1} {2} {3} [built]
    [1] ./b.js 21 bytes {0} {1} {2} [built]
chunk    {3} 3.chunk.js 21 bytes {4} {5} {6} {7} [rendered]
    > duplicate [4] ./page.js?A 1:0-16
    > duplicate [5] ./page.js?B 1:0-16
    > duplicate [6] ./page.js?C 1:0-16
    > duplicate [7] ./page.js?D 1:0-16
    [0] ./a.js 21 bytes {0} {1} {2} {3} [built]
chunk    {4} pageD.bundle.js (pageD) 118 bytes [entry] [rendered]
    > pageD [7] ./page.js?D 
    [7] ./page.js?D 118 bytes {4} [built]
chunk    {5} pageC.bundle.js (pageC) 118 bytes [entry] [rendered]
    > pageC [6] ./page.js?C 
    [6] ./page.js?C 118 bytes {5} [built]
chunk    {6} pageB.bundle.js (pageB) 118 bytes [entry] [rendered]
    > pageB [5] ./page.js?B 
    [5] ./page.js?B 118 bytes {6} [built]
chunk    {7} pageA.bundle.js (pageA) 118 bytes [entry] [rendered]
    > pageA [4] ./page.js?A 
    [4] ./page.js?A 118 bytes {7} [built]
```

## Minimized (uglify-js, no zip)

```
Hash: cc02f492e44f68d8c237
Version: webpack 2.2.0-rc.2
          Asset       Size      Chunks             Chunk Names
     0.chunk.js  142 bytes  0, 1, 2, 3  [emitted]  
     1.chunk.js  111 bytes     1, 2, 3  [emitted]  
     2.chunk.js   80 bytes        2, 3  [emitted]  
     3.chunk.js   49 bytes           3  [emitted]  
pageD.bundle.js    1.57 kB           4  [emitted]  pageD
pageC.bundle.js    1.57 kB           5  [emitted]  pageC
pageB.bundle.js    1.57 kB           6  [emitted]  pageB
pageA.bundle.js    1.57 kB           7  [emitted]  pageA
Entrypoint pageA = pageA.bundle.js
Entrypoint pageB = pageB.bundle.js
Entrypoint pageC = pageC.bundle.js
Entrypoint pageD = pageD.bundle.js
chunk    {0} 0.chunk.js 84 bytes {4} {5} {6} {7} [rendered]
    > duplicate [4] ./page.js?A 4:0-37
    > duplicate [5] ./page.js?B 4:0-37
    > duplicate [6] ./page.js?C 4:0-37
    > duplicate [7] ./page.js?D 4:0-37
    [0] ./a.js 21 bytes {0} {1} {2} {3} [built]
    [1] ./b.js 21 bytes {0} {1} {2} [built]
    [2] ./c.js 21 bytes {0} {1} [built]
    [3] ./d.js 21 bytes {0} [built]
chunk    {1} 1.chunk.js 63 bytes {4} {5} {6} {7} [rendered]
    > duplicate [4] ./page.js?A 3:0-30
    > duplicate [5] ./page.js?B 3:0-30
    > duplicate [6] ./page.js?C 3:0-30
    > duplicate [7] ./page.js?D 3:0-30
    [0] ./a.js 21 bytes {0} {1} {2} {3} [built]
    [1] ./b.js 21 bytes {0} {1} {2} [built]
    [2] ./c.js 21 bytes {0} {1} [built]
chunk    {2} 2.chunk.js 42 bytes {4} {5} {6} {7} [rendered]
    > duplicate [4] ./page.js?A 2:0-23
    > duplicate [5] ./page.js?B 2:0-23
    > duplicate [6] ./page.js?C 2:0-23
    > duplicate [7] ./page.js?D 2:0-23
    [0] ./a.js 21 bytes {0} {1} {2} {3} [built]
    [1] ./b.js 21 bytes {0} {1} {2} [built]
chunk    {3} 3.chunk.js 21 bytes {4} {5} {6} {7} [rendered]
    > duplicate [4] ./page.js?A 1:0-16
    > duplicate [5] ./page.js?B 1:0-16
    > duplicate [6] ./page.js?C 1:0-16
    > duplicate [7] ./page.js?D 1:0-16
    [0] ./a.js 21 bytes {0} {1} {2} {3} [built]
chunk    {4} pageD.bundle.js (pageD) 118 bytes [entry] [rendered]
    > pageD [7] ./page.js?D 
    [7] ./page.js?D 118 bytes {4} [built]
chunk    {5} pageC.bundle.js (pageC) 118 bytes [entry] [rendered]
    > pageC [6] ./page.js?C 
    [6] ./page.js?C 118 bytes {5} [built]
chunk    {6} pageB.bundle.js (pageB) 118 bytes [entry] [rendered]
    > pageB [5] ./page.js?B 
    [5] ./page.js?B 118 bytes {6} [built]
chunk    {7} pageA.bundle.js (pageA) 118 bytes [entry] [rendered]
    > pageA [4] ./page.js?A 
    [4] ./page.js?A 118 bytes {7} [built]
```
