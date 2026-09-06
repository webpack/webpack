# example.js

```javascript
_{{example.js}}_
```

# webpack.config.js

`output.copy` copies files and directories into `output.path` as part of the
build: they become real assets, so `output.clean`, the stats output and the
watcher all see them, and a rebuild re-reads only what changed.

A pattern is a `from` plus optional `to`, `filename`, `context`, `globOptions`,
`info` and `transform`. Here the first copies a directory (keeping its structure
below itself) and the second copies **two** roots into one destination, in
order.

The config also registers a small plugin that merges several copied assets into
one — `copy-webpack-plugin`'s `transformAll`. `output.copy` has no equivalent
on purpose: one source file becomes one asset there, so merging is a second pass
over what it emitted, and a second pass is a plugin. The whole of it is below,
caching included: pick the copied assets you want (they carry `info.copied`),
key a cache item on their contents, emit the merged asset and delete the parts.

```javascript
_{{webpack.config.js}}_
```

# dist/THIRD_PARTY_LICENSES.txt

Both `licenses/` roots merged into one asset; the parts are gone from the
output, because the plugin deleted them.

```
_{{dist/THIRD_PARTY_LICENSES.txt}}_
```

# dist/robots.txt

```
_{{dist/robots.txt}}_
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
