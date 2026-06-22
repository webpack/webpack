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

# webpack.config.js

```javascript
"use strict";

/** @type {import("webpack").Configuration} */
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
assets by chunk 35.9 KiB (auxiliary name: page)
  asset eda8c35d5b9a24e8efa6.png 19.6 KiB [emitted] [immutable] [from: src/logo@2x.png] (auxiliary name: page)
  asset 89a353e9c515885abd8e.png 14.6 KiB [emitted] [immutable] [from: src/logo.png] (auxiliary name: __html_6d047296_1, page)
  asset index.html 1.7 KiB [emitted] (auxiliary name: page)
assets by path *.js 11.4 KiB
  asset __html_6d047296_1.js 6.84 KiB [emitted] (name: __html_6d047296_1)
  asset page.js 3.57 KiB [emitted] (name: page)
  asset __html_6d047296_2.js 1.01 KiB [emitted] (name: __html_6d047296_2)
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
chunk (runtime: page) page.js (page) 1.24 KiB (javascript) 1.23 KiB (html) 65 bytes (css-text) 34.2 KiB (asset) 84 bytes (asset-url) [entry] [rendered]
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
assets by chunk 35.5 KiB (auxiliary name: page)
  asset eda8c35d5b9a24e8efa6.png 19.6 KiB [emitted] [immutable] [from: src/logo@2x.png] (auxiliary name: page)
  asset 89a353e9c515885abd8e.png 14.6 KiB [emitted] [immutable] [from: src/logo.png] (auxiliary name: __html_6d047296_1, page)
  asset index.html 1.28 KiB [emitted] (auxiliary name: page)
assets by path *.js 4.23 KiB
  asset page.js 2.29 KiB [emitted] [minimized] (name: page)
  asset __html_6d047296_1.js 1.8 KiB [emitted] [minimized] (name: __html_6d047296_1)
  asset __html_6d047296_2.js 143 bytes [emitted] [minimized] (name: __html_6d047296_2)
asset __html_6d047296_0.css 65 bytes [emitted] (name: __html_6d047296_0)
chunk (runtime: __html_6d047296_0) __html_6d047296_0.css (__html_6d047296_0) 64 bytes (css) 0 bytes (runtime) [entry] [rendered]
  > ./styles.css __html_6d047296_0
  runtime modules 0 bytes 1 module
  css ./src/styles.css 64 bytes [built] [code generated]
    [no exports]
    [no exports used]
    entry ./styles.css __html_6d047296_0
chunk (runtime: page) page.js (page) 1.28 KiB (javascript) 1.23 KiB (html) 65 bytes (css-text) 34.2 KiB (asset) 84 bytes (asset-url) 1.21 KiB (runtime) [entry] [rendered]
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
chunk (runtime: __html_6d047296_1) __html_6d047296_1.js (__html_6d047296_1) 14.6 KiB (asset) 583 bytes (javascript) 42 bytes (asset-url) 3.67 KiB (runtime) [entry] [rendered]
  > ./app.js __html_6d047296_1
  runtime modules 3.67 KiB 5 modules
  dependent modules 14.6 KiB (asset) 42 bytes (javascript) 42 bytes (asset-url) [dependent] 1 module
  ./src/app.js + 1 modules 541 bytes [built] [code generated]
    [no exports]
    [no exports used]
    entry ./app.js __html_6d047296_1
webpack X.X.X compiled successfully
```
