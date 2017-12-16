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

It's also possible to provide a function instead of a number for `minChunks`. The function is called for each module to decide if the module should be moved or not (see pageC and pageD):

* pageC: a, c, d
  * chunk: b

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
var outputOptions = {
	path: path.join(__dirname, "js"),
	filename: "[name].bundle.js",
	chunkFilename: "[id].chunk.js"
};
module.exports = [{
	name: "page",
	mode: "production",
	entry: {
		page: "./page"
	},
	output: outputOptions
}, {
	name: "pageA",
	mode: "production",
	entry: {
		pageA: "./page"
	},
	output: outputOptions,
	plugins: [
		//check for common modules in children of pageA and move them to the parent
		new CommonsChunkPlugin({
			name: "pageA",
			children: true
		}),
	]
}, {
	name: "pageB",
	mode: "production",
	entry: {
		pageB: "./page"
	},
	output: outputOptions,
	plugins: [
		// the same for pageB but move them if at least 3 children share the module
		new CommonsChunkPlugin({
			name: "pageB",
			children: true,
			minChunks: 3
		}),
	]
}, {
	name: "pageC",
	mode: "production",
	entry: {
		pageC: "./page"
	},
	output: outputOptions,
	plugins: [
		// the same for pageC and pageD but with a custom logic for moving
		new CommonsChunkPlugin({
			name: "pageC",
			children: true,
			minChunks: function(module, count) {
				// move only module "b"
				return !/b\.js/.test(module.identifier());
			}
		})
	]
}];
```

# Info

## Uncompressed

```
Hash: 177cb4f87a649dcf8f695390da5dc6be017898ddc8f0b2530347cda025f33bed15ba96ffc9d826c2
Version: webpack next
Child page:
    Hash: 177cb4f87a649dcf8f69
             Asset       Size      Chunks             Chunk Names
        0.chunk.js   1.11 KiB  0, 1, 2, 3  [emitted]  
        1.chunk.js  861 bytes     1, 2, 3  [emitted]  
        2.chunk.js  597 bytes        2, 3  [emitted]  
        3.chunk.js  333 bytes           3  [emitted]  
    page.bundle.js   7.52 KiB           4  [emitted]  page
    Entrypoint page = page.bundle.js
    chunk    {0} 0.chunk.js 84 bytes {4} [rendered]
        > [3] ./page.js 4:0-37
        [0] ./a.js 21 bytes {0} {1} {2} {3} [built]
        [1] ./b.js 21 bytes {0} {1} {2} [built]
        [2] ./c.js 21 bytes {0} {1} [built]
        [4] ./d.js 21 bytes {0} [built]
    chunk    {1} 1.chunk.js 63 bytes {4} [rendered]
        > [3] ./page.js 3:0-30
        [0] ./a.js 21 bytes {0} {1} {2} {3} [built]
        [1] ./b.js 21 bytes {0} {1} {2} [built]
        [2] ./c.js 21 bytes {0} {1} [built]
    chunk    {2} 2.chunk.js 42 bytes {4} [rendered]
        > [3] ./page.js 2:0-23
        [0] ./a.js 21 bytes {0} {1} {2} {3} [built]
        [1] ./b.js 21 bytes {0} {1} {2} [built]
    chunk    {3} 3.chunk.js 21 bytes {4} [rendered]
        > [3] ./page.js 1:0-16
        [0] ./a.js 21 bytes {0} {1} {2} {3} [built]
    chunk    {4} page.bundle.js (page) 118 bytes [entry] [rendered]
        > page [3] ./page.js 
        [3] ./page.js 118 bytes {4} [built]
