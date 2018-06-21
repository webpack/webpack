This is the vendor build part.

It's built separately from the app part. The vendors dll is only built when the array of vendors has changed and not during the normal development cycle.

The DllPlugin in combination with the `output.library` option exposes the internal require function as global variable in the target environment.

A manifest is creates which includes mappings from module names to internal ids.

### webpack.config.js

``` javascript
{{webpack.config.js}}
```

# example-vendor

``` javascript
{{../node_modules/example-vendor.js}}
```

# dist/vendor.js

``` javascript
{{dist/vendor.js}}
```

# dist/vendor-manifest.json

``` javascript
{{dist/vendor-manifest.json}}
```

# Info

## Unoptimized

```
{{stdout}}
```

## Production mode

```
{{production:stdout}}
```

