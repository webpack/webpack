# Dll App and Vendor

[DllPlugin documentation](https://webpack.js.org/plugins/dll-plugin)

[Based on this gist](https://gist.github.com/Eoksni/83d1f1559e0ec00d0e89c33a6d763049)

For the sake of ease in the example, both `webpack.vendor.config` (dll plugin)  & `webpack.app.config` (dll reference plugin) are exported in `webpack.config` in an array.

In the real world, one would likely not build vendor every time, but would build when needed (with a separate build command such as `webpack --config webpack.app.config`), which is why they are separate files.


# Configs

### webpack.app.config.js

``` javascript
{{webpack.app.config.js}}
```

### webpack.vendor.config.js

``` javascript
{{webpack.vendor.config.js}}
```


# Source

# example-vendor.js

used by `example-app.js`

``` javascript
{{example-app.js}}
```

# example-app.js

uses `example-vendor.js`

``` javascript
{{example-app.js}}
```

# html

uses `example-vendor.js`, then `example-app.js`

``` html
{{example.html}}
```


# output

## js/app.bundle.js

``` javascript
{{js/app.bundle.js}}
```

## js/vendor.bundle.js

``` javascript
{{js/vendor.bundle.js}}
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

<!-- @TODO:
  - [ ] examples/dll-mode-and-context
  - [ ] examples/dll-multiple
  - [ ] examples/dll-dependencies
-->
