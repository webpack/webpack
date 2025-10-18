This example demonstrates how to use ManifestPlugin.

# example.js

```js
import fooURL from "./foo.txt";

const barURL = new URL("./bar.txt", import.meta.url);

async function loadAsync() {
	return import("./async.js");
}

await loadAsync();

export default [fooURL, barURL];
```

# webpack.config.js

```javascript
"use strict";

const YAML = require("yamljs");
const webpack = require("../../");

let common = {};

/** @type {webpack.Configuration} */
module.exports = {
	devtool: "source-map",
	output: {
		chunkFilename: "[name].[contenthash].js"
	},
	module: {
		rules: [
			{
				test: /foo.txt/,
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
			prefix: "/nested/[publicpath]",
			filter(item) {
				if (/.map$/.test(item.file)) {
					return false;
				}

				return true;
			},
			generate(manifest) {
				delete manifest.assets["manifest.json"];
				manifest.custom = "value";
				return manifest;
			},
			serialize(manifest) {
				return YAML.stringify(manifest, 4);
			}
		})
	]
};
```

# dist/manifest.json

```json
{
  "entrypoints": {
    "main": {
      "imports": [
        "output.js"
      ],
      "parents": []
    }
  },
  "assets": {
    "foo.txt": {
      "file": "dist/3ee037f347c64cc372ad18857b0db91f.txt",
      "src": "foo.txt"
    },
    "bar.txt": {
      "file": "dist/a0145fafc7fab801e574.txt",
      "src": "bar.txt"
    },
    "output.js.map": {
      "file": "dist/output.js.map"
    },
    "output.js": {
      "file": "dist/output.js"
    },
    "1.js.map": {
      "file": "dist/1.ff54fb6be6ad1e50220e.js.map"
    },
    "1.js": {
      "file": "dist/1.ff54fb6be6ad1e50220e.js"
    }
  }
}
```

# dist/manifest.yml

```yml
entrypoints:
    main:
        imports:
            - output.js
        parents: []
assets:
    foo.txt:
        file: /nested/dist/3ee037f347c64cc372ad18857b0db91f.txt
        src: foo.txt
    bar.txt:
        file: /nested/dist/a0145fafc7fab801e574.txt
        src: bar.txt
    output.js:
        file: /nested/dist/output.js
    1.js:
        file: /nested/dist/1.ff54fb6be6ad1e50220e.js
custom: value
```

# Collecting all initial scripts and styles

Here is a function to be able to get all initial scripts and styles:

```js
const fs = require("fs");

function importEntrypoints(manifest, name) {
	const seen = new Set();

	function getImported(entrypoint) {
		const scripts = [];
		const styles = [];

		for (const item of entrypoint.imports || []) {
			const importer = manifest.assets[item];

			if (seen.has(item)) {
				continue;
			}

			seen.add(item);

			for (const parent of entrypoint.parents) {
				const [parentStyles, parentScripts] = getImported(manifest.entrypoints[parent])
				styles.push(...parentStyles);
				scripts.push(...parentScripts);
			}

			if (/\.css$/.test(importer.file)) {
				styles.push(importer.file);
			} else {
				scripts.push(importer.file);
			}
		}

		return [styles, scripts];
	}

	return getImported(manifest.entrypoints[name]);
}

const manifest = JSON.parser(fs.readFilsSync("./manifest.json", "utf8"));

// Get all styles and scripts by entry name
const [styles, scripts] = importEntrypoints(manifest, "foo")
```

# Info

## Unoptimized

```
assets by info 877 bytes [immutable]
  asset 1.ff54fb6be6ad1e50220e.js 869 bytes [emitted] [immutable] 1 related asset
  asset 3ee037f347c64cc372ad18857b0db91f.txt 4 bytes [emitted] [immutable] [from: foo.txt] (auxiliary name: main)
  asset a0145fafc7fab801e574.txt 4 bytes [emitted] [immutable] [from: bar.txt] (auxiliary name: main)
asset output.js 15.2 KiB [emitted] (name: main) 1 related asset
asset manifest.json 598 bytes [emitted]
asset manifest.yml 405 bytes [emitted]
chunk (runtime: main) output.js (main) 325 bytes (javascript) 4 bytes (asset) 7.67 KiB (runtime) [entry] [rendered]
  > ./example.js main
  runtime modules 7.67 KiB 9 modules
  dependent modules 4 bytes (asset) 122 bytes (javascript) [dependent] 2 modules
  ./example.js 203 bytes [built] [code generated]
    [exports: default]
    [used exports unknown]
    entry ./example.js main
chunk (runtime: main) 1.ff54fb6be6ad1e50220e.js 24 bytes [rendered]
  > ./async.js ./example.js 6:8-28
  ./async.js 24 bytes [built] [code generated]
    [exports: default]
    [used exports unknown]
    import() ./async.js ./example.js 6:8-28
webpack X.X.X compiled successfully
```

## Production mode

```
assets by info 193 bytes [immutable]
  asset 541.f1d9b957b8d31ed3e6d8.js 185 bytes [emitted] [immutable] [minimized] 1 related asset
  asset 3ee037f347c64cc372ad18857b0db91f.txt 4 bytes [emitted] [immutable] [from: foo.txt] (auxiliary name: main)
  asset a0145fafc7fab801e574.txt 4 bytes [emitted] [immutable] [from: bar.txt] (auxiliary name: main)
asset output.js 3.17 KiB [emitted] [minimized] (name: main) 1 related asset
asset manifest.json 606 bytes [emitted]
asset manifest.yml 409 bytes [emitted]
chunk (runtime: main) 541.f1d9b957b8d31ed3e6d8.js 24 bytes [rendered]
  > ./async.js ./example.js 6:8-28
  ./async.js 24 bytes [built] [code generated]
    [exports: default]
    import() ./async.js ./example.js 6:8-28
chunk (runtime: main) output.js (main) 325 bytes (javascript) 4 bytes (asset) 7.67 KiB (runtime) [entry] [rendered]
  > ./example.js main
  runtime modules 7.67 KiB 9 modules
  dependent modules 4 bytes (asset) 122 bytes (javascript) [dependent] 2 modules
  ./example.js 203 bytes [built] [code generated]
    [exports: default]
    [no exports used]
    entry ./example.js main
webpack X.X.X compiled successfully
```
