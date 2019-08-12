# example.js

```javascript
console.log(process.env.NODE_ENV);

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
		level: "verbose"
	},
	cache: {
		type: "filesystem",
		// changing the cacheDirectory is optional,
		// by default it will be in `node_modules/.cache`
		cacheDirectory: path.resolve(__dirname, ".cache")
	}
});
```

# Info

```
Hash: 0a1b2c3d4e5f6a7b8c9d
Version: webpack 5.0.0-alpha.19
    Asset      Size  Chunks             Chunk Names
output.js  1.78 MiB     {0}  [emitted]  main
Entrypoint main = output.js
chunk {0} output.js (main) 1.54 MiB (javascript) 1.07 KiB (runtime) [entry]
    > ./example.js main
    526 chunk modules
```
