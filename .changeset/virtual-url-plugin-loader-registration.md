---
"webpack": minor
---

Add `VirtualUrlPlugin.getPlugin()` static method and `addModule()` instance method to allow loaders to register virtual modules dynamically without requiring a pre-configured plugin in `webpack.config.js`.

Previously, calling `new VirtualUrlPlugin(...).apply(compiler)` from a loader had no effect because the plugin's `compiler.hooks.compilation` tap fired too late—the compilation was already in progress. Now, `apply()` detects an in-progress compilation via `compiler._lastCompilation` and immediately sets up scheme-handling hooks for it.

**New API:**

```js
// In a loader — no VirtualUrlPlugin needed in webpack.config.js
const { VirtualUrlPlugin } = require("webpack").experiments.schemes;

module.exports = function myLoader(content) {
	let plugin = VirtualUrlPlugin.getPlugin(this._compiler);
	if (!plugin) {
		plugin = new VirtualUrlPlugin({});
		plugin.apply(this._compiler);
	}
	plugin.addModule("my-module.js", `export const value = 42;`);
	return `export { value } from "virtual:my-module.js";`;
};
```

`addModule(id, config)` accepts the same content formats as the `modules` constructor option (string, function, or `VirtualModule` object), with or without the `virtual:` prefix.
