# example.js

```javascript
console.log(process.env.NODE_ENV);

import "./example.css";
import "react";
import "react-dom";
import "acorn";
import "core-js";
import "date-fns";
import "lodash";
import * as _ from "lodash-es";
console.log(_);
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

## Unoptimized

```
asset output.js 3.57 MiB [emitted] (name: main)
chunk (runtime: main) output.js (main) 2.22 MiB (javascript) 1.29 KiB (runtime) [entry]
  > ./example.js main
  cached modules 2.22 MiB (javascript) 1.29 KiB (runtime) [cached] 1492 modules
webpack X.X.X compiled successfully
```

## Production mode

```
asset output.js 541 KiB [emitted] [minimized] [big] (name: main) 1 related asset
chunk (runtime: main) output.js (main) 2.16 MiB (javascript) 1.29 KiB (runtime) [entry]
  > ./example.js main
  cached modules 2.16 MiB (javascript) 1.29 KiB (runtime) [cached] 869 modules

WARNING in asset size limit: The following asset(s) exceed the recommended size limit (244 KiB).
This can impact web performance.
Assets: 
  output.js (541 KiB)

WARNING in entrypoint size limit: The following entrypoint(s) combined asset size exceeds the recommended limit (244 KiB). This can impact web performance.
Entrypoints:
  main (541 KiB)
      output.js

WARNING in webpack performance recommendations: 
You can limit the size of your bundles by using import() or require.ensure to lazy load some parts of your application.
For more info visit https://webpack.js.org/guides/code-splitting/

webpack X.X.X compiled with 3 warnings
```
