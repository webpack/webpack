This example shows **module / nomodule differential serving** on top of the
experimental HTML modules support (`experiments.html`), coordinated with the
`output.html` `alterAssetTags` hook.

Two builds run as a `MultiCompiler` array:

- **`modern`** — `output.module: true`, so the HTML entry's
  `<script type="module">` is emitted for browsers that support ES modules.
  This build owns the emitted `dist/index.html`.
- **`legacy`** — a classic (non-module) bundle for browsers without ES module
  support. In a real project this build (only this one) runs the source through
  a transpiling loader (babel / swc) with old `targets`.

The `NoModuleFallbackPlugin` taps `alterAssetTags` on the modern build and
injects two tags into the page: the classic bundle as
`<script nomodule defer src="app.legacy.js">`, and the standard Safari 10.1
`nomodule` fix (Safari 10.1 supports modules but not the `nomodule` attribute,
so without the fix it would run both bundles).

At runtime the browser picks exactly one bundle: modern engines run the
`type="module"` script and ignore `nomodule`; legacy engines skip the module
script and run the `nomodule` fallback.

# webpack.config.js

```javascript
"use strict";

const {
	html: { HtmlModulesPlugin }
} = require("../../");

// Safari 10.1 (and a few old Edge/Firefox builds) support ES modules but not
// the `nomodule` attribute, so they run *both* scripts. This standard one-liner
// marks such engines so the `nomodule` classic bundle doesn't double-execute.
const SAFARI_NOMODULE_FIX =
	'!function(){var e=document,t=e.createElement("script");if(!("noModule"in t)&&"onbeforeload"in t){var n=!1;e.addEventListener("beforeload",function(e){if(e.target===t)n=!0;else if(!e.target.hasAttribute("nomodule")||!n)return;e.preventDefault()},!0),t.type="module",t.src=".",e.head.appendChild(t),t.remove()}}();';

// The classic build's entry file name — fixed (no content hash) so the modern
// build can reference it without waiting for the classic build to finish.
const LEGACY_FILE = "app.legacy.js";

// Injects the `nomodule` classic fallback (and the Safari fix) into the modern
// page via the `alterAssetTags` hook. The modern entry `<script>` is already
// `type="module"` because that build uses `output.module`, so legacy browsers
// skip it and run the `nomodule` bundle instead.
class NoModuleFallbackPlugin {
	/**
	 * @param {import("../../").Compiler} compiler the compiler
	 */
	apply(compiler) {
		compiler.hooks.compilation.tap("NoModuleFallbackPlugin", (compilation) => {
			HtmlModulesPlugin.getCompilationHooks(compilation).alterAssetTags.tap(
				"NoModuleFallbackPlugin",
				(tags) => {
					tags.push(
						{ tag: "script", children: SAFARI_NOMODULE_FIX, injectTo: "head" },
						{
							tag: "script",
							attrs: { nomodule: true, defer: true, src: LEGACY_FILE },
							injectTo: "body"
						}
					);
					return tags;
				}
			);
		});
	}
}

/** @type {import("../../").Configuration[]} */
const config = [
	{
		name: "modern",
		target: "web",
		// ES module output → the HTML entry's `<script>` is emitted as
		// `type="module"`, which browsers without ESM support skip.
		entry: { page: "./src/index.html" },
		output: {
			filename: "[name].modern.js",
			htmlFilename: "[name].html",
			module: true
		},
		experiments: { html: true, outputModule: true },
		plugins: [new NoModuleFallbackPlugin()]
	},
	{
		name: "legacy",
		target: "web",
		// The classic (non-module) bundle loaded via the injected
		// `<script nomodule>`. A real project adds a transpiling loader
		// (babel/swc) with old `targets` here; only this build needs it.
		entry: { app: "./src/app.js" },
		output: { filename: LEGACY_FILE }
	}
];

module.exports = config;
```

# src/index.html

```html
<!doctype html>
<html lang="en">
	<head>
		<meta charset="utf-8" />
		<title>module / nomodule</title>
	</head>
	<body>
		<h1>Differential serving</h1>
		<!-- Modern browsers load this as an ES module; the classic build is
		injected as a `<script nomodule>` fallback by the plugin below. -->
		<script type="module" src="./app.js"></script>
	</body>
</html>
```

