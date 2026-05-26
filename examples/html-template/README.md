This example demonstrates the experimental HTML modules support together with
the `module.parser.html.template` option. The HTML entry is written as an
[Eta](https://eta.js.org/) template; `template` compiles it to plain HTML
**before** webpack parses it, so the URLs the template emits (the `<img>` source
and the `<script src>`) are still discovered and bundled as regular webpack
dependencies. The rewritten HTML is emitted as `dist/index.html`.

# webpack.config.js

```javascript
"use strict";

const { Eta } = require("eta");

const eta = new Eta();

// Data injected into the template. In a real project this might come from a
// CMS, frontmatter, a JSON file, etc.
const data = {
	title: "webpack + Eta",
	items: ["Modules", "Chunks", "Dependencies"],
	logo: "./logo.png"
};

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
				// template is compiled to plain HTML first. URLs the template
				// emits (here `logo` and the `<script src>`) are then picked
				// up as regular webpack dependencies.
				template: (source) => eta.renderString(source, data)
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
	</body>
</html>
```

# Info

## Unoptimized

```
assets by chunk 14.9 KiB (auxiliary name: main)
  asset 89a353e9c515885abd8e.png 14.6 KiB [emitted] [immutable] [from: src/logo.png] (auxiliary name: main)
  asset index.html 360 bytes [emitted] (auxiliary name: main)
assets by path *.js 2.82 KiB
  asset main.js 2.39 KiB [emitted] (name: main)
  asset __html_6d047296_0.js 445 bytes [emitted] (name: __html_6d047296_0)
chunk (runtime: __html_6d047296_0) __html_6d047296_0.js (__html_6d047296_0) 243 bytes [entry] [rendered]
  > ./app.js __html_6d047296_0
  ./src/app.js 243 bytes [built] [code generated]
    [used exports unknown]
    entry ./app.js __html_6d047296_0
chunk (runtime: main) main.js (main) 344 bytes (javascript) 334 bytes (html) 14.6 KiB (asset) 42 bytes (asset-url) [entry] [rendered]
  > ./src/index.html main
  dependent modules 14.6 KiB (asset) 42 bytes (asset-url) [dependent] 1 module
  ./src/index.html 344 bytes (javascript) 334 bytes (html) [built] [code generated]
    [exports: default]
    [used exports unknown]
    entry ./src/index.html main
webpack X.X.X compiled successfully
```

## Production mode

```
assets by chunk 14.9 KiB (auxiliary name: main)
  asset 89a353e9c515885abd8e.png 14.6 KiB [emitted] [immutable] [from: src/logo.png] (auxiliary name: main)
  asset index.html 360 bytes [emitted] (auxiliary name: main)
assets by path *.js 654 bytes
  asset main.js 608 bytes [emitted] [minimized] (name: main)
  asset __html_6d047296_0.js 46 bytes [emitted] [minimized] (name: __html_6d047296_0)
chunk (runtime: __html_6d047296_0) __html_6d047296_0.js (__html_6d047296_0) 243 bytes [entry] [rendered]
  > ./app.js __html_6d047296_0
  ./src/app.js 243 bytes [built] [code generated]
    [no exports used]
    entry ./app.js __html_6d047296_0
chunk (runtime: main) main.js (main) 344 bytes (javascript) 334 bytes (html) 14.6 KiB (asset) 42 bytes (asset-url) [entry] [rendered]
  > ./src/index.html main
  dependent modules 14.6 KiB (asset) 42 bytes (asset-url) [dependent] 1 module
  ./src/index.html 344 bytes (javascript) 334 bytes (html) [built] [code generated]
    [exports: default]
    [no exports used]
    entry ./src/index.html main
webpack X.X.X compiled successfully
```
