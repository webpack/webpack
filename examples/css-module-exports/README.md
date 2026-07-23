# example.js

```javascript
import * as styles from "./style.module.css";

// `styles` is the CSS Modules name map at runtime. The same map is also
// written to `dist/style.module.css.json` at build time by the plugin in
// webpack.config.js — the native-CSS equivalent of postcss-modules `getJSON`.
document.body.className = styles.link;
```

# style.module.css

```css
.header {
	color: rebeccapurple;
}

.link {
	composes: header;
	text-decoration: underline;
}
```

# webpack.config.js

```javascript
"use strict";

const path = require("path");

/** @typedef {import("webpack").Compiler} Compiler */

/**
 * Emits the CSS Modules name map (original class/id name -> generated scoped
 * name) as a JSON sidecar per CSS module — the native-CSS equivalent of the
 * postcss-modules `getJSON` callback. The map is computed during code
 * generation and stored on `module.buildInfo.cssData.exports` (a
 * `Map<string, string>`), the same source webpack uses to build the JS exports.
 */
class CssModuleExportsJsonPlugin {
	/**
	 * @param {Compiler} compiler the compiler
	 * @returns {void}
	 */
	apply(compiler) {
		const { RawSource } = compiler.webpack.sources;
		const { Compilation } = compiler.webpack;

		compiler.hooks.thisCompilation.tap(
			"CssModuleExportsJsonPlugin",
			(compilation) => {
				compilation.hooks.processAssets.tap(
					{
						name: "CssModuleExportsJsonPlugin",
						stage: Compilation.PROCESS_ASSETS_STAGE_ADDITIONAL
					},
					() => {
						for (const module of compilation.modules) {
							const cssData =
								/** @type {{ exports?: Map<string, string> }=} */
								(module.buildInfo && module.buildInfo.cssData);
							if (!cssData || !cssData.exports || cssData.exports.size === 0) {
								continue;
							}
							const { resource } =
								/** @type {import("webpack").NormalModule} */ (module);
							const json = Object.fromEntries(cssData.exports);
							compilation.emitAsset(
								`${path.basename(resource)}.json`,
								new RawSource(`${JSON.stringify(json, null, 2)}\n`)
							);
						}
					}
				);
			}
		);
	}
}

/** @type {import("webpack").Configuration} */
const config = {
	output: {
		uniqueName: "app"
	},
	experiments: {
		css: true
	},
	plugins: [new CssModuleExportsJsonPlugin()]
};

module.exports = config;
```

# dist/output.css

```css
/*!******************************!*\
  !*** css ./style.module.css ***!
  \******************************/
.HbPeKH {
	color: rebeccapurple;
}

.ZADK33 {
	text-decoration: underline;
}
```

# dist/style.module.css.json

The CSS Modules name map, emitted by the plugin — the same data postcss-modules
exposes via its `getJSON` callback.

```json
{
  "header": "HbPeKH",
  "link": "ZADK33 HbPeKH"
}
```

# Info

## Unoptimized

```
asset output.js 3.12 KiB [emitted] (name: main)
asset output.css 185 bytes [emitted] (name: main)
asset style.module.css.json 52 bytes [emitted]
Entrypoint main 3.3 KiB = output.js 3.12 KiB output.css 185 bytes
chunk (runtime: main) output.js, output.css (main) 398 bytes (javascript) 94 bytes (css) 241 bytes (runtime) [entry] [rendered]
  > ./example.js main
  runtime modules 241 bytes 2 modules
  dependent modules 84 bytes (javascript) 94 bytes (css) [dependent] 1 module
  ./example.js 314 bytes [built] [code generated]
    [no exports]
    [used exports unknown]
    entry ./example.js main
webpack X.X.X compiled successfully
```

## Production mode

```
asset output.css 78 bytes [emitted] (name: main)
asset output.js 63 bytes [emitted] [minimized] (name: main)
asset style.module.css.json 30 bytes [emitted]
Entrypoint main 141 bytes = output.js 63 bytes output.css 78 bytes
chunk (runtime: main) output.js, output.css (main) 446 bytes (javascript) 94 bytes (css) 0 bytes (runtime) [entry] [rendered]
  > ./example.js main
  runtime modules 0 bytes 1 module
  ./example.js + 1 modules 380 bytes [built] [code generated]
    [no exports]
    [no exports used]
    entry ./example.js main
  css ./style.module.css 66 bytes (javascript) 94 bytes (css) [built] [code generated]
    [exports: header, link]
    [only some exports used: link]
webpack X.X.X compiled successfully
```
