This example combines Code Splitting and Loaders. Make sure you have read the documentation of the examples that show the feature alone.

The bundle loader is used to create a wrapper module for `file.js` that loads this module on demand. The wrapper module returns a function that can be called to asynchronously receive the inner module.

# example.js

```javascript
_{{example.js}}_
```

# file.js

```javascript
_{{file.js}}_
```

# dist/output.js

```javascript
_{{dist/output.js}}_
```

# dist/929.output.js

```javascript
_{{dist/929.output.js}}_
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