# src/app.js

```javascript
// Modern source. In a real project the legacy build runs this through a
// transpiling loader (babel/swc) with old `targets`; the modern build ships it
// as-is over `<script type="module">`.
const heading = document.querySelector("h1");
heading?.classList.add("ready");
console.log("app running");
```

# dist/index.html

The emitted page, with the modern `type="module"` entry tag plus the injected
`nomodule` fallback and the Safari fix.

```html
<!doctype html>
<html lang="en">
	<head>
		<meta charset="utf-8" />
		<title>module / nomodule</title><script>!function(){var e=document,t=e.createElement("script");if(!("noModule"in t)&&"onbeforeload"in t){var n=!1;e.addEventListener("beforeload",function(e){if(e.target===t)n=!0;else if(!e.target.hasAttribute("nomodule")||!n)return;e.preventDefault()},!0),t.type="module",t.src=".",e.head.appendChild(t),t.remove()}}();</script>
	</head>
	<body>
		<h1>Differential serving</h1>
		<!-- Modern browsers load this as an ES module; the classic build is
		injected as a `<script nomodule>` fallback by the plugin below. -->
		<script type="module" src="__html_6d047296_0.modern.js"></script><script nomodule defer src="app.legacy.js"></script>
	</body>
</html>
```

# Info

## Unoptimized

```
modern:
  asset page.modern.js 2.02 KiB [emitted] [javascript module] (name: page)
  asset index.html 759 bytes [emitted] (auxiliary name: page)
  asset __html_6d047296_0.modern.js 449 bytes [emitted] [javascript module] (name: __html_6d047296_0)
  chunk (runtime: __html_6d047296_0) __html_6d047296_0.modern.js (__html_6d047296_0) 300 bytes [entry] [rendered]
    > ./app.js __html_6d047296_0
    ./src/app.js 300 bytes [built] [code generated]
      [used exports unknown]
      entry ./app.js __html_6d047296_0
  chunk (runtime: page) page.modern.js (page) 369 bytes (javascript) 359 bytes (html) [entry] [rendered]
    > ./src/index.html page
    ./src/index.html 369 bytes (javascript) 359 bytes (html) [built] [code generated]
      [exports: default]
      [used exports unknown]
      entry ./src/index.html page
  modern (webpack X.X.X) compiled successfully

legacy:
  asset app.legacy.js 502 bytes [emitted] (name: app)
  chunk (runtime: app) app.legacy.js (app) 300 bytes [entry] [rendered]
    > ./src/app.js app
    ./src/app.js 300 bytes [built] [code generated]
      [used exports unknown]
      entry ./src/app.js app
  legacy (webpack X.X.X) compiled successfully
```

## Production mode

```
modern:
  asset index.html 759 bytes [emitted] (auxiliary name: page)
  asset page.modern.js 582 bytes [emitted] [javascript module] [minimized] (name: page)
  asset __html_6d047296_0.modern.js 90 bytes [emitted] [javascript module] [minimized] (name: __html_6d047296_0)
  chunk (runtime: __html_6d047296_0) __html_6d047296_0.modern.js (__html_6d047296_0) 300 bytes [entry] [rendered]
    > ./app.js __html_6d047296_0
    ./src/app.js 300 bytes [built] [code generated]
      [no exports used]
      entry ./app.js __html_6d047296_0
  chunk (runtime: page) page.modern.js (page) 369 bytes (javascript) 359 bytes (html) [entry] [rendered]
    > ./src/index.html page
    ./src/index.html 369 bytes (javascript) 359 bytes (html) [built] [code generated]
      [exports: default]
      [no exports used]
      entry ./src/index.html page
  modern (webpack X.X.X) compiled successfully

legacy:
  asset app.legacy.js 100 bytes [emitted] [minimized] (name: app)
  chunk (runtime: app) app.legacy.js (app) 300 bytes [entry] [rendered]
    > ./src/app.js app
    ./src/app.js 300 bytes [built] [code generated]
      [no exports used]
      entry ./src/app.js app
  legacy (webpack X.X.X) compiled successfully
```
