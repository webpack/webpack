This very simple example shows usage of CommonJS.

The three files `example.js`, `increment.js` and `math.js` form a dependency chain. They use `require(dependency)` to declare dependencies.

You can see the output file that webpack creates by bundling them together in one file. Keep in mind that webpack adds comments to make reading this file easier. These comments are removed when minimizing the file.

You can also see the info messages webpack prints to console (for both normal and minimized build).

# example.js

``` javascript
{{example.js}}
```

# increment.js

``` javascript
{{increment.js}}
```

# math.js

``` javascript
{{math.js}}
```

# dist/output.js

``` javascript
{{dist/output.js}}
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