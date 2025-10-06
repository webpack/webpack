This example demonstrates how to use webpack internal ManifestPlugin.

# example.js

```js
import("./baz");
```

# foo.txt

```js
foo
```

# bar.txt

```js
bar
```

# baz.js

```js
import foo from "./foo.txt";
import bar from "./bar.txt";

export default foo + bar;
```

# webpack.config.js

```javascript
"use strict";

const webpack = require("../../");

/** @type {webpack.Configuration} */
module.exports = {
	devtool: "source-map",
	module: {
		rules: [
			{
				test: /foo.txt/,
				type: "asset/resource"
			},
			{
				test: /bar.txt/,
				use: require.resolve("file-loader")
			}
		]
	},
	plugins: [
		new webpack.ManifestPlugin({
			filename: "manifest.json"
		}),
		new webpack.ManifestPlugin({
			filename: "manifest.yml",
			handler(manifest) {
				let _manifest = "";
				for (const key in manifest) {
					if (key === "manifest.json") continue;
					_manifest += `- ${key}: '${manifest[key].filePath}'\n`;
				}
				return _manifest;
			}
		})
	]
};
```

# dist/manifest.json

```json
{
  "output.js.map": "dist/output.js.map",
  "main.js": "dist/output.js",
  "bar.txt": "dist/a0145fafc7fab801e574631452de554b.txt",
  "foo.txt": "dist/3ee037f347c64cc372ad.txt",
  "1.output.js.map": "dist/1.output.js.map",
  "1.output.js": "dist/1.output.js"
}
```

# dist/manifest.yml

```yml
- output.js.map: 'dist/output.js.map'
- main.js: 'dist/output.js'
- bar.txt: 'dist/a0145fafc7fab801e574631452de554b.txt'
- foo.txt: 'dist/3ee037f347c64cc372ad.txt'
- 1.output.js.map: 'dist/1.output.js.map'
- 1.output.js: 'dist/1.output.js'
```

# Info

## Unoptimized

```
assets by path *.js 11.9 KiB
  asset output.js 9.61 KiB [emitted] (name: main) 1 related asset
  asset 1.output.js 2.3 KiB [emitted] 1 related asset
assets by path *.txt 8 bytes
  asset 3ee037f347c64cc372ad.txt 4 bytes [emitted] [immutable] [from: foo.txt]
  asset a0145fafc7fab801e574631452de554b.txt 4 bytes [emitted] [immutable] [from: bar.txt]
asset manifest.json 260 bytes [emitted]
asset manifest.yml 240 bytes [emitted]
chunk (runtime: main) output.js (main) 17 bytes (javascript) 5.48 KiB (runtime) [entry] [rendered]
  > ./example.js main
  runtime modules 5.48 KiB 8 modules
  ./example.js 17 bytes [built] [code generated]
    [used exports unknown]
    entry ./example.js main
chunk (runtime: main) 1.output.js 207 bytes (javascript) 4 bytes (asset) [rendered]
  > ./baz ./example.js 1:0-15
  dependent modules 122 bytes (javascript) 4 bytes (asset) [dependent] 2 modules
  ./baz.js 85 bytes [built] [code generated]
    [exports: default]
    [used exports unknown]
    import() ./baz ./example.js 1:0-15
webpack X.X.X compiled successfully
```

## Production mode

```
assets by path *.js 2.17 KiB
  asset output.js 1.94 KiB [emitted] [minimized] (name: main) 1 related asset
  asset 293.output.js 237 bytes [emitted] [minimized] 1 related asset
assets by path *.txt 8 bytes
  asset 3ee037f347c64cc372ad.txt 4 bytes [emitted] [immutable] [from: foo.txt]
  asset a0145fafc7fab801e574631452de554b.txt 4 bytes [emitted] [immutable] [from: bar.txt]
asset manifest.json 268 bytes [emitted]
asset manifest.yml 248 bytes [emitted]
chunk (runtime: main) 293.output.js 4 bytes (asset) 249 bytes (javascript) [rendered]
  > ./baz ./example.js 1:0-15
  ./baz.js + 2 modules 207 bytes [built] [code generated]
    [exports: default]
    import() ./baz ./example.js 1:0-15
  ./foo.txt 4 bytes (asset) 42 bytes (javascript) [built] [code generated]
    [no exports]
chunk (runtime: main) output.js (main) 17 bytes (javascript) 5.48 KiB (runtime) [entry] [rendered]
  > ./example.js main
  runtime modules 5.48 KiB 8 modules
  ./example.js 17 bytes [built] [code generated]
    [no exports used]
    entry ./example.js main
webpack X.X.X compiled successfully
```
