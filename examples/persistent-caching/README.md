# example.js

``` javascript
console.log(process.env.NODE_ENV);

import "react";
import "react-dom";
import "acorn";
import "core-js";
import "date-fns";
```

# webpack.config.js

``` javascript
const path = require("path");
module.exports = (env = "development") => ({
	mode: env,
	cache: {
		type: "filesystem",
		cacheDirectory: path.resolve(__dirname, ".cache"),
		loglevel: "warning"
	}
});
```

# Info

```
Hash: 0a1b2c3d4e5f6a7b8c9d
Version: webpack 5.0.0-next
    Asset      Size  Chunks             Chunk Names
output.js  1.51 MiB     {0}  [emitted]  main
Entrypoint main = output.js
chunk {0} output.js (main) 1.22 MiB (javascript) 888 bytes (runtime) [entry]
    > .\example.js main
    686 chunk modules
```
