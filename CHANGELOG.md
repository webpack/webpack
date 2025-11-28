# webpack

## 5.104.0

### Minor Changes

- d3dd841: Use method shorthand to render module content in `__webpack_modules__` object.
- d3dd841: Enhance `import.meta.env` to support object access.
- d3dd841: Added `base64url`, `base62`, `base58`, `base52`, `base49`, `base36`, `base32` and `base25` digests.
- d3dd841: Improved `localIdentName` hashing for CSS.

### Patch Changes

- d3dd841: Support universal lazy compilation.
- d3dd841: Fixed module library export definitions when multiple runtimes.
- d3dd841: Fixed CSS nesting and CSS custom properties parsing.
- d3dd841: Don't write fragment from URL to filename and apply fragment to module URL.
- d3dd841: Compatibility `import.meta.filename` and `import.meta.dirname` with `eval` devtools.
- d3dd841: Handle nested `__webpack_require__`.
- d3dd841: Don't corrupt `debugId` injection when `hidden-source-map` is used.
- d3dd841: Serialize `HookWebpackError`.
- d3dd841: Added ability to use built-in properties in dotenv and define plugin.
- d3dd841: Reduce collision for local indent name in CSS.
- d3dd841: Remove CSS link tags when CSS imports are removed.
