# example.js

This example illustrates how to leverage the `import()` syntax to create ContextModules which are separated into separate chunks for each module in the `./templates` folder.

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

# js/output.js

``` javascript
{{js/output.js}}
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
