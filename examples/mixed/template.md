This example shows how you can mix different module styles in webpack. Here CommonJS, AMD and Harmony Modules (ES6 Modules) are used. In addition to that there are different types of dynamic requires (`"../require.context/templates/"+amd1+".js"` and `Math.random() < 0.5 ? "./commonjs" : "./amd"`).

You see that everything is working nicely together.

# example.js

```javascript
_{{example.js}}_
```

# amd.js

```javascript
_{{amd.js}}_
```

# commonjs.js

```javascript
_{{commonjs.js}}_
```

# dist/output.js

```javascript
_{{dist/output.js}}_
```

# dist/635.output.js

```javascript
_{{dist/635.output.js}}_
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
