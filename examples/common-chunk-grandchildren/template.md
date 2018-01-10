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

# dist/2.output.js

``` javascript
{{dist/2.output.js}}
```

# dist/asyncoutput.js

``` javascript
{{dist/asyncoutput.js}}
```

# dist/0.asyncoutput.js

``` javascript
{{dist/0.asyncoutput.js}}
```

# dist/1.asyncoutput.js

``` javascript
{{dist/1.asyncoutput.js}}
```

# dist/2.asyncoutput.js

``` javascript
{{dist/2.asyncoutput.js}}
```

# dist/3.asyncoutput.js

``` javascript
{{dist/3.asyncoutput.js}}
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
