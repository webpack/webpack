This example demonstrates Scope Hoisting in combination with Code Splitting.

This is the dependency graph for the example: (solid lines express sync imports, dashed lines async imports)

![](graph.png)

All modules except `cjs` are EcmaScript modules. `cjs` is a CommonJs module.

The interesting thing here is that putting all modules in single scope won't work, because of multiple reasons:

* Modules `lazy`, `c`, `d` and `cjs` need to be in a separate chunk
* Module `shared` is accessed by two chunks (different scopes)
* Module `cjs` is a CommonJs module

![](graph2.png)

webpack therefore uses a approach called **"Partial Scope Hoisting"** or "Module concatenation", which chooses the largest possible subsets of ES modules which can be scope hoisted and combines them with the default webpack primitives.

![](graph3.png)

While module concatenation identifiers in modules are renamed to avoid conflicts and internal imports are simplified. External imports and exports from the root module use the existing ESM constructs.

# example.js

``` javascript
{{example.js}}
```

# lazy.js

``` javascript
{{lazy.js}}
```

# a.js

``` javascript
{{node_modules/a.js}}
```

# b.js

``` javascript
{{node_modules/b.js}}
```

# c.js

``` javascript
{{node_modules/c.js}}
```

# d.js

``` javascript
{{node_modules/d.js}}
```

# cjs.js

``` javascript
{{node_modules/cjs.js}}
```

# shared.js

``` javascript
{{node_modules/shared.js}}
```

# shared2.js

``` javascript
{{node_modules/shared2.js}}
```



# webpack.config.js

``` javascript
{{webpack.config.js}}
```




# dist/output.js

``` javascript
{{dist/output.js}}
```

# dist/0.output.js

``` javascript
{{dist/0.output.js}}
```

Minimized

``` javascript
{{production:dist/0.output.js}}
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
