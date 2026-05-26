This example demonstrates the experimental HTML modules support together with
the `module.parser.html.template` option. The HTML entry is written as an
[Eta](https://eta.js.org/) template; `template` compiles it to plain HTML
**before** webpack parses it, so the URLs the template emits (the `<img>` source
and the `<script src>`) are still discovered and bundled as regular webpack
dependencies. The rewritten HTML is emitted as `dist/index.html`.

The template also `include`s a partial (`src/footer.eta`). Eta resolves
partials by reading files, so the config wraps `eta.readFile` to record every
partial read and calls the context's `addDependency` for each — that way
editing `footer.eta` triggers a rebuild and invalidates the persistent cache,
even though the partial is never a webpack module itself.

# webpack.config.js

```javascript
_{{webpack.config.js}}_
```

# src/index.html

```html
_{{src/index.html}}_
```

# src/app.js

```javascript
_{{src/app.js}}_
```

# src/footer.eta

An Eta partial pulled in via `include(...)`. Registered as a build dependency
through `addDependency`, not bundled as a module.

```
_{{src/footer.eta}}_
```

# dist/index.html

The template has been rendered (title, list items) and every URL has been
rewritten to point at the emitted assets.

```html
_{{dist/index.html}}_
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
