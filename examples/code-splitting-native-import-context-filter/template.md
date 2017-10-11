# example.js

This example illustrates how to filter the ContextModule results of `import()` statements. only the items that don't 
have `.noimport` within the `templates` folder will be bundled.

``` javascript
{{example.js}}
```

# the filter

``` javascript
/^(?:[^.]*(?:\.(?!noimport(?:\.js)?$))?)*$/
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
