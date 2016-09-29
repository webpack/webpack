This example shows how you can mix different module styles in webpack. Here CommonJs, AMD and Harmony Modules (ES6 Modules) are used. In addition to that there are different types of dynamic requires (`"../require.context/templates/"+amd1+".js"` and `Math.random() < 0.5 ? "./commonjs" : "./amd"`).

You see that everything is working nicely together.

# example.js

``` javascript
{{example.js}}
```

# amd.js

``` javascript
{{amd.js}}
```

# commonjs.js

``` javascript
{{commonjs.js}}
```

# js/output.js

``` javascript
{{js/output.js}}
```

# js/0.output.js

``` javascript
{{js/0.output.js}}
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
