This example shows Hot Module Replacement (HMR) for the three platform setups, all sharing one module that gets hot-swapped at runtime.

The download/apply runtime is the same everywhere; only the **trigger** (what tells the app to check for an update) differs:

- **Web** — `webpack/hot/dev-server` reacts to the update signal pushed by `webpack-dev-server` over EventSource. Run it with `webpack serve`.
- **Node** — there is no EventSource, so a Node trigger drives the check: `webpack/hot/poll` re-checks on a timer (`webpack/hot/signal` waits for a process signal). Run it with `webpack --watch` and `node dist/node/main.js`, then edit `message.js`.
- **Universal** — one ESM bundle for web *and* Node. `webpack/hot/dev-server` is universal: it consumes the same update signal on either platform (a browser dev-server, or a Node dev-server/middleware feeding the emitter), so no per-target client is needed.

Edit `message.js` while the app runs to see the module reload in place — no full restart, no page reload.

# message.js

```javascript
module.exports =
	"Hello! Edit this message, save, and watch HMR swap it in without a reload.";
```

# web.js

```javascript
// Browser HMR: webpack-dev-server pushes update signals over EventSource and
// the dev-server client runs the check. Start it with `webpack serve`.
import "webpack/hot/dev-server";

const render = () => {
	document.body.textContent = require("./message");
};

render();

if (module.hot) {
	module.hot.accept("./message", render);
}
```

# node.js

```javascript
// Node HMR: there is no EventSource, so a Node trigger drives the check.
// `webpack/hot/poll` re-checks on a timer; `webpack/hot/signal` waits for
// SIGUSR2. Run with `webpack --watch` and `node dist/node/main.js`.
import "webpack/hot/poll?1000";

const render = () => {
	console.log("message:", require("./message"));
};

render();

if (module.hot) {
	module.hot.accept("./message", render);
}
```

# universal.js

```javascript
// One ESM bundle for web and Node. The dev-server client is universal: it
// listens for the same update signal on either platform (browser dev-server,
// or a Node dev-server/middleware feeding the emitter), so no per-target client
// is needed.
import message from "./message";
import "webpack/hot/dev-server";

const render = () => {
	if (typeof document !== "undefined") {
		document.body.textContent = message;
	} else {
		console.log("message:", message);
	}
};

render();

if (import.meta.webpackHot) {
	import.meta.webpackHot.accept("./message", render);
}
```

# webpack.config.js

```javascript
"use strict";

const path = require("path");
const { HotModuleReplacementPlugin } = require("../../");

// `webpack` resolves to this repo only because the example lives inside it;
// real projects can drop this alias and import `webpack/hot/*` directly.
/** @type {import("../../").Configuration} */
const base = {
	mode: "development",
	context: __dirname,
	devtool: false,
	resolve: { alias: { webpack: path.resolve(__dirname, "../../") } },
	plugins: [new HotModuleReplacementPlugin()]
};

/** @type {import("../../").Configuration[]} */
const config = [
	// Web — driven by webpack-dev-server (`webpack serve`).
	{
		...base,
		name: "web",
		target: "web",
		entry: "./web.js",
		output: { path: path.resolve(__dirname, "dist/web"), filename: "main.js" }
	},
	// Node — driven by webpack/hot/poll (`webpack --watch` + `node dist/node/main.js`).
	{
		...base,
		name: "node",
		target: "node",
		entry: "./node.js",
		output: { path: path.resolve(__dirname, "dist/node"), filename: "main.js" }
	},
	// Universal — single ESM bundle for web + Node, one dev-server client.
	{
		...base,
		name: "universal",
		target: ["web", "node"],
		entry: "./universal.js",
		experiments: { outputModule: true },
		output: {
			path: path.resolve(__dirname, "dist/universal"),
			filename: "main.mjs",
			module: true,
			chunkFormat: "module"
		}
	}
];

module.exports = config;
```
