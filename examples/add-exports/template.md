# Adding exports to a module

Some files export nothing: a legacy script that only defines globals, a vendored file, a bundle that was never written as a module. Appending the exports before webpack parses the file is enough — the parser reads them as the module's own.

No loader is needed for that. `NormalModule`'s `processResult` hook hands a plugin what the loaders produced — source, source map and any preparsed AST — and takes back a replacement.

Which format to append is the module's own, and the two are not equivalent. `export { … }` is what makes a file an ES module, exactly as it would be in the source, so those exports are analyzable: below, `math.js` has its `PI` inlined into the call site and its `add` hoisted into the entry, like any `export` webpack reads. `module.exports = …` keeps the file the script it is, and webpack treats it as it treats any module whose whole exports object is assigned a value — `legacy-global.js` below keeps runtime-defined exports and is not analyzed that way. Prefer the ES module form where the file tolerates it.

Appending moves nothing before it, so the source map is still valid; a preparsed AST is dropped, because webpack would otherwise parse that instead of the appended code.

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
