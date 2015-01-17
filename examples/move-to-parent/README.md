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
Hash: ff24adedc278bb766334
Version: webpack 1.5.0
Time: 63ms
          Asset  Size           Chunks             Chunk Names
pageD.bundle.js  4578            6, 11  [emitted]  pageD
     0.chunk.js   186                0  [emitted]  
     2.chunk.js   356         2, 0, 10  [emitted]  
     3.chunk.js   517  3, 5, 8, 10, 11  [emitted]  
pageB.bundle.js  4630         4, 0, 11  [emitted]  pageB
     5.chunk.js   363            5, 10  [emitted]  
     1.chunk.js   516   1, 0, 2, 5, 10  [emitted]  
pageC.bundle.js  4533            7, 11  [emitted]  pageC
     8.chunk.js   357        8, 10, 11  [emitted]  
pageA.bundle.js  4483             9, 0  [emitted]  pageA
    10.chunk.js   181               10  [emitted]  
    11.chunk.js   181               11  [emitted]  
chunk    {0} 0.chunk.js 21 {7} {6} [rendered]
    > [0] ./page.js?C 1:0-16
    > duplicate [0] ./page.js?C 2:0-23
    > duplicate [0] ./page.js?D 1:0-16
    > duplicate [0] ./page.js?D 2:0-23
    [1] ./a.js 21 {0} {1} {2} {4} {9} [built]
chunk    {1} 1.chunk.js 63 {7} {6} [rendered]
    > [0] ./page.js?C 4:0-37
    > duplicate [0] ./page.js?D 4:0-37
    [1] ./a.js 21 {0} {1} {2} {4} {9} [built]
    [3] ./c.js 21 {1} {2} {3} {5} {8} {10} [built]
    [4] ./d.js 21 {1} {3} {5} [built]
chunk    {2} 2.chunk.js 42 {7} {6} [rendered]
    > [0] ./page.js?C 3:0-30
    > duplicate [0] ./page.js?D 3:0-30
    [1] ./a.js 21 {0} {1} {2} {4} {9} [built]
    [3] ./c.js 21 {1} {2} {3} {5} {8} {10} [built]
chunk    {3} 3.chunk.js 63 {9} [rendered]
    > [0] ./page.js?A 4:0-37
    [2] ./b.js 21 {3} {4} {6} {7} {8} {11} [built]
    [3] ./c.js 21 {1} {2} {3} {5} {8} {10} [built]
    [4] ./d.js 21 {1} {3} {5} [built]
chunk    {4} pageB.bundle.js (pageB) 160 [rendered]
    > pageB [0] ./page.js?B 
    [0] ./page.js?B 118 {4} [built]
    [1] ./a.js 21 {0} {1} {2} {4} {9} [built]
    [2] ./b.js 21 {3} {4} {6} {7} {8} {11} [built]
chunk    {5} 5.chunk.js 42 {4} [rendered]
    > [0] ./page.js?B 4:0-37
    [3] ./c.js 21 {1} {2} {3} {5} {8} {10} [built]
    [4] ./d.js 21 {1} {3} {5} [built]
chunk    {6} pageD.bundle.js (pageD) 139 [rendered]
    > pageD [0] ./page.js?D 
    [0] ./page.js?D 118 {6} [built]
    [2] ./b.js 21 {3} {4} {6} {7} {8} {11} [built]
chunk    {7} pageC.bundle.js (pageC) 139 [rendered]
    > pageC [0] ./page.js?C 
    [0] ./page.js?C 118 {7} [built]
    [2] ./b.js 21 {3} {4} {6} {7} {8} {11} [built]
chunk    {8} 8.chunk.js 42 {9} [rendered]
    > [0] ./page.js?A 3:0-30
    [2] ./b.js 21 {3} {4} {6} {7} {8} {11} [built]
    [3] ./c.js 21 {1} {2} {3} {5} {8} {10} [built]
chunk    {9} pageA.bundle.js (pageA) 139 [rendered]
    > pageA [0] ./page.js?A 
    [0] ./page.js?A 118 {9} [built]
    [1] ./a.js 21 {0} {1} {2} {4} {9} [built]
chunk   {10} 10.chunk.js 21 {4} [rendered]
    > [0] ./page.js?B 3:0-30
    [3] ./c.js 21 {1} {2} {3} {5} {8} {10} [built]
chunk   {11} 11.chunk.js 21 {9} [rendered]
    > [0] ./page.js?A 2:0-23
    [2] ./b.js 21 {3} {4} {6} {7} {8} {11} [built]
```

## Minimized (uglify-js, no zip)

```
Hash: 8e6c34485b020b23e506
Version: webpack 1.5.0
Time: 287ms
          Asset  Size           Chunks             Chunk Names
