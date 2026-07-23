This example demonstrates the experimental HTML modules support
(`experiments.html`) in two ways:

- **HTML entry point** (`./src/index.html`): emitted as a standalone
  `dist/index.html`. Its `<link rel="stylesheet">`, inline `<style>`,
  `<script src>`, inline `<script>`, `<img src>` and `<img srcset>` are all
  bundled, and the references are rewritten to the emitted assets.
- **HTML imported from JavaScript**: the page's `<script src="./app.js">`
  imports `./src/fragment.html`. An HTML module imported from JS exports its
  URL-rewritten HTML as a string and is _not_ emitted as a standalone file.
  There is no JavaScript entry point — the script is reached through the HTML.

It also shows how to **generate a modern favicon set and web app manifest, and
inject them** — without that being a core feature. `GenerateFaviconPlugin` builds
a `favicon.ico`, an `apple-touch-icon`, `192`/`512` manifest icons and a
`manifest.webmanifest` from `src/logo.png`, and caches the whole set with
`compilation.getCache()` keyed by the source's content hash — so the generation
only reruns when the logo changes. (Resizing to each size is the one step a real
plugin does with an image library like sharp/jimp; the example keeps the bytes
as-is so it needs no dependency.) It then injects the `<link rel="icon">`,
`<link rel="apple-touch-icon">`, `<link rel="manifest">` and
`<meta name="theme-color">` tags into every emitted page through the
`output.html` `injectTags` hook.

# webpack.config.js

```javascript
"use strict";

const fs = require("fs");
const path = require("path");
const {
	html: { HtmlModulesPlugin }
} = require("../../");

// The modern icon set a web app ships: a legacy `favicon.ico`, an
// `apple-touch-icon`, two manifest icons, and a theme color.
const APPLE_TOUCH_SIZE = 180;
const MANIFEST_SIZES = [192, 512];
const THEME_COLOR = "#8ed6fb";

// Resize the source icon to a square `size`. A real plugin does this with an
// image library (sharp / jimp); this example keeps the bytes as-is so it runs
// with no dependency — swap in a resizer for production. This is the one step
// the cache below exists to skip on rebuilds.
const resize = (png, _size) => png;

// Wrap a PNG buffer in a single-image ICO container (header + PNG bytes) — a
// real, dependency-free `favicon.ico`.
const pngToIco = (png) => {
	const header = Buffer.alloc(6);
	header.writeUInt16LE(1, 2); // type: icon
	header.writeUInt16LE(1, 4); // one image
	const entry = Buffer.alloc(16);
	// width/height 0 means 256; planes 1, 32bpp; then size and offset (6 + 16).
	entry.writeUInt16LE(1, 4);
	entry.writeUInt16LE(32, 6);
	entry.writeUInt32LE(png.length, 8);
	entry.writeUInt32LE(22, 12);
	return Buffer.concat([header, entry, png]);
};

// Generates a full favicon set + web app manifest from `src/logo.png`, cached by
// the source's content hash so the generation only reruns when the logo changes,
// and injects all the `<link>`/`<meta>` tags via the `injectTags` hook.
class GenerateFaviconPlugin {
	/**
	 * @param {import("../../").Compiler} compiler the compiler
	 */
	apply(compiler) {
		const NAME = "GenerateFaviconPlugin";
		const { RawSource } = compiler.webpack.sources;
		const source = path.resolve(__dirname, "src/logo.png");

		compiler.hooks.thisCompilation.tap(NAME, (compilation) => {
			compilation.hooks.processAssets.tapPromise(
				{
					name: NAME,
					stage: compiler.webpack.Compilation.PROCESS_ASSETS_STAGE_ADDITIONAL
				},
				async () => {
					const png = fs.readFileSync(source);
					// Rebuild the set when the source changes in watch mode.
					compilation.fileDependencies.add(source);
					const cache = compilation.getCache(NAME);
					const etag = cache.getLazyHashedEtag(new RawSource(png));
					const item = cache.getItemCache("favicon-set", etag);
					let files = await item.getPromise();
					if (!files) {
						/** @type {Record<string, Buffer>} */
						files = {
							"favicon.ico": pngToIco(png),
							"apple-touch-icon.png": resize(png, APPLE_TOUCH_SIZE)
						};
						const icons = MANIFEST_SIZES.map((size) => {
							const src = `icon-${size}.png`;
							files[src] = resize(png, size);
							return { src, sizes: `${size}x${size}`, type: "image/png" };
						});
						files["manifest.webmanifest"] = Buffer.from(
							JSON.stringify({
								name: "webpack HTML example",
								display: "standalone",
								// eslint-disable-next-line camelcase
								theme_color: THEME_COLOR,
								icons
							})
						);
						await item.storePromise(files);
					}
					for (const name of Object.keys(files)) {
						compilation.emitAsset(name, new RawSource(files[name]));
					}
				}
			);

			HtmlModulesPlugin.getCompilationHooks(compilation).injectTags.tap(
				NAME,
				(tags) => {
					tags.push(
						{
							tag: "link",
							attrs: { rel: "icon", sizes: "any", href: "favicon.ico" },
							injectTo: "head"
						},
						{
							tag: "link",
							attrs: {
								rel: "apple-touch-icon",
								sizes: `${APPLE_TOUCH_SIZE}x${APPLE_TOUCH_SIZE}`,
								href: "apple-touch-icon.png"
							},
							injectTo: "head"
						},
						{
							tag: "link",
							attrs: { rel: "manifest", href: "manifest.webmanifest" },
							injectTo: "head"
						},
						{
							tag: "meta",
							attrs: { name: "theme-color", content: THEME_COLOR },
							injectTo: "head"
						}
					);
					return tags;
				}
			);
		});
	}
}

/** @type {import("../../").Configuration} */
const config = {
	// `target: "web"` makes the CSS generator emit `.css` chunks (for the
	// `<link rel="stylesheet">` and the inline `<style>`).
	target: "web",
	entry: {
		// Only an HTML entry point — no JavaScript entry. Its stylesheet,
		// scripts (external and inline), inline style and images are all
		// discovered from the HTML and bundled, and `dist/index.html` is
		// emitted with every reference rewritten.
		page: "./src/index.html"
	},
	experiments: {
		html: true,
		css: true
	},
	// Generates the favicon set + `manifest.webmanifest` (cached) and injects
	// their tags.
	plugins: [new GenerateFaviconPlugin()]
};

module.exports = config;
```

