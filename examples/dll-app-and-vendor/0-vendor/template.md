This is the vendor build part.

It's built separately from the app part. The vendors dll is only built when the array of vendors has changed and not during the normal development cycle.

The DllPlugin in combination with the `output.library` option exposes the internal require function as global variable in the target environment.

A manifest is created which includes mappings from module names to internal ids.

### webpack.config.js

```javascript
_{{webpack.config.js}}_
```

# example-vendor

```javascript
_{{../node_modules/example-vendor.js}}_
```

# dist/vendor.js

```javascript
_{{dist/vendor.js}}_
```

# dist/vendor-manifest.json

```javascript
_{{dist/vendor-manifest.json}}_
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