pageD.bundle.js   881            6, 11  [emitted]  pageD
     0.chunk.js    48                0  [emitted]  
     2.chunk.js    81         2, 0, 10  [emitted]  
     3.chunk.js   113  3, 5, 8, 10, 11  [emitted]  
pageB.bundle.js   855         4, 0, 11  [emitted]  pageB
     5.chunk.js    80            5, 10  [emitted]  
     1.chunk.js   112   1, 0, 2, 5, 10  [emitted]  
pageC.bundle.js   881            7, 11  [emitted]  pageC
     8.chunk.js    82        8, 10, 11  [emitted]  
pageA.bundle.js   854             9, 0  [emitted]  pageA
    10.chunk.js    50               10  [emitted]  
    11.chunk.js    50               11  [emitted]  
chunk    {0} 0.chunk.js 21 {7} {6} [rendered]
    > [0] ./page.js?C 1:0-16
    > duplicate [0] ./page.js?C 2:0-23
    > duplicate [0] ./page.js?D 1:0-16
    > duplicate [0] ./page.js?D 2:0-23
    [1] ./a.js 21 {0} {1} {2} {4} {9} [built]
chunk    {1} 1.chunk.js 63 {7} {6} [rendered]
    > [0] ./page.js?C 4:0-37
    > duplicate [0] ./page.js?D 4:0-37
    [1] ./a.js 21 {0} {1} {2} {4} {9} [built]
    [3] ./c.js 21 {1} {2} {3} {5} {8} {10} [built]
    [4] ./d.js 21 {1} {3} {5} [built]
chunk    {2} 2.chunk.js 42 {7} {6} [rendered]
    > [0] ./page.js?C 3:0-30
    > duplicate [0] ./page.js?D 3:0-30
    [1] ./a.js 21 {0} {1} {2} {4} {9} [built]
    [3] ./c.js 21 {1} {2} {3} {5} {8} {10} [built]
chunk    {3} 3.chunk.js 63 {9} [rendered]
    > [0] ./page.js?A 4:0-37
    [2] ./b.js 21 {3} {4} {6} {7} {8} {11} [built]
    [3] ./c.js 21 {1} {2} {3} {5} {8} {10} [built]
    [4] ./d.js 21 {1} {3} {5} [built]
chunk    {4} pageB.bundle.js (pageB) 160 [rendered]
    > pageB [0] ./page.js?B 
    [0] ./page.js?B 118 {4} [built]
    [1] ./a.js 21 {0} {1} {2} {4} {9} [built]
    [2] ./b.js 21 {3} {4} {6} {7} {8} {11} [built]
chunk    {5} 5.chunk.js 42 {4} [rendered]
    > [0] ./page.js?B 4:0-37
    [3] ./c.js 21 {1} {2} {3} {5} {8} {10} [built]
    [4] ./d.js 21 {1} {3} {5} [built]
chunk    {6} pageD.bundle.js (pageD) 139 [rendered]
    > pageD [0] ./page.js?D 
    [0] ./page.js?D 118 {6} [built]
    [2] ./b.js 21 {3} {4} {6} {7} {8} {11} [built]
chunk    {7} pageC.bundle.js (pageC) 139 [rendered]
    > pageC [0] ./page.js?C 
    [0] ./page.js?C 118 {7} [built]
    [2] ./b.js 21 {3} {4} {6} {7} {8} {11} [built]
chunk    {8} 8.chunk.js 42 {9} [rendered]
    > [0] ./page.js?A 3:0-30
    [2] ./b.js 21 {3} {4} {6} {7} {8} {11} [built]
    [3] ./c.js 21 {1} {2} {3} {5} {8} {10} [built]
chunk    {9} pageA.bundle.js (pageA) 139 [rendered]
    > pageA [0] ./page.js?A 
    [0] ./page.js?A 118 {9} [built]
    [1] ./a.js 21 {0} {1} {2} {4} {9} [built]
chunk   {10} 10.chunk.js 21 {4} [rendered]
    > [0] ./page.js?B 3:0-30
    [3] ./c.js 21 {1} {2} {3} {5} {8} {10} [built]
chunk   {11} 11.chunk.js 21 {9} [rendered]
    > [0] ./page.js?A 2:0-23
    [2] ./b.js 21 {3} {4} {6} {7} {8} {11} [built]

WARNING in pageB.bundle.js from UglifyJs
Dropping side-effect-free statement [./page.js?B:1,0]
Dropping side-effect-free statement [./page.js?B:2,0]

WARNING in pageA.bundle.js from UglifyJs
Dropping side-effect-free statement [./page.js?A:1,0]
```