# src/index.html

```html
<!DOCTYPE html>
<html lang="en">
	<head>
		<meta charset="utf-8" />
		<title>HTML modules</title>

		<!-- External stylesheet: goes through webpack's CSS pipeline and the
		     emitted `.css` chunk is referenced here. -->
		<link rel="stylesheet" href="./styles.css" />

		<!-- Inline <style>: bundled as a CSS module; its `url()` references
		     become asset dependencies. -->
		<style>
			body {
				font-family: sans-serif;
				margin: 2rem;
			}
		</style>
	</head>
	<body>
		<h1>HTML modules</h1>

		<!-- Plain image source -->
		<img src="./logo.png" alt="logo" width="150" />

		<!-- Responsive image: every candidate in `srcset` is bundled -->
		<img
			src="./logo.png"
			srcset="./logo.png 1x, ./logo@2x.png 2x"
			alt="responsive logo"
			width="150"
		/>

		<!-- External script: turned into a webpack entry, tag rewritten to
		     the emitted bundle. This one imports an HTML module as a string
		     (see app.js), so HTML-via-import is exercised without a JS
		     entry point. -->
		<script src="./app.js"></script>

		<!-- Inline script: its body is bundled and the tag is rewritten to a
		     `<script src>` pointing at the emitted chunk. -->
		<script>
			console.log("inline script, bundled by webpack");
		</script>
	</body>
</html>
```

# src/app.js

```javascript
// Loaded by the HTML entry via `<script src="./app.js">`. It imports an HTML
// module as a string: an HTML module imported from JavaScript exports its
// (URL-rewritten) HTML and, because it isn't an entry, is NOT emitted as a
// standalone `.html` file.
import fragment from "./fragment.html";

const container = document.createElement("div");
container.innerHTML = fragment;
document.body.appendChild(container);
```

# src/fragment.html

```html
<section class="fragment">
	<h2>Imported fragment</h2>
	<img src="./logo.png" alt="logo" width="75" />
</section>
```

# src/styles.css

```css
h1 {
	color: rebeccapurple;
}

img {
	border: 1px solid #ccc;
}
```

# dist/index.html

The HTML entry point, emitted as a standalone file with every reference
rewritten to the bundled asset.

