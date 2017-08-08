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
Hash: 32754229c1b49aaf5dd3020f354a206f830a17560d92a3529fe0380101f3e2c85f80fcddae09adcf
Version: webpack 3.5.1
Child page:
    Hash: 32754229c1b49aaf5dd3
             Asset       Size      Chunks             Chunk Names
        0.chunk.js  800 bytes  0, 1, 2, 3  [emitted]  
        1.chunk.js  598 bytes     1, 2, 3  [emitted]  
        2.chunk.js  405 bytes        2, 3  [emitted]  
        3.chunk.js  212 bytes           3  [emitted]  
    page.bundle.js    6.62 kB           4  [emitted]  page
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
    Hash: 020f354a206f830a1756
              Asset       Size   Chunks             Chunk Names
         0.chunk.js  616 bytes  0, 1, 2  [emitted]  
         1.chunk.js  414 bytes     1, 2  [emitted]  
         2.chunk.js  221 bytes        2  [emitted]  
    pageA.bundle.js    6.83 kB        3  [emitted]  pageA
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
    Hash: 0d92a3529fe0380101f3
              Asset       Size  Chunks             Chunk Names
         0.chunk.js  432 bytes    0, 1  [emitted]  
         1.chunk.js  215 bytes       1  [emitted]  
    pageB.bundle.js    7.02 kB       2  [emitted]  pageB
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
    Hash: e2c85f80fcddae09adcf
              Asset       Size  Chunks             Chunk Names
         0.chunk.js  221 bytes       0  [emitted]  
    pageC.bundle.js    7.23 kB       1  [emitted]  pageC
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
Hash: 32754229c1b49aaf5dd3020f354a206f830a17560d92a3529fe0380101f3e2c85f80fcddae09adcf
Version: webpack 3.5.1
Child page:
    Hash: 32754229c1b49aaf5dd3
             Asset       Size      Chunks             Chunk Names
        0.chunk.js  143 bytes  0, 1, 2, 3  [emitted]  
        1.chunk.js  111 bytes     1, 2, 3  [emitted]  
        2.chunk.js   80 bytes        2, 3  [emitted]  
        3.chunk.js   49 bytes           3  [emitted]  
    page.bundle.js    1.54 kB           4  [emitted]  page
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
    Hash: 020f354a206f830a1756
              Asset       Size   Chunks             Chunk Names
         0.chunk.js  113 bytes  0, 1, 2  [emitted]  
         1.chunk.js   81 bytes     1, 2  [emitted]  
         2.chunk.js   50 bytes        2  [emitted]  
    pageA.bundle.js    1.59 kB        3  [emitted]  pageA
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
    Hash: 0d92a3529fe0380101f3
              Asset      Size  Chunks             Chunk Names
         0.chunk.js  83 bytes    0, 1  [emitted]  
         1.chunk.js  51 bytes       1  [emitted]  
    pageB.bundle.js   1.64 kB       2  [emitted]  pageB
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
    Hash: e2c85f80fcddae09adcf
              Asset      Size  Chunks             Chunk Names
         0.chunk.js  50 bytes       0  [emitted]  
    pageC.bundle.js   1.65 kB       1  [emitted]  pageC
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
