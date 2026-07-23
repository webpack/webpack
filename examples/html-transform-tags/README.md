This example demonstrates the `output.html` **`transformTags`** hook on top of
the experimental HTML modules support (`experiments.html`).

`transformTags` hands a plugin the page's already-present
`<script>`/`<link>`/`<style>`/`<meta>` tags as mutable descriptors. It covers
all three ways to change an existing tag:

- **Mutate `attrs`** — `TransformTagsPlugin` adds `crossorigin="anonymous"` to
  every external `<script>`/`<link rel="stylesheet">`.
- **Change `injectTo`** — it moves the render-blocking `<script>` authored in
  `<head>` to the end of `<body>` and marks it `defer`.
- **Set `remove: true`** — it drops the dev-only `<meta name="debug">` from the
  shipped page.

Webpack rewrites only the changed tags; untouched tags stay byte-for-byte. To
add brand-new tags (a favicon, a `nomodule` fallback, …) use the sibling
`injectTags` hook instead — see the `html` and `html-module-nomodule` examples.

# webpack.config.js

```javascript
"use strict";

const {
	html: { HtmlModulesPlugin }
} = require("../../");

// The `transformTags` hook hands a plugin the page's already-present
// `<script>`/`<link>`/`<style>`/`<meta>` tags as mutable descriptors: mutate
// `attrs`, set `remove: true`, or change `injectTo` to move a tag between
// `<head>` and `<body>`. Webpack rewrites only the changed tags; untouched tags
// stay byte-for-byte. (Use `injectTags` to add brand-new tags — see the `html`
// and `html-module-nomodule` examples.)
class TransformTagsPlugin {
	/**
	 * @param {import("../../").Compiler} compiler the compiler
	 */
	apply(compiler) {
		compiler.hooks.compilation.tap("TransformTagsPlugin", (compilation) => {
			HtmlModulesPlugin.getCompilationHooks(compilation).transformTags.tap(
				"TransformTagsPlugin",
				(tags) => {
					for (const tag of tags) {
						// Add CORS to every external script / stylesheet.
						if (
							(tag.tag === "script" && tag.attrs.src) ||
							(tag.tag === "link" && tag.attrs.rel === "stylesheet")
						) {
							tag.attrs.crossorigin = "anonymous";
						}
						// Move render-blocking scripts out of <head> to the end of
						// <body>, deferred — via `injectTo`.
						if (tag.tag === "script" && tag.injectTo === "head") {
							tag.injectTo = "body";
							tag.attrs.defer = true;
						}
						// Drop a dev-only marker <meta> from the shipped page.
						if (tag.tag === "meta" && tag.attrs.name === "debug") {
							tag.remove = true;
						}
					}
				}
			);
		});
	}
}

/** @type {import("../../").Configuration} */
module.exports = {
	entry: { index: "./src/index.html" },
	experiments: { html: true },
	plugins: [new TransformTagsPlugin()]
};
```

# src/index.html

```html
<!DOCTYPE html>
<html lang="en">
	<head>
		<meta charset="utf-8" />
		<title>transformTags</title>

		<!-- Dev-only marker: the plugin removes it from the shipped page. -->
		<meta name="debug" content="1" />

		<!-- External stylesheet: the plugin adds `crossorigin`. -->
		<link rel="stylesheet" href="./styles.css" />

		<!-- Authored in <head>; the plugin moves it to the end of <body>
		     (deferred) and adds `crossorigin`. -->
		<script src="./app.js"></script>
	</head>
	<body>
		<h1>transformTags</h1>
	</body>
</html>
```

# src/app.js

```javascript
document.querySelector("h1").classList.add("ready");
```

# src/styles.css

```css
h1 {
	font-family: sans-serif;
	color: #2b3a42;
}

h1.ready {
	color: #8ed6fb;
}
```

# dist/index.html

The emitted page: the debug `<meta>` gone, `crossorigin` on the stylesheet, and
the script moved to the end of `<body>` as `<script defer>`.

```html
<!DOCTYPE html>
<html lang="en">
	<head>
		<meta charset="utf-8" />
		<title>transformTags</title>

		<!-- Dev-only marker: the plugin removes it from the shipped page. -->
		

		<!-- External stylesheet: the plugin adds `crossorigin`. -->
		<link rel="stylesheet" href="__html_6d047296_0.css" crossorigin="anonymous">

		<!-- Authored in <head>; the plugin moves it to the end of <body>
		     (deferred) and adds `crossorigin`. -->
		
	</head>
	<body>
		<h1>transformTags</h1><script src="__html_6d047296_1.js" crossorigin="anonymous" defer></script>
	</body>
</html>
```

# Info

## Unoptimized

```
assets by path *.js 2.56 KiB
  asset index.js 2.31 KiB [emitted] (name: index)
  asset __html_6d047296_1.js 255 bytes [emitted] (name: __html_6d047296_1)
asset index.html 570 bytes [emitted] (auxiliary name: index)
asset __html_6d047296_0.css 183 bytes [emitted] (name: __html_6d047296_0)
chunk (runtime: __html_6d047296_0) __html_6d047296_0.css (__html_6d047296_0) 81 bytes (css) 0 bytes (runtime) [entry] [rendered]
  > ./styles.css __html_6d047296_0
  runtime modules 0 bytes 1 module
  css ./src/styles.css 81 bytes [built] [code generated]
    [no exports]
    [used exports unknown]
    entry ./styles.css __html_6d047296_0
chunk (runtime: __html_6d047296_1) __html_6d047296_1.js (__html_6d047296_1) 53 bytes [entry] [rendered]
  > ./app.js __html_6d047296_1
  ./src/app.js 53 bytes [built] [code generated]
    [used exports unknown]
    entry ./app.js __html_6d047296_1
chunk (runtime: index) index.js (index) 540 bytes (javascript) 530 bytes (html) [entry] [rendered]
  > ./src/index.html index
  ./src/index.html 540 bytes (javascript) 530 bytes (html) [built] [code generated]
    [exports: default]
    [used exports unknown]
    entry ./src/index.html index
webpack X.X.X compiled successfully
```

## Production mode

```
assets by path *.js 857 bytes
  asset index.js 805 bytes [emitted] [minimized] (name: index)
  asset __html_6d047296_1.js 52 bytes [emitted] [minimized] (name: __html_6d047296_1)
asset index.html 570 bytes [emitted] (auxiliary name: index)
asset __html_6d047296_0.css 82 bytes [emitted] (name: __html_6d047296_0)
chunk (runtime: index) index.js (index) 540 bytes (javascript) 530 bytes (html) [entry] [rendered]
  > ./src/index.html index
  ./src/index.html 540 bytes (javascript) 530 bytes (html) [built] [code generated]
    [exports: default]
    [no exports used]
    entry ./src/index.html index
chunk (runtime: __html_6d047296_0) __html_6d047296_0.css (__html_6d047296_0) 81 bytes (css) 0 bytes (runtime) [entry] [rendered]
  > ./styles.css __html_6d047296_0
  runtime modules 0 bytes 1 module
  css ./src/styles.css 81 bytes [built] [code generated]
    [no exports]
    [no exports used]
    entry ./styles.css __html_6d047296_0
chunk (runtime: __html_6d047296_1) __html_6d047296_1.js (__html_6d047296_1) 53 bytes [entry] [rendered]
  > ./app.js __html_6d047296_1
  ./src/app.js 53 bytes [built] [code generated]
    [no exports used]
    entry ./app.js __html_6d047296_1
webpack X.X.X compiled successfully
```
