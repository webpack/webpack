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
Hash: 0a1b2c3d4e5f6a7b8c9d
Version: webpack 5.0.0-beta.9
    Asset      Size
output.js  4.04 MiB  [emitted]  [name: main]
Entrypoint main = output.js
chunk output.js (main) 2.85 MiB (javascript) 0 bytes (runtime) [entry]
    > ./example.js main
    1172 chunk modules
```

## Production mode

```
Hash: 0a1b2c3d4e5f6a7b8c9d
Version: webpack 5.0.0-beta.9
            Asset      Size
        output.js   510 KiB  [emitted]  [big]  [name: main]
output.js.LICENSE  1.49 KiB  [emitted]
Entrypoint main [big] = output.js
chunk output.js (main) 1.8 MiB (javascript) 0 bytes (runtime) [entry]
    > ./example.js main
    530 chunk modules

WARNING in asset size limit: The following asset(s) exceed the recommended size limit (244 KiB).
This can impact web performance.
Assets: 
  output.js (510 KiB)

WARNING in entrypoint size limit: The following entrypoint(s) combined asset size exceeds the recommended limit (244 KiB). This can impact web performance.
Entrypoints:
  main (510 KiB)
      output.js

WARNING in webpack performance recommendations: 
You can limit the size of your bundles by using import() or require.ensure to lazy load some parts of your application.
For more info visit https://webpack.js.org/guides/code-splitting/
```
