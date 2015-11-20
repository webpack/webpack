A common challenge with combining `[chunkhash]` and Code Splitting is that the entry chunk includes the webpack runtime and with it the chunkhash mappings. This means it's always updated and the `[chunkhash]` is pretty useless, because this chunk won't be cached.

A very simple solution to this problem is to create another chunk which contains only the webpack runtime (including chunkhash map). This can be archieved by the CommonsChunkPlugin (or if the CommonsChunkPlugin is already used by passing multiple names to the CommonChunkPlugin). To avoid the additional request for another chunk, this pretty small chunk can be inlined into the HTML page.

The configuration required for this is:

* use `[chunkhash]` in `output.filename` (Note that this example doesn't do this because of the example generator infrastructure, but you should)
* use `[chunkhash]` in `output.chunkFilename`
* `CommonsChunkPlugin`

# example.js

``` javascript
{{example.js}}
```

# vendor.js

``` javascript
{{vendor.js}}
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

<!-- inlined minimized file "manifest.[chunkhash].js" -->
<script>
{{min:js/manifest.chunkhash.js}}
</script>

<!-- optional when using the CommonChunkPlugin for vendor modules -->
<script src="js/common.[chunkhash].js"></script>

<script src="js/main.[chunkhash].js"></script>

</body>
</html>
```

# js/common.[chunkhash].js

``` javascript
{{js/common.chunkhash.js}}
```

# js/main.[chunkhash].js

``` javascript
{{js/main.chunkhash.js}}
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