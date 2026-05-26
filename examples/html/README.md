This example demonstrates the experimental HTML modules support
(`experiments.html`) in two ways:

- **HTML entry point** (`./src/index.html`): emitted as a standalone
  `dist/index.html`. Its `<link rel="stylesheet">`, inline `<style>`,
  `<script src>`, inline `<script>`, `<img src>` and `<img srcset>` are all
  bundled, and the references are rewritten to the emitted assets.
- **HTML imported from JavaScript** (`./src/app.js` imports
  `./src/fragment.html`): the HTML module exports its URL-rewritten HTML as a
  string and is _not_ emitted as a standalone file.

# webpack.config.js

```javascript
"use strict";

/** @type {import("webpack").Configuration} */
const config = {
	// `target: "web"` makes the CSS generator emit `.css` chunks (for the
	// `<link rel="stylesheet">` and the inline `<style>`).
	target: "web",
	entry: {
		// HTML entry point: emitted as a standalone `dist/page.html` with all
		// of its `<link>`, `<script>`, `<img>` and inline `<script>`/`<style>`
		// references bundled and rewritten.
		page: "./src/index.html",
		// JavaScript entry that imports an HTML module as a string.
		app: "./src/app.js"
	},
	experiments: {
		html: true,
		css: true
	}
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
		     the emitted bundle. -->
		<script src="./entry.js"></script>

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
// HTML used via `import`: an HTML module imported from JavaScript exports its
// (URL-rewritten) HTML as a string. Because it isn't an entry, it is NOT
// emitted as a standalone `.html` file — it's just the string below.
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
		
</style>
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
		     the emitted bundle. -->
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
assets by path *.js 14 KiB
  asset __html_6d047296_1.js 5.93 KiB [emitted] (name: __html_6d047296_1)
  asset page.js 3.69 KiB [emitted] (name: page)
  asset app.js 3.32 KiB [emitted] (name: app)
  asset __html_6d047296_2.js 1.01 KiB [emitted] (name: __html_6d047296_2)
assets by chunk 35.8 KiB (auxiliary name: page)
  asset eda8c35d5b9a24e8efa6.png 19.6 KiB [emitted] [immutable] [from: src/logo@2x.png] (auxiliary name: page)
  asset 89a353e9c515885abd8e.png 14.6 KiB [emitted] [immutable] [from: src/logo.png] (auxiliary name: app, page)
  asset index.html 1.58 KiB [emitted] (auxiliary name: page)
asset __html_6d047296_0.css 166 bytes [emitted] (name: __html_6d047296_0)
chunk (runtime: __html_6d047296_0) __html_6d047296_0.css (__html_6d047296_0) 64 bytes (css) 0 bytes (runtime) [entry] [rendered]
  > ./styles.css __html_6d047296_0
  runtime modules 0 bytes 1 module
  css ./src/styles.css 64 bytes [built] [code generated]
    [no exports]
    [used exports unknown]
    entry ./styles.css __html_6d047296_0
chunk (runtime: __html_6d047296_1) __html_6d047296_1.js (__html_6d047296_1) 119 bytes (javascript) 2.73 KiB (runtime) [entry] [rendered]
  > ./entry.js __html_6d047296_1
  runtime modules 2.73 KiB 4 modules
  ./src/entry.js 119 bytes [built] [code generated]
    [used exports unknown]
    entry ./entry.js __html_6d047296_1
chunk (runtime: __html_6d047296_1) __html_6d047296_2.js (__html_6d047296_2) 56 bytes [initial] [rendered]
  > data:text/javascript;base64,CgkJCWNvbnNvbGUubG9nKCJpbmxpbmUgc2NyaXB0LCBidW5kbGVkIGJ5IHdlYnBhY2siKTsKCQk= __html_6d047296_2
  data:text/javascript;base64,CgkJCWNvbnNvbGUu.. 56 bytes [built] [code generated]
    [no exports]
    [used exports unknown]
    entry data:text/javascript;base64,CgkJCWNvbnNvbGUu.. __html_6d047296_2
chunk (runtime: app) app.js (app) 509 bytes (javascript) 14.6 KiB (asset) 42 bytes (asset-url) 274 bytes (runtime) [entry] [rendered]
  > ./src/app.js app
  dependent modules 124 bytes (javascript) 14.6 KiB (asset) 42 bytes (asset-url) [dependent] 2 modules
  runtime modules 274 bytes 1 module
  ./src/app.js 385 bytes [built] [code generated]
    [no exports]
    [used exports unknown]
    entry ./src/app.js app
chunk (runtime: page) page.js (page) 1.12 KiB (javascript) 1.11 KiB (html) 1 bytes (css-text) 34.2 KiB (asset) 84 bytes (asset-url) [entry] [rendered]
  > ./src/index.html page
  dependent modules 34.2 KiB (asset) 84 bytes (asset-url) 1 bytes (css-text) [dependent] 3 modules
  ./src/index.html 1.12 KiB (javascript) 1.11 KiB (html) [built] [code generated]
    [exports: default]
    [used exports unknown]
    entry ./src/index.html page
webpack X.X.X compiled successfully
```

