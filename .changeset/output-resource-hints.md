---
"webpack": minor
---

Add resource-hint (`<link rel="prefetch">` / `<link rel="preload">`) support for URL-referenced assets, configurable both from a project-wide config and from per-asset magic comments. Works for:

- **JavaScript** — `new URL(/* webpackPrefetch: true */ "./img.png", import.meta.url)` and `new Worker(new URL(/* webpackPreload: true */ "./w.js", import.meta.url))`. The hint comment must sit inside the inner `new URL(...)`; comments anywhere else in `new Worker(...)` are ignored.
- **CSS** (`experiments.css`) — `/* webpackPreload: true */ url("./font.woff2")`.
- **HTML** (`experiments.html`) — `<!-- webpackPreload: true --> <img src="./hero.png">`.

Recognized comment keys: `webpackPrefetch`, `webpackPreload`, `webpackFetchPriority`, plus `webpackAs`, `webpackType`, `webpackMedia` on JS `new URL(...)`. The `as` attribute is auto-detected from the file extension when `webpackAs` is omitted.

`output.resourceHints` configures project-wide defaults (single rule or array of rules) that apply to every URL asset without an explicit comment:

```js
module.exports = {
	output: {
		resourceHints: [
			{ test: /\.(png|jpg|webp)$/, prefetch: true, fetchPriority: "low" },
			{ test: /\.woff2$/, preload: true, fetchPriority: "high" }
		]
	}
};
```

Each rule accepts `test` / `include` / `exclude` using the standard webpack condition matchers (regex, string, function, array — same shapes as `module.rules`). Per-call magic comments still win over the project-wide default.

The `<link>` is emitted at chunk startup (not at the `new URL(...)` call site), via a small chunk-runtime module that runs before any user module in the chunk evaluates — for both initial and async chunks — so the browser already has the response in flight by the time user code references it. CSP nonce on the bundle's `<script>` tag is picked up automatically (via `document.currentScript.nonce` for script output, `document.querySelectorAll('script')` matched by `import.meta.url` for `output.module: true`). Plugin authors can extend the generated `<link>` markup via `ResourceHintRuntimeModule.getCompilationHooks(compilation).linkPrefetch` / `.linkPreload`, and new URL emitters can read the same project-wide config via `ResourceHintPlugin.getCompilationResolver(compilation)`.
