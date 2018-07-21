This example shows how to create a async loaded commons chunk.

When a chunk has many child chunks which share common modules the `CommonsChunkPlugin` can extract these common modules into a commons chunk which is loaded in parallel to the requested child chunk.

The example entry references two chunks:

* entry chunk
  * async require -> chunk X
  * async require -> chunk Y
* chunk X
  * module `a`
  * module `b`
  * module `c`
* chunk Y
  * module `a`
  * module `b`
  * module `d`

These chunks share modules `a` and `b`. The `CommonsChunkPlugin` extract these into chunk Z:

* entry chunk
  * async require -> chunk X & Z
  * async require -> chunk Y & Z
* chunk X
  * module `c`
* chunk Y
  * module `d`
* chunk Z
  * module `a`
  * module `b`

Pretty useful for a router in a SPA.


# example.js

``` javascript
{{example.js}}
```

# webpack.config.js

``` javascript
{{webpack.config.js}}
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

# js/2.output.js

``` javascript
{{js/2.output.js}}
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
