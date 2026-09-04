# Exposing a module to the global object

Some scripts are not part of the bundle: an inline `<script>`, a plugin written for a `<script>` tag, a snippet a CMS pastes in. They read what they need off the global object, and putting it there is one appended line — the parser reads the assignment as the module's own code.

No loader is needed for that. `NormalModule`'s `processResult` hook hands a plugin what the loaders produced — source, source map and any preparsed AST — and takes back a replacement. It is the same hook [adding exports](../add-exports) and [adding imports](../add-imports) use, and it is small enough to keep in the configuration.

What the line assigns is whatever the module has in scope, so an ES module names the binding it exports, and webpack analyzes that reference like any other. Under `mode: "production"`, `math.js` keeps `add` — renamed with the rest of the module, and hoisted into the entry — while `PI`, which nothing reads, is shaken out; the unoptimized output below keeps both, as it keeps everything. A script that assigns its whole exports object is exposed by appending `globalThis.$ = module.exports;` instead. A name read out of an exports object at runtime, which a module wrapping another one has to do, is neither analyzed nor renamed.

The assignment runs when the module is evaluated, so something still has to import it — a module nothing pulls in is not in the bundle at all. Where the file sits in a package marked `"sideEffects": false` and the importer uses none of its exports, webpack drops that import before it can assign; `{ test: /…/, sideEffects: true }` in `module.rules` says otherwise for that file. And the appended line names the global object itself — nothing rewrites it — so a target that predates `globalThis` is one where `self` or `window` is what the line has to say, here and in whatever reads it back.

# webpack.config.js

```javascript
_{{webpack.config.js}}_
```

# example.js

```javascript
_{{example.js}}_
```

# jquery.js

```javascript
_{{jquery.js}}_
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
