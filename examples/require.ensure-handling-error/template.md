# WARNING
JsonpErrorHandlingPlugin breaks backward compatibility for require.ensure callback function.
function will be call always and first argument will be Error or null, the second argument is require.

You may simulate default behavior in runtime code:

``` javascript
var
    defaultEnsure = __webpack_require__.e;

if (defaultEnsure) {
    __webpack_require__.e = function (chunk, callback, name) {
        defaultEnsure.call(null, chunk, function (error, _require) {
            if (!error) callback(_require);
        }, name);
    }
}
```

# example.js

``` javascript
{{example.js}}
```

# a.js

``` javascript
{{a.js}}
```

# webpack.config.js

``` javascript
{{webpack.config.js}}
```

# js/output.js

``` javascript
{{js/output.js}}
```

# js/a.chunk.output.js

``` javascript
{{js/a.chunk.output.js}}
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
