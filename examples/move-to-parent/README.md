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
		new CommonsChunkPlugin("pageA", null, false),
		
		// the same for pageB but move them if at least 3 children share the module
		new CommonsChunkPlugin("pageB", null, false, 3),
		
		// the same for pageC and pageD but with a custom logic for moving
		new CommonsChunkPlugin(["pageC", "pageD"], null, false, function(module, count) {
			// move only module "b"
			return /b\.js$/.test(module.identifier());
		})
	]
}
```

# Info

## Uncompressed

```
Hash: ec1febbb5042422aab83
Version: webpack 1.9.10
Time: 99ms
          Asset       Size          Chunks             Chunk Names
     6.chunk.js  320 bytes            6, 5  [emitted]  
pageA.bundle.js    4.34 kB            0, 8  [emitted]  pageA
     2.chunk.js  313 bytes         2, 1, 5  [emitted]  
     3.chunk.js  452 bytes   3, 1, 2, 5, 6  [emitted]  
pageB.bundle.js    4.47 kB         4, 1, 8  [emitted]  pageB
     5.chunk.js  159 bytes               5  [emitted]  
     1.chunk.js  159 bytes               1  [emitted]  
pageC.bundle.js    4.39 kB            7, 1  [emitted]  pageC
     8.chunk.js  165 bytes               8  [emitted]  
     9.chunk.js  313 bytes         9, 5, 8  [emitted]  
    10.chunk.js  453 bytes  10, 5, 6, 8, 9  [emitted]  
pageD.bundle.js    4.44 kB           11, 1  [emitted]  pageD
chunk    {0} pageA.bundle.js (pageA) 139 bytes [rendered]
    > pageA [0] ./page.js?A 
    [0] ./page.js?A 118 bytes {0} [built]
    [1] ./a.js 21 bytes {0} {4} {8} {9} {10} [built]
chunk    {1} 1.chunk.js 21 bytes {0} [rendered]
    > [0] ./page.js?A 2:0-23
    [2] ./b.js 21 bytes {1} {2} {3} {4} {7} {11} [built]
chunk    {2} 2.chunk.js 42 bytes {0} [rendered]
    > [0] ./page.js?A 3:0-30
    [2] ./b.js 21 bytes {1} {2} {3} {4} {7} {11} [built]
    [3] ./c.js 21 bytes {2} {3} {5} {6} {9} {10} [built]
chunk    {3} 3.chunk.js 63 bytes {0} [rendered]
    > [0] ./page.js?A 4:0-37
    [2] ./b.js 21 bytes {1} {2} {3} {4} {7} {11} [built]
    [3] ./c.js 21 bytes {2} {3} {5} {6} {9} {10} [built]
    [4] ./d.js 21 bytes {3} {6} {10} [built]
chunk    {4} pageB.bundle.js (pageB) 160 bytes [rendered]
    > pageB [0] ./page.js?B 
    [0] ./page.js?B 118 bytes {4} [built]
    [1] ./a.js 21 bytes {0} {4} {8} {9} {10} [built]
    [2] ./b.js 21 bytes {1} {2} {3} {4} {7} {11} [built]
chunk    {5} 5.chunk.js 21 bytes {4} [rendered]
    > [0] ./page.js?B 3:0-30
    [3] ./c.js 21 bytes {2} {3} {5} {6} {9} {10} [built]
chunk    {6} 6.chunk.js 42 bytes {4} [rendered]
    > [0] ./page.js?B 4:0-37
    [3] ./c.js 21 bytes {2} {3} {5} {6} {9} {10} [built]
    [4] ./d.js 21 bytes {3} {6} {10} [built]
chunk    {7} pageC.bundle.js (pageC) 139 bytes [rendered]
    > pageC [0] ./page.js?C 
    [0] ./page.js?C 118 bytes {7} [built]
    [2] ./b.js 21 bytes {1} {2} {3} {4} {7} {11} [built]
chunk    {8} 8.chunk.js 21 bytes {7} {11} [rendered]
    > [0] ./page.js?C 1:0-16
    > duplicate [0] ./page.js?C 2:0-23
    > duplicate [0] ./page.js?D 1:0-16
    > duplicate [0] ./page.js?D 2:0-23
    [1] ./a.js 21 bytes {0} {4} {8} {9} {10} [built]
chunk    {9} 9.chunk.js 42 bytes {7} {11} [rendered]
    > [0] ./page.js?C 3:0-30
    > duplicate [0] ./page.js?D 3:0-30
    [1] ./a.js 21 bytes {0} {4} {8} {9} {10} [built]
    [3] ./c.js 21 bytes {2} {3} {5} {6} {9} {10} [built]
chunk   {10} 10.chunk.js 63 bytes {7} {11} [rendered]
    > [0] ./page.js?C 4:0-37
    > duplicate [0] ./page.js?D 4:0-37
    [1] ./a.js 21 bytes {0} {4} {8} {9} {10} [built]
    [3] ./c.js 21 bytes {2} {3} {5} {6} {9} {10} [built]
    [4] ./d.js 21 bytes {3} {6} {10} [built]
