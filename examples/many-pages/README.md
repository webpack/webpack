# Info

This example illustrates webpack's algorithm for automatic deduplication using `optimization.splitChunks`.

This example application contains 7 pages, each importing 1-3 modules from the `node_modules` folder (vendor libs) and 0-3 modules from the `stuff` folder (application modules). In reality, an application is probably more complex, but the same mechanisms apply.

The following configuration is used:

- `optimization.splitChunks.chunks: "all"` - This opt-in into automatic splitting of initial chunks which is off by default
- `optimization.splitChunks.maxInitial/AsyncRequests: 20` - This opt-in into an HTTP2 optimized splitting mode by increasing the allowed amount of requests. The browser only supports 6 requests in parallel for HTTP1.1.

# Interpreting the result

- `pageA.js` the normal output files for the entrypoint `pageA`
- `vendors~pageD~pageE~pageF~pageG.js` vendor libs shared by these pages extracted into a separate output file when larger than the threshold in size
- `vendors~pageA.js` vendors only used by a single page but larger than the threshold in size
- `pageA~pageD~pageF.js` application modules shared by these pages and larger than the threshold in size

Here, the threshold is 40 bytes but by default (in a real application) 30kb.

Some modules are intentionally duplicated, i. e. `./stuff/s4.js` is shared by `pageA` and `pageC`, but it's the only shared module so no separate output file is created because it would be smaller than the threshold. A separate request (which comes with an overhead and worsen gzipping) is not worth the extra bytes.

Note: decreasing `maxInitial/AsyncRequest` will increase duplication further to reduce the number of requests. Duplication doesn't affect the initial page load, it only affects download size of navigations to other pages of the application.

## webpack.config.js

```
module.exports = {
	// mode: "development || "production",
	entry: {
		pageA: "./pages/a",
		pageB: "./pages/b",
		pageC: "./pages/c",
		pageD: "./pages/d",
		pageE: "./pages/e",
		pageF: "./pages/f",
		pageG: "./pages/g"
	},
	optimization: {
		splitChunks: {
			chunks: "all",
			maxInitialRequests: 20, // for HTTP2
			maxAsyncRequests: 20, // for HTTP2
			minSize: 40 // for example only: chosen to match 2 modules
			// omit minSize in real use case to use the default of 30kb
		}
	}
};
```

## Production mode

