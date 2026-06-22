This example shows Hot Module Replacement (HMR) for the three platform setups, all sharing one module that gets hot-swapped at runtime.

The download/apply runtime is the same everywhere; only the **trigger** (what tells the app to check for an update) differs:

- **Web** — `webpack/hot/dev-server` reacts to the update signal pushed by `webpack-dev-server` over EventSource. Run it with `webpack serve`.
- **Node** — there is no EventSource, so a Node trigger drives the check: `webpack/hot/poll` re-checks on a timer (`webpack/hot/signal` waits for a process signal). Run it with `webpack --watch` and `node dist/node/main.js`, then edit `message.js`.
- **Universal** — one ESM bundle for web *and* Node. `webpack/hot/dev-server` is universal: it consumes the same update signal on either platform (a browser dev-server, or a Node dev-server/middleware feeding the emitter), so no per-target client is needed.

Edit `message.js` while the app runs to see the module reload in place — no full restart, no page reload.

# message.js

```javascript
_{{message.js}}_
```

# web.js

```javascript
_{{web.js}}_
```

# node.js

```javascript
_{{node.js}}_
```

# universal.js

```javascript
_{{universal.js}}_
```

# webpack.config.js

```javascript
_{{webpack.config.js}}_
```
