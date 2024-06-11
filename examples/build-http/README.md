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
		buildHttp: [
			"https://cdn.esm.sh/",
			"https://cdn.skypack.dev/",
			"https://jspm.dev/",
			/^https:\/\/unpkg\.com\/.+\?module$/
		]
	}
};
```

# Info

## Unoptimized

```
asset output.js 82.6 KiB [emitted] (name: main)
runtime modules 670 bytes 3 modules
modules by path https:// 30 KiB
  modules by path https://jspm.dev/ 16.1 KiB 12 modules
  modules by path https://cdn.esm.sh/ 6.15 KiB
    https://cdn.esm.sh/p-map 173 bytes [built] [code generated]
      [exports: default, pMapSkip]
      [used exports unknown]
      harmony side effect evaluation https://cdn.esm.sh/p-map ./example.js 2:0-45
      harmony import specifier https://cdn.esm.sh/p-map ./example.js 6:12-17
    https://cdn.esm.sh/v53/p-map@5.1.0/es2015/p-map.js 1.18 KiB [built] [code generated]
      [exports: default, pMapSkip]
      [used exports unknown]
      harmony side effect evaluation https://cdn.esm.sh/v53/p-map@5.1.0/es2015/p-map.js https://cdn.esm.sh/p-map 2:0-67
      harmony export imported specifier https://cdn.esm.sh/v53/p-map@5.1.0/es2015/p-map.js https://cdn.esm.sh/p-map 2:0-67
      harmony side effect evaluation https://cdn.esm.sh/v53/p-map@5.1.0/es2015/p-map.js https://cdn.esm.sh/p-map 3:0-77
      harmony export imported specifier https://cdn.esm.sh/v53/p-map@5.1.0/es2015/p-map.js https://cdn.esm.sh/p-map 3:0-77
    + 5 modules
  modules by path https://cdn.skypack.dev/ 7.46 KiB
    https://cdn.skypack.dev/p-map 757 bytes [built] [code generated]
      [exports: default, pMapSkip]
      [used exports unknown]
      harmony side effect evaluation https://cdn.skypack.dev/p-map ./example.js 1:0-50
      harmony import specifier https://cdn.skypack.dev/p-map ./example.js 5:12-17
    https://cdn.skypack.dev/-/p-map@v5.1.0-7ixXvZxXPKKt9unR9LT0/dist=es2020,mode=imports/optimized/p-map.js 2.29 KiB [built] [code generated]
      [exports: default, pMapSkip]
      [used exports unknown]
      harmony side effect evaluation /-/p-map@v5.1.0-7ixXvZxXPKKt9unR9LT0/dist=es2020,mode=imports/optimized/p-map.js https://cdn.skypack.dev/p-map 15:0-97
      harmony export imported specifier /-/p-map@v5.1.0-7ixXvZxXPKKt9unR9LT0/dist=es2020,mode=imports/optimized/p-map.js https://cdn.skypack.dev/p-map 15:0-97
      harmony side effect evaluation /-/p-map@v5.1.0-7ixXvZxXPKKt9unR9LT0/dist=es2020,mode=imports/optimized/p-map.js https://cdn.skypack.dev/p-map 16:0-105
      harmony export imported specifier /-/p-map@v5.1.0-7ixXvZxXPKKt9unR9LT0/dist=es2020,mode=imports/optimized/p-map.js https://cdn.skypack.dev/p-map 16:0-105
    + 4 modules
  https://unpkg.com/p-map-series?module 263 bytes [built] [code generated]
    [exports: default]
    [used exports unknown]
    harmony side effect evaluation https://unpkg.com/p-map-series?module ./example.js 4:0-58
    harmony import specifier https://unpkg.com/p-map-series?module ./example.js 8:12-17
./example.js 314 bytes [built] [code generated]
  [no exports]
  [used exports unknown]
  entry ./example.js main
webpack 5.78.0 compiled successfully
```

## Production mode

```
asset output.js 12.4 KiB [emitted] [minimized] (name: main)
orphan modules 30 KiB [orphan] 26 modules
./example.js + 25 modules 30.2 KiB [built] [code generated]
  [no exports]
  [no exports used]
  entry ./example.js main
webpack 5.78.0 compiled successfully
```
