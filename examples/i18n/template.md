This example uses the I18nPlugin in combination with the multi-compiler feature.

The `webpack.config.js` exports an array of all config combinations that should be compiled. In this example two different parameters for the I18nPlugin are used.

The I18nPlugin replaces every occurrence of the i18n function `__(...)` with a const string. i. e. `__("Hello World")` with `"Hello World"` resp. `"Hallo Welt"`.

# example.js

```javascript
_{{example.js}}_
```

# webpack.config.js

```javascript
_{{webpack.config.js}}_
```

# de.json

```javascript
_{{de.json}}_
```

# dist/de.output.js

```javascript
_{{dist/de.output.js}}_
```

# dist/en.output.js

```javascript
_{{dist/en.output.js}}_
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
