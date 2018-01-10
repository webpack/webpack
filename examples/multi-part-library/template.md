This example demonstrates how to build a complex library with webpack. The library consist of multiple parts that are usable on its own and together.

When using this library with script tags it exports itself to the namespace `MyLibrary` and each part to a property in this namespace (`MyLibrary.alpha` and `MyLibrary.beta`). When consuming the library with CommonsJs or AMD it just export each part.

We are using multiple entry points (`entry` option) to build every part of the library as separate output file. The `output.filename` option contains `[name]` to give each output file a different name.

We are using the `libraryTarget` option to generate a UMD ([Universal Module Definition](https://github.com/umdjs/umd)) module that is consumable in CommonsJs, AMD and with script tags. The `library` option defines the namespace. We are using `[name]` in the `library` option to give every entry a different namespace.

You can see that webpack automatically wraps your module so that it is consumable in every environment. All you need is this simple config.

Note: You can also use the `library` and `libraryTarget` options without multiple entry points. Then you don't need `[name]`.

Note: When your library has dependencies that should not be included in the compiled version, you can use the `externals` option. See [externals example](https://github.com/webpack/webpack/tree/master/examples/externals).

# webpack.config.js

``` javascript
{{webpack.config.js}}
```

# dist/MyLibrary.alpha.js

``` javascript
{{dist/MyLibrary.alpha.js}}
```

# dist/MyLibrary.beta.js

``` javascript
{{dist/MyLibrary.beta.js}}
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
