This example demonstrates the experimental HTML modules support together with
the `module.parser.html.template` option, using [Eta](https://eta.js.org/) as
the templating engine. `template` compiles each HTML entry to plain HTML
**before** webpack parses it, so the URLs the template emits (the `<img>`
source and the `<script src>`) are still discovered and bundled as regular
webpack dependencies.

It shows three things:

- **Templating** — `src/index.html` is rendered with Eta and a data object
  (title, list items, image URL).
- **Dependency capture** — the template `include`s a partial
  (`src/footer.eta`). Eta resolves partials by reading files, so the config
  wraps `eta.readFile` to record every partial read and calls the context's
  `addDependency` for each, so editing `footer.eta` triggers a rebuild and
  invalidates the cache even though it never becomes a webpack module.
- **Per-file options** — `src/special.html` is matched by a `module.rules`
  entry that hands it a differently-configured Eta (custom `{{ }}` tags,
  `autoEscape` disabled) and its own data. `rule.parser` merges over
  `module.parser.html`, so that `template` wins only for the matched file.

# webpack.config.js

```javascript
_{{webpack.config.js}}_
```

# src/index.html

Default Eta tags (`<%= %>`), with an `include` and a `<script src>`.

```html
_{{src/index.html}}_
```

# src/footer.eta

An Eta partial pulled in via `include(...)`. Registered as a build dependency
through `addDependency`, not bundled as a module.

```
_{{src/footer.eta}}_
```

# src/app.js

```javascript
_{{src/app.js}}_
```

# src/special.html

Custom Eta tags (`{{= }}`) and unescaped output, selected by the rule.

```html
_{{src/special.html}}_
```

# dist/index.html

```html
_{{dist/index.html}}_
```

# dist/special.html

```html
_{{dist/special.html}}_
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