```
assets by chunk 772 bytes (id hint: vendors)
  asset 115.js 164 bytes [emitted] [minimized] (id hint: vendors)
  asset 833.js 164 bytes [emitted] [minimized] (id hint: vendors)
  asset 402.js 111 bytes [emitted] [minimized] (id hint: vendors)
  asset 497.js 111 bytes [emitted] [minimized] (id hint: vendors)
  asset 730.js 111 bytes [emitted] [minimized] (id hint: vendors)
  asset 777.js 111 bytes [emitted] [minimized] (id hint: vendors)
asset pageC.js 1.26 KiB [emitted] [minimized] (name: pageC)
asset pageB.js 1.26 KiB [emitted] [minimized] (name: pageB)
asset pageD.js 1.18 KiB [emitted] [minimized] (name: pageD)
asset pageF.js 1.18 KiB [emitted] [minimized] (name: pageF)
asset pageA.js 1.18 KiB [emitted] [minimized] (name: pageA)
asset pageE.js 1.17 KiB [emitted] [minimized] (name: pageE)
asset pageG.js 1.15 KiB [emitted] [minimized] (name: pageG)
asset 505.js 140 bytes [emitted] [minimized]
chunk (runtime: pageA, pageB, pageC) 115.js (id hint: vendors) 86 bytes [initial] [rendered] split chunk (cache group: defaultVendors)
  > ./pages/a pageA
  > ./pages/b pageB
  > ./pages/c pageC
  ./node_modules/m1.js 43 bytes [built] [code generated]
  ./node_modules/m2.js 43 bytes [built] [code generated]
chunk (runtime: pageB) pageB.js (pageB) 199 bytes (javascript) 3.02 KiB (runtime) [entry] [rendered]
  > ./pages/b pageB
  runtime modules 3.02 KiB 5 modules
  dependent modules 93 bytes [dependent] 3 modules
  ./pages/b.js 106 bytes [built] [code generated]
chunk (runtime: pageC) pageC.js (pageC) 199 bytes (javascript) 3.02 KiB (runtime) [entry] [rendered]
  > ./pages/c pageC
  runtime modules 3.02 KiB 5 modules
  dependent modules 93 bytes [dependent] 3 modules
  ./pages/c.js 106 bytes [built] [code generated]
chunk (runtime: pageE) pageE.js (pageE) 93 bytes (javascript) 3.02 KiB (runtime) [entry] [rendered]
  > ./pages/e pageE
  runtime modules 3.02 KiB 5 modules
  dependent modules 31 bytes [dependent] 1 module
  ./pages/e.js 62 bytes [built] [code generated]
chunk (runtime: pageC) 402.js (id hint: vendors) 43 bytes [initial] [rendered] split chunk (cache group: defaultVendors)
  > ./pages/c pageC
  ./node_modules/m5.js 43 bytes [built] [code generated]
chunk (runtime: pageA) pageA.js (pageA) 137 bytes (javascript) 3.02 KiB (runtime) [entry] [rendered]
  > ./pages/a pageA
  runtime modules 3.02 KiB 5 modules
  dependent modules 31 bytes [dependent] 1 module
  ./pages/a.js 106 bytes [built] [code generated]
chunk (runtime: pageB) 497.js (id hint: vendors) 43 bytes [initial] [rendered] split chunk (cache group: defaultVendors)
  > ./pages/b pageB
  ./node_modules/m4.js 43 bytes [built] [code generated]
chunk (runtime: pageA, pageD, pageF) 505.js 62 bytes [initial] [rendered] split chunk (cache group: default)
  > ./pages/a pageA
  > ./pages/d pageD
  > ./pages/f pageF
  ./stuff/s2.js 31 bytes [built] [code generated]
  ./stuff/s3.js 31 bytes [built] [code generated]
chunk (runtime: pageG) pageG.js (pageG) 67 bytes (javascript) 3.02 KiB (runtime) [entry] [rendered]
  > ./pages/g pageG
  runtime modules 3.02 KiB 5 modules
  dependent modules 31 bytes [dependent] 1 module
  ./pages/g.js 36 bytes [built] [code generated]
chunk (runtime: pageD) pageD.js (pageD) 137 bytes (javascript) 3.02 KiB (runtime) [entry] [rendered]
  > ./pages/d pageD
  runtime modules 3.02 KiB 5 modules
  dependent modules 31 bytes [dependent] 1 module
  ./pages/d.js 106 bytes [built] [code generated]
chunk (runtime: pageA) 730.js (id hint: vendors) 43 bytes [initial] [rendered] split chunk (cache group: defaultVendors)
  > ./pages/a pageA
  ./node_modules/m3.js 43 bytes [built] [code generated]
chunk (runtime: pageD, pageE, pageF, pageG) 777.js (id hint: vendors) 43 bytes [initial] [rendered] split chunk (cache group: defaultVendors)
  > ./pages/d pageD
  > ./pages/e pageE
  > ./pages/f pageF
  > ./pages/g pageG
  ./node_modules/m6.js 43 bytes [built] [code generated]
chunk (runtime: pageF) pageF.js (pageF) 137 bytes (javascript) 3.02 KiB (runtime) [entry] [rendered]
  > ./pages/f pageF
  runtime modules 3.02 KiB 5 modules
  dependent modules 31 bytes [dependent] 1 module
  ./pages/f.js 106 bytes [built] [code generated]
chunk (runtime: pageD, pageE, pageF) 833.js (id hint: vendors) 86 bytes [initial] [rendered] split chunk (cache group: defaultVendors)
  > ./pages/d pageD
  > ./pages/e pageE
  > ./pages/f pageF
  ./node_modules/m7.js 43 bytes [built] [code generated]
  ./node_modules/m8.js 43 bytes [built] [code generated]
webpack 5.51.1 compiled successfully
```
