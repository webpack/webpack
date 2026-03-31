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
"use strict";

/** @type {import("webpack").Configuration} */
const config = {
	// mode: "development" || "production",
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

module.exports = config;
```

## Production mode

```
assets by chunk 748 bytes (id hint: vendors)
  asset 454.js 158 bytes [emitted] [minimized] (id hint: vendors)
  asset 778.js 158 bytes [emitted] [minimized] (id hint: vendors)
  asset 122.js 108 bytes [emitted] [minimized] (id hint: vendors)
  asset 301.js 108 bytes [emitted] [minimized] (id hint: vendors)
  asset 811.js 108 bytes [emitted] [minimized] (id hint: vendors)
  asset 876.js 108 bytes [emitted] [minimized] (id hint: vendors)
asset pageB.js 1.24 KiB [emitted] [minimized] (name: pageB)
asset pageC.js 1.24 KiB [emitted] [minimized] (name: pageC)
asset pageA.js 1.17 KiB [emitted] [minimized] (name: pageA)
asset pageD.js 1.17 KiB [emitted] [minimized] (name: pageD)
asset pageF.js 1.17 KiB [emitted] [minimized] (name: pageF)
asset pageE.js 1.15 KiB [emitted] [minimized] (name: pageE)
asset pageG.js 1.13 KiB [emitted] [minimized] (name: pageG)
asset 554.js 133 bytes [emitted] [minimized]
runtime modules 21.1 KiB 35 modules
cacheable modules 1.23 KiB
  modules by path ./node_modules/*.js 344 bytes
    ./node_modules/m1.js 43 bytes [built] [code generated]
    ./node_modules/m2.js 43 bytes [built] [code generated]
    + 6 modules
  modules by path ./stuff/*.js 248 bytes
    ./stuff/s2.js 31 bytes [built] [code generated]
    ./stuff/s3.js 31 bytes [built] [code generated]
    + 6 modules
  modules by path ./pages/*.js 671 bytes
    ./pages/a.js 113 bytes [built] [code generated]
    ./pages/b.js 113 bytes [built] [code generated]
    ./pages/c.js 113 bytes [built] [code generated]
    + 4 modules
webpack X.X.X compiled successfully
```
