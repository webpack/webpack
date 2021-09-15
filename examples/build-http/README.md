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
asset output.js 61.9 KiB [emitted] (name: main)
runtime modules 670 bytes 3 modules
modules by path https:// 21.9 KiB
  modules by path https://jspm.dev/ 8.43 KiB
    modules by path https://jspm.dev/*.0 6.04 KiB 5 modules
    modules by path https://jspm.dev/npm:@jspm/ 1.99 KiB
      https://jspm.dev/npm:@jspm/core@2/nodelibs/os 126 bytes [built] [code generated]
        [exports: EOL, arch, cpus, default, endianness, freemem, getNetworkInterfaces, homedir, hostname, loadavg, networkInterfaces, platform, release, tmpDir, tmpdir, totalmem, type, uptime]
        [used exports unknown]
        harmony side effect evaluation /npm:@jspm/core@2/nodelibs/os https://jspm.dev/npm:clean-stack@4 1:0-39
        harmony side effect evaluation ./npm:@jspm/core@2/nodelibs/os https://jspm.dev/npm:clean-stack@4.1.0 1:0-48
        harmony import specifier ./npm:@jspm/core@2/nodelibs/os https://jspm.dev/npm:clean-stack@4.1.0 6:23-33
        harmony import specifier ./npm:@jspm/core@2/nodelibs/os https://jspm.dev/npm:clean-stack@4.1.0 6:57-67
      https://jspm.dev/npm:@jspm/core@2.0.0-beta.8/nodelibs/os 1.87 KiB [built] [code generated]
        [exports: EOL, arch, cpus, default, endianness, freemem, getNetworkInterfaces, homedir, hostname, loadavg, networkInterfaces, platform, release, tmpDir, tmpdir, totalmem, type, uptime]
        [used exports unknown]
        harmony side effect evaluation /npm:@jspm/core@2.0.0-beta.8/nodelibs/os https://jspm.dev/npm:@jspm/core@2/nodelibs/os 1:0-57
        harmony export imported specifier /npm:@jspm/core@2.0.0-beta.8/nodelibs/os https://jspm.dev/npm:@jspm/core@2/nodelibs/os 1:0-57
        harmony side effect evaluation /npm:@jspm/core@2.0.0-beta.8/nodelibs/os https://jspm.dev/npm:@jspm/core@2/nodelibs/os 2:0-67
        harmony export imported specifier /npm:@jspm/core@2.0.0-beta.8/nodelibs/os https://jspm.dev/npm:@jspm/core@2/nodelibs/os 2:0-67
    4 modules
  modules by path https://cdn.esm.sh/ 5.72 KiB 7 modules
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
webpack 5.51.1 compiled successfully
```

## Production mode

```
asset output.js 11.4 KiB [emitted] [minimized] (name: main)
orphan modules 21.9 KiB [orphan] 25 modules
./example.js + 24 modules 22.1 KiB [built] [code generated]
  [no exports]
  [no exports used]
  entry ./example.js main
webpack 5.51.1 compiled successfully
```
