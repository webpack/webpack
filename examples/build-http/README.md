# example.js

```javascript
import pMap1 from "https://cdn.skypack.dev/p-map";
import pMap2 from "https://cdn.esm.sh/p-map";
import pMap3 from "https://jspm.dev/p-map";
import pMap4 from "https://unpkg.com/p-map-series?module"; // unpkg doesn't support p-map :(
console.log(pMap1);
console.log(pMap2);
console.log(pMap3);
console.log(pMap4);
```

# webpack.config.js

```javascript
module.exports = {
	// enable debug logging to see network requests!
	// stats: {
	// 	loggingDebug: /HttpUriPlugin/
	// },
	experiments: {
		buildHttp: true
	}
};
```

# Info

## Unoptimized

```
asset output.js 82.6 KiB [emitted] (name: main)
runtime modules 670 bytes 3 modules
modules by path https:// 30 KiB
  modules by path https://jspm.dev/ 16.1 KiB
    modules by path https://jspm.dev/*.0 6.04 KiB 5 modules
    modules by path https://jspm.dev/npm:@jspm/ 9.67 KiB 3 modules
    4 modules
  modules by path https://cdn.esm.sh/ 6.15 KiB 7 modules
  modules by path https://cdn.skypack.dev/ 7.46 KiB 6 modules
  https://unpkg.com/p-map-series?module 263 bytes [built] [code generated]
    [exports: default]
    [used exports unknown]
    harmony side effect evaluation https://unpkg.com/p-map-series?module ./example.js 4:0-58
    harmony import specifier https://unpkg.com/p-map-series?module ./example.js 8:12-17
./example.js 314 bytes [built] [code generated]
  [no exports]
  [used exports unknown]
  entry ./example.js main
webpack 5.53.0 compiled successfully
```

## Production mode

```
asset output.js 12.5 KiB [emitted] [minimized] (name: main)
orphan modules 30 KiB [orphan] 26 modules
./example.js + 25 modules 30.2 KiB [built] [code generated]
  [no exports]
  [no exports used]
  entry ./example.js main
webpack 5.53.0 compiled successfully
```
