This configuration will enable the verbose output for the stats report, and it includes various options to display detailed information about the build process, such as:
 
- [asset details](https://webpack.js.org/configuration/stats/#statsassets)
- [chunk details](https://webpack.js.org/configuration/stats/#statschunks)
- [module details](https://webpack.js.org/configuration/stats/#statsmodules)

You see that everything is working nicely together.

# example.js

```javascript
console.log("Hello World!");
```

# webpack.config.js

```javascript
const path = require("path");

module.exports = {
    entry: {
		main: "./example"
	},
	output: {
		path: path.join(__dirname, "dist"),
		filename: "output.js",
	},
	stats: {
		hash: true,
		builtAt: true,
		relatedAssets: true,
		entrypoints: true,
		chunkGroups: true,
		ids: true,
		modules: false,
		chunks: true,
		chunkRelations: true,
		chunkModules: true,
		dependentModules: true,
		chunkOrigins: true,
		depth: true,
		env: true,
		reasons: true,
		usedExports: true,
		providedExports: true,
		optimizationBailout: true,
		errorDetails: true,
		errorStack: true,
		publicPath: true,
		logging: "none",
		orphanModules: true,
		runtimeModules: true,
		exclude: false,
		modulesSpace: Infinity,
		chunkModulesSpace: Infinity,
		assetsSpace: Infinity,
		reasonsSpace: Infinity,
		children: true
	}
};
```

# dist/output.js

```javascript
/******/ (() => { // webpackBootstrap
var __webpack_exports__ = {};
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
PublicPath: dist/
asset output.js 28 bytes {179} [emitted] [minimized] (name: main)
Entrypoint main 28 bytes = output.js
chunk {179} (runtime: main) output.js (main) 29 bytes [entry] [rendered]
  > ./example.js main
  ./example.js [144] 29 bytes {179} [depth 0] [built] [code generated]
    [no exports used]
    Statement (ExpressionStatement) with side effects in source code at 1:0-28
    ModuleConcatenation bailout: Module is not an ECMAScript module
    entry ./example.js main
  
2023-04-13 06:20:06: webpack 5.78.0 compiled successfully (99ac9d9be98086178b45)
```
