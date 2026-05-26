This example shows that `module.parser.html.template` can be set **per file**
through `module.rules`. Both HTML entry points are rendered with
[Eta](https://eta.js.org/), but `special.html` is matched by a rule that
supplies a differently-configured Eta instance (custom `{{ }}` tags,
`autoEscape` disabled) and its own data. `rule.parser` merges over
`module.parser.html`, so the rule's `template` wins for the matched file while
every other HTML module keeps the default.

# webpack.config.js

```javascript
_{{webpack.config.js}}_
```

# src/index.html

Default Eta tags (`<%= %>`).

```html
_{{src/index.html}}_
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
