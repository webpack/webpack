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

# js/output.js

``` javascript
{{js/output.js}}
```

# js/0.output.js

``` javascript
{{js/0.output.js}}
```

# js/1.output.js

``` javascript
{{js/1.output.js}}
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
