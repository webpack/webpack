This example shows that `module.parser.html.template` can be set **per file**
through `module.rules`. Both HTML entry points are rendered with
[Eta](https://eta.js.org/), but `special.html` is matched by a rule that
supplies a differently-configured Eta instance (custom `{{ }}` tags,
`autoEscape` disabled) and its own data. `rule.parser` merges over
`module.parser.html`, so the rule's `template` wins for the matched file while
every other HTML module keeps the default.

# webpack.config.js

```javascript
"use strict";

const { Eta } = require("eta");

// Default Eta instance: standard `<% %>` tags. Used for every html module
// unless a rule overrides it.
const defaultEta = new Eta();
const defaultData = { title: "Home", heading: "Welcome" };

// A differently-configured Eta for the "special" page: custom `{{ }}` tags and
// `autoEscape` disabled (so `raw` is emitted as real markup).
const specialEta = new Eta({ tags: ["{{", "}}"], autoEscape: false });
const specialData = {
	title: "Special",
	heading: "Special page",
	raw: "<p><em>Unescaped</em> markup injected from the template data.</p>"
};

/** @type {import("webpack").Configuration} */
const config = {
	target: "web",
	entry: {
		index: "./src/index.html",
		special: "./src/special.html"
	},
	experiments: {
		html: true
	},
	module: {
		parser: {
			html: {
				// Default for every html module.
				template: (source) => defaultEta.renderString(source, defaultData)
			}
		},
		rules: [
			{
				// Per-file parser options: only `special.html` gets the
				// differently-configured Eta and its own data. `rule.parser`
				// merges over `module.parser.html`, so this `template` wins for
				// the matched file while everything else keeps the default.
				test: /special\.html$/,
				parser: {
					template: (source) => specialEta.renderString(source, specialData)
				}
			}
		]
	}
};

module.exports = config;
```

# src/index.html

Default Eta tags (`<%= %>`).

```html
<!DOCTYPE html>
<html lang="en">
	<head>
		<meta charset="utf-8" />
		<title><%= it.title %></title>
	</head>
	<body>
		<h1><%= it.heading %></h1>
		<p>Rendered with the default Eta options (<code>&lt;% %&gt;</code> tags).</p>
	</body>
</html>
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
		<title>Home</title>
	</head>
	<body>
		<h1>Welcome</h1>
		<p>Rendered with the default Eta options (<code>&lt;% %&gt;</code> tags).</p>
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
assets by path *.js 4.43 KiB
  asset special.js 2.22 KiB [emitted] (name: special)
  asset index.js 2.21 KiB [emitted] (name: index)
assets by path *.html 441 bytes
  asset index.html 223 bytes [emitted] (auxiliary name: index)
  asset special.html 218 bytes [emitted] (auxiliary name: special)
chunk (runtime: index) index.js (index) 233 bytes (javascript) 223 bytes (html) [entry] [rendered]
  > ./src/index.html index
  ./src/index.html 233 bytes (javascript) 223 bytes (html) [built] [code generated]
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
assets by path *.js 868 bytes
  asset index.js 437 bytes [emitted] [minimized] (name: index)
  asset special.js 431 bytes [emitted] [minimized] (name: special)
assets by path *.html 441 bytes
  asset index.html 223 bytes [emitted] (auxiliary name: index)
  asset special.html 218 bytes [emitted] (auxiliary name: special)
chunk (runtime: index) index.js (index) 233 bytes (javascript) 223 bytes (html) [entry] [rendered]
  > ./src/index.html index
  ./src/index.html 233 bytes (javascript) 223 bytes (html) [built] [code generated]
    [exports: default]
    [no exports used]
    entry ./src/index.html index
chunk (runtime: special) special.js (special) 228 bytes (javascript) 218 bytes (html) [entry] [rendered]
  > ./src/special.html special
  ./src/special.html 228 bytes (javascript) 218 bytes (html) [built] [code generated]
    [exports: default]
    [no exports used]
    entry ./src/special.html special
webpack X.X.X compiled successfully
```
