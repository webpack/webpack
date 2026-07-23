This example demonstrates automatic **Content-Security-Policy** generation for
the experimental HTML modules support (`experiments.html`), via
`output.html.csp`.

Two `output.html` options combine:

- **`inline: true`** inlines every emitted chunk into the page, so the external
  `<link rel="stylesheet">` and `<script src>` become inline `<style>` /
  `<script>` tags alongside the ones already inline in the source.
- **`csp: true`** injects a `<meta http-equiv="Content-Security-Policy">` with a
  strict baseline (`script-src`/`style-src 'self'`, `object-src 'none'`,
  `base-uri 'self'`) and appends a `sha256` hash of **every** inline
  `<script>`/`<style>` — computed after inlining, so each hash matches the exact
  bytes the browser executes. Anything left external is covered by `'self'`.

No CSP plugin is involved. Passing an object instead of `true` can add a
per-request `nonce` or override individual directives via `policy` (e.g.
`{ policy: { "img-src": ["'self'", "data:"] } }`); an author-declared CSP in the
page is left untouched.

# webpack.config.js

```javascript
"use strict";

// `output.html.csp` emits a `<meta http-equiv="Content-Security-Policy">` into
// every webpack-generated HTML page. Combined with `output.html.inline`, the
// build's scripts/styles end up inline in the page and CSP hashes each one
// (after inlining, so the sha256 matches the exact bytes the browser runs) on
// top of a strict baseline — no separate CSP plugin needed.
/** @type {import("../../").Configuration} */
module.exports = {
	entry: { index: "./src/index.html" },
	output: {
		html: {
			// Inline every emitted chunk into the page, so there are inline
			// `<script>`/`<style>` tags for CSP to hash. `"script"`/`"style"` or a
			// `RegExp` list narrow this; anything left external is covered by 'self'.
			inline: true,
			// `true` = strict baseline (`script-src`/`style-src 'self'`,
			// `object-src 'none'`, `base-uri 'self'`) plus a sha256 of each inline
			// script/style. An object can add a `nonce` or override directives via
			// `policy` (e.g. `{ policy: { "img-src": ["'self'", "data:"] } }`).
			csp: true
		}
	},
	experiments: { html: true }
};
```

# src/index.html

```html
<!DOCTYPE html>
<html lang="en">
	<head>
		<meta charset="utf-8" />
		<title>CSP</title>

		<!-- External stylesheet: bundled, then inlined into a <style> by
		     `output.html.inline`, so CSP can hash it. -->
		<link rel="stylesheet" href="./styles.css" />

		<!-- Inline <style>: hashed as-is. -->
		<style>
			body {
				font-family: sans-serif;
			}
		</style>
	</head>
	<body>
		<h1>Content-Security-Policy</h1>

		<!-- External script: bundled, then inlined into a <script> and hashed. -->
		<script src="./app.js"></script>
	</body>
</html>
```

# src/app.js

```javascript
document.querySelector("h1").classList.add("ready");
console.log("bundled + inlined script, covered by a CSP hash");
```

# src/styles.css

```css
h1 {
	color: #2b3a42;
}

h1.ready {
	color: #8ed6fb;
}
```

# dist/index.html

The emitted page: every script/style inlined, with the generated CSP `<meta>`
carrying a hash for each one.