Child pageA:
    Hash: 5390da5dc6be017898dd
              Asset       Size   Chunks             Chunk Names
         0.chunk.js  879 bytes  0, 1, 2  [emitted]  
         1.chunk.js  606 bytes     1, 2  [emitted]  
         2.chunk.js  342 bytes        2  [emitted]  
    pageA.bundle.js   7.77 KiB        3  [emitted]  pageA
    Entrypoint pageA = pageA.bundle.js
    chunk    {0} 0.chunk.js 63 bytes {3} [rendered]
        > [3] ./page.js 4:0-37
        [1] ./b.js 21 bytes {0} {1} {2} [built]
        [2] ./c.js 21 bytes {0} {1} [built]
        [4] ./d.js 21 bytes {0} [built]
    chunk    {1} 1.chunk.js 42 bytes {3} [rendered]
        > [3] ./page.js 3:0-30
        [1] ./b.js 21 bytes {0} {1} {2} [built]
        [2] ./c.js 21 bytes {0} {1} [built]
    chunk    {2} 2.chunk.js 21 bytes {3} [rendered]
        > [3] ./page.js 2:0-23
        [1] ./b.js 21 bytes {0} {1} {2} [built]
    chunk    {3} pageA.bundle.js (pageA) 139 bytes [entry] [rendered]
        > pageA [3] ./page.js 
        [0] ./a.js 21 bytes {3} [built]
        [3] ./page.js 118 bytes {3} [built]
Child pageB:
    Hash: c8f0b2530347cda025f3
              Asset       Size  Chunks             Chunk Names
         0.chunk.js  624 bytes    0, 1  [emitted]  
         1.chunk.js  336 bytes       1  [emitted]  
    pageB.bundle.js      8 KiB       2  [emitted]  pageB
    Entrypoint pageB = pageB.bundle.js
    chunk    {0} 0.chunk.js 42 bytes {2} [rendered]
        > [3] ./page.js 4:0-37
        [2] ./c.js 21 bytes {0} {1} [built]
        [4] ./d.js 21 bytes {0} [built]
    chunk    {1} 1.chunk.js 21 bytes {2} [rendered]
        > [3] ./page.js 3:0-30
        [2] ./c.js 21 bytes {0} {1} [built]
    chunk    {2} pageB.bundle.js (pageB) 160 bytes [entry] [rendered]
        > pageB [3] ./page.js 
        [0] ./a.js 21 bytes {2} [built]
        [1] ./b.js 21 bytes {2} [built]
        [3] ./page.js 118 bytes {2} [built]
Child pageC:
    Hash: 3bed15ba96ffc9d826c2
              Asset       Size  Chunks             Chunk Names
         0.chunk.js  342 bytes       0  [emitted]  
    pageC.bundle.js   8.32 KiB       1  [emitted]  pageC
    Entrypoint pageC = pageC.bundle.js
    chunk    {0} 0.chunk.js 21 bytes {1} [rendered]
        > duplicate [3] ./page.js 2:0-23
        > duplicate [3] ./page.js 3:0-30
        > duplicate [3] ./page.js 4:0-37
        [1] ./b.js 21 bytes {0} [built]
    chunk    {1} pageC.bundle.js (pageC) 181 bytes [entry] [rendered]
        > pageC [3] ./page.js 
        [0] ./a.js 21 bytes {1} [built]
        [2] ./c.js 21 bytes {1} [built]
        [3] ./page.js 118 bytes {1} [built]
        [4] ./d.js 21 bytes {1} [built]
```

## Minimized (uglify-js, no zip)

```
Hash: 177cb4f87a649dcf8f695390da5dc6be017898ddc8f0b2530347cda025f33bed15ba96ffc9d826c2
Version: webpack next
Child page:
    Hash: 177cb4f87a649dcf8f69
             Asset       Size      Chunks             Chunk Names
        0.chunk.js  183 bytes  0, 1, 2, 3  [emitted]  
        1.chunk.js  151 bytes     1, 2, 3  [emitted]  
        2.chunk.js  120 bytes        2, 3  [emitted]  
        3.chunk.js   89 bytes           3  [emitted]  
    page.bundle.js   1.77 KiB           4  [emitted]  page
    Entrypoint page = page.bundle.js
    chunk    {0} 0.chunk.js 84 bytes {4} [rendered]
        > [3] ./page.js 4:0-37
        [0] ./a.js 21 bytes {0} {1} {2} {3} [built]
        [1] ./b.js 21 bytes {0} {1} {2} [built]
        [2] ./c.js 21 bytes {0} {1} [built]
        [4] ./d.js 21 bytes {0} [built]
    chunk    {1} 1.chunk.js 63 bytes {4} [rendered]
        > [3] ./page.js 3:0-30
        [0] ./a.js 21 bytes {0} {1} {2} {3} [built]
        [1] ./b.js 21 bytes {0} {1} {2} [built]
        [2] ./c.js 21 bytes {0} {1} [built]
    chunk    {2} 2.chunk.js 42 bytes {4} [rendered]
        > [3] ./page.js 2:0-23
        [0] ./a.js 21 bytes {0} {1} {2} {3} [built]
        [1] ./b.js 21 bytes {0} {1} {2} [built]
    chunk    {3} 3.chunk.js 21 bytes {4} [rendered]
        > [3] ./page.js 1:0-16
        [0] ./a.js 21 bytes {0} {1} {2} {3} [built]
    chunk    {4} page.bundle.js (page) 118 bytes [entry] [rendered]
        > page [3] ./page.js 
        [3] ./page.js 118 bytes {4} [built]
