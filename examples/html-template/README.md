This example demonstrates the experimental HTML modules support together with
the `module.parser.html.template` option. The HTML entry is written as an
[Eta](https://eta.js.org/) template; `template` compiles it to plain HTML
**before** webpack parses it, so the URLs the template emits (the `<img>` source
and the `<script src>`) are still discovered and bundled as regular webpack
dependencies. The rewritten HTML is emitted as `dist/index.html`.

The template also `include`s a partial (`src/footer.eta`). Eta resolves
partials by reading files, so the config wraps `eta.readFile` to record every
partial read and calls the context's `addDependency` for each — that way
editing `footer.eta` triggers a rebuild and invalidates the persistent cache,
even though the partial is never a webpack module itself.

# webpack.config.js

```javascript
"use strict";

const path = require("path");
const { Eta } = require("eta");

// `views` lets templates `include()` partials from ./src. `cache: false` keeps
// Eta reading the partials on every render, so the dependency capture below
// stays reliable across rebuilds.
const eta = new Eta({ views: path.resolve(__dirname, "src"), cache: false });

// Data injected into the template. In a real project this might come from a
// CMS, frontmatter, a JSON file, etc.
const data = {
	title: "webpack + Eta",
	items: ["Modules", "Chunks", "Dependencies"],
	logo: "./logo.png",
	year: "2025"
};

/**
 * Renders the template while recording every partial Eta reads (by wrapping
 * `eta.readFile`), then registers those files as build dependencies so editing
 * a partial like `footer.eta` triggers a rebuild and invalidates the cache.
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
	entry: "./src/index.html",
	experiments: {
		html: true
	},
	module: {
		parser: {
			html: {
				// `template` runs before webpack parses the HTML, so the Eta
				// template (including its `include`d partials) is compiled to
				// plain HTML first. URLs the template emits (here `logo` and the
				// `<script src>`) are then picked up as regular webpack
				// dependencies.
				template: (source, { addDependency }) =>
					renderWithDeps(source, addDependency)
			}
		}
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

# src/app.js

```javascript
// This script is referenced by `<script src="./app.js">` in the HTML entry.
// HtmlModulesPlugin turns that reference into a webpack entry and rewrites the
// tag to point at the emitted bundle.
console.log("Hello from the bundled script!");
```

# src/footer.eta

An Eta partial pulled in via `include(...)`. Registered as a build dependency
through `addDependency`, not bundled as a module.

```
<footer>Built with webpack — <%= it.year %></footer>
```

# dist/index.html

The template has been rendered (title, list items) and every URL has been
rewritten to point at the emitted assets.

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

# Info

## Unoptimized

```
assets by chunk 15 KiB (auxiliary name: main)
  asset 89a353e9c515885abd8e.png 14.6 KiB [emitted] [immutable] [from: src/logo.png] (auxiliary name: main)
  asset index.html 407 bytes [emitted] (auxiliary name: main)
assets by path *.js 2.87 KiB
  asset main.js 2.44 KiB [emitted] (name: main)
  asset __html_6d047296_0.js 445 bytes [emitted] (name: __html_6d047296_0)
chunk (runtime: __html_6d047296_0) __html_6d047296_0.js (__html_6d047296_0) 243 bytes [entry] [rendered]
  > ./app.js __html_6d047296_0
  ./src/app.js 243 bytes [built] [code generated]
    [used exports unknown]
    entry ./app.js __html_6d047296_0
chunk (runtime: main) main.js (main) 391 bytes (javascript) 381 bytes (html) 14.6 KiB (asset) 42 bytes (asset-url) [entry] [rendered]
  > ./src/index.html main
  dependent modules 14.6 KiB (asset) 42 bytes (asset-url) [dependent] 1 module
  ./src/index.html 391 bytes (javascript) 381 bytes (html) [built] [code generated]
    [exports: default]
    [used exports unknown]
    entry ./src/index.html main
webpack X.X.X compiled successfully
```

## Production mode

```
assets by chunk 15 KiB (auxiliary name: main)
  asset 89a353e9c515885abd8e.png 14.6 KiB [emitted] [immutable] [from: src/logo.png] (auxiliary name: main)
  asset index.html 407 bytes [emitted] (auxiliary name: main)
assets by path *.js 704 bytes
  asset main.js 658 bytes [emitted] [minimized] (name: main)
  asset __html_6d047296_0.js 46 bytes [emitted] [minimized] (name: __html_6d047296_0)
chunk (runtime: __html_6d047296_0) __html_6d047296_0.js (__html_6d047296_0) 243 bytes [entry] [rendered]
  > ./app.js __html_6d047296_0
  ./src/app.js 243 bytes [built] [code generated]
    [no exports used]
    entry ./app.js __html_6d047296_0
chunk (runtime: main) main.js (main) 391 bytes (javascript) 381 bytes (html) 14.6 KiB (asset) 42 bytes (asset-url) [entry] [rendered]
  > ./src/index.html main
  dependent modules 14.6 KiB (asset) 42 bytes (asset-url) [dependent] 1 module
  ./src/index.html 391 bytes (javascript) 381 bytes (html) [built] [code generated]
    [exports: default]
    [no exports used]
    entry ./src/index.html main
webpack X.X.X compiled successfully
```
