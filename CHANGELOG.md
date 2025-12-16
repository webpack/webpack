# webpack

## 5.104.0

### Minor Changes

- d3dd841: Use method shorthand to render module content in `__webpack_modules__` object.
- d3dd841: Enhance `import.meta.env` to support object access.
- 4baab4e: Optimize dependency sorting in updateParent: sort each module only once by deferring to finishUpdateParent(), and reduce traversal count in sortWithSourceOrder by caching WeakMap values upfront.
- 04cd530: Handle more at-rules for CSS modules.
- cafae23: Added options to control the renaming of at-rules and various identifiers in CSS modules.
- d3dd841: Added `base64url`, `base62`, `base58`, `base52`, `base49`, `base36`, `base32` and `base25` digests.
- 5983843: Provide a stable runtime function variable `__webpack_global__`.
- d3dd841: Improved `localIdentName` hashing for CSS.

### Patch Changes

- 22c48fb: Added module existence check for informative error message in development mode.
- 50689e1: Use the fully qualified class name (or export name) for `[fullhash]` placeholder in CSS modules.
- d3dd841: Support universal lazy compilation.
- d3dd841: Fixed module library export definitions when multiple runtimes.
- d3dd841: Fixed CSS nesting and CSS custom properties parsing.
- d3dd841: Don't write fragment from URL to filename and apply fragment to module URL.
- aab1da9: Fixed bugs for `css/global` type.
- d3dd841: Compatibility `import.meta.filename` and `import.meta.dirname` with `eval` devtools.
- d3dd841: Handle nested `__webpack_require__`.
- 728ddb7: The speed of identifier parsing has been improved.
- 0f8b31b: Improve types.
- d3dd841: Don't corrupt `debugId` injection when `hidden-source-map` is used.
- 2179fdb: Re-validate HttpUriPlugin redirects against allowedUris, restrict to http(s) and add a conservative redirect limit to prevent SSRF and untrusted content inclusion. Redirects failing policy are rejected before caching/lockfile writes.
- d3dd841: Serialize `HookWebpackError`.
- d3dd841: Added ability to use built-in properties in dotenv and define plugin.
- 3c4319f: Optimizing the regular expression character class by specifying ranges for runtime code.
- d3dd841: Reduce collision for local indent name in CSS.
- d3dd841: Remove CSS link tags when CSS imports are removed.