```html
<!DOCTYPE html>
<html lang="en">
	<head>
		<meta charset="utf-8" />
		<title>HTML modules</title>

		<!-- External stylesheet: goes through webpack's CSS pipeline and the
		     emitted `.css` chunk is referenced here. -->
		<link rel="stylesheet" href="__html_6d047296_0.css" />

		<!-- Inline <style>: bundled as a CSS module; its `url()` references
		     become asset dependencies. -->
		<style>/*!********************************************************************************************************************************************!*\
  !*** css data:text/css;base64,CgkJCWJvZHkgewoJCQkJZm9udC1mYW1pbHk6IHNhbnMtc2VyaWY7CgkJCQltYXJnaW46IDJyZW07CgkJCX0KCQk= (exportType: text) ***!
  \********************************************************************************************************************************************/

			body {
				font-family: sans-serif;
				margin: 2rem;
			}
		
</style><link rel="icon" sizes="any" href="favicon.ico"><link rel="apple-touch-icon" sizes="180x180" href="apple-touch-icon.png"><link rel="manifest" href="manifest.webmanifest"><meta name="theme-color" content="#8ed6fb">
	</head>
	<body>
		<h1>HTML modules</h1>

		<!-- Plain image source -->
		<img src="89a353e9c515885abd8e.png" alt="logo" width="150" />

		<!-- Responsive image: every candidate in `srcset` is bundled -->
		<img
			src="89a353e9c515885abd8e.png"
			srcset="89a353e9c515885abd8e.png 1x, eda8c35d5b9a24e8efa6.png 2x"
			alt="responsive logo"
			width="150"
		/>

		<!-- External script: turned into a webpack entry, tag rewritten to
		     the emitted bundle. This one imports an HTML module as a string
		     (see app.js), so HTML-via-import is exercised without a JS
		     entry point. -->
		<script src="__html_6d047296_1.js"></script>

		<!-- Inline script: its body is bundled and the tag is rewritten to a
		     `<script src>` pointing at the emitted chunk. -->
		<script src="__html_6d047296_2.js"></script>
	</body>
</html>
```

# Info

## Unoptimized

```
assets by path *.png 77.9 KiB
  assets by info 34.2 KiB [immutable]
    asset eda8c35d5b9a24e8efa6.png 19.6 KiB [emitted] [immutable] [from: src/logo@2x.png] (auxiliary name: page)
    asset 89a353e9c515885abd8e.png 14.6 KiB [emitted] [immutable] [from: src/logo.png] (auxiliary name: __html_6d047296_1, page)
  asset apple-touch-icon.png 14.6 KiB [emitted]
  asset icon-192.png 14.6 KiB [emitted]
  asset icon-512.png 14.6 KiB [emitted]
assets by path *.js 11.4 KiB
  asset __html_6d047296_1.js 6.84 KiB [emitted] (name: __html_6d047296_1)
  asset page.js 3.57 KiB [emitted] (name: page)
  asset __html_6d047296_2.js 1.01 KiB [emitted] (name: __html_6d047296_2)
asset favicon.ico 14.6 KiB [emitted]
asset index.html 1.91 KiB [emitted] (auxiliary name: page)
asset manifest.webmanifest 208 bytes [emitted]
asset __html_6d047296_0.css 166 bytes [emitted] (name: __html_6d047296_0)
chunk (runtime: __html_6d047296_0) __html_6d047296_0.css (__html_6d047296_0) 64 bytes (css) 0 bytes (runtime) [entry] [rendered]
  > ./styles.css __html_6d047296_0
  runtime modules 0 bytes 1 module
  css ./src/styles.css 64 bytes [built] [code generated]
    [no exports]
    [used exports unknown]
    entry ./styles.css __html_6d047296_0
chunk (runtime: __html_6d047296_1) __html_6d047296_1.js (__html_6d047296_1) 541 bytes (javascript) 14.6 KiB (asset) 42 bytes (asset-url) 2.7 KiB (runtime) [entry] [rendered]
  > ./app.js __html_6d047296_1
  runtime modules 2.7 KiB 4 modules
  dependent modules 124 bytes (javascript) 14.6 KiB (asset) 42 bytes (asset-url) [dependent] 2 modules
  ./src/app.js 417 bytes [built] [code generated]
    [no exports]
    [used exports unknown]
    entry ./app.js __html_6d047296_1
chunk (runtime: __html_6d047296_1) __html_6d047296_2.js (__html_6d047296_2) 56 bytes [initial] [rendered]
  > data:text/javascript;base64,CgkJCWNvbnNvbGUubG9nKCJpbmxpbmUgc2NyaXB0LCBidW5kbGVkIGJ5IHdlYnBhY2siKTsKCQk= __html_6d047296_2
  data:text/javascript;base64,CgkJCWNvbnNvbGUu.. 56 bytes [built] [code generated]
    [no exports]
    [used exports unknown]
    entry data:text/javascript;base64,CgkJCWNvbnNvbGUu.. __html_6d047296_2
chunk (runtime: page) page.js (page) 34.2 KiB (asset) 84 bytes (asset-url) 65 bytes (css-text) 1.24 KiB (javascript) 1.23 KiB (html) [entry] [rendered]
  > ./src/index.html page
  dependent modules 34.2 KiB (asset) 84 bytes (asset-url) 65 bytes (css-text) [dependent] 3 modules
  ./src/index.html 1.24 KiB (javascript) 1.23 KiB (html) [built] [code generated]
    [exports: default]
    [used exports unknown]
    entry ./src/index.html page
webpack X.X.X compiled successfully
```