chunk   {11} pageD.bundle.js (pageD) 139 bytes [rendered]
    > pageD [0] ./page.js?D 
    [0] ./page.js?D 118 bytes {11} [built]
    [2] ./b.js 21 bytes {1} {2} {3} {4} {7} {11} [built]
```

## Minimized (uglify-js, no zip)

```
Hash: c5f3f207764121c16c7e
Version: webpack 1.9.10
Time: 444ms
          Asset       Size           Chunks             Chunk Names
pageD.bundle.js  883 bytes            6, 11  [emitted]  pageD
     0.chunk.js   50 bytes                0  [emitted]  
     2.chunk.js   85 bytes         2, 0, 10  [emitted]  
     3.chunk.js  119 bytes  3, 5, 8, 10, 11  [emitted]  
pageB.bundle.js  880 bytes         4, 0, 11  [emitted]  pageB
     5.chunk.js   84 bytes            5, 10  [emitted]  
     1.chunk.js  118 bytes   1, 0, 2, 5, 10  [emitted]  
pageC.bundle.js  883 bytes            7, 11  [emitted]  pageC
     8.chunk.js   86 bytes        8, 10, 11  [emitted]  
pageA.bundle.js  864 bytes             9, 0  [emitted]  pageA
    10.chunk.js   52 bytes               10  [emitted]  
    11.chunk.js   52 bytes               11  [emitted]  
chunk    {0} 0.chunk.js 21 bytes {7} {6} [rendered]
    > [0] ./page.js?C 1:0-16
    > duplicate [0] ./page.js?C 2:0-23
    > duplicate [0] ./page.js?D 1:0-16
    > duplicate [0] ./page.js?D 2:0-23
    [1] ./a.js 21 bytes {0} {1} {2} {4} {9} [built]
chunk    {1} 1.chunk.js 63 bytes {7} {6} [rendered]
    > [0] ./page.js?C 4:0-37
    > duplicate [0] ./page.js?D 4:0-37
    [1] ./a.js 21 bytes {0} {1} {2} {4} {9} [built]
    [3] ./c.js 21 bytes {1} {2} {3} {5} {8} {10} [built]
    [4] ./d.js 21 bytes {1} {3} {5} [built]
chunk    {2} 2.chunk.js 42 bytes {7} {6} [rendered]
    > [0] ./page.js?C 3:0-30
    > duplicate [0] ./page.js?D 3:0-30
    [1] ./a.js 21 bytes {0} {1} {2} {4} {9} [built]
    [3] ./c.js 21 bytes {1} {2} {3} {5} {8} {10} [built]
chunk    {3} 3.chunk.js 63 bytes {9} [rendered]
    > [0] ./page.js?A 4:0-37
    [2] ./b.js 21 bytes {3} {4} {6} {7} {8} {11} [built]
    [3] ./c.js 21 bytes {1} {2} {3} {5} {8} {10} [built]
    [4] ./d.js 21 bytes {1} {3} {5} [built]
chunk    {4} pageB.bundle.js (pageB) 160 bytes [rendered]
    > pageB [0] ./page.js?B 
    [0] ./page.js?B 118 bytes {4} [built]
    [1] ./a.js 21 bytes {0} {1} {2} {4} {9} [built]
    [2] ./b.js 21 bytes {3} {4} {6} {7} {8} {11} [built]
chunk    {5} 5.chunk.js 42 bytes {4} [rendered]
    > [0] ./page.js?B 4:0-37
    [3] ./c.js 21 bytes {1} {2} {3} {5} {8} {10} [built]
    [4] ./d.js 21 bytes {1} {3} {5} [built]
chunk    {6} pageD.bundle.js (pageD) 139 bytes [rendered]
    > pageD [0] ./page.js?D 
    [0] ./page.js?D 118 bytes {6} [built]
    [2] ./b.js 21 bytes {3} {4} {6} {7} {8} {11} [built]
chunk    {7} pageC.bundle.js (pageC) 139 bytes [rendered]
    > pageC [0] ./page.js?C 
    [0] ./page.js?C 118 bytes {7} [built]
    [2] ./b.js 21 bytes {3} {4} {6} {7} {8} {11} [built]
chunk    {8} 8.chunk.js 42 bytes {9} [rendered]
    > [0] ./page.js?A 3:0-30
    [2] ./b.js 21 bytes {3} {4} {6} {7} {8} {11} [built]
    [3] ./c.js 21 bytes {1} {2} {3} {5} {8} {10} [built]
chunk    {9} pageA.bundle.js (pageA) 139 bytes [rendered]
    > pageA [0] ./page.js?A 
    [0] ./page.js?A 118 bytes {9} [built]
    [1] ./a.js 21 bytes {0} {1} {2} {4} {9} [built]
chunk   {10} 10.chunk.js 21 bytes {4} [rendered]
    > [0] ./page.js?B 3:0-30
    [3] ./c.js 21 bytes {1} {2} {3} {5} {8} {10} [built]
chunk   {11} 11.chunk.js 21 bytes {9} [rendered]
    > [0] ./page.js?A 2:0-23
    [2] ./b.js 21 bytes {3} {4} {6} {7} {8} {11} [built]
```
