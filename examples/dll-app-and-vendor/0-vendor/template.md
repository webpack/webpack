This is the vendor build part.

It's built separatly from the app part. The vendors dll is only built when vendors has changed and not while the normal development cycle.

The DllPlugin in combination with the `output.library` option exposes the internal require function as global variable in the target enviroment.

A manifest is creates which includes mappings from module names to internal ids.

### webpack.config.js

``` javascript
{{webpack.config.js}}
```

# example-vendor

``` javascript
{{../node_modules/example-vendor.js}}
```

# js/vendor.js

``` javascript
{{js/vendor.js}}
```

# js/vendor-manifest.json

``` javascript
{{js/vendor-manifest.json}}
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

