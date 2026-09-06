# example.js

```javascript
console.log("app");
```

# webpack.config.js

`output.copy` copies files and directories into `output.path` as part of the
build: they become real assets, so `output.clean`, the stats output and the
watcher all see them, and a rebuild re-reads only what changed.

A pattern is a `from` plus optional `to`, `filename`, `context`, `globOptions`,
`info` and `transform`. Here the first copies a directory (keeping its structure
below itself) and the second copies **two** roots into one destination, in
order.

The config also registers a small plugin that merges several copied assets into
one — `copy-webpack-plugin`'s `transformAll`. `output.copy` has no equivalent
on purpose: one source file becomes one asset there, so merging is a second pass
over what it emitted, and a second pass is a plugin. The whole of it is below,
caching included: pick the copied assets you want (they carry `info.copied`),
key a cache item on their contents, emit the merged asset and delete the parts.

```javascript
"use strict";

const { Compilation, sources } = require("webpack");

/** @import { Compiler } from "webpack" */

const PLUGIN_NAME = "MergeCopiedAssetsPlugin";

/**
 * @typedef {object} MergeCopiedAssetsPluginOptions
 * @property {RegExp} include which copied assets are merged
 * @property {string} filename name of the merged asset, relative to `output.path`
 * @property {(files: { name: string, content: Buffer }[]) => string | Buffer} merge builds the content of the merged asset
 */

/**
 * Merges several copied assets into one, which is what `copy-webpack-plugin`'s
 * `transformAll` does. `output.copy` has no equivalent on purpose: one source
 * file becomes one asset there, so merging is a second pass over what it
 * emitted — which any plugin can do, in about thirty lines.
 */
class MergeCopiedAssetsPlugin {
	/**
	 * @param {MergeCopiedAssetsPluginOptions} options options
	 */
	constructor(options) {
		this.options = options;
	}

	/**
	 * @param {Compiler} compiler the compiler
	 * @returns {void}
	 */
	apply(compiler) {
		const { include, filename, merge } = this.options;

		compiler.hooks.thisCompilation.tap(PLUGIN_NAME, (compilation) => {
			const cache = compilation.getCache(PLUGIN_NAME);

			compilation.hooks.processAssets.tapPromise(
				{
					name: PLUGIN_NAME,
					// `output.copy` emits at PROCESS_ASSETS_STAGE_ADDITIONAL, so the
					// merge runs at the next stage, over what it left behind
					stage: Compilation.PROCESS_ASSETS_STAGE_DERIVED
				},
				async () => {
					// sorted so the merged content does not depend on emit order
					const assets = compilation
						.getAssets()
						.filter((asset) => asset.info.copied && include.test(asset.name))
						.sort((a, b) => (a.name < b.name ? -1 : 1));
					if (assets.length === 0) return;

					// the content of every part decides whether a merged asset from an
					// earlier build still holds, so their etags are what it is keyed on
					const etag = assets
						.map((asset) => cache.getLazyHashedEtag(asset.source))
						.reduce((a, b) => cache.mergeEtags(a, b));
					const itemCache = cache.getItemCache(filename, etag);

					let merged = await itemCache.getPromise();
					if (!merged) {
						merged = new sources.RawSource(
							merge(
								assets.map((asset) => ({
									name: asset.name,
									content: asset.source.buffer()
								}))
							)
						);
						await itemCache.storePromise(merged);
					}

					compilation.emitAsset(filename, merged, { copied: true });
					for (const asset of assets) compilation.deleteAsset(asset.name);
				}
			);
		});
	}
}

/** @type {import("webpack").Configuration} */
const config = {
	output: {
		copy: [
			// a directory keeps its structure below itself
			"static",
			// several sources into one destination, in order
			{ from: ["licenses/*.txt", "vendor/licenses/*.txt"], to: "licenses" }
		]
	},
	plugins: [
		new MergeCopiedAssetsPlugin({
			include: /^licenses\//,
			filename: "THIRD_PARTY_LICENSES.txt",
			merge: (files) =>
				files
					.map((file) => `/* ${file.name} */\n${file.content.toString()}`)
					.join("\n")
		})
	]
};

module.exports = config;
```

# dist/THIRD_PARTY_LICENSES.txt

Both `licenses/` roots merged into one asset; the parts are gone from the
output, because the plugin deleted them.

```
/* licenses/acorn.txt */
acorn - MIT

/* licenses/tapable.txt */
tapable - MIT

/* licenses/webpack.txt */
webpack - MIT
```

# dist/robots.txt

```
User-agent: *
Allow: /
```

# Info

## Unoptimized

```
assets by path *.txt 144 bytes
  asset THIRD_PARTY_LICENSES.txt 121 bytes [emitted] [copied]
  asset robots.txt 23 bytes [emitted] [from: static/robots.txt] [copied]
asset output.js 222 bytes [emitted] (name: main)
asset index.html 69 bytes [emitted] [from: static/index.html] [copied]
chunk (runtime: main) output.js (main) 20 bytes [entry] [rendered]
  > ./example.js main
  ./example.js 20 bytes [built] [code generated]
    [used exports unknown]
    entry ./example.js main
webpack X.X.X compiled successfully
```

## Production mode

```
assets by path *.txt 144 bytes
  asset THIRD_PARTY_LICENSES.txt 121 bytes [emitted] [copied]
  asset robots.txt 23 bytes [emitted] [from: static/robots.txt] [copied]
asset index.html 64 bytes [emitted] [from: static/index.html] [copied] [minimized]
asset output.js 19 bytes [emitted] [minimized] (name: main)
chunk (runtime: main) output.js (main) 20 bytes [entry] [rendered]
  > ./example.js main
  ./example.js 20 bytes [built] [code generated]
    [no exports used]
    entry ./example.js main
webpack X.X.X compiled successfully
```
