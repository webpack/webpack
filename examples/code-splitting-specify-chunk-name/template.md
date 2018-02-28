# example.js

This example illustrates how to specify chunk name in `require.ensure()` and `import()` to separated modules into separate chunks manually.

``` javascript
{{example.js}}
```

# templates/

* foo.js
* baz.js
* bar.js

All templates are of this pattern:

``` javascript
{{templates/foo.js}}
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
