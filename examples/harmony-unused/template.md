This example demonstrates how webpack tracks the using of ES6 imports and exports. Only used exports are emitted to the resulting bundle. The minimizing step than removes the declarations because they are ununsed.

In this example only `add` and `multiply` in `./math.js` are used used by the app. `list` is unused and is not included in the minimized bundle (Look for `Array.from` in the minimized bundle).

In addition to that `library.js` simulates an entry point to a big library. `library.js` reexports multiple identifiers from submodules. Often big parts of that is unsed like `abc.js`. Here is visible how the usage information flows from `example.js` through `library.js` into `abc.js` and all declarations in `abc.js` are not included in the minimized bundle (Look for `console.log("a")` in the minimized bundle).


# example.js

``` javascript
{{example.js}}
```

# math.js

``` javascript
{{math.js}}
```

# library.js

``` javascript
{{library.js}}
```

# js/output.js

``` javascript
{{js/output.js}}
```

# js/output.js

``` javascript
{{min:js/output.js}}
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