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
"use strict";

const path = require("path");

/** @type {(env: "development" | "production") => import("webpack").Configuration} */
const config = (env = "development") => ({
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
	}
	// No CSS rule: webpack handles `import "./example.css"` itself
	// (`experiments.css` defaults to "auto"), and its output is cached too.
});

module.exports = config;
```

# Info

## Unoptimized

```
asset output.js 3.67 MiB [emitted] (name: main)
asset output.css 120 bytes [emitted] (name: main)
Entrypoint main 3.67 MiB = output.js 3.67 MiB output.css 120 bytes
chunk (runtime: main) output.js, output.css (main) 2.29 MiB (javascript) 27 bytes (css) 931 bytes (runtime) [entry]
  > ./example.js main
  cached modules 2.29 MiB (javascript) 27 bytes (css) 931 bytes (runtime) [cached] 1531 modules
webpack X.X.X compiled successfully
```

## Production mode

```
asset output.js 532 KiB [emitted] [minimized] [big] (name: main) 1 related asset
asset output.css 20 bytes [emitted] [minimized] (name: main)
Entrypoint main [big] 532 KiB = output.js 532 KiB output.css 20 bytes
chunk (runtime: main) output.js, output.css (main) 2.23 MiB (javascript) 27 bytes (css) 1.29 KiB (runtime) [entry]
  > ./example.js main
  cached modules 2.23 MiB (javascript) 27 bytes (css) 1.29 KiB (runtime) [cached] 38 modules

WARNING in asset size limit: The following asset(s) exceed the recommended size limit (244 KiB).
This can impact web performance.
Assets: 
  output.js (532 KiB)

WARNING in entrypoint size limit: The following entrypoint(s) combined asset size exceeds the recommended limit (244 KiB). This can impact web performance.
Entrypoints:
  main (532 KiB)
      output.js
      output.css

WARNING in webpack performance recommendations: 
You can limit the size of your bundles by using import() or require.ensure to lazy load some parts of your application.
For more info visit https://webpack.js.org/guides/code-splitting/

webpack X.X.X compiled with 3 warnings
```
