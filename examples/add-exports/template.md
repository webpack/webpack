# Adding exports to a module

Some files export nothing: a legacy script that only defines globals, a vendored file, a bundle that was never written as a module. Appending the exports before webpack parses the file is enough — the parser reads them as the module's own, so they take part in tree shaking, mangling, const inlining and scope hoisting exactly like an `export` written in the source.

No loader is needed for that. `NormalModule`'s `processResult` hook hands a plugin what the loaders produced — source, source map and any preparsed AST — and takes back a replacement.

Which format to append is the module's own: a script takes `module.exports = …`, an ES module takes `export { … }` — and appending an `export` is itself what makes a file an ES module, as it would be in the source. Appending moves nothing before it, so the source map is still valid; a preparsed AST is dropped, because webpack would otherwise parse that instead of the appended code.

# internals/add-exports-plugin.js

```javascript
_{{internals/add-exports-plugin.js}}_
```

# webpack.config.js

```javascript
_{{webpack.config.js}}_
```

# example.js

```javascript
_{{example.js}}_
```

# legacy-global.js

```javascript
_{{legacy-global.js}}_
```

# math.js

```javascript
_{{math.js}}_
```

# dist/output.js

```javascript
_{{dist/output.js}}_
```

# Info

## Unoptimized

```
_{{stdout}}_
```

## Production mode

```
_{{production:stdout}}_
```
