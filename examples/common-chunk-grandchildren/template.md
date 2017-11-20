This example illustrates how common modules from deep ancestors of an entry point can be split into a seperate common chunk

* `pageA` and `pageB` are dynamically required
* `pageC` and `pageA` both require the `reusableComponent`
* `pageB` dynamically requires `PageC`

You can see that webpack outputs four files/chunks:

* `output.js` is the entry chunk and contains
  * the module system
  * chunk loading logic
  * the entry point `example.js`
  * module `reusableComponent`
* `0.output.js` is an additional chunk
  * module `pageC`
* `1.output.js` is an additional chunk
  * module `pageB`
* `2.output.js` is an additional chunk
  * module `pageA`


# example.js

``` javascript
{{example.js}}
```

# pageA.js

``` javascript
{{pageA.js}}
```

# pageB.js

``` javascript
{{pageB.js}}
```

# pageC.js

``` javascript
{{pageC.js}}
```

# reusableComponent.js

``` javascript
{{reusableComponent.js}}
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

# js/asyncoutput.js

``` javascript
{{js/asyncoutput.js}}
```

# js/0.asyncoutput.js

``` javascript
{{js/0.asyncoutput.js}}
```

# js/1.asyncoutput.js

``` javascript
{{js/1.asyncoutput.js}}
```

# js/2.asyncoutput.js

``` javascript
{{js/2.asyncoutput.js}}
```

# js/3.asyncoutput.js

``` javascript
{{js/3.asyncoutput.js}}
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
