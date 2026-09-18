# HMR playground

A hand-driven counterpart to `hotCases/`: those assert what an update does, this
one lets you watch it happen in a browser, with one panel per module type and
ECMAScript form webpack supports. Nothing here runs in CI.

```sh
yarn playground   # http://localhost:8080
```

Edit any file below and watch the page. Only the edited panel should change — a
full page reload means the update was rejected and bubbled to the entry.

## Module types

| File                | Type / form                | What editing it demonstrates                                             |
| ------------------- | -------------------------- | ------------------------------------------------------------------------ |
| `index.html`        | html entry                 | `experiments.html` — the page is the entry, its `<script>` is the bundle. |
| `html.js`           | CommonJS                   | The entry accepts it, so its callback re-renders the panel.               |
| `element.js`        | CommonJS                   | Accepted by the entry, which swaps the old element for the new one.       |
| `element-dependency.js` | CommonJS               | Accepted by nobody, so the update bubbles and replaces `element.js` too.  |
| `styles.css`        | CSS                        | Native CSS, no loader — the stylesheet swaps without a reload.            |
| `styles.module.css` | CSS module                 | Class names arrive as named exports.                                      |
| `data.json`         | JSON                       | Imported with an import attribute, `with { type: "json" }`.               |
| `logo.svg`          | `asset/resource`           | Emitted as a file; the import is its URL.                                 |
| `logo.svg?inline`   | `asset/inline`             | The same file as a data URI, selected by `resourceQuery`.                 |
| `notes.txt`         | `asset/source`             | The file contents arrive as a string.                                     |
| `add.wat`           | `webassembly/async`        | Compiled by `wast-loader`; the import is awaited for you.                 |
| `add.wat`           | source phase               | `import source` hands back the uninstantiated `WebAssembly.Module`.       |
| `deferred.js`       | `import defer`             | Its body runs only when the namespace is first touched.                  |
| `lazy.js`           | async chunk                | Loaded through `import()`, so it updates in a chunk of its own.           |

## The HMR API

`hmrApi.js` exercises the API rather than a module type:

- `module.hot.data` / `dispose` — the generation counter survives updates.
- `addStatusHandler` / `status()` — the status line follows the update machine.
- `check()` — ask for an update by hand, which is what the dev-server client
  does for you.
- `invalidate()` — drop this module's accept handler, so the next change bubbles.

## Adding a type

Put the file here, import it from `index.js` into its own panel, and accept it
in the `module.hot` block at the bottom. Anything needing a loader or an
experiment flag also goes in `webpack.config.js`.
