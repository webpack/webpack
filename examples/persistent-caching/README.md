# example.js

```javascript
console.log(process.env.NODE_ENV);

import "./example.css";
import "react";
import "react-dom";
import "acorn";
import "core-js";
import "date-fns";
```

# webpack.config.js

```javascript
const path = require("path");
module.exports = (env = "development") => ({
	mode: env,
	infrastructureLogging: {
		// Optional: print more verbose logging about caching
		level: "verbose"
	},
	cache: {
		type: "filesystem",

		// changing the cacheDirectory is optional,
		// by default it will be in `node_modules/.cache`
		cacheDirectory: path.resolve(__dirname, ".cache"),

		// Add additional dependencies to the build
		buildDependencies: {
			// recommended to invalidate cache on config changes
			// This also makes all dependencies of this file build dependencies
			config: [__filename]
			// By default webpack and loaders are build dependencies
		}
	},
	module: {
		rules: [
			{
				test: /\.css$/,
				use: ["style-loader", "css-loader"]
			}
		]
	}
});
```

# Info

```
Hash: 0a1b2c3d4e5f6a7b8c9d
Version: webpack 5.0.0-beta.6
    Asset   Size
output.js  2 MiB  [emitted]  [name: main]
Entrypoint main = output.js
chunk output.js (main) 1.74 MiB (javascript) 0 bytes (runtime) [entry]
    > ./example.js main
    529 chunk modules
```
