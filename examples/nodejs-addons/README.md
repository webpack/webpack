This example illustrates how to use [Node.js addons](https://nodejs.org/api/addons.html).

# example.js

```javascript
import { dlopen } from 'node:process';
import { fileURLToPath } from 'node:url';

const file = new URL("./file.node", import.meta.url);
const myModule = { exports: {} };

try {
	dlopen(myModule, fileURLToPath(file));
} catch (err) {
	console.log(err)
	// Handling errors
}

console.log(myModule.exports.hello());
// Outputs: world
```

# webpack.config.js

```javascript
module.exports = {
	// mode: "development" || "production",
	target: "node",
	output: {
		// We strong recommend use `publicPath: 'auto'` or do not set `publicPath` at all to generate relative URLs
		// publicPath: 'auto'
	},
	module: {
		rules: [
			{
				test: /\.node$/,
				type: "asset/resource"
			}
		]
	}
};
```

# Info

## Unoptimized

```
asset 6cf1cf4222a82ec560f4.node 16.5 KiB [emitted] [immutable] [from: file.node] (auxiliary name: main)
asset output.js 6.27 KiB [emitted] (name: main)
chunk (runtime: main) output.js (main) 457 bytes (javascript) 16.5 KiB (asset) 1.26 KiB (runtime) [entry] [rendered]
  > ./example.js main
  runtime modules 1.26 KiB 6 modules
  dependent modules 16.5 KiB (asset) 126 bytes (javascript) [dependent] 3 modules
  ./example.js 331 bytes [built] [code generated]
    [no exports]
    [used exports unknown]
    entry ./example.js main
webpack 5.99.7 compiled successfully
```

## Production mode

```
asset 6cf1cf4222a82ec560f4.node 16.5 KiB [emitted] [immutable] [from: file.node] (auxiliary name: main)
asset output.js 510 bytes [emitted] [minimized] (name: main)
chunk (runtime: main) output.js (main) 16.5 KiB (asset) 457 bytes (javascript) 440 bytes (runtime) [entry] [rendered]
  > ./example.js main
  runtime modules 440 bytes 3 modules
  dependent modules 16.5 KiB (asset) 42 bytes (javascript) [dependent] 1 module
  ./example.js + 2 modules 415 bytes [not cacheable] [built] [code generated]
    [no exports]
    [no exports used]
    entry ./example.js main
webpack 5.99.7 compiled successfully
```
