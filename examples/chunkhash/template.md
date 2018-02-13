A common challenge with combining `[chunkhash]` and Code Splitting is that the entry chunk includes the webpack runtime and with it the chunkhash mappings. This means it's always updated and the `[chunkhash]` is pretty useless, because this chunk won't be cached.

A very simple solution to this problem is to create another chunk which contains only the webpack runtime (including chunkhash map). This can be achieved with the `optimization.runtimeChunk` options. To avoid the additional request for another chunk, this pretty small chunk can be inlined into the HTML page.

The configuration required for this is:

* use `[chunkhash]` in `output.filename` (Note that this example doesn't do this because of the example generator infrastructure, but you should)
* use `[chunkhash]` in `output.chunkFilename` (Note that this example doesn't do this because of the example generator infrastructure, but you should)

# example.js

``` javascript
{{example.js}}
```

# webpack.config.js

``` javascript
{{webpack.config.js}}
```

# index.html

``` html
<html>
<head>
</head>
<body>

<!-- inlined minimized file "runtime~main.[chunkhash].js" -->
<script>
{{production:dist/runtime~main.chunkhash.js}}
</script>

<script src="dist/main.[chunkhash].js"></script>

</body>
</html>
```

# dist/runtime~main.[chunkhash].js

``` javascript
{{dist/runtime~main.chunkhash.js}}
```

# dist/main.[chunkhash].js

``` javascript
{{dist/main.chunkhash.js}}
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
