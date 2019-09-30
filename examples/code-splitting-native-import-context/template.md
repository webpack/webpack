# example.js

This example illustrates how to leverage the `import()` syntax to create ContextModules which are separated into separate chunks for each module in the `./templates` folder.

```javascript
_{{example.js}}_
```

# templates/

- foo.js
- baz.js
- bar.js

All templates are of this pattern:

```javascript
_{{templates/foo.js}}_
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
