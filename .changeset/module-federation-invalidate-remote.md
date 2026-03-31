---
"webpack": minor
---

Add `__webpack_require__.federation.invalidateRemote(moduleId)` runtime API for Module Federation.

When building with `ModuleFederationPlugin` (i.e. `remotes` is configured), webpack now installs a `__webpack_require__.federation` object on every runtime chunk. This object exposes:

- **`invalidateRemote(moduleId)`** — Clears the webpack module cache entry (`__webpack_require__.c`), the module factory (`__webpack_require__.m`), and resets the remote-container fetch-promise flag (`data.p`) for the given module ID. The next invocation of `import()` or `loadRemote()` will therefore re-fetch the remote container and re-execute the federated module with the latest code.

A companion `__webpack_federation__` magic variable is also available in source code (similar to `__webpack_share_scopes__` / `__webpack_init_sharing__`) for ergonomic access without touching `__webpack_require__` directly.

This enables hot-reloading of federated remotes: listen for rebuild signals from a remote's webpack-dev-server, call `invalidateRemote` for the affected module ID, then re-render/re-import the remote component.
