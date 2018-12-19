This example shows automatically created async commons chunks.

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

These chunks share modules `a` and `b`. The optimization extract these into chunk Z:

Note: Actually the optimization compare size of chunk Z to some minimum value, but this is disabled from this example. In practice there is no configuration needed for this.

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

# dist/output.js

``` javascript
{{dist/output.js}}
```

# dist/85.output.js

``` javascript
{{dist/85.output.js}}
```

# dist/324.output.js

``` javascript
{{dist/324.output.js}}
```

# dist/911.output.js

``` javascript
{{dist/911.output.js}}
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
