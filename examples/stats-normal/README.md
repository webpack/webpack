This configuration will enable the normal output for the stats report.

You see that everything is working nicely together.

# example.js

```javascript
console.log("Hello World!");
```

# webpack.config.js

```javascript
const path = require("path");

module.exports = {
    output: {
		path: path.join(__dirname, "dist"),
		filename: "output.js"
	},
	stats: "normal"
};
```

# dist/output.js

```javascript
/******/ (() => { // webpackBootstrap
/*!********************!*\
  !*** ./example.js ***!
  \********************/
/*! unknown exports (runtime-defined) */
/*! runtime requirements:  */
console.log("Hello World!");

/******/ })()
;
```

# Info

## Production mode

```
asset [1m[32moutput.js[39m[22m 28 bytes [1m[32m[emitted][39m[22m [1m[32m[minimized][39m[22m (name: main)
[1m./example.js[39m[22m 29 bytes [1m[33m[built][39m[22m [1m[33m[code generated][39m[22m
webpack 5.99.7 compiled [1m[32msuccessfully[39m[22m
```