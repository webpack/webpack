This is the app part.

The previously built vendor dll is used. The DllReferencePlugin reads the content of the dll from the manifest file and excludes all vendor modules from the compilation. Instead references to these modules will be loaded from the vendor dll via a global variable (`vendor_lib_xxxx`).

# webpack.config.js

``` javascript
{{webpack.config.js}}
```

# example-app.js

``` javascript
{{example-app.js}}
```

# example.html

``` html
{{example.html}}
```

# js/app.js

``` javascript
{{js/app.js}}
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

<!-- @TODO:
  - [ ] examples/dll-mode-and-context
  - [ ] examples/dll-multiple
  - [ ] examples/dll-dependencies
-->
