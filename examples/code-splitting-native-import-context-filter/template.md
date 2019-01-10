# example.js

This example illustrates how to filter the ContextModule results of `import()` statements. only `.js` files that don't 
end in `.noimport.js` within the `templates` folder will be bundled.

``` javascript
{{example.js}}
```

# templates/

* foo.js
* foo.noimport.js
* baz.js
* foo.noimport.js
* bar.js
* foo.noimport.js

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
