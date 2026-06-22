This example demonstrates how to split the bundle into multiple smaller chunks to improve caching using `optimization.splitChunks` with a `maxSize`. This works best with an HTTP2 web server, otherwise, there is an overhead for the increased number of requests.

Setting `maxSize` tells webpack to split chunks that are bigger than this size into smaller ones. In this example, it tries to create chunks with <50kB raw code, which typically minimizes to ~10kB. Modules are grouped by folder structure, because modules in the same folder are likely to have similar repetitive text, making them gzip efficiently together. They are also likely to change together.

`chunks: "all"` applies the splitting to all chunks, including the initial ones. Chunk content is deterministic, so the same `[chunkhash]` is emitted as long as a chunk's modules don't change. Since changes to application code between one build and the next are usually in only a few modules, the unchanged chunks keep their hash and stay in the client's cache.

There is a tradeoff here:

The caching improves with smaller `maxSize`, as chunks change less often and can be reused more often after an update.

The compression improves with bigger `maxSize`, as gzip works better for bigger files. It's more likely to find duplicate strings, etc.

The backward compatibility (non-HTTP2 client) improves with bigger `maxSize`, as the number of requests decreases.

```js
_{{webpack.config.js}}_
```

# Info

## Unoptimized

```
_{{stdout}}_
```

## Production mode

```
_{{production:stdout}}_
```
