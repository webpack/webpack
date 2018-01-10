This example combines Code Splitting and Loaders. Make sure you have read the documentation of the examples that show the feature alone.

The bundle loader is used to create a wrapper module for `file.js` that loads this module on demand. The wrapper module returns a function that can be called to asynchronously receive the inner module.

# example.js

``` javascript
{{example.js}}
```

# file.js

``` javascript
{{file.js}}
```


# dist/output.js

``` javascript
{{dist/output.js}}
```

# dist/0.output.js

``` javascript
{{dist/0.output.js}}
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