Child pageA:
    Hash: 5390da5dc6be017898dd
              Asset       Size   Chunks             Chunk Names
         0.chunk.js  153 bytes  0, 1, 2  [emitted]  
         1.chunk.js  121 bytes     1, 2  [emitted]  
         2.chunk.js   90 bytes        2  [emitted]  
    pageA.bundle.js   1.81 KiB        3  [emitted]  pageA
    Entrypoint pageA = pageA.bundle.js
    chunk    {0} 0.chunk.js 63 bytes {3} [rendered]
        > [3] ./page.js 4:0-37
        [1] ./b.js 21 bytes {0} {1} {2} [built]
        [2] ./c.js 21 bytes {0} {1} [built]
        [4] ./d.js 21 bytes {0} [built]
    chunk    {1} 1.chunk.js 42 bytes {3} [rendered]
        > [3] ./page.js 3:0-30
        [1] ./b.js 21 bytes {0} {1} {2} [built]
        [2] ./c.js 21 bytes {0} {1} [built]
    chunk    {2} 2.chunk.js 21 bytes {3} [rendered]
        > [3] ./page.js 2:0-23
        [1] ./b.js 21 bytes {0} {1} {2} [built]
    chunk    {3} pageA.bundle.js (pageA) 139 bytes [entry] [rendered]
        > pageA [3] ./page.js 
        [0] ./a.js 21 bytes {3} [built]
        [3] ./page.js 118 bytes {3} [built]
Child pageB:
    Hash: c8f0b2530347cda025f3
              Asset       Size  Chunks             Chunk Names
         0.chunk.js  123 bytes    0, 1  [emitted]  
         1.chunk.js   91 bytes       1  [emitted]  
    pageB.bundle.js   1.85 KiB       2  [emitted]  pageB
    Entrypoint pageB = pageB.bundle.js
    chunk    {0} 0.chunk.js 42 bytes {2} [rendered]
        > [3] ./page.js 4:0-37
        [2] ./c.js 21 bytes {0} {1} [built]
        [4] ./d.js 21 bytes {0} [built]
    chunk    {1} 1.chunk.js 21 bytes {2} [rendered]
        > [3] ./page.js 3:0-30
        [2] ./c.js 21 bytes {0} {1} [built]
    chunk    {2} pageB.bundle.js (pageB) 160 bytes [entry] [rendered]
        > pageB [3] ./page.js 
        [0] ./a.js 21 bytes {2} [built]
        [1] ./b.js 21 bytes {2} [built]
        [3] ./page.js 118 bytes {2} [built]
Child pageC:
    Hash: 3bed15ba96ffc9d826c2
              Asset      Size  Chunks             Chunk Names
         0.chunk.js  90 bytes       0  [emitted]  
    pageC.bundle.js  1.86 KiB       1  [emitted]  pageC
    Entrypoint pageC = pageC.bundle.js
    chunk    {0} 0.chunk.js 21 bytes {1} [rendered]
        > duplicate [3] ./page.js 2:0-23
        > duplicate [3] ./page.js 3:0-30
        > duplicate [3] ./page.js 4:0-37
        [1] ./b.js 21 bytes {0} [built]
    chunk    {1} pageC.bundle.js (pageC) 181 bytes [entry] [rendered]
        > pageC [3] ./page.js 
        [0] ./a.js 21 bytes {1} [built]
        [2] ./c.js 21 bytes {1} [built]
        [3] ./page.js 118 bytes {1} [built]
        [4] ./d.js 21 bytes {1} [built]
```