## Production mode

```
assets by path *.js 4.33 KiB
  asset page.js 2.17 KiB [emitted] [minimized] (name: page)
  asset app.js 1.05 KiB [emitted] [minimized] (name: app)
  asset __html_6d047296_1.js 985 bytes [emitted] [minimized] (name: __html_6d047296_1)
  asset __html_6d047296_2.js 143 bytes [emitted] [minimized] (name: __html_6d047296_2)
assets by chunk 35.4 KiB (auxiliary name: page)
  asset eda8c35d5b9a24e8efa6.png 19.6 KiB [emitted] [immutable] [from: src/logo@2x.png] (auxiliary name: page)
  asset 89a353e9c515885abd8e.png 14.6 KiB [emitted] [immutable] [from: src/logo.png] (auxiliary name: app, page)
  asset index.html 1.15 KiB [emitted] (auxiliary name: page)
asset __html_6d047296_0.css 65 bytes [emitted] (name: __html_6d047296_0)
chunk (runtime: __html_6d047296_0) __html_6d047296_0.css (__html_6d047296_0) 64 bytes (css) 0 bytes (runtime) [entry] [rendered]
  > ./styles.css __html_6d047296_0
  runtime modules 0 bytes 1 module
  css ./src/styles.css 64 bytes [built] [code generated]
    [no exports]
    [no exports used]
    entry ./styles.css __html_6d047296_0
chunk (runtime: app) app.js (app) 14.6 KiB (asset) 551 bytes (javascript) 42 bytes (asset-url) 1.24 KiB (runtime) [entry] [rendered]
  > ./src/app.js app
  runtime modules 1.24 KiB 2 modules
  dependent modules 14.6 KiB (asset) 42 bytes (javascript) 42 bytes (asset-url) [dependent] 1 module
  ./src/app.js + 1 modules 509 bytes [built] [code generated]
    [no exports]
    [no exports used]
    entry ./src/app.js app
chunk (runtime: page) page.js (page) 1.16 KiB (javascript) 1.11 KiB (html) 1 bytes (css-text) 34.2 KiB (asset) 84 bytes (asset-url) 1.24 KiB (runtime) [entry] [rendered]
  > ./src/index.html page
  dependent modules 34.2 KiB (asset) 42 bytes (javascript) 84 bytes (asset-url) 1 bytes (css-text) [dependent] 3 modules
  runtime modules 1.24 KiB 2 modules
  ./src/index.html 1.12 KiB (javascript) 1.11 KiB (html) [built] [code generated]
    [exports: default]
    [no exports used]
    entry ./src/index.html page
chunk (runtime: __html_6d047296_1) __html_6d047296_2.js (__html_6d047296_2) 56 bytes [initial] [rendered]
  > data:text/javascript;base64,CgkJCWNvbnNvbGUubG9nKCJpbmxpbmUgc2NyaXB0LCBidW5kbGVkIGJ5IHdlYnBhY2siKTsKCQk= __html_6d047296_2
  data:text/javascript;base64,CgkJCWNvbnNvbGUu.. 56 bytes [built] [code generated]
    [no exports]
    [no exports used]
    entry data:text/javascript;base64,CgkJCWNvbnNvbGUu.. __html_6d047296_2
chunk (runtime: __html_6d047296_1) __html_6d047296_1.js (__html_6d047296_1) 119 bytes (javascript) 2.46 KiB (runtime) [entry] [rendered]
  > ./entry.js __html_6d047296_1
  runtime modules 2.46 KiB 3 modules
  ./src/entry.js 119 bytes [built] [code generated]
    [no exports used]
    entry ./entry.js __html_6d047296_1
webpack X.X.X compiled successfully
```
