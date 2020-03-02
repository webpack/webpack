This is a simple example that shows the usage of CommonJS.

The three files `example.js`, `increment.js` and `math.js` form a dependency chain. They use `require(dependency)` to declare dependencies.

You can see the output file that webpack creates by bundling them together in one file. Keep in mind that webpack add comments to make reading this file easier. These comments are removed when minimizing the file.

You can also see the info messages that webpack prints to console (for both normal and minimized build).

# example.js

```javascript
_{{example.js}}_
```

# increment.js

```javascript
_{{increment.js}}_
```

# math.js

```javascript
_{{math.js}}_
```

# dist/output.js

```javascript
_{{dist/output.js}}_
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
