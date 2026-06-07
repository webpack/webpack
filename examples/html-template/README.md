This example demonstrates the experimental HTML modules support together with
the `module.parser.html.template` option, using [Eta](https://eta.js.org/) as
the templating engine. `template` compiles each HTML entry to plain HTML
**before** webpack parses it, so the URLs the template emits (the `<img>`
source and the `<script src>`) are still discovered and bundled as regular
webpack dependencies.

It shows three things:

- **Templating** — `src/index.html` is rendered with Eta and a data object
  (title, list items, image URL).
- **Dependency capture** — the template `include`s a partial
  (`src/footer.eta`). Eta resolves partials by reading files, so the config
  wraps `eta.readFile` to record every partial read and calls the context's
  `addDependency` for each, so editing `footer.eta` triggers a rebuild and
  invalidates the cache even though it never becomes a webpack module.
- **Per-file options** — `src/special.html` is matched by a `module.rules`
  entry that hands it a differently-configured Eta (custom `{{ }}` tags,
  `autoEscape` disabled) and its own data. `rule.parser` merges over
  `module.parser.html`, so that `template` wins only for the matched file.

# webpack.config.js

```javascript
"use strict";

const path = require("path");
const { Eta } = require("eta");

// Default Eta: standard `<% %>` tags, can `include()` partials from ./src.
// `cache: false` keeps partials being read on every render so the dependency
// capture in `renderWithDeps` stays reliable across rebuilds.
const eta = new Eta({ views: path.resolve(__dirname, "src"), cache: false });
const data = {
	title: "webpack + Eta",
	items: ["Modules", "Chunks", "Dependencies"],
	logo: "./logo.png",
	year: "2025"
};

// A differently-configured Eta for the "special" page: custom `{{ }}` tags and
// `autoEscape` disabled (so `raw` is emitted as real markup). Wired to a single
// file through `module.rules` below.
const specialEta = new Eta({ tags: ["{{", "}}"], autoEscape: false });
const specialData = {
	title: "Special",
	heading: "Special page",
	raw: "<p><em>Unescaped</em> markup injected from the template data.</p>"
};

/**
 * Renders with the default Eta while recording every partial Eta reads (by
 * wrapping `eta.readFile`), then registers those files via `addDependency` so
 * editing a partial like `footer.eta` triggers a rebuild and invalidates the
 * cache — even though the partial never becomes a webpack module.
 * @param {string} source template source
 * @param {(dependency: string) => void} addDependency register a build dependency
 * @returns {string} rendered html
 */
function renderWithDeps(source, addDependency) {
	const readFile = eta.readFile;
	/** @type {Set<string>} */
	const files = new Set();
	eta.readFile = (file) => {
		files.add(file);
		return readFile.call(eta, file);
	};
	try {
		return eta.renderString(source, data);
	} finally {
		eta.readFile = readFile;
		for (const file of files) addDependency(file);
	}
}

/** @type {import("webpack").Configuration} */
const config = {
	entry: {
		// HTML entry points only — no JavaScript entry.
		index: "./src/index.html",
		special: "./src/special.html"
	},
	experiments: {
		html: true
	},
	module: {
		parser: {
			html: {
				// Default for every html module: render with Eta and track the
				// partials it includes.
				template: (source, { addDependency }) =>
					renderWithDeps(source, addDependency)
			}
		},
		rules: [
			{
				// Per-file parser options: only `special.html` gets the
				// differently-configured Eta and its own data. `rule.parser`
				// merges over `module.parser.html`, so this `template` wins for
				// the matched file while `index.html` keeps the default.
				test: /special\.html$/,
				parser: {
					template: (/** @type {string} */ source) =>
						specialEta.renderString(source, specialData)
				}
			}
		]
	}
};

module.exports = config;
```

# src/index.html

Default Eta tags (`<%= %>`), with an `include` and a `<script src>`.

```html
<!DOCTYPE html>
<html lang="en">
	<head>
		<meta charset="utf-8" />
		<title><%= it.title %></title>
	</head>
	<body>
		<h1><%= it.title %></h1>
		<img src="<%= it.logo %>" alt="logo" width="150" />
		<ul>
			<% it.items.forEach(function (item) { %>
			<li><%= item %></li>
			<% }) %>
		</ul>
		<script src="./app.js"></script>
		<%~ include("footer", { year: it.year }) %>
	</body>
</html>
```

# src/footer.eta

An Eta partial pulled in via `include(...)`. Registered as a build dependency
through `addDependency`, not bundled as a module.

```
<footer>Built with webpack — <%= it.year %></footer>
```

# src/app.js

```javascript
// This script is referenced by `<script src="./app.js">` in the HTML entry.
// HtmlModulesPlugin turns that reference into a webpack entry and rewrites the
// tag to point at the emitted bundle.
console.log("Hello from the bundled script!");
```

# src/special.html

Custom Eta tags (`{{= }}`) and unescaped output, selected by the rule.

```html
<!DOCTYPE html>
<html lang="en">
	<head>
		<meta charset="utf-8" />
		<title>{{= it.title }}</title>
	</head>
	<body>
		<h1>{{= it.heading }}</h1>
		{{= it.raw }}
	</body>
</html>
```

# dist/index.html

```html
<!DOCTYPE html>
<html lang="en">
	<head>
		<meta charset="utf-8" />
		<title>webpack + Eta</title>
	</head>
	<body>
		<h1>webpack + Eta</h1>
		<img src="89a353e9c515885abd8e.png" alt="logo" width="150" />
		<ul>
						<li>Modules</li>
						<li>Chunks</li>
						<li>Dependencies</li>
					</ul>
		<script src="__html_6d047296_0.js"></script>
		<footer>Built with webpack — 2025</footer>
	</body>
</html>
```

# dist/special.html

```html
<!DOCTYPE html>
<html lang="en">
	<head>
		<meta charset="utf-8" />
		<title>Special</title>
	</head>
	<body>
		<h1>Special page</h1>
		<p><em>Unescaped</em> markup injected from the template data.</p>	</body>
</html>
```

# Info

## Unoptimized

```
assets by path *.js 4.57 KiB
  asset index.js 2.18 KiB [emitted] (name: index)
  asset special.js 1.95 KiB [emitted] (name: special)
  asset __html_6d047296_0.js 445 bytes [emitted] (name: __html_6d047296_0)
assets by chunk 15 KiB (auxiliary name: index)
  asset 89a353e9c515885abd8e.png 14.6 KiB [emitted] [immutable] [from: src/logo.png] (auxiliary name: index)
  asset index.html 407 bytes [emitted] (auxiliary name: index)
asset special.html 218 bytes [emitted] (auxiliary name: special)
chunk (runtime: __html_6d047296_0) __html_6d047296_0.js (__html_6d047296_0) 243 bytes [entry] [rendered]
  > ./app.js __html_6d047296_0
  ./src/app.js 243 bytes [built] [code generated]
    [used exports unknown]
    entry ./app.js __html_6d047296_0
chunk (runtime: index) index.js (index) 391 bytes (javascript) 381 bytes (html) 14.6 KiB (asset) 42 bytes (asset-url) [entry] [rendered]
  > ./src/index.html index
  dependent modules 14.6 KiB (asset) 42 bytes (asset-url) [dependent] 1 module
  ./src/index.html 391 bytes (javascript) 381 bytes (html) [built] [code generated]
    [exports: default]
    [used exports unknown]
    entry ./src/index.html index
chunk (runtime: special) special.js (special) 228 bytes (javascript) 218 bytes (html) [entry] [rendered]
  > ./src/special.html special
  ./src/special.html 228 bytes (javascript) 218 bytes (html) [built] [code generated]
    [exports: default]
    [used exports unknown]
    entry ./src/special.html special
webpack X.X.X compiled successfully
```

## Production mode

```
assets by path *.js 1.11 KiB
  asset index.js 658 bytes [emitted] [minimized] (name: index)
  asset special.js 431 bytes [emitted] [minimized] (name: special)
  asset __html_6d047296_0.js 46 bytes [emitted] [minimized] (name: __html_6d047296_0)
assets by chunk 15 KiB (auxiliary name: index)
  asset 89a353e9c515885abd8e.png 14.6 KiB [emitted] [immutable] [from: src/logo.png] (auxiliary name: index)
  asset index.html 407 bytes [emitted] (auxiliary name: index)
asset special.html 218 bytes [emitted] (auxiliary name: special)
chunk (runtime: index) index.js (index) 391 bytes (javascript) 381 bytes (html) 14.6 KiB (asset) 42 bytes (asset-url) [entry] [rendered]
  > ./src/index.html index
  dependent modules 14.6 KiB (asset) 42 bytes (asset-url) [dependent] 1 module
  ./src/index.html 391 bytes (javascript) 381 bytes (html) [built] [code generated]
    [exports: default]
    [no exports used]
    entry ./src/index.html index
chunk (runtime: __html_6d047296_0) __html_6d047296_0.js (__html_6d047296_0) 243 bytes [entry] [rendered]
  > ./app.js __html_6d047296_0
  ./src/app.js 243 bytes [built] [code generated]
    [no exports used]
    entry ./app.js __html_6d047296_0
chunk (runtime: special) special.js (special) 228 bytes (javascript) 218 bytes (html) [entry] [rendered]
  > ./src/special.html special
  ./src/special.html 228 bytes (javascript) 218 bytes (html) [built] [code generated]
    [exports: default]
    [no exports used]
    entry ./src/special.html special
webpack X.X.X compiled successfully
```
