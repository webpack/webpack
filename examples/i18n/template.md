This example uses the I18nPlugin in combination with the multi-compiler feature.

The `webpack.config.js` exports an array of all config combinations that should be compiled. In this example two different parameters for the I18nPlugin are used.

The I18nPlugin replaces every occurrence of the i18n function `__(...)` with a const string. i. e. `__("Hello World")` with `"Hello World"` resp. `"Hallo Welt"`.


# example.js

``` javascript
{{example.js}}
```

# webpack.config.js

``` javascript
{{webpack.config.js}}
```

# de.json

``` javascript
{{de.json}}
```

# js/de.output.js

``` javascript
{{js/de.output.js}}
```

# js/en.output.js

``` javascript
{{js/en.output.js}}
```

# Info

## Uncompressed

```
{{stdout}}
```

## Minimized (uglify-js, no zip)

```
{{min:stdout}}
```