## Production mode

```
assets by path *.png 77.9 KiB
  assets by info 34.2 KiB [immutable]
    asset eda8c35d5b9a24e8efa6.png 19.6 KiB [emitted] [immutable] [from: src/logo@2x.png] (auxiliary name: page)
    asset 89a353e9c515885abd8e.png 14.6 KiB [emitted] [immutable] [from: src/logo.png] (auxiliary name: __html_6d047296_1, page)
  asset apple-touch-icon.png 14.6 KiB [emitted]
  asset icon-192.png 14.6 KiB [emitted]
  asset icon-512.png 14.6 KiB [emitted]
assets by path *.js 4.23 KiB
  asset page.js 2.29 KiB [emitted] [minimized] (name: page)
  asset __html_6d047296_1.js 1.8 KiB [emitted] [minimized] (name: __html_6d047296_1)
  asset __html_6d047296_2.js 143 bytes [emitted] [minimized] (name: __html_6d047296_2)
asset favicon.ico 14.6 KiB [emitted]
asset index.html 1.48 KiB [emitted] (auxiliary name: page)
asset manifest.webmanifest 208 bytes [emitted]
asset __html_6d047296_0.css 65 bytes [emitted] (name: __html_6d047296_0)
chunk (runtime: __html_6d047296_0) __html_6d047296_0.css (__html_6d047296_0) 64 bytes (css) 0 bytes (runtime) [entry] [rendered]
  > ./styles.css __html_6d047296_0
  runtime modules 0 bytes 1 module
  css ./src/styles.css 64 bytes [built] [code generated]
    [no exports]
    [no exports used]
    entry ./styles.css __html_6d047296_0
chunk (runtime: page) page.js (page) 34.2 KiB (asset) 1.28 KiB (javascript) 84 bytes (asset-url) 65 bytes (css-text) 1.23 KiB (html) 1.21 KiB (runtime) [entry] [rendered]
  > ./src/index.html page
  dependent modules 34.2 KiB (asset) 42 bytes (javascript) 84 bytes (asset-url) 65 bytes (css-text) [dependent] 3 modules
  runtime modules 1.21 KiB 2 modules
  ./src/index.html 1.24 KiB (javascript) 1.23 KiB (html) [built] [code generated]
    [exports: default]
    [no exports used]
    entry ./src/index.html page
chunk (runtime: __html_6d047296_1) __html_6d047296_2.js (__html_6d047296_2) 56 bytes [initial] [rendered]
  > data:text/javascript;base64,CgkJCWNvbnNvbGUubG9nKCJpbmxpbmUgc2NyaXB0LCBidW5kbGVkIGJ5IHdlYnBhY2siKTsKCQk= __html_6d047296_2
  data:text/javascript;base64,CgkJCWNvbnNvbGUu.. 56 bytes [built] [code generated]
    [no exports]
    [no exports used]
    entry data:text/javascript;base64,CgkJCWNvbnNvbGUu.. __html_6d047296_2
chunk (runtime: __html_6d047296_1) __html_6d047296_1.js (__html_6d047296_1) 583 bytes (javascript) 14.6 KiB (asset) 42 bytes (asset-url) 3.67 KiB (runtime) [entry] [rendered]
  > ./app.js __html_6d047296_1
  runtime modules 3.67 KiB 5 modules
  dependent modules 14.6 KiB (asset) 42 bytes (javascript) 42 bytes (asset-url) [dependent] 1 module
  ./src/app.js + 1 modules 541 bytes [built] [code generated]
    [no exports]
    [no exports used]
    entry ./app.js __html_6d047296_1
webpack X.X.X compiled successfully
```
