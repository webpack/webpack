# example.js

This example illustrates how to filter the ContextModule results of `import()` statements. Only `.js` files that don't
end in `.noimport.js` within the `templates` folder will be bundled.

```javascript
_{{example.js}}_
```

# templates/

- foo.js
- foo.noimport.js
- baz.js
- foo.noimport.js
- bar.js
- foo.noimport.js

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
