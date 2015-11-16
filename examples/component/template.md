This example demonstrates the usage of [component](https://github.com/component/component) built with webpack.

Components declare scripts and styles in a special `component.json` file. This file is handled by the plugin. In addition to that there is a different resolution algorithm for components.

You can see that the component-webpack-plugin handles these components including scripts, styles and other assets.

# example.js

``` javascript
{{example.js}}
```

# webpack.config.js

``` javascript
{{webpack.config.js}}
```

# component.json

``` javascript
{{component.json}}
```

# components/webpack-a-component/component.json

``` javascript
{{components/webpack-a-component/component.json}}
```

# components/webpack-a-component/style.css

``` css
{{components/webpack-a-component/style.css}}
```

# js/output.js

``` javascript
{{js/output.js}}
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