```html
<!DOCTYPE html>
<html lang="en">
	<head><meta http-equiv="Content-Security-Policy" content="script-src 'self' 'sha256-5NlCGoSN8ETSUabbmQKYTt1H6nvYWb5OGZJTsWS8iC8='; style-src 'self' 'sha256-vp73KxgWfPhtZ9IRKOt378FrPIkD/T6FbLXnXfaktI8=' 'sha256-+Ver9ZPpEiV0Cq4WfPc7DL+LUo1ECenMRe/8IigO+wA='; object-src 'none'; base-uri 'self'">
		<meta charset="utf-8" />
		<title>CSP</title>

		<!-- External stylesheet: bundled, then inlined into a <style> by
		     `output.html.inline`, so CSP can hash it. -->
		<style>/*!****************************!*\
  !*** css ./src/styles.css ***!
  \****************************/
h1 {
	color: #2b3a42;
}

h1.ready {
	color: #8ed6fb;
}

</style>

		<!-- Inline <style>: hashed as-is. -->
		<style>/*!********************************************************************************************************************!*\
  !*** css data:text/css;base64,CgkJCWJvZHkgewoJCQkJZm9udC1mYW1pbHk6IHNhbnMtc2VyaWY7CgkJCX0KCQk= (exportType: text) ***!
  \********************************************************************************************************************/

			body {
				font-family: sans-serif;
			}
		
</style>
	</head>
	<body>
		<h1>Content-Security-Policy</h1>

		<!-- External script: bundled, then inlined into a <script> and hashed. -->
		<script>/******/ (() => { // webpackBootstrap
/*!********************!*\
  !*** ./src/app.js ***!
  \********************/
/*! unknown exports (runtime-defined) */
/*! runtime requirements:  */
document.querySelector("h1").classList.add("ready");
console.log("bundled + inlined script, covered by a CSP hash");

/******/ })()
;</script>
	</body>
</html>
```

# Info

## Unoptimized

```
asset index.js 2.64 KiB [emitted] (name: index)
asset index.html 1.59 KiB [emitted] (auxiliary name: index)
Entrypoint index 2.64 KiB (1.59 KiB) = index.js 1 auxiliary asset
Entrypoint __html_6d047296_1 =
Entrypoint __html_6d047296_0 =
chunk (runtime: __html_6d047296_0) (__html_6d047296_0) 55 bytes (css) 0 bytes (runtime) [entry] [rendered]
  > ./styles.css __html_6d047296_0
  runtime modules 0 bytes 1 module
  css ./src/styles.css 55 bytes [built] [code generated]
    [no exports]
    [used exports unknown]
    entry ./styles.css __html_6d047296_0
chunk (runtime: __html_6d047296_1) (__html_6d047296_1) 117 bytes [entry] [rendered]
  > ./app.js __html_6d047296_1
  ./src/app.js 117 bytes [built] [code generated]
    [used exports unknown]
    entry ./app.js __html_6d047296_1
chunk (runtime: index) index.js (index) 47 bytes (css-text) 559 bytes (javascript) 549 bytes (html) [entry] [rendered]
  > ./src/index.html index
  dependent modules 47 bytes [dependent] 1 module
  ./src/index.html 559 bytes (javascript) 549 bytes (html) [built] [code generated]
    [exports: default]
    [used exports unknown]
    entry ./src/index.html index
webpack X.X.X compiled successfully
```

## Production mode

```
asset index.html 963 bytes [emitted] (auxiliary name: index)
asset index.js 776 bytes [emitted] [minimized] (name: index)
Entrypoint index 776 bytes (963 bytes) = index.js 1 auxiliary asset
Entrypoint __html_6d047296_1 =
Entrypoint __html_6d047296_0 =
chunk (runtime: index) index.js (index) 47 bytes (css-text) 559 bytes (javascript) 549 bytes (html) [entry] [rendered]
  > ./src/index.html index
  dependent modules 47 bytes [dependent] 1 module
  ./src/index.html 559 bytes (javascript) 549 bytes (html) [built] [code generated]
    [exports: default]
    [no exports used]
    entry ./src/index.html index
chunk (runtime: __html_6d047296_0) (__html_6d047296_0) 55 bytes (css) 0 bytes (runtime) [entry] [rendered]
  > ./styles.css __html_6d047296_0
  runtime modules 0 bytes 1 module
  css ./src/styles.css 55 bytes [built] [code generated]
    [no exports]
    [no exports used]
    entry ./styles.css __html_6d047296_0
chunk (runtime: __html_6d047296_1) (__html_6d047296_1) 117 bytes [entry] [rendered]
  > ./app.js __html_6d047296_1
  ./src/app.js 117 bytes [built] [code generated]
    [no exports used]
    entry ./app.js __html_6d047296_1
webpack X.X.X compiled successfully
```
