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
	entry: {
		page: "./page"
	},
	output: outputOptions
}, {
	name: "pageA",
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
Hash: 92649f18837fbb021129ea807ff9294488030e7d297a4b5e23527060dcf866a6fc0a7d0ef06171d3
Version: webpack 2.3.2
Child page:
    Hash: 92649f18837fbb021129
             Asset       Size      Chunks             Chunk Names
        0.chunk.js  787 bytes  0, 1, 2, 3  [emitted]  
        1.chunk.js  595 bytes     1, 2, 3  [emitted]  
        2.chunk.js  403 bytes        2, 3  [emitted]  
        3.chunk.js  211 bytes           3  [emitted]  
    page.bundle.js    6.61 kB           4  [emitted]  page
    Entrypoint page = page.bundle.js
    chunk    {0} 0.chunk.js 84 bytes {4} [rendered]
        > [4] ./page.js 4:0-37
        [0] ./a.js 21 bytes {0} {1} {2} {3} [built]
        [1] ./b.js 21 bytes {0} {1} {2} [built]
        [2] ./c.js 21 bytes {0} {1} [built]
        [3] ./d.js 21 bytes {0} [built]
    chunk    {1} 1.chunk.js 63 bytes {4} [rendered]
        > [4] ./page.js 3:0-30
        [0] ./a.js 21 bytes {0} {1} {2} {3} [built]
        [1] ./b.js 21 bytes {0} {1} {2} [built]
        [2] ./c.js 21 bytes {0} {1} [built]
    chunk    {2} 2.chunk.js 42 bytes {4} [rendered]
        > [4] ./page.js 2:0-23
        [0] ./a.js 21 bytes {0} {1} {2} {3} [built]
        [1] ./b.js 21 bytes {0} {1} {2} [built]
    chunk    {3} 3.chunk.js 21 bytes {4} [rendered]
        > [4] ./page.js 1:0-16
        [0] ./a.js 21 bytes {0} {1} {2} {3} [built]
    chunk    {4} page.bundle.js (page) 118 bytes [entry] [rendered]
        > page [4] ./page.js 
        [4] ./page.js 118 bytes {4} [built]
Child pageA:
    Hash: ea807ff9294488030e7d
              Asset       Size   Chunks             Chunk Names
         0.chunk.js  604 bytes  0, 1, 2  [emitted]  
         1.chunk.js  412 bytes     1, 2  [emitted]  
         2.chunk.js  220 bytes        2  [emitted]  
    pageA.bundle.js     6.8 kB        3  [emitted]  pageA
    Entrypoint pageA = pageA.bundle.js
    chunk    {0} 0.chunk.js 63 bytes {3} [rendered]
        > [4] ./page.js 4:0-37
        [1] ./b.js 21 bytes {0} {1} {2} [built]
        [2] ./c.js 21 bytes {0} {1} [built]
        [3] ./d.js 21 bytes {0} [built]
    chunk    {1} 1.chunk.js 42 bytes {3} [rendered]
        > [4] ./page.js 3:0-30
        [1] ./b.js 21 bytes {0} {1} {2} [built]
        [2] ./c.js 21 bytes {0} {1} [built]
    chunk    {2} 2.chunk.js 21 bytes {3} [rendered]
        > [4] ./page.js 2:0-23
        [1] ./b.js 21 bytes {0} {1} {2} [built]
    chunk    {3} pageA.bundle.js (pageA) 139 bytes [entry] [rendered]
        > pageA [4] ./page.js 
        [0] ./a.js 21 bytes {3} [built]
        [4] ./page.js 118 bytes {3} [built]
Child pageB:
    Hash: 297a4b5e23527060dcf8
              Asset       Size  Chunks             Chunk Names
         0.chunk.js  421 bytes    0, 1  [emitted]  
         1.chunk.js  214 bytes       1  [emitted]  
    pageB.bundle.js    6.96 kB       2  [emitted]  pageB
    Entrypoint pageB = pageB.bundle.js
    chunk    {0} 0.chunk.js 42 bytes {2} [rendered]
        > [4] ./page.js 4:0-37
        [2] ./c.js 21 bytes {0} {1} [built]
        [3] ./d.js 21 bytes {0} [built]
    chunk    {1} 1.chunk.js 21 bytes {2} [rendered]
        > [4] ./page.js 3:0-30
        [2] ./c.js 21 bytes {0} {1} [built]
    chunk    {2} pageB.bundle.js (pageB) 160 bytes [entry] [rendered]
        > pageB [4] ./page.js 
        [0] ./a.js 21 bytes {2} [built]
        [1] ./b.js 21 bytes {2} [built]
        [4] ./page.js 118 bytes {2} [built]
Child pageC:
    Hash: 66a6fc0a7d0ef06171d3
              Asset       Size  Chunks             Chunk Names
         0.chunk.js  220 bytes       0  [emitted]  
    pageC.bundle.js    7.19 kB       1  [emitted]  pageC
    Entrypoint pageC = pageC.bundle.js
    chunk    {0} 0.chunk.js 21 bytes {1} [rendered]
        > duplicate [4] ./page.js 2:0-23
        > duplicate [4] ./page.js 3:0-30
        > duplicate [4] ./page.js 4:0-37
        [1] ./b.js 21 bytes {0} [built]
    chunk    {1} pageC.bundle.js (pageC) 181 bytes [entry] [rendered]
        > pageC [4] ./page.js 
        [0] ./a.js 21 bytes {1} [built]
        [2] ./c.js 21 bytes {1} [built]
        [3] ./d.js 21 bytes {1} [built]
        [4] ./page.js 118 bytes {1} [built]
```

## Minimized (uglify-js, no zip)

```
Hash: 92649f18837fbb021129ea807ff9294488030e7d297a4b5e23527060dcf866a6fc0a7d0ef06171d3
Version: webpack 2.3.2
Child page:
    Hash: 92649f18837fbb021129
             Asset       Size      Chunks             Chunk Names
        0.chunk.js  142 bytes  0, 1, 2, 3  [emitted]  
        1.chunk.js  111 bytes     1, 2, 3  [emitted]  
        2.chunk.js   80 bytes        2, 3  [emitted]  
        3.chunk.js   49 bytes           3  [emitted]  
    page.bundle.js    1.56 kB           4  [emitted]  page
    Entrypoint page = page.bundle.js
    chunk    {0} 0.chunk.js 84 bytes {4} [rendered]
        > [4] ./page.js 4:0-37
        [0] ./a.js 21 bytes {0} {1} {2} {3} [built]
        [1] ./b.js 21 bytes {0} {1} {2} [built]
        [2] ./c.js 21 bytes {0} {1} [built]
        [3] ./d.js 21 bytes {0} [built]
    chunk    {1} 1.chunk.js 63 bytes {4} [rendered]
        > [4] ./page.js 3:0-30
        [0] ./a.js 21 bytes {0} {1} {2} {3} [built]
        [1] ./b.js 21 bytes {0} {1} {2} [built]
        [2] ./c.js 21 bytes {0} {1} [built]
    chunk    {2} 2.chunk.js 42 bytes {4} [rendered]
        > [4] ./page.js 2:0-23
        [0] ./a.js 21 bytes {0} {1} {2} {3} [built]
        [1] ./b.js 21 bytes {0} {1} {2} [built]
    chunk    {3} 3.chunk.js 21 bytes {4} [rendered]
        > [4] ./page.js 1:0-16
        [0] ./a.js 21 bytes {0} {1} {2} {3} [built]
    chunk    {4} page.bundle.js (page) 118 bytes [entry] [rendered]
        > page [4] ./page.js 
        [4] ./page.js 118 bytes {4} [built]
Child pageA:
    Hash: ea807ff9294488030e7d
              Asset       Size   Chunks             Chunk Names
         0.chunk.js  112 bytes  0, 1, 2  [emitted]  
         1.chunk.js   81 bytes     1, 2  [emitted]  
         2.chunk.js   50 bytes        2  [emitted]  
    pageA.bundle.js     1.6 kB        3  [emitted]  pageA
    Entrypoint pageA = pageA.bundle.js
    chunk    {0} 0.chunk.js 63 bytes {3} [rendered]
        > [4] ./page.js 4:0-37
        [1] ./b.js 21 bytes {0} {1} {2} [built]
        [2] ./c.js 21 bytes {0} {1} [built]
        [3] ./d.js 21 bytes {0} [built]
    chunk    {1} 1.chunk.js 42 bytes {3} [rendered]
        > [4] ./page.js 3:0-30
        [1] ./b.js 21 bytes {0} {1} {2} [built]
        [2] ./c.js 21 bytes {0} {1} [built]
    chunk    {2} 2.chunk.js 21 bytes {3} [rendered]
        > [4] ./page.js 2:0-23
        [1] ./b.js 21 bytes {0} {1} {2} [built]
    chunk    {3} pageA.bundle.js (pageA) 139 bytes [entry] [rendered]
        > pageA [4] ./page.js 
        [0] ./a.js 21 bytes {3} [built]
        [4] ./page.js 118 bytes {3} [built]
Child pageB:
    Hash: 297a4b5e23527060dcf8
              Asset      Size  Chunks             Chunk Names
         0.chunk.js  82 bytes    0, 1  [emitted]  
         1.chunk.js  51 bytes       1  [emitted]  
    pageB.bundle.js   1.64 kB       2  [emitted]  pageB
    Entrypoint pageB = pageB.bundle.js
    chunk    {0} 0.chunk.js 42 bytes {2} [rendered]
        > [4] ./page.js 4:0-37
        [2] ./c.js 21 bytes {0} {1} [built]
        [3] ./d.js 21 bytes {0} [built]
    chunk    {1} 1.chunk.js 21 bytes {2} [rendered]
        > [4] ./page.js 3:0-30
        [2] ./c.js 21 bytes {0} {1} [built]
    chunk    {2} pageB.bundle.js (pageB) 160 bytes [entry] [rendered]
        > pageB [4] ./page.js 
        [0] ./a.js 21 bytes {2} [built]
        [1] ./b.js 21 bytes {2} [built]
        [4] ./page.js 118 bytes {2} [built]
Child pageC:
    Hash: 66a6fc0a7d0ef06171d3
              Asset      Size  Chunks             Chunk Names
         0.chunk.js  50 bytes       0  [emitted]  
    pageC.bundle.js   1.66 kB       1  [emitted]  pageC
    Entrypoint pageC = pageC.bundle.js
    chunk    {0} 0.chunk.js 21 bytes {1} [rendered]
        > duplicate [4] ./page.js 2:0-23
        > duplicate [4] ./page.js 3:0-30
        > duplicate [4] ./page.js 4:0-37
        [1] ./b.js 21 bytes {0} [built]
    chunk    {1} pageC.bundle.js (pageC) 181 bytes [entry] [rendered]
        > pageC [4] ./page.js 
        [0] ./a.js 21 bytes {1} [built]
        [2] ./c.js 21 bytes {1} [built]
        [3] ./d.js 21 bytes {1} [built]
        [4] ./page.js 118 bytes {1} [built]
```
