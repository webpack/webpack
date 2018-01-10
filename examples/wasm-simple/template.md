This very simple example shows usage of WebAssembly.

WebAssembly modules can be imported like other modules. Their download and compilation happens in parallel to the download and evaluation of the javascript chunk.

# example.js

``` javascript
{{example.js}}
```

# math.js

``` javascript
{{math.js}}
```

# dist/output.js

``` javascript
{{dist/output.js}}
```

# dist/0.output.js

``` javascript
{{dist/0.output.js}}
```

# dist/1.output.js

``` javascript
{{dist/1.output.js}}
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
