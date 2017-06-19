# Dll sourceType and dependencies

[DllPlugin documentation](https://webpack.js.org/plugins/dll-plugin)

Uses `libraryTarget` + `sourceType` `"commonjs2"` to create a vendor bundle, and a dependency bundle, on nodejs. Has a single DllPlugin, with multiple DllReferencePlugins.

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

## example-vendor.js

used by `example-app.js`

``` javascript
{{example-vendor.js}}
```

## example-app.js

uses `example-vendor.js`

``` javascript
{{example-app.js}}
```


# Output


## js/app.bundle.js

``` javascript
{{js/app.bundle.js}}
```


## js/vendor.bundle.js
_omitted since it contains the large dependency source code_


## js/vendor-manifest.json

``` javascript
{{js/vendor-manifest.json}}
```


## js/dependencies.bundle.js

_omitted since it contains the large dependency source code_


## js/dependencies-manifest.json

``` javascript
{{js/dependencies-manifest.json}}
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
