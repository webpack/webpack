# example.js

```javascript
console.log("app");
```

# webpack.config.js

`output.copy` copies files and directories into `output.path` as part of the
build: they become real assets, so `output.clean`, the stats output and the
watcher all see them, and a rebuild re-reads only what changed.

A pattern is a `from` plus optional `to`, `filename`, `context`, `globOptions`,
`info`, `transform`, `preservePermissions` and `preserveTimestamps`. `to` and
`info` may each be a function of the copied file, and `filename` is a webpack
filename template, so one pattern can rename, flatten and hash.

`output.copy` takes a string or a list of patterns. The plugin behind it takes
`concurrency` and the `processAssets` `stage` as well, so reach for
`new webpack.CopyPlugin({ patterns, concurrency, stage })` when you need those —
the config below copies a prebuilt vendor bundle that way. `stage` decides which
asset-processing taps see what was copied; it is not how a file is kept out of
the minimizer, which re-runs for assets added at any later stage. `info:
{ minimized: true }` is what leaves an already-built file alone.

The config also registers a small plugin that merges several copied assets into
one — `copy-webpack-plugin`'s `transformAll`. `output.copy` has no equivalent
on purpose: one source file becomes one asset there, so merging is a second pass
over what it emitted, and a second pass is a plugin. The whole of it is below,
caching included: pick the copied assets you want (they carry `info.copied`),
key a cache item on their contents, emit the merged asset and delete the parts.

```javascript
"use strict";

const { Compilation, CopyPlugin, sources } = require("webpack");

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
			{ from: ["licenses/*.txt", "vendor/licenses/*.txt"], to: "licenses" },
			// a filename template renames, flattens and hashes
			{ from: "img", to: "i", filename: "[name].[contenthash][ext]" },
			// a glob, matched by rules of its own
			{
				from: "static/**/*.html",
				to: "pages",
				globOptions: { dot: false, deep: 2 }
			},
			// content rewritten on the way through, cached on what it reads
			{
				from: "config.json",
				to: "runtime",
				transform: (content) =>
					content.toString().replace("__API__", "https://example.com")
			},
			// an executable keeps the bit and the time it carried
			{ from: "bin", preservePermissions: true, preserveTimestamps: true },
			// `to` and `info` decide per file
			{
				from: "img",
				to: (file) => (file.filename.endsWith(".css") ? "css" : "media"),
				info: (file) => ({ immutable: file.filename.endsWith(".png") })
			}
		]
	},
	plugins: [
		// the plugin behind `output.copy` is where `concurrency` and `stage` live;
		// `stage` decides which asset-processing taps see what it copied
		new CopyPlugin({
			patterns: [
				{
					from: "*.min.js",
					context: "vendor",
					to: "vendor",
					// the minimizer re-runs for assets added at any later stage, so
					// this, not a late `stage`, is what leaves a built file alone
					info: { minimized: true }
				}
			],
			concurrency: 50,
			stage: Compilation.PROCESS_ASSETS_STAGE_ADDITIONS
		}),
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
assets by info 45 bytes [immutable]
  asset i/theme.8ccbfb9fb3c821e1dd83.css 17 bytes [emitted] [immutable] [from: img/theme.css] [copied]
  asset i/logo.e47e9a6166b71dc30cfe.png 14 bytes [emitted] [immutable] [from: img/logo.png] [copied]
  asset media/logo.png 14 bytes [emitted] [immutable] [from: img/logo.png] [copied]
assets by path *.txt 144 bytes
  asset THIRD_PARTY_LICENSES.txt 121 bytes [emitted] [copied]
  asset robots.txt 23 bytes [emitted] [from: static/robots.txt] [copied]
asset output.js 222 bytes [emitted] (name: main)
asset vendor/analytics.min.js 72 bytes [emitted] [from: vendor/analytics.min.js] [copied]
asset index.html 69 bytes [emitted] [from: static/index.html] [copied]
asset pages/index.html 69 bytes [emitted] [from: static/index.html] [copied]
asset runtime/config.json 33 bytes [emitted] [from: config.json] [copied]
asset build.sh 21 bytes [emitted] [from: bin/build.sh] [copied]
asset css/theme.css 17 bytes [emitted] [from: img/theme.css] [copied]
chunk (runtime: main) output.js (main) 20 bytes [entry] [rendered]
  > ./example.js main
  ./example.js 20 bytes [built] [code generated]
    [used exports unknown]
    entry ./example.js main
webpack X.X.X compiled successfully
```

## Production mode

```
assets by info 44 bytes [immutable]
  asset i/theme.b14868eb69d5641a6129.css 16 bytes [emitted] [immutable] [from: img/theme.css] [copied] [minimized]
  asset i/logo.e47e9a6166b71dc30cfe.png 14 bytes [emitted] [immutable] [from: img/logo.png] [copied]
  asset media/logo.png 14 bytes [emitted] [immutable] [from: img/logo.png] [copied]
assets by path *.txt 144 bytes
  asset THIRD_PARTY_LICENSES.txt 121 bytes [emitted] [copied]
  asset robots.txt 23 bytes [emitted] [from: static/robots.txt] [copied]
asset vendor/analytics.min.js 72 bytes [emitted] [from: vendor/analytics.min.js] [copied] [minimized]
asset index.html 64 bytes [emitted] [from: static/index.html] [copied] [minimized]
asset pages/index.html 64 bytes [emitted] [from: static/index.html] [copied] [minimized]
asset runtime/config.json 33 bytes [emitted] [from: config.json] [copied]
asset build.sh 21 bytes [emitted] [from: bin/build.sh] [copied]
asset output.js 19 bytes [emitted] [minimized] (name: main)
asset css/theme.css 16 bytes [emitted] [from: img/theme.css] [copied] [minimized]
chunk (runtime: main) output.js (main) 20 bytes [entry] [rendered]
  > ./example.js main
  ./example.js 20 bytes [built] [code generated]
    [no exports used]
    entry ./example.js main
webpack X.X.X compiled successfully
```
