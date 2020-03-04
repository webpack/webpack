# example.js

This example illustrates how to specify the chunk name in `require.ensure()` and `import()` to separated modules into separate chunks manually.

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
