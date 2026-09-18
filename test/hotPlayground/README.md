# HMR playground

A hand-driven counterpart to `hotCases/`: those assert what an update does, this
one lets you watch it happen in a browser. Nothing here runs in CI.

```sh
yarn playground   # http://localhost:8080
```

Edit any file below and watch the page — the console reports what webpack
replaced, and only the edited panel should change. A full page reload means the
update was rejected and bubbled all the way to the entry.

| File                | Module type      | What editing it demonstrates                                                  |
| ------------------- | ---------------- | ----------------------------------------------------------------------------- |
| `html.js`           | CommonJS         | The entry accepts it, so its callback re-renders the panel.                    |
| `element.js`        | CommonJS         | Accepted by the entry, which swaps the old element for the new one.            |
| `element-dependency.js` | CommonJS     | Accepted by nobody, so the update bubbles to `element.js` and both replace.    |
| `styles.css`        | CSS              | Native CSS, no loader — webpack swaps the stylesheet without reloading.        |
| `styles.module.css` | CSS module       | Class names arrive as named exports; renaming one updates the binding.         |
| `data.json`         | JSON             | A data module, accepted like any other.                                        |
| `logo.svg`          | asset/resource   | The emitted URL changes with the file.                                         |
| `lazy.js`           | async chunk      | Loaded through `import()`, so it updates in a chunk of its own.                |

Add a module type by putting the file here, importing it from `index.js` inside
its own panel, and accepting it in the `module.hot` block at the bottom